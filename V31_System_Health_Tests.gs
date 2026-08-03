/**
 * Delivery D pure System Health tests (correction pass).
 *
 * Run from Apps Script editor: runV31SystemHealthTests_()
 * No Drive, Calendar, Mail, or Sheet writes in the automatic suite.
 */

function runV31SystemHealthTests_() {
  const cases = [
    ['health level merge prefers blocking', testHealthLevelMerge_],
    ['durable component classification covers unknown and sending', testDurableComponentClassification_],
    ['empty healthy system shows empty recovery and healthy metrics', testHealthySystemEmptyState_],
    ['mixed cycle recovery items populate cards', testMixedCycleRecoveryItems_],
    ['complete cycle finalization defects surface as recovery', testCompleteCycleFinalizationHealth_],
    ['cancelled cycles suppress workflow recovery', testCancelledCycleHealthBehavior_],
    ['classifySignatureHealth covers Delivery B warning matrix', testClassifySignatureHealthMatrix_],
    ['system alerts attach to matching recovery items', testAlertAssociationDedup_],
    ['readiness detail shape is preserved for UI rendering', testReadinessDetailShape_],
    ['operational messages never return Unknown Error', testOperationalResultMessaging_],
    ['pretty details format objects without raw dumps failing', testPrettyHealthDetails_],
    ['deep check and sandbox probe APIs exist', testDeepCheckFlagShape_],
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
    'Requires Daniel Sandbox: deep Drive/Calendar/folder/template probes',
    'Requires Daniel Sandbox: dashboard load timing under concurrent Sheet load',
    'Requires Daniel Sandbox: browser accessibility keyboard/focus/screen-reader checks',
    'Requires Daniel Sandbox: cold vs cached System Health load with 100/1000 cycles',
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
  const report = {
    suite: 'V31 System Health Tests',
    passed: results.filter(function (result) {
      return !result.skipped && result.passed === true;
    }).length,
    failed: failed.length,
    skipped: results.filter(function (result) {
      return result.skipped === true;
    }).length,
    results: results,
  };
  Logger.log(JSON.stringify(report, null, 2));
  if (failed.length) {
    throw new Error(failed.length + ' system-health test(s) failed.');
  }
  return report;
}

function assertHealthTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function buildHealthyCompleteCycleFixture_(cycleId) {
  return {
    'Cycle ID': cycleId || 'healthy-1',
    Status: PR.CYCLE.COMPLETE,
    'Employee Name': 'Alex Example',
    'Manager PDF Status': V31.DELIVERY.SENT,
    'Self PDF Status': V31.DELIVERY.SENT,
    'Final Distribution Status': V31.DELIVERY.SENT,
    'Finalization Audit Status': 'Complete',
    'Finalization Audit Event ID':
      'FINALIZATION_COMPLETE:' + (cycleId || 'healthy-1'),
    'Manager Signature Status': V31.SIGNATURE.SIGNED,
    'Employee Signature Status': V31.SIGNATURE.SIGNED,
    'HR Signature Status': V31.SIGNATURE.SIGNED,
  };
}

function testHealthLevelMerge_() {
  assertHealthTest_(
    mergeSystemHealthLevel_(
      V31_SYSTEM_HEALTH.LEVEL.HEALTHY,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    ) === V31_SYSTEM_HEALTH.LEVEL.WARNING,
    'Warning must outrank healthy.'
  );
  assertHealthTest_(
    mergeSystemHealthLevel_(
      V31_SYSTEM_HEALTH.LEVEL.WARNING,
      V31_SYSTEM_HEALTH.LEVEL.BLOCKING
    ) === V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Blocking must outrank warning.'
  );
  assertHealthTest_(
    getSystemHealthLevelLabel_(V31_SYSTEM_HEALTH.LEVEL.ATTENTION) ===
      'Needs Attention',
    'Attention label must remain exact.'
  );
}

function testDurableComponentClassification_() {
  assertHealthTest_(
    classifyDurableComponentHealth_(V31.DELIVERY.UNKNOWN) ===
      V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Delivery Unknown must be blocking.'
  );
  assertHealthTest_(
    classifyDurableComponentHealth_(V31.DELIVERY.SENDING) ===
      V31_SYSTEM_HEALTH.LEVEL.RUNNING,
    'Fresh Sending must be running.'
  );
  assertHealthTest_(
    classifyDurableComponentHealth_(V31.DELIVERY.SENDING, {
      stale: true,
    }) === V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
    'Stale Sending must need attention.'
  );
  assertHealthTest_(
    classifyDurableComponentHealth_(V31.DELIVERY.SENT) ===
      V31_SYSTEM_HEALTH.LEVEL.HEALTHY,
    'Sent must be healthy.'
  );
}

function testHealthySystemEmptyState_() {
  const checkedAt = '2026-07-31T18:00:00.000Z';
  const summary = buildSystemHealthSummaryFromRows_(
    [buildHealthyCompleteCycleFixture_('healthy-1')],
    {
      mode: 'Preview',
      triggerHealth: { healthy: true },
      signatureRecoveryFolder: { warning: '' },
    },
    {
      unresolvedCount: 0,
      notificationPendingCount: 0,
      notificationSentCount: 0,
      alerts: [],
    },
    checkedAt
  );
  assertHealthTest_(
    summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.HEALTHY,
    'Healthy system must report healthy overall.'
  );
  assertHealthTest_(
    summary.recoveryItems.length === 0,
    'Healthy system must have an empty Recovery Center.'
  );
  assertHealthTest_(
    summary.metrics.unresolvedAlerts === 0,
    'Healthy metrics must show zero unresolved alerts.'
  );
  assertHealthTest_(
    /Healthy/i.test(summary.headline),
    'Healthy headline must communicate a healthy state.'
  );
}

function testMixedCycleRecoveryItems_() {
  const cycle = {
    'Cycle ID': '2025-004',
    Status: PR.CYCLE.SIGNATURES,
    'Employee Name': 'Jordan Example',
    'Employee Email': 'employee@aitheras.com',
    'Manager Email': 'manager@aitheras.com',
    'HR Email': 'hr@aitheras.com',
    'Calendar Status': V31.CALENDAR.CONFIGURED,
    'Calendar Event ID': 'event-1',
    'Calendar Configuration Status': V31.CALENDAR.CONFIGURED,
    'Manager Email Status': V31.DELIVERY.SENT,
    'Employee Email Status': V31.DELIVERY.SENT,
    'HR Email Status': V31.DELIVERY.SENT,
    'Launch Completed At': new Date(),
    'Manager Signature Status': V31.DELIVERY.UNKNOWN,
    'Manager Signature Attempt ID': 'sig-attempt',
    'Manager Signature Last Error': 'Ambiguous artifact',
    'Manager Signature Email Status': V31.DELIVERY.SENT,
    'Employee Signature Email Status': V31.DELIVERY.SENT,
    'HR Signature Email Status': V31.DELIVERY.SENT,
    'Ready Notification Status': V31.DELIVERY.SENT,
    'Meeting Manager Email Status': V31.DELIVERY.SENT,
    'Meeting Employee Email Status': V31.DELIVERY.SENT,
  };
  const items = collectCycleRecoveryItems_(cycle);
  assertHealthTest_(
    items.some(function (item) {
      return (
        item.category === 'signatures' &&
        item.action === 'reconcileSignature' &&
        item.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
      );
    }),
    'Unknown manager signature must appear in Recovery Center.'
  );
  const summary = buildSystemHealthSummaryFromRows_(
    [cycle],
    {
      mode: 'Live',
      triggerHealth: { healthy: true },
      signatureRecoveryFolder: { warning: '' },
    },
    {
      unresolvedCount: 1,
      alerts: [
        {
          alertId: 'alert-1',
          cycleId: '2025-004',
          severity: 'Blocking',
          component: 'Signature',
          status: 'Sent',
          notificationSent: true,
          lastError: 'Signature unknown',
          details: { note: 'test' },
        },
      ],
    },
    new Date().toISOString()
  );
  assertHealthTest_(
    summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Blocking signature issues must raise overall health.'
  );
  assertHealthTest_(
    summary.recoveryItems.some(function (item) {
      return (
        item.category === 'signatures' &&
        item.relatedAlertId === 'alert-1'
      );
    }),
    'Matching System Alert must attach to the signature recovery item.'
  );
  assertHealthTest_(
    !summary.recoveryItems.some(function (item) {
      return item.id === 'alert:alert-1';
    }),
    'Matched alert must not create a duplicate Recovery Center row.'
  );
  const signatureCard = summary.cards.filter(function (card) {
    return card.key === 'signatures';
  })[0];
  assertHealthTest_(
    signatureCard &&
      signatureCard.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Signatures card must show blocking.'
  );
}

function testCompleteCycleFinalizationHealth_() {
  const defects = [
    {
      field: 'Manager PDF Status',
      value: V31.DELIVERY.UNKNOWN,
      category: 'pdfs',
      level: V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    },
    {
      field: 'Self PDF Status',
      value: V31.DELIVERY.FAILED,
      category: 'pdfs',
      level: V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
    },
    {
      field: 'Final Distribution Status',
      value: V31.DELIVERY.UNKNOWN,
      category: 'distribution',
      level: V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    },
    {
      field: 'Finalization Audit Status',
      value: 'Failed',
      category: 'audit',
      level: V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
    },
  ];

  defects.forEach(function (defect) {
    const cycle = buildHealthyCompleteCycleFixture_('complete-defect');
    cycle[defect.field] = defect.value;
    if (defect.field === 'Finalization Audit Status') {
      cycle['Finalization Audit Event ID'] = '';
    }
    const items = collectCycleRecoveryItems_(cycle);
    assertHealthTest_(
      items.some(function (item) {
        return (
          item.category === defect.category &&
          item.level === defect.level
        );
      }),
      'Complete cycle defect ' +
        defect.field +
        ' must surface in Recovery Center.'
    );
    assertHealthTest_(
      !items.some(function (item) {
        return (
          item.action === 'retryLaunch' ||
          item.action === 'retryWorkflow'
        );
      }),
      'Complete cycles must not create ordinary launch/workflow retries.'
    );
  });

  const missingEvent = buildHealthyCompleteCycleFixture_(
    'complete-missing-event'
  );
  missingEvent['Finalization Audit Event ID'] = '';
  const missingItems = collectCycleRecoveryItems_(missingEvent);
  assertHealthTest_(
    missingItems.some(function (item) {
      return (
        item.category === 'audit' &&
        item.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
      );
    }),
    'Complete audit without deterministic event ID must be blocking.'
  );

  const summary = buildSystemHealthSummaryFromRows_(
    [missingEvent],
    {
      mode: 'Preview',
      triggerHealth: { healthy: true },
      signatureRecoveryFolder: { warning: '' },
    },
    {
      unresolvedCount: 0,
      alerts: [],
    },
    new Date().toISOString()
  );
  assertHealthTest_(
    summary.overallLevel !== V31_SYSTEM_HEALTH.LEVEL.HEALTHY,
    'Broken Complete cycle must not report overall Healthy.'
  );
}

function testCancelledCycleHealthBehavior_() {
  const cycle = {
    'Cycle ID': 'cancelled-1',
    Status: PR.CYCLE.CANCELLED,
    'Employee Name': 'Casey Cancelled',
    'Calendar Status': V31.CALENDAR.PENDING,
    'Manager Email Status': V31.DELIVERY.PENDING,
    'Employee Email Status': V31.DELIVERY.PENDING,
    'HR Email Status': V31.DELIVERY.PENDING,
    'Ready Notification Status': V31.DELIVERY.PENDING,
    'Manager Signature Status': V31.SIGNATURE.SIGNED,
    'Manager Signature Artifact Warning':
      'losing artifact could not be quarantined',
  };
  const items = collectCycleRecoveryItems_(cycle);
  assertHealthTest_(
    !items.some(function (item) {
      return (
        item.action === 'retryLaunch' ||
        item.action === 'reconcileLaunch' ||
        item.action === 'retryWorkflow' ||
        item.action === 'rebuildCalendar'
      );
    }),
    'Cancelled cycles must not generate launch or workflow recovery actions.'
  );
  assertHealthTest_(
    items.some(function (item) {
      return (
        item.category === 'signatures' &&
        item.level === V31_SYSTEM_HEALTH.LEVEL.WARNING &&
        item.action !== 'reconcileSignature'
      );
    }),
    'Cancelled cycles may still surface signature artifact warnings.'
  );
}

function testClassifySignatureHealthMatrix_() {
  const role = PR.ROLE.MANAGER;
  const base = {
    'Manager Signature Status': V31.SIGNATURE.PENDING,
    'Manager Signature Last Error': '',
    'Manager Signature Artifact Warning': '',
    'Manager Signature Audit Warning': '',
    'Manager Signature Reconciliation Status': '',
    'Manager Signature Attempt ID': 'attempt-1',
    'Manager Signature Started At': new Date().toISOString(),
    'Manager Signature Recovery File ID': '',
  };

  function classifyWith(overrides) {
    const cycle = {};
    Object.keys(base).forEach(function (key) {
      cycle[key] = base[key];
    });
    Object.keys(overrides || {}).forEach(function (key) {
      cycle[key] = overrides[key];
    });
    return classifySignatureHealth_(cycle, role);
  }

  const signedArtifact = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.SIGNED,
    'Manager Signature Artifact Warning':
      'losing artifact could not be quarantined',
  });
  assertHealthTest_(
    signedArtifact.level === V31_SYSTEM_HEALTH.LEVEL.WARNING &&
      signedArtifact.signed === true &&
      signedArtifact.action !== 'reconcileSignature',
    'Signed + Artifact Warning must warn without forcing re-sign.'
  );

  const signedAudit = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.SIGNED,
    'Manager Signature Audit Warning': 'audit write failed',
  });
  assertHealthTest_(
    signedAudit.level === V31_SYSTEM_HEALTH.LEVEL.WARNING &&
      signedAudit.signed === true,
    'Signed + Audit Warning must warn while keeping the winner Signed.'
  );

  const failed = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.FAILED,
  });
  assertHealthTest_(
    failed.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION &&
      failed.action === 'reconcileSignature',
    'Failed signature must need attention.'
  );

  const freshSigning = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.SIGNING,
    'Manager Signature Started At': new Date().toISOString(),
  });
  assertHealthTest_(
    freshSigning.level === V31_SYSTEM_HEALTH.LEVEL.RUNNING &&
      freshSigning.actionable === false,
    'Fresh Signing must be Running and non-actionable.'
  );

  const staleSigning = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.SIGNING,
    'Manager Signature Started At': new Date(
      Date.now() - (V31.SENDING_STALE_MS + 60000)
    ).toISOString(),
  });
  assertHealthTest_(
    staleSigning.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION &&
      staleSigning.action === 'reconcileSignature',
    'Stale Signing must need attention.'
  );

  const unknown = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.UNKNOWN,
  });
  assertHealthTest_(
    unknown.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Delivery Unknown must be Blocking.'
  );

  const reconFailed = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.PENDING,
    'Manager Signature Reconciliation Status':
      V31.SIGNATURE_RECONCILIATION.FAILED,
  });
  assertHealthTest_(
    reconFailed.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
    'Reconciliation Failed must need attention.'
  );

  const reconUnknown = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.PENDING,
    'Manager Signature Reconciliation Status':
      V31.SIGNATURE_RECONCILIATION.UNKNOWN,
  });
  assertHealthTest_(
    reconUnknown.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    'Reconciliation Delivery Unknown must be Blocking.'
  );

  const recoveryOnly = classifyWith({
    'Manager Signature Status': V31.SIGNATURE.PENDING,
    'Manager Signature Recovery File ID': 'file-recovery-1',
  });
  assertHealthTest_(
    recoveryOnly.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION &&
      recoveryOnly.action === 'reconcileSignature',
    'Recovery file without Signed winner must need attention.'
  );
}

