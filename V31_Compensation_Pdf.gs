/**
 * V31 Compensation CAF PDF generation.
 *
 * Final PDF is created once after Manager, Employee, and HR PR signatures exist.
 * History is appended exactly once after the sealed PDF ID is persisted.
 */

function maybeGenerateCompensationPdfAfterSignatures_(cycleId) {
  ensureCompensationDataModel_();
  const cycle = findCycle_(cycleId).object;
  const decision = normalizeCompensationDecision_(
    cycle['Compensation Decision']
  );
  const recordLoc = findCompensationRecordByCycleOptional_(cycleId);
  if (
    recordLoc &&
    (String(recordLoc.object['Owner Decision'] || '') ===
      V31_COMP.OWNER_DECISION.DENIED ||
      String(recordLoc.object['Status'] || '') === V31_COMP.STATUS.DENIED)
  ) {
    return { skipped: true, reason: 'denied' };
  }
  if (decision !== V31.COMPENSATION.ADJUSTMENT) {
    return { skipped: true, reason: 'no-adjustment' };
  }

  const signatures = getCombinedSignatureState_(cycle);
  if (
    !signatures.managerSigned ||
    !signatures.employeeSigned ||
    !signatures.hrSigned
  ) {
    return { skipped: true, reason: 'signatures-incomplete' };
  }

  return ensureCompensationCafPdf_(cycleId);
}

function ensureCompensationCafPdf_(cycleId) {
  const claimed = withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const status = String(record['Status'] || '');
    const pdfStatus = String(
      record['CAF PDF Status'] || V31_COMP.PDF.PENDING
    );

    if (
      status === V31_COMP.STATUS.COMPLETE &&
      pdfStatus === V31_COMP.PDF.COMPLETE &&
      String(record['CAF Final PDF ID'] || '')
    ) {
      return { skip: true, alreadyComplete: true, record: record };
    }

    if (
      status !== V31_COMP.STATUS.AWAITING_SIGNATURES &&
      status !== V31_COMP.STATUS.COMPLETE
    ) {
      throw new Error(
        'Compensation CAF PDF can only be generated after the owner decision.'
      );
    }

    const cycle = findCycle_(cycleId).object;
    const signatures = getCombinedSignatureState_(cycle);
    if (
      !signatures.managerSigned ||
      !signatures.employeeSigned ||
      !signatures.hrSigned
    ) {
      throw new Error(
        'Compensation CAF PDF requires manager, employee, and HR signatures.'
      );
    }

    if (pdfStatus === V31_COMP.PDF.GENERATING) {
      if (isDeliveryClaimStale_(record['CAF PDF Started At'])) {
        record['CAF PDF Status'] = V31_COMP.PDF.UNKNOWN;
        record['CAF PDF Last Error'] =
          'CAF PDF claim went stale before an ID was persisted.';
        record['Updated At'] = new Date();
        writeCompensationRecord_(recordLoc.rowNumber, record);
        throw new Error(
          'Compensation CAF PDF is Delivery Unknown and requires HR recovery.'
        );
      }
      throw new Error('Compensation CAF PDF generation is already in progress.');
    }

    if (pdfStatus === V31_COMP.PDF.UNKNOWN) {
      throw new Error(
        'Compensation CAF PDF is Delivery Unknown. HR must reconcile before retry.'
      );
    }

    if (pdfStatus === V31_COMP.PDF.COMPLETE && record['CAF Final PDF ID']) {
      return { skip: true, alreadyComplete: true, record: record };
    }

    const attemptId = Utilities.getUuid();
    record['CAF PDF Status'] = V31_COMP.PDF.GENERATING;
    record['CAF PDF Attempt ID'] = attemptId;
    record['CAF PDF Started At'] = new Date();
    record['CAF PDF Last Error'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    return {
      skip: false,
      attemptId: attemptId,
      recordId: String(record['Compensation Record ID']),
    };
  });

  if (claimed.skip) {
    return {
      ok: true,
      alreadyComplete: true,
      pdfId: String(claimed.record['CAF Final PDF ID'] || ''),
    };
  }

  try {
    const pdfId = generateCompensationCafPdf_(cycleId);
    return commitCompensationCafSealed_(cycleId, pdfId, {
      expectedAttemptId: claimed.attemptId,
    });
  } catch (error) {
    // The failure may have left a durable CAF artifact in Drive. Reconcile:
    //   1 valid candidate  → self-heal by sealing it
    //   0 valid candidates → clean Failed (no side effect to reconcile)
    //   >1 valid candidates→ Delivery Unknown + blocking ambiguity alert
    let candidates = [];
    let rejected = [];
    try {
      const record = findCompensationRecordByCycle_(cycleId).object;
      const artifacts = collectCompensationCafArtifacts_(cycleId, record);
      candidates = artifacts.valid;
      rejected = artifacts.rejected || [];
    } catch (reconcileError) {
      Logger.log(
        'CAF failure reconcile scan failed: ' +
          String(reconcileError.message || reconcileError)
      );
    }

    if (candidates.length === 1) {
      return commitCompensationCafSealed_(cycleId, candidates[0].id, {
        expectedAttemptId: claimed.attemptId,
      });
    }

    const unresolvedStatus =
      candidates.length > 1 ? V31_COMP.PDF.UNKNOWN : V31_COMP.PDF.FAILED;

    withLock_(function () {
      const recordLoc = findCompensationRecordByCycle_(cycleId);
      const record = recordLoc.object;
      if (
        String(record['CAF PDF Attempt ID'] || '') !==
        String(claimed.attemptId)
      ) {
        return;
      }
      record['CAF PDF Status'] = unresolvedStatus;
      record['CAF PDF Last Error'] = String(error.message || error);
      record['CAF PDF Attempt ID'] = '';
      record['CAF PDF Started At'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
    });

    if (unresolvedStatus === V31_COMP.PDF.UNKNOWN) {
      const record = findCompensationRecordByCycle_(cycleId).object;
      recordCompensationCafAmbiguityAlert_(
        cycleId,
        record,
        candidates,
        rejected
      );
    }
    throw error;
  }
}

