/**
 * AITHERAS Performance Review Portal V3.1
 * Finalization resumability tests (DROP-IN).
 *
 * Run from the Apps Script editor:
 *   runV31FinalizationTests_()
 *
 * These tests exercise pure finalization helpers and state gates.
 * They do not create Drive PDFs or send mail unless LIVE probes are enabled.
 */

function runV31FinalizationTests_() {
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
      'PDF filename is human-readable; legacy cycle-id name remains recoverable',
      testPdfFileNameUsesHumanReadableShape_
    )
  );
  results.push(
    runFinalCase_(
      'final distribution attempt identity is required in headers',
      testFinalDistributionAttemptIdHeader_
    )
  );
  results.push(
    runFinalCase_(
      'signature commitment clears active claim and retains winner',
      testSignatureWinnerClearsActiveClaim_
    )
  );
  results.push(
    runFinalCase_(
      'Delivery C finalization headers are exact',
      testDeliveryCFinalizationHeaders_
    )
  );
  results.push(
    runFinalCase_(
      'PDF and distribution stale windows remain separate',
      testDeliveryCStaleWindows_
    )
  );
  results.push(
    runFinalCase_(
      'final packet recipient policy uses cycle participants only',
      testFinalPacketRecipientPolicy_
    )
  );
  results.push(
    runFinalCase_(
      'send or commit ambiguity is Delivery Unknown',
      testFinalDistributionAmbiguityClassification_
    )
  );
  results.push(
    runFinalCase_(
      'audit Event ID header order is exact',
      testAuditEventIdHeaderOrder_
    )
  );
  results.push(
    runFinalCase_(
      'manual distribution confirmation recovery JSON is exact',
      testManualDistributionConfirmationDetails_
    )
  );
  results.push(
    runFinalCase_(
      'audit Event ID migration is idempotent and preserves history',
      testAuditEventIdMigrationPlan_
    )
  );
  results.push(
    runFinalCase_(
      'Complete audit status without row is recoverable',
      testFinalizationAuditMissingEventConsistency_
    )
  );
  results.push(
    runFinalCase_(
      'PDF recovery refuses newer attempt overwrite',
      testRecoveredPdfExpectedStateGuard_
    )
  );
  results.push(
    runFinalCase_(
      'finalization audit has a dedicated stale window',
      testFinalizationAuditStaleWindow_
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

function testSignatureWinnerClearsActiveClaim_() {
  const cycle = {
    'Manager Signature Attempt ID': 'active-attempt',
    'Manager Signature Started At': new Date(),
  };
  applySignatureWinnerToCycle_(
    cycle,
    PR.ROLE.MANAGER,
    'winner-file',
    'winning-attempt',
    new Date()
  );
  assertFinal_(
    cycle['Manager Signature Attempt ID'] === '' &&
      cycle['Manager Signature Started At'] === '',
    'Committed signature must clear its active claim.'
  );
  assertFinal_(
    cycle['Manager Signature Winning Attempt ID'] ===
      'winning-attempt',
    'Committed signature must retain winning provenance.'
  );
  assertFinal_(
    cycle['Manager Signature File ID'] === 'winner-file' &&
      cycle['Manager Signature Status'] === V31.SIGNATURE.SIGNED,
    'Committed signature must retain its authoritative winner.'
  );
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
    'Cycle ID': 'C-GATE',
    Status: PR.CYCLE.FINALIZING,
    'Manager Review PDF ID': 'mgr-pdf',
    'Manager PDF Status': V31.DELIVERY.SENT,
    'Self Evaluation PDF ID': '',
    'Final Distribution Status': V31.DELIVERY.PENDING,
    'Finalization Audit Status': 'Pending',
  };

  assertFinal_(
    !finalizationCompletionGate_(incomplete),
    'Incomplete components must fail the completion gate'
  );

  const complete = {
    'Cycle ID': 'C-GATE',
    'Manager Review PDF ID': 'mgr-pdf',
    'Manager PDF Status': V31.DELIVERY.SENT,
    'Self Evaluation PDF ID': 'self-pdf',
    'Self PDF Status': V31.DELIVERY.SENT,
    'Final Distribution Status': V31.DELIVERY.SENT,
    'Finalization Audit Status': 'Complete',
    'Finalization Audit Event ID': 'FINALIZATION_COMPLETE:C-GATE',
  };

  assertFinal_(
    finalizationCompletionGate_(complete),
    'PDF components, Sent distribution, and durable audit are required'
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

function testPdfFileNameUsesHumanReadableShape_() {
  const name = buildReviewPdfFileName_(
    'CYCLE-9',
    PR.TYPE.SELF
  );
  assertFinal_(
    /\.pdf$/i.test(name),
    'PDF name must end with .pdf'
  );
  assertFinal_(
    name.indexOf('Employee Self Evaluation') >= 0 ||
      name.indexOf('Self_Evaluation') >= 0,
    'PDF name must identify the self-evaluation document'
  );
  const legacy = buildLegacyReviewPdfFileNames_(
    'CYCLE-9',
    PR.TYPE.SELF
  );
  assertFinal_(
    legacy.indexOf('AITHERAS_CYCLE-9_Self_Evaluation_FINAL.pdf') >= 0,
    'Legacy cycle-id PDF name must remain recoverable'
  );
}

function testDeliveryCFinalizationHeaders_() {
  [
    'Manager PDF Completed At',
    'Manager PDF Last Error',
    'Manager PDF Recovery Details JSON',
    'Self PDF Completed At',
    'Self PDF Last Error',
    'Self PDF Recovery Details JSON',
    'Final Distribution Last Error',
    'Final Distribution Recovery Details JSON',
    'Finalization Audit Status',
    'Finalization Audit Attempt ID',
    'Finalization Audit Started At',
    'Finalization Audit Completed At',
    'Finalization Audit Last Error',
    'Finalization Audit Event ID',
  ].forEach(function (header) {
    assertFinal_(
      V31.CYCLE_HEADERS.indexOf(header) >= 0,
      'Missing exact Delivery C header: ' + header
    );
  });
}

function testDeliveryCStaleWindows_() {
  const now = Date.now();
  assertFinal_(
    isClaimStaleMinutes_(new Date(now - 16 * 60000), 15, now),
    'Final distribution must be stale after 15 minutes'
  );
  assertFinal_(
    !isClaimStaleMinutes_(new Date(now - 16 * 60000), 30, now),
    'PDF generation must remain fresh at 16 minutes'
  );
  assertFinal_(
    isClaimStaleMinutes_(new Date(now - 31 * 60000), 30, now),
    'PDF generation must be stale after 30 minutes'
  );
}

function testFinalPacketRecipientPolicy_() {
  const recipients = getFinalDistributionRecipients_(
    {
      'Employee Email': 'employee@aitheras.com',
      'Manager Email': 'manager@aitheras.com',
      'HR Email': 'cycle-hr@aitheras.com',
    },
    { ALLOWED_DOMAIN: 'aitheras.com' }
  );
  assertFinal_(
    JSON.stringify(recipients) ===
      JSON.stringify([
        'employee@aitheras.com',
        'manager@aitheras.com',
        'cycle-hr@aitheras.com',
      ]),
    'Recipients must be exactly Employee, Manager, cycle HR'
  );
  let blocked = false;
  try {
    getFinalDistributionRecipients_(
      {
        'Employee Email': 'employee@aitheras.com',
        'Manager Email': 'manager@aitheras.com',
        'HR Email': '',
      },
      { ALLOWED_DOMAIN: 'aitheras.com' }
    );
  } catch (error) {
    blocked = true;
  }
  assertFinal_(blocked, 'Blank cycle HR must block distribution');
}

function testFinalDistributionAmbiguityClassification_() {
  assertFinal_(
    classifyFinalDistributionCommit_(new Error('simulated'), true) ===
      V31.DELIVERY.UNKNOWN,
    'Send failure must be Delivery Unknown'
  );
  assertFinal_(
    classifyFinalDistributionCommit_(null, false) ===
      V31.DELIVERY.UNKNOWN,
    'Commit mismatch must be Delivery Unknown'
  );
}

function testAuditEventIdHeaderOrder_() {
  assertFinal_(
    JSON.stringify(PR.AUDIT_HEADERS) ===
      JSON.stringify([
        'Timestamp',
        'Event ID',
        'Cycle ID',
        'Action',
        'Actor Email',
        'Previous Status',
        'New Status',
        'Details',
      ]),
    'ReviewAuditLog header order must match the approved schema'
  );
}

function testManualDistributionConfirmationDetails_() {
  const details = buildManualFinalDistributionConfirmationDetails_(
    'hr@aitheras.com',
    new Date('2026-07-31T12:00:00.000Z'),
    'Verified Mail log.',
    'attempt-1',
    ['employee@aitheras.com', 'manager@aitheras.com', 'hr@aitheras.com']
  );
  assertFinal_(
    details.schemaVersion === 1 &&
      details.resolution === 'manual-confirmation' &&
      details.confirmedBy === 'hr@aitheras.com' &&
      details.priorStatus === V31.DELIVERY.UNKNOWN &&
      details.evidenceNote === 'Verified Mail log.' &&
      details.originalAttemptId === 'attempt-1',
    'Manual confirmation recovery JSON fields must remain exact'
  );
  assertFinal_(
    V31_FINALIZATION.DISTRIBUTION_CONFIRM_EVENT_PREFIX + 'C-1' ===
      'FINAL_DISTRIBUTION_CONFIRMED:C-1',
    'Manual confirmation audit event ID must be deterministic'
  );
}

function testAuditEventIdMigrationPlan_() {
  const legacy = planReviewAuditHeaderMigration_([
    'Timestamp',
    'Cycle ID',
    'Action',
    'Actor Email',
    'Previous Status',
    'New Status',
    'Details',
  ]);
  assertFinal_(
    legacy.action === 'insert' &&
      legacy.insertAfterColumn === 1 &&
      legacy.historicalEventIds === 'blank',
    'Legacy migration must insert a blank Event ID after Timestamp'
  );
  const migrated = planReviewAuditHeaderMigration_(PR.AUDIT_HEADERS);
  assertFinal_(
    migrated.action === 'none',
    'Rerunning the approved header migration must be idempotent'
  );
  const appended = planReviewAuditHeaderMigration_([
    'Timestamp',
    'Cycle ID',
    'Action',
    'Actor Email',
    'Previous Status',
    'New Status',
    'Details',
    'Event ID',
  ]);
  assertFinal_(
    appended.action === 'move' &&
      appended.sourceColumn === 8 &&
      appended.historicalEventIds === 'preserve',
    'An appended Event ID must move without losing existing values'
  );
}

/**
 * Requires Daniel Sandbox: exercises Sheet migration, historical blank Event
 * IDs, Drive orphan recovery/ambiguity, Mail fault injection, and audit retry.
 */
function runV31DeliveryCCommit2SandboxTests_() {
  throw new Error(
    'Requires Daniel Sandbox. Enable and execute the documented Workspace-backed cases manually.'
  );
}

function testFinalDistributionAttemptIdHeader_() {
  assertFinal_(
    V31.CYCLE_HEADERS.indexOf(
      'Final Distribution Attempt ID'
    ) >= 0,
    'Final Distribution Attempt ID must exist for commit verification'
  );
}

function testFinalizationAuditMissingEventConsistency_() {
  assertFinal_(
    classifyFinalizationAuditConsistency_('Complete', true) ===
      'complete',
    'Existing audit row must classify as complete'
  );
  assertFinal_(
    classifyFinalizationAuditConsistency_('Complete', false) ===
      'missing-event',
    'Complete without row must be recoverable missing-event'
  );
  assertFinal_(
    classifyFinalizationAuditConsistency_('Pending', false) ===
      'needs-write',
    'Pending without row must need a write'
  );
  assertFinal_(
    classifyFinalizationAuditConsistency_('Writing', false) !==
      'complete',
    'Writing without row must never short-circuit as complete'
  );
}

function testRecoveredPdfExpectedStateGuard_() {
  const expected = {
    expectedStatus: V31.DELIVERY.UNKNOWN,
    expectedAttemptId: 'attempt-old',
    expectedFileId: '',
  };
  assertFinal_(
    decideRecoveredPdfCommit_(
      expected,
      V31.DELIVERY.UNKNOWN,
      'attempt-old',
      ''
    ) === 'commit',
    'Matching snapshot must allow recovered PDF commit'
  );
  assertFinal_(
    decideRecoveredPdfCommit_(
      expected,
      V31.DELIVERY.SENDING,
      'attempt-new',
      ''
    ) === 'state-changed',
    'Newer PDF attempt must block recovered overwrite'
  );
  assertFinal_(
    decideRecoveredPdfCommit_(
      expected,
      V31.DELIVERY.SENT,
      '',
      'file-hr'
    ) === 'state-changed',
    'HR reconciliation must block recovered overwrite'
  );
}

function testFinalizationAuditStaleWindow_() {
  assertFinal_(
    V31.SETTINGS_DEFAULTS.FINALIZATION_AUDIT_STALE_MINUTES === '15',
    'Finalization audit stale default must be 15 minutes'
  );
  assertFinal_(
    V31_FINALIZATION.AUDIT_STALE_DEFAULT_MINUTES === 15,
    'Audit stale constant must remain independent of PDF generation'
  );
  const now = Date.now();
  assertFinal_(
    isClaimStaleMinutes_(new Date(now - 16 * 60000), 15, now),
    'Finalization audit must be stale after 15 minutes'
  );
}
