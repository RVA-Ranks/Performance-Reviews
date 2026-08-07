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
    //   0 candidates       → clean Failed (no side effect to reconcile)
    //   >1 candidates      → Delivery Unknown + blocking ambiguity alert
    let candidates = [];
    let ambiguous = false;
    try {
      const record = findCompensationRecordByCycle_(cycleId).object;
      candidates = listCompensationCafCandidates_(cycleId, record);
    } catch (reconcileError) {
      if (reconcileError && reconcileError.code === 'AMBIGUOUS_CAF_ARTIFACTS') {
        ambiguous = true;
      }
    }

    if (!ambiguous && candidates.length === 1) {
      return commitCompensationCafSealed_(cycleId, candidates[0].id, {
        expectedAttemptId: claimed.attemptId,
      });
    }

    const unresolvedStatus =
      ambiguous || candidates.length > 1
        ? V31_COMP.PDF.UNKNOWN
        : V31_COMP.PDF.FAILED;

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
      recordCompensationCafAmbiguityAlert_(cycleId, record, candidates);
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
      const effective = v31Date_(record['Compensation Effective Date']);
      const today = v31Today_();
      if (effective && effective.getTime() > today.getTime()) {
        record['Rate Update Status'] =
          V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
      } else {
        record['Rate Update Status'] = V31_COMP.RATE_UPDATE.PENDING;
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
  }

  return result;
}

function buildCompensationCafFileName_(cycleId) {
  return 'AITHERAS_' + cycleId + '_Compensation_Adjustment_FINAL.pdf';
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
    String(file.getName()) !== buildCompensationCafFileName_(cycleId)
  ) {
    throw new Error('Candidate CAF ' + fileId + ' name mismatch.');
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

/** Return all deterministic-name CAF candidates that pass strict validation. */
function listCompensationCafCandidates_(cycleId, record) {
  const settings = getSettings_();
  const folderId = String(settings.COMPENSATION_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error(
      'COMPENSATION_FOLDER_ID is not configured. HR must set the compensation Drive folder.'
    );
  }
  const folder = DriveApp.getFolderById(folderId);
  const fileName = buildCompensationCafFileName_(cycleId);
  const files = folder.getFilesByName(fileName);
  const matches = [];
  const seen = {};
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;
    const id = assertValidCompensationCafFile_(
      file,
      cycleId,
      record,
      folderId
    );
    if (!seen[id]) {
      seen[id] = true;
      matches.push({
        id: id,
        name: String(file.getName() || ''),
        updatedAt: file.getLastUpdated()
          ? file.getLastUpdated().toISOString()
          : '',
      });
    }
  }
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
    return existingId;
  }

  const managerSignature = loadRequiredSignatureBlob_(
    'Manager',
    cycle['Manager Signature File ID']
  );
  const employeeSignature = loadRequiredSignatureBlob_(
    'Employee',
    cycle['Employee Signature File ID']
  );
  const hrSignature = loadRequiredSignatureBlob_(
    'HR',
    cycle['HR Signature File ID']
  );

  const doc = DocumentApp.create(
    'AITHERAS_' + cycleId + '_Compensation_Adjustment_WORKING'
  );
  const body = doc.getBody();
  body.clear();

  body
    .appendParagraph('AITHERAS')
    .setHeading(DocumentApp.ParagraphHeading.TITLE)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body
    .appendParagraph('Compensation Adjustment Agreement')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body
    .appendParagraph('Review Cycle ID: ' + cycleId)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendHorizontalRule();

  const identity = body.appendTable([
    ['Employee', String(record['Employee Name'] || '')],
    ['Employee Email', String(record['Employee Email'] || '')],
    ['Manager', String(record['Manager Name'] || '')],
    ['Job Title', String(cycle['Employee Job Title'] || '')],
    ['Department / Project', String(cycle['Department / Project'] || '')],
  ]);
  styleInfoTable_(identity);

  body
    .appendParagraph('Current Compensation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const currentTable = body.appendTable([
    [
      'Current Pay Rate',
      formatMoney_(Number(record['Original Pay Rate'] || 0)),
    ],
    [
      'Current Annual Salary',
      formatMoney_(Number(record['Original Annual Salary'] || 0)),
    ],
  ]);
  styleInfoTable_(currentTable);

  body
    .appendParagraph('Manager Recommendation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const recommendationTable = body.appendTable([
    [
      'Recommended Pay Rate',
      formatMoney_(Number(record['Manager Recommended Pay Rate'] || 0)),
    ],
    [
      'Recommended Annual Salary',
      formatMoney_(
        Number(record['Manager Recommended Annual Salary'] || 0)
      ),
    ],
    [
      'Recommended Increase',
      formatPercentDisplay_(
        Number(record['Manager Recommended Percent'] || 0)
      ),
    ],
    [
      'Business Justification',
      String(record['Manager Business Justification'] || ''),
    ],
    [
      'Proposed Effective Date',
      formatDate_(record['Manager Proposed Effective Date']) || '',
    ],
    [
      'Submitted By',
      String(record['Manager Recommendation Submitted By'] || ''),
    ],
    [
      'Submitted At',
      formatDateTime_(record['Manager Recommendation Submitted At']) || '',
    ],
  ]);
  styleInfoTable_(recommendationTable);

  body
    .appendParagraph('Final Approved Compensation')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const finalTable = body.appendTable([
    [
      'Final Approved Pay Rate',
      formatMoney_(Number(record['Final Approved Pay Rate'] || 0)),
    ],
    [
      'Final Approved Annual Salary',
      formatMoney_(Number(record['Final Approved Annual Salary'] || 0)),
    ],
    [
      'Final Approved Increase',
      formatPercentDisplay_(Number(record['Final Approved Percent'] || 0)),
    ],
    [
      'Recommendation Accepted',
      String(record['Recommendation Accepted'] || ''),
    ],
    [
      'Effective Date',
      formatDate_(record['Compensation Effective Date']) || '',
    ],
  ]);
  styleInfoTable_(finalTable);

  body
    .appendParagraph('Owner Decision')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const ownerTable = body.appendTable([
    ['Approved by', String(record['Owner Name'] || '')],
    [
      'Decision recorded by',
      String(record['Owner Decision Recorded By'] || ''),
    ],
    [
      'Decision date',
      formatDateTime_(record['Owner Decision At']) || '',
    ],
    ['Decision notes', String(record['Owner Decision Notes'] || '')],
  ]);
  styleInfoTable_(ownerTable);

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
  pdfFile.setDescription(buildCompensationCafProvenance_(cycleId, record));
  docFile.setTrashed(true);

  return pdfFile.getId();
}

