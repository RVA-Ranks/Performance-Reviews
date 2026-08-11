/**
 * Interactive performance diagnostics and request-scoped caches.
 *
 * ENABLE_PERFORMANCE_DIAGNOSTICS defaults false. When true, PERF events go to
 * Apps Script execution logs (console.log) only — never to Sheets.
 *
 * Request memoization is always available within a single google.script.run
 * execution so interactive paths can reuse Settings / sheet reads /
 * CompensationRecords without changing authoritative Sheet semantics.
 */

var ENABLE_PERFORMANCE_DIAGNOSTICS = false;

var V31_PERF_REQUEST_ = null;
var V31_PERF_CAPTURE_ = null;

function isPerfDiagnosticsEnabled_() {
  return ENABLE_PERFORMANCE_DIAGNOSTICS === true;
}

function perfCaptureBegin_() {
  V31_PERF_CAPTURE_ = [];
}

function perfCaptureTake_() {
  const rows = V31_PERF_CAPTURE_ || [];
  V31_PERF_CAPTURE_ = null;
  return rows;
}

function perfCapturePush_(entry) {
  if (!V31_PERF_CAPTURE_) return;
  V31_PERF_CAPTURE_.push(entry);
}

function perfEmit_(label, durationMs, details) {
  const entry = {
    type: 'PERF',
    label: String(label || 'timer'),
    durationMs: Number(durationMs) || 0,
    details: details || {},
  };
  perfCapturePush_(entry);
  if (isPerfDiagnosticsEnabled_()) {
    console.log(JSON.stringify(entry));
  }
  return entry.durationMs;
}

function perfBeginRequest_(label) {
  V31_PERF_REQUEST_ = {
    label: String(label || 'request'),
    startedAt: Date.now(),
    sheetReads: 0,
    driveCalls: 0,
    cache: {
      spreadsheet: undefined,
      settings: undefined,
      sheets: {},
      compensationByCycleId: undefined,
    },
  };
  return V31_PERF_REQUEST_;
}

function perfGetRequest_() {
  return V31_PERF_REQUEST_;
}

function perfEndRequest_(details) {
  const req = V31_PERF_REQUEST_;
  if (!req) return 0;
  const durationMs = Date.now() - req.startedAt;
  perfEmit_(req.label + ' total', durationMs, Object.assign(
    {
      sheetReads: req.sheetReads,
      driveCalls: req.driveCalls,
    },
    details || {}
  ));
  V31_PERF_REQUEST_ = null;
  return durationMs;
}

function perfStart_(label) {
  return {
    label: String(label || 'timer'),
    startedAt: Date.now(),
  };
}

function perfEnd_(timer, details) {
  const durationMs =
    Date.now() - (timer && timer.startedAt ? timer.startedAt : Date.now());
  perfEmit_(
    timer && timer.label ? timer.label : 'timer',
    durationMs,
    details || {}
  );
  return durationMs;
}

function perfCountSheetRead_(sheetName, durationMs) {
  const req = V31_PERF_REQUEST_;
  if (req) req.sheetReads += 1;
  if (isPerfDiagnosticsEnabled_() || V31_PERF_CAPTURE_) {
    perfEmit_('sheetRead', Number(durationMs) || 0, {
      sheet: String(sheetName || ''),
      sheetReads: req ? req.sheetReads : null,
    });
  }
}

function perfCountDriveCall_(operation, durationMs) {
  const req = V31_PERF_REQUEST_;
  if (req) req.driveCalls += 1;
  if (isPerfDiagnosticsEnabled_() || V31_PERF_CAPTURE_) {
    perfEmit_('driveCall', Number(durationMs) || 0, {
      operation: String(operation || ''),
      driveCalls: req ? req.driveCalls : null,
    });
  }
}

function perfTimedSheetValues_(sheet, sheetName) {
  const started = Date.now();
  const values = sheet.getDataRange().getValues();
  perfCountSheetRead_(sheetName || (sheet && sheet.getName ? sheet.getName() : ''), Date.now() - started);
  return values;
}

function perfLogPayloadBytes_(label, payload) {
  if (!isPerfDiagnosticsEnabled_() && !V31_PERF_CAPTURE_) return 0;
  try {
    const json = JSON.stringify(payload);
    const bytes = Utilities.newBlob(json).getBytes().length;
    perfEmit_(String(label || 'payload') + ' bytes', 0, { bytes: bytes });
    return bytes;
  } catch (error) {
    perfEmit_(String(label || 'payload') + ' bytes', 0, {
      error: String(error.message || error),
    });
    return 0;
  }
}