/**
 * Persist a generated/recovered CAF PDF as the sealed final artifact.
 * When expectedAttemptId is provided, a superseding claim is respected.
 * History is appended idempotently via ensureCompensationHistory_.
 */
function commitCompensationCafSealed_(cycleId, pdfId, options) {
  const opts = options || {};
  const result = withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;

    if (
      opts.expectedAttemptId &&
      String(record['CAF PDF Attempt ID'] || '') !==
        String(opts.expectedAttemptId)
    ) {
      return { ok: false, superseded: true };
    }

    const previousStatus = String(record['Status'] || '');
    record['CAF Final PDF ID'] = pdfId;
    record['CAF Final PDF Created At'] =
      record['CAF Final PDF Created At'] || new Date();
    record['CAF PDF Status'] = V31_COMP.PDF.COMPLETE;
    record['CAF PDF Attempt ID'] = '';
    record['CAF PDF Started At'] = '';
    record['CAF PDF Last Error'] = '';
    record['Status'] = V31_COMP.STATUS.COMPLETE;
    record['Updated At'] = new Date();

    if (
      String(record['Rate Update Status'] || '') ===
        V31_COMP.RATE_UPDATE.PENDING ||
      !String(record['Rate Update Status'] || '')
    ) {
      if (isCompensationEffectiveDateDue_(record['Compensation Effective Date'])) {
        record['Rate Update Status'] = V31_COMP.RATE_UPDATE.PENDING;
      } else {
        record['Rate Update Status'] =
          V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
      }
    }

    writeCompensationRecord_(recordLoc.rowNumber, record);

    const cycleLoc = findCycle_(cycleId);
    const cycle = cycleLoc.object;
    syncCycleCompensationSummary_(cycle, record);
    cycle['Updated At'] = new Date();
    writeCycle_(cycleLoc.rowNumber, cycle);
    SpreadsheetApp.flush();

    audit_(
      cycleId,
      'Compensation CAF PDF sealed',
      Session.getEffectiveUser().getEmail(),
      previousStatus,
      V31_COMP.STATUS.COMPLETE,
      JSON.stringify({
        compensationRecordId: record['Compensation Record ID'],
        pdfId: pdfId,
      })
    );

    return { ok: true, pdfId: pdfId, sealed: true };
  });

  if (result.ok) {
    // History is a separate durable step; a sealed CAF must be able to repair
    // missing history on a later call even if this append fails now.
    ensureCompensationHistory_(cycleId);
    // Authoritative roster update: after history, apply Current Pay Rate when
    // the effective date is due. Future dates stay Pending Effective Date.
    try {
      ensureCompensationRateUpdate_(cycleId);
    } catch (rateError) {
      Logger.log(
        'Post-CAF roster update deferred/failed: ' +
          String(rateError.message || rateError)
      );
    }
  }

  return result;
}

