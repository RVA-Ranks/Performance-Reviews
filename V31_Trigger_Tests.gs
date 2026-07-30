/**
 * Delivery A transactional trigger tests.
 *
 * Run from the Apps Script editor:
 *   runV31TriggerTests_()
 *
 * These tests use in-memory trigger/settings services. True trigger creation
 * and concurrency remain explicitly gated on Daniel's sandbox evidence.
 */

function runV31TriggerTests_() {
  return runStructuredV31Suite_('V31 Trigger Tests', [
    triggerTestCase_(
      'Preview to Live creates before deleting the old trigger',
      testTransactionalTriggerSuccess_
    ),
    triggerTestCase_(
      'Trigger creation failure preserves old trigger and mode',
      testTriggerCreationFailureRollback_
    ),
    triggerTestCase_(
      'Metadata persistence failure rolls back replacement',
      testTriggerMetadataFailureRollback_
    ),
    triggerTestCase_(
      'Live persistence failure restores prior state',
      testTriggerLivePersistenceFailureRollback_
    ),
    triggerTestCase_(
      'Old-trigger cleanup failure returns partial success',
      testTriggerCleanupPartialSuccess_
    ),
    triggerTestCase_(
      'Fault after creation preserves existing trigger',
      testTriggerFaultPreservesExistingTrigger_
    ),
    {
      name: 'Concurrent Live enable serializes through Apps Script user lock',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    triggerTestCase_(
      'Non-owner trigger installation is rejected',
      testTriggerOwnerRejected_
    ),
    triggerTestCase_(
      'Legacy trigger is removed only after replacement verification',
      testLegacyTriggerTransactionalMigration_
    ),
    triggerTestCase_(
      'Stored trigger ID mismatch is unhealthy',
      testStoredTriggerMismatch_
    ),
    triggerTestCase_(
      'Live without a trigger is unhealthy',
      testLiveWithoutTriggerHealth_
    ),
    triggerTestCase_(
      'Preview with a trigger is unhealthy',
      testPreviewWithTriggerHealth_
    ),
    triggerTestCase_(
      'Fault injection is prohibited in Production',
      testProductionFaultInjectionRejected_
    ),
    triggerTestCase_(
      'Fault injection requires matching Sandbox point',
      testSandboxFaultInjectionDecision_
    ),
    triggerTestCase_(
      'Health separates verified facts from expected schedule',
      testTriggerHealthLabels_
    ),
  ]);
}

function triggerTestCase_(name, fn) {
  return {
    name: name,
    severity: 'Blocking',
    run: fn,
  };
}

function runStructuredV31Suite_(suite, cases) {
  const started = Date.now();
  const results = (cases || []).map(function (testCase) {
    if (testCase.skip) {
      return {
        name: testCase.name,
        passed: false,
        skipped: true,
        severity: testCase.severity || 'Major',
        message: testCase.skipMessage || 'Skipped',
        details: {},
      };
    }

    try {
      const details = testCase.run() || {};
      return {
        name: testCase.name,
        passed: true,
        skipped: false,
        severity: testCase.severity || 'Major',
        message: 'Passed',
        details: details,
      };
    } catch (error) {
      return {
        name: testCase.name,
        passed: false,
        skipped: false,
        severity: testCase.severity || 'Major',
        message: String(error.message || error),
        details: {},
      };
    }
  });
  const failedRows = results.filter(function (row) {
    return !row.passed && !row.skipped;
  });
  const skippedRows = results.filter(function (row) {
    return row.skipped;
  });
  const report = {
    suite: suite,
    passed: results.length - failedRows.length - skippedRows.length,
    failed: failedRows.length,
    skipped: skippedRows.length,
    durationMs: Date.now() - started,
    blocking: failedRows
      .filter(function (row) {
        return row.severity === 'Blocking';
      })
      .map(function (row) {
        return row.name;
      }),
    warnings: skippedRows.map(function (row) {
      return row.name + ': ' + row.message;
    }),
    results: results,
  };

  Logger.log(JSON.stringify(report));
  return report;
}

function assertTriggerTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fakeAutomationTrigger_(id, handler) {
  return {
    getUniqueId: function () {
      return id;
    },
    getHandlerFunction: function () {
      return handler || 'runReviewAutomationTrigger_';
    },
  };
}

function createTriggerTestServices_(options) {
  const opts = options || {};
  const state = {
    settings: Object.assign(
      {
        AUTOMATION_MODE: 'Preview',
        AUTOMATION_OWNER_EMAIL: 'owner@aitheras.com',
        AUTOMATION_TRIGGER_HOUR: '8',
        AUTOMATION_TRIGGER_UNIQUE_ID: opts.oldId || '',
        AUTOMATION_TRIGGER_INSTALLED_AT: opts.oldId
          ? '2026-01-01T00:00:00.000Z'
          : '',
      },
      opts.settings || {}
    ),
    triggers: (opts.triggers || []).slice(),
    persistCalls: 0,
    events: [],
  };
  let persistFailureUsed = false;

  return {
    state: state,
    services: {
      readSettings: function () {
        return Object.assign({}, state.settings);
      },
      effectiveEmail: function () {
        return opts.effectiveEmail || 'owner@aitheras.com';
      },
      listTriggers: function () {
        return state.triggers.slice();
      },
      createTrigger: function () {
        state.events.push('create');
        if (opts.failCreate) {
          throw new Error('Simulated trigger creation failure.');
        }
        const trigger = fakeAutomationTrigger_(
          opts.replacementId || 'replacement-trigger'
        );
        state.triggers.push(trigger);
        return trigger;
      },
      deleteTrigger: function (trigger) {
        const id = getTriggerUniqueId_(trigger);
        state.events.push('delete:' + id);
        if (
          (opts.failDeleteIds || []).indexOf(id) >= 0
        ) {
          throw new Error('Simulated trigger deletion failure: ' + id);
        }
        state.triggers = state.triggers.filter(function (item) {
          return getTriggerUniqueId_(item) !== id;
        });
      },
      persist: function (values) {
        state.persistCalls++;
        state.events.push(
          'persist:' + Object.keys(values).sort().join(',')
        );
        const shouldFail =
          !persistFailureUsed &&
          state.persistCalls === Number(opts.failPersistCall || 0);

        if (shouldFail && !opts.failPersistAfterWrite) {
          persistFailureUsed = true;
          throw new Error('Simulated settings persistence failure.');
        }

        Object.keys(values).forEach(function (key) {
          state.settings[key] = String(values[key]);
        });

        if (shouldFail) {
          persistFailureUsed = true;
          throw new Error('Simulated settings persistence failure.');
        }
      },
      nowIso: function () {
        return '2026-07-30T20:00:00.000Z';
      },
      fault: function (point) {
        if (opts.faultAt === point) {
          throw new Error('Simulated fault at ' + point);
        }
      },
      timeZone: function () {
        return 'America/New_York';
      },
    },
  };
}

function testTransactionalTriggerSuccess_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
  });
  const result = installReviewAutomationTriggerSafely_(
    { actorEmail: 'owner@aitheras.com' },
    fixture.services
  );

  assertTriggerTest_(result.ok && !result.partial, 'Expected full success.');
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_MODE === 'Live',
    'Live mode must be persisted.'
  );
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_TRIGGER_UNIQUE_ID ===
      'replacement-trigger',
    'Stored trigger ID must be the replacement.'
  );
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_TRIGGER_INSTALLED_AT ===
      '2026-07-30T20:00:00.000Z',
    'Installed timestamp must reflect replacement creation.'
  );
  assertTriggerTest_(
    fixture.state.events.indexOf('delete:old-trigger') >
      fixture.state.events.indexOf('persist:AUTOMATION_MODE'),
    'Old trigger must be deleted only after Live persistence.'
  );
}

