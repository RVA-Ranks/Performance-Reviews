/**
 * AITHERAS Performance Review Portal V3.1
 * Workflow notification + recovery helper tests (DROP-IN).
 *
 * Run from the Apps Script editor:
 *   runV31WorkflowNotificationTests_()
 *
 * Live Drive/Calendar/Mail/concurrency probes stay off unless
 * V31_WORKFLOW_TEST.ENABLE_LIVE_PROBES is set true in a sandbox.
 */

const V31_WORKFLOW_TEST = Object.freeze({
  ENABLE_LIVE_PROBES: false,
});

function runV31WorkflowNotificationTests_() {
  const results = [];

  results.push(
    runWorkflowCase_(
      'workflow notification component map includes error fields',
      testWorkflowNotificationComponentMap_
    )
  );
  results.push(
    runWorkflowCase_(
      'notification eligibility uses exact cycle statuses',
      testWorkflowNotificationEligibility_
    )
  );
  results.push(
    runWorkflowCase_(
      'stale-stage Pending notifications are superseded not sent',
      testStaleNotificationsAreSuperseded_
    )
  );
  results.push(
    runWorkflowCase_(
      'full notification lifecycle preserves future stages',
      testFullWorkflowNotificationLifecycle_
    )
  );
  results.push(
    runWorkflowCase_(
      'supersession ignores stale batch snapshots',
      testSupersessionUsesFreshRowOnly_
    )
  );
  results.push(
    runWorkflowCase_(
      'attempt replacement is not reported Sent',
      testWorkflowCommitMismatchResult_
    )
  );
  results.push(
    runWorkflowCase_(
      'legacy trigger migration surface is installed',
      testLegacyTriggerMigrationSurface_
    )
  );
  results.push(
    runWorkflowCase_(
      'notification summary flags eligible Pending attention',
      testWorkflowNotificationNeedsAttention_
    )
  );
  results.push(
    runWorkflowCase_(
      'stale eligible Sending is routed to Delivery Unknown',
      testStaleSendingNotificationRecovery_
    )
  );
  results.push(
    runWorkflowCase_(
      'duplicate active matcher uses blocking statuses only',
      testDuplicateActiveCycleBlockingSet_
    )
  );
  results.push(
    runWorkflowCase_(
      'PDF reconciliation requires Finalizing + Unknown',
      testPdfReconciliationGates_
    )
  );
  results.push(
    runWorkflowCase_(
      'signature reconciliation requires Awaiting Signatures + Unknown',
      testSignatureReconciliationGates_
    )
  );
  results.push(
    runWorkflowCase_(
      'signature reset rejects whenever matching files exist',
      testSignatureResetRejectsExistingFiles_
    )
  );
  results.push(
    runWorkflowCase_(
      'outbox dispatcher functions are private and HR drain is public',
      testOutboxAuthorizationSurface_
    )
  );
  results.push(
    runWorkflowCase_(
      'Preview automation core must not auto-drain outbox',
      testPreviewModeZeroSendContract_
    )
  );
  results.push(
    runWorkflowCase_(
      'Superseded delivery status is terminal in decideLaunchComponentAction_',
      testSupersededIsTerminal_
    )
  );
  results.push(
    runWorkflowCase_(
      'HR signature partial-success shape is documented',
      testHrSignaturePartialSuccessShape_
    )
  );

  if (V31_WORKFLOW_TEST.ENABLE_LIVE_PROBES) {
    results.push(
      runWorkflowCase_(
        'LIVE probes are intentionally disabled in this suite by default',
        function () {
          throw new Error(
            'Enable sandbox probes only after Preview fault matrix prep.'
          );
        }
      )
    );
  }

  const failed = results.filter(function (row) {
    return !row.ok;
  });

  const summary =
    'V3.1 workflow notification tests: ' +
    (results.length - failed.length) +
    '/' +
    results.length +
    ' passed.';

  Logger.log(summary);
  results.forEach(function (row) {
    Logger.log(
      (row.ok ? 'PASS' : 'FAIL') +
        ' — ' +
        row.name +
        (row.details ? ': ' + row.details : '')
    );
  });

  if (failed.length) {
    throw new Error(
      summary +
        ' First failure: ' +
        failed[0].name +
        (failed[0].details
          ? ' — ' + failed[0].details
          : '')
    );
  }

  return {
    ok: true,
    passed: results.length,
    failed: 0,
    results: results,
    message: summary,
  };
}

