/**
 * Delivery C commit 1 pure system-alert tests.
 *
 * Run from Apps Script editor: runV31SystemAlertTests_()
 * No Mail, Drive, Calendar, or row creation occurs in the automatic suite.
 */
function runV31SystemAlertTests_() {
  const cases = [
    ['exact append-only alert headers', testSystemAlertHeaders_],
    ['unresolved recurrence increments dedupe count', testSystemAlertDedupeCount_],
    ['resolved recurrence requires a new lifecycle', testResolvedAlertRecurrenceLifecycle_],
    ['system recovery resolution fields are authoritative', testSystemAlertAutoResolutionShape_],
    ['manual resolution policy enforces auth and reason', testManualAlertResolutionPolicy_],
    ['alert recipient must be an AITHERAS address', testSystemAlertRecipientPolicy_],
    ['send ambiguity becomes Delivery Unknown', testSystemAlertSendAmbiguity_],
    ['Delivery Unknown resend requires explicit selection', testSystemAlertUnknownResendGate_],
    ['Preview and Paused automatic drains are blocked', testSystemAlertPreviewAutoBlocked_],
    ['explicit Preview manual send gate is allowed', testSystemAlertPreviewManualGate_],
    ['recovery token must match exactly', testSystemAlertExactTokenGate_],
    ['recipient-specific workflow plan is isolated', testWorkflowRecipientIsolation_],
    ['1000-cycle in-memory planner selects only active unresolved', testSystemAlertPlannerBenchmark_],
    ['Sent recurrence does not requeue email', testSentAlertRecurrencePreservesStatus_],
    ['fresh Sending resolution is rejected', testFreshSendingAlertResolutionBlocked_],
  ];
  const results = cases.map(function (entry) {
    try {
      entry[1]();
      return { name: entry[0], passed: true };
    } catch (error) {
      return {
        name: entry[0],
        passed: false,
        error: String(error.message || error),
      };
    }
  });
  [
    'Requires Daniel Sandbox: sheet-backed 100 cycles / 25 active / 10 unresolved',
    'Requires Daniel Sandbox: sheet-backed protected-header migration',
    'Requires Daniel Sandbox: optional sheet-backed 1000-cycle timing',
  ].forEach(function (name) {
    results.push({
      name: name,
      skipped: true,
      skipMessage: 'Requires Daniel Sandbox',
    });
  });
  const failed = results.filter(function (result) {
    return !result.skipped && result.passed !== true;
  });
  const skipped = results.filter(function (result) {
    return result.skipped === true;
  });
  const passed = results.filter(function (result) {
    return !result.skipped && result.passed === true;
  });
  const report = {
    suite: 'V31 System Alert Tests',
    passed: passed.length,
    failed: failed.length,
    skipped: skipped.length,
    results: results,
  };
  Logger.log(JSON.stringify(report, null, 2));
  if (failed.length) {
    throw new Error(failed.length + ' system-alert test(s) failed.');
  }
  return report;
}

function assertSystemAlertTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function testSystemAlertHeaders_() {
  const expected = [
    'Alert ID', 'Alert Key', 'Created At', 'Last Occurred At',
    'Occurrence Count', 'Cycle ID', 'Severity', 'Component', 'Status',
    'Attempt ID', 'Started At', 'Sent At', 'Recipient', 'Subject',
    'Details JSON', 'Last Error', 'Resolved At', 'Resolved By',
  ];
  assertSystemAlertTest_(
    JSON.stringify(V31_SYSTEM_ALERTS.HEADERS) === JSON.stringify(expected),
    'SystemAlerts headers changed or are out of order.'
  );
}

function testSystemAlertDedupeCount_() {
  const merged = mergeSystemAlertOccurrence_(
    {
      'Alert ID': 'same-id',
      'Occurrence Count': 2,
      'Details JSON': '{"first":true,"nested":{"a":1}}',
    },
    { second: true, nested: { b: 2 } },
    new Date()
  );
  const details = JSON.parse(merged['Details JSON']);
  assertSystemAlertTest_(merged['Alert ID'] === 'same-id', 'Unresolved lifecycle ID changed.');
  assertSystemAlertTest_(merged['Occurrence Count'] === 3, 'Occurrence count did not increment.');
  assertSystemAlertTest_(details.first && details.second, 'Structured details were not merged.');
  assertSystemAlertTest_(details.nested.a === 1 && details.nested.b === 2, 'Nested details were lost.');
}

