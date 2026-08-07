/**
 * V31 Compensation Integration
 *
 * Manager recommends → HR records owner decision → PR signatures → CAF PDF
 * → CompensationHistory → effective-date Current Pay Rate update.
 *
 * Authoritative live record: CompensationRecords
 * ReviewCycles holds summary/gate mirrors only.
 */

const V31_COMP = Object.freeze({
  RECORDS_SHEET: 'CompensationRecords',
  HISTORY_SHEET: 'CompensationHistory',
  STANDARD_ANNUAL_HOURS: 2080,
  HISTORY_EVENT_PREFIX: 'COMPENSATION_FINAL:',

  STATUS: {
    PENDING: 'Pending',
    AWAITING_OWNER: 'Awaiting Owner Decision',
    AWAITING_SIGNATURES: 'Awaiting Signatures',
    COMPLETE: 'Complete',
    DENIED: 'Denied',
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
  },

  OWNER_DECISION: {
    APPROVED: 'Approved',
    MODIFIED: 'Modified',
    DENIED: 'Denied',
  },

  RATE_UPDATE: {
    PENDING: 'Pending',
    UPDATING: 'Updating',
    PENDING_EFFECTIVE: 'Pending Effective Date',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
    CONFLICT: 'Conflict',
  },

  PDF: {
    PENDING: 'Pending',
    GENERATING: 'Generating',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
  },

  HISTORY: {
    PENDING: 'Pending',
    WRITING: 'Writing',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
  },

  MANAGER_OUTCOME_CONFIRM_TOKEN: 'MARK_MANAGER_OUTCOME_EMAIL_CONFIRMED',
  MANAGER_OUTCOME_RESEND_TOKEN: 'RESEND_MANAGER_OUTCOME_EMAIL_UNKNOWN',
  MANAGER_OUTCOME_CONFIRM_EVENT_PREFIX: 'MANAGER_OUTCOME_EMAIL_CONFIRMED:',

  RECORD_HEADERS: [
    'Compensation Record ID',
    'Review Cycle ID',
    'Employee Email',
    'Employee Name',
    'Manager Email',
    'Manager Name',
    'Original Pay Rate',
    'Original Annual Salary',
    'Manager Recommended Pay Rate',
    'Manager Recommended Annual Salary',
    'Manager Recommended Percent',
    'Manager Business Justification',
    'Manager Proposed Effective Date',
    'Manager Recommendation Submitted At',
    'Manager Recommendation Submitted By',
    'Final Approved Pay Rate',
    'Final Approved Annual Salary',
    'Final Approved Percent',
    'Recommendation Accepted',
    'Compensation Effective Date',
    'Owner Name',
    'Owner Decision',
    'Owner Decision At',
    'Owner Decision Recorded By',
    'Owner Decision Notes',
    'Status',
    'Manager Outcome Email Status',
    'Manager Outcome Email Attempt ID',
    'Manager Outcome Email Started At',
    'Manager Outcome Email Sent At',
    'Manager Outcome Email Last Error',
    'CAF PDF Status',
    'CAF PDF Attempt ID',
    'CAF PDF Started At',
    'CAF Final PDF ID',
    'CAF Final PDF Created At',
    'CAF PDF Last Error',
    'CAF PDF Recovery Details JSON',
    'Compensation History Status',
    'Compensation History Attempt ID',
    'Compensation History Written At',
    'Compensation History Last Error',
    'Rate Update Status',
    'Rate Update Attempt ID',
    'Rate Update Started At',
    'Rate Updated At',
    'Rate Update Last Error',
    'Created At',
    'Updated At',
  ],

  HISTORY_HEADERS: [
    'History ID',
    'Employee Email',
    'Employee Name',
    'Previous Pay Rate',
    'Previous Annual Salary',
    'New Pay Rate',
    'New Annual Salary',
    'Change Amount',
    'Change Percent',
    'Effective Date',
    'Review Cycle ID',
    'Compensation Record ID',
    'CAF Final PDF ID',
    'Manager Recommended Pay Rate',
    'Manager Recommended Annual Salary',
    'Manager Recommended Percent',
    'Manager Business Justification',
    'Recommendation Accepted',
    'Owner Name',
    'Owner Decision At',
    'Owner Decision Recorded By',
    'Owner Decision Notes',
    'Finalized At',
    'Finalized By',
  ],

  CYCLE_HEADERS: [
    'Compensation Decision',
    'Compensation Decision Notes',
    'Compensation Decision At',
    'Compensation Decision By',
    'Compensation Status',
    'Compensation Record ID',
    'CAF Final PDF ID',
  ],
});

/* ============================ DATA MODEL ============================ */

function ensureCompensationDataModel_() {
  const ss = getSpreadsheet_();
  const settingsSheet = ss.getSheetByName(PR.SHEETS.SETTINGS);
  const assignments = ss.getSheetByName(PR.SHEETS.ASSIGNMENTS);
  const cycles = ss.getSheetByName(PR.SHEETS.CYCLES);
  const records =
    ss.getSheetByName(V31_COMP.RECORDS_SHEET) ||
    ss.insertSheet(V31_COMP.RECORDS_SHEET);
  const history =
    ss.getSheetByName(V31_COMP.HISTORY_SHEET) ||
    ss.insertSheet(V31_COMP.HISTORY_SHEET);

  ensureHeaders_(settingsSheet, ['Key', 'Value']);
  ensureHeaders_(assignments, [
    'Employee Email',
    'Employee Name',
    'Manager Email',
    'Manager Name',
    'Job Title',
    'Department / Project',
    'Hire Date',
    'Current Pay Rate',
    'Active',
    'Review Automation',
  ]);
  ensureHeaders_(cycles, V31_COMP.CYCLE_HEADERS);
  ensureHeaders_(records, V31_COMP.RECORD_HEADERS);
  ensureHeaders_(history, V31_COMP.HISTORY_HEADERS);

  const current = readSettings_(settingsSheet);
  if (!('COMPENSATION_FOLDER_ID' in current)) {
    settingsSheet.appendRow(['COMPENSATION_FOLDER_ID', '']);
  }
  if (!('COMPENSATION_DECISION_REQUIRED' in current)) {
    settingsSheet.appendRow(['COMPENSATION_DECISION_REQUIRED', 'TRUE']);
  }

  formatSingleSheet_(records);
  formatSingleSheet_(history);
  protectV31Sheet_(records);
  protectV31Sheet_(history);

  migrateLegacyCompensationDecisions_();
}

function migrateLegacyCompensationDecisions_() {
  const cycles = getAllObjects_(PR.SHEETS.CYCLES);
  cycles.forEach(function (cycle) {
    const decision = String(cycle['Compensation Decision'] || '');
    if (decision !== 'Adjustment Submitted') {
      return;
    }
    try {
      const location = findCycle_(cycle['Cycle ID']);
      const stored = location.object;
      if (String(stored['Compensation Decision']) !== 'Adjustment Submitted') {
        return;
      }
      stored['Compensation Decision'] = V31.COMPENSATION.ADJUSTMENT;
      if (!String(stored['Compensation Status'] || '').trim()) {
        stored['Compensation Status'] = V31_COMP.STATUS.AWAITING_OWNER;
      }
      stored['Updated At'] = new Date();
      writeCycle_(location.rowNumber, stored);
    } catch (error) {
      // Migration is best-effort; leave row for next ensure pass.
    }
  });
}

/* ============================ MATH / LOOKUPS ============================ */

function annualSalaryFromRate_(rate) {
  return roundCurrency_(Number(rate) * V31_COMP.STANDARD_ANNUAL_HOURS);
}

function roundCurrency_(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundPercent_(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

function normalizeCompensationDecision_(raw) {
  const value = String(raw || V31.COMPENSATION.PENDING).trim();
  if (value === 'Adjustment Submitted') {
    return V31.COMPENSATION.ADJUSTMENT;
  }
  return value || V31.COMPENSATION.PENDING;
}

function getAssignmentPayRate_(employeeEmail) {
  const normalized = normalizeEmail_(employeeEmail);
  const rows = getAllObjects_(PR.SHEETS.ASSIGNMENTS);
  for (let i = 0; i < rows.length; i++) {
    if (normalizeEmail_(rows[i]['Employee Email']) !== normalized) {
      continue;
    }
    const rate = Number(rows[i]['Current Pay Rate']);
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        found: true,
        rate: null,
        employeeName: String(rows[i]['Employee Name'] || ''),
        row: rows[i],
      };
    }
    return {
      found: true,
      rate: roundCurrency_(rate),
      annual: annualSalaryFromRate_(rate),
      employeeName: String(rows[i]['Employee Name'] || ''),
      row: rows[i],
    };
  }
  return { found: false, rate: null };
}

function findCompensationRecordByCycle_(cycleId) {
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) {
    throw new Error('CompensationRecords sheet is missing.');
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('Compensation record not found.');
  }
  const headers = values[0].map(String);
  const cycleIndex = headers.indexOf('Review Cycle ID');
  for (let row = 1; row < values.length; row++) {
    if (String(values[row][cycleIndex]) === String(cycleId)) {
      const object = {};
      headers.forEach(function (header, index) {
        object[header] = values[row][index];
      });
      return { rowNumber: row + 1, object: object };
    }
  }
  throw new Error('Compensation record not found.');
}

function findCompensationRecordByCycleOptional_(cycleId) {
  try {
    return findCompensationRecordByCycle_(cycleId);
  } catch (error) {
    return null;
  }
}

function writeCompensationRecord_(rowNumber, object) {
  writeObject_(V31_COMP.RECORDS_SHEET, rowNumber, object);
}

function appendCompensationRecord_(object) {
  return appendObject_(
    V31_COMP.RECORDS_SHEET,
    V31_COMP.RECORD_HEADERS,
    object
  );
}

function historyExistsForRecord_(recordId) {
  const historyId = V31_COMP.HISTORY_EVENT_PREFIX + String(recordId);
  const rows = getAllObjects_(V31_COMP.HISTORY_SHEET);
  return rows.some(function (row) {
    return String(row['History ID'] || '') === historyId;
  });
}

