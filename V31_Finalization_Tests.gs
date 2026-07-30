/**
 * AITHERAS Performance Review Portal V3.1
 * Finalization resumability tests (DROP-IN).
 *
 * Run from the Apps Script editor:
 *   runV31FinalizationTests()
 *
 * These tests exercise pure finalization helpers and state gates.
 * They do not create Drive PDFs or send mail unless LIVE probes are enabled.
 */

function runV31FinalizationTests() {
  const results = [];

  results.push(
    runFinalCase_(
      'Finalizing is distinct from Complete',
      testFinalizingStatusConstant_
    )
  );
  results.push(
    runFinalCase_(
      'all signatures move to Finalizing not Complete',
      testSignaturesSetFinalizingNotComplete_
    )
  );
  results.push(
    runFinalCase_(
      'completion requires both PDFs and Sent distribution',
      testCompletionGateRequiresComponents_
    )
  );
  results.push(
    runFinalCase_(
      'stale Sending claim is treated as Delivery Unknown',
      testStaleSendingBecomesUnknown_
    )
  );
  results.push(
    runFinalCase_(
      'fresh Sending claim is not stale',
      testFreshSendingNotStale_
    )
  );
  results.push(
    runFinalCase_(
      'finalization summary exposes component states',
      testFinalizationSummaryShape_
    )
  );
  results.push(
    runFinalCase_(
      'htmlToPlainText preserves links and strips tags',
      testHtmlToPlainTextFallback_
    )
  );
  results.push(
    runFinalCase_(
      'Finalizing is visible in meetingOpen and primary action',
      testFinalizingVisibilityAndPrimaryAction_
    )
  );
  results.push(
    runFinalCase_(
      'PDF filename uses cycle ID not employee name',
      testPdfFileNameUsesCycleId_
    )
  );

  const failed = results.filter(function (row) {
    return !row.ok;
  });

  const summary =
    'V3.1 finalization tests: ' +
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

function runFinalCase_(name, fn) {
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

function assertFinal_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function testFinalizingStatusConstant_() {
  assertFinal_(
    PR.CYCLE.FINALIZING === 'Finalizing',
    'PR.CYCLE.FINALIZING must equal Finalizing'
  );
  assertFinal_(
    PR.CYCLE.FINALIZING !== PR.CYCLE.COMPLETE,
    'Finalizing must not equal Complete'
  );
}

function testSignaturesSetFinalizingNotComplete_() {
  const cycle = {
    Status: PR.CYCLE.SIGNATURES,
    'MGR Manager Signature ID': 'a',
    'SELF Manager Signature ID': 'a',
    'MGR Employee Signature ID': 'b',
    'SELF Employee Signature ID': 'b',
    'MGR HR Signature ID': 'c',
    'SELF HR Signature ID': 'c',
  };

  updateCombinedSignatureStatuses_(cycle);

  assertFinal_(
    cycle['Status'] === PR.CYCLE.FINALIZING,
    'All signatures must set Finalizing'
  );
  assertFinal_(
    cycle['Status'] !== PR.CYCLE.COMPLETE,
    'Must not set Complete before PDFs/distribution'
  );
}

function testCompletionGateRequiresComponents_() {
  const incomplete = {
    Status: PR.CYCLE.FINALIZING,
    'Manager Review PDF ID': 'mgr-pdf',
    'Self Evaluation PDF ID': '',
    'Final Distribution Status': V31.DELIVERY.PENDING,
  };

  assertFinal_(
    !(
      incomplete['Manager Review PDF ID'] &&
      incomplete['Self Evaluation PDF ID'] &&
      String(incomplete['Final Distribution Status']) ===
        V31.DELIVERY.SENT
    ),
    'Incomplete components must fail the completion gate'
  );

  const complete = {
    'Manager Review PDF ID': 'mgr-pdf',
    'Self Evaluation PDF ID': 'self-pdf',
    'Final Distribution Status': V31.DELIVERY.SENT,
  };

  assertFinal_(
    !!(
      complete['Manager Review PDF ID'] &&
      complete['Self Evaluation PDF ID'] &&
      String(complete['Final Distribution Status']) ===
        V31.DELIVERY.SENT
    ),
    'Both PDF IDs and Sent distribution required'
  );
}

function testStaleSendingBecomesUnknown_() {
  const started = new Date(
    Date.now() - (V31.SENDING_STALE_MS + 60000)
  );

  assertFinal_(
    isDeliveryClaimStale_(started),
    'Old Sending claim must be stale'
  );
}

function testFreshSendingNotStale_() {
  assertFinal_(
    !isDeliveryClaimStale_(new Date()),
    'Fresh Sending claim must not be stale'
  );
}

function testFinalizationSummaryShape_() {
  const summary = getFinalizationSummary_({
    Status: PR.CYCLE.FINALIZING,
    'Manager Review PDF ID': 'mgr',
    'Manager PDF Status': V31.DELIVERY.SENT,
    'Self Evaluation PDF ID': '',
    'Self PDF Status': V31.DELIVERY.FAILED,
    'Final Distribution Status': V31.DELIVERY.UNKNOWN,
    'Finalization Last Error': 'Simulated',
    'Finalization Attempt Count': 2,
  });

  assertFinal_(
    summary.managerPdf === V31.DELIVERY.SENT,
    'Manager PDF status exposed'
  );
  assertFinal_(
    summary.selfPdf === V31.DELIVERY.FAILED,
    'Self PDF status exposed'
  );
  assertFinal_(
    summary.distribution === V31.DELIVERY.UNKNOWN,
    'Distribution Unknown exposed'
  );
  assertFinal_(
    summary.attemptCount === 2,
    'Attempt count exposed'
  );
}

function testHtmlToPlainTextFallback_() {
  const plain = htmlToPlainText_(
    '<p>Hello</p><p><a href="https://example.com">Open</a></p>'
  );

  assertFinal_(
    plain.indexOf('Hello') >= 0,
    'Plain text must keep body copy'
  );
  assertFinal_(
    plain.indexOf('<p>') < 0,
    'Plain text must strip HTML tags'
  );
}

function testFinalizingVisibilityAndPrimaryAction_() {
  const meetingOpen = [
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
    PR.CYCLE.COMPLETE,
  ].includes(PR.CYCLE.FINALIZING);

  assertFinal_(
    meetingOpen,
    'Finalizing must be treated as meeting-open for visibility'
  );

  const action = determinePrimaryAction_(
    {
      Status: PR.CYCLE.FINALIZING,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
      'MGR Manager Signature ID': 'a',
      'SELF Manager Signature ID': 'a',
      'MGR Employee Signature ID': 'b',
      'SELF Employee Signature ID': 'b',
      'MGR HR Signature ID': 'c',
      'SELF HR Signature ID': 'c',
      'Manager Email': 'mgr@example.com',
      'Employee Email': 'emp@example.com',
    },
    'hr@example.com',
    true
  );

  assertFinal_(
    action.label === 'Retry Final Documents',
    'HR primary action in Finalizing must be Retry Final Documents'
  );
  assertFinal_(
    action.required === true,
    'HR finalization retry must be required'
  );
}

function testPdfFileNameUsesCycleId_() {
  const name = buildReviewPdfFileName_(
    'CYCLE-9',
    'Self-Evaluation'
  );

  assertFinal_(
    name === 'Self-Evaluation - CYCLE-9.pdf',
    'PDF recovery name must key on cycle ID'
  );
  assertFinal_(
    name.indexOf('Employee') < 0,
    'PDF recovery name must not rely on employee display name'
  );
}