function testTriggerCreationFailureRollback_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
    failCreate: true,
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(!result.ok, 'Creation failure must fail activation.');
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_MODE === 'Preview',
    'Prior mode must remain Preview.'
  );
  assertTriggerTest_(
    fixture.state.triggers.some(function (item) {
      return getTriggerUniqueId_(item) === 'old-trigger';
    }),
    'Old trigger must remain.'
  );
}

function testTriggerMetadataFailureRollback_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
    failPersistCall: 1,
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(!result.ok, 'Metadata failure must fail activation.');
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_TRIGGER_UNIQUE_ID ===
      'old-trigger',
    'Prior trigger metadata must be restored.'
  );
  assertTriggerTest_(
    fixture.state.triggers.length === 1 &&
      getTriggerUniqueId_(fixture.state.triggers[0]) ===
        'old-trigger',
    'Replacement must be removed and old trigger retained.'
  );
}

function testTriggerLivePersistenceFailureRollback_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
    failPersistCall: 2,
    failPersistAfterWrite: true,
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(!result.ok, 'Live persistence failure must fail.');
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_MODE === 'Preview',
    'Prior mode must be restored after partial write.'
  );
  assertTriggerTest_(
    fixture.state.settings.AUTOMATION_TRIGGER_UNIQUE_ID ===
      'old-trigger',
    'Prior trigger ID must be restored.'
  );
}

function testTriggerCleanupPartialSuccess_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
    failDeleteIds: ['old-trigger'],
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(
    result.ok && result.partial && result.newTriggerActive,
    'Cleanup failure must return partial success with active replacement.'
  );
  assertTriggerTest_(
    result.failedRemovalIds[0] === 'old-trigger',
    'Failed old trigger ID must be reported.'
  );
}

