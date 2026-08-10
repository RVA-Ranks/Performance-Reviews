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

function perfCountSheetRead_(sheetName) {
  const req = V31_PERF_REQUEST_;
  if (req) req.sheetReads += 1;
  if (isPerfDiagnosticsEnabled_() || V31_PERF_CAPTURE_) {
    perfEmit_('sheetRead', 0, {
      sheet: String(sheetName || ''),
      sheetReads: req ? req.sheetReads : null,
    });
  }
}

function perfCountDriveCall_(operation) {
  const req = V31_PERF_REQUEST_;
  if (req) req.driveCalls += 1;
  if (isPerfDiagnosticsEnabled_() || V31_PERF_CAPTURE_) {
    perfEmit_('driveCall', 0, {
      operation: String(operation || ''),
      driveCalls: req ? req.driveCalls : null,
    });
  }
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

  const values = sheet.getDataRange().getValues();
  perfCountSheetRead_(V31_COMP.RECORDS_SHEET);
  if (values.length >= 2) {
    const headers = values[0].map(String);
    const cycleIndex = headers.indexOf('Review Cycle ID');
    for (let row = 1; row < values.length; row++) {
      const object = {};
      headers.forEach(function (header, index) {
        object[header] = values[row][index];
      });
      const cycleId = String(values[row][cycleIndex] || '');
      if (cycleId && !map[cycleId]) {
        map[cycleId] = { rowNumber: row + 1, object: object };
      }
    }
  }

  if (req) req.cache.compensationByCycleId = map;
  return map;
}