function invalidatePerfSheetCache_(sheetName) {
  const req = V31_PERF_REQUEST_;
  if (!req || !req.cache) return;
  if (!sheetName) {
    req.cache.spreadsheet = undefined;
    req.cache.settings = undefined;
    req.cache.sheets = {};
    req.cache.compensationByCycleId = undefined;
    return;
  }
  if (sheetName === PR.SHEETS.SETTINGS) {
    req.cache.settings = undefined;
  }
  if (req.cache.sheets) {
    delete req.cache.sheets[sheetName];
  }
  if (
    typeof V31_COMP !== 'undefined' &&
    sheetName === V31_COMP.RECORDS_SHEET
  ) {
    req.cache.compensationByCycleId = undefined;
  }
}

/**
 * Load CompensationRecords once per request and index by Review Cycle ID.
 * Prefer the newest non-Failed (active) row. Failed/historical rows never
 * shadow an active recommendation.
 */
function getCompensationRecordsByCycleId_() {
  const req = perfGetRequest_();
  if (req && req.cache.compensationByCycleId !== undefined) {
    return req.cache.compensationByCycleId;
  }

  const map = {};
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) {
    if (req) req.cache.compensationByCycleId = map;
    return map;
  }

  const values = perfTimedSheetValues_(sheet, V31_COMP.RECORDS_SHEET);
  if (values.length >= 2) {
    const headers = values[0].map(String);
    const cycleIndex = headers.indexOf('Review Cycle ID');
    for (let row = 1; row < values.length; row++) {
      const object = {};
      headers.forEach(function (header, index) {
        object[header] = values[row][index];
      });
      const cycleId = String(values[row][cycleIndex] || '');
      if (!cycleId) continue;
      const candidate = { rowNumber: row + 1, object: object };
      const existing = map[cycleId];
      if (!existing) {
        map[cycleId] = candidate;
        continue;
      }
      const existingFailed =
        String(existing.object['Status'] || '') ===
        V31_COMP.STATUS.FAILED;
      const candidateFailed =
        String(object['Status'] || '') === V31_COMP.STATUS.FAILED;
      if (existingFailed && !candidateFailed) {
        map[cycleId] = candidate;
      } else if (!existingFailed && !candidateFailed) {
        // Prefer newest active row.
        map[cycleId] = candidate;
      }
      // existing active + candidate failed → keep existing
    }
  }

  if (req) req.cache.compensationByCycleId = map;
  return map;
}

function isCompensationRecordActive_(record) {
  if (!record) return false;
  const status = String(record['Status'] || '');
  return !!status && status !== V31_COMP.STATUS.FAILED;
}

/**
 * Sheet-backed list of active (non-Failed) CompensationRecords for one cycle.
 * Never applies a newest-wins heuristic — callers must fail closed on length > 1.
 */
function listActiveCompensationRecordLocationsForCycle_(cycleId) {
  const id = String(cycleId || '');
  const out = [];
  if (!id) return out;
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) return out;
  const values = perfTimedSheetValues_(sheet, V31_COMP.RECORDS_SHEET);
  if (values.length < 2) return out;
  const headers = values[0].map(String);
  const cycleIndex = headers.indexOf('Review Cycle ID');
  if (cycleIndex < 0) return out;
  for (let row = 1; row < values.length; row++) {
    if (String(values[row][cycleIndex] || '') !== id) continue;
    const object = {};
    headers.forEach(function (header, index) {
      object[header] = values[row][index];
    });
    if (!isCompensationRecordActive_(object)) continue;
    out.push({ rowNumber: row + 1, object: object });
  }
  return out;
}

function raiseMultiActiveCompensationAlert_(cycleId, actives) {
  const rows = actives || [];
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        cycleId,
        'Compensation',
        'multiple_active_records'
      ),
      cycleId: String(cycleId || ''),
      severity: 'Blocking',
      component: 'Compensation',
      subject:
        'Multiple active compensation records for cycle ' + cycleId,
      lastError:
        'Found ' +
        rows.length +
        ' active CompensationRecords. Fail closed until HR reconciles.',
      details: {
        recordIds: rows.map(function (row) {
          return String(
            (row && row.object && row.object['Compensation Record ID']) ||
              (row && row['Compensation Record ID']) ||
              ''
          );
        }),
      },
    });
  } catch (alertError) {
    Logger.log(
      'multi-active compensation alert failed: ' +
        String(alertError.message || alertError)
    );
  }
}

/**
 * Authoritative active-record gate for compensation money/approval mutations.
 * 0 active → null when allowZero, else throw.
 * 1 active → that location.
 * >1 active → System Health + throw (never pick newest).
 */
function requireSingleActiveCompensationRecord_(cycleId, options) {
  const opts = options || {};
  const actives = listActiveCompensationRecordLocationsForCycle_(cycleId);
  if (actives.length > 1) {
    raiseMultiActiveCompensationAlert_(cycleId, actives);
    throw new Error(
      'Multiple active compensation records exist for this cycle. HR must reconcile before continuing.'
    );
  }
  if (actives.length === 0) {
    if (opts.allowZero) return null;
    throw new Error('Compensation record not found.');
  }
  return actives[0];
}

