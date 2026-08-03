/**
 * Delivery D — HR System Health summary and deep-check helpers.
 * Sheet/trigger metadata only on normal load; Drive/Calendar probes stay
 * manual. Recovery actions call existing Delivery B/C endpoints from the UI.
 *
 * Correction: Complete cycles stay visible for finalization/signature health;
 * Cancelled cycles are inspected separately; signature artifact/audit warnings
 * and reconciliation states are classified; System Alerts attach to matching
 * recovery items instead of duplicating Recovery Center rows.
 */

const V31_SYSTEM_HEALTH = Object.freeze({
  CACHE_KEY: 'v31_system_health_summary_v2',
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
  ITEM_KIND: {
    RECOVERY: 'recovery',
    INCIDENT: 'incident',
  },
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

/**
 * Pure helper: classify one role's Delivery B signature health.
 * Does not mutate the cycle. Signed winners stay Signed; warnings are
 * operational signals only.
 */
function classifySignatureHealth_(cycle, role) {
  const fields = getSignatureClaimFields_(role);
  const status = String(cycle[fields.statusField] || '');
  const lastError = String(cycle[fields.errorField] || '');
  const artifactWarning = String(
    cycle[fields.artifactWarningField] || ''
  );
  const auditWarning = String(cycle[fields.auditWarningField] || '');
  const reconciliationStatus = String(
    cycle[fields.reconciliationStatusField] || ''
  );
  const attemptId = String(cycle[fields.attemptField] || '');
  const startedAt = cycle[fields.startedField] || '';
  const reconciliationStartedAt =
    cycle[fields.reconciliationStartedField] || '';
  const recoveryFileId = String(cycle[fields.recoveryFileField] || '');
  const signed = status === V31.SIGNATURE.SIGNED;
  const signing =
    status === V31.SIGNATURE.SIGNING ||
    status === V31.DELIVERY.SENDING;
  const deliveryUnknown =
    status === V31.SIGNATURE.UNKNOWN ||
    status === V31.DELIVERY.UNKNOWN;
  const failed =
    status === V31.SIGNATURE.FAILED ||
    status === V31.DELIVERY.FAILED;
  const reconciliationUnknown =
    reconciliationStatus === V31.SIGNATURE_RECONCILIATION.UNKNOWN ||
    reconciliationStatus === V31.DELIVERY.UNKNOWN;
  const reconciliationFailed =
    reconciliationStatus === V31.SIGNATURE_RECONCILIATION.FAILED ||
    reconciliationStatus === V31.DELIVERY.FAILED;
  const reconciling =
    reconciliationStatus === V31.SIGNATURE_RECONCILIATION.RECONCILING;
  const signingStale =
    signing && isDeliveryClaimStale_(startedAt);
  const reconciliationStale =
    reconciling && isDeliveryClaimStale_(reconciliationStartedAt);

  let level = V31_SYSTEM_HEALTH.LEVEL.HEALTHY;
  let actionable = false;
  let action = 'openCycle';
  let actionLabel = 'Open Cycle';
  let recommendation = '';

  if (deliveryUnknown || reconciliationUnknown || reconciliationStale) {
    level = V31_SYSTEM_HEALTH.LEVEL.BLOCKING;
    actionable = true;
    action = 'reconcileSignature';
    actionLabel = 'Recover';
    recommendation =
      'Open signature reconciliation for this role. Do not trash ambiguous artifacts. The Signed winner, if any, is preserved.';
  } else if (failed || reconciliationFailed) {
    level = V31_SYSTEM_HEALTH.LEVEL.ATTENTION;
    actionable = true;
    action = 'reconcileSignature';
    actionLabel = 'Recover';
    recommendation =
      'Signature or reconciliation failed. Recover from HR reconciliation without requesting a duplicate signature from a Signed winner.';
  } else if (signingStale) {
    level = V31_SYSTEM_HEALTH.LEVEL.ATTENTION;
    actionable = true;
    action = 'reconcileSignature';
    actionLabel = 'Recover';
    recommendation =
      'Signature claim went stale. HR reconciliation is required before another attempt.';
  } else if (signing) {
    level = V31_SYSTEM_HEALTH.LEVEL.RUNNING;
    actionable = false;
    action = 'none';
    actionLabel = 'In Progress';
    recommendation =
      'Signature claim is in progress. Wait for completion or re-check after the stale window.';
  } else if (recoveryFileId && !signed) {
    level = V31_SYSTEM_HEALTH.LEVEL.ATTENTION;
    actionable = true;
    action = 'reconcileSignature';
    actionLabel = 'Recover';
    recommendation =
      'Recovery file metadata exists without an authoritative Signed winner. Reconcile before discarding candidates.';
  }

  if (artifactWarning) {
    level = mergeSystemHealthLevel_(
      level,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    );
    if (!actionable && signed) {
      actionable = true;
      action = 'openCycle';
      actionLabel = 'Review Warning';
      recommendation =
        'Signed winner retained. Review the artifact warning; do not ask the participant to sign again.';
    } else if (!recommendation) {
      recommendation =
        'Signed winner retained when present. Review the artifact warning.';
    }
  }

  if (auditWarning) {
    level = mergeSystemHealthLevel_(
      level,
      V31_SYSTEM_HEALTH.LEVEL.WARNING
    );
    if (!actionable && signed) {
      actionable = true;
      action = 'openCycle';
      actionLabel = 'Review Warning';
      recommendation =
        'Signed winner retained. Review the audit warning; do not ask the participant to sign again.';
    } else if (!recommendation) {
      recommendation =
        'Signed winner retained when present. Review the audit warning.';
    }
  }

  return {
    level: level,
    actionable: actionable,
    action: action,
    actionLabel: actionLabel,
    status: status,
    lastError: lastError,
    artifactWarning: artifactWarning,
    auditWarning: auditWarning,
    reconciliationStatus: reconciliationStatus,
    attemptId: attemptId,
    startedAt: String(startedAt || ''),
    recoveryFileId: recoveryFileId,
    recommendation: recommendation,
    signed: signed,
  };
}

function getSignatureHealthRoleEntries_() {
  return [
    { role: PR.ROLE.MANAGER, label: 'Manager Signature' },
    { role: PR.ROLE.EMPLOYEE, label: 'Employee Signature' },
    { role: PR.ROLE.HR, label: 'HR Signature' },
  ];
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
    } else if (
      card.level === V31_SYSTEM_HEALTH.LEVEL.RUNNING &&
      !card.count
    ) {
      card.countLabel = 'In progress';
      card.summary = card.summary || 'Signature or send in progress';
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
    actionable: value.actionable !== false,
    itemKind: String(
      value.itemKind || V31_SYSTEM_HEALTH.ITEM_KIND.RECOVERY
    ),
    attemptId: String(value.attemptId || ''),
    startedAt: String(value.startedAt || ''),
    lastError: String(value.lastError || ''),
    recommendation: String(value.recommendation || ''),
    details: value.details || null,
    alertId: String(value.alertId || ''),
    relatedAlertId: String(value.relatedAlertId || ''),
    relatedAlertNote: String(value.relatedAlertNote || ''),
    severity: String(value.severity || ''),
    componentKey: String(value.componentKey || ''),
    role: String(value.role || ''),
    documentType: String(value.documentType || ''),
  };
}

function expectedFinalizationAuditEventId_(cycleId) {
  if (typeof getFinalizationAuditEventId_ === 'function') {
    return String(getFinalizationAuditEventId_(cycleId) || '');
  }
  return (
    String(
      (typeof V31_FINALIZATION !== 'undefined' &&
        V31_FINALIZATION.FINALIZATION_EVENT_PREFIX) ||
        'FINALIZATION_COMPLETE:'
    ) + String(cycleId || '')
  );
}

function needsFinalizationAuditAttention_(status, finalization, cycle) {
  const audit = String(finalization.finalizationAudit || '');
  if (audit === 'Delivery Unknown' || audit === 'Failed') {
    return true;
  }
  if (
    status === PR.CYCLE.FINALIZING &&
    finalization.managerPdf === V31.DELIVERY.SENT &&
    finalization.selfPdf === V31.DELIVERY.SENT &&
    finalization.distribution === V31.DELIVERY.SENT &&
    audit !== 'Complete'
  ) {
    return true;
  }
  if (status === PR.CYCLE.COMPLETE) {
    if (audit !== 'Complete') {
      return true;
    }
    const expected = expectedFinalizationAuditEventId_(
      cycle['Cycle ID']
    );
    if (
      String(finalization.finalizationAuditEventId || '') !== expected
    ) {
      return true;
    }
  }
  return false;
}

function needsPdfAttention_(status, entry) {
  if (entry.unknown || entry.status === V31.DELIVERY.FAILED) {
    return true;
  }
  if (
    status === PR.CYCLE.FINALIZING &&
    entry.status !== V31.DELIVERY.SENT
  ) {
    return true;
  }
  if (
    status === PR.CYCLE.COMPLETE &&
    entry.status !== V31.DELIVERY.SENT
  ) {
    return true;
  }
  return false;
}

function needsDistributionAttention_(status, finalization) {
  if (
    finalization.distributionUnknown ||
    finalization.distribution === V31.DELIVERY.FAILED
  ) {
    return true;
  }
  if (
    status === PR.CYCLE.FINALIZING &&
    finalization.distribution !== V31.DELIVERY.SENT &&
    finalization.managerPdf === V31.DELIVERY.SENT &&
    finalization.selfPdf === V31.DELIVERY.SENT
  ) {
    return true;
  }
  if (
    status === PR.CYCLE.COMPLETE &&
    finalization.distribution !== V31.DELIVERY.SENT
  ) {
    return true;
  }
  return false;
}

function collectSignatureRecoveryItems_(cycle, options) {
  const includeDetails = !!(options && options.includeDetails);
  const cycleId = String(cycle['Cycle ID'] || '');
  const employeeName = String(cycle['Employee Name'] || cycleId);
  const items = [];

  getSignatureHealthRoleEntries_().forEach(function (entry) {
    const classification = classifySignatureHealth_(cycle, entry.role);
    if (classification.level === V31_SYSTEM_HEALTH.LEVEL.HEALTHY) {
      return;
    }
    const warningParts = [];
    if (classification.artifactWarning) {
      warningParts.push(
        'Artifact warning: ' + classification.artifactWarning
      );
    }
    if (classification.auditWarning) {
      warningParts.push(
        'Audit warning: ' + classification.auditWarning
      );
    }
    items.push(
      createRecoveryItem_({
        id: 'signature:' + entry.role + ':' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'signatures',
        component: entry.label,
        role: entry.role,
        status: classification.status || 'Warning',
        level: classification.level,
        actionable: classification.actionable,
        action: classification.action,
        actionLabel: classification.actionLabel,
        attemptId: classification.attemptId,
        startedAt: classification.startedAt,
        lastError:
          classification.lastError ||
          classification.artifactWarning ||
          classification.auditWarning ||
          '',
        recommendation: classification.recommendation,
        details: includeDetails
          ? {
              artifactWarning: classification.artifactWarning,
              auditWarning: classification.auditWarning,
              reconciliationStatus:
                classification.reconciliationStatus,
              recoveryFileId: classification.recoveryFileId,
              signed: classification.signed,
              warnings: warningParts,
            }
          : null,
      })
    );
  });

  return items;
}

function collectFinalizationRecoveryItems_(cycle, options) {
  const includeDetails = !!(options && options.includeDetails);
  const status = String(cycle.Status || '');
  if (
    status !== PR.CYCLE.FINALIZING &&
    status !== PR.CYCLE.COMPLETE
  ) {
    return [];
  }

  const cycleId = String(cycle['Cycle ID'] || '');
  const employeeName = String(cycle['Employee Name'] || cycleId);
  const finalization = getFinalizationSummary_(cycle);
  const items = [];

  [
    {
      documentType: PR.TYPE.MANAGER,
      label: 'Manager PDF',
      status: finalization.managerPdf,
      unknown: finalization.managerPdfUnknown,
      attemptField: 'Manager PDF Attempt ID',
      startedField: 'Manager PDF Started At',
      errorField: 'Manager PDF Last Error',
    },
    {
      documentType: PR.TYPE.SELF,
      label: 'Self PDF',
      status: finalization.selfPdf,
      unknown: finalization.selfPdfUnknown,
      attemptField: 'Self PDF Attempt ID',
      startedField: 'Self PDF Started At',
      errorField: 'Self PDF Last Error',
    },
  ].forEach(function (entry) {
    if (!needsPdfAttention_(status, entry)) {
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
        action: entry.unknown ? 'reconcilePdf' : 'retryFinalization',
        actionLabel: entry.unknown ? 'Recover' : 'Retry PDF',
        attemptId: String(cycle[entry.attemptField] || ''),
        startedAt: String(cycle[entry.startedField] || ''),
        lastError: String(cycle[entry.errorField] || ''),
        recommendation: entry.unknown
          ? 'Reconcile the deterministic PDF candidate. Do not generate a duplicate while ambiguity remains.'
          : 'Retry finalization to resume unfinished PDF generation safely.',
        details: includeDetails
          ? {
              cycleStatus: status,
              pdfStatus: entry.status,
            }
          : null,
      })
    );
  });

  if (needsDistributionAttention_(status, finalization)) {
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
        details: includeDetails
          ? {
              recipients: finalization.distributionRecipients,
            }
          : null,
      })
    );
  }

  if (needsFinalizationAuditAttention_(status, finalization, cycle)) {
    const missingEvent =
      status === PR.CYCLE.COMPLETE &&
      String(finalization.finalizationAudit || '') === 'Complete' &&
      String(finalization.finalizationAuditEventId || '') !==
        expectedFinalizationAuditEventId_(cycleId);
    items.push(
      createRecoveryItem_({
        id: 'audit:' + cycleId,
        cycleId: cycleId,
        employeeName: employeeName,
        category: 'audit',
        component: 'Finalization Audit',
        status: missingEvent
          ? 'Complete (event missing)'
          : finalization.finalizationAudit,
        level:
          finalization.finalizationAudit === 'Delivery Unknown' ||
          missingEvent
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
          cycle['Finalization Audit Last Error'] ||
            (missingEvent
              ? 'Cycle reported a complete audit, but the deterministic audit event ID is missing or mismatched.'
              : '')
        ),
        recommendation:
          'Retry finalization so the deterministic audit event can be written. Completion requires the audit row.',
        details: includeDetails
          ? {
              eventId: finalization.finalizationAuditEventId,
              expectedEventId:
                expectedFinalizationAuditEventId_(cycleId),
              missingEvent: missingEvent,
            }
          : null,
      })
    );
  }

  return items;
}