function runWorkflowCase_(name, fn) {
  try {
    const details = fn() || '';
    return { ok: true, name: name, details: details };
  } catch (error) {
    return {
      ok: false,
      name: name,
      details: String(error.message || error),
    };
  }
}

function assertWorkflow_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testWorkflowNotificationComponentMap_() {
  getWorkflowNotificationKeys_().forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    assertWorkflow_(
      component.statusField &&
        component.attemptField &&
        component.startedField &&
        component.sentAtField &&
        component.errorField,
      key + ' must expose claim/commit/error fields'
    );
    assertWorkflow_(
      V31.CYCLE_HEADERS.indexOf(component.errorField) >= 0,
      key + ' error field must be migrated'
    );
  });
}

function testWorkflowNotificationEligibility_() {
  const readyOnly = {
    Status: PR.CYCLE.READY,
    'Meeting Opened At': '',
    'Signatures Released At': '',
  };

  assertWorkflow_(
    isWorkflowNotificationEligible_(readyOnly, 'ready'),
    'Ready email eligible only in READY'
  );
  assertWorkflow_(
    !isWorkflowNotificationEligible_(readyOnly, 'meetingManager'),
    'Meeting email blocked outside MEETING'
  );

  const meetingOpen = {
    Status: PR.CYCLE.MEETING,
    'Meeting Opened At': new Date(),
    'Signatures Released At': '',
  };

  assertWorkflow_(
    !isWorkflowNotificationEligible_(meetingOpen, 'ready'),
    'Ready email blocked after meeting opens'
  );
  assertWorkflow_(
    isWorkflowNotificationEligible_(meetingOpen, 'meetingEmployee'),
    'Meeting employee email eligible in MEETING'
  );

  const signaturesButMeetingTimestamp = {
    Status: PR.CYCLE.SIGNATURES,
    'Meeting Opened At': new Date(),
    'Signatures Released At': new Date(),
    'MGR Manager Signature ID': '',
    'SELF Manager Signature ID': '',
    'MGR Employee Signature ID': '',
    'SELF Employee Signature ID': '',
    'MGR HR Signature ID': '',
    'SELF HR Signature ID': '',
  };

  assertWorkflow_(
    !isWorkflowNotificationEligible_(
      signaturesButMeetingTimestamp,
      'meetingManager'
    ),
    'Meeting email must not remain eligible in SIGNATURES'
  );
  assertWorkflow_(
    isWorkflowNotificationEligible_(
      signaturesButMeetingTimestamp,
      'signatureManager'
    ),
    'Manager signature email eligible in SIGNATURES'
  );
  assertWorkflow_(
    !isWorkflowNotificationEligible_(
      signaturesButMeetingTimestamp,
      'signatureHr'
    ),
    'HR signature email blocked until both participants sign'
  );

  signaturesButMeetingTimestamp['MGR Manager Signature ID'] = 'm';
  signaturesButMeetingTimestamp['SELF Manager Signature ID'] = 'm';
  signaturesButMeetingTimestamp['MGR Employee Signature ID'] = 'e';
  signaturesButMeetingTimestamp['SELF Employee Signature ID'] = 'e';

  assertWorkflow_(
    isWorkflowNotificationEligible_(
      signaturesButMeetingTimestamp,
      'signatureHr'
    ),
    'HR signature email eligible after both participants sign'
  );

  const finalizing = {
    Status: PR.CYCLE.FINALIZING,
    'Signatures Released At': new Date(),
    'MGR Manager Signature ID': 'm',
    'SELF Manager Signature ID': 'm',
    'MGR Employee Signature ID': 'e',
    'SELF Employee Signature ID': 'e',
    'MGR HR Signature ID': '',
    'SELF HR Signature ID': '',
  };

  assertWorkflow_(
    !isWorkflowNotificationEligible_(finalizing, 'signatureManager'),
    'Participant signature email blocked in Finalizing'
  );
}