function appendCompensationHistoryOnce_(record, finalizedBy) {
  const recordId = String(record['Compensation Record ID'] || '');
  const historyId = V31_COMP.HISTORY_EVENT_PREFIX + recordId;
  if (historyExistsForRecord_(recordId)) {
    return { appended: false, historyId: historyId };
  }

  const previous = Number(record['Original Pay Rate']);
  const next = Number(record['Final Approved Pay Rate']);
  appendObject_(V31_COMP.HISTORY_SHEET, V31_COMP.HISTORY_HEADERS, {
    'History ID': historyId,
    'Employee Email': normalizeEmail_(record['Employee Email']),
    'Employee Name': String(record['Employee Name'] || ''),
    'Previous Pay Rate': previous,
    'Previous Annual Salary': annualSalaryFromRate_(previous),
    'New Pay Rate': next,
    'New Annual Salary': annualSalaryFromRate_(next),
    'Change Amount': roundCurrency_(next - previous),
    'Change Percent': Number(record['Final Approved Percent'] || 0),
    'Effective Date': record['Compensation Effective Date'],
    'Review Cycle ID': String(record['Review Cycle ID'] || ''),
    'Compensation Record ID': recordId,
    'CAF Final PDF ID': String(record['CAF Final PDF ID'] || ''),
    'Manager Recommended Pay Rate': Number(
      record['Manager Recommended Pay Rate'] || 0
    ),
    'Manager Recommended Annual Salary': Number(
      record['Manager Recommended Annual Salary'] || 0
    ),
    'Manager Recommended Percent': Number(
      record['Manager Recommended Percent'] || 0
    ),
    'Manager Business Justification': String(
      record['Manager Business Justification'] || ''
    ),
    'Recommendation Accepted': String(
      record['Recommendation Accepted'] || ''
    ),
    'Owner Name': String(record['Owner Name'] || ''),
    'Owner Decision At': record['Owner Decision At'] || '',
    'Owner Decision Recorded By': String(
      record['Owner Decision Recorded By'] || ''
    ),
    'Owner Decision Notes': String(record['Owner Decision Notes'] || ''),
    'Finalized At': new Date(),
    'Finalized By': String(finalizedBy || ''),
  });

  return { appended: true, historyId: historyId };
}

/**
 * Idempotently ensure a CompensationHistory row exists for a sealed CAF.
 *
 * A sealed CAF (Status=Complete with a Final PDF ID) must always yield exactly
 * one immutable history row. This can be called again after a partial failure
 * (even when the CAF itself is already Complete) to repair missing history.
 * Progress is tracked in a dedicated durable "Compensation History Status".
 */
function ensureCompensationHistory_(cycleId) {
  ensureCompensationDataModel_();
  return withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const recordId = String(record['Compensation Record ID'] || '');

    // History only exists for a sealed final compensation agreement.
    if (
      String(record['Status']) !== V31_COMP.STATUS.COMPLETE ||
      !String(record['CAF Final PDF ID'] || '')
    ) {
      return { ok: false, reason: 'not-sealed' };
    }

    if (
      String(record['Compensation History Status'] || '') ===
        V31_COMP.HISTORY.COMPLETE &&
      historyExistsForRecord_(recordId)
    ) {
      return { ok: true, alreadyComplete: true };
    }

    const attemptId = Utilities.getUuid();
    record['Compensation History Status'] = V31_COMP.HISTORY.WRITING;
    record['Compensation History Attempt ID'] = attemptId;
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    try {
      const appendResult = appendCompensationHistoryOnce_(
        record,
        Session.getEffectiveUser().getEmail()
      );
      record['Compensation History Status'] = V31_COMP.HISTORY.COMPLETE;
      record['Compensation History Attempt ID'] = '';
      record['Compensation History Written At'] = new Date();
      record['Compensation History Last Error'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      SpreadsheetApp.flush();
      return {
        ok: true,
        appended: !!appendResult.appended,
        historyId: appendResult.historyId,
      };
    } catch (error) {
      const failLoc = findCompensationRecordByCycle_(cycleId);
      const failRecord = failLoc.object;
      failRecord['Compensation History Status'] = V31_COMP.HISTORY.FAILED;
      failRecord['Compensation History Attempt ID'] = '';
      failRecord['Compensation History Last Error'] = String(
        error.message || error
      );
      failRecord['Updated At'] = new Date();
      writeCompensationRecord_(failLoc.rowNumber, failRecord);
      SpreadsheetApp.flush();
      throw error;
    }
  });
}

/* ============================ GATE ============================ */

/**
 * True when the cycle's compensation obligation is fully sealed for review
 * completion: either no adjustment was recommended, or an adjustment exists
 * and its CAF PDF has been sealed (Status = Complete with a Final PDF ID).
 */
/**
 * Pure classification of the compensation finalization requirement.
 *   'skip'    → compensation not required, or explicit No Adjustment
 *   'require' → an adjustment was recommended; a sealed CAF is required
 *   'block'   → Pending, blank, or unexpected value; completion must be blocked
 */
function compensationFinalizationDisposition_(decisionRaw, compensationRequired) {
  const decision = normalizeCompensationDecision_(decisionRaw);
  // An existing adjustment always requires a sealed CAF, even if the optional
  // COMPENSATION_DECISION_REQUIRED setting is later turned off.
  if (decision === V31.COMPENSATION.ADJUSTMENT) {
    return 'require';
  }
  if (decision === V31.COMPENSATION.NONE) {
    return 'skip';
  }
  // Pending / blank / unexpected: optional only when the setting allows it.
  if (!compensationRequired) {
    return 'skip';
  }
  return 'block';
}

/**
 * Authoritative final-packet CAF binding for a cycle.
 * Approved/Modified adjustments require a sealed CAF ID.
 * Denied / no-record / no-adjustment → cafRequired=false.
 */
function getFinalDistributionCafBinding_(cycleId) {
  const recordLoc = findCompensationRecordByCycleOptional_(cycleId);
  if (!recordLoc) {
    return { cafRequired: false, cafPdfId: '', reason: 'no-record' };
  }
  const record = recordLoc.object;
  const ownerDecision = String(record['Owner Decision'] || '');
  const status = String(record['Status'] || '');
  if (
    ownerDecision === V31_COMP.OWNER_DECISION.DENIED ||
    status === V31_COMP.STATUS.DENIED
  ) {
    return { cafRequired: false, cafPdfId: '', reason: 'denied' };
  }
  const approved =
    ownerDecision === V31_COMP.OWNER_DECISION.APPROVED ||
    ownerDecision === V31_COMP.OWNER_DECISION.MODIFIED ||
    (isApprovedCompensationAdjustment_(record) &&
      record['Final Approved Pay Rate'] !== '' &&
      record['Final Approved Pay Rate'] != null);
  if (!approved) {
    return { cafRequired: false, cafPdfId: '', reason: 'not-approved' };
  }
  return {
    cafRequired: true,
    cafPdfId: String(record['CAF Final PDF ID'] || ''),
    reason: 'approved-adjustment',
  };
}

function buildFinalDistributionPacketSpec_(managerPdfId, selfPdfId, cafBinding) {
  const binding = cafBinding || { cafRequired: false, cafPdfId: '' };
  return {
    managerPdfId: String(managerPdfId || ''),
    selfPdfId: String(selfPdfId || ''),
    cafRequired: !!binding.cafRequired,
    cafPdfId: binding.cafRequired ? String(binding.cafPdfId || '') : '',
  };
}

function classifyFinalDistributionAttachmentCount_(packetSpec) {
  return packetSpec && packetSpec.cafRequired ? 3 : 2;
}

/**
 * Validate a sealed CAF PDF ID for final distribution.
 * Fails closed when cafRequired and the file is missing/invalid.
 */
function validateAuthoritativeCafPdfId_(cycleId, fileId) {
  const id = String(fileId || '').trim();
  if (!id) {
    throw new Error(
      'CAF PDF ID is required for an approved compensation final packet.'
    );
  }
  const record = findCompensationRecordByCycle_(cycleId).object;
  const settings = getSettings_();
  const folderId = String(settings.COMPENSATION_FOLDER_ID || '').trim();
  if (!folderId) {
    throw new Error(
      'COMPENSATION_FOLDER_ID is not configured; approved CAF cannot be validated.'
    );
  }
  let file;
  try {
    file = DriveApp.getFileById(id);
  } catch (error) {
    throw new Error(
      'CAF PDF could not be read (' + id + '): ' + String(error.message || error)
    );
  }
  assertValidCompensationCafFile_(file, cycleId, record, folderId);
  return id;
}

function isCompensationSealedForFinalization_(cycle) {
  const settings = getSettings_();
  const disposition = compensationFinalizationDisposition_(
    cycle['Compensation Decision'],
    v31Boolean_(settings.COMPENSATION_DECISION_REQUIRED, true)
  );
  // Fail closed: only 'skip' passes without a sealed CAF; 'block' never passes.
  if (disposition === 'skip') {
    return true;
  }
  if (disposition === 'block') {
    return false;
  }

  // Denied recommendations may still have a CompensationRecords row; treat them
  // as resolved without a CAF when the record says Denied.
  const recordLoc = findCompensationRecordByCycleOptional_(cycle['Cycle ID']);
  if (
    recordLoc &&
    (String(recordLoc.object['Owner Decision'] || '') ===
      V31_COMP.OWNER_DECISION.DENIED ||
      String(recordLoc.object['Status'] || '') === V31_COMP.STATUS.DENIED)
  ) {
    return true;
  }

  if (!recordLoc) {
    return false;
  }
  const record = recordLoc.object;
  if (
    String(record['Status']) !== V31_COMP.STATUS.COMPLETE ||
    !String(record['CAF Final PDF ID'] || '')
  ) {
    return false;
  }
  // History must exist for a sealed CAF.
  if (
    String(record['Compensation History Status'] || '') !==
      V31_COMP.HISTORY.COMPLETE &&
    !historyExistsForRecord_(String(record['Compensation Record ID'] || ''))
  ) {
    return false;
  }
  // Roster update must be Complete or safely deferred to the effective date.
  const rateStatus = String(record['Rate Update Status'] || '');
  return (
    rateStatus === V31_COMP.RATE_UPDATE.COMPLETE ||
    rateStatus === V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE
  );
}

/**
 * Ensure the CAF is generated/sealed as part of finalization for an
 * adjustment-bearing cycle. Throws if it cannot be sealed so review Complete
 * is gated (option A: no falsely-healthy completion).
 */