/**
 * Cancelled cycles never generate ordinary launch/workflow recovery tasks.
 * Signature artifact/audit warnings and unresolved recovery metadata may
 * still surface when appropriate.
 */
function collectCancelledCycleHealthItems_(cycle, options) {
  return collectSignatureRecoveryItems_(cycle, options).filter(
    function (item) {
      return (
        item.level === V31_SYSTEM_HEALTH.LEVEL.WARNING ||
        item.level === V31_SYSTEM_HEALTH.LEVEL.BLOCKING ||
        item.level === V31_SYSTEM_HEALTH.LEVEL.ATTENTION
      );
    }
  );
}

function collectActiveWorkflowRecoveryItems_(cycle, options) {
  const includeDetails = !!(options && options.includeDetails);
  const items = [];
  const cycleId = String(cycle['Cycle ID'] || '');
  const employeeName = String(cycle['Employee Name'] || cycleId);
  const launch = getReviewLaunchComponentSummary_(cycle);
  const notifications = getWorkflowNotificationSummary_(cycle);
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
          details: includeDetails ? launch : null,
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
          details: includeDetails ? launch : null,
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

  return items;
}

/**
 * Pure helper: collect recovery items for one cycle row.
 * Complete cycles suppress ordinary workflow actions but keep finalization
 * and signature health. Cancelled cycles are handled separately.
 */
