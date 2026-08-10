/**
 * Interactive performance acceptance checks (pure / lightweight).
 *
 * Run: runV31PerformanceTests_()
 */

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
  perfEndRequest_();
}

function testV31BootstrapDoesNotDeclareEnsureDependency_() {
  const source = String(getV31BootstrapData_);
  assertPerf_(
    source.indexOf('ensureV31DataModel_') < 0,
    'getV31BootstrapData_ must not call ensureV31DataModel_ on interactive path'
  );
}