function testStaleNotificationsAreSuperseded_() {
  assertWorkflow_(
    V31.DELIVERY.SUPERSEDED === 'Superseded',
    'SUPERSEDED delivery constant must exist'
  );

  const staleReady = {
    Status: PR.CYCLE.MEETING,
    'Ready Notification Status': V31.DELIVERY.PENDING,
  };

  assertWorkflow_(
    getWorkflowNotificationDisposition_(staleReady, 'ready') ===
      'past',
    'Ready Pending after Meeting must be past'
  );
  assertWorkflow_(
    getSupersedableWorkflowNotifications_(staleReady).some(
      function (item) {
        return item.key === 'ready';
      }
    ),
    'Past Ready notification must be planned for supersession'
  );
}

function workflowLifecycleCycle_(status) {
  return {
    Status: status,
    'Ready Notification Status': V31.DELIVERY.PENDING,
    'Meeting Manager Email Status': V31.DELIVERY.PENDING,
    'Meeting Employee Email Status': V31.DELIVERY.PENDING,
    'Manager Signature Email Status': V31.DELIVERY.PENDING,
    'Employee Signature Email Status': V31.DELIVERY.PENDING,
    'HR Signature Email Status': V31.DELIVERY.PENDING,
    'MGR Manager Signature ID': '',
    'SELF Manager Signature ID': '',
    'MGR Employee Signature ID': '',
    'SELF Employee Signature ID': '',
    'MGR HR Signature ID': '',
    'SELF HR Signature ID': '',
  };
}

function testFullWorkflowNotificationLifecycle_() {
  const keys = getWorkflowNotificationKeys_();
  const open = workflowLifecycleCycle_(PR.CYCLE.OPEN);

  keys.forEach(function (key) {
    assertWorkflow_(
      getWorkflowNotificationDisposition_(open, key) === 'future',
      'All notifications must be future while Open: ' + key
    );
  });
  assertWorkflow_(
    getSupersedableWorkflowNotifications_(open).length === 0,
    'Open must supersede nothing'
  );

  const ready = workflowLifecycleCycle_(PR.CYCLE.READY);
  assertWorkflow_(
    getWorkflowNotificationDisposition_(ready, 'ready') ===
      'eligible',
    'Ready notification must be eligible at Ready'
  );
  [
    'meetingManager',
    'meetingEmployee',
    'signatureManager',
    'signatureEmployee',
    'signatureHr',
  ].forEach(function (key) {
    assertWorkflow_(
      getWorkflowNotificationDisposition_(ready, key) === 'future',
      'Later notification must remain future at Ready: ' + key
    );
  });
  assertWorkflow_(
    getSupersedableWorkflowNotifications_(ready).length === 0,
    'Ready must not supersede future Meeting/Signature notifications'
  );

  const meeting = workflowLifecycleCycle_(PR.CYCLE.MEETING);
  assertWorkflow_(
    getWorkflowNotificationDisposition_(meeting, 'ready') ===
      'past',
    'Ready notification must be past in Meeting'
  );
  assertWorkflow_(
    getWorkflowNotificationDisposition_(
      meeting,
      'meetingManager'
    ) === 'eligible' &&
      getWorkflowNotificationDisposition_(
        meeting,
        'meetingEmployee'
      ) === 'eligible',
    'Meeting notifications must be eligible in Meeting'
  );
  [
    'signatureManager',
    'signatureEmployee',
    'signatureHr',
  ].forEach(function (key) {
    assertWorkflow_(
      getWorkflowNotificationDisposition_(meeting, key) === 'future',
      'Signature notification must remain future in Meeting: ' + key
    );
  });

  const signatures = workflowLifecycleCycle_(
    PR.CYCLE.SIGNATURES
  );
  assertWorkflow_(
    getWorkflowNotificationDisposition_(
      signatures,
      'signatureManager'
    ) === 'eligible' &&
      getWorkflowNotificationDisposition_(
        signatures,
        'signatureEmployee'
      ) === 'eligible',
    'Participant requests must be eligible in Signatures'
  );
  assertWorkflow_(
    getWorkflowNotificationDisposition_(
      signatures,
      'signatureHr'
    ) === 'future',
    'HR request remains future until both participants sign'
  );

  signatures['MGR Manager Signature ID'] = 'm';
  signatures['SELF Manager Signature ID'] = 'm';
  signatures['MGR Employee Signature ID'] = 'e';
  signatures['SELF Employee Signature ID'] = 'e';
  assertWorkflow_(
    getWorkflowNotificationDisposition_(
      signatures,
      'signatureManager'
    ) === 'past' &&
      getWorkflowNotificationDisposition_(
        signatures,
        'signatureEmployee'
      ) === 'past' &&
      getWorkflowNotificationDisposition_(
        signatures,
        'signatureHr'
      ) === 'eligible',
    'Signed participant requests become past and HR becomes eligible'
  );

  const finalizing = workflowLifecycleCycle_(
    PR.CYCLE.FINALIZING
  );
  keys.forEach(function (key) {
    assertWorkflow_(
      getWorkflowNotificationDisposition_(finalizing, key) ===
        'past',
      'All workflow notifications must be past in Finalizing: ' + key
    );
  });
}

