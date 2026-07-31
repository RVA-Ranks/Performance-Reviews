/**
 * Delivery D — HR System Health summary and deep-check helpers.
 * Sheet/trigger metadata only on normal load; Drive/Calendar probes stay
 * manual. Recovery actions call existing Delivery B/C endpoints from the UI.
 */

const V31_SYSTEM_HEALTH = Object.freeze({
  CACHE_KEY: 'v31_system_health_summary_v1',
  CACHE_TTL_SECONDS: 30,
  LEVEL: {
    HEALTHY: 'healthy',
    WARNING: 'warning',
    ATTENTION: 'attention',
    BLOCKING: 'blocking',
    RUNNING: 'running',
    NA: 'na',
  },
  CARD_KEYS: [
    'automation',
    'notifications',
    'launches',
    'calendar',
    'signatures',
    'pdfs',
    'distribution',
    'audit',
    'alerts',
  ],
});

function getSystemHealthLevelRank_(level) {
  const ranks = {};
  ranks[V31_SYSTEM_HEALTH.LEVEL.BLOCKING] = 50;
  ranks[V31_SYSTEM_HEALTH.LEVEL.ATTENTION] = 40;
  ranks[V31_SYSTEM_HEALTH.LEVEL.WARNING] = 30;
  ranks[V31_SYSTEM_HEALTH.LEVEL.RUNNING] = 20;
  ranks[V31_SYSTEM_HEALTH.LEVEL.HEALTHY] = 10;
  ranks[V31_SYSTEM_HEALTH.LEVEL.NA] = 0;
  return Object.prototype.hasOwnProperty.call(ranks, level)
    ? ranks[level]
    : 0;
}

function mergeSystemHealthLevel_(current, next) {
  return getSystemHealthLevelRank_(next) >
    getSystemHealthLevelRank_(current)
    ? next
    : current;
}

function getSystemHealthLevelLabel_(level) {
  const labels = {};
  labels[V31_SYSTEM_HEALTH.LEVEL.HEALTHY] = 'Healthy';
  labels[V31_SYSTEM_HEALTH.LEVEL.WARNING] = 'Warning';
  labels[V31_SYSTEM_HEALTH.LEVEL.ATTENTION] = 'Needs Attention';
  labels[V31_SYSTEM_HEALTH.LEVEL.BLOCKING] = 'Blocking';
  labels[V31_SYSTEM_HEALTH.LEVEL.RUNNING] = 'Running';
  labels[V31_SYSTEM_HEALTH.LEVEL.NA] = 'Not Applicable';
  return labels[level] || 'Needs Attention';
}

function isTerminalCycleStatus_(status) {
  return (
    String(status || '') === PR.CYCLE.COMPLETE ||
    String(status || '') === PR.CYCLE.CANCELLED
  );
}

function isDeliveryUnknownStatus_(status) {
  return String(status || '') === V31.DELIVERY.UNKNOWN;
}

function isFailedStatus_(status) {
  return String(status || '') === V31.DELIVERY.FAILED;
}

function isSendingStatus_(status) {
  const value = String(status || '');
  return (
    value === V31.DELIVERY.SENDING ||
    value === V31.CALENDAR.CREATING ||
    value === V31.CALENDAR.CONFIGURING ||
    value === V31.SIGNATURE.SIGNING ||
    value === 'Writing'
  );
}

/**
 * Pure helper: classify a durable component field for the dashboard.
 */