function ensureCompensationSealedForFinalization_(cycleId) {
  const settings = getSettings_();
  const cycle = findCycle_(cycleId).object;
  const disposition = compensationFinalizationDisposition_(
    cycle['Compensation Decision'],
    v31Boolean_(settings.COMPENSATION_DECISION_REQUIRED, true)
  );

  if (disposition === 'skip') {
    return { skipped: true, reason: 'no-adjustment-or-not-required' };
  }

  // Pending, blank, or unexpected values are not a valid completion state.
  if (disposition === 'block') {
    throw new Error(
      'Review completion is blocked: the compensation decision is "' +
        String(cycle['Compensation Decision'] || '(blank)') +
        '" and must be resolved (No Adjustment or a sealed adjustment) first.'
    );
  }

  const result = maybeGenerateCompensationPdfAfterSignatures_(cycleId);
  // Ensure history + due roster update before Complete is allowed.
  ensureCompensationHistory_(cycleId);
  try {
    applyCompensationRateUpdateOnce_(cycleId);
  } catch (rateError) {
    // Conflict / Unknown / future date are reflected in Rate Update Status;
    // the seal gate below decides whether Complete may proceed.
    Logger.log(
      'Finalization roster update: ' + String(rateError.message || rateError)
    );
  }
  const refreshed = findCycle_(cycleId).object;
  if (!isCompensationSealedForFinalization_(refreshed)) {
    throw new Error(
      'Compensation is not fully sealed yet; review completion is blocked until the CAF, history, and (when due) EmployeeAssignments Current Pay Rate update are complete. ' +
        'If this persists, HR must run compensation recovery.'
    );
  }
  return result;
}

function isV31CompensationComplete_(cycle) {
  const settings = getSettings_();
  if (!v31Boolean_(settings.COMPENSATION_DECISION_REQUIRED, true)) {
    return true;
  }

  const decision = normalizeCompensationDecision_(
    cycle['Compensation Decision']
  );

  if (decision === V31.COMPENSATION.NONE) {
    return true;
  }

  if (decision !== V31.COMPENSATION.ADJUSTMENT) {
    return false;
  }

  const status = String(
    cycle['Compensation Status'] || V31_COMP.STATUS.PENDING
  );
  // Denied recommendations resolve the compensation obligation without a CAF.
  return (
    status === V31_COMP.STATUS.AWAITING_SIGNATURES ||
    status === V31_COMP.STATUS.COMPLETE ||
    status === V31_COMP.STATUS.DENIED
  );
}

function syncCycleCompensationSummary_(cycle, record) {
  const ownerDecision = String(record['Owner Decision'] || '');
  // Denied recommendations remain auditably linked, but the cycle gate treats
  // them like a resolved no-adjustment for CAF / employee disclosure.
  if (ownerDecision === V31_COMP.OWNER_DECISION.DENIED) {
    cycle['Compensation Decision'] = V31.COMPENSATION.NONE;
  } else {
    cycle['Compensation Decision'] = V31.COMPENSATION.ADJUSTMENT;
  }
  cycle['Compensation Status'] = String(
    record['Status'] || V31_COMP.STATUS.AWAITING_OWNER
  );
  cycle['Compensation Record ID'] = String(
    record['Compensation Record ID'] || ''
  );
  cycle['CAF Final PDF ID'] = String(record['CAF Final PDF ID'] || '');
  if (record['Manager Recommendation Submitted At']) {
    cycle['Compensation Decision At'] =
      record['Manager Recommendation Submitted At'];
  }
  if (record['Manager Recommendation Submitted By']) {
    cycle['Compensation Decision By'] = String(
      record['Manager Recommendation Submitted By'] || ''
    );
  }
}

/** True when an approved (not denied) adjustment exists and needs a CAF. */
function isApprovedCompensationAdjustment_(record) {
  if (!record) return false;
  const ownerDecision = String(record['Owner Decision'] || '');
  if (ownerDecision === V31_COMP.OWNER_DECISION.DENIED) return false;
  const status = String(record['Status'] || '');
  return (
    status === V31_COMP.STATUS.AWAITING_SIGNATURES ||
    status === V31_COMP.STATUS.COMPLETE
  );
}

/* ============================ PUBLIC APIS ============================ */

function getCompensationContext(cycleId) {
  ensureCompensationDataModel_();
  const email = getCurrentUserEmail_();
  const cycle = findCycle_(cycleId).object;
  const isHr = isHrUser_(email);
  const isManager =
    normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email);
  const isEmployee =
    normalizeEmail_(cycle['Employee Email']) === normalizeEmail_(email);

  if (!isHr && !isManager && !isEmployee) {
    throw new Error('You are not authorized to view compensation context.');
  }

  const pay = getAssignmentPayRate_(cycle['Employee Email']);
  const recordLoc = findCompensationRecordByCycleOptional_(cycleId);
  const record = recordLoc ? recordLoc.object : null;
  const decision = normalizeCompensationDecision_(
    cycle['Compensation Decision']
  );

  const base = {
    cycleId: String(cycleId),
    decision: isEmployee ? '' : decision,
    status: isEmployee
      ? ''
      : String(cycle['Compensation Status'] || V31_COMP.STATUS.PENDING),
    compensationRequired: v31Boolean_(
      getSettings_().COMPENSATION_DECISION_REQUIRED,
      true
    ),
    canManage: isManager || isHr,
    canHrDecide: isHr,
    currentPayRateConfigured: !!(pay.found && pay.rate),
    standardAnnualHours: V31_COMP.STANDARD_ANNUAL_HOURS,
  };

  if (isEmployee) {
    // Hard privacy: denied / pending / no-adjustment → employee sees nothing.
    if (
      record &&
      isApprovedCompensationAdjustment_(record) &&
      record['Final Approved Pay Rate'] !== '' &&
      record['Final Approved Pay Rate'] != null
    ) {
      return Object.assign(base, {
        acknowledgement: {
          currentPayRate: Number(record['Original Pay Rate']),
          currentAnnualSalary: Number(record['Original Annual Salary']),
          finalApprovedPayRate: Number(record['Final Approved Pay Rate']),
          finalApprovedAnnualSalary: Number(
            record['Final Approved Annual Salary']
          ),
          approvedIncreasePercent: roundPercent_(
            Number(record['Final Approved Percent'] || 0) * 100
          ),
          effectiveDate: formatDate_(record['Compensation Effective Date']),
        },
      });
    }
    return Object.assign(base, { acknowledgement: null });
  }

  return Object.assign(base, {
    currentPayRate: pay.rate,
    currentAnnualSalary: pay.rate ? pay.annual : null,
    record: record ? toCompensationRecordView_(record, isHr) : null,
  });
}

function toCompensationRecordView_(record, isHr) {
  const currentAnnual = Number(record['Original Annual Salary'] || 0);
  const recommendedAnnual = Number(
    record['Manager Recommended Annual Salary'] || 0
  );
  const finalAnnual =
    record['Final Approved Annual Salary'] !== '' &&
    record['Final Approved Annual Salary'] != null
      ? Number(record['Final Approved Annual Salary'])
      : null;
  return {
    compensationRecordId: String(record['Compensation Record ID'] || ''),
    status: String(record['Status'] || ''),
    ownerDecision: String(record['Owner Decision'] || ''),
    originalPayRate: Number(record['Original Pay Rate'] || 0),
    originalAnnualSalary: currentAnnual,
    managerRecommendedPayRate: Number(
      record['Manager Recommended Pay Rate'] || 0
    ),
    managerRecommendedAnnualSalary: recommendedAnnual,
    managerRecommendedPercent: Number(
      record['Manager Recommended Percent'] || 0
    ),
    managerRecommendedPercentDisplay: roundPercent_(
      Number(record['Manager Recommended Percent'] || 0) * 100
    ),
    managerAnnualIncrease: roundCurrency_(recommendedAnnual - currentAnnual),
    managerBusinessJustification: String(
      record['Manager Business Justification'] || ''
    ),
    managerProposedEffectiveDate: formatDate_(
      record['Manager Proposed Effective Date']
    ),
    finalApprovedPayRate: record['Final Approved Pay Rate']
      ? Number(record['Final Approved Pay Rate'])
      : null,
    finalApprovedAnnualSalary: finalAnnual,
    finalApprovedPercent: record['Final Approved Percent'] !== ''
      ? Number(record['Final Approved Percent'])
      : null,
    finalApprovedPercentDisplay:
      record['Final Approved Percent'] !== ''
        ? roundPercent_(Number(record['Final Approved Percent'] || 0) * 100)
        : null,
    finalAnnualIncrease:
      finalAnnual != null
        ? roundCurrency_(finalAnnual - currentAnnual)
        : null,
    recommendationAccepted: String(record['Recommendation Accepted'] || ''),
    compensationEffectiveDate: formatDate_(
      record['Compensation Effective Date']
    ),
    ownerName: isHr ? String(record['Owner Name'] || '') : '',
    ownerDecisionNotes: isHr
      ? String(record['Owner Decision Notes'] || '')
      : '',
    ownerDecisionAt: isHr
      ? formatDateTime_(record['Owner Decision At'])
      : '',
    cafPdfStatus: String(record['CAF PDF Status'] || ''),
    cafFinalPdfId: isHr ? String(record['CAF Final PDF ID'] || '') : '',
    rateUpdateStatus: String(record['Rate Update Status'] || ''),
    canEditOwnerDecision:
      isHr &&
      (String(record['Status']) === V31_COMP.STATUS.AWAITING_SIGNATURES ||
        String(record['Status']) === V31_COMP.STATUS.DENIED),
  };
}

function submitNoCompensationAdjustment(cycleId, notes) {
  return withLock_(function () {
    ensureCompensationDataModel_();
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email);

    if (!isHr && !isManager) {
      throw new Error(
        'Only the assigned manager or HR may record the compensation decision.'
      );
    }

    const previous = normalizeCompensationDecision_(
      cycle['Compensation Decision']
    );
    if (
      previous === V31.COMPENSATION.ADJUSTMENT &&
      findCompensationRecordByCycleOptional_(cycleId)
    ) {
      throw new Error(
        'A compensation recommendation already exists for this cycle.'
      );
    }

    cycle['Compensation Decision'] = V31.COMPENSATION.NONE;
    cycle['Compensation Decision Notes'] = cleanText_(notes || '');
    cycle['Compensation Decision At'] = new Date();
    cycle['Compensation Decision By'] = email;
    cycle['Compensation Status'] = V31_COMP.STATUS.COMPLETE;
    cycle['Compensation Record ID'] = '';
    cycle['Updated At'] = new Date();
    updateCycleReadiness_(cycle);
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation decision recorded',
      email,
      previous,
      V31.COMPENSATION.NONE,
      cleanText_(notes || '')
    );

    return {
      ok: true,
      decision: V31.COMPENSATION.NONE,
      compensationComplete: isV31CompensationComplete_(cycle),
      cycleStatus: String(cycle['Status']),
      message: 'No compensation adjustment recommended.',
    };
  });
}

