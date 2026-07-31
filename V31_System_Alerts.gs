/**
 * Delivery C durable operational alerts.
 *
 * Alerts use an append-only lifecycle row. Claim and result writes use short
 * locks; MailApp is always called after the claim lock is released.
 */
const V31_SYSTEM_ALERTS = Object.freeze({
  SHEET: 'SystemAlerts',
  CONFIRMATION_TOKEN: 'SEND_CONFIRMED_RECOVERY_EMAILS',
  HEADERS: [
    'Alert ID',
    'Alert Key',
    'Created At',
    'Last Occurred At',
    'Occurrence Count',
    'Cycle ID',
    'Severity',
    'Component',
    'Status',
    'Attempt ID',
    'Started At',
    'Sent At',
    'Recipient',
    'Subject',
    'Details JSON',
    'Last Error',
    'Resolved At',
    'Resolved By',
  ],
  STATUS: {
    PENDING: 'Pending',
    SENDING: 'Sending',
    SENT: 'Sent',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
    RESOLVED: 'Resolved',
  },
});

/** Add and protect the alert sheet without changing existing rows. */
function ensureSystemAlertsDataModel_() {
  const ss = getSpreadsheet_();
  const sheet =
    ss.getSheetByName(V31_SYSTEM_ALERTS.SHEET) ||
    ss.insertSheet(V31_SYSTEM_ALERTS.SHEET);
  ensureHeaders_(sheet, V31_SYSTEM_ALERTS.HEADERS);
  formatSingleSheet_(sheet);
  protectV31Sheet_(sheet, 'System alerts - deployment owner managed');
  return sheet;
}

/** Normalize an alert key so one unresolved incident has one lifecycle. */
function buildSystemAlertKey_(cycleId, component, incident) {
  return [
    String(cycleId || 'system').trim(),
    String(component || 'General').trim(),
    String(incident || 'attention').trim(),
  ].join('|');
}

function isValidSystemAlertRecipient_(email, allowedDomain) {
  const recipient = normalizeEmail_(email);
  const domain = String(allowedDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient) &&
    !!domain &&
    recipient.endsWith('@' + domain)
  );
}

function assertValidSystemAlertRecipient_(email) {
  const settings = getSettings_();
  if (
    !isValidSystemAlertRecipient_(
      email,
      settings.ALLOWED_DOMAIN
    )
  ) {
    throw new Error(
      'SYSTEM_ALERT_RECIPIENT must be an explicit AITHERAS-domain email address.'
    );
  }
  return normalizeEmail_(email);
}

function parseSystemAlertDetails_(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

/** Merge structured details without discarding earlier incident evidence. */
function mergeSystemAlertDetails_(existing, incoming) {
  const merged = {};
  const left = existing && typeof existing === 'object' ? existing : {};
  const right = incoming && typeof incoming === 'object' ? incoming : {};
  Object.keys(left).forEach(function (key) {
    merged[key] = left[key];
  });
  Object.keys(right).forEach(function (key) {
    const next = right[key];
    if (
      merged[key] &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key]) &&
      next &&
      typeof next === 'object' &&
      !Array.isArray(next)
    ) {
      merged[key] = mergeSystemAlertDetails_(merged[key], next);
    } else {
      merged[key] = next;
    }
  });
  return merged;
}

function mergeSystemAlertOccurrence_(alert, incoming, occurredAt) {
  const merged = {};
  Object.keys(alert || {}).forEach(function (key) {
    merged[key] = alert[key];
  });
  merged['Last Occurred At'] = occurredAt;
  merged['Occurrence Count'] =
    Number(merged['Occurrence Count'] || 0) + 1;
  merged['Details JSON'] = JSON.stringify(
    mergeSystemAlertDetails_(
      parseSystemAlertDetails_(merged['Details JSON']),
      incoming || {}
    )
  );
  return merged;
}