function buildCompensationCafFileName_(cycleId) {
  return buildHumanReadableDocumentFileName_(
    cycleId,
    'Compensation Adjustment Form'
  );
}

/**
 * Ensure a CAF Drive file uses the shared human-readable name.
 * Reused legacy UUID-named artifacts are renamed in place; provenance is kept.
 */
function ensureHumanReadableCompensationCafName_(fileId, cycleId) {
  const expected = buildCompensationCafFileName_(cycleId);
  const id = String(fileId || '').trim();
  if (!id) return expected;
  try {
    const file = DriveApp.getFileById(id);
    if (String(file.getName() || '') !== expected) {
      file.setName(expected);
    }
  } catch (error) {
    Logger.log(
      'CAF human-readable rename deferred: ' +
        String(error.message || error)
    );
  }
  return expected;
}

function buildLegacyCompensationCafFileNames_(cycleId) {
  return [
    'AITHERAS_' + cycleId + '_Compensation_Adjustment_FINAL.pdf',
  ];
}

/**
 * Deterministic provenance marker stored on the CAF PDF file description.
 * Used to prove that a deterministic-name candidate is the authoritative
 * artifact for this exact cycle + compensation record + approved amount.
 */
function buildCompensationCafProvenance_(cycleId, record) {
  return (
    'AITHERAS_COMPENSATION ' +
    JSON.stringify({
      schemaVersion: 1,
      cycleId: String(cycleId),
      recordId: String(record['Compensation Record ID'] || ''),
      finalApprovedPayRate: Number(record['Final Approved Pay Rate'] || 0),
      effectiveDate: formatDate_(record['Compensation Effective Date']) || '',
    })
  );
}

function parseCompensationCafProvenance_(description) {
  const raw = String(description || '');
  const marker = 'AITHERAS_COMPENSATION ';
  const index = raw.indexOf(marker);
  if (index < 0) return null;
  try {
    return JSON.parse(raw.substring(index + marker.length));
  } catch (error) {
    return null;
  }
}

/**
 * Strictly validate that a deterministic-name candidate is genuinely the
 * authoritative CAF PDF for this cycle/record/approved amount. Fails closed:
 * a manually uploaded or stale same-named file will not pass.
 */
function assertValidCompensationCafFile_(file, cycleId, record, folderId) {
  const fileId = String(file.getId());
  if (file.isTrashed()) {
    throw new Error('Candidate CAF PDF ' + fileId + ' is trashed.');
  }
  if (String(file.getMimeType()) !== String(MimeType.PDF)) {
    throw new Error('Candidate CAF ' + fileId + ' is not a PDF.');
  }
  const parents = file.getParents();
  let inFolder = false;
  while (parents.hasNext()) {
    if (String(parents.next().getId()) === String(folderId)) {
      inFolder = true;
      break;
    }
  }
  if (!inFolder) {
    throw new Error(
      'Candidate CAF ' + fileId + ' is not in the compensation folder.'
    );
  }
  if (
    String(file.getName()) !== buildCompensationCafFileName_(cycleId) &&
    buildLegacyCompensationCafFileNames_(cycleId).indexOf(
      String(file.getName())
    ) < 0
  ) {
    // Name mismatch is OK only when provenance proves identity (below).
    // Continue into provenance checks rather than failing on name alone when
    // provenance is present; fail closed when neither matches.
    const earlyProvenance = parseCompensationCafProvenance_(
      file.getDescription()
    );
    if (
      !earlyProvenance ||
      String(earlyProvenance.cycleId) !== String(cycleId) ||
      String(earlyProvenance.recordId) !==
        String(record['Compensation Record ID'] || '')
    ) {
      throw new Error('Candidate CAF ' + fileId + ' name mismatch.');
    }
  }
  const provenance = parseCompensationCafProvenance_(file.getDescription());
  if (!provenance) {
    throw new Error(
      'Candidate CAF ' + fileId + ' is missing AITHERAS provenance.'
    );
  }
  if (String(provenance.cycleId) !== String(cycleId)) {
    throw new Error('Candidate CAF ' + fileId + ' cycle mismatch.');
  }
  if (
    String(provenance.recordId) !==
    String(record['Compensation Record ID'] || '')
  ) {
    throw new Error('Candidate CAF ' + fileId + ' record mismatch.');
  }
  if (
    Number(provenance.finalApprovedPayRate || 0) !==
    Number(record['Final Approved Pay Rate'] || 0)
  ) {
    throw new Error(
      'Candidate CAF ' + fileId + ' approved amount mismatch.'
    );
  }
  return fileId;
}