/**
 * Load and validate a required signature image blob.
 * Fails closed: a missing file ID or unreadable/non-image artifact throws so
 * the CAF cannot be sealed with a placeholder signature.
 */
function loadRequiredSignatureBlob_(role, fileId) {
  const id = String(fileId || '').trim();
  if (!id) {
    throw new Error(
      role + ' signature file ID is missing; CAF cannot be sealed.'
    );
  }
  let blob;
  try {
    blob = DriveApp.getFileById(id).getBlob();
  } catch (error) {
    throw new Error(
      role +
        ' signature image could not be read (' +
        id +
        '): ' +
        String(error.message || error)
    );
  }
  const contentType = String((blob && blob.getContentType()) || '');
  if (contentType.indexOf('image/') !== 0) {
    throw new Error(
      role +
        ' signature artifact is not a valid image (' +
        id +
        ', type=' +
        contentType +
        ').'
    );
  }
  return blob;
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

  let candidates;
  try {
    candidates = listCompensationCafCandidates_(cycleId, record);
  } catch (error) {
    if (error && error.code === 'AMBIGUOUS_CAF_ARTIFACTS') {
      recordCompensationCafAmbiguityAlert_(
        cycleId,
        record,
        error.candidates
      );
    }
    throw error;
  }

  if (candidates.length > 1) {
    recordCompensationCafAmbiguityAlert_(cycleId, record, candidates);
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
    const sealed = commitCompensationCafSealed_(cycleId, candidates[0].id, {});
    audit_(
      cycleId,
      'Compensation CAF PDF reconciled from Drive',
      email,
      V31_COMP.PDF.UNKNOWN,
      V31_COMP.PDF.COMPLETE,
      JSON.stringify({ pdfId: candidates[0].id })
    );
    return { ok: true, reconciled: true, pdfId: candidates[0].id };
  }

  // Zero candidates: it is safe to clear the Unknown claim and regenerate.
  withLock_(function () {
    const loc = findCompensationRecordByCycle_(cycleId);
    const rec = loc.object;
    if (String(rec['CAF PDF Status']) === V31_COMP.PDF.UNKNOWN) {
      rec['CAF PDF Status'] = V31_COMP.PDF.PENDING;
      rec['CAF PDF Last Error'] =
        'HR recovery: no durable CAF artifact found; regenerating.';
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

function recordCompensationCafAmbiguityAlert_(cycleId, record, candidates) {
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
