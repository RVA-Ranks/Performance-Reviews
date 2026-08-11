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

function findActiveCompensationRecordByCycleOptional_(cycleId) {
  const loc = findCompensationRecordByCycleOptional_(cycleId);
  if (!loc || !isCompensationRecordActive_(loc.object)) {
    return null;
  }
  return loc;
}

/**
 * Count active (non-Failed) CompensationRecords for one cycle.
 */
function countActiveCompensationRecordsForCycle_(cycleId) {
  const id = String(cycleId || '');
  if (!id) return 0;
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) return 0;
  const rows = getAllObjects_(V31_COMP.RECORDS_SHEET);
  let count = 0;
  rows.forEach(function (row) {
    if (String(row['Review Cycle ID'] || '') !== id) return;
    if (isCompensationRecordActive_(row)) count += 1;
  });
  return count;
}

/**
 * Relink ReviewCycles to exactly one active CompensationRecord when the
 * cycle mirror is blank/stale and the active record is unambiguous.
 */
function reconcileCompensationCycleLinks_() {
  const cycles = getAllObjects_(PR.SHEETS.CYCLES);
  const byId = {};
  cycles.forEach(function (cycle) {
    byId[String(cycle['Cycle ID'] || '')] = cycle;
  });
  const sheet = getSpreadsheet_().getSheetByName(V31_COMP.RECORDS_SHEET);
  if (!sheet) {
    return { relinked: 0, multiActive: 0 };
  }
  const records = getAllObjects_(V31_COMP.RECORDS_SHEET);
  const activeByCycle = {};
  records.forEach(function (record) {
    const cycleId = String(record['Review Cycle ID'] || '');
    if (!cycleId || !isCompensationRecordActive_(record)) return;
    if (!activeByCycle[cycleId]) activeByCycle[cycleId] = [];
    activeByCycle[cycleId].push(record);
  });

  let relinked = 0;
  let multiActive = 0;
  Object.keys(activeByCycle).forEach(function (cycleId) {
    const actives = activeByCycle[cycleId];
    if (actives.length > 1) {
      multiActive += 1;
      try {
        upsertSystemAlert_({
          alertKey: buildSystemAlertKey_(
            cycleId,
            'Compensation',
            'multiple_active_records'
          ),
          cycleId: cycleId,
          severity: 'Blocking',
          component: 'Compensation',
          subject:
            'Multiple active compensation records for cycle ' + cycleId,
          lastError:
            'Found ' +
            actives.length +
            ' active CompensationRecords. Fail closed until HR reconciles.',
          details: {
            recordIds: actives.map(function (row) {
              return String(row['Compensation Record ID'] || '');
            }),
          },
        });
      } catch (alertError) {
        Logger.log(
          'multi-active compensation alert failed: ' +
            String(alertError.message || alertError)
        );
      }
      return;
    }
    const record = actives[0];
    const cycle = byId[cycleId];
    if (!cycle) return;
    const mirrorId = String(cycle['Compensation Record ID'] || '');
    const recordId = String(record['Compensation Record ID'] || '');
    if (mirrorId && mirrorId === recordId) return;
    if (
      mirrorId &&
      mirrorId !== recordId &&
      String(cycle['Compensation Decision'] || '') ===
        V31.COMPENSATION.ADJUSTMENT
    ) {
      // Ambiguous mirror — leave for System Health / HR.
      return;
    }
    try {
      const location = findCycle_(cycleId);
      syncCycleCompensationSummary_(location.object, record);
      location.object['Updated At'] = new Date();
      writeCycle_(location.rowNumber, location.object);
      relinked += 1;
    } catch (error) {
      Logger.log(
        'Compensation relink failed for ' +
          cycleId +
          ': ' +
          String(error.message || error)
      );
    }
  });

  return { relinked: relinked, multiActive: multiActive };
}