function classifyDurableComponentHealth_(status, options) {
  const opts = options || {};
  const value = String(status || '');
  if (!value && opts.allowEmptyHealthy) {
    return V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  }
  if (isDeliveryUnknownStatus_(value)) {
    return V31_SYSTEM_HEALTH.LEVEL.BLOCKING;
  }
  if (isFailedStatus_(value) || opts.forcedAttention) {
    return V31_SYSTEM_HEALTH.LEVEL.ATTENTION;
  }
  if (opts.forcedWarning || opts.configWarning) {
    return V31_SYSTEM_HEALTH.LEVEL.WARNING;
  }
  if (isSendingStatus_(value)) {
    return opts.stale
      ? V31_SYSTEM_HEALTH.LEVEL.ATTENTION
      : V31_SYSTEM_HEALTH.LEVEL.RUNNING;
  }
  if (
    value === V31.DELIVERY.SENT ||
    value === V31.CALENDAR.CREATED ||
    value === V31.CALENDAR.CONFIGURED ||
    value === V31.SIGNATURE.SIGNED ||
    value === 'Complete' ||
    value === V31.SIGNATURE_RECONCILIATION.RESOLVED
  ) {
    return V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  }
  if (opts.pendingIsHealthy) {
    return V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  }
  if (value === V31.DELIVERY.PENDING || value === 'Pending') {
    return opts.eligible
      ? V31_SYSTEM_HEALTH.LEVEL.ATTENTION
      : V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  }
  return V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
}

function buildEmptyHealthCard_(key, title) {
  return {
    key: key,
    title: title,
    level: V31_SYSTEM_HEALTH.LEVEL.HEALTHY,
    label: getSystemHealthLevelLabel_(
      V31_SYSTEM_HEALTH.LEVEL.HEALTHY
    ),
    count: 0,
    countLabel: '0 issues',
    summary: 'Healthy',
    lastChecked: '',
  };
}

function buildHealthCardTitles_() {
  return {
    automation: 'Automation',
    notifications: 'Workflow Notifications',
    launches: 'Review Launches',
    calendar: 'Calendar',
    signatures: 'Signatures',
    pdfs: 'PDF Generation',
    distribution: 'Final Distribution',
    audit: 'Finalization Audit',
    alerts: 'System Alerts',
  };
}

/**
 * Pure helper: roll up card counts and worst severity.
 */
function finalizeHealthCards_(cards, checkedAt) {
  const titles = buildHealthCardTitles_();
  return V31_SYSTEM_HEALTH.CARD_KEYS.map(function (key) {
    const card = cards[key] || buildEmptyHealthCard_(key, titles[key]);
    card.title = titles[key] || key;
    card.label = getSystemHealthLevelLabel_(card.level);
    card.lastChecked = checkedAt;
    if (!card.countLabel) {
      card.countLabel =
        card.count === 1
          ? '1 item needs attention'
          : card.count + ' items need attention';
    }
    if (card.level === V31_SYSTEM_HEALTH.LEVEL.HEALTHY) {
      card.summary = 'Healthy';
      card.countLabel =
        key === 'alerts'
          ? '0 unresolved'
          : '0 need attention';
    }
    return card;
  });
}

function bumpHealthCard_(cards, key, level, increment) {
  if (!cards[key]) {
    cards[key] = buildEmptyHealthCard_(
      key,
      buildHealthCardTitles_()[key]
    );
  }
  cards[key].level = mergeSystemHealthLevel_(cards[key].level, level);
  cards[key].count += Number(increment || 0);
}

function createRecoveryItem_(input) {
  const value = input || {};
  return {
    id: String(value.id || ''),
    cycleId: String(value.cycleId || ''),
    employeeName: String(value.employeeName || ''),
    category: String(value.category || ''),
    component: String(value.component || ''),
    status: String(value.status || ''),
    level: String(
      value.level || V31_SYSTEM_HEALTH.LEVEL.ATTENTION
    ),
    label: getSystemHealthLevelLabel_(
      value.level || V31_SYSTEM_HEALTH.LEVEL.ATTENTION
    ),
    action: String(value.action || 'openCycle'),
    actionLabel: String(value.actionLabel || 'Recover'),
    attemptId: String(value.attemptId || ''),
    startedAt: String(value.startedAt || ''),
    lastError: String(value.lastError || ''),
    recommendation: String(value.recommendation || ''),
    details: value.details || null,
    alertId: String(value.alertId || ''),
    severity: String(value.severity || ''),
    componentKey: String(value.componentKey || ''),
    role: String(value.role || ''),
    documentType: String(value.documentType || ''),
  };
}