function findActiveCompensationRecordByCycleOptional_(cycleId) {
  const actives = listActiveCompensationRecordLocationsForCycle_(cycleId);
  if (actives.length > 1) {
    raiseMultiActiveCompensationAlert_(cycleId, actives);
    return null;
  }
  return actives[0] || null;
}

/**
 * Count active (non-Failed) CompensationRecords for one cycle.
 */
function countActiveCompensationRecordsForCycle_(cycleId) {
  return listActiveCompensationRecordLocationsForCycle_(cycleId).length;
}

function findCompensationRecordObjectById_(records, recordId) {
  const id = String(recordId || '');
  if (!id || !records || !records.length) return null;
  for (let i = 0; i < records.length; i++) {
    if (String(records[i]['Compensation Record ID'] || '') === id) {
      return records[i];
    }
  }
  return null;
}

/**
 * Relink ReviewCycles to exactly one active CompensationRecord when the
 * cycle mirror is blank/stale and the active record is unambiguous.
 * After a successful relink, recalculates ordinary readiness.
 */
function reconcileCompensationCycleLinks_() {
  const cycles = getAllObjects_(PR.SHEETS.CYCLES);
  const byId = {};
  cycles.forEach(function (cycle) {
    byId[String(cycle['Cycle ID'] || '')] = cycle;
  });
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) {
    return { relinked: 0, multiActive: 0, readinessFixed: 0 };
  }
  const records = getAllObjects_(V31_COMP.RECORDS_SHEET);
  const activeByCycle = {};
  const allByCycle = {};
  records.forEach(function (record) {
    const cycleId = String(record['Review Cycle ID'] || '');
    if (!cycleId) return;
    if (!allByCycle[cycleId]) allByCycle[cycleId] = [];
    allByCycle[cycleId].push(record);
    if (!isCompensationRecordActive_(record)) return;
    if (!activeByCycle[cycleId]) activeByCycle[cycleId] = [];
    activeByCycle[cycleId].push(record);
  });

  let relinked = 0;
  let multiActive = 0;
  let readinessFixed = 0;

  Object.keys(activeByCycle).forEach(function (cycleId) {
    const actives = activeByCycle[cycleId];
    if (actives.length > 1) {
      multiActive += 1;
      raiseMultiActiveCompensationAlert_(
        cycleId,
        actives.map(function (row) {
          return { object: row };
        })
      );
      return;
    }
    const record = actives[0];
    const cycle = byId[cycleId];
    if (!cycle) return;
    const mirrorId = String(cycle['Compensation Record ID'] || '');
    const recordId = String(record['Compensation Record ID'] || '');
    let needsRelink = false;

    if (!mirrorId || mirrorId === recordId) {
      needsRelink = !mirrorId;
    } else {
      const mirrored = findCompensationRecordObjectById_(
        allByCycle[cycleId] || [],
        mirrorId
      );
      if (mirrored && !isCompensationRecordActive_(mirrored)) {
        // Stale Failed/historical mirror + exactly one active → repair.
        needsRelink = true;
      } else {
        try {
          upsertSystemAlert_({
            alertKey: buildSystemAlertKey_(
              cycleId,
              'Compensation',
              'ambiguous_compensation_mirror'
            ),
            cycleId: cycleId,
            severity: 'Blocking',
            component: 'Compensation',
            subject:
              'Ambiguous compensation mirror for cycle ' + cycleId,
            lastError:
              'Cycle Compensation Record ID does not match the single active record and is not a Failed historical row.',
            details: {
              mirrorId: mirrorId,
              activeRecordId: recordId,
            },
          });
        } catch (alertError) {
          Logger.log(
            'ambiguous compensation mirror alert failed: ' +
              String(alertError.message || alertError)
          );
        }
        return;
      }
    }

    try {
      const location = findCycle_(cycleId);
      const beforeStatus = String(location.object['Status'] || '');
      if (needsRelink) {
        syncCycleCompensationSummary_(location.object, record);
      }
      updateCycleReadiness_(location.object);
      const afterStatus = String(location.object['Status'] || '');
      const changed =
        needsRelink ||
        beforeStatus !== afterStatus ||
        String(location.object['Compensation Record ID'] || '') !==
          mirrorId;
      if (changed) {
        location.object['Updated At'] = new Date();
        writeCycle_(location.rowNumber, location.object);
        if (needsRelink) relinked += 1;
        if (beforeStatus !== afterStatus) readinessFixed += 1;
      }
    } catch (error) {
      Logger.log(
        'Compensation relink failed for ' +
          cycleId +
          ': ' +
          String(error.message || error)
      );
    }
  });

  return {
    relinked: relinked,
    multiActive: multiActive,
    readinessFixed: readinessFixed,
  };
}
