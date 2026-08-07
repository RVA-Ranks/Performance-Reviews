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
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
  },

  RATE_UPDATE: {
    PENDING: 'Pending',
    PENDING_EFFECTIVE: 'Pending Effective Date',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
  },

  PDF: {
    PENDING: 'Pending',
    GENERATING: 'Generating',
    COMPLETE: 'Complete',
    FAILED: 'Failed',
    UNKNOWN: 'Delivery Unknown',
  },

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
    'Manager Proposed Effective Date',
    'Manager Recommendation Submitted At',
    'Manager Recommendation Submitted By',
    'Final Approved Pay Rate',
    'Final Approved Annual Salary',
    'Final Approved Percent',
    'Recommendation Accepted',
    'Compensation Effective Date',
    'Owner Name',
    'Owner Decision At',
    'Owner Decision Recorded By',
    'Owner Decision Notes',
    'Status',
    'CAF PDF Status',
    'CAF PDF Attempt ID',
    'CAF PDF Started At',
    'CAF Final PDF ID',
    'CAF Final PDF Created At',
    'CAF PDF Last Error',
    'CAF PDF Recovery Details JSON',
    'Rate Update Status',
    'Rate Update Attempt ID',
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

/* ============================ GATE ============================ */

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
  return (
    status === V31_COMP.STATUS.AWAITING_SIGNATURES ||
    status === V31_COMP.STATUS.COMPLETE
  );
}