function shouldReuseSystemAlertLifecycle_(alert, key) {
  return (
    String((alert && alert['Alert Key']) || '') === String(key) &&
    String((alert && alert.Status) || '') !==
      V31_SYSTEM_ALERTS.STATUS.RESOLVED
  );
}

function findUnresolvedSystemAlertByKey_(key) {
  if (
    !getSpreadsheet_().getSheetByName(V31_SYSTEM_ALERTS.SHEET)
  ) {
    return null;
  }
  const alerts = getAllObjects_(V31_SYSTEM_ALERTS.SHEET);
  for (let index = alerts.length - 1; index >= 0; index--) {
    if (shouldReuseSystemAlertLifecycle_(alerts[index], key)) {
      return alerts[index];
    }
  }
  return null;
}

/**
 * Upsert one unresolved alert under a short lock. A recurrence after
 * resolution appends a fresh UUID lifecycle.
 */
function upsertSystemAlert_(input) {
  const value = input || {};
  const key = String(value.alertKey || '').trim();
  if (!key) throw new Error('System alert key is required.');
  return withLock_(function () {
    if (
      !getSpreadsheet_().getSheetByName(V31_SYSTEM_ALERTS.SHEET)
    ) {
      ensureSystemAlertsDataModel_();
    }
    const existing = findUnresolvedSystemAlertByKey_(key);
    const now = new Date();
    if (existing) {
      const location = findObject_(
        V31_SYSTEM_ALERTS.SHEET,
        'Alert ID',
        existing['Alert ID']
      );
      const alert = location.object;
      const occurrence = mergeSystemAlertOccurrence_(
        alert,
        value.details || {},
        now
      );
      alert['Last Occurred At'] = occurrence['Last Occurred At'];
      alert['Occurrence Count'] = occurrence['Occurrence Count'];
      alert['Details JSON'] = occurrence['Details JSON'];
      alert['Last Error'] = String(
        value.lastError || alert['Last Error'] || ''
      );
      if (
        String(alert.Status || '') === V31_SYSTEM_ALERTS.STATUS.SENT ||
        String(alert.Status || '') === V31_SYSTEM_ALERTS.STATUS.FAILED
      ) {
        alert.Status = V31_SYSTEM_ALERTS.STATUS.PENDING;
        alert['Attempt ID'] = '';
        alert['Started At'] = '';
      }
      writeObject_(V31_SYSTEM_ALERTS.SHEET, location.rowNumber, alert);
      SpreadsheetApp.flush();
      return alert;
    }

    const settings = getSettings_();
    const recipient = assertValidSystemAlertRecipient_(
      settings.SYSTEM_ALERT_RECIPIENT
    );
    const created = {
      'Alert ID': Utilities.getUuid(),
      'Alert Key': key,
      'Created At': now,
      'Last Occurred At': now,
      'Occurrence Count': 1,
      'Cycle ID': String(value.cycleId || ''),
      Severity: String(value.severity || 'Warning'),
      Component: String(value.component || 'General'),
      Status: V31_SYSTEM_ALERTS.STATUS.PENDING,
      'Attempt ID': '',
      'Started At': '',
      'Sent At': '',
      Recipient: recipient,
      Subject: String(value.subject || 'AITHERAS system alert'),
      'Details JSON': JSON.stringify(value.details || {}),
      'Last Error': String(value.lastError || ''),
      'Resolved At': '',
      'Resolved By': '',
    };
    appendObject_(
      V31_SYSTEM_ALERTS.SHEET,
      V31_SYSTEM_ALERTS.HEADERS,
      created
    );
    SpreadsheetApp.flush();
    return created;
  });
}

function isSystemAlertClaimStale_(startedAt, staleMinutes) {
  const started = startedAt ? new Date(startedAt) : null;
  if (!started || isNaN(started.getTime())) return true;
  const minutes = Number(staleMinutes || 15);
  return Date.now() - started.getTime() > minutes * 60000;
}