/**
 * Pure helper: collect actionable recovery items for one cycle row.
 * Uses existing summary helpers; does not mutate the cycle.
 */
function collectCycleRecoveryItems_(cycle) {
  const items = [];
  if (!cycle || isTerminalCycleStatus_(cycle.Status)) {
    return items;
  }
  const cycleId = String(cycle['Cycle ID'] || '');
  const employeeName = String(cycle['Employee Name'] || cycleId);
  const launch = getReviewLaunchComponentSummary_(cycle);
  const notifications = getWorkflowNotificationSummary_(cycle);
  const finalization = getFinalizationSummary_(cycle);
  const status = String(cycle.Status || '');
  const calendarEventMissing =
    String(cycle['Last Launch Error'] || '').indexOf(
      'Calendar event missing or inaccessible:'
    ) === 0;

  if (!launch.complete) {
    if (launch.calendarUnknown || launch.hasUnknown) {
      items.push(
        createRecoveryItem_({
          id: 'launch-unknown:' + cycleId,
          cycleId: cycleId,
          employeeName: employeeName,
          category: 'launches',
          component: 'Review Launch',
          status: V31.DELIVERY.UNKNOWN,
          level: V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
          action: 'reconcileLaunch',
          actionLabel: 'Recover',
          lastError: launch.lastError,
          recommendation:
            'Open launch reconciliation. Mark Confirmed only with delivery evidence, or resend one component.',
          details: launch,
        })
      );
    } else {
      items.push(
        createRecoveryItem_({
          id: 'launch-retry:' + cycleId,
          cycleId: cycleId,
          employeeName: employeeName,
          category: 'launches',
          component: 'Review Launch',
          status: 'Incomplete',
          level: V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
          action: 'retryLaunch',
          actionLabel: 'Retry Launch',
          lastError: launch.lastError,
          recommendation:
            'Retry unfinished launch steps. Sent recipients and completed Calendar creation are skipped.',
          details: launch,
        })
      );
    }
  }

  if (calendarEventMissing) {
    items.push(
      createRecoveryItem_({
        id: 'calendar-rebuild:' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'calendar',
        component: 'Calendar Event',
        status: 'Missing',
        level: V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
        action: 'rebuildCalendar',
        actionLabel: 'Rebuild Calendar',
        lastError: launch.lastError,
        recommendation:
          'Use Rebuild only when the original event is confirmed missing. Marker recovery runs first. Launch emails are not resent.',
      })
    );
  } else if (
    launch.calendarConfigWarning ||
    launch.calendarConfigurationUnknown
  ) {
    items.push(
      createRecoveryItem_({
        id: 'calendar-config:' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'calendar',
        component: 'Calendar Configuration',
        status: launch.calendarConfigurationStatus,
        level: launch.calendarConfigurationUnknown
          ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
          : V31_SYSTEM_HEALTH.LEVEL.WARNING,
        action: 'retryCalendarConfig',
        actionLabel: 'Retry',
        lastError: launch.calendarConfigurationLastError,
        recommendation:
          'Retries tags and reminders on the existing event only. A second calendar event is not created.',
        attemptId: String(
          cycle['Calendar Configuration Attempt ID'] || ''
        ),
        startedAt: String(
          cycle['Calendar Configuration Started At'] || ''
        ),
      })
    );
  }

  getWorkflowNotificationKeys_().forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    const componentStatus = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const meta =
      (notifications.components && notifications.components[key]) ||
      {};
    if (!(meta.eligible && meta.needsAttention)) {
      return;
    }
    const unknown = isDeliveryUnknownStatus_(componentStatus);
    items.push(
      createRecoveryItem_({
        id: 'notification:' + key + ':' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'notifications',
        component: component.label,
        componentKey: key,
        status: componentStatus,
        level: unknown
          ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
          : V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
        action: unknown
          ? 'markWorkflowConfirmed'
          : 'retryWorkflow',
        actionLabel: unknown ? 'Mark Confirmed' : 'Retry',
        attemptId: String(cycle[component.attemptField] || ''),
        startedAt: String(cycle[component.startedField] || ''),
        lastError: String(cycle[component.errorField] || ''),
        recommendation: unknown
          ? 'Mark Confirmed only with evidence the original email arrived. Use Retry Workflow Email for an explicit resend.'
          : 'Retry sends only this eligible component after confirmation.',
      })
    );
  });

  [
    {
      role: PR.ROLE.MANAGER,
      label: 'Manager Signature',
      statusField: 'Manager Signature Status',
      errorField: 'Manager Signature Last Error',
      attemptField: 'Manager Signature Attempt ID',
      startedField: 'Manager Signature Started At',
    },
    {
      role: PR.ROLE.EMPLOYEE,
      label: 'Employee Signature',
      statusField: 'Employee Signature Status',
      errorField: 'Employee Signature Last Error',
      attemptField: 'Employee Signature Attempt ID',
      startedField: 'Employee Signature Started At',
    },
    {
      role: PR.ROLE.HR,
      label: 'HR Signature',
      statusField: 'HR Signature Status',
      errorField: 'HR Signature Last Error',
      attemptField: 'HR Signature Attempt ID',
      startedField: 'HR Signature Started At',
    },
  ].forEach(function (entry) {
    const signatureStatus = String(cycle[entry.statusField] || '');
    if (!isDeliveryUnknownStatus_(signatureStatus)) {
      return;
    }
    items.push(
      createRecoveryItem_({
        id: 'signature:' + entry.role + ':' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'signatures',
        component: entry.label,
        role: entry.role,
        status: signatureStatus,
        level: V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
        action: 'reconcileSignature',
        actionLabel: 'Recover',
        attemptId: String(cycle[entry.attemptField] || ''),
        startedAt: String(cycle[entry.startedField] || ''),
        lastError: String(cycle[entry.errorField] || ''),
        recommendation:
          'Open signature reconciliation for this role. Do not trash ambiguous artifacts.',
      })
    );
  });

  if (status === PR.CYCLE.FINALIZING || status === PR.CYCLE.COMPLETE) {
    [
      {
        documentType: PR.TYPE.MANAGER,
        label: 'Manager PDF',
        status: finalization.managerPdf,
        unknown: finalization.managerPdfUnknown,
        idField: 'Manager Review PDF ID',
        attemptField: 'Manager PDF Attempt ID',
        startedField: 'Manager PDF Started At',
        errorField: 'Manager PDF Last Error',
      },
      {
        documentType: PR.TYPE.SELF,
        label: 'Self PDF',
        status: finalization.selfPdf,
        unknown: finalization.selfPdfUnknown,
        idField: 'Self Evaluation PDF ID',
        attemptField: 'Self PDF Attempt ID',
        startedField: 'Self PDF Started At',
        errorField: 'Self PDF Last Error',
      },
    ].forEach(function (entry) {
      if (
        !entry.unknown &&
        entry.status !== V31.DELIVERY.FAILED &&
        !(
          status === PR.CYCLE.FINALIZING &&
          entry.status !== V31.DELIVERY.SENT
        )
      ) {
        return;
      }
      items.push(
        createRecoveryItem_({
          id: 'pdf:' + entry.documentType + ':' + cycleId,
          cycleId: cycleId,
          employeeName: employeeName,
          category: 'pdfs',
          component: entry.label,
          documentType: entry.documentType,
          status: entry.status,
          level: entry.unknown
            ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
            : V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
          action: entry.unknown
            ? 'reconcilePdf'
            : 'retryFinalization',
          actionLabel: entry.unknown ? 'Recover' : 'Retry PDF',
          attemptId: String(cycle[entry.attemptField] || ''),
          startedAt: String(cycle[entry.startedField] || ''),
          lastError: String(cycle[entry.errorField] || ''),
          recommendation: entry.unknown
            ? 'Reconcile the deterministic PDF candidate. Do not generate a duplicate while ambiguity remains.'
            : 'Retry finalization to resume unfinished PDF generation safely.',
        })
      );
    });

    if (
      finalization.distributionUnknown ||
      finalization.distribution === V31.DELIVERY.FAILED ||
      (status === PR.CYCLE.FINALIZING &&
        finalization.distribution !== V31.DELIVERY.SENT &&
        finalization.managerPdf === V31.DELIVERY.SENT &&
        finalization.selfPdf === V31.DELIVERY.SENT)
    ) {
      items.push(
        createRecoveryItem_({
          id: 'distribution:' + cycleId,
          cycleId: cycleId,
          employeeName: employeeName,
          category: 'distribution',
          component: 'Final Distribution',
          status: finalization.distribution,
          level: finalization.distributionUnknown
            ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
            : V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
          action: finalization.distributionUnknown
            ? 'markDistributionConfirmed'
            : 'retryDistribution',
          actionLabel: finalization.distributionUnknown
            ? 'Mark Confirmed'
            : 'Retry Distribution',
          attemptId: String(
            cycle['Final Distribution Attempt ID'] || ''
          ),
          startedAt: String(
            cycle['Final Distribution Started At'] || ''
          ),
          lastError: finalization.distributionLastError,
          recommendation: finalization.distributionUnknown
            ? 'Mark Confirmed with evidence, or use explicit Resend. Automatic resend is prohibited.'
            : 'Retry finalization to send the final packet after PDF validation.',
          details: {
            recipients: finalization.distributionRecipients,
          },
        })
      );
    }

    if (
      finalization.finalizationAudit === 'Delivery Unknown' ||
      finalization.finalizationAudit === 'Failed' ||
      (status === PR.CYCLE.FINALIZING &&
        finalization.managerPdf === V31.DELIVERY.SENT &&
        finalization.selfPdf === V31.DELIVERY.SENT &&
        finalization.distribution === V31.DELIVERY.SENT &&
        finalization.finalizationAudit !== 'Complete')
    ) {
      items.push(
        createRecoveryItem_({
          id: 'audit:' + cycleId,
          cycleId: cycleId,
          employeeName: employeeName,
          category: 'audit',
          component: 'Finalization Audit',
          status: finalization.finalizationAudit,
          level:
            finalization.finalizationAudit === 'Delivery Unknown'
              ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
              : V31_SYSTEM_HEALTH.LEVEL.ATTENTION,
          action: 'retryFinalization',
          actionLabel: 'Retry',
          attemptId: String(
            cycle['Finalization Audit Attempt ID'] || ''
          ),
          startedAt: String(
            cycle['Finalization Audit Started At'] || ''
          ),
          lastError: String(
            cycle['Finalization Audit Last Error'] || ''
          ),
          recommendation:
            'Retry finalization so the deterministic audit event can be written. Completion requires the audit row.',
          details: {
            eventId: finalization.finalizationAuditEventId,
          },
        })
      );
    }
  }

  return items;
}