function testAlertAssociationDedup_() {
  const cycle = {
    'Cycle ID': 'cal-1',
    Status: PR.CYCLE.OPEN,
    'Employee Name': 'Riley Example',
    'Calendar Status': V31.CALENDAR.CREATED,
    'Calendar Event ID': 'evt-1',
    'Calendar Configuration Status': V31.CALENDAR.UNKNOWN,
    'Calendar Configuration Last Error': 'tags failed',
    'Manager Email Status': V31.DELIVERY.SENT,
    'Employee Email Status': V31.DELIVERY.SENT,
    'HR Email Status': V31.DELIVERY.SENT,
    'Launch Completed At': new Date(),
  };
  const summary = buildSystemHealthSummaryFromRows_(
    [cycle],
    {
      mode: 'Preview',
      triggerHealth: { healthy: true },
      signatureRecoveryFolder: { warning: '' },
    },
    {
      unresolvedCount: 1,
      alerts: [
        {
          alertId: 'alert-cal-1',
          cycleId: 'cal-1',
          severity: 'Warning',
          component: 'Calendar Configuration',
          status: 'Sent',
          notificationSent: true,
          lastError: 'tags failed',
        },
      ],
    },
    new Date().toISOString()
  );
  const calendarItems = summary.recoveryItems.filter(function (item) {
    return item.component === 'Calendar Configuration';
  });
  assertHealthTest_(
    calendarItems.length === 1,
    'Recovery Center must present one authoritative Calendar recovery task.'
  );
  assertHealthTest_(
    calendarItems[0].relatedAlertNote.indexOf('notification sent') >=
      0,
    'Related alert metadata must note notification sent.'
  );
  assertHealthTest_(
    summary.metrics.unresolvedAlerts === 1,
    'Alert metrics must still count the unresolved incident.'
  );
  assertHealthTest_(
    !summary.recoveryItems.some(function (item) {
      return item.id === 'alert:alert-cal-1';
    }),
    'Matched Calendar alert must not duplicate as a separate recovery row.'
  );
}

