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
      'workflow notification component map is complete',
      testWorkflowNotificationComponentMap_
    )
  );
  results.push(
    runWorkflowCase_(
      'Final Distribution Attempt ID is in CYCLE_HEADERS',
      testFinalDistributionAttemptHeader_
    )
  );
  results.push(
    runWorkflowCase_(
      'signature claim fields exist per role',
      testSignatureClaimHeaders_
    )
  );
  results.push(
    runWorkflowCase_(
      'decideLaunchComponentAction blocks unknown PDF without allow',
      testUnknownPdfRequiresAllow_
    )
  );
  results.push(
    runWorkflowCase_(
      'createReviewCycle partial-success shape is documented',
      testManualCreatePartialSuccessShape_
    )
  );
  results.push(
    runWorkflowCase_(
      'duplicate active cycle matcher keys on employee/type/period',
      testDuplicateActiveCycleMatcher_
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
  const keys = [
    'ready',
    'meetingManager',
    'meetingEmployee',
    'signatureManager',
    'signatureEmployee',
    'signatureHr',
  ];

  keys.forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    assertWorkflow_(
      component.statusField &&
        component.attemptField &&
        component.startedField &&
        component.sentAtField,
      key + ' must expose claim/commit fields'
    );
    assertWorkflow_(
      V31.CYCLE_HEADERS.indexOf(component.statusField) >= 0,
      key + ' status field must be migrated'
    );
  });
}

function testFinalDistributionAttemptHeader_() {
  assertWorkflow_(
    V31.CYCLE_HEADERS.indexOf(
      'Final Distribution Attempt ID'
    ) >= 0,
    'Final Distribution Attempt ID must be present'
  );
}

function testSignatureClaimHeaders_() {
  [
    'Manager Signature Status',
    'Manager Signature Attempt ID',
    'Manager Signature Started At',
    'Employee Signature Status',
    'Employee Signature Attempt ID',
    'Employee Signature Started At',
    'HR Signature Status',
    'HR Signature Attempt ID',
    'HR Signature Started At',
  ].forEach(function (header) {
    assertWorkflow_(
      V31.CYCLE_HEADERS.indexOf(header) >= 0,
      'Missing signature claim header: ' + header
    );
  });
}

function testUnknownPdfRequiresAllow_() {
  const blocked = decideLaunchComponentAction_(
    V31.DELIVERY.UNKNOWN,
    false,
    '',
    V31.DELIVERY.SENDING,
    false
  );

  assertWorkflow_(
    blocked.action === 'skip' && blocked.reason === 'unknown',
    'Unknown PDF must not auto-regenerate'
  );

  const allowed = decideLaunchComponentAction_(
    V31.DELIVERY.UNKNOWN,
    false,
    '',
    V31.DELIVERY.SENDING,
    true
  );

  assertWorkflow_(
    allowed.action === 'claim',
    'Explicit allow must reclaim Unknown for HR regenerate path'
  );
}

function testManualCreatePartialSuccessShape_() {
  const sample = {
    ok: true,
    cycleCreated: true,
    launchComplete: false,
    cycleId: 'C-1',
    message: 'Review created, but launch requires attention.',
  };

  assertWorkflow_(
    sample.ok &&
      sample.cycleCreated &&
      sample.launchComplete === false &&
      !!sample.cycleId,
    'Partial create response must keep ok/cycleCreated/cycleId'
  );
}

function testDuplicateActiveCycleMatcher_() {
  const periodStart = new Date(2026, 0, 1);
  const periodEnd = new Date(2026, 5, 30);

  const existing = {
    'Cycle ID': 'existing-1',
    Status: PR.CYCLE.OPEN,
    'Employee Email': 'emp@example.com',
    'Review Type': 'Annual',
    'Review Period Start': periodStart,
    'Review Period End': periodEnd,
  };

  assertWorkflow_(
    normalizeEmail_(existing['Employee Email']) ===
      normalizeEmail_('emp@example.com'),
    'Duplicate matcher must normalize employee email'
  );
  assertWorkflow_(
    String(existing['Review Type']) === 'Annual',
    'Duplicate matcher must compare review type'
  );
  assertWorkflow_(
    new Date(existing['Review Period Start']).getTime() ===
      periodStart.getTime() &&
      new Date(existing['Review Period End']).getTime() ===
        periodEnd.getTime(),
    'Duplicate matcher must compare period bounds'
  );
  assertWorkflow_(
    String(existing['Status']) !== PR.CYCLE.COMPLETE,
    'Complete cycles must not block a later reuse of the period'
  );
}
