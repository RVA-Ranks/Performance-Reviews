/**
 * Interactive performance acceptance checks + editor-run live profile.
 *
 * From the Apps Script editor Run menu, select:
 *   runPerformanceProfile
 *
 * That public entry point:
 * 1) runs pure acceptance checks
 * 2) times live bootstrap (Home) twice for the signed-in user
 * 3) times Open Review for the first visible cycle when available
 * 4) prints a readable report to Logs / Executions
 *
 * Private suite (cursor-in-function Run): runV31PerformanceTests_()
 */

/**
 * Public — appears in the Apps Script Run dropdown.
 * Safe for Preview. Does not send mail, create Calendar events, or mutate workflow.
 */
function runPerformanceProfile() {
  const previousDiagnostics = ENABLE_PERFORMANCE_DIAGNOSTICS;
  const report = {
    ok: true,
    ranAt: new Date().toISOString(),
    actor: '',
    acceptance: null,
    bootstrapColdMs: null,
    bootstrapWarmMs: null,
    openReviewMs: null,
    cycleCount: null,
    payloadBytes: null,
    sheetReadsCold: null,
    sheetReadsWarm: null,
    driveCallsCold: null,
    events: [],
    verdicts: [],
    errors: [],
  };

  try {
    report.actor = String(Session.getEffectiveUser().getEmail() || '');
  } catch (error) {
    report.actor = '(unknown)';
  }

  try {
    report.acceptance = runV31PerformanceTests_();
  } catch (error) {
    report.ok = false;
    report.errors.push('Acceptance: ' + String(error.message || error));
  }

  try {
    ENABLE_PERFORMANCE_DIAGNOSTICS = true;

    perfCaptureBegin_();
    const coldStarted = Date.now();
    const coldPayload = getReviewBootstrapData('');
    report.bootstrapColdMs = Date.now() - coldStarted;
    report.cycleCount = (coldPayload.cycles || []).length;
    report.payloadBytes = estimatePayloadBytes_(coldPayload);
    const coldEvents = perfCaptureTake_();
    report.events = report.events.concat(
      tagPerfRunEvents_('bootstrapCold', coldEvents)
    );
    report.sheetReadsCold = lastSheetReads_(coldEvents);
    report.driveCallsCold = lastDriveCalls_(coldEvents);

    perfCaptureBegin_();
    const warmStarted = Date.now();
    const warmPayload = getReviewBootstrapData('');
    report.bootstrapWarmMs = Date.now() - warmStarted;
    const warmEvents = perfCaptureTake_();
    report.events = report.events.concat(
      tagPerfRunEvents_('bootstrapWarm', warmEvents)
    );
    report.sheetReadsWarm = lastSheetReads_(warmEvents);

    const firstCycle =
      warmPayload && warmPayload.cycles && warmPayload.cycles[0]
        ? warmPayload.cycles[0].cycleId
        : '';
    if (firstCycle) {
      perfCaptureBegin_();
      const openStarted = Date.now();
      getReviewCycle(firstCycle);
      report.openReviewMs = Date.now() - openStarted;
      const openEvents = perfCaptureTake_();
      report.events = report.events.concat(
        tagPerfRunEvents_('openReview', openEvents)
      );
    }
  } catch (error) {
    report.ok = false;
    report.errors.push('Live profile: ' + String(error.message || error));
    perfCaptureTake_();
  } finally {
    ENABLE_PERFORMANCE_DIAGNOSTICS = previousDiagnostics === true;
    V31_PERF_REQUEST_ = null;
    V31_PERF_CAPTURE_ = null;
  }

  report.verdicts = buildPerformanceVerdicts_(report);
  if (report.verdicts.some(function (row) { return row.status === 'FAIL'; })) {
    report.ok = false;
  }

  const text = formatPerformanceProfileReport_(report);
  // Single sink — Apps Script Executions surfaces Logger output.
  Logger.log(text);

  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.alert(
        report.ok ? 'Performance profile complete' : 'Performance profile needs attention',
        summarizePerformanceProfileAlert_(report),
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    // Editor-only / headless runs may not have UI.
  }

  return report;
}