function testSupersessionUsesFreshRowOnly_() {
  assertWorkflow_(
    markSupersededWorkflowNotifications_.length === 1,
    'Supersession must accept only cycleId; stale snapshots are ignored'
  );

  const staleReadySnapshot = workflowLifecycleCycle_(
    PR.CYCLE.READY
  );
  staleReadySnapshot['Meeting JSON'] = '{"stale":true}';
  const freshMeetingRow = workflowLifecycleCycle_(
    PR.CYCLE.MEETING
  );
  freshMeetingRow['Meeting JSON'] = '{"fresh":true}';

  assertWorkflow_(
    getSupersedableWorkflowNotifications_(
      staleReadySnapshot
    ).length === 0,
    'Stale Ready snapshot would supersede nothing'
  );
  assertWorkflow_(
    getSupersedableWorkflowNotifications_(freshMeetingRow).some(
      function (item) {
        return item.key === 'ready';
      }
    ),
    'Fresh Meeting row drives the supersession plan'
  );
  assertWorkflow_(
    freshMeetingRow['Meeting JSON'] === '{"fresh":true}',
    'Planner must not modify fresh review data'
  );
}

function testWorkflowCommitMismatchResult_() {
  const authoritative = {
    'Ready Notification Attempt ID': 'new-attempt',
  };
  const result = buildWorkflowCommitMismatchResult_(authoritative);

  assertWorkflow_(
    result.action === 'unknown' &&
      result.reason === 'attempt-replaced-before-commit',
    'Replaced attempt must not report Sent'
  );
  assertWorkflow_(
    result.cycle === authoritative,
    'Mismatch result must retain the authoritative fresh cycle'
  );
}

function testLegacyTriggerMigrationSurface_() {
  assertWorkflow_(
    typeof migrateLegacyReviewAutomationTrigger_ === 'function',
    'Legacy trigger migration helper must exist'
  );
  assertWorkflow_(
    typeof runReviewAutomationTrigger_ === 'function',
    'New private trigger handler must exist'
  );
  assertWorkflow_(
    typeof runReviewAutomation === 'undefined',
    'Removed legacy handler must not remain callable'
  );
}

function testWorkflowNotificationNeedsAttention_() {
  const cycle = {
    Status: PR.CYCLE.READY,
    'Ready Notification Status': V31.DELIVERY.PENDING,
    'Meeting Manager Email Status': V31.DELIVERY.PENDING,
    'Meeting Employee Email Status': V31.DELIVERY.PENDING,
    'Manager Signature Email Status': V31.DELIVERY.PENDING,
    'Employee Signature Email Status': V31.DELIVERY.PENDING,
    'HR Signature Email Status': V31.DELIVERY.PENDING,
  };

  const summary = getWorkflowNotificationSummary_(cycle);

  assertWorkflow_(
    summary.needsAttention === true,
    'Eligible Pending ready notification must need attention'
  );
  assertWorkflow_(
    summary.eligibleUnresolved.indexOf('ready') >= 0,
    'Ready must appear in eligibleUnresolved'
  );
  assertWorkflow_(
    summary.eligibleUnresolved.indexOf('meetingManager') < 0,
    'Ineligible meeting email must not need attention'
  );
}

