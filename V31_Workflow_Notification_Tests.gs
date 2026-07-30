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
      'notification eligibility enforces cycle stage',
      testWorkflowNotificationEligibility_
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
      'deterministic PDF name helper rejects employee-name variants',
      testDeterministicPdfNameContract_
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
    'Meeting email blocked before Meeting Opened At'
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
    'Meeting employee email eligible after Meeting Opened At'
  );
  assertWorkflow_(
    !isWorkflowNotificationEligible_(
      meetingOpen,
      'signatureManager'
    ),
    'Signature request blocked before release'
  );

  const signatures = {
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
    isWorkflowNotificationEligible_(
      signatures,
      'signatureManager'
    ),
    'Manager signature email eligible after release'
  );
  assertWorkflow_(
    !isWorkflowNotificationEligible_(signatures, 'signatureHr'),
    'HR signature email blocked until both participants sign'
  );

  signatures['MGR Manager Signature ID'] = 'm';
  signatures['SELF Manager Signature ID'] = 'm';
  signatures['MGR Employee Signature ID'] = 'e';
  signatures['SELF Employee Signature ID'] = 'e';

  assertWorkflow_(
    isWorkflowNotificationEligible_(signatures, 'signatureHr'),
    'HR signature email eligible after both participants sign'
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
  const periodStart = new Date(2026, 0, 1);
  const periodEnd = new Date(2026, 5, 30);
  const open = {
    'Cycle ID': 'open-1',
    Status: PR.CYCLE.OPEN,
    'Employee Email': 'emp@example.com',
    'Review Type': 'Annual',
    'Review Period Start': periodStart,
    'Review Period End': periodEnd,
  };
  const cancelled = {
    'Cycle ID': 'cancelled-1',
    Status: PR.CYCLE.CANCELLED,
    'Employee Email': 'emp@example.com',
    'Review Type': 'Annual',
    'Review Period Start': periodStart,
    'Review Period End': periodEnd,
  };

  const blocking = [
    PR.CYCLE.OPEN,
    PR.CYCLE.READY,
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
  ];

  assertWorkflow_(
    blocking.indexOf(String(open.Status)) >= 0,
    'Open must block recreation'
  );
  assertWorkflow_(
    blocking.indexOf(String(cancelled.Status)) < 0,
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

  threw = false;

  try {
    assertPdfReconciliationAllowed_(
      {
        Status: PR.CYCLE.FINALIZING,
        'Manager PDF Status': V31.DELIVERY.PENDING,
      },
      PR.TYPE.MANAGER
    );
  } catch (error) {
    threw = true;
  }

  assertWorkflow_(
    threw,
    'PDF reconcile must reject non-Unknown components'
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
  let threw = false;

  try {
    assertSignatureReconciliationAllowed_(
      {
        Status: PR.CYCLE.MEETING,
        'Manager Signature Status': V31.DELIVERY.UNKNOWN,
      },
      PR.ROLE.MANAGER
    );
  } catch (error) {
    threw = true;
  }

  assertWorkflow_(
    threw,
    'Signature reconcile must require Awaiting Signatures'
  );

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

function testDeterministicPdfNameContract_() {
  assertWorkflow_(
    buildReviewPdfFileName_('C-9', PR.TYPE.MANAGER) ===
      'Manager Review - C-9.pdf',
    'Manager PDF name must include cycle ID'
  );
  assertWorkflow_(
    buildReviewPdfFileName_('C-9', PR.TYPE.SELF) ===
      'Self-Evaluation - C-9.pdf',
    'Self PDF name must include cycle ID'
  );
}