function submitCompensationRecommendation(cycleId, payload) {
  const result = withLock_(function () {
    ensureCompensationDataModel_();
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email);

    if (!isHr && !isManager) {
      throw new Error(
        'Only the assigned manager or HR may submit a compensation recommendation.'
      );
    }

    if (
      ![PR.DOC.SUBMITTED, PR.DOC.COMPLETE].includes(
        String(cycle['Manager Review Status'])
      )
    ) {
      throw new Error(
        'Submit the manager review before recommending a compensation adjustment.'
      );
    }

    const existing = findCompensationRecordByCycleOptional_(cycleId);
    if (existing) {
      throw new Error(
        'A compensation recommendation already exists for this review cycle.'
      );
    }

    const decision = normalizeCompensationDecision_(
      cycle['Compensation Decision']
    );
    if (decision === V31.COMPENSATION.NONE) {
      throw new Error(
        'This cycle already has a No Adjustment decision. HR must reset it first.'
      );
    }

    const pay = getAssignmentPayRate_(cycle['Employee Email']);
    if (!pay.found || !pay.rate) {
      throw new Error(
        'Current Pay Rate has not been configured for this employee. HR must update the employee record before a compensation recommendation can be submitted.'
      );
    }

    const clean = validateCompensationRecommendation_(payload, pay.rate);
    const now = new Date();
    const recordId = Utilities.getUuid();

    const record = {
      'Compensation Record ID': recordId,
      'Review Cycle ID': String(cycleId),
      'Employee Email': normalizeEmail_(cycle['Employee Email']),
      'Employee Name': String(cycle['Employee Name'] || ''),
      'Manager Email': normalizeEmail_(cycle['Manager Email']),
      'Manager Name': String(cycle['Manager Name'] || ''),
      'Original Pay Rate': pay.rate,
      'Original Annual Salary': pay.annual,
      'Manager Recommended Pay Rate': clean.recommendedRate,
      'Manager Recommended Annual Salary': clean.recommendedAnnual,
      'Manager Recommended Percent': clean.recommendedPercent,
      'Manager Business Justification': clean.businessJustification,
      'Manager Proposed Effective Date': clean.proposedEffectiveDate,
      'Manager Recommendation Submitted At': now,
      'Manager Recommendation Submitted By': email,
      'Final Approved Pay Rate': '',
      'Final Approved Annual Salary': '',
      'Final Approved Percent': '',
      'Recommendation Accepted': '',
      'Compensation Effective Date': '',
      'Owner Name': '',
      'Owner Decision': '',
      'Owner Decision At': '',
      'Owner Decision Recorded By': '',
      'Owner Decision Notes': '',
      Status: V31_COMP.STATUS.AWAITING_OWNER,
      'Manager Outcome Email Status': V31.DELIVERY.PENDING,
      'Manager Outcome Email Attempt ID': '',
      'Manager Outcome Email Started At': '',
      'Manager Outcome Email Sent At': '',
      'Manager Outcome Email Last Error': '',
      'CAF PDF Status': V31_COMP.PDF.PENDING,
      'CAF PDF Attempt ID': '',
      'CAF PDF Started At': '',
      'CAF Final PDF ID': '',
      'CAF Final PDF Created At': '',
      'CAF PDF Last Error': '',
      'CAF PDF Recovery Details JSON': '',
      'Compensation History Status': V31_COMP.HISTORY.PENDING,
      'Compensation History Attempt ID': '',
      'Compensation History Written At': '',
      'Compensation History Last Error': '',
      'Rate Update Status': V31_COMP.RATE_UPDATE.PENDING,
      'Rate Update Attempt ID': '',
      'Rate Update Started At': '',
      'Rate Updated At': '',
      'Rate Update Last Error': '',
      'Created At': now,
      'Updated At': now,
    };

    appendCompensationRecord_(record);
    syncCycleCompensationSummary_(cycle, record);
    cycle['Compensation Decision Notes'] = cleanText_(
      clean.businessJustification || ''
    );
    cycle['Updated At'] = now;
    updateCycleReadiness_(cycle);
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation recommendation submitted',
      email,
      decision,
      V31.COMPENSATION.ADJUSTMENT,
      JSON.stringify({
        compensationRecordId: recordId,
        recommendedRate: clean.recommendedRate,
        recommendedPercent: clean.recommendedPercent,
      })
    );

    return {
      ok: true,
      decision: V31.COMPENSATION.ADJUSTMENT,
      compensationRecordId: recordId,
      compensationComplete: isV31CompensationComplete_(cycle),
      cycleStatus: String(cycle['Status']),
      message: 'Compensation recommendation submitted.',
    };
  });

  // Raised outside the lock: upsertSystemAlert_ acquires its own lock.
  try {
    maybeRaiseCompensationOwnerAlert_(findCycle_(cycleId).object);
  } catch (alertError) {
    Logger.log(
      'Owner alert after recommendation failed: ' +
        String(alertError.message || alertError)
    );
  }

  return result;
}

function validateCompensationRecommendation_(payload, currentRate) {
  const data = payload || {};
  const justification = cleanText_(data.businessJustification || '');
  if (!justification) {
    throw new Error('Business justification is required.');
  }

  const effectiveRaw = String(data.proposedEffectiveDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveRaw)) {
    throw new Error('Proposed effective date is required (YYYY-MM-DD).');
  }
  const proposedEffectiveDate = new Date(effectiveRaw + 'T12:00:00');
  if (isNaN(proposedEffectiveDate.getTime())) {
    throw new Error('Proposed effective date is invalid.');
  }

  // Percentage-only: ignore any client-supplied rate/salary. Server derives all
  // amounts from EmployeeAssignments.Current Pay Rate.
  const percentInput = data.recommendedPercent;
  if (percentInput === '' || percentInput == null) {
    throw new Error('Recommended increase percent is required.');
  }
  const enteredPercent = Number(percentInput);
  if (!Number.isFinite(enteredPercent)) {
    throw new Error('Recommended percent must be a valid number.');
  }
  if (enteredPercent < 0) {
    throw new Error('Recommended percent cannot be negative.');
  }
  if (enteredPercent === 0) {
    throw new Error(
      'Use No Adjustment Recommended instead of submitting a 0% recommendation.'
    );
  }

  const recommendedPercent = roundPercent_(enteredPercent / 100);
  const recommendedRate = roundCurrency_(
    currentRate * (1 + recommendedPercent)
  );
  const recommendedAnnual = annualSalaryFromRate_(recommendedRate);
  const currentAnnual = annualSalaryFromRate_(currentRate);

  return {
    recommendedRate: recommendedRate,
    recommendedPercent: recommendedPercent,
    recommendedAnnual: recommendedAnnual,
    annualIncrease: roundCurrency_(recommendedAnnual - currentAnnual),
    proposedEffectiveDate: proposedEffectiveDate,
    businessJustification: justification,
  };
}

function recordCompensationOwnerDecision(cycleId, payload) {
  const result = withLock_(function () {
    ensureCompensationDataModel_();
    const email = getCurrentUserEmail_();
    if (!isHrUser_(email)) {
      throw new Error('Only HR may record the owner compensation decision.');
    }

    const location = findCycle_(cycleId);
    const cycle = location.object;
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const status = String(record['Status'] || '');

    if (status !== V31_COMP.STATUS.AWAITING_OWNER) {
      throw new Error(
        'Owner decision can only be recorded while awaiting owner decision.'
      );
    }

    const clean = validateOwnerDecisionPayload_(payload, record);
    const now = new Date();

    record['Owner Name'] = clean.ownerName;
    record['Owner Decision'] = clean.ownerDecision;
    record['Owner Decision At'] = now;
    record['Owner Decision Recorded By'] = email;
    record['Owner Decision Notes'] = clean.notes;
    record['Updated At'] = now;

    if (clean.ownerDecision === V31_COMP.OWNER_DECISION.DENIED) {
      // Preserve manager recommendation forever; no CAF / history / rate update.
      record['Final Approved Pay Rate'] = '';
      record['Final Approved Annual Salary'] = '';
      record['Final Approved Percent'] = '';
      record['Recommendation Accepted'] = 'No';
      record['Compensation Effective Date'] = '';
      record['Status'] = V31_COMP.STATUS.DENIED;
      record['Rate Update Status'] = '';
      record['CAF PDF Status'] = '';
    } else {
      record['Final Approved Pay Rate'] = clean.finalRate;
      record['Final Approved Annual Salary'] = clean.finalAnnual;
      record['Final Approved Percent'] = clean.finalPercent;
      record['Recommendation Accepted'] = clean.accepted ? 'Yes' : 'No';
      record['Compensation Effective Date'] = clean.effectiveDate;
      record['Status'] = V31_COMP.STATUS.AWAITING_SIGNATURES;
    }

    writeCompensationRecord_(recordLoc.rowNumber, record);

    syncCycleCompensationSummary_(cycle, record);
    cycle['Updated At'] = now;
    updateCycleReadiness_(cycle);
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation owner decision recorded',
      email,
      V31_COMP.STATUS.AWAITING_OWNER,
      String(record['Status']),
      JSON.stringify({
        ownerName: clean.ownerName,
        ownerDecision: clean.ownerDecision,
        finalRate: clean.finalRate || '',
        finalPercent: clean.finalPercent || '',
        accepted: clean.accepted,
        effectiveDate: clean.effectiveDate
          ? formatDate_(clean.effectiveDate)
          : '',
      })
    );

    return {
      ok: true,
      status: String(record['Status']),
      ownerDecision: clean.ownerDecision,
      compensationComplete: isV31CompensationComplete_(cycle),
      cycleStatus: String(cycle['Status']),
      message:
        clean.ownerDecision === V31_COMP.OWNER_DECISION.DENIED
          ? 'Owner declined the compensation recommendation.'
          : 'Owner compensation decision recorded.',
      actorEmail: email,
    };
  });

  resolveCompensationOwnerAlert_(cycleId, result.actorEmail);

  try {
    ensureCompensationManagerOutcomeEmail_(cycleId);
  } catch (notifyError) {
    Logger.log(
      'Manager outcome notification failed: ' +
        String(notifyError.message || notifyError)
    );
  }

  return result;
}