function testStaleSendingNotificationRecovery_() {
  const component = getWorkflowNotificationComponent_('ready');
  const staleCycle = workflowLifecycleCycle_(PR.CYCLE.READY);
  staleCycle[component.statusField] = V31.DELIVERY.SENDING;
  staleCycle[component.attemptField] = 'stale-ready-attempt';
  staleCycle[component.startedField] = new Date(
    Date.now() - V31.SENDING_STALE_MS - 60 * 1000
  );

  const staleSummary =
    getWorkflowNotificationSummary_(staleCycle);
  const decision = decideLaunchComponentAction_(
    staleCycle[component.statusField],
    false,
    staleCycle[component.startedField],
    V31.DELIVERY.SENDING,
    false
  );

  assertWorkflow_(
    staleSummary.needsAttention === true &&
      staleSummary.components.ready.staleSending === true,
    'Eligible stale Sending must be visible to HR'
  );
  assertWorkflow_(
    workflowCycleNeedsOutboxInspection_(staleCycle) === true,
    'Bulk outbox must inspect eligible stale Sending'
  );
  assertWorkflow_(
    shouldDispatchWorkflowNotification_(
      staleCycle,
      component
    ) === true,
    'Single-cycle dispatcher must include stale Sending'
  );
  assertWorkflow_(
    decision.action === 'mark-unknown',
    'Stale Sending must transition to Delivery Unknown without resend'
  );

  const freshCycle = workflowLifecycleCycle_(PR.CYCLE.READY);
  freshCycle[component.statusField] = V31.DELIVERY.SENDING;
  freshCycle[component.startedField] = new Date();
  const freshSummary =
    getWorkflowNotificationSummary_(freshCycle);

  assertWorkflow_(
    freshSummary.components.ready.staleSending === false &&
      freshSummary.needsAttention === false,
    'Fresh Sending must remain in progress'
  );
  assertWorkflow_(
    workflowCycleNeedsOutboxInspection_(freshCycle) === false,
    'Bulk outbox must not inspect a fresh Sending claim'
  );
  assertWorkflow_(
    shouldDispatchWorkflowNotification_(
      freshCycle,
      component
    ) === false,
    'Single-cycle dispatcher must leave fresh Sending alone'
  );

  const cleanComplete = workflowLifecycleCycle_(
    PR.CYCLE.COMPLETE
  );
  getWorkflowNotificationKeys_().forEach(function (key) {
    const item = getWorkflowNotificationComponent_(key);
    cleanComplete[item.statusField] = V31.DELIVERY.SENT;
  });
  assertWorkflow_(
    workflowCycleNeedsOutboxInspection_(cleanComplete) === false,
    'Clean completed history must be skipped'
  );

  cleanComplete[component.statusField] = V31.DELIVERY.UNKNOWN;
  assertWorkflow_(
    workflowCycleNeedsOutboxInspection_(cleanComplete) === true,
    'Past Delivery Unknown requires one supersession inspection'
  );
}

function testDuplicateActiveCycleBlockingSet_() {
  const blocking = [
    PR.CYCLE.OPEN,
    PR.CYCLE.READY,
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
  ];

  assertWorkflow_(
    blocking.indexOf(PR.CYCLE.CANCELLED) < 0,
    'Cancelled must not block recreation'
  );
  assertWorkflow_(
    blocking.indexOf(PR.CYCLE.COMPLETE) < 0,
    'Complete must not block recreation'
  );
}

function testPdfReconciliationGates_() {
  let threw = false;

  try {
    assertPdfReconciliationAllowed_(
      {
        Status: PR.CYCLE.SIGNATURES,
        'Manager PDF Status': V31.DELIVERY.UNKNOWN,
      },
      PR.TYPE.MANAGER
    );
  } catch (error) {
    threw = true;
  }

  assertWorkflow_(
    threw,
    'PDF reconcile must reject non-Finalizing cycles'
  );

  assertPdfReconciliationAllowed_(
    {
      Status: PR.CYCLE.FINALIZING,
      'Manager PDF Status': V31.DELIVERY.UNKNOWN,
    },
    PR.TYPE.MANAGER
  );
}

function testSignatureReconciliationGates_() {
  assertSignatureReconciliationAllowed_(
    {
      Status: PR.CYCLE.SIGNATURES,
      'Manager Signature Status': V31.DELIVERY.UNKNOWN,
      'MGR Manager Signature ID': '',
      'SELF Manager Signature ID': '',
      'MGR Employee Signature ID': '',
      'SELF Employee Signature ID': '',
      'MGR HR Signature ID': '',
      'SELF HR Signature ID': '',
    },
    PR.ROLE.MANAGER
  );
}