/**
 * Pure planner: clean/resolved rows are skipped; unresolved actionable rows
 * are selected. Callers may constrain exact IDs for confirmed manual sends.
 */
function planSystemAlertDrain_(alerts, options) {
  const opts = options || {};
  const selectedIds = Array.isArray(opts.alertIds) ? opts.alertIds : [];
  const selected = {};
  selectedIds.forEach(function (id) {
    selected[String(id)] = true;
  });
  const staleMinutes = Number(opts.staleMinutes || 15);
  const plan = [];
  let skipped = 0;

  (alerts || []).forEach(function (alert) {
    const id = String(alert['Alert ID'] || '');
    if (selectedIds.length && !selected[id]) {
      skipped++;
      return;
    }
    const status = String(alert.Status || '');
    if (
      status === V31_SYSTEM_ALERTS.STATUS.RESOLVED ||
      status === V31_SYSTEM_ALERTS.STATUS.SENT
    ) {
      skipped++;
      return;
    }
    if (status === V31_SYSTEM_ALERTS.STATUS.UNKNOWN) {
      if (opts.allowUnknownResend === true) {
        plan.push({
          alertId: id,
          action: 'resend-unknown',
          expectedRecipient: String(alert.Recipient || ''),
        });
      } else {
        skipped++;
      }
      return;
    }
    if (status === V31_SYSTEM_ALERTS.STATUS.SENDING) {
      if (
        isSystemAlertClaimStale_(alert['Started At'], staleMinutes)
      ) {
        plan.push({
          alertId: id,
          action: 'mark-unknown',
          expectedRecipient: String(alert.Recipient || ''),
        });
      } else {
        skipped++;
      }
      return;
    }
    if (
      status === V31_SYSTEM_ALERTS.STATUS.PENDING ||
      status === V31_SYSTEM_ALERTS.STATUS.FAILED
    ) {
      plan.push({
        alertId: id,
        action: 'send',
        expectedRecipient: String(alert.Recipient || ''),
      });
    } else {
      skipped++;
    }
  });
  return { selected: plan, selectedCount: plan.length, skipped: skipped };
}

function listUnresolvedSystemAlerts_() {
  if (
    !getSpreadsheet_().getSheetByName(V31_SYSTEM_ALERTS.SHEET)
  ) {
    ensureSystemAlertsDataModel_();
  }
  recoverStaleSystemAlertClaims_();
  return getAllObjects_(V31_SYSTEM_ALERTS.SHEET).filter(function (alert) {
    return (
      String(alert.Status || '') !==
      V31_SYSTEM_ALERTS.STATUS.RESOLVED
    );
  });
}

/** Persist stale Sending as Delivery Unknown without attempting a resend. */
function recoverStaleSystemAlertClaims_() {
  return withLock_(function () {
    const alerts = getAllObjects_(V31_SYSTEM_ALERTS.SHEET);
    const staleMinutes = getSystemAlertStaleMinutes_();
    let recovered = 0;
    alerts.forEach(function (alert, index) {
      if (
        String(alert.Status || '') !==
          V31_SYSTEM_ALERTS.STATUS.SENDING ||
        !isSystemAlertClaimStale_(
          alert['Started At'],
          staleMinutes
        )
      ) {
        return;
      }
      alert.Status = V31_SYSTEM_ALERTS.STATUS.UNKNOWN;
      alert['Last Error'] =
        'Alert send claim went stale; delivery may have occurred.';
      writeObject_(
        V31_SYSTEM_ALERTS.SHEET,
        index + 2,
        alert
      );
      recovered++;
    });
    if (recovered) SpreadsheetApp.flush();
    return recovered;
  });
}

function getSystemAlertStaleMinutes_() {
  const settings = getSettings_();
  const value = Number(settings.SYSTEM_ALERT_STALE_MINUTES || 15);
  return isFinite(value) && value > 0 ? value : 15;
}