function testResolvedAlertRecurrenceLifecycle_() {
  const key = 'cycle|Signature|Manager:artifact';
  const resolved = {
    'Alert ID': 'old-id',
    'Alert Key': key,
    Status: V31_SYSTEM_ALERTS.STATUS.RESOLVED,
  };
  assertSystemAlertTest_(
    !shouldReuseSystemAlertLifecycle_(resolved, key),
    'Resolved lifecycle must not be reused.'
  );
  assertSystemAlertTest_(typeof Utilities.getUuid === 'function', 'New lifecycle UUID support is missing.');
}

function testSystemAlertAutoResolutionShape_() {
  const when = new Date();
  const alert = applySystemAlertResolution_(
    { Status: V31_SYSTEM_ALERTS.STATUS.SENT, 'Details JSON': '{}' },
    'System',
    'Authoritative recovery',
    when
  );
  assertSystemAlertTest_(alert.Status === 'Resolved', 'Recovery did not resolve status.');
  assertSystemAlertTest_(alert['Resolved By'] === 'System', 'System actor was not recorded.');
  assertSystemAlertTest_(alert['Resolved At'] === when, 'Resolved timestamp is required.');
}

function testManualAlertResolutionPolicy_() {
  assertSystemAlertTest_(
    !isManualSystemAlertResolutionAuthorized_(true, true, 'Blocking', ''),
    'Blocking resolution without reason must fail.'
  );
  assertSystemAlertTest_(
    !isManualSystemAlertResolutionAuthorized_(false, true, 'Warning', ''),
    'Out-of-domain resolution must fail.'
  );
  assertSystemAlertTest_(
    !isManualSystemAlertResolutionAuthorized_(true, false, 'Warning', ''),
    'Non-HR resolution must fail.'
  );
  assertSystemAlertTest_(
    isManualSystemAlertResolutionAuthorized_(true, true, 'Security', 'Investigated'),
    'Authorized Security resolution with reason should pass.'
  );
}

function testSystemAlertRecipientPolicy_() {
  assertSystemAlertTest_(
    isValidSystemAlertRecipient_(
      'aitheras-hr@aitheras.com',
      'aitheras.com'
    ),
    'Configured AITHERAS alert recipient was rejected.'
  );
  assertSystemAlertTest_(
    !isValidSystemAlertRecipient_(
      'external@example.com',
      'aitheras.com'
    ),
    'External alert recipient was accepted.'
  );
  assertSystemAlertTest_(
    !isValidSystemAlertRecipient_('not-an-email', 'aitheras.com'),
    'Malformed alert recipient was accepted.'
  );
}

function testSystemAlertSendAmbiguity_() {
  assertSystemAlertTest_(
    classifySystemAlertSendOutcome_(new Error('timeout'), true) ===
      V31_SYSTEM_ALERTS.STATUS.UNKNOWN,
    'Ambiguous send failure must become Delivery Unknown.'
  );
  assertSystemAlertTest_(
    classifySystemAlertSendOutcome_(null, false) ===
      V31_SYSTEM_ALERTS.STATUS.UNKNOWN,
    'Commit ambiguity must become Delivery Unknown.'
  );
}

function testSystemAlertUnknownResendGate_() {
  const alert = {
    'Alert ID': 'unknown-alert',
    Status: V31_SYSTEM_ALERTS.STATUS.UNKNOWN,
  };
  assertSystemAlertTest_(
    planSystemAlertDrain_([alert], {}).selectedCount === 0,
    'Delivery Unknown was selected automatically.'
  );
  const explicitPlan = planSystemAlertDrain_([alert], {
    alertIds: ['unknown-alert'],
    allowUnknownResend: true,
  });
  assertSystemAlertTest_(
    explicitPlan.selectedCount === 1 &&
      explicitPlan.selected[0].action === 'resend-unknown',
    'Explicit Delivery Unknown resend was not planned.'
  );
}

function testSystemAlertPreviewAutoBlocked_() {
  assertSystemAlertTest_(!canAutoDrainSystemAlerts_('Preview'), 'Preview auto-drain was allowed.');
  assertSystemAlertTest_(!canAutoDrainSystemAlerts_('Paused'), 'Paused auto-drain was allowed.');
  assertSystemAlertTest_(canAutoDrainSystemAlerts_('Live'), 'Live auto-drain was blocked.');
}

function testSystemAlertPreviewManualGate_() {
  const payload = {
    confirmed: true,
    confirmationToken: 'SEND_CONFIRMED_RECOVERY_EMAILS',
  };
  assertSystemAlertTest_(
    canManualRecoverySend_(true, true, payload),
    'Authorized explicit manual send should be mode-independent.'
  );
}