function runV31PerformanceTests_() {
  const results = [];
  results.push(runPerfCase_('perf helpers are present', testPerfHelpersExist_));
  results.push(
    runPerfCase_(
      'diagnostics default off',
      testPerfDiagnosticsDefaultOff_
    )
  );
  results.push(
    runPerfCase_(
      'request cache invalidation clears sheet maps',
      testPerfRequestCacheInvalidation_
    )
  );
  results.push(
    runPerfCase_(
      'bootstrap no longer calls ensure on V31 bootstrap path',
      testV31BootstrapDoesNotDeclareEnsureDependency_
    )
  );
  results.push(
    runPerfCase_(
      'public editor profile entry exists',
      testPublicPerformanceProfileEntry_
    )
  );
  results.push(
    runPerfCase_(
      'compensation integrity uses one Sheet read per request',
      testCompensationIntegrityOneReadPerRequest_
    )
  );
  results.push(
    runPerfCase_(
      'compensation integrity cache invalidates after mutation',
      testCompensationIntegrityCacheInvalidation_
    )
  );
  results.push(
    runPerfCase_(
      'live cycle row helper exists for hot-path polls',
      function () {
        if (typeof findLiveCycleRow_ !== 'function') {
          throw new Error('findLiveCycleRow_ must exist');
        }
        if (typeof isLiveReviewStateStale_ !== 'function') {
          throw new Error('isLiveReviewStateStale_ must exist');
        }
      }
    )
  );

  const failed = results.filter(function (row) {
    return !row.ok;
  });
  Logger.log(
    'V31 performance tests: ' +
      results.length +
      ' cases, ' +
      failed.length +
      ' failed'
  );
  results.forEach(function (row) {
    Logger.log((row.ok ? 'PASS' : 'FAIL') + ' — ' + row.name + (row.detail ? ': ' + row.detail : ''));
  });
  if (failed.length) {
    throw new Error(
      'Performance tests failed: ' +
        failed
          .map(function (row) {
            return row.name;
          })
          .join(', ')
    );
  }
  return { ok: true, results: results };
}

function runPerfCase_(name, fn) {
  try {
    fn();
    return { ok: true, name: name };
  } catch (error) {
    return {
      ok: false,
      name: name,
      detail: String(error.message || error),
    };
  }
}