function collectCycleRecoveryItems_(cycle, options) {
  if (!cycle) {
    return [];
  }

  const status = String(cycle.Status || '');
  if (status === PR.CYCLE.CANCELLED) {
    return collectCancelledCycleHealthItems_(cycle, options);
  }

  const items = [];
  if (status !== PR.CYCLE.COMPLETE) {
    collectActiveWorkflowRecoveryItems_(cycle, options).forEach(
      function (item) {
        items.push(item);
      }
    );
  }

  collectSignatureRecoveryItems_(cycle, options).forEach(
    function (item) {
      items.push(item);
    }
  );

  collectFinalizationRecoveryItems_(cycle, options).forEach(
    function (item) {
      items.push(item);
    }
  );

  return items;
}

function alertMatchesRecoveryItem_(alert, item) {
  const alertCycleId = String(alert.cycleId || '');
  const itemCycleId = String(item.cycleId || '');
  if (!alertCycleId || alertCycleId !== itemCycleId) {
    return false;
  }
  const alertComponent = String(alert.component || '');
  const itemComponent = String(item.component || '');
  if (alertComponent && alertComponent === itemComponent) {
    return true;
  }
  if (
    alertComponent === 'Signature' &&
    item.category === 'signatures'
  ) {
    return true;
  }
  if (alertComponent === 'PDF' && item.category === 'pdfs') {
    return true;
  }
  if (
    alertComponent === 'Workflow Notification' &&
    item.category === 'notifications'
  ) {
    return true;
  }
  if (
    alertComponent === 'Calendar Configuration' &&
    itemComponent === 'Calendar Configuration'
  ) {
    return true;
  }
  if (
    alertComponent === 'Final Distribution' &&
    itemComponent === 'Final Distribution'
  ) {
    return true;
  }
  if (
    alertComponent === 'Review Launch' &&
    itemComponent === 'Review Launch'
  ) {
    return true;
  }
  return false;
}

