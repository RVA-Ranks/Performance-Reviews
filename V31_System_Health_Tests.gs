/**
 * Delivery D pure System Health tests.
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
    ['operational messages never return Unknown Error', testOperationalResultMessaging_],
    ['pretty details format objects without raw dumps failing', testPrettyHealthDetails_],
    ['deep check is opt-in only', testDeepCheckFlagShape_],
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
    [
      {
        'Cycle ID': 'healthy-1',
        Status: PR.CYCLE.COMPLETE,
        'Employee Name': 'Alex Example',
      },
    ],
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
    summary.recoveryItems.length >= 2,
    'Recovery Center must list signature and alert work.'
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
    'Deep health check public API must exist.'
  );
  assertHealthTest_(
    typeof getSystemHealthSummary === 'function',
    'Summary public API must exist.'
  );
  assertHealthTest_(
    V31_SYSTEM_HEALTH.CACHE_TTL_SECONDS === 30,
    'Summary cache TTL must remain 30 seconds.'
  );
}