/**
 * Scan CAF artifacts by recognized filenames and by provenance.
 * A rejected (e.g. no-provenance, manually uploaded) same-named file never
 * aborts the scan and is never trashed; it is retained as evidence so a
 * single valid candidate can still be reconciled.
 */
function collectCompensationCafArtifacts_(cycleId, record) {
  const settings = getSettings_();
  const folderId = String(settings.COMPENSATION_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error(
      'COMPENSATION_FOLDER_ID is not configured. HR must set the compensation Drive folder.'
    );
  }
  const folder = DriveApp.getFolderById(folderId);
  const recognizedNames = [buildCompensationCafFileName_(cycleId)].concat(
    buildLegacyCompensationCafFileNames_(cycleId)
  );
  const seen = {};
  const valid = [];
  const rejected = [];

  function considerFile_(file) {
    if (file.isTrashed()) return;
    const id = String(file.getId());
    if (seen[id]) return;
    seen[id] = true;
    try {
      assertValidCompensationCafFile_(file, cycleId, record, folderId);
      valid.push({
        id: id,
        name: String(file.getName() || ''),
        updatedAt: file.getLastUpdated()
          ? file.getLastUpdated().toISOString()
          : '',
      });
    } catch (error) {
      // Only retain as rejected evidence when the name matches a recognized
      // CAF name (or provenance mentions this cycle) — avoid flooding from
      // unrelated folder contents.
      const name = String(file.getName() || '');
      const provenance = parseCompensationCafProvenance_(
        file.getDescription()
      );
      const relevant =
        recognizedNames.indexOf(name) >= 0 ||
        (provenance && String(provenance.cycleId) === String(cycleId));
      if (relevant) {
        rejected.push({
          id: id,
          name: name,
          reason: String(error.message || error),
        });
      }
    }
  }

  recognizedNames.forEach(function (fileName) {
    const files = folder.getFilesByName(fileName);
    while (files.hasNext()) {
      considerFile_(files.next());
    }
  });

  // Provenance-first recovery: also consider PDFs whose description matches
  // this cycle even if the human-readable name differs.
  const allPdfs = folder.getFilesByType(MimeType.PDF);
  let checked = 0;
  while (allPdfs.hasNext() && checked < 200) {
    checked += 1;
    const file = allPdfs.next();
    const provenance = parseCompensationCafProvenance_(file.getDescription());
    if (provenance && String(provenance.cycleId) === String(cycleId)) {
      considerFile_(file);
    }
  }

  return { valid: valid, rejected: rejected };
}

/** Return only the deterministic-name CAF candidates that pass validation. */
function listCompensationCafCandidates_(cycleId, record) {
  const artifacts = collectCompensationCafArtifacts_(cycleId, record);
  const matches = [];
  const seen = {};
  artifacts.valid.forEach(function (item) {
    const id = String(item.id);
    if (!seen[id]) {
      seen[id] = true;
      matches.push({
        id: id,
        name: String(item.name || ''),
        updatedAt: item.updatedAt ? item.updatedAt : '',
      });
    }
  });
  return matches;
}

/**
 * Resolve an existing authoritative CAF PDF ID.
 * - exactly one valid candidate → reuse it
 * - more than one → throw AMBIGUOUS_CAF_ARTIFACTS for HR reconciliation
 * - zero → return '' so the caller generates a fresh artifact
 */
function findExistingCompensationCafId_(cycleId, record) {
  const matches = listCompensationCafCandidates_(cycleId, record);
  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    const error = new Error(
      'Multiple deterministic CAF PDF artifacts exist for ' +
        cycleId +
        '. HR reconciliation is required.'
    );
    error.code = 'AMBIGUOUS_CAF_ARTIFACTS';
    error.candidates = matches;
    throw error;
  }
  return '';
}