function claimSystemAlert_(
  alertId,
  allowUnknownResend,
  expectedRecipient
) {
  return withLock_(function () {
    const location = findObject_(
      V31_SYSTEM_ALERTS.SHEET,
      'Alert ID',
      alertId
    );
    const alert = location.object;
    assertValidSystemAlertRecipient_(alert.Recipient);
    if (
      expectedRecipient !== undefined &&
      normalizeEmail_(alert.Recipient) !==
        normalizeEmail_(expectedRecipient)
    ) {
      throw new Error(
        'System alert recipient changed after confirmation. Refresh and confirm again.'
      );
    }
    const status = String(alert.Status || '');
    if (
      status === V31_SYSTEM_ALERTS.STATUS.RESOLVED ||
      status === V31_SYSTEM_ALERTS.STATUS.SENT ||
      (status === V31_SYSTEM_ALERTS.STATUS.UNKNOWN &&
        allowUnknownResend !== true)
    ) {
      return { action: 'skip', alert: alert };
    }
    if (status === V31_SYSTEM_ALERTS.STATUS.SENDING) {
      if (
        isSystemAlertClaimStale_(
          alert['Started At'],
          getSystemAlertStaleMinutes_()
        )
      ) {
        alert.Status = V31_SYSTEM_ALERTS.STATUS.UNKNOWN;
        alert['Last Error'] =
          'Alert send claim went stale; delivery may have occurred.';
        writeObject_(V31_SYSTEM_ALERTS.SHEET, location.rowNumber, alert);
        SpreadsheetApp.flush();
        return { action: 'unknown', alert: alert };
      }
      return { action: 'skip', alert: alert };
    }
    const attemptId = Utilities.getUuid();
    alert.Status = V31_SYSTEM_ALERTS.STATUS.SENDING;
    alert['Attempt ID'] = attemptId;
    alert['Started At'] = new Date();
    alert['Last Error'] = '';
    writeObject_(V31_SYSTEM_ALERTS.SHEET, location.rowNumber, alert);
    SpreadsheetApp.flush();
    return {
      action: 'send',
      attemptId: attemptId,
      alert: alert,
    };
  });
}

function buildSystemAlertEmailBody_(alert) {
  return [
    'AITHERAS operational alert',
    '',
    'Severity: ' + String(alert.Severity || 'Warning'),
    'Component: ' + String(alert.Component || ''),
    'Cycle ID: ' + String(alert['Cycle ID'] || 'N/A'),
    'Occurrence count: ' + String(alert['Occurrence Count'] || 1),
    '',
    'Details:',
    String(alert['Details JSON'] || '{}'),
    '',
    'Last error:',
    String(alert['Last Error'] || ''),
  ].join('\n');
}

/** Send outside lock, then immediately commit the authoritative outcome. */
function sendClaimedSystemAlert_(claim) {
  let error = null;
  try {
    MailApp.sendEmail({
      to: String(claim.alert.Recipient || ''),
      subject: String(claim.alert.Subject || 'AITHERAS system alert'),
      body: buildSystemAlertEmailBody_(claim.alert),
      name: PR.SETTINGS_DEFAULTS.APP_NAME || 'AITHERAS HR',
    });
  } catch (sendError) {
    error = sendError;
  }

  const committed = withLock_(function () {
    const location = findObject_(
      V31_SYSTEM_ALERTS.SHEET,
      'Alert ID',
      claim.alert['Alert ID']
    );
    const alert = location.object;
    if (
      String(alert['Attempt ID'] || '') !== String(claim.attemptId)
    ) {
      return false;
    }
    const outcome = classifySystemAlertSendOutcome_(
      error,
      true
    );
    if (outcome === V31_SYSTEM_ALERTS.STATUS.UNKNOWN) {
      alert.Status = outcome;
      alert['Last Error'] = String(error.message || error);
    } else {
      alert.Status = outcome;
      alert['Sent At'] = new Date();
      alert['Last Error'] = '';
    }
    writeObject_(V31_SYSTEM_ALERTS.SHEET, location.rowNumber, alert);
    SpreadsheetApp.flush();
    return true;
  });
  return {
    action: error || !committed ? 'unknown' : 'sent',
    error: error ? String(error.message || error) : '',
  };
}