function attachRelatedAlertNote_(item, alert) {
  const notificationSent =
    alert.notificationSent === true ||
    String(alert.status || '') === V31.DELIVERY.SENT;
  item.relatedAlertId = String(alert.alertId || '');
  item.relatedAlertNote = notificationSent
    ? 'Related alert: notification sent'
    : 'Related alert: ' +
      String(alert.status || 'unresolved') +
      ' incident record';
  if (!item.alertId) {
    item.alertId = String(alert.alertId || '');
  }
}

/**
 * Associate unresolved System Alerts with matching recovery items.
 * Matched alerts become metadata on the authoritative recovery row.
 * Unmatched alerts remain as incident records (not duplicate recoveries).
 */
function mergeAlertItemsIntoRecovery_(recoveryItems, alerts) {
  const items = (recoveryItems || []).slice();
  const unmatched = [];

  (alerts || []).forEach(function (alert) {
    let matched = false;
    for (let i = 0; i < items.length; i += 1) {
      if (
        items[i].itemKind !==
          V31_SYSTEM_HEALTH.ITEM_KIND.INCIDENT &&
        alertMatchesRecoveryItem_(alert, items[i])
      ) {
        attachRelatedAlertNote_(items[i], alert);
        matched = true;
        break;
      }
    }
    if (!matched) {
      unmatched.push(alert);
    }
  });

  unmatched.forEach(function (alert) {
    const severity = String(alert.severity || 'Warning');
    const level =
      severity === 'Blocking' || severity === 'Security'
        ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
        : V31_SYSTEM_HEALTH.LEVEL.WARNING;
    items.push(
      createRecoveryItem_({
        id: 'alert:' + String(alert.alertId || ''),
        cycleId: String(alert.cycleId || ''),
        employeeName: String(alert.cycleId || 'System'),
        category: 'alerts',
        component: String(alert.component || 'System Alert'),
        status: String(alert.status || ''),
        level: level,
        itemKind: V31_SYSTEM_HEALTH.ITEM_KIND.INCIDENT,
        actionable: true,
        action: 'resolveAlert',
        actionLabel: 'Resolve Alert',
        alertId: String(alert.alertId || ''),
        severity: severity,
        lastError: String(alert.lastError || ''),
        recommendation:
          'Incident record only. Resolving this alert does not repair the underlying component. Use the matching recovery action when one exists.',
        details: null,
        attemptId: '',
        startedAt: String(alert.lastOccurredAt || ''),
      })
    );
  });

  return items;
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
    if (
      item.cycleId &&
      item.itemKind !== V31_SYSTEM_HEALTH.ITEM_KIND.INCIDENT &&
      item.actionable !== false
    ) {
      cycleIds[String(item.cycleId)] = true;
    }
  });
  const actionableRecoveryCount = (recoveryItems || []).filter(
    function (item) {
      return (
        item.actionable !== false &&
        item.itemKind !== V31_SYSTEM_HEALTH.ITEM_KIND.INCIDENT &&
        item.action !== 'none'
      );
    }
  ).length;
  return {
    healthyComponents: healthyComponents,
    warnings: warnings,
    blockingIssues: blockingIssues,
    unresolvedAlerts: Number(
      (alerts && alerts.unresolvedCount) || 0
    ),
    cyclesRequiringRecovery: Object.keys(cycleIds).length,
    recoveryItemCount: actionableRecoveryCount,
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

function slimSystemHealthSummaryForCache_(summary) {
  if (!summary) return summary;
  const slim = {};
  Object.keys(summary).forEach(function (key) {
    slim[key] = summary[key];
  });
  slim.recoveryItems = (summary.recoveryItems || []).map(
    function (item) {
      const copy = {};
      Object.keys(item).forEach(function (field) {
        if (field === 'details') return;
        copy[field] = item[field];
      });
      return copy;
    }
  );
  return slim;
}

function buildSystemHealthSummaryFromRows_(
  cycles,
  automation,
  alertsData,
  checkedAt,
  options
) {
  const opts = options || {};
  const collectOptions = {
    includeDetails: opts.includeDetails === true,
  };
  const cardsMap = {};
  V31_SYSTEM_HEALTH.CARD_KEYS.forEach(function (key) {
    if (key === 'automation') return;
    cardsMap[key] = buildEmptyHealthCard_(
      key,
      buildHealthCardTitles_()[key]
    );
  });

  let recoveryItems = [];
  (cycles || []).forEach(function (cycle) {
    const items = collectCycleRecoveryItems_(cycle, collectOptions);
    items.forEach(function (item) {
      recoveryItems.push(item);
      const countIncrement =
        item.level === V31_SYSTEM_HEALTH.LEVEL.RUNNING ? 0 : 1;
      bumpHealthCard_(
        cardsMap,
        item.category,
        item.level,
        countIncrement
      );
    });
  });

  // Associate alerts only with actionable recovery rows so in-progress
  // (Running) rows cannot swallow an incident that HR still needs to see.
  const unresolvedAlerts = (alertsData && alertsData.alerts) || [];
  recoveryItems = mergeAlertItemsIntoRecovery_(
    recoveryItems.filter(function (item) {
      return item.actionable !== false && item.action !== 'none';
    }),
    unresolvedAlerts
  );

  const alertCardCount = unresolvedAlerts.length;
  if (alertCardCount) {
    let worstAlertLevel = V31_SYSTEM_HEALTH.LEVEL.WARNING;
    unresolvedAlerts.forEach(function (alert) {
      const severity = String(alert.severity || 'Warning');
      const level =
        severity === 'Blocking' || severity === 'Security'
          ? V31_SYSTEM_HEALTH.LEVEL.BLOCKING
          : V31_SYSTEM_HEALTH.LEVEL.WARNING;
      worstAlertLevel = mergeSystemHealthLevel_(worstAlertLevel, level);
    });
    cardsMap.alerts.level = mergeSystemHealthLevel_(
      cardsMap.alerts.level,
      worstAlertLevel
    );
    cardsMap.alerts.count = alertCardCount;
    cardsMap.alerts.countLabel =
      alertCardCount === 1
        ? '1 unresolved'
        : alertCardCount + ' unresolved';
    cardsMap.alerts.summary =
      alertCardCount + ' unresolved alert(s)';
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
    configurationCheck: false,
    liveProbes: false,
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
    checkedAt,
    {
      includeDetails: opts.includeDetails === true,
    }
  );
}

/**
 * HR-only: lightweight System Health summary (cached ~30s).
 * Structured recovery details are omitted from the cache; load them via
 * getSystemHealthItemDetails().
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
  const summary = slimSystemHealthSummaryForCache_(
    buildSystemHealthSummary_({
      automation: getAutomationAdminData_(),
      includeDetails: false,
    })
  );
  writeCachedSystemHealthSummary_(summary);
  return summary;
}

/**
 * HR-only: configuration / readiness check. Never called automatically.
 * Live Drive/Calendar/folder probes stay off unless Sandbox confirmation
 * options are provided (see runSystemHealthSandboxLiveProbes).
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

  const summary = slimSystemHealthSummaryForCache_(
    buildSystemHealthSummary_({
      automation: getAutomationAdminData_(),
      includeDetails: false,
    })
  );
  summary.deepCheck = true;
  summary.configurationCheck = !liveProbes;
  summary.liveProbes = liveProbes;
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
      incomplete: true,
    };
  }

  summary.readiness = {
    ok: !!(readiness && readiness.ok),
    blocking: (readiness && readiness.blocking) || [],
    warnings: (readiness && readiness.warnings) || [],
    liveProbes: liveProbes,
    liveProbesSkipped: !liveProbes,
    incomplete: !!(readiness && readiness.incomplete),
    liveProbesNote: liveProbes
      ? 'Sandbox live probes executed.'
      : 'Live Drive/Calendar/folder probes were not run. Use Sandbox Live Probes only in ENVIRONMENT=Sandbox with confirmation.',
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
  if (liveProbes) {
    summary.headline =
      summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.HEALTHY
        ? 'Sandbox Live Probes Healthy'
        : summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
        ? 'Sandbox Live Probes Found Blocking Issues'
        : 'Sandbox Live Probes Completed With Warnings';
  } else {
    summary.headline =
      summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.HEALTHY
        ? 'Configuration Check Healthy'
        : summary.overallLevel === V31_SYSTEM_HEALTH.LEVEL.BLOCKING
        ? 'Configuration Check Found Blocking Issues'
        : 'Configuration Check Completed With Warnings';
  }
  summary.deepCheckCompletedAt = new Date().toISOString();
  summary.checkedAt = summary.deepCheckCompletedAt;
  writeCachedSystemHealthSummary_(summary);
  return summary;
}

/**
 * HR-only Sandbox entrypoint for live Drive/Calendar/folder probes.
 * Production must never call this with a successful probe path.
 */
function runSystemHealthSandboxLiveProbes(options) {
  assertActiveHrDomain_();
  const settings = getSettings_();
  if (String(settings.ENVIRONMENT || '') !== 'Sandbox') {
    throw new Error(
      'Sandbox live probes are unavailable when ENVIRONMENT is not Sandbox.'
    );
  }
  const opts = options || {};
  return runSystemHealthDeepCheck({
    liveProbes: true,
    sandboxConfirmed: opts.sandboxConfirmed === true,
    confirmationToken: String(opts.confirmationToken || ''),
  });
}

/**
 * HR-only: detail payload for one recovery item or alert.
 * Rebuilds with structured details so the cached summary stays small.
 */
function getSystemHealthItemDetails(itemId) {
  assertActiveHrDomain_();
  const wanted = String(itemId || '');
  const summary = buildSystemHealthSummary_({
    automation: getAutomationAdminData_(),
    includeDetails: true,
  });
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