function validateOwnerDecisionPayload_(payload, record) {
  const data = payload || {};
  const ownerName = cleanText_(data.ownerName || '');
  if (!ownerName) {
    throw new Error('Owner Name is required.');
  }

  const mode = String(data.mode || '').trim();
  const currentRate = Number(record['Original Pay Rate']);
  const recommendedRate = Number(record['Manager Recommended Pay Rate']);
  const recommendedPercent = Number(
    record['Manager Recommended Percent']
  );

  if (mode === 'deny') {
    const notes = cleanText_(data.ownerDecisionNotes || '');
    if (!notes) {
      throw new Error(
        'Owner Decision Notes are required when declining an adjustment.'
      );
    }
    return {
      ownerName: ownerName,
      notes: notes,
      ownerDecision: V31_COMP.OWNER_DECISION.DENIED,
      accepted: false,
      finalRate: null,
      finalPercent: null,
      finalAnnual: null,
      effectiveDate: null,
    };
  }

  let finalRate;
  let finalPercent;
  let accepted;
  let ownerDecision;

  if (mode === 'approve') {
    finalRate = recommendedRate;
    finalPercent = recommendedPercent;
    accepted = true;
    ownerDecision = V31_COMP.OWNER_DECISION.APPROVED;
  } else if (mode === 'override') {
    accepted = false;
    ownerDecision = V31_COMP.OWNER_DECISION.MODIFIED;
    const notes = cleanText_(data.ownerDecisionNotes || '');
    if (!notes) {
      throw new Error(
        'Owner Decision Notes are required when approving a different amount.'
      );
    }
    // Percentage-only override: ignore any client-supplied final rate.
    if (
      data.finalApprovedPercent === '' ||
      data.finalApprovedPercent == null
    ) {
      throw new Error('Final approved percent is required.');
    }
    const entered = Number(data.finalApprovedPercent);
    if (!Number.isFinite(entered)) {
      throw new Error('Final approved percent must be a valid number.');
    }
    if (entered < 0) {
      throw new Error('Final approved percent cannot be negative.');
    }
    if (entered === 0) {
      throw new Error(
        'Use Decline Adjustment instead of approving a 0% adjustment.'
      );
    }
    finalPercent = roundPercent_(entered / 100);
    finalRate = roundCurrency_(currentRate * (1 + finalPercent));
  } else {
    throw new Error(
      'Choose Approve Recommendation, Approve Different Amount, or Decline Adjustment.'
    );
  }

  const effectiveRaw = String(
    data.compensationEffectiveDate || data.effectiveDate || ''
  ).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveRaw)) {
    throw new Error(
      'An effective date is required before the compensation decision can be approved.'
    );
  }
  const effectiveDate = new Date(effectiveRaw + 'T12:00:00');
  if (isNaN(effectiveDate.getTime())) {
    throw new Error('Effective date is invalid.');
  }

  return {
    ownerName: ownerName,
    notes: cleanText_(data.ownerDecisionNotes || ''),
    ownerDecision: ownerDecision,
    accepted: accepted,
    finalRate: finalRate,
    finalPercent: finalPercent,
    finalAnnual: annualSalaryFromRate_(finalRate),
    effectiveDate: effectiveDate,
  };
}

function editCompensationOwnerDecision(cycleId, payload) {
  const result = withLock_(function () {
    ensureCompensationDataModel_();
    const email = getCurrentUserEmail_();
    if (!isHrUser_(email)) {
      throw new Error('Only HR may edit the owner compensation decision.');
    }

    const location = findCycle_(cycleId);
    const cycle = location.object;
    const signatures = getCombinedSignatureState_(cycle);
    if (
      signatures.managerSigned ||
      signatures.employeeSigned ||
      signatures.hrSigned
    ) {
      throw new Error(
        'This compensation decision can no longer be edited because signatures have begun. Use Compensation Recovery / Amendment.'
      );
    }

    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const editableStatuses = {};
    editableStatuses[V31_COMP.STATUS.AWAITING_SIGNATURES] = true;
    editableStatuses[V31_COMP.STATUS.DENIED] = true;
    if (!editableStatuses[String(record['Status'])]) {
      throw new Error(
        'Owner decision can only be edited while awaiting signatures (or after a deny) and before any signature exists.'
      );
    }

    const reason = cleanText_((payload && payload.reason) || '');
    if (!reason) {
      throw new Error('A reason for the correction is required.');
    }

    const previous = {
      finalRate: Number(record['Final Approved Pay Rate'] || 0),
      finalPercent: Number(record['Final Approved Percent'] || 0),
      effectiveDate: formatDate_(record['Compensation Effective Date']),
      ownerName: String(record['Owner Name'] || ''),
      notes: String(record['Owner Decision Notes'] || ''),
      accepted: String(record['Recommendation Accepted'] || ''),
    };

    const clean = validateOwnerDecisionPayload_(payload, record);
    const now = new Date();

    record['Owner Name'] = clean.ownerName;
    record['Owner Decision'] = clean.ownerDecision;
    record['Owner Decision At'] = now;
    record['Owner Decision Recorded By'] = email;
    record['Owner Decision Notes'] = clean.notes;
    record['Updated At'] = now;

    if (clean.ownerDecision === V31_COMP.OWNER_DECISION.DENIED) {
      record['Final Approved Pay Rate'] = '';
      record['Final Approved Annual Salary'] = '';
      record['Final Approved Percent'] = '';
      record['Recommendation Accepted'] = 'No';
      record['Compensation Effective Date'] = '';
      record['Status'] = V31_COMP.STATUS.DENIED;
      record['Rate Update Status'] = '';
      record['CAF PDF Status'] = '';
    } else {
      record['Final Approved Pay Rate'] = clean.finalRate;
      record['Final Approved Annual Salary'] = clean.finalAnnual;
      record['Final Approved Percent'] = clean.finalPercent;
      record['Recommendation Accepted'] = clean.accepted ? 'Yes' : 'No';
      record['Compensation Effective Date'] = clean.effectiveDate;
      record['Status'] = V31_COMP.STATUS.AWAITING_SIGNATURES;
    }

    // Reset outcome email so the manager is re-notified of the correction.
    record['Manager Outcome Email Status'] = V31.DELIVERY.PENDING;
    record['Manager Outcome Email Attempt ID'] = '';
    record['Manager Outcome Email Started At'] = '';
    record['Manager Outcome Email Sent At'] = '';
    record['Manager Outcome Email Last Error'] = '';

    writeCompensationRecord_(recordLoc.rowNumber, record);

    syncCycleCompensationSummary_(cycle, record);
    cycle['Updated At'] = now;
    updateCycleReadiness_(cycle);
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation owner decision corrected',
      email,
      V31_COMP.STATUS.AWAITING_SIGNATURES,
      String(record['Status']),
      JSON.stringify({
        reason: reason,
        previous: previous,
        next: {
          ownerDecision: clean.ownerDecision,
          finalRate: clean.finalRate || '',
          finalPercent: clean.finalPercent || '',
          effectiveDate: clean.effectiveDate
            ? formatDate_(clean.effectiveDate)
            : '',
          ownerName: clean.ownerName,
          accepted: clean.accepted,
        },
      })
    );

    return {
      ok: true,
      message: 'Owner compensation decision updated.',
      status: String(record['Status']),
      ownerDecision: clean.ownerDecision,
    };
  });

  try {
    ensureCompensationManagerOutcomeEmail_(cycleId);
  } catch (notifyError) {
    Logger.log(
      'Manager outcome notification (edit) failed: ' +
        String(notifyError.message || notifyError)
    );
  }

  return result;
}

function resetCompensationDecision(cycleId, reason) {
  return withLock_(function () {
    ensureCompensationDataModel_();
    const email = getCurrentUserEmail_();
    if (!isHrUser_(email)) {
      throw new Error('Only HR may reset the compensation decision.');
    }

    const location = findCycle_(cycleId);
    const cycle = location.object;
    const signatures = getCombinedSignatureState_(cycle);
    if (
      signatures.managerSigned ||
      signatures.employeeSigned ||
      signatures.hrSigned
    ) {
      throw new Error(
        'Compensation cannot be reset after signatures have begun.'
      );
    }

    const previous = normalizeCompensationDecision_(
      cycle['Compensation Decision']
    );
    const recordLoc = findCompensationRecordByCycleOptional_(cycleId);
    if (recordLoc) {
      const status = String(recordLoc.object['Status'] || '');
      if (
        status !== V31_COMP.STATUS.AWAITING_OWNER &&
        status !== V31_COMP.STATUS.AWAITING_SIGNATURES &&
        status !== V31_COMP.STATUS.DENIED
      ) {
        throw new Error(
          'Completed compensation records cannot be reset through ordinary reset.'
        );
      }
      // Soft-cancel by marking failed; keep row for audit lineage.
      recordLoc.object['Status'] = V31_COMP.STATUS.FAILED;
      recordLoc.object['Updated At'] = new Date();
      recordLoc.object['CAF PDF Last Error'] =
        'Reset by HR: ' + cleanText_(reason || '');
      writeCompensationRecord_(recordLoc.rowNumber, recordLoc.object);
    }

    cycle['Compensation Decision'] = V31.COMPENSATION.PENDING;
    cycle['Compensation Decision Notes'] = '';
    cycle['Compensation Decision At'] = '';
    cycle['Compensation Decision By'] = '';
    cycle['Compensation Status'] = V31_COMP.STATUS.PENDING;
    cycle['Compensation Record ID'] = '';
    cycle['CAF Final PDF ID'] = '';
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation decision reset',
      email,
      previous,
      V31.COMPENSATION.PENDING,
      cleanText_(reason || '')
    );

    return {
      ok: true,
      decision: V31.COMPENSATION.PENDING,
      message: 'Compensation decision reset to Pending.',
    };
  });
}

/**
 * Backward-compatible wrapper used by older UI paths.
 */
function recordCompensationDecision(cycleId, decision, notes) {
  const normalized = normalizeCompensationDecision_(decision);
  if (normalized === V31.COMPENSATION.PENDING) {
    return resetCompensationDecision(cycleId, notes || 'HR reset');
  }
  if (normalized === V31.COMPENSATION.NONE) {
    return submitNoCompensationAdjustment(cycleId, notes);
  }
  throw new Error(
    'Use submitCompensationRecommendation for adjustment recommendations.'
  );
}