function classifySystemAlertSendOutcome_(error, committed) {
  return error || committed === false
    ? V31_SYSTEM_ALERTS.STATUS.UNKNOWN
    : V31_SYSTEM_ALERTS.STATUS.SENT;
}

function executeSystemAlertDrainPlan_(plan) {
  const result = { sent: 0, deliveryUnknown: 0, skipped: 0, results: [] };
  (plan.selected || []).forEach(function (item) {
    const claim = claimSystemAlert_(
      item.alertId,
      item.action === 'resend-unknown',
      item.expectedRecipient
    );
    if (claim.action === 'send') {
      const sent = sendClaimedSystemAlert_(claim);
      result.results.push({
        alertId: item.alertId,
        action: sent.action,
      });
      if (sent.action === 'sent') result.sent++;
      else result.deliveryUnknown++;
    } else if (claim.action === 'unknown') {
      result.deliveryUnknown++;
    } else {
      result.skipped++;
    }
  });
  return result;
}

/** Automatic drain is a no-op unless the authoritative mode is Live. */
function drainSystemAlertsAutomatically_() {
  const settings = getSettings_();
  if (!canAutoDrainSystemAlerts_(settings.AUTOMATION_MODE)) {
    return { blocked: true, sent: 0, deliveryUnknown: 0 };
  }
  const alerts = listUnresolvedSystemAlerts_();
  const plan = planSystemAlertDrain_(alerts, {
    staleMinutes: getSystemAlertStaleMinutes_(),
  });
  return executeSystemAlertDrainPlan_(plan);
}

function canAutoDrainSystemAlerts_(mode) {
  return String(mode || 'Preview') === 'Live';
}

function isSystemRecoveryConfirmationValid_(payload) {
  const value = payload || {};
  return (
    value.confirmed === true &&
    String(value.confirmationToken || '') ===
      V31_SYSTEM_ALERTS.CONFIRMATION_TOKEN
  );
}

function canManualRecoverySend_(isAllowedDomain, isActiveHr, payload) {
  return (
    isAllowedDomain === true &&
    isActiveHr === true &&
    isSystemRecoveryConfirmationValid_(payload)
  );
}

function assertSystemRecoveryConfirmation_(payload) {
  if (!isSystemRecoveryConfirmationValid_(payload)) {
    throw new Error(
      'Exact recovery-email confirmation is required.'
    );
  }
}

function assertActiveHrDomain_() {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();
  assertDomain_(email, settings.ALLOWED_DOMAIN);
  if (!isHrUser_(email)) {
    throw new Error('Only active HR may perform this recovery action.');
  }
  return email;
}

/** Minimal HR alert list used by Administration. */
function getSystemAlertsAdminData() {
  assertActiveHrDomain_();
  const alerts = listUnresolvedSystemAlerts_();
  return {
    unresolvedCount: alerts.length,
    alerts: alerts.map(function (alert) {
      return {
        alertId: String(alert['Alert ID'] || ''),
        alertKey: String(alert['Alert Key'] || ''),
        cycleId: String(alert['Cycle ID'] || ''),
        severity: String(alert.Severity || ''),
        component: String(alert.Component || ''),
        status: String(alert.Status || ''),
        occurrenceCount: Number(alert['Occurrence Count'] || 0),
        recipient: String(alert.Recipient || ''),
        subject: String(alert.Subject || ''),
        lastError: String(alert['Last Error'] || ''),
        details: parseSystemAlertDetails_(alert['Details JSON']),
      };
    }),
  };
}

/**
 * HR-confirmed manual alert drain. Only the exact selected IDs and count are
 * accepted, including in Preview/Paused.
 */