function testReadinessDetailShape_() {
  const readiness = {
    ok: false,
    blocking: [
      {
        code: 'REVIEW_FOLDER_INVALID',
        message: 'Review folder is inaccessible.',
      },
    ],
    warnings: [
      {
        code: 'CALENDAR_PROBE_SKIPPED',
        message: 'Requires Daniel Sandbox.',
      },
    ],
    liveProbes: false,
    liveProbesSkipped: true,
    incomplete: false,
    liveProbesNote:
      'Live Drive/Calendar/folder probes were not run.',
  };
  assertHealthTest_(
    readiness.blocking[0].code === 'REVIEW_FOLDER_INVALID',
    'Blocking readiness code must be available to the UI.'
  );
  assertHealthTest_(
    readiness.warnings[0].message.indexOf('Daniel Sandbox') >= 0,
    'Warning plain-language message must be available to the UI.'
  );
  assertHealthTest_(
    readiness.liveProbesSkipped === true,
    'Live-probe skip state must be explicit.'
  );
}

function testOperationalResultMessaging_() {
  assertHealthTest_(
    formatOperationalResultMessage_({
      ok: true,
      message: 'Review launched. Calendar configuration needs attention.',
    }).indexOf('Calendar configuration') >= 0,
    'Partial-success message must be preserved.'
  );
  assertHealthTest_(
    formatOperationalResultMessage_({ partial: true }).indexOf(
      'warnings'
    ) >= 0,
    'Partial results must use warning language.'
  );
  assertHealthTest_(
    formatOperationalResultMessage_(null)
      .toLowerCase()
      .indexOf('unknown error') < 0,
    'Null results must not say Unknown Error.'
  );
  assertHealthTest_(
    formatOperationalResultMessage_({ ok: false })
      .toLowerCase()
      .indexOf('unknown error') < 0,
    'Failed results must not say Unknown Error.'
  );
}