function syncCycleCompensationSummary_(cycle, record) {
  cycle['Compensation Decision'] = V31.COMPENSATION.ADJUSTMENT;
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
    if (
      decision === V31.COMPENSATION.ADJUSTMENT &&
      record &&
      String(record['Status']) === V31_COMP.STATUS.AWAITING_SIGNATURES
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
  return {
    compensationRecordId: String(record['Compensation Record ID'] || ''),
    status: String(record['Status'] || ''),
    originalPayRate: Number(record['Original Pay Rate'] || 0),
    originalAnnualSalary: Number(record['Original Annual Salary'] || 0),
    managerRecommendedPayRate: Number(
      record['Manager Recommended Pay Rate'] || 0
    ),
    managerRecommendedAnnualSalary: Number(
      record['Manager Recommended Annual Salary'] || 0
    ),
    managerRecommendedPercent: Number(
      record['Manager Recommended Percent'] || 0
    ),
    managerRecommendedPercentDisplay: roundPercent_(
      Number(record['Manager Recommended Percent'] || 0) * 100
    ),
    managerProposedEffectiveDate: formatDate_(
      record['Manager Proposed Effective Date']
    ),
    finalApprovedPayRate: record['Final Approved Pay Rate']
      ? Number(record['Final Approved Pay Rate'])
      : null,
    finalApprovedAnnualSalary: record['Final Approved Annual Salary']
      ? Number(record['Final Approved Annual Salary'])
      : null,
    finalApprovedPercent: record['Final Approved Percent'] !== ''
      ? Number(record['Final Approved Percent'])
      : null,
    finalApprovedPercentDisplay:
      record['Final Approved Percent'] !== ''
        ? roundPercent_(Number(record['Final Approved Percent'] || 0) * 100)
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
      String(record['Status']) === V31_COMP.STATUS.AWAITING_SIGNATURES,
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
      'Manager Proposed Effective Date': clean.proposedEffectiveDate,
      'Manager Recommendation Submitted At': now,
      'Manager Recommendation Submitted By': email,
      'Final Approved Pay Rate': '',
      'Final Approved Annual Salary': '',
      'Final Approved Percent': '',
      'Recommendation Accepted': '',
      'Compensation Effective Date': '',
      'Owner Name': '',
      'Owner Decision At': '',
      'Owner Decision Recorded By': '',
      'Owner Decision Notes': '',
      Status: V31_COMP.STATUS.AWAITING_OWNER,
      'CAF PDF Status': V31_COMP.PDF.PENDING,
      'CAF PDF Attempt ID': '',
      'CAF PDF Started At': '',
      'CAF Final PDF ID': '',
      'CAF Final PDF Created At': '',
      'CAF PDF Last Error': '',
      'CAF PDF Recovery Details JSON': '',
      'Rate Update Status': V31_COMP.RATE_UPDATE.PENDING,
      'Rate Update Attempt ID': '',
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

  let recommendedRate = null;
  let recommendedPercent = null;
  const rateInput = data.recommendedPayRate;
  const percentInput = data.recommendedPercent;

  if (rateInput !== '' && rateInput != null) {
    recommendedRate = roundCurrency_(Number(rateInput));
    if (!Number.isFinite(recommendedRate) || recommendedRate <= 0) {
      throw new Error('Recommended pay rate must be a positive number.');
    }
    recommendedPercent = roundPercent_(
      (recommendedRate - currentRate) / currentRate
    );
  } else if (percentInput !== '' && percentInput != null) {
    const enteredPercent = Number(percentInput);
    if (!Number.isFinite(enteredPercent)) {
      throw new Error('Recommended percent must be a valid number.');
    }
    recommendedPercent = roundPercent_(enteredPercent / 100);
    recommendedRate = roundCurrency_(
      currentRate * (1 + recommendedPercent)
    );
  } else {
    throw new Error(
      'Enter either a recommended pay rate or a recommended percent.'
    );
  }

  return {
    recommendedRate: recommendedRate,
    recommendedPercent: recommendedPercent,
    recommendedAnnual: annualSalaryFromRate_(recommendedRate),
    proposedEffectiveDate: proposedEffectiveDate,
    businessJustification: justification,
  };
}

function recordCompensationOwnerDecision(cycleId, payload) {
  return withLock_(function () {
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

    record['Final Approved Pay Rate'] = clean.finalRate;
    record['Final Approved Annual Salary'] = clean.finalAnnual;
    record['Final Approved Percent'] = clean.finalPercent;
    record['Recommendation Accepted'] = clean.accepted ? 'Yes' : 'No';
    record['Compensation Effective Date'] = clean.effectiveDate;
    record['Owner Name'] = clean.ownerName;
    record['Owner Decision At'] = now;
    record['Owner Decision Recorded By'] = email;
    record['Owner Decision Notes'] = clean.notes;
    record['Status'] = V31_COMP.STATUS.AWAITING_SIGNATURES;
    record['Updated At'] = now;
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
      V31_COMP.STATUS.AWAITING_SIGNATURES,
      JSON.stringify({
        ownerName: clean.ownerName,
        finalRate: clean.finalRate,
        finalPercent: clean.finalPercent,
        accepted: clean.accepted,
        effectiveDate: formatDate_(clean.effectiveDate),
      })
    );

    maybeSendCompensationReadyNotification_(cycle);

    return {
      ok: true,
      status: V31_COMP.STATUS.AWAITING_SIGNATURES,
      compensationComplete: true,
      cycleStatus: String(cycle['Status']),
      message: 'Owner compensation decision recorded.',
    };
  });
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

  let finalRate;
  let finalPercent;
  let accepted;

  if (mode === 'approve') {
    finalRate = recommendedRate;
    finalPercent = recommendedPercent;
    accepted = true;
  } else if (mode === 'override') {
    accepted = false;
    const notes = cleanText_(data.ownerDecisionNotes || '');
    if (!notes) {
      throw new Error(
        'Owner Decision Notes are required when approving a different amount.'
      );
    }
    if (data.finalApprovedPayRate !== '' && data.finalApprovedPayRate != null) {
      finalRate = roundCurrency_(Number(data.finalApprovedPayRate));
      if (!Number.isFinite(finalRate) || finalRate <= 0) {
        throw new Error('Final approved pay rate must be a positive number.');
      }
      finalPercent = roundPercent_((finalRate - currentRate) / currentRate);
    } else if (
      data.finalApprovedPercent !== '' &&
      data.finalApprovedPercent != null
    ) {
      const entered = Number(data.finalApprovedPercent);
      if (!Number.isFinite(entered)) {
        throw new Error('Final approved percent must be a valid number.');
      }
      finalPercent = roundPercent_(entered / 100);
      finalRate = roundCurrency_(currentRate * (1 + finalPercent));
    } else {
      throw new Error(
        'Enter either a final approved pay rate or a final approved percent.'
      );
    }
  } else {
    throw new Error(
      'Choose Approve Manager Recommendation or Approve Different Amount.'
    );
  }

  const effectiveRaw = String(
    data.compensationEffectiveDate ||
      data.effectiveDate ||
      ''
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
    notes:
      mode === 'override'
        ? cleanText_(data.ownerDecisionNotes || '')
        : cleanText_(data.ownerDecisionNotes || ''),
    finalRate: finalRate,
    finalPercent: finalPercent,
    finalAnnual: annualSalaryFromRate_(finalRate),
    accepted: accepted,
    effectiveDate: effectiveDate,
  };
}

function editCompensationOwnerDecision(cycleId, payload) {
  return withLock_(function () {
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
    if (String(record['Status']) !== V31_COMP.STATUS.AWAITING_SIGNATURES) {
      throw new Error(
        'Owner decision can only be edited while awaiting signatures and before any signature exists.'
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

    record['Final Approved Pay Rate'] = clean.finalRate;
    record['Final Approved Annual Salary'] = clean.finalAnnual;
    record['Final Approved Percent'] = clean.finalPercent;
    record['Recommendation Accepted'] = clean.accepted ? 'Yes' : 'No';
    record['Compensation Effective Date'] = clean.effectiveDate;
    record['Owner Name'] = clean.ownerName;
    record['Owner Decision At'] = now;
    record['Owner Decision Recorded By'] = email;
    record['Owner Decision Notes'] = clean.notes;
    record['Updated At'] = now;
    writeCompensationRecord_(recordLoc.rowNumber, record);

    syncCycleCompensationSummary_(cycle, record);
    cycle['Updated At'] = now;
    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation owner decision corrected',
      email,
      V31_COMP.STATUS.AWAITING_SIGNATURES,
      V31_COMP.STATUS.AWAITING_SIGNATURES,
      JSON.stringify({
        reason: reason,
        previous: previous,
        next: {
          finalRate: clean.finalRate,
          finalPercent: clean.finalPercent,
          effectiveDate: formatDate_(clean.effectiveDate),
          ownerName: clean.ownerName,
          accepted: clean.accepted,
        },
      })
    );

    return {
      ok: true,
      message: 'Owner compensation decision updated.',
      status: V31_COMP.STATUS.AWAITING_SIGNATURES,
    };
  });
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
        status !== V31_COMP.STATUS.AWAITING_SIGNATURES
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

function maybeSendCompensationReadyNotification_(cycle) {
  try {
    if (
      String(cycle['Manager Review Status']) === PR.DOC.SUBMITTED &&
      String(cycle['Self Evaluation Status']) === PR.DOC.SUBMITTED &&
      normalizeCompensationDecision_(cycle['Compensation Decision']) ===
        V31.COMPENSATION.ADJUSTMENT &&
      String(cycle['Compensation Status']) ===
        V31_COMP.STATUS.AWAITING_SIGNATURES
    ) {
      // Ready-for-meeting path already notifies; owner decision unlocks READY via updateCycleReadiness_.
    }
  } catch (error) {}
}

/* ============================ RATE UPDATE ============================ */

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
    if (rateStatus === V31_COMP.RATE_UPDATE.COMPLETE) {
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
  return withLock_(function () {
    const recordLoc = findCompensationRecordByCycle_(cycleId);
    const record = recordLoc.object;
    if (String(record['Status']) !== V31_COMP.STATUS.COMPLETE) {
      throw new Error('Compensation record is not complete.');
    }
    if (
      String(record['Rate Update Status']) ===
      V31_COMP.RATE_UPDATE.COMPLETE
    ) {
      return { alreadyComplete: true };
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

    const attemptId = Utilities.getUuid();
    record['Rate Update Attempt ID'] = attemptId;
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);

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

    let updatedRow = false;
    for (let row = 1; row < values.length; row++) {
      if (normalizeEmail_(values[row][emailIndex]) !== employeeEmail) {
        continue;
      }
      assignments
        .getRange(row + 1, rateIndex + 1)
        .setValue(Number(record['Final Approved Pay Rate']));
      updatedRow = true;
      break;
    }
    if (!updatedRow) {
      throw new Error('Employee assignment row not found for rate update.');
    }

    record['Rate Update Status'] = V31_COMP.RATE_UPDATE.COMPLETE;
    record['Rate Updated At'] = new Date();
    record['Rate Update Last Error'] = '';
    record['Updated At'] = new Date();
    writeCompensationRecord_(recordLoc.rowNumber, record);

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
}