/**
 * Allow-listed employee-facing CAF fields only.
 * Never pass the raw CompensationRecord into Document body builders —
 * manager recommendation, owner notes, and audit metadata stay internal.
 */
function buildEmployeeSafeCompensationCafDto_(cycle, record) {
  return {
    cycleId: String(
      (cycle && cycle['Cycle ID']) || (record && record['Review Cycle ID']) || ''
    ),
    employeeName: String((record && record['Employee Name']) || ''),
    employeeEmail: String((record && record['Employee Email']) || ''),
    managerName: String((record && record['Manager Name']) || ''),
    jobTitle: String((cycle && cycle['Employee Job Title']) || ''),
    department: String((cycle && cycle['Department / Project']) || ''),
    originalPayRate: Number((record && record['Original Pay Rate']) || 0),
    originalAnnualSalary: Number(
      (record && record['Original Annual Salary']) || 0
    ),
    finalApprovedPayRate: Number(
      (record && record['Final Approved Pay Rate']) || 0
    ),
    finalApprovedAnnualSalary: Number(
      (record && record['Final Approved Annual Salary']) || 0
    ),
    finalApprovedPercent: Number(
      (record && record['Final Approved Percent']) || 0
    ),
    effectiveDate: record && record['Compensation Effective Date'],
  };
}

/**
 * Flat text used for privacy regressions (no DocumentApp required).
 * Must never include manager recommendation or owner deliberative content.
 */
function serializeEmployeeSafeCompensationCafDto_(dto) {
  const rows = [
    'AITHERAS',
    'Compensation Adjustment Agreement',
    'Review Cycle ID: ' + String(dto.cycleId || ''),
    'Employee',
    String(dto.employeeName || ''),
    'Employee Email',
    String(dto.employeeEmail || ''),
    'Manager',
    String(dto.managerName || ''),
    'Job Title',
    String(dto.jobTitle || ''),
    'Department / Project',
    String(dto.department || ''),
    'Current Compensation',
    'Current Pay Rate',
    formatMoney_(Number(dto.originalPayRate || 0)),
    'Current Annual Salary',
    formatMoney_(Number(dto.originalAnnualSalary || 0)),
    'Approved Compensation Adjustment',
    'Approved Pay Rate',
    formatMoney_(Number(dto.finalApprovedPayRate || 0)),
    'Approved Annual Salary',
    formatMoney_(Number(dto.finalApprovedAnnualSalary || 0)),
    'Approved Increase',
    formatPercentDisplay_(Number(dto.finalApprovedPercent || 0)),
    'Effective Date',
    formatDate_(dto.effectiveDate) || '',
    'By signing, the employee acknowledges receipt of the approved compensation adjustment shown above.',
  ];
  return rows.join('\n');
}

function assertEmployeeSafeCompensationCafText_(text) {
  const forbidden = [
    'Manager Recommendation',
    'Original Recommendation',
    'Recommended Pay Rate',
    'Recommended Annual Salary',
    'Recommended Increase',
    'Recommended Rate',
    'Business Justification',
    'Proposed Effective Date',
    'Submitted By',
    'Submitted At',
    'Owner Decision',
    'Approved by',
    'Decision recorded by',
    'Decision date',
    'Decision notes',
    'Recommendation Accepted',
    'Changed from',
    'Override',
  ];
  const haystack = String(text || '');
  forbidden.forEach(function (label) {
    if (haystack.indexOf(label) !== -1) {
      throw new Error(
        'Employee CAF must not include internal label: ' + label
      );
    }
  });
  if (/\bModified\b/.test(haystack)) {
    throw new Error('Employee CAF must not include Modified owner-decision language.');
  }
  return true;
}