function getCompensationQueue() {
  ensureCompensationDataModel_();
  const email = getCurrentUserEmail_();
  if (!isHrUser_(email)) {
    throw new Error('Only HR may access the Compensation Queue.');
  }

  const records = getAllObjects_(V31_COMP.RECORDS_SHEET);
  return {
    ok: true,
    items: records
      .filter(function (record) {
        const status = String(record['Status'] || '');
        return status && status !== V31_COMP.STATUS.FAILED;
      })
      .map(function (record) {
        return {
          compensationRecordId: String(
            record['Compensation Record ID'] || ''
          ),
          cycleId: String(record['Review Cycle ID'] || ''),
          employeeName: String(record['Employee Name'] || ''),
          employeeEmail: normalizeEmail_(record['Employee Email']),
          managerName: String(record['Manager Name'] || ''),
          status: String(record['Status'] || ''),
          currentPayRate: Number(record['Original Pay Rate'] || 0),
          currentAnnualSalary: Number(record['Original Annual Salary'] || 0),
          managerRecommendedPayRate: Number(
            record['Manager Recommended Pay Rate'] || 0
          ),
          managerRecommendedAnnualSalary: Number(
            record['Manager Recommended Annual Salary'] || 0
          ),
          managerRecommendedPercentDisplay: roundPercent_(
            Number(record['Manager Recommended Percent'] || 0) * 100
          ),
          managerBusinessJustification: String(
            record['Manager Business Justification'] || ''
          ),
          ownerDecision: String(record['Owner Decision'] || ''),
          finalApprovedPayRate: record['Final Approved Pay Rate']
            ? Number(record['Final Approved Pay Rate'])
            : null,
          finalApprovedPercentDisplay:
            record['Final Approved Percent'] !== ''
              ? roundPercent_(
                  Number(record['Final Approved Percent'] || 0) * 100
                )
              : null,
          compensationEffectiveDate: formatDate_(
            record['Compensation Effective Date']
          ),
          cafPdfStatus: String(record['CAF PDF Status'] || ''),
          rateUpdateStatus: String(record['Rate Update Status'] || ''),
          rateUpdateDisplay: formatCompensationRateUpdateDisplay_(
            record['Rate Update Status'],
            record['Compensation Effective Date']
          ),
          rateUpdateLastError: String(record['Rate Update Last Error'] || ''),
          managerOutcomeEmailStatus: String(
            record['Manager Outcome Email Status'] || ''
          ),
          managerOutcomeEmailAttemptId: String(
            record['Manager Outcome Email Attempt ID'] || ''
          ),
          managerOutcomeEmailLastError: String(
            record['Manager Outcome Email Last Error'] || ''
          ),
          expectedPredecessorPayRate: Number(record['Original Pay Rate'] || 0),
          submittedAt: formatDateTime_(
            record['Manager Recommendation Submitted At']
          ),
        };
      })
      .sort(function (a, b) {
        return String(b.submittedAt).localeCompare(String(a.submittedAt));
      }),
  };
}

/**
 * Human-readable rate-update label for the Compensation Queue.
 * Future-dated approvals show the scheduled effective date explicitly.
 */
function formatCompensationRateUpdateDisplay_(statusRaw, effectiveDateRaw) {
  const status = String(statusRaw || '');
  if (status === V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE) {
    const when = formatDate_(effectiveDateRaw);
    return when
      ? 'Scheduled for ' + when
      : V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
  }
  return status;
}

function compensationOwnerAlertKey_(cycleId) {
  return buildSystemAlertKey_(
    cycleId,
    'Compensation',
    'owner-decision-required'
  );
}

/**
 * Durable "owner decision required" HR notification.
 *
 * Fires once (deduplicated by alert key) when the manager review, employee
 * self-evaluation, and compensation recommendation are all submitted and the
 * record is still awaiting the owner decision. Uses the durable SystemAlerts
 * ledger so it is not a fire-and-forget email.
 */
function maybeRaiseCompensationOwnerAlert_(cycle) {
  try {
    const ready =
      String(cycle['Manager Review Status']) === PR.DOC.SUBMITTED &&
      String(cycle['Self Evaluation Status']) === PR.DOC.SUBMITTED &&
      normalizeCompensationDecision_(cycle['Compensation Decision']) ===
        V31.COMPENSATION.ADJUSTMENT;
    if (!ready) {
      return { raised: false };
    }

    const recordLoc = findCompensationRecordByCycleOptional_(
      cycle['Cycle ID']
    );
    if (
      !recordLoc ||
      String(recordLoc.object['Status']) !== V31_COMP.STATUS.AWAITING_OWNER
    ) {
      return { raised: false };
    }

    upsertSystemAlert_({
      alertKey: compensationOwnerAlertKey_(cycle['Cycle ID']),
      cycleId: String(cycle['Cycle ID']),
      severity: 'Warning',
      component: 'Compensation',
      subject:
        'Owner compensation decision required for ' +
        String(cycle['Employee Name'] || ''),
      details: {
        employeeName: String(cycle['Employee Name'] || ''),
        managerName: String(cycle['Manager Name'] || ''),
        compensationRecordId: String(
          recordLoc.object['Compensation Record ID'] || ''
        ),
        managerRecommendedPercent: Number(
          recordLoc.object['Manager Recommended Percent'] || 0
        ),
        managerBusinessJustification: String(
          recordLoc.object['Manager Business Justification'] || ''
        ),
      },
      lastError:
        'Review preparation complete. Record the owner-approved compensation amount in the Compensation Queue.',
    });
    return { raised: true };
  } catch (error) {
    Logger.log(
      'Compensation owner alert failed: ' + String(error.message || error)
    );
    return { raised: false, error: String(error.message || error) };
  }
}

/** Resolve the owner-decision-required alert once HR records the decision. */
function resolveCompensationOwnerAlert_(cycleId, actorEmail) {
  try {
    const alert = findUnresolvedSystemAlertByKey_(
      compensationOwnerAlertKey_(cycleId)
    );
    if (alert) {
      resolveSystemAlertCore_(
        alert['Alert ID'],
        actorEmail || getCurrentUserEmail_(),
        'Owner compensation decision recorded.'
      );
    }
  } catch (error) {
    Logger.log(
      'Compensation owner alert resolve failed: ' +
        String(error.message || error)
    );
  }
}

/* ================== MANAGER OUTCOME NOTIFICATION ================== */

/**
 * Durable manager notification after an owner decision.
 * Uses claim → send → confirm on CompensationRecords so retries never
 * duplicate the email. Delivery Unknown never auto-resends.
 */
function ensureCompensationManagerOutcomeEmail_(cycleId, options) {
  ensureCompensationDataModel_();
  const opts = options || {};
  const claimed = withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    const ownerDecision = String(record['Owner Decision'] || '');
    if (
      ownerDecision !== V31_COMP.OWNER_DECISION.APPROVED &&
      ownerDecision !== V31_COMP.OWNER_DECISION.MODIFIED &&
      ownerDecision !== V31_COMP.OWNER_DECISION.DENIED
    ) {
      return { skip: true, reason: 'no-decision' };
    }

    const status = String(
      record['Manager Outcome Email Status'] || V31.DELIVERY.PENDING
    );
    if (status === V31.DELIVERY.SENT && record['Manager Outcome Email Sent At']) {
      return { skip: true, reason: 'already-sent' };
    }
    if (status === V31.DELIVERY.SENDING) {
      if (
        !isDeliveryClaimStale_(record['Manager Outcome Email Started At'])
      ) {
        return { skip: true, reason: 'in-progress' };
      }
      // Retain Attempt ID so HR can Mark Confirmed or Confirmed Resend.
      record['Manager Outcome Email Status'] = V31.DELIVERY.UNKNOWN;
      record['Manager Outcome Email Last Error'] =
        'Manager outcome email claim went stale before confirmation.';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      SpreadsheetApp.flush();
      throw new Error(
        'Manager compensation outcome email is Delivery Unknown and requires recovery.'
      );
    }
    if (status === V31.DELIVERY.UNKNOWN) {
      if (opts.allowUnknownResend !== true) {
        throw new Error(
          'Manager compensation outcome email is Delivery Unknown. HR must reconcile before retry.'
        );
      }
      if (
        opts.expectedAttemptId !== undefined &&
        String(record['Manager Outcome Email Attempt ID'] || '') !==
          String(opts.expectedAttemptId || '')
      ) {
        throw new Error(
          'Manager outcome email attempt changed after confirmation. Refresh and confirm again.'
        );
      }
    }

    const attemptId = Utilities.getUuid();
    record['Manager Outcome Email Status'] = V31.DELIVERY.SENDING;
    record['Manager Outcome Email Attempt ID'] = attemptId;
    record['Manager Outcome Email Started At'] = new Date();
    record['Manager Outcome Email Last Error'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    const cycle = findCycle_(cycleId).object;
    return {
      skip: false,
      attemptId: attemptId,
      managerEmail: normalizeEmail_(cycle['Manager Email']),
      cycle: cycle,
      record: record,
      ownerDecision: ownerDecision,
    };
  });

  if (claimed.skip) {
    return { ok: true, skipped: true, reason: claimed.reason };
  }

  try {
    sendCompensationManagerOutcomeEmailBody_(
      claimed.cycle,
      claimed.record,
      claimed.ownerDecision
    );
    withLock_(function () {
      const loc = findCompensationRecordByCycle_(cycleId);
      const rec = loc.object;
      if (
        String(rec['Manager Outcome Email Attempt ID'] || '') !==
        String(claimed.attemptId)
      ) {
        return;
      }
      rec['Manager Outcome Email Status'] = V31.DELIVERY.SENT;
      rec['Manager Outcome Email Sent At'] = new Date();
      rec['Manager Outcome Email Last Error'] = '';
      rec['Updated At'] = new Date();
      writeCompensationRecord_(loc.rowNumber, rec);
      SpreadsheetApp.flush();
    });
    return { ok: true, sent: true };
  } catch (error) {
    withLock_(function () {
      const loc = findCompensationRecordByCycle_(cycleId);
      const rec = loc.object;
      if (
        String(rec['Manager Outcome Email Attempt ID'] || '') !==
        String(claimed.attemptId)
      ) {
        return;
      }
      // Retain Attempt ID for HR Mark Confirmed / Confirmed Resend.
      rec['Manager Outcome Email Status'] = V31.DELIVERY.UNKNOWN;
      rec['Manager Outcome Email Last Error'] = String(error.message || error);
      rec['Updated At'] = new Date();
      writeCompensationRecord_(loc.rowNumber, rec);
      SpreadsheetApp.flush();
    });
    throw error;
  }
}