function testSystemAlertExactTokenGate_() {
  assertSystemAlertTest_(
    !isSystemRecoveryConfirmationValid_({
      confirmed: true,
      confirmationToken: 'send_confirmed_recovery_emails',
    }),
    'Case-insensitive or approximate token was accepted.'
  );
  assertSystemAlertTest_(
    isSystemRecoveryConfirmationValid_({
      confirmed: true,
      confirmationToken: 'SEND_CONFIRMED_RECOVERY_EMAILS',
    }),
    'Exact token was rejected.'
  );
}

function testWorkflowRecipientIsolation_() {
  const cycle = {
    'Cycle ID': 'cycle-1',
    Status: PR.CYCLE.MEETING,
    'Manager Email': 'manager@aitheras.com',
    'Employee Email': 'employee@aitheras.com',
    'HR Email': 'hr@aitheras.com',
    'Meeting Manager Email Status': V31.DELIVERY.PENDING,
    'Meeting Employee Email Status': V31.DELIVERY.PENDING,
  };
  const plan = planWorkflowOutboxForCycle_(cycle, ['meetingEmployee']);
  assertSystemAlertTest_(plan.componentCount === 1, 'Unrelated pending component was selected.');
  assertSystemAlertTest_(plan.components[0].key === 'meetingEmployee', 'Wrong component selected.');
  assertSystemAlertTest_(
    JSON.stringify(plan.components[0].recipients) === JSON.stringify(['employee@aitheras.com']),
    'Recipient-specific plan included an unrelated recipient.'
  );
}

function testSystemAlertPlannerBenchmark_() {
  const cycles = [];
  for (let index = 0; index < 1000; index++) {
    cycles.push({
      'Cycle ID': 'cycle-' + index,
      Status: index < 100 ? PR.CYCLE.READY : PR.CYCLE.OPEN,
      'Ready Notification Status':
        index < 10
          ? V31.DELIVERY.PENDING
          : V31.DELIVERY.SENT,
    });
  }
  const started = Date.now();
  const plan = planWorkflowOutboxCycles_(cycles, 15);
  const elapsed = Date.now() - started;
  assertSystemAlertTest_(plan.length === 10, 'Planner did not isolate active unresolved cycles.');
  assertSystemAlertTest_(plan[0] === 'cycle-0' && plan[9] === 'cycle-9', 'Planner selected incorrect cycles.');
  assertSystemAlertTest_(elapsed < 1000, 'Pure 1000-row planner exceeded one second: ' + elapsed + 'ms.');
}

function testSentAlertRecurrencePreservesStatus_() {
  assertSystemAlertTest_(
    nextUnresolvedSystemAlertStatusOnRecurrence_(
      V31_SYSTEM_ALERTS.STATUS.SENT
    ) === V31_SYSTEM_ALERTS.STATUS.SENT,
    'Sent unresolved alerts must stay Sent on recurrence.'
  );
  assertSystemAlertTest_(
    nextUnresolvedSystemAlertStatusOnRecurrence_(
      V31_SYSTEM_ALERTS.STATUS.FAILED
    ) === V31_SYSTEM_ALERTS.STATUS.FAILED,
    'Failed alerts must remain Failed for explicit drain retry.'
  );
  assertSystemAlertTest_(
    nextUnresolvedSystemAlertStatusOnRecurrence_(
      V31_SYSTEM_ALERTS.STATUS.PENDING
    ) === V31_SYSTEM_ALERTS.STATUS.PENDING,
    'Pending alerts must remain Pending.'
  );
}

function testFreshSendingAlertResolutionBlocked_() {
  const fresh = canResolveSystemAlertStatus_(
    V31_SYSTEM_ALERTS.STATUS.SENDING,
    new Date(),
    15
  );
  assertSystemAlertTest_(
    !fresh.allowed && !fresh.convertToUnknown,
    'Fresh Sending must reject manual resolution.'
  );
  const stale = canResolveSystemAlertStatus_(
    V31_SYSTEM_ALERTS.STATUS.SENDING,
    new Date(Date.now() - 16 * 60000),
    15
  );
  assertSystemAlertTest_(
    stale.allowed && stale.convertToUnknown,
    'Stale Sending must convert to Delivery Unknown before resolve.'
  );
  const pending = canResolveSystemAlertStatus_(
    V31_SYSTEM_ALERTS.STATUS.PENDING,
    '',
    15
  );
  assertSystemAlertTest_(
    pending.allowed && !pending.convertToUnknown,
    'Pending alerts must remain resolvable.'
  );
}