function drainSystemAlertsNow(payload) {
  const actor = assertActiveHrDomain_();
  assertSystemRecoveryConfirmation_(payload);
  const input = payload || {};
  const ids = Array.isArray(input.alertIds)
    ? input.alertIds.map(String)
    : [];
  const expectedCount = Number(input.componentCount);
  if (!ids.length || expectedCount !== ids.length) {
    throw new Error('Selected alert IDs and component count must match.');
  }
  const alerts = listUnresolvedSystemAlerts_();
  const recipientsById = {};
  alerts.forEach(function (alert) {
    recipientsById[String(alert['Alert ID'] || '')] =
      String(alert.Recipient || '');
  });
  const currentRecipients = ids.map(function (id) {
    return recipientsById[id] || '';
  });
  if (
    JSON.stringify(input.recipients || []) !==
    JSON.stringify(currentRecipients)
  ) {
    throw new Error(
      'Selected alert recipients changed. Refresh and confirm again.'
    );
  }
  const plan = planSystemAlertDrain_(alerts, {
    alertIds: ids,
    staleMinutes: getSystemAlertStaleMinutes_(),
    allowUnknownResend: input.allowUnknownResend === true,
  });
  if (plan.selectedCount !== expectedCount) {
    throw new Error(
      'Selected alerts changed. Refresh the list and confirm again.'
    );
  }
  const result = executeSystemAlertDrainPlan_(plan);
  audit_(
    '',
    'System alerts manually drained',
    actor,
    '',
    result.deliveryUnknown ? 'Partial' : 'Success',
    JSON.stringify({
      alertIds: ids,
      componentCount: expectedCount,
      recipients: currentRecipients,
    })
  );
  return result;
}

function validateSystemAlertResolutionPolicy_(severity, reason) {
  const normalized = String(severity || '').toLowerCase();
  const required =
    normalized === 'blocking' || normalized === 'security';
  if (required && !String(reason || '').trim()) {
    return { allowed: false, reasonRequired: true };
  }
  return { allowed: true, reasonRequired: required };
}

function isManualSystemAlertResolutionAuthorized_(
  isAllowedDomain,
  isActiveHr,
  severity,
  reason
) {
  return (
    isAllowedDomain === true &&
    isActiveHr === true &&
    validateSystemAlertResolutionPolicy_(severity, reason).allowed
  );
}

function applySystemAlertResolution_(alert, actor, reason, resolvedAt) {
  const resolved = {};
  Object.keys(alert || {}).forEach(function (key) {
    resolved[key] = alert[key];
  });
  resolved.Status = V31_SYSTEM_ALERTS.STATUS.RESOLVED;
  resolved['Resolved At'] = resolvedAt || new Date();
  resolved['Resolved By'] = String(actor || '');
  resolved['Details JSON'] = JSON.stringify(
    mergeSystemAlertDetails_(
      parseSystemAlertDetails_(resolved['Details JSON']),
      reason ? { resolutionReason: String(reason).trim() } : {}
    )
  );
  return resolved;
}

function resolveSystemAlertCore_(alertId, actor, reason) {
  return withLock_(function () {
    const location = findObject_(
      V31_SYSTEM_ALERTS.SHEET,
      'Alert ID',
      alertId
    );
    const alert = location.object;
    if (String(alert.Status || '') === V31_SYSTEM_ALERTS.STATUS.RESOLVED) {
      return alert;
    }
    const policy = validateSystemAlertResolutionPolicy_(
      alert.Severity,
      reason
    );
    if (!policy.allowed) {
      throw new Error(
        'A resolution reason is required for Blocking or Security alerts.'
      );
    }
    const resolved = applySystemAlertResolution_(
      alert,
      actor,
      reason,
      new Date()
    );
    writeObject_(
      V31_SYSTEM_ALERTS.SHEET,
      location.rowNumber,
      resolved
    );
    SpreadsheetApp.flush();
    return resolved;
  });
}