/**
 * HR-only: mark a Delivery Unknown manager outcome email as Sent with evidence.
 * Never sends email.
 */
function markCompensationManagerOutcomeEmailConfirmed(cycleId, payload) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  const evidenceNote = String(input.evidenceNote || '').trim();
  if (
    input.confirmed !== true ||
    String(input.confirmationToken || '') !==
      V31_COMP.MANAGER_OUTCOME_CONFIRM_TOKEN ||
    !evidenceNote
  ) {
    throw new Error(
      'Confirmation, exact token, and an evidence note are required.'
    );
  }
  const eventId =
    V31_COMP.MANAGER_OUTCOME_CONFIRM_EVENT_PREFIX + String(cycleId);
  const before = findCompensationRecordByCycle_(cycleId).object;
  if (
    String(before['Manager Outcome Email Status'] || '') !==
      V31.DELIVERY.UNKNOWN ||
    String(input.originalAttemptId || '') !==
      String(before['Manager Outcome Email Attempt ID'] || '')
  ) {
    throw new Error(
      'Manager outcome email status or attempt changed. Refresh and confirm again.'
    );
  }
  withLock_(function () {
    const loc = findCompensationRecordByCycle_(cycleId);
    const rec = loc.object;
    if (
      String(rec['Manager Outcome Email Status'] || '') !==
        V31.DELIVERY.UNKNOWN ||
      String(rec['Manager Outcome Email Attempt ID'] || '') !==
        String(input.originalAttemptId || '')
    ) {
      throw new Error(
        'Only the confirmed Delivery Unknown manager outcome attempt may be marked Sent.'
      );
    }
    auditIdempotentUnlocked_(
      cycleId,
      'Manager outcome email manually confirmed',
      actor,
      V31.DELIVERY.UNKNOWN,
      V31.DELIVERY.SENT,
      evidenceNote,
      eventId
    );
    const confirmedAt = new Date();
    rec['Manager Outcome Email Status'] = V31.DELIVERY.SENT;
    rec['Manager Outcome Email Sent At'] =
      rec['Manager Outcome Email Sent At'] || confirmedAt;
    rec['Manager Outcome Email Last Error'] = '';
    rec['Updated At'] = confirmedAt;
    writeCompensationRecord_(loc.rowNumber, rec);
    SpreadsheetApp.flush();
  });
  return { ok: true, eventId: eventId, status: V31.DELIVERY.SENT };
}

/**
 * HR-only: explicitly resend a Delivery Unknown manager outcome email.
 * Requires exact confirmation; never automatic.
 */
function resendCompensationManagerOutcomeEmailUnknown(cycleId, payload) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  if (
    input.confirmed !== true ||
    String(input.confirmationToken || '') !==
      V31_COMP.MANAGER_OUTCOME_RESEND_TOKEN
  ) {
    throw new Error(
      'Exact manager-outcome email resend confirmation is required.'
    );
  }
  const before = findCompensationRecordByCycle_(cycleId).object;
  if (
    String(before['Manager Outcome Email Status'] || '') !==
      V31.DELIVERY.UNKNOWN ||
    String(input.originalAttemptId || '') !==
      String(before['Manager Outcome Email Attempt ID'] || '')
  ) {
    throw new Error(
      'Manager outcome email status or attempt changed. Refresh and confirm again.'
    );
  }
  const resendAuthorizationEventId =
    'MANAGER_OUTCOME_EMAIL_RESEND_AUTHORIZED:' +
    String(cycleId) +
    ':' +
    String(input.originalAttemptId || '');
  auditIdempotent_(
    cycleId,
    'Manager outcome email resend authorized',
    actor,
    V31.DELIVERY.UNKNOWN,
    'Resend Authorized',
    JSON.stringify({
      schemaVersion: 1,
      originalAttemptId: String(input.originalAttemptId || ''),
    }),
    resendAuthorizationEventId
  );
  return ensureCompensationManagerOutcomeEmail_(cycleId, {
    allowUnknownResend: true,
    expectedAttemptId: String(input.originalAttemptId || ''),
  });
}