function renderEmployeeSafeCompensationCafBody_(body, dto) {
  applyAitherasDocumentBranding_(body, {
    title: 'Compensation Adjustment Agreement',
    subtitle: 'Review Cycle ID: ' + String(dto.cycleId || ''),
  });
  body.appendHorizontalRule();

  const identity = body.appendTable([
    ['Employee', String(dto.employeeName || '')],
    ['Employee Email', String(dto.employeeEmail || '')],
    ['Manager', String(dto.managerName || '')],
    ['Job Title', String(dto.jobTitle || '')],
    ['Department / Project', String(dto.department || '')],
  ]);
  styleInfoTable_(identity);

  body
    .appendParagraph('Current Compensation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const currentTable = body.appendTable([
    ['Current Pay Rate', formatMoney_(Number(dto.originalPayRate || 0))],
    [
      'Current Annual Salary',
      formatMoney_(Number(dto.originalAnnualSalary || 0)),
    ],
  ]);
  styleInfoTable_(currentTable);

  body
    .appendParagraph('Approved Compensation Adjustment')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const finalTable = body.appendTable([
    [
      'Approved Pay Rate',
      formatMoney_(Number(dto.finalApprovedPayRate || 0)),
    ],
    [
      'Approved Annual Salary',
      formatMoney_(Number(dto.finalApprovedAnnualSalary || 0)),
    ],
    [
      'Approved Increase',
      formatPercentDisplay_(Number(dto.finalApprovedPercent || 0)),
    ],
    ['Effective Date', formatDate_(dto.effectiveDate) || ''],
  ]);
  styleInfoTable_(finalTable);
}

function generateCompensationCafPdf_(cycleId) {
  const cycle = findCycle_(cycleId).object;
  const record = findCompensationRecordByCycle_(cycleId).object;
  const settings = getSettings_();
  const folderId = String(settings.COMPENSATION_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error(
      'COMPENSATION_FOLDER_ID is not configured. HR must set the compensation Drive folder.'
    );
  }

  const folder = DriveApp.getFolderById(folderId);
  const fileName = buildCompensationCafFileName_(cycleId);

  const existingId = findExistingCompensationCafId_(cycleId, record);
  if (existingId) {
    ensureHumanReadableCompensationCafName_(existingId, cycleId);
    return existingId;
  }

  const managerSignature = validateAuthoritativeRoleSignature_(
    cycle,
    PR.ROLE.MANAGER
  );
  const employeeSignature = validateAuthoritativeRoleSignature_(
    cycle,
    PR.ROLE.EMPLOYEE
  );
  const hrSignature = validateAuthoritativeRoleSignature_(
    cycle,
    PR.ROLE.HR
  );

  const employeeSafeDto = buildEmployeeSafeCompensationCafDto_(cycle, record);
  assertEmployeeSafeCompensationCafText_(
    serializeEmployeeSafeCompensationCafDto_(employeeSafeDto)
  );

  const doc = DocumentApp.create(
    'AITHERAS_' + cycleId + '_Compensation_Adjustment_WORKING'
  );
  const body = doc.getBody();
  body.clear();

  renderEmployeeSafeCompensationCafBody_(body, employeeSafeDto);

  body
    .appendParagraph('Signatures')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  appendCompensationSignatureBlock_(
    body,
    'Manager',
    String(cycle['Manager Name'] || ''),
    managerSignature,
    cycle['Manager Signed At']
  );
  appendCompensationSignatureBlock_(
    body,
    'Employee',
    String(cycle['Employee Name'] || ''),
    employeeSignature,
    cycle['Employee Signed At']
  );
  appendCompensationSignatureBlock_(
    body,
    'HR',
    String(cycle['HR Name'] || ''),
    hrSignature,
    cycle['HR Signed At']
  );

  body.appendParagraph('');
  body.appendParagraph(
    'By signing, the employee acknowledges receipt of the approved compensation adjustment shown above.'
  );

  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF).setName(fileName);
  const pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(fileName);
  // Provenance stays on the Drive file description (HR/system), not body text.
  pdfFile.setDescription(buildCompensationCafProvenance_(cycleId, record));
  docFile.setTrashed(true);
  ensureHumanReadableCompensationCafName_(pdfFile.getId(), cycleId);

  return pdfFile.getId();
}

/**
 * Map a PR role to its combined authoritative-signature state flag.
 */
function isAuthoritativeRoleSigned_(cycle, role) {
  const state = getCombinedSignatureState_(cycle);
  if (role === PR.ROLE.MANAGER) return !!state.managerSigned;
  if (role === PR.ROLE.EMPLOYEE) return !!state.employeeSigned;
  if (role === PR.ROLE.HR) return !!state.hrSigned;
  throw new Error('Unknown signature role: ' + String(role));
}