function collectAlertRecoveryItems_(alerts) {
  return (alerts || []).map(function (alert) {
    const severity = String(alert.severity || 'Warning');
    const level =
      severity === 'Blocking' || severity === 'Security'
        ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
        : V31_SYSTEM_HEALTH.LEVEL.WARNING;
    return createRecoveryItem_({
      id: 'alert:' + String(alert.alertId || ''),
      cycleId: String(alert.cycleId || ''),
      employeeName: String(alert.cycleId || 'System'),
      category: 'alerts',
      component: String(alert.component || 'System Alert'),
      status: String(alert.status || ''),
      level: level,
      action: 'resolveAlert',
      actionLabel: 'Resolve Alert',
      alertId: String(alert.alertId || ''),
      severity: severity,
      lastError: String(alert.lastError || ''),
      recommendation:
        'Review details, then resolve with an audited reason for Blocking or Security alerts.',
      details: alert.details || null,
      attemptId: '',
      startedAt: String(alert.lastOccurredAt || ''),
    });
  });
}

function buildAutomationHealthCard_(automation, checkedAt) {
  const triggerHealth =
    (automation && automation.triggerHealth) || {};
  const mode = String((automation && automation.mode) || 'Preview');
  let level = V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  let count = 0;
  const notes = [];
  if (!triggerHealth.healthy) {
    level = V31_SYSTEM_HEALTH.LEVEL.BLOCKING;
    count += 1;
    notes.push(triggerHealth.warning || 'Trigger health requires attention.');
  }
  if (automation && automation.signatureRecoveryFolder &&
      automation.signatureRecoveryFolder.warning) {
    level = mergeSystemHealthLevel_(
      level,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    );
    count += 1;
    notes.push(automation.signatureRecoveryFolder.warning);
  }
  if (mode === 'Paused') {
    level = mergeSystemHealthLevel_(
      level,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    );
    notes.push('Automation is Paused.');
  }
  return {
    key: 'automation',
    title: 'Automation',
    level: level,
    label: getSystemHealthLevelLabel_(level),
    count: count,
    countLabel:
      count === 0
        ? 'Trigger and owner checks passed'
        : count + ' automation issue(s)',
    summary:
      notes[0] ||
      (mode === 'Live'
        ? 'Automation Live'
        : 'Automation ' + mode),
    lastChecked: checkedAt,
    details: {
      mode: mode,
      triggerHealth: triggerHealth,
      lastRun: (automation && automation.lastRun) || '',
      lastSuccess: (automation && automation.lastSuccess) || '',
      lastFailure: (automation && automation.lastFailure) || '',
      lastError: (automation && automation.lastError) || '',
    },
  };
}