function formatCompensationMoney_(value) {
  const amount = Number(value || 0);
  return (
    '$' +
    amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function sendCompensationManagerOutcomeEmailBody_(cycle, record, ownerDecision) {
  const managerEmail = normalizeEmail_(cycle['Manager Email']);
  if (!managerEmail) {
    throw new Error('Manager email is missing for compensation outcome notice.');
  }

  const recommendedPct = roundPercent_(
    Number(record['Manager Recommended Percent'] || 0) * 100
  );
  let subject;
  let htmlBody;

  if (ownerDecision === V31_COMP.OWNER_DECISION.APPROVED) {
    subject =
      'Compensation recommendation approved: ' + cycle['Employee Name'];
    htmlBody =
      '<p>Your compensation recommendation for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> was approved.</p>' +
      '<ul>' +
      '<li>Final increase: <strong>' +
      htmlEscape_(String(recommendedPct)) +
      '%</strong></li>' +
      '<li>Final pay rate: <strong>' +
      htmlEscape_(formatCompensationMoney_(record['Final Approved Pay Rate'])) +
      '</strong></li>' +
      '<li>Final annual salary: <strong>' +
      htmlEscape_(
        formatCompensationMoney_(record['Final Approved Annual Salary'])
      ) +
      '</strong></li>' +
      '<li>Effective date: <strong>' +
      htmlEscape_(formatDate_(record['Compensation Effective Date']) || '') +
      '</strong></li>' +
      '</ul>' +
      '<p>Please use these final values in the review meeting.</p>';
  } else if (ownerDecision === V31_COMP.OWNER_DECISION.MODIFIED) {
    const finalPct = roundPercent_(
      Number(record['Final Approved Percent'] || 0) * 100
    );
    subject =
      'Compensation recommendation modified: ' + cycle['Employee Name'];
    htmlBody =
      '<p>The owner approved a different amount for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong>.</p>' +
      '<ul>' +
      '<li>Your recommendation: <strong>' +
      htmlEscape_(String(recommendedPct)) +
      '%</strong></li>' +
      '<li>Final approved: <strong>' +
      htmlEscape_(String(finalPct)) +
      '%</strong></li>' +
      '<li>Final pay rate: <strong>' +
      htmlEscape_(formatCompensationMoney_(record['Final Approved Pay Rate'])) +
      '</strong></li>' +
      '<li>Final annual salary: <strong>' +
      htmlEscape_(
        formatCompensationMoney_(record['Final Approved Annual Salary'])
      ) +
      '</strong></li>' +
      '<li>Effective date: <strong>' +
      htmlEscape_(formatDate_(record['Compensation Effective Date']) || '') +
      '</strong></li>' +
      '</ul>' +
      '<p>Please use the <em>final approved</em> values in the review meeting.</p>';
  } else {
    subject =
      'Compensation recommendation declined: ' + cycle['Employee Name'];
    htmlBody =
      '<p>Your compensation recommendation for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> was declined.</p>' +
      '<ul>' +
      '<li>Your recommendation: <strong>' +
      htmlEscape_(String(recommendedPct)) +
      '%</strong></li>' +
      '<li>Final decision: <strong>No Compensation Adjustment</strong></li>' +
      '</ul>' +
      '<p>The employee will not be shown this recommendation or the denial.</p>';
  }

  sendHtmlEmail_(managerEmail, subject, htmlBody);
  audit_(
    cycle['Cycle ID'],
    'Compensation manager outcome email sent',
    Session.getEffectiveUser().getEmail(),
    '',
    ownerDecision,
    managerEmail
  );
}

/* ====================== HISTORY REPAIR SWEEP ====================== */

/**
 * Repair sweep: guarantee every sealed CAF has exactly one history row.
 * Handles the partial-failure case where the CAF is Complete but the history
 * append did not land. Safe to run repeatedly (idempotent).
 */
function processDueCompensationHistoryRepairs_() {
  ensureCompensationDataModel_();
  const records = getAllObjects_(V31_COMP.RECORDS_SHEET);
  let repaired = 0;
  let skipped = 0;
  let failed = 0;

  records.forEach(function (record) {
    if (
      String(record['Status']) !== V31_COMP.STATUS.COMPLETE ||
      !String(record['CAF Final PDF ID'] || '')
    ) {
      skipped += 1;
      return;
    }
    const historyStatus = String(
      record['Compensation History Status'] || ''
    );
    const recordId = String(record['Compensation Record ID'] || '');
    if (
      historyStatus === V31_COMP.HISTORY.COMPLETE &&
      historyExistsForRecord_(recordId)
    ) {
      skipped += 1;
      return;
    }
    try {
      ensureCompensationHistory_(record['Review Cycle ID']);
      repaired += 1;
    } catch (error) {
      failed += 1;
      Logger.log(
        'Compensation history repair failed for ' +
          recordId +
          ': ' +
          String(error.message || error)
      );
    }
  });

  return { repaired: repaired, skipped: skipped, failed: failed };
}

/* ============================ RATE UPDATE ============================ */

/**
 * Pure decision for a due rate update given rounded currency inputs.
 *  - 'complete': roster already equals the approved rate (nothing to do)
 *  - 'conflict': roster does not match the expected predecessor (do NOT write)
 *  - 'apply': safe to overwrite the predecessor with the approved rate
 */
function classifyCompensationRateUpdate_(
  actualCurrent,
  expectedPredecessor,
  finalRate
) {
  if (roundCurrency_(actualCurrent) === roundCurrency_(finalRate)) {
    return 'complete';
  }
  if (roundCurrency_(actualCurrent) !== roundCurrency_(expectedPredecessor)) {
    return 'conflict';
  }
  return 'apply';
}

function processDueCompensationRateUpdates_() {
  ensureCompensationDataModel_();
  const today = v31Today_();
  const records = getAllObjects_(V31_COMP.RECORDS_SHEET);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  records.forEach(function (record) {
    if (String(record['Status']) !== V31_COMP.STATUS.COMPLETE) {
      skipped += 1;
      return;
    }
    const rateStatus = String(
      record['Rate Update Status'] || V31_COMP.RATE_UPDATE.PENDING
    );
    if (
      rateStatus === V31_COMP.RATE_UPDATE.COMPLETE ||
      rateStatus === V31_COMP.RATE_UPDATE.CONFLICT ||
      rateStatus === V31_COMP.RATE_UPDATE.UNKNOWN
    ) {
      // Complete needs nothing; Conflict/Unknown require explicit HR recovery.
      skipped += 1;
      return;
    }

    const effective = v31Date_(record['Compensation Effective Date']);
    if (!effective) {
      failed += 1;
      return;
    }
    if (effective.getTime() > today.getTime()) {
      withLock_(function () {
        const loc = findCompensationRecordByCycle_(
          record['Review Cycle ID']
        );
        if (
          String(loc.object['Rate Update Status']) !==
          V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE
        ) {
          loc.object['Rate Update Status'] =
            V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
          loc.object['Updated At'] = new Date();
          writeCompensationRecord_(loc.rowNumber, loc.object);
        }
      });
      skipped += 1;
      return;
    }

    try {
      applyCompensationRateUpdateOnce_(record['Review Cycle ID']);
      updated += 1;
    } catch (error) {
      failed += 1;
    }
  });

  return { updated: updated, skipped: skipped, failed: failed };
}

function applyCompensationRateUpdateOnce_(cycleId) {
  let conflictAlert = null;
  try {
    return withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    if (String(record['Status']) !== V31_COMP.STATUS.COMPLETE) {
      throw new Error('Compensation record is not complete.');
    }
    const currentStatus = String(record['Rate Update Status'] || '');
    if (currentStatus === V31_COMP.RATE_UPDATE.COMPLETE) {
      return { alreadyComplete: true };
    }
    if (currentStatus === V31_COMP.RATE_UPDATE.CONFLICT) {
      throw new Error(
        'Compensation rate update is in Conflict and requires HR resolution.'
      );
    }

    // Reclaim a stale in-flight write (process died mid-update).
    if (currentStatus === V31_COMP.RATE_UPDATE.UPDATING) {
      if (isDeliveryClaimStale_(record['Rate Update Started At'])) {
        record['Rate Update Status'] = V31_COMP.RATE_UPDATE.UNKNOWN;
        record['Rate Update Last Error'] =
          'Rate update claim went stale before completion confirmation.';
        record['Rate Update Attempt ID'] = '';
        record['Rate Update Started At'] = '';
        record['Updated At'] = new Date();
        writeCompensationRecord_(recordLoc.rowNumber, record);
        SpreadsheetApp.flush();
        throw new Error(
          'Compensation rate update is Delivery Unknown and requires HR recovery.'
        );
      }
      throw new Error('Compensation rate update is already in progress.');
    }
    if (currentStatus === V31_COMP.RATE_UPDATE.UNKNOWN) {
      throw new Error(
        'Compensation rate update is Delivery Unknown and requires HR recovery.'
      );
    }

    const effective = v31Date_(record['Compensation Effective Date']);
    const today = v31Today_();
    if (!effective || effective.getTime() > today.getTime()) {
      record['Rate Update Status'] =
        V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE;
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      return { pendingEffective: true };
    }

    const employeeEmail = normalizeEmail_(record['Employee Email']);
    const assignments = getSpreadsheet_().getSheetByName(
      PR.SHEETS.ASSIGNMENTS
    );
    const values = assignments.getDataRange().getValues();
    const headers = values[0].map(String);
    const emailIndex = headers.indexOf('Employee Email');
    const rateIndex = headers.indexOf('Current Pay Rate');
    if (emailIndex < 0 || rateIndex < 0) {
      throw new Error('Current Pay Rate column is missing.');
    }

    let targetRow = -1;
    for (let row = 1; row < values.length; row++) {
      if (normalizeEmail_(values[row][emailIndex]) === employeeEmail) {
        targetRow = row;
        break;
      }
    }
    if (targetRow < 0) {
      throw new Error('Employee assignment row not found for rate update.');
    }

    // Conflict guard: only overwrite when the live rate still equals the
    // expected predecessor (this record's Original Pay Rate). If someone or
    // something else changed it, do not clobber payroll data.
    const expectedPredecessor = roundCurrency_(
      Number(record['Original Pay Rate'] || 0)
    );
    const actualCurrent = roundCurrency_(
      Number(values[targetRow][rateIndex] || 0)
    );
    const finalRate = roundCurrency_(
      Number(record['Final Approved Pay Rate'] || 0)
    );

    const classification = classifyCompensationRateUpdate_(
      actualCurrent,
      expectedPredecessor,
      finalRate
    );

    if (classification === 'complete') {
      // Already at the approved value (e.g. a prior partial run applied it).
      record['Rate Update Status'] = V31_COMP.RATE_UPDATE.COMPLETE;
      record['Rate Updated At'] = record['Rate Updated At'] || new Date();
      record['Rate Update Last Error'] = '';
      record['Rate Update Attempt ID'] = '';
      record['Rate Update Started At'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      SpreadsheetApp.flush();
      return { ok: true, reconciled: true };
    }

    if (classification === 'conflict') {
      record['Rate Update Status'] = V31_COMP.RATE_UPDATE.CONFLICT;
      record['Rate Update Last Error'] =
        'Current Pay Rate (' +
        actualCurrent +
        ') does not match the expected predecessor rate (' +
        expectedPredecessor +
        '). Rate not overwritten.';
      record['Rate Update Attempt ID'] = '';
      record['Rate Update Started At'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      SpreadsheetApp.flush();
      // Defer the alert until the lock is released (it locks internally).
      conflictAlert = {
        record: record,
        actualCurrent: actualCurrent,
        finalRate: finalRate,
      };
      throw new Error(
        'Compensation rate update conflict for ' + cycleId + '.'
      );
    }

    // Durable claim: persist Updating BEFORE mutating the roster.
    const attemptId = Utilities.getUuid();
    record['Rate Update Status'] = V31_COMP.RATE_UPDATE.UPDATING;
    record['Rate Update Attempt ID'] = attemptId;
    record['Rate Update Started At'] = new Date();
    record['Rate Update Last Error'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    assignments
      .getRange(targetRow + 1, rateIndex + 1)
      .setValue(finalRate);
    SpreadsheetApp.flush();

    // Reread to confirm the write actually landed.
    const confirmed = roundCurrency_(
      Number(
        assignments.getRange(targetRow + 1, rateIndex + 1).getValue() || 0
      )
    );
    if (confirmed !== finalRate) {
      record['Rate Update Status'] = V31_COMP.RATE_UPDATE.UNKNOWN;
      record['Rate Update Last Error'] =
        'Post-write verification failed (read ' +
        confirmed +
        ', expected ' +
        finalRate +
        ').';
      record['Rate Update Attempt ID'] = '';
      record['Rate Update Started At'] = '';
      record['Updated At'] = new Date();
      writeCompensationRecord_(recordLoc.rowNumber, record);
      SpreadsheetApp.flush();
      throw new Error(
        'Compensation rate update could not be verified for ' + cycleId + '.'
      );
    }

    record['Rate Update Status'] = V31_COMP.RATE_UPDATE.COMPLETE;
    record['Rate Updated At'] = new Date();
    record['Rate Update Last Error'] = '';
    record['Rate Update Attempt ID'] = '';
    record['Rate Update Started At'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);
    SpreadsheetApp.flush();

    audit_(
      cycleId,
      'Employee Current Pay Rate updated from compensation',
      Session.getEffectiveUser().getEmail(),
      String(record['Original Pay Rate']),
      String(record['Final Approved Pay Rate']),
      JSON.stringify({
        compensationRecordId: record['Compensation Record ID'],
        attemptId: attemptId,
      })
    );

    return { ok: true, attemptId: attemptId };
    });
  } finally {
    if (conflictAlert) {
      raiseCompensationRateConflictAlert_(
        conflictAlert.record,
        conflictAlert.actualCurrent,
        conflictAlert.finalRate
      );
    }
  }
}

function raiseCompensationRateConflictAlert_(record, actualCurrent, finalRate) {
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        record['Review Cycle ID'],
        'Compensation',
        'rate-update-conflict'
      ),
      cycleId: String(record['Review Cycle ID'] || ''),
      severity: 'Blocking',
      component: 'Compensation',
      subject:
        'Compensation rate update conflict for ' +
        String(record['Employee Name'] || ''),
      details: {
        compensationRecordId: String(record['Compensation Record ID'] || ''),
        expectedPredecessor: Number(record['Original Pay Rate'] || 0),
        actualCurrent: actualCurrent,
        finalApprovedPayRate: finalRate,
      },
      lastError:
        'EmployeeAssignments.Current Pay Rate did not match the expected predecessor; the approved rate was not applied.',
    });
  } catch (alertError) {
    Logger.log(
      'Rate conflict alert persistence failed: ' +
        String(alertError.message || alertError)
    );
  }
}

/**
 * HR recovery for a rate update stuck in Delivery Unknown.
 * Rereads the live roster and reconciles: if it already equals the approved
 * rate, mark Complete; otherwise reset to a retryable state under conflict
 * guarding.
 */
/** Public HR-callable wrapper for compensation rate-update recovery. */
function recoverCompensationRateUpdate(cycleId) {
  return recoverCompensationRateUpdate_(String(cycleId || ''));
}

function recoverCompensationRateUpdate_(cycleId) {
  const email = getCurrentUserEmail_();
  if (!isHrUser_(email)) {
    throw new Error('Only HR may recover compensation rate updates.');
  }
  ensureCompensationDataModel_();

  const reset = withLock_(function () {
    const loc = findCompensationRecordByCycle_(cycleId);
    const rec = loc.object;
    const status = String(rec['Rate Update Status'] || '');
    if (
      status !== V31_COMP.RATE_UPDATE.UNKNOWN &&
      status !== V31_COMP.RATE_UPDATE.CONFLICT
    ) {
      return { skip: true, status: status };
    }
    rec['Rate Update Status'] = V31_COMP.RATE_UPDATE.PENDING;
    rec['Rate Update Attempt ID'] = '';
    rec['Rate Update Started At'] = '';
    rec['Rate Update Last Error'] =
      'HR recovery: retrying rate update under conflict guarding.';
    rec['Updated At'] = new Date();
    writeCompensationRecord_(loc.rowNumber, rec);
    SpreadsheetApp.flush();
    return { skip: false };
  });

  if (reset.skip) {
    return { ok: true, skipped: true, status: reset.status };
  }
  return applyCompensationRateUpdateOnce_(cycleId);
}