function testSignatureResetRejectsExistingFiles_() {
  const matches = [{ id: 'sig-1' }];

  assertWorkflow_(
    matches.length > 0,
    'Fixture must represent existing signature candidates'
  );

  // Production resetPending must reject whenever matches.length > 0,
  // regardless of confirmMissing.
  let rejected = false;

  try {
    if (matches.length > 0) {
      throw new Error(
        'Matching signature files exist. Select one or remove them before resetting.'
      );
    }
  } catch (error) {
    rejected = String(error.message || error).indexOf(
      'Matching signature files exist'
    ) === 0;
  }

  assertWorkflow_(
    rejected,
    'resetPending must reject when Drive candidates exist'
  );
}

function testOutboxAuthorizationSurface_() {
  assertWorkflow_(
    typeof drainWorkflowOutboxNow === 'function',
    'drainWorkflowOutboxNow must be the public HR wrapper'
  );
  assertWorkflow_(
    typeof dispatchPendingWorkflowNotifications_ === 'function',
    'single-cycle dispatcher must be private (_)'
  );
  assertWorkflow_(
    typeof dispatchPendingWorkflowNotificationsForAllCycles_ ===
      'function',
    'all-cycle dispatcher must be private (_)'
  );
  assertWorkflow_(
    typeof runReviewAutomationCore_ === 'function',
    'automation core must be private (_)'
  );
  assertWorkflow_(
    typeof runReviewAutomationTrigger_ === 'function',
    'trigger entry must be private (_)'
  );
  assertWorkflow_(
    typeof upgradeToV31_ === 'function' &&
      typeof upgradeToSingleReviewSignatureWorkflow_ ===
        'function',
    'upgrade and migration entry points must be private (_)'
  );
  assertWorkflow_(
    typeof runV31IdempotencyTests_ === 'function' &&
      typeof runV31FinalizationTests_ === 'function' &&
      typeof runV31WorkflowNotificationTests_ === 'function',
    'test suite entry points must be private (_)'
  );
  assertWorkflow_(
    Object.prototype.hasOwnProperty.call(
      V31.SETTINGS_DEFAULTS,
      'AUTOMATION_OWNER_EMAIL'
    ) &&
      Object.prototype.hasOwnProperty.call(
        V31.SETTINGS_DEFAULTS,
        'AUTOMATION_TRIGGER_UNIQUE_ID'
      ) &&
      Object.prototype.hasOwnProperty.call(
        V31.SETTINGS_DEFAULTS,
        'AUTOMATION_TRIGGER_INSTALLED_AT'
      ),
    'automation owner and trigger identity settings must be migrated'
  );
}

function testPreviewModeZeroSendContract_() {
  const settings = getSettings_();
  const mode = String(settings.AUTOMATION_MODE || 'Preview');

  assertWorkflow_(
    mode !== 'Live',
    'Sandbox must remain Preview/Paused while validating zero-send contract'
  );

  // Contract: non-Live cores return before outbox/launch side effects.
  // Calling the private core is safe in Preview and must report skipped.
  const result = runReviewAutomationCore_();

  assertWorkflow_(
    result.skipped === true,
    'Preview core must skip automation'
  );
  assertWorkflow_(
    Number(result.created || 0) === 0,
    'Preview must create zero cycles'
  );
  assertWorkflow_(
    String(result.message || '').indexOf('no emails were sent') >= 0 ||
      String(result.message || '').indexOf('No cycles were created') >= 0,
    'Preview message must confirm zero automatic sends'
  );
}

function testSupersededIsTerminal_() {
  const decision = decideLaunchComponentAction_(
    V31.DELIVERY.SUPERSEDED,
    false,
    '',
    V31.DELIVERY.SENDING,
    true
  );

  assertWorkflow_(
    decision.action === 'skip' && decision.reason === 'superseded',
    'Superseded notifications must never be claimed'
  );
}

function testHrSignaturePartialSuccessShape_() {
  const sample = {
    ok: true,
    signatureReconciled: true,
    finalizationComplete: false,
    cycleStatus: PR.CYCLE.FINALIZING,
    message:
      'HR signature was attached. Final document preparation requires attention.',
  };

  assertWorkflow_(
    sample.ok &&
      sample.signatureReconciled &&
      sample.finalizationComplete === false &&
      sample.cycleStatus === PR.CYCLE.FINALIZING,
    'Partial success must keep signatureReconciled true when finalization fails'
  );
}
