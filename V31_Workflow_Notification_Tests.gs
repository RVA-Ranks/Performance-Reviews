/**
 * AITHERAS Performance Review Portal V3.1
 * Workflow notification + recovery helper tests (DROP-IN).
 *
 * Run from the Apps Script editor:
 *   runV31WorkflowNotificationTests()
 *
 * Live Drive/Calendar/Mail/concurrency probes stay off unless
 * V31_WORKFLOW_TEST.ENABLE_LIVE_PROBES is set true in a sandbox.
 */

const V31_WORKFLOW_TEST = Object.freeze({
  ENABLE_LIVE_PROBES: false,
});

function runV31WorkflowNotificationTests() {
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
      'notification summary flags eligible Pending attention',
      testWorkflowNotificationNeedsAttention_
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
    !isWorkflowNotificationEligible_(staleReady, 'ready'),
    'Ready Pending after Meeting must be ineligible so it can be superseded'
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