/**
 * Pure helper: build dashboard metrics from cards and recovery items.
 */
function buildSystemHealthMetrics_(cards, recoveryItems, alerts, checkedAt) {
  let healthyComponents = 0;
  let warnings = 0;
  let blockingIssues = 0;
  (cards || []).forEach(function (card) {
    if (card.level === V31_SYSTEM_HEALTH.LEVEL.HEALTHY) {
      healthyComponents += 1;
    } else if (card.level === V31_SYSTEM_HEALTH.LEVEL.WARNING) {
      warnings += 1;
    } else if (
      card.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING ||
      card.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION
    ) {
      if (card.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING) {
        blockingIssues += 1;
      } else {
        warnings += 1;
      }
    }
  });
  const cycleIds = {};
  (recoveryItems || []).forEach(function (item) {
    if (item.cycleId && item.category !== 'alerts') {
      cycleIds[String(item.cycleId)] = true;
    }
  });
  return {
    healthyComponents: healthyComponents,
    warnings: warnings,
    blockingIssues: blockingIssues,
    unresolvedAlerts: Number(
      (alerts && alerts.unresolvedCount) || 0
    ),
    cyclesRequiringRecovery: Object.keys(cycleIds).length,
    recoveryItemCount: (recoveryItems || []).length,
    lastHealthCheck: checkedAt,
  };
}