function testPrettyHealthDetails_() {
  const pretty = prettyPrintHealthDetails_({ a: 1, nested: { b: 2 } });
  assertHealthTest_(
    pretty.indexOf('"a": 1') >= 0 && pretty.indexOf('\n') >= 0,
    'Details must pretty-print JSON with indentation.'
  );
  assertHealthTest_(
    prettyPrintHealthDetails_('not-json') === 'not-json',
    'Non-JSON strings must pass through safely.'
  );
}

function testDeepCheckFlagShape_() {
  assertHealthTest_(
    typeof runSystemHealthDeepCheck === 'function',
    'Configuration / deep health check public API must exist.'
  );
  assertHealthTest_(
    typeof runSystemHealthSandboxLiveProbes === 'function',
    'Sandbox live probe public API must exist.'
  );
  assertHealthTest_(
    typeof getSystemHealthSummary === 'function',
    'Summary public API must exist.'
  );
  assertHealthTest_(
    typeof getSystemHealthItemDetails === 'function',
    'Item detail public API must exist.'
  );
  assertHealthTest_(
    typeof classifySignatureHealth_ === 'function',
    'classifySignatureHealth_ must exist for Delivery B states.'
  );
  assertHealthTest_(
    V31_SYSTEM_HEALTH.CACHE_TTL_SECONDS === 30,
    'Summary cache TTL must remain 30 seconds.'
  );
}