function testTriggerFaultPreservesExistingTrigger_() {
  const old = fakeAutomationTrigger_('old-trigger');
  const fixture = createTriggerTestServices_({
    oldId: 'old-trigger',
    triggers: [old],
    faultAt: 'AFTER_TRIGGER_CREATION',
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(!result.ok, 'Injected fault must stop activation.');
  assertTriggerTest_(
    fixture.state.triggers.length === 1 &&
      getTriggerUniqueId_(fixture.state.triggers[0]) ===
        'old-trigger',
    'Existing trigger must survive injected fault.'
  );
}

function testTriggerOwnerRejected_() {
  const fixture = createTriggerTestServices_({
    effectiveEmail: 'other@aitheras.com',
  });
  let rejected = false;

  try {
    installReviewAutomationTriggerSafely_({}, fixture.services);
  } catch (error) {
    rejected =
      String(error.message || error).indexOf(
        'designated automation owner'
      ) >= 0;
  }

  assertTriggerTest_(rejected, 'Non-owner must be rejected.');
  assertTriggerTest_(
    fixture.state.triggers.length === 0,
    'Non-owner rejection must create no trigger.'
  );
}

function testLegacyTriggerTransactionalMigration_() {
  const legacy = fakeAutomationTrigger_(
    'legacy-trigger',
    'runReviewAutomation'
  );
  const fixture = createTriggerTestServices_({
    oldId: 'legacy-trigger',
    triggers: [legacy],
  });
  const result = installReviewAutomationTriggerSafely_(
    {},
    fixture.services
  );

  assertTriggerTest_(result.ok, 'Migration must succeed.');
  assertTriggerTest_(
    fixture.state.events.indexOf('delete:legacy-trigger') >
      fixture.state.events.indexOf('persist:AUTOMATION_MODE'),
    'Legacy trigger must remain until replacement is committed.'
  );
}

function testStoredTriggerMismatch_() {
  const stored = verifyStoredAutomationTrigger_(
    { AUTOMATION_TRIGGER_UNIQUE_ID: 'stored-id' },
    [fakeAutomationTrigger_('different-id')]
  );
  assertTriggerTest_(!stored, 'Mismatched trigger must not verify.');
}

function testLiveWithoutTriggerHealth_() {
  const health = buildAutomationTriggerHealth_(
    {
      AUTOMATION_MODE: 'Live',
      AUTOMATION_OWNER_EMAIL: 'owner@aitheras.com',
      AUTOMATION_TRIGGER_UNIQUE_ID: 'missing',
      AUTOMATION_TRIGGER_HOUR: '8',
    },
    [],
    'owner@aitheras.com',
    'America/New_York'
  );
  assertTriggerTest_(!health.healthy, 'Live without trigger must be unhealthy.');
}

function testPreviewWithTriggerHealth_() {
  const health = buildAutomationTriggerHealth_(
    {
      AUTOMATION_MODE: 'Preview',
      AUTOMATION_OWNER_EMAIL: 'owner@aitheras.com',
      AUTOMATION_TRIGGER_UNIQUE_ID: '',
      AUTOMATION_TRIGGER_HOUR: '8',
    },
    [fakeAutomationTrigger_('unexpected')],
    'owner@aitheras.com',
    'America/New_York'
  );
  assertTriggerTest_(
    !health.healthy,
    'Preview with owner-visible trigger must be unhealthy.'
  );
}

function testProductionFaultInjectionRejected_() {
  const decision = decideTriggerFault_(
    {
      ENVIRONMENT: 'Production',
      ENABLE_FAULT_INJECTION: 'true',
      FAULT_POINT: 'AFTER_TRIGGER_CREATION',
    },
    'AFTER_TRIGGER_CREATION'
  );
  assertTriggerTest_(
    decision.prohibited && !decision.inject,
    'Production fault injection must be prohibited.'
  );
}

function testSandboxFaultInjectionDecision_() {
  const decision = decideTriggerFault_(
    {
      ENVIRONMENT: 'Sandbox',
      ENABLE_FAULT_INJECTION: 'true',
      FAULT_POINT: 'AFTER_TRIGGER_CREATION',
    },
    'AFTER_TRIGGER_CREATION'
  );
  assertTriggerTest_(
    !decision.prohibited && decision.inject,
    'Matching Sandbox fault must be injectable.'
  );
}

function testTriggerHealthLabels_() {
  const trigger = fakeAutomationTrigger_('stored-id');
  const health = buildAutomationTriggerHealth_(
    {
      AUTOMATION_MODE: 'Live',
      AUTOMATION_OWNER_EMAIL: 'owner@aitheras.com',
      AUTOMATION_TRIGGER_UNIQUE_ID: 'stored-id',
      AUTOMATION_TRIGGER_INSTALLED_AT:
        '2026-07-30T20:00:00.000Z',
      AUTOMATION_TRIGGER_HOUR: '8',
    },
    [trigger],
    'owner@aitheras.com',
    'America/New_York'
  );

  assertTriggerTest_(health.healthy, 'Matching trigger must be healthy.');
  assertTriggerTest_(
    health.handlerName === 'runReviewAutomationTrigger_',
    'Handler must be a verified fact.'
  );
  assertTriggerTest_(
    health.expectedSchedule.indexOf('America/New_York') >= 0,
    'Expected schedule must be labeled separately.'
  );
  assertTriggerTest_(
    health.warning.indexOf('other accounts') >= 0,
    'Cross-account visibility limitation must be disclosed.'
  );
}