/**
 * Validate and load the authoritative role signature image for the CAF.
 *
 * Fails closed. Proves, before returning the blob, that the artifact is:
 *   - the authoritative winning signature for this role (same file ID recorded
 *     across both the Manager Review and Self-Evaluation signature columns),
 *   - signed (role signature state is true),
 *   - stored in an approved signature folder (Review Records or Signature
 *     Recovery),
 *   - named deterministically for THIS cycle + role (canonical or legacy), and
 *   - a readable PNG whose provenance marker (when present) matches the exact
 *     cycle + role.
 *
 * This blocks a mislinked File ID (e.g. pointing to another role's or another
 * cycle's valid PNG) from sealing a compensation agreement.
 */
function validateAuthoritativeRoleSignature_(cycle, role) {
  const cycleId = String(cycle['Cycle ID'] || '');

  if (!isAuthoritativeRoleSigned_(cycle, role)) {
    throw new Error(
      role +
        ' signature is not the authoritative winner for this cycle; CAF cannot be sealed.'
    );
  }

  const fileId = String(cycle[role + ' Signature File ID'] || '').trim();
  if (!fileId) {
    throw new Error(
      role + ' signature file ID is missing; CAF cannot be sealed.'
    );
  }

  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (error) {
    throw new Error(
      role +
        ' signature image could not be read (' +
        fileId +
        '): ' +
        String(error.message || error)
    );
  }

  const settings = getSettings_();
  const allowedFolders = [
    String(settings.REVIEW_FOLDER_ID || ''),
    String(settings.SIGNATURE_RECOVERY_FOLDER_ID || ''),
  ].filter(Boolean);
  const inApprovedFolder = allowedFolders.some(function (folderId) {
    return isDriveFileInFolder_(file, folderId);
  });
  if (!inApprovedFolder) {
    throw new Error(
      role +
        ' signature artifact is not in an approved signature folder (' +
        fileId +
        ').'
    );
  }

  const mime = String(file.getMimeType() || '');
  if (mime !== MimeType.PNG && mime !== 'image/png') {
    throw new Error(
      role + ' signature artifact must be image/png (' + fileId + ').'
    );
  }

  const name = String(file.getName() || '');
  const canonical = buildCanonicalSignatureFileName_(cycleId, role);
  const legacy = buildLegacySignatureFileName_(cycleId, role);
  const provenance = parseSignatureProvenance_(
    String(file.getDescription() || '')
  );
  const cycleRoleProof =
    name === legacy ||
    (name === canonical &&
      (!provenance ||
        (provenance.cycleId === cycleId &&
          provenance.role === signatureRoleToken_(role)))) ||
    (provenance &&
      provenance.cycleId === cycleId &&
      provenance.role === signatureRoleToken_(role));

  if (!cycleRoleProof) {
    throw new Error(
      role +
        ' signature artifact does not prove role + cycle provenance (' +
        fileId +
        ', name="' +
        name +
        '").'
    );
  }

  return file.getBlob();
}

function appendCompensationSignatureBlock_(body, role, name, signatureBlob, signedAt) {
  body.appendParagraph(role + ' Signature');
  body.appendParagraph(name || '');
  body.appendParagraph(
    'Signed At: ' + (formatDateTime_(signedAt) || 'Not Recorded')
  );
  body.appendImage(signatureBlob).setWidth(220);
  body.appendParagraph('');
}