function assertPerf_(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function testPerfHelpersExist_() {
  assertPerf_(typeof perfStart_ === 'function', 'perfStart_ missing');
  assertPerf_(typeof perfEnd_ === 'function', 'perfEnd_ missing');
  assertPerf_(typeof perfBeginRequest_ === 'function', 'perfBeginRequest_ missing');
  assertPerf_(typeof perfEndRequest_ === 'function', 'perfEndRequest_ missing');
  assertPerf_(
    typeof getCompensationRecordsByCycleId_ === 'function',
    'getCompensationRecordsByCycleId_ missing'
  );
  assertPerf_(
    typeof invalidatePerfSheetCache_ === 'function',
    'invalidatePerfSheetCache_ missing'
  );
  assertPerf_(typeof perfCaptureBegin_ === 'function', 'perfCaptureBegin_ missing');
}

function testPerfDiagnosticsDefaultOff_() {
  assertPerf_(
    ENABLE_PERFORMANCE_DIAGNOSTICS === false,
    'ENABLE_PERFORMANCE_DIAGNOSTICS must default false'
  );
}

function testPerfRequestCacheInvalidation_() {
  perfBeginRequest_('test');
  const req = perfGetRequest_();
  assertPerf_(!!req, 'request context missing');
  req.cache.settings = { APP_NAME: 'test' };
  req.cache.sheets[PR.SHEETS.CYCLES] = [{ 'Cycle ID': 'x' }];
  req.cache.compensationByCycleId = { x: { rowNumber: 2, object: {} } };
  invalidatePerfSheetCache_(PR.SHEETS.CYCLES);
  assertPerf_(
    !Object.prototype.hasOwnProperty.call(req.cache.sheets, PR.SHEETS.CYCLES),
    'cycles cache should clear'
  );
  assertPerf_(req.cache.settings && req.cache.settings.APP_NAME === 'test', 'settings should remain');
  invalidatePerfSheetCache_();
  assertPerf_(req.cache.settings === undefined, 'full invalidate clears settings');
  assertPerf_(req.cache.compensationByCycleId === undefined, 'full invalidate clears compensation');
  assertPerf_(
    req.cache.compensationIntegrityByCycleId === undefined,
    'full invalidate clears compensation integrity'
  );
  perfEndRequest_();
}

function testV31BootstrapDoesNotDeclareEnsureDependency_() {
  const source = String(getV31BootstrapData_);
  assertPerf_(
    source.indexOf('ensureV31DataModel_') < 0,
    'getV31BootstrapData_ must not call ensureV31DataModel_ on interactive path'
  );
  assertPerf_(
    source.indexOf('getAutomationAdminData_') < 0,
    'Home bootstrap must not load automation admin / Drive folder probe'
  );
}

function testPublicPerformanceProfileEntry_() {
  assertPerf_(
    typeof runPerformanceProfile === 'function',
    'runPerformanceProfile must exist for editor Run menu'
  );
  assertPerf_(
    String(runPerformanceProfile.name || 'runPerformanceProfile').slice(-1) !== '_',
    'runPerformanceProfile must stay public (no trailing underscore)'
  );
}

function estimatePayloadBytes_(payload) {
  try {
    return Utilities.newBlob(JSON.stringify(payload)).getBytes().length;
  } catch (error) {
    return null;
  }
}

function tagPerfRunEvents_(runLabel, events) {
  return (events || []).map(function (event) {
    return Object.assign({}, event, {
      run: runLabel,
    });
  });
}

function lastSheetReads_(events) {
  for (let i = (events || []).length - 1; i >= 0; i--) {
    const details = events[i].details || {};
    if (details.sheetReads != null) return details.sheetReads;
  }
  return null;
}

function lastDriveCalls_(events) {
  for (let i = (events || []).length - 1; i >= 0; i--) {
    const details = events[i].details || {};
    if (details.driveCalls != null) return details.driveCalls;
  }
  return null;
}

function buildPerformanceVerdicts_(report) {
  const rows = [];
  rows.push({
    name: 'Acceptance checks',
    status: report.acceptance && report.acceptance.ok ? 'PASS' : 'FAIL',
    detail: report.acceptance && report.acceptance.ok ? 'ok' : 'see errors',
  });
  rows.push(
    verdictAgainstTarget_(
      'Bootstrap cold (Home)',
      report.bootstrapColdMs,
      5000,
      8000
    )
  );
  rows.push(
    verdictAgainstTarget_(
      'Bootstrap warm (Home)',
      report.bootstrapWarmMs,
      2000,
      8000
    )
  );
  if (report.openReviewMs != null) {
    rows.push(
      verdictAgainstTarget_('Open Review', report.openReviewMs, 3000, 8000)
    );
  }
  rows.push(
    verdictAgainstTarget_(
      'Home Drive calls',
      report.driveCallsCold == null ? null : Number(report.driveCallsCold) * 1,
      0,
      0,
      true
    )
  );
  return rows;
}

function verdictAgainstTarget_(name, valueMs, targetMs, warnMs, treatAsCount) {
  if (valueMs == null || !isFinite(Number(valueMs))) {
    return { name: name, status: 'SKIP', detail: 'not measured' };
  }
  const ms = Number(valueMs);
  if (treatAsCount) {
    if (ms > targetMs) {
      return {
        name: name,
        status: 'FAIL',
        detail: ms + ' Drive calls (target ' + targetMs + ')',
      };
    }
    return {
      name: name,
      status: 'PASS',
      detail: ms + ' Drive calls',
    };
  }
  if (ms > warnMs) {
    return {
      name: name,
      status: 'FAIL',
      detail: ms + 'ms > hard warning ' + warnMs + 'ms (target ' + targetMs + 'ms)',
    };
  }
  if (ms > targetMs) {
    return {
      name: name,
      status: 'WARN',
      detail: ms + 'ms above target ' + targetMs + 'ms',
    };
  }
  return {
    name: name,
    status: 'PASS',
    detail: ms + 'ms ≤ target ' + targetMs + 'ms',
  };
}

function formatPerformanceProfileReport_(report) {
  const lines = [];
  lines.push('===== AITHERAS Performance Profile =====');
  lines.push('Actor: ' + report.actor);
  lines.push('Ran at: ' + report.ranAt);
  lines.push('Overall: ' + (report.ok ? 'OK' : 'NEEDS ATTENTION'));
  lines.push('');
  lines.push('Measurements');
  lines.push('- Bootstrap cold: ' + formatMs_(report.bootstrapColdMs));
  lines.push('- Bootstrap warm: ' + formatMs_(report.bootstrapWarmMs));
  lines.push('- Open Review: ' + formatMs_(report.openReviewMs));
  lines.push('- Visible cycles: ' + String(report.cycleCount));
  lines.push('- Bootstrap payload bytes: ' + String(report.payloadBytes));
  lines.push('- Sheet reads cold/warm: ' +
    String(report.sheetReadsCold) + ' / ' + String(report.sheetReadsWarm));
  lines.push('- Drive calls cold: ' + String(report.driveCallsCold));
  if (report.driveCallsCold != null && Number(report.driveCallsCold) > 0) {
    lines.push('  NOTE: ordinary Home target is Drive calls = 0');
  }
  lines.push('');
  lines.push('Verdicts');
  (report.verdicts || []).forEach(function (row) {
    lines.push('- [' + row.status + '] ' + row.name + ' — ' + row.detail);
  });
  if (report.errors && report.errors.length) {
    lines.push('');
    lines.push('Errors');
    report.errors.forEach(function (err) {
      lines.push('- ' + err);
    });
  }
  lines.push('');
  lines.push('Component events (do not sum parent + child)');
  (report.events || []).forEach(function (event) {
    const nested =
      event.details && event.details.nested
        ? ' [parent]'
        : String(event.label || '').indexOf(' › ') >= 0
          ? ' [child]'
          : '';
    lines.push(
      '- [' +
        (event.run || '') +
        '] ' +
        event.label +
        nested +
        ': ' +
        event.durationMs +
        'ms' +
        (event.label === 'sheetRead' || event.label === 'driveCall'
          ? ' (' +
            JSON.stringify(event.details || {}) +
            ')'
          : '')
    );
  });
  lines.push('');
  lines.push(
    'Open Meeting server cost ≈ Open Review (getReviewCycle); meeting tab switch is client-only.'
  );
  lines.push(
    'Record Signature must be timed in the deployed web app (mutation path).'
  );
  lines.push('===== End Performance Profile =====');
  return lines.join('\n');
}

function summarizePerformanceProfileAlert_(report) {
  return [
    'Actor: ' + report.actor,
    'Cold Home: ' + formatMs_(report.bootstrapColdMs),
    'Warm Home: ' + formatMs_(report.bootstrapWarmMs),
    'Open Review: ' + formatMs_(report.openReviewMs),
    'Cycles: ' + String(report.cycleCount),
    'Payload bytes: ' + String(report.payloadBytes),
    '',
    (report.verdicts || [])
      .map(function (row) {
        return '[' + row.status + '] ' + row.name;
      })
      .join('\n'),
    '',
    'Full detail is in Executions / Logs.',
  ].join('\n');
}

function formatMs_(value) {
  if (value == null || !isFinite(Number(value))) return 'n/a';
  return Number(value) + 'ms';
}

function testCompensationIntegrityOneReadPerRequest_() {
  perfBeginRequest_('comp-integrity-reads');
  let recordsReads = 0;
  const originalTimed = perfTimedSheetValues_;
  const originalGetSs = getSpreadsheet_;
  const headers = [
    'Compensation Record ID',
    'Review Cycle ID',
    'Status',
  ];
  const values = [headers];
  for (let i = 0; i < 25; i++) {
    values.push([
      'REC-' + i,
      'CYCLE-' + i,
      V31_COMP.STATUS.AWAITING_OWNER,
    ]);
  }
  // One multi-active cycle for fail-closed check.
  values.push(['REC-M1', 'CYCLE-MULTI', V31_COMP.STATUS.AWAITING_OWNER]);
  values.push(['REC-M2', 'CYCLE-MULTI', V31_COMP.STATUS.AWAITING_OWNER]);

  getSpreadsheet_ = function () {
    return {
      getSheetByName: function () {
        return {
          getName: function () {
            return V31_COMP.RECORDS_SHEET;
          },
        };
      },
    };
  };
  perfTimedSheetValues_ = function (sheet, sheetName) {
    if (String(sheetName) === V31_COMP.RECORDS_SHEET) {
      recordsReads += 1;
    }
    return values;
  };
  try {
    for (let i = 0; i < 25; i++) {
      assertPerf_(
        countActiveCompensationRecordsForCycle_('CYCLE-' + i) === 1,
        'single-active count'
      );
      assertPerf_(
        isV31CompensationComplete_({
          'Cycle ID': 'CYCLE-' + i,
          'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
          'Compensation Status': V31_COMP.STATUS.AWAITING_OWNER,
        }) === false,
        'awaiting owner incomplete'
      );
    }
    assertPerf_(
      isV31CompensationComplete_({
        'Cycle ID': 'CYCLE-MULTI',
        'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
        'Compensation Status': V31_COMP.STATUS.AWAITING_SIGNATURES,
      }) === false,
      'multi-active remains incomplete'
    );
    assertPerf_(
      recordsReads === 1,
      'CompensationRecords getValues must run once, not per cycle (got ' +
        recordsReads +
        ')'
    );
  } finally {
    perfTimedSheetValues_ = originalTimed;
    getSpreadsheet_ = originalGetSs;
    perfEndRequest_();
  }
}

function testCompensationIntegrityCacheInvalidation_() {
  perfBeginRequest_('comp-integrity-invalidate');
  const req = perfGetRequest_();
  req.cache.compensationIntegrityByCycleId = {
    C1: { activeCount: 1, actives: [] },
  };
  req.cache.compensationByCycleId = { C1: { rowNumber: 2, object: {} } };
  invalidateCompensationIntegrityCache_();
  assertPerf_(
    req.cache.compensationIntegrityByCycleId === undefined,
    'integrity cleared'
  );
  assertPerf_(
    req.cache.compensationByCycleId === undefined,
    'byCycle cleared'
  );

  // Mutation-boundary coverage: write/append must clear both caches.
  const originalWrite = writeObject_;
  const originalAppend = appendObject_;
  writeObject_ = function () {};
  appendObject_ = function () {
    return 3;
  };
  try {
    req.cache.compensationIntegrityByCycleId = {
      C1: { activeCount: 1, actives: [] },
    };
    req.cache.compensationByCycleId = { C1: { rowNumber: 2, object: {} } };
    writeCompensationRecord_(2, {
      'Compensation Record ID': 'REC-1',
      Status: V31_COMP.STATUS.AWAITING_OWNER,
    });
    assertPerf_(
      req.cache.compensationIntegrityByCycleId === undefined &&
        req.cache.compensationByCycleId === undefined,
      'writeCompensationRecord_ clears both caches'
    );

    req.cache.compensationIntegrityByCycleId = {
      C1: { activeCount: 1, actives: [] },
    };
    req.cache.compensationByCycleId = { C1: { rowNumber: 2, object: {} } };
    appendCompensationRecord_({
      'Compensation Record ID': 'REC-2',
      Status: V31_COMP.STATUS.AWAITING_OWNER,
    });
    assertPerf_(
      req.cache.compensationIntegrityByCycleId === undefined &&
        req.cache.compensationByCycleId === undefined,
      'appendCompensationRecord_ clears both caches'
    );
  } finally {
    writeObject_ = originalWrite;
    appendObject_ = originalAppend;
  }
  perfEndRequest_();
}