/** Public manual resolution is HR-authorized and audited. */
function resolveSystemAlert(alertId, payload) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  const resolved = resolveSystemAlertCore_(
    String(alertId || ''),
    actor,
    String(input.reason || '')
  );
  audit_(
    resolved['Cycle ID'] || '',
    'System alert manually resolved',
    actor,
    String(resolved['Alert Key'] || ''),
    V31_SYSTEM_ALERTS.STATUS.RESOLVED,
    JSON.stringify({
      alertId: resolved['Alert ID'],
      reason: String(input.reason || ''),
    })
  );
  return { ok: true, alertId: resolved['Alert ID'] };
}

/** Resolve only after an authoritative matching recovery succeeds. */
function autoResolveSystemAlertByKey_(alertKey, verifyRecovery) {
  return withLock_(function () {
    const alert = findUnresolvedSystemAlertByKey_(alertKey);
    if (!alert) return null;
    if (
      typeof verifyRecovery === 'function' &&
      verifyRecovery(alert) !== true
    ) {
      return null;
    }
    const location = findObject_(
      V31_SYSTEM_ALERTS.SHEET,
      'Alert ID',
      alert['Alert ID']
    );
    const resolved = applySystemAlertResolution_(
      location.object,
      'System',
      'Authoritative matching recovery succeeded.',
      new Date()
    );
    writeObject_(
      V31_SYSTEM_ALERTS.SHEET,
      location.rowNumber,
      resolved
    );
    SpreadsheetApp.flush();
    return resolved;
  });
}

function safelyAutoResolveSystemAlertByKey_(
  alertKey,
  verifyRecovery
) {
  try {
    return autoResolveSystemAlertByKey_(
      alertKey,
      verifyRecovery
    );
  } catch (error) {
    Logger.log(
      'System alert auto-resolution failed for ' +
        String(alertKey || '') +
        ': ' +
        String(error.message || error)
    );
    return null;
  }
}

function recordWorkflowDeliveryUnknownAlert_(cycleId, componentKey, details) {
  return upsertSystemAlert_({
    alertKey: buildSystemAlertKey_(
      cycleId,
      'Workflow Notification',
      componentKey + ':delivery-unknown'
    ),
    cycleId: cycleId,
    severity: 'Blocking',
    component: 'Workflow Notification',
    subject: 'AITHERAS workflow email delivery requires reconciliation',
    details: mergeSystemAlertDetails_(
      { componentKey: componentKey },
      details || {}
    ),
    lastError: String((details && details.error) || ''),
  });
}

function safelyRecordWorkflowDeliveryUnknownAlert_(
  cycleId,
  componentKey,
  details
) {
  try {
    return recordWorkflowDeliveryUnknownAlert_(
      cycleId,
      componentKey,
      details
    );
  } catch (error) {
    Logger.log(
      'Workflow Delivery Unknown alert persistence failed: ' +
        String(error.message || error)
    );
    return null;
  }
}

function recordSignatureWarningAlert_(cycleId, role, warningType, warning) {
  return upsertSystemAlert_({
    alertKey: buildSystemAlertKey_(
      cycleId,
      'Signature',
      role + ':' + warningType
    ),
    cycleId: cycleId,
    severity: warningType === 'audit' ? 'Warning' : 'Blocking',
    component: 'Signature',
    subject: 'AITHERAS signature recovery warning',
    details: {
      role: role,
      warningType: warningType,
      warning: String(warning || ''),
    },
    lastError: String(warning || ''),
  });
}

function safelyRecordSignatureWarningAlert_(
  cycleId,
  role,
  warningType,
  warning
) {
  try {
    return recordSignatureWarningAlert_(
      cycleId,
      role,
      warningType,
      warning
    );
  } catch (error) {
    Logger.log(
      'Signature warning alert persistence failed: ' +
        String(error.message || error)
    );
    return null;
  }
}