function formatMoney_(value) {
  const amount = Number(value || 0);
  return (
    '$' +
    amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatPercentDisplay_(fraction) {
  return (
    (Math.round(Number(fraction || 0) * 10000) / 100).toFixed(2) + '%'
  );
}

/**
 * HR recovery for a CAF PDF stuck in Delivery Unknown (or Failed).
 *
 * Reconciles against durable Drive evidence instead of blindly regenerating:
 *  - exactly one valid deterministic candidate → reconcile/seal it
 *  - zero candidates → clear the Unknown claim and regenerate under a fresh claim
 *  - multiple candidates → raise a blocking alert; require HR selection
 */
function recoverCompensationCafPdf_(cycleId) {
  const email = getCurrentUserEmail_();
  if (!isHrUser_(email)) {
    throw new Error('Only HR may recover compensation CAF PDFs.');
  }
  ensureCompensationDataModel_();

  const recordLoc = findCompensationRecordByCycle_(cycleId);
  const record = recordLoc.object;

  if (
    String(record['Status']) === V31_COMP.STATUS.COMPLETE &&
    String(record['CAF Final PDF ID'] || '')
  ) {
    // Already sealed; make sure history exists, then return.
    ensureCompensationHistory_(cycleId);
    return {
      ok: true,
      alreadyComplete: true,
      pdfId: String(record['CAF Final PDF ID'] || ''),
    };
  }

  // Separate valid from rejected artifacts. A rejected (no-provenance/foreign)
  // same-named file never blocks reconciling a single valid candidate and is
  // retained as evidence — never trashed.
  const artifacts = collectCompensationCafArtifacts_(cycleId, record);
  const candidates = artifacts.valid;
  const rejected = artifacts.rejected || [];

  if (candidates.length > 1) {
    recordCompensationCafAmbiguityAlert_(cycleId, record, candidates, rejected);
    const error = new Error(
      'Multiple deterministic CAF PDF artifacts exist for ' +
        cycleId +
        '. HR reconciliation is required.'
    );
    error.code = 'AMBIGUOUS_CAF_ARTIFACTS';
    error.candidates = candidates;
    throw error;
  }

  if (candidates.length === 1) {
    commitCompensationCafSealed_(cycleId, candidates[0].id, {});
    audit_(
      cycleId,
      'Compensation CAF PDF reconciled from Drive',
      email,
      V31_COMP.PDF.UNKNOWN,
      V31_COMP.PDF.COMPLETE,
      JSON.stringify({ pdfId: candidates[0].id, rejected: rejected })
    );
    return {
      ok: true,
      reconciled: true,
      pdfId: candidates[0].id,
      rejected: rejected,
    };
  }

  // Zero valid candidates: clear the Unknown claim and regenerate. Preserve any
  // rejected-artifact evidence in the record's last error for HR visibility.
  const rejectionNote = rejected.length
    ? ' Rejected same-named artifacts retained (not trashed): ' +
      rejected
        .map(function (item) {
          return item.id + ' (' + item.reason + ')';
        })
        .join('; ')
    : '';
  withLock_(function () {
    const loc = findCompensationRecordByCycle_(cycleId);
    const rec = loc.object;
    if (
      String(rec['CAF PDF Status']) === V31_COMP.PDF.UNKNOWN ||
      String(rec['CAF PDF Status']) === V31_COMP.PDF.FAILED
    ) {
      rec['CAF PDF Status'] = V31_COMP.PDF.PENDING;
      rec['CAF PDF Last Error'] =
        'HR recovery: no durable valid CAF artifact found; regenerating.' +
        rejectionNote;
      rec['CAF PDF Attempt ID'] = '';
      rec['CAF PDF Started At'] = '';
      rec['Updated At'] = new Date();
      writeCompensationRecord_(loc.rowNumber, rec);
      SpreadsheetApp.flush();
    }
  });

  return ensureCompensationCafPdf_(cycleId);
}

/** Public HR-callable wrapper for CAF PDF recovery. */
function recoverCompensationCafPdf(cycleId) {
  return recoverCompensationCafPdf_(String(cycleId || ''));
}

function recordCompensationCafAmbiguityAlert_(
  cycleId,
  record,
  candidates,
  rejected
) {
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        cycleId,
        'Compensation',
        'caf:ambiguous'
      ),
      cycleId: cycleId,
      severity: 'Blocking',
      component: 'Compensation',
      subject: 'Compensation CAF PDF requires reconciliation',
      details: {
        compensationRecordId: String(
          record['Compensation Record ID'] || ''
        ),
        candidates: (candidates || []).map(function (item) {
          return { id: String(item.id || ''), name: String(item.name || '') };
        }),
        rejected: (rejected || []).map(function (item) {
          return {
            id: String(item.id || ''),
            name: String(item.name || ''),
            reason: String(item.reason || ''),
          };
        }),
      },
      lastError:
        'Multiple deterministic CAF PDF artifacts were found for this cycle.',
    });
  } catch (alertError) {
    Logger.log(
      'CAF ambiguity alert persistence failed: ' +
        String(alertError.message || alertError)
    );
  }
}