function buildOverallHealthLevel_(cards) {
  let level = V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  (cards || []).forEach(function (card) {
    level = mergeSystemHealthLevel_(level, card.level);
  });
  return level;
}

function prettyPrintHealthDetails_(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (error) {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

/**
 * Formats operational API results for HR-facing toasts.
 * Never returns a bare "Unknown Error".
 */
function formatOperationalResultMessage_(result, fallback) {
  if (!result) {
    return String(fallback || 'Completed with no additional details.');
  }
  if (result.message) {
    return String(result.message);
  }
  if (result.partial) {
    return 'Completed with warnings. Review System Health for remaining work.';
  }
  if (result.ok === false) {
    return String(
      fallback ||
        'The action did not finish cleanly. Review System Health for details.'
    );
  }
  if (result.ok === true) {
    return String(fallback || 'Completed.');
  }
  return String(
    fallback ||
      'Completed with warnings. Review System Health for remaining work.'
  );
}

function getSystemHealthCache_() {
  try {
    return CacheService.getScriptCache();
  } catch (error) {
    return null;
  }
}

function readCachedSystemHealthSummary_() {
  const cache = getSystemHealthCache_();
  if (!cache) return null;
  try {
    const raw = cache.get(V31_SYSTEM_HEALTH.CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.checkedAt) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function writeCachedSystemHealthSummary_(summary) {
  const cache = getSystemHealthCache_();
  if (!cache || !summary) return;
  try {
    cache.put(
      V31_SYSTEM_HEALTH.CACHE_KEY,
      JSON.stringify(summary),
      V31_SYSTEM_HEALTH.CACHE_TTL_SECONDS
    );
  } catch (error) {
    Logger.log(
      'System health cache write skipped: ' +
        String(error.message || error)
    );
  }
}

function clearCachedSystemHealthSummary_() {
  const cache = getSystemHealthCache_();
  if (!cache) return;
  try {
    cache.remove(V31_SYSTEM_HEALTH.CACHE_KEY);
  } catch (error) {
    // ignore
  }
}

function buildSystemHealthSummaryFromRows_(
  cycles,
  automation,
  alertsData,
  checkedAt
) {
  const cardsMap = {};
  V31_SYSTEM_HEALTH.CARD_KEYS.forEach(function (key) {
    if (key === 'automation') return;
    cardsMap[key] = buildEmptyHealthCard_(
      key,
      buildHealthCardTitles_()[key]
    );
  });

  const recoveryItems = [];
  (cycles || []).forEach(function (cycle) {
    const items = collectCycleRecoveryItems_(cycle);
    items.forEach(function (item) {
      recoveryItems.push(item);
      bumpHealthCard_(cardsMap, item.category, item.level, 1);
    });
  });

  const alertItems = collectAlertRecoveryItems_(
    (alertsData && alertsData.alerts) || []
  );
  alertItems.forEach(function (item) {
    recoveryItems.push(item);
    bumpHealthCard_(cardsMap, 'alerts', item.level, 1);
  });
  if (alertItems.length) {
    cardsMap.alerts.countLabel =
      alertItems.length === 1
        ? '1 unresolved'
        : alertItems.length + ' unresolved';
    cardsMap.alerts.summary =
      alertItems.length + ' unresolved alert(s)';
  }

  const automationCard = buildAutomationHealthCard_(
    automation,
    checkedAt
  );
  const cards = [automationCard].concat(
    finalizeHealthCards_(cardsMap, checkedAt).filter(function (card) {
      return card.key !== 'automation';
    })
  );

  const metrics = buildSystemHealthMetrics_(
    cards,
    recoveryItems,
    alertsData,
    checkedAt
  );
  const overallLevel = buildOverallHealthLevel_(cards);

  return {
    ok: overallLevel !== V31_SYSTEM_HEALTH.LEVEL.BLOCKING,
    overallLevel: overallLevel,
    overallLabel: getSystemHealthLevelLabel_(overallLevel),
    checkedAt: checkedAt,
    cached: false,
    deepCheck: false,
    metrics: metrics,
    cards: cards,
    recoveryItems: recoveryItems,
    alerts: alertsData || {
      unresolvedCount: 0,
      notificationPendingCount: 0,
      notificationSentCount: 0,
      alerts: [],
    },
    headline:
      overallLevel === V31_SYSTEM_HEALTH.LEVEL.HEALTHY
        ? 'Automation Healthy'
        : overallLevel === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
        ? 'Blocking Issues Require Attention'
        : 'System Needs Attention',
  };
}

function buildSystemHealthSummary_(options) {
  const opts = options || {};
  const checkedAt = new Date().toISOString();
  const automation =
    opts.automation || getAutomationAdminData_();
  const alertsData =
    opts.alertsData ||
    (function () {
      assertActiveHrDomain_();
      return getSystemAlertsAdminData();
    })();
  const cycles =
    opts.cycles || getAllObjects_(PR.SHEETS.CYCLES);
  return buildSystemHealthSummaryFromRows_(
    cycles,
    automation,
    alertsData,
    checkedAt
  );
}

/**
 * HR-only: lightweight System Health summary (cached ~30s).
 */
function getSystemHealthSummary(options) {
  assertActiveHrDomain_();
  const opts = options || {};
  if (opts.forceRefresh !== true) {
    const cached = readCachedSystemHealthSummary_();
    if (cached) {
      cached.cached = true;
      return cached;
    }
  }
  const summary = buildSystemHealthSummary_({
    automation: getAutomationAdminData_(),
  });
  writeCachedSystemHealthSummary_(summary);
  return summary;
}

/**
 * HR-only: manual deep health check. Never called automatically.
 * Uses production readiness without live Workspace probes unless
 * explicitly confirmed for Sandbox.
 */
function runSystemHealthDeepCheck(options) {
  assertActiveHrDomain_();
  const opts = options || {};
  const settings = getSettings_();
  const liveProbes =
    opts.liveProbes === true &&
    String(settings.ENVIRONMENT || '') === 'Sandbox' &&
    opts.sandboxConfirmed === true &&
    String(opts.confirmationToken || '') === 'SANDBOX_LIVE_PROBES';

  const summary = buildSystemHealthSummary_({
    automation: getAutomationAdminData_(),
  });
  summary.deepCheck = true;
  summary.cached = false;
  summary.deepCheckStartedAt = new Date().toISOString();

  let readiness;
  try {
    readiness = runProductionReadinessChecks_({
      liveProbes: liveProbes,
      sandboxConfirmed: opts.sandboxConfirmed === true,
      confirmationToken: String(opts.confirmationToken || ''),
    });
  } catch (error) {
    readiness = {
      ok: false,
      blocking: [
        {
          code: 'DEEP_CHECK_FAILED',
          message: String(error.message || error),
        },
      ],
      warnings: [],
    };
  }

  summary.readiness = {
    ok: !!(readiness && readiness.ok),
    blocking: (readiness && readiness.blocking) || [],
    warnings: (readiness && readiness.warnings) || [],
    liveProbes: liveProbes,
    liveProbesSkipped: !liveProbes,
    liveProbesNote: liveProbes
      ? 'Sandbox live probes executed.'
      : 'Live Drive/Calendar/folder probes were not run. Requires Daniel Sandbox confirmation.',
  };

  if (summary.readiness.blocking.length) {
    summary.overallLevel = mergeSystemHealthLevel_(
      summary.overallLevel,
      V31_SYSTEM_HEALTH.LEVEL.BLOCKING
    );
  } else if (summary.readiness.warnings.length) {
    summary.overallLevel = mergeSystemHealthLevel_(
      summary.overallLevel,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    );
  }
  summary.overallLabel = getSystemHealthLevelLabel_(
    summary.overallLevel
  );
  summary.headline =
    summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.HEALTHY
      ? 'Deep Check Healthy'
      : summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
      ? 'Deep Check Found Blocking Issues'
      : 'Deep Check Completed With Warnings';
  summary.deepCheckCompletedAt = new Date().toISOString();
  summary.checkedAt = summary.deepCheckCompletedAt;
  writeCachedSystemHealthSummary_(summary);
  return summary;
}

/**
 * HR-only: detail payload for one recovery item or alert.
 */
function getSystemHealthItemDetails(itemId) {
  assertActiveHrDomain_();
  const summary = getSystemHealthSummary({ forceRefresh: false });
  const wanted = String(itemId || '');
  const item = (summary.recoveryItems || []).filter(function (row) {
    return String(row.id) === wanted;
  })[0];
  if (!item) {
    throw new Error(
      'That recovery item is no longer present. Refresh System Health.'
    );
  }
  return {
    ok: true,
    item: item,
    prettyDetails: prettyPrintHealthDetails_(item.details),
    recommendation: item.recommendation,
  };
}

function invalidateSystemHealthCacheAfterRecovery_() {
  clearCachedSystemHealthSummary_();
}
