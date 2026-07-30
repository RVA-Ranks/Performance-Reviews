/**
 * AITHERAS Performance Review Portal V3.1
 * Automation, calendar, compensation-task, and guided-help services.
 *
 * Important:
 * - V3.1 defaults to Preview mode.
 * - No automatic review cycles are created until HR enables Live mode.
 * - The daily trigger runs as the account that installs it.
 */

const V31 = Object.freeze({
  VERSION: '3.1',
  AUTOMATION_SHEET: 'ReviewAutomationLog',
  SENDING_STALE_MS: 15 * 60 * 1000,
  CALENDAR_MARKER_PREFIX: '[AITHERAS_REVIEW_CYCLE_ID:',

  SETTINGS_DEFAULTS: {
    AUTOMATION_MODE: 'Preview',
    REVIEW_NOTICE_DAYS: '28',
    FORM_DUE_DAYS_BEFORE_MEETING: '7',
    AUTOMATION_TRIGGER_HOUR: '8',
    REVIEW_EVENT_START_HOUR: '12',
    REVIEW_EVENT_DURATION_MINUTES: '60',
    SHIFT_WEEKEND_MEETINGS: 'TRUE',
    CALENDAR_ID: 'primary',
    EVENT_EMAIL_REMINDER_DAYS: '7',
    EVENT_POPUP_REMINDER_HOURS: '24',
    COMPENSATION_ADJUSTMENT_URL: '',
    COMPENSATION_DECISION_REQUIRED: 'TRUE',
    HELP_CENTER_ENABLED: 'TRUE',
    AUTOMATION_LAST_RUN: '',
  },

  ASSIGNMENT_HEADERS: [
    'Review Automation',
  ],

  CYCLE_HEADERS: [
    'Cycle Source',
    'Automation Key',
    'Automation Notice Sent At',
    'Manager Due Date',
    'Employee Due Date',
    'Calendar Status',
    'Calendar Event ID',
    'Calendar Created At',
    'Calendar Attempt ID',
    'Calendar Started At',
    'Manager Email Status',
    'Manager Email Sent At',
    'Manager Email Attempt ID',
    'Manager Email Started At',
    'Employee Email Status',
    'Employee Email Sent At',
    'Employee Email Attempt ID',
    'Employee Email Started At',
    'HR Email Status',
    'HR Email Sent At',
    'HR Email Attempt ID',
    'HR Email Started At',
    'Launch Completed At',
    'Last Launch Error',
    'Launch Attempt Count',
    'Manager PDF Status',
    'Manager PDF Attempt ID',
    'Manager PDF Started At',
    'Self PDF Status',
    'Self PDF Attempt ID',
    'Self PDF Started At',
    'Final Distribution Status',
    'Final Distribution Started At',
    'Final Distribution Sent At',
    'Finalization Last Error',
    'Finalization Attempt Count',
    'Compensation Decision',
    'Compensation Decision Notes',
    'Compensation Decision At',
    'Compensation Decision By',
  ],

  LOG_HEADERS: [
    'Timestamp',
    'Mode',
    'Action',
    'Employee Email',
    'Employee Name',
    'Review Type',
    'Review Date',
    'Cycle ID',
    'Result',
    'Details',
  ],

  COMPENSATION: {
    PENDING: 'Pending',
    ADJUSTMENT: 'Adjustment Submitted',
    NONE: 'No Adjustment Recommended',
  },

  DELIVERY: {
    PENDING: 'Pending',
    SENDING: 'Sending',
    SENT: 'Sent',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
  },

  CALENDAR: {
    PENDING: 'Pending',
    CREATING: 'Creating',
    CREATED: 'Created',
    CONFIGURING: 'Configuring',
    CONFIGURED: 'Configured',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
  },
});

/* =========================== DATA MODEL / UPGRADE ======================== */

function upgradeToV31() {
  ensureV31DataModel_();

  SpreadsheetApp.getUi().alert(
    'V3.1 upgrade complete.\n\n' +
      'Automation is in Preview mode and has not sent anything.\n\n' +
      'Next:\n' +
      '1. Open the web app as HR.\n' +
      '2. Go to Administration → Review Automation.\n' +
      '3. Add the Compensation Adjustment app URL.\n' +
      '4. Preview upcoming reviews.\n' +
      '5. Enable Live Automation only after the preview is correct.'
  );
}

function ensureV31DataModel_() {
  const ss = getSpreadsheet_();
  const settingsSheet = ss.getSheetByName(PR.SHEETS.SETTINGS);
  const assignments = ss.getSheetByName(PR.SHEETS.ASSIGNMENTS);
  const cycles = ss.getSheetByName(PR.SHEETS.CYCLES);
  const log =
    ss.getSheetByName(V31.AUTOMATION_SHEET) ||
    ss.insertSheet(V31.AUTOMATION_SHEET);

  ensureHeaders_(settingsSheet, ['Key', 'Value']);
  ensureHeaders_(assignments, V31.ASSIGNMENT_HEADERS);
  ensureHeaders_(cycles, V31.CYCLE_HEADERS);
  ensureHeaders_(log, V31.LOG_HEADERS);

  const current = readSettings_(settingsSheet);

  Object.keys(V31.SETTINGS_DEFAULTS).forEach(function (key) {
    if (!(key in current)) {
      settingsSheet.appendRow([
        key,
        V31.SETTINGS_DEFAULTS[key],
      ]);
    }
  });

  const assignmentHeaders = getHeaders_(assignments);
  const automationColumn =
    assignmentHeaders.indexOf('Review Automation') + 1;
  const activeColumn =
    assignmentHeaders.indexOf('Active') + 1;

  if (
    automationColumn > 0 &&
    assignments.getMaxRows() > 1
  ) {
    const rowCount = assignments.getMaxRows() - 1;
    const automationRange = assignments.getRange(
      2,
      automationColumn,
      rowCount,
      1
    );

    automationRange.insertCheckboxes();

    if (activeColumn > 0) {
      const automationValues =
        automationRange.getValues();
      const activeValues = assignments
        .getRange(2, activeColumn, rowCount, 1)
        .getValues();
      let changed = false;

      for (let row = 0; row < rowCount; row++) {
        const active =
          activeValues[row][0] === true ||
          String(activeValues[row][0]).toLowerCase() ===
            'true';

        if (
          active &&
          (automationValues[row][0] === '' ||
            automationValues[row][0] == null)
        ) {
          automationValues[row][0] = true;
          changed = true;
        }
      }

      if (changed) {
        automationRange.setValues(
          automationValues
        );
      }
    }
  }

  formatSingleSheet_(log);
  protectV31Sheet_(log);
}

function formatSingleSheet_(sheet) {
  if (!sheet) return;

  const columns = Math.max(sheet.getLastColumn(), 1);

  sheet
    .getRange(1, 1, 1, columns)
    .setFontWeight('bold')
    .setBackground('#5b128b')
    .setFontColor('#ffffff');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(columns, 12));
}

function protectV31Sheet_(sheet) {
  if (
    sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    ).length
  ) {
    return;
  }

  const protection = sheet
    .protect()
    .setDescription('Review automation log - HR managed');

  try {
    const owner = Session.getEffectiveUser();

    protection.addEditor(owner);
    protection.removeEditors(
      protection.getEditors().filter(function (user) {
        return user.getEmail() !== owner.getEmail();
      })
    );

    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (error) {
    console.log(
      'Could not fully protect automation log: ' +
        error.message
    );
  }
}

/* ============================= BOOTSTRAP ================================= */

function getV31BootstrapData_(email, isHr) {
  ensureV31DataModel_();

  const settings = getSettings_();
  const normalized = normalizeEmail_(email);
  const isManager = getActiveAssignments_().some(
    function (assignment) {
      return (
        normalizeEmail_(assignment.managerEmail) ===
        normalized
      );
    }
  );
  const mayViewCompensation = isHr || isManager;

  return {
    version: V31.VERSION,
    compensationAdjustmentUrl:
      mayViewCompensation
        ? String(
            settings.COMPENSATION_ADJUSTMENT_URL || ''
          )
        : '',
    compensationDecisionRequired:
      mayViewCompensation
        ? v31Boolean_(
            settings.COMPENSATION_DECISION_REQUIRED,
            true
          )
        : false,
    helpCenterEnabled:
      v31Boolean_(settings.HELP_CENTER_ENABLED, true),
    automation: isHr
      ? getAutomationAdminData_()
      : null,
  };
}

function getV31CycleData_(cycle, email, isHr) {
  const settings = getSettings_();
  const isManager =
    normalizeEmail_(cycle['Manager Email']) ===
    normalizeEmail_(email);
  const isEmployee =
    normalizeEmail_(cycle['Employee Email']) ===
    normalizeEmail_(email);

  const compensationRequired =
    v31Boolean_(
      settings.COMPENSATION_DECISION_REQUIRED,
      true
    );
  const decision =
    String(
      cycle['Compensation Decision'] ||
        V31.COMPENSATION.PENDING
    );
  const compensationComplete =
    !compensationRequired ||
    [
      V31.COMPENSATION.ADJUSTMENT,
      V31.COMPENSATION.NONE,
    ].includes(decision);

  const meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );
  const daysUntilMeeting = meetingDate
    ? v31DaysBetween_(v31Today_(), meetingDate)
    : null;

  return {
    cycleSource: String(cycle['Cycle Source'] || 'Manual'),
    automationKey: String(cycle['Automation Key'] || ''),
    noticeSentAt: formatDateTime_(
      cycle['Automation Notice Sent At']
    ),
    managerDueDate: formatDate_(
      cycle['Manager Due Date']
    ),
    employeeDueDate: formatDate_(
      cycle['Employee Due Date']
    ),
    calendarEventId: String(
      cycle['Calendar Event ID'] || ''
    ),
    calendarCreatedAt: formatDateTime_(
      cycle['Calendar Created At']
    ),
    calendarStatus: String(
      cycle['Calendar Status'] || ''
    ),
    managerEmailSentAt: formatDateTime_(
      cycle['Manager Email Sent At']
    ),
    employeeEmailSentAt: formatDateTime_(
      cycle['Employee Email Sent At']
    ),
    hrEmailSentAt: formatDateTime_(
      cycle['HR Email Sent At']
    ),
    launchCompletedAt: formatDateTime_(
      cycle['Launch Completed At']
    ),
    lastLaunchError: isHr
      ? String(cycle['Last Launch Error'] || '')
      : '',
    launchAttemptCount: isHr
      ? Number(cycle['Launch Attempt Count'] || 0)
      : 0,
    launchComplete: isReviewLaunchComplete_(cycle),
    launchComponents: isHr
      ? getReviewLaunchComponentSummary_(cycle)
      : null,
    launchHasUnknownDelivery: isHr
      ? getReviewLaunchComponentSummary_(cycle).hasUnknown
      : false,
    calendarConfigWarning: isHr
      ? hasCalendarConfigWarning_(cycle)
      : false,
    finalization: isHr
      ? getFinalizationSummary_(cycle)
      : null,
    needsFinalizationRetry:
      isHr &&
      String(cycle['Status']) === PR.CYCLE.FINALIZING,
    daysUntilMeeting: daysUntilMeeting,

    compensationRequired:
      isManager || isHr
        ? compensationRequired
        : false,
    compensationDecision:
      isManager || isHr
        ? decision
        : '',
    compensationDecisionNotes:
      isManager || isHr
        ? String(
            cycle['Compensation Decision Notes'] || ''
          )
        : '',
    compensationDecisionAt:
      isManager || isHr
        ? formatDateTime_(
            cycle['Compensation Decision At']
          )
        : '',
    compensationDecisionBy:
      isManager || isHr
        ? String(
            cycle['Compensation Decision By'] || ''
          )
        : '',
    compensationComplete:
      isManager || isHr
        ? compensationComplete
        : true,
    compensationActionRequired:
      isManager &&
      compensationRequired &&
      !compensationComplete &&
      String(cycle['Status']) !== PR.CYCLE.COMPLETE,
    canManageCompensation:
      (isManager || isHr) &&
      String(cycle['Status']) !== PR.CYCLE.COMPLETE,
    compensationAdjustmentUrl:
      isManager || isHr
        ? String(
            settings.COMPENSATION_ADJUSTMENT_URL || ''
          )
        : '',

    guidance: buildV31Guidance_(
      cycle,
      email,
      isHr,
      isManager,
      isEmployee,
      compensationComplete
    ),
  };
}

function isV31CompensationComplete_(cycle) {
  const settings = getSettings_();

  if (
    !v31Boolean_(
      settings.COMPENSATION_DECISION_REQUIRED,
      true
    )
  ) {
    return true;
  }

  return [
    V31.COMPENSATION.ADJUSTMENT,
    V31.COMPENSATION.NONE,
  ].includes(
    String(
      cycle['Compensation Decision'] ||
        V31.COMPENSATION.PENDING
    )
  );
}

function buildV31Guidance_(
  cycle,
  email,
  isHr,
  isManager,
  isEmployee,
  compensationComplete
) {
  const status = String(cycle['Status']);
  const items = [];

  if (status === PR.CYCLE.OPEN) {
    if (
      isManager &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Manager Review Status'])
      )
    ) {
      items.push({
        tone: 'info',
        title: 'Complete the manager review',
        message:
          'Rate each factor, add specific examples, and submit the review before ' +
          (formatDate_(cycle['Manager Due Date']) ||
            'the review meeting') +
          '. The employee cannot see your responses yet.',
        action: 'manager-review',
        actionLabel: 'Continue Manager Review',
      });
    }

    if (
      isEmployee &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Self Evaluation Status'])
      )
    ) {
      items.push({
        tone: 'info',
        title: 'Complete your self-evaluation',
        message:
          'Reflect on accomplishments, growth areas, and goals before ' +
          (formatDate_(cycle['Employee Due Date']) ||
            'the review meeting') +
          '. Your manager cannot see your responses yet.',
        action: 'self-evaluation',
        actionLabel: 'Continue Self-Evaluation',
      });
    }

    if (isManager && !compensationComplete) {
      items.push({
        tone: 'warning',
        title: 'Compensation decision required',
        message:
          'Open the Compensation Adjustment workflow and then record whether an adjustment was submitted or no adjustment is recommended.',
        action: 'compensation',
        actionLabel: 'Review Compensation',
      });
    }

    if (isHr) {
      items.push({
        tone: 'info',
        title: 'Independent preparation is underway',
        message:
          'The manager and employee are completing separate evaluations. Their responses remain private from each other until both submit and the meeting opens.',
        action: 'overview',
        actionLabel: 'View Status',
      });
    }
  }

  if (status === PR.CYCLE.READY) {
    items.push({
      tone: 'success',
      title: 'Both evaluations are ready',
      message:
        'Open the review meeting only when the manager and employee are beginning the actual discussion. Opening it makes both evaluations visible.',
      action: 'meeting',
      actionLabel: 'Open Meeting Workspace',
    });
  }

  if (status === PR.CYCLE.MEETING) {
    items.push({
      tone: 'info',
      title: 'Use the meeting workspace',
      message:
        'Discuss rating differences, confirm goals and action steps, and give the employee an opportunity to add comments before finalizing the packet.',
      action: 'meeting',
      actionLabel: 'Continue Meeting',
    });

    if (!compensationComplete && (isManager || isHr)) {
      items.push({
        tone: 'warning',
        title: 'Compensation decision is still pending',
        message:
          'A compensation decision must be recorded before the review packet can be released for signature.',
        action: 'compensation',
        actionLabel: 'Complete Compensation Decision',
      });
    }
  }

  if (status === PR.CYCLE.SIGNATURES) {
    items.push({
      tone: 'warning',
      title: 'The review packet is locked',
      message:
        'The manager and employee each sign once. HR signs last after both participants. The same signatures are placed on both final documents.',
      action: 'signature',
      actionLabel: 'View Signature Status',
    });
  }

  if (status === PR.CYCLE.FINALIZING) {
    items.push({
      tone: isHr ? 'warning' : 'info',
      title: isHr
        ? 'Final documents still preparing'
        : 'Final documents are preparing',
      message: isHr
        ? 'Signatures are complete. Retry finalization to resume PDF generation and packet distribution. Complete is set only after both PDFs and Sent distribution.'
        : 'Signatures are complete. Final PDFs and distribution are still preparing. You will receive the completed packet by email when ready.',
      action: 'overview',
      actionLabel: isHr ? 'Retry Final Documents' : 'View Status',
    });
  }

  if (isHr && !isReviewLaunchComplete_(cycle)) {
    items.push({
      tone: 'warning',
      title: 'Launch is incomplete',
      message: describeReviewLaunchStatus_(cycle),
      action: 'overview',
      actionLabel: 'Retry Launch',
    });
  } else if (isHr && hasCalendarConfigWarning_(cycle)) {
    items.push({
      tone: 'warning',
      title: 'Calendar event is not fully configured',
      message:
        'The shared calendar event exists, but tags/reminders are not Configured yet. Launch emails may already be complete. Use Retry Launch to finish calendar configuration without duplicating Sent emails.' +
        (isCalendarConfigWarning_(cycle['Last Launch Error'])
          ? ' Last error: ' +
            String(cycle['Last Launch Error'])
          : ''),
      action: 'overview',
      actionLabel: 'Retry Calendar Config',
    });
  }

  if (status === PR.CYCLE.COMPLETE) {
    items.push({
      tone: 'success',
      title: 'Review complete',
      message:
        'The signed manager review and self-evaluation are available in the Signatures tab and were emailed to the participants and HR.',
      action: 'signatures',
      actionLabel: 'View Final Documents',
    });
  }

  return items;
}

/* =========================== COMPENSATION TASK =========================== */

function recordCompensationDecision(
  cycleId,
  decision,
  notes
) {
  return withLock_(function () {
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(cycle['Manager Email']) === email;

    if (!isHr && !isManager) {
      throw new Error(
        'Only the assigned manager or HR may record the compensation decision.'
      );
    }

    const allowed = [
      V31.COMPENSATION.ADJUSTMENT,
      V31.COMPENSATION.NONE,
    ];

    if (
      decision === V31.COMPENSATION.PENDING &&
      isHr
    ) {
      // HR may reset a mistaken selection.
    } else if (!allowed.includes(decision)) {
      throw new Error(
        'Choose Adjustment Submitted or No Adjustment Recommended.'
      );
    }

    const previous = String(
      cycle['Compensation Decision'] ||
        V31.COMPENSATION.PENDING
    );

    cycle['Compensation Decision'] = decision;
    cycle['Compensation Decision Notes'] =
      cleanText_(notes);
    cycle['Compensation Decision At'] =
      decision === V31.COMPENSATION.PENDING
        ? ''
        : new Date();
    cycle['Compensation Decision By'] =
      decision === V31.COMPENSATION.PENDING
        ? ''
        : email;
    cycle['Updated At'] = new Date();

    writeCycle_(location.rowNumber, cycle);

    audit_(
      cycleId,
      'Compensation decision recorded',
      email,
      previous,
      decision,
      cleanText_(notes)
    );

    return {
      ok: true,
      decision: decision,
      message:
        decision === V31.COMPENSATION.ADJUSTMENT
          ? 'Compensation adjustment marked as submitted.'
          : decision === V31.COMPENSATION.NONE
          ? 'No compensation adjustment recommended.'
          : 'Compensation decision reset.',
    };
  });
}

/* ============================ AUTOMATION ADMIN =========================== */

function getReviewAutomationAdminData() {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may access review automation settings.'
    );
  }

  return getAutomationAdminData_();
}

function getAutomationAdminData_() {
  const settings = getSettings_();

  return {
    mode: String(settings.AUTOMATION_MODE || 'Preview'),
    noticeDays: Number(settings.REVIEW_NOTICE_DAYS || 28),
    formDueDays: Number(
      settings.FORM_DUE_DAYS_BEFORE_MEETING || 7
    ),
    triggerHour: Number(
      settings.AUTOMATION_TRIGGER_HOUR || 8
    ),
    eventStartHour: Number(
      settings.REVIEW_EVENT_START_HOUR || 12
    ),
    eventDurationMinutes: Number(
      settings.REVIEW_EVENT_DURATION_MINUTES || 60
    ),
    shiftWeekendMeetings:
      v31Boolean_(
        settings.SHIFT_WEEKEND_MEETINGS,
        true
      ),
    calendarId: String(settings.CALENDAR_ID || 'primary'),
    eventEmailReminderDays: Number(
      settings.EVENT_EMAIL_REMINDER_DAYS || 7
    ),
    eventPopupReminderHours: Number(
      settings.EVENT_POPUP_REMINDER_HOURS || 24
    ),
    compensationAdjustmentUrl: String(
      settings.COMPENSATION_ADJUSTMENT_URL || ''
    ),
    compensationDecisionRequired:
      v31Boolean_(
        settings.COMPENSATION_DECISION_REQUIRED,
        true
      ),
    triggerInstalled:
      hasReviewAutomationTrigger_(),
    lastRun: String(settings.AUTOMATION_LAST_RUN || ''),
    preview: findReviewAutomationCandidates_(
      Number(settings.REVIEW_NOTICE_DAYS || 28)
    ).slice(0, 20),
  };
}

function saveReviewAutomationSettings(payload) {
  return withLock_(function () {
    const email = getCurrentUserEmail_();

    if (!isHrUser_(email)) {
      throw new Error(
        'Only HR may change review automation settings.'
      );
    }

    const settingsSheet = getSpreadsheet_().getSheetByName(
      PR.SHEETS.SETTINGS
    );

    const noticeDays = v31Integer_(
      payload.noticeDays,
      7,
      60,
      'Notice days'
    );
    const formDueDays = v31Integer_(
      payload.formDueDays,
      1,
      21,
      'Form due days'
    );
    const triggerHour = v31Integer_(
      payload.triggerHour,
      0,
      23,
      'Trigger hour'
    );
    const eventStartHour = v31Integer_(
      payload.eventStartHour,
      0,
      23,
      'Event start hour'
    );
    const eventDuration = v31Integer_(
      payload.eventDurationMinutes,
      15,
      240,
      'Event duration'
    );
    const emailReminderDays = v31Integer_(
      payload.eventEmailReminderDays,
      0,
      28,
      'Email reminder days'
    );
    const popupReminderHours = v31Integer_(
      payload.eventPopupReminderHours,
      0,
      672,
      'Popup reminder hours'
    );
    const compensationUrl = cleanText_(
      payload.compensationAdjustmentUrl
    );

    if (
      compensationUrl &&
      !/^https:\/\/.+/i.test(compensationUrl)
    ) {
      throw new Error(
        'The Compensation Adjustment URL must begin with https://.'
      );
    }

    setSetting_(
      settingsSheet,
      'REVIEW_NOTICE_DAYS',
      noticeDays
    );
    setSetting_(
      settingsSheet,
      'FORM_DUE_DAYS_BEFORE_MEETING',
      formDueDays
    );
    setSetting_(
      settingsSheet,
      'AUTOMATION_TRIGGER_HOUR',
      triggerHour
    );
    setSetting_(
      settingsSheet,
      'REVIEW_EVENT_START_HOUR',
      eventStartHour
    );
    setSetting_(
      settingsSheet,
      'REVIEW_EVENT_DURATION_MINUTES',
      eventDuration
    );
    setSetting_(
      settingsSheet,
      'SHIFT_WEEKEND_MEETINGS',
      payload.shiftWeekendMeetings ? 'TRUE' : 'FALSE'
    );
    setSetting_(
      settingsSheet,
      'CALENDAR_ID',
      cleanText_(payload.calendarId) || 'primary'
    );
    setSetting_(
      settingsSheet,
      'EVENT_EMAIL_REMINDER_DAYS',
      emailReminderDays
    );
    setSetting_(
      settingsSheet,
      'EVENT_POPUP_REMINDER_HOURS',
      popupReminderHours
    );
    setSetting_(
      settingsSheet,
      'COMPENSATION_ADJUSTMENT_URL',
      compensationUrl
    );
    setSetting_(
      settingsSheet,
      'COMPENSATION_DECISION_REQUIRED',
      payload.compensationDecisionRequired
        ? 'TRUE'
        : 'FALSE'
    );

    const mode = String(
      getSettings_().AUTOMATION_MODE || 'Preview'
    );

    if (mode === 'Live') {
      installReviewAutomationTrigger_();
    }

    logReviewAutomation_({
      mode: mode,
      action: 'Settings updated',
      result: 'Success',
      details: 'Updated by ' + email,
    });

    return {
      ok: true,
      message: 'Review automation settings saved.',
      automation: getAutomationAdminData_(),
    };
  });
}

function setReviewAutomationMode(mode) {
  return withLock_(function () {
    const email = getCurrentUserEmail_();

    if (!isHrUser_(email)) {
      throw new Error(
        'Only HR may enable or pause review automation.'
      );
    }

    if (!['Preview', 'Live', 'Paused'].includes(mode)) {
      throw new Error('Unsupported automation mode.');
    }

    const settingsSheet = getSpreadsheet_().getSheetByName(
      PR.SHEETS.SETTINGS
    );

    setSetting_(
      settingsSheet,
      'AUTOMATION_MODE',
      mode
    );

    if (mode === 'Live') {
      installReviewAutomationTrigger_();
    } else {
      removeReviewAutomationTriggers_();
    }

    logReviewAutomation_({
      mode: mode,
      action: 'Automation mode changed',
      result: 'Success',
      details: 'Changed by ' + email,
    });

    return {
      ok: true,
      message:
        mode === 'Live'
          ? 'Live automation enabled. The daily trigger is installed.'
          : mode === 'Preview'
          ? 'Automation returned to Preview mode. No automatic cycles will be sent.'
          : 'Automation paused and the daily trigger was removed.',
      automation: getAutomationAdminData_(),
    };
  });
}

function getReviewAutomationPreview(days) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may preview review automation.'
    );
  }

  const settings = getSettings_();
  const previewDays =
    days == null
      ? Number(settings.REVIEW_NOTICE_DAYS || 28)
      : v31Integer_(days, 1, 120, 'Preview days');

  return {
    ok: true,
    candidates:
      findReviewAutomationCandidates_(previewDays),
  };
}

function runReviewAutomationNow() {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may run review automation.'
    );
  }

  const settings = getSettings_();

  if (
    String(settings.AUTOMATION_MODE || 'Preview') !==
    'Live'
  ) {
    return {
      ok: true,
      previewOnly: true,
      message:
        'Automation is not Live. No cycles were created. The preview was refreshed.',
      candidates: findReviewAutomationCandidates_(
        Number(settings.REVIEW_NOTICE_DAYS || 28)
      ),
    };
  }

  return runReviewAutomation();
}

function installReviewAutomationTrigger_() {
  removeReviewAutomationTriggers_();

  const settings = getSettings_();
  const hour = Number(
    settings.AUTOMATION_TRIGGER_HOUR || 8
  );

  ScriptApp.newTrigger('runReviewAutomation')
    .timeBased()
    .atHour(hour)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(
      Session.getScriptTimeZone() ||
        'America/New_York'
    )
    .create();
}

function removeReviewAutomationTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
      'runReviewAutomation'
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function hasReviewAutomationTrigger_() {
  return ScriptApp.getProjectTriggers().some(
    function (trigger) {
      return (
        trigger.getHandlerFunction() ===
        'runReviewAutomation'
      );
    }
  );
}

/* ============================ AUTOMATION RUN ============================= */

/**
 * Short-lock claim helpers used by runReviewAutomation. Row claim/create
 * is the only part protected by the global lock — Calendar/Mail side
 * effects happen afterward, outside any lock (see
 * launchReviewCycleCommunications_).
 */
function claimNewAutomatedReviewCycle_(candidate) {
  return withLock_(function () {
    return createAutomatedReviewCycle_(candidate);
  });
}

function claimAutomationCycleForRetry_(existingCycleId) {
  return withLock_(function () {
    return findCycle_(existingCycleId).object;
  });
}

function runReviewAutomation() {
  ensureV31DataModel_();

  const settings = getSettings_();
  const mode = String(
    settings.AUTOMATION_MODE || 'Preview'
  );

  if (mode !== 'Live') {
    logReviewAutomation_({
      mode: mode,
      action: 'Scheduled automation check',
      result: 'Skipped',
      details:
        'Automation is not in Live mode.',
    });

    return {
      ok: true,
      created: 0,
      retried: 0,
      retriedSuccessfully: 0,
      failed: 0,
      skipped: true,
      message:
        'Automation is not Live. No cycles were created.',
    };
  }

  const candidates =
    findReviewAutomationCandidates_(
      Number(settings.REVIEW_NOTICE_DAYS || 28)
    );
  let created = 0;
  let retryAttempts = 0;
  let retriedSuccessfully = 0;
  let failed = 0;
  const results = [];

  candidates.forEach(function (candidate) {
    let cycle = null;

    try {
      if (candidate.existingCycleId) {
        retryAttempts++;
        cycle = claimAutomationCycleForRetry_(
          candidate.existingCycleId
        );
      } else {
        cycle = claimNewAutomatedReviewCycle_(
          candidate
        );
        created++;
      }

      // External Calendar/Mail side effects must not hold the
      // global script lock used above to claim/create the row.
      const launched =
        launchReviewCycleCommunications_(
          cycle,
          true
        );
      const summary =
        getReviewLaunchComponentSummary_(
          launched
        );

      if (candidate.existingCycleId && summary.complete) {
        retriedSuccessfully++;
      }

      results.push({
        employeeName: candidate.employeeName,
        reviewType: candidate.reviewType,
        cycleId: launched['Cycle ID'],
        result: summary.complete
          ? 'Created and sent'
          : 'Partial launch',
        launchComponents: summary,
      });

      logReviewAutomation_({
        mode: mode,
        action: candidate.existingCycleId
          ? 'Launch retried'
          : 'Review cycle created',
        employeeEmail:
          candidate.employeeEmail,
        employeeName:
          candidate.employeeName,
        reviewType: candidate.reviewType,
        reviewDate: candidate.reviewDate,
        cycleId: launched['Cycle ID'],
        result: summary.complete
          ? 'Success'
          : 'Partial',
        details: summary.complete
          ? 'Calendar event and three workflow emails completed.'
          : describeReviewLaunchStatus_(
              launched
            ),
      });
    } catch (error) {
      failed++;

      const cycleIdForLog =
        (cycle && cycle['Cycle ID']) ||
        candidate.existingCycleId ||
        '';

      results.push({
        employeeName: candidate.employeeName,
        reviewType: candidate.reviewType,
        cycleId: cycleIdForLog,
        result: 'Failed',
        details: error.message,
      });

      logReviewAutomation_({
        mode: mode,
        action: 'Review launch',
        employeeEmail:
          candidate.employeeEmail,
        employeeName:
          candidate.employeeName,
        reviewType: candidate.reviewType,
        reviewDate: candidate.reviewDate,
        cycleId: cycleIdForLog,
        result: 'Failed',
        details: error.message,
      });
    }
  });

  const now = new Date();

  withLock_(function () {
    setSetting_(
      getSpreadsheet_().getSheetByName(
        PR.SHEETS.SETTINGS
      ),
      'AUTOMATION_LAST_RUN',
      now.toISOString()
    );
  });

  return {
    ok: failed === 0,
    created: created,
    retried: retryAttempts,
    retriedSuccessfully: retriedSuccessfully,
    failed: failed,
    results: results,
    message:
      created +
      ' review cycle(s) created, ' +
      retryAttempts +
      ' launch(es) retried (' +
      retriedSuccessfully +
      ' completed), and ' +
      failed +
      ' failure(s).',
  };
}

function findReviewAutomationCandidates_(windowDays) {
  const settings = getSettings_();
  const noticeDays = Number(
    settings.REVIEW_NOTICE_DAYS || 28
  );
  const today = v31Today_();
  const windowEnd = v31AddDays_(
    today,
    Math.max(
      Number(windowDays || noticeDays),
      noticeDays
    )
  );
  const assignments = getAllObjects_(
    PR.SHEETS.ASSIGNMENTS
  );
  const cycles = getAllObjects_(
    PR.SHEETS.CYCLES
  );
  const existingByKey = {};

  cycles.forEach(function (cycle) {
    const key = String(
      cycle['Automation Key'] || ''
    );

    if (key) {
      existingByKey[key] = cycle;
    }
  });

  const candidates = [];

  assignments.forEach(function (assignment) {
    const active =
      assignment.Active === true ||
      String(assignment.Active).toLowerCase() ===
        'true';
    const automationValue =
      assignment['Review Automation'];
    const automationEnabled =
      automationValue === '' ||
      automationValue == null ||
      automationValue === true ||
      String(automationValue).toLowerCase() ===
        'true';

    if (!active || !automationEnabled) {
      return;
    }

    const hireDate = v31Date_(
      assignment['Hire Date']
    );

    if (!hireDate) {
      return;
    }

    const employeeEmail = normalizeEmail_(
      assignment['Employee Email']
    );
    const employeeName = String(
      assignment['Employee Name'] || ''
    );
    const managerEmail = normalizeEmail_(
      assignment['Manager Email']
    );
    const managerName = String(
      assignment['Manager Name'] || ''
    );

    if (
      !employeeEmail ||
      !employeeName ||
      !managerEmail ||
      !managerName
    ) {
      return;
    }

    const possible = [];

    const sixMonthDate = v31AddMonthsClamped_(
      hireDate,
      6
    );

    possible.push({
      reviewType: '6-Month Review',
      reviewDate: sixMonthDate,
      reviewPeriodStart: hireDate,
      reviewPeriodEnd: sixMonthDate,
    });

    for (
      let year = today.getFullYear();
      year <= windowEnd.getFullYear();
      year++
    ) {
      const yearsOfService =
        year - hireDate.getFullYear();

      if (yearsOfService < 1) continue;

      const anniversary =
        v31AnniversaryInYear_(
          hireDate,
          year
        );

      possible.push({
        reviewType:
          yearsOfService === 1
            ? '1-Year Review'
            : 'Annual Review',
        reviewDate: anniversary,
        reviewPeriodStart:
          yearsOfService === 1
            ? hireDate
            : v31AnniversaryInYear_(
                hireDate,
                year - 1
              ),
        reviewPeriodEnd: anniversary,
      });
    }

    possible.forEach(function (review) {
      const reviewDate = v31StartOfDay_(
        review.reviewDate
      );
      const launchDate = v31AddDays_(
        reviewDate,
        -noticeDays
      );

      if (
        reviewDate < today ||
        reviewDate > windowEnd ||
        launchDate > today
      ) {
        return;
      }

      const automationKey =
        employeeEmail +
        '|' +
        formatDateIso_(reviewDate) +
        '|' +
        review.reviewType;
      const existing = existingByKey[
        automationKey
      ];

      const periodCycles = cycles.filter(
        function (cycle) {
          return (
            normalizeEmail_(
              cycle['Employee Email']
            ) === employeeEmail &&
            v31SameDate_(
              cycle['Review Period End'],
              reviewDate
            ) &&
            String(cycle['Status']) !==
              PR.CYCLE.CANCELLED
          );
        }
      );

      const launchTarget =
        resolveAutomationLaunchTarget_(
          existing,
          periodCycles
        );

      if (launchTarget.skip) {
        return;
      }

      const retryCycle = launchTarget.retryCycle;

      const meetingDate =
        v31Boolean_(
          settings.SHIFT_WEEKEND_MEETINGS,
          true
        )
          ? v31ShiftWeekendForward_(
              reviewDate
            )
          : reviewDate;
      const dueDate =
        v31ShiftWeekendBackward_(
          v31AddDays_(
            meetingDate,
            -Number(
              settings.FORM_DUE_DAYS_BEFORE_MEETING ||
                7
            )
          )
        );

      candidates.push({
        automationKey: automationKey,
        existingCycleId: retryCycle
          ? String(retryCycle['Cycle ID'])
          : '',
        employeeEmail: employeeEmail,
        employeeName: employeeName,
        managerEmail: managerEmail,
        managerName: managerName,
        employeeJobTitle: String(
          assignment['Job Title'] || ''
        ),
        departmentProject: String(
          assignment['Department / Project'] ||
            ''
        ),
        hireDate: formatDateIso_(hireDate),
        reviewType: review.reviewType,
        reviewDate: formatDateIso_(reviewDate),
        reviewPeriodStart: formatDateIso_(
          review.reviewPeriodStart
        ),
        reviewPeriodEnd: formatDateIso_(
          review.reviewPeriodEnd
        ),
        meetingDate: formatDateIso_(
          meetingDate
        ),
        managerDueDate: formatDateIso_(
          dueDate
        ),
        employeeDueDate: formatDateIso_(
          dueDate
        ),
        launchDate: formatDateIso_(
          launchDate
        ),
        daysUntilReview:
          v31DaysBetween_(today, reviewDate),
        status: retryCycle
          ? describeReviewLaunchStatus_(
              retryCycle
            )
          : 'Ready to create',
        launchComponents: retryCycle
          ? getReviewLaunchComponentSummary_(
              retryCycle
            )
          : null,
      });
    });
  });

  return candidates.sort(function (a, b) {
    return (
      new Date(a.reviewDate) -
      new Date(b.reviewDate)
    );
  });
}

function createAutomatedReviewCycle_(candidate) {
  const hr = getPrimaryAutomationHr_();
  const now = new Date();
  const cycleId = Utilities.getUuid();

  const row = {
    'Cycle ID': cycleId,
    'Created At': now,
    'Updated At': now,
    'Status': PR.CYCLE.OPEN,
    'Review Type': candidate.reviewType,
    'Review Period Start': parseDateInput_(
      candidate.reviewPeriodStart
    ),
    'Review Period End': parseDateInput_(
      candidate.reviewPeriodEnd
    ),
    'Review Meeting Date': parseDateInput_(
      candidate.meetingDate
    ),
    'Employee Name': candidate.employeeName,
    'Employee Email': candidate.employeeEmail,
    'Employee Job Title':
      candidate.employeeJobTitle,
    'Department / Project':
      candidate.departmentProject,
    'Hire Date': parseDateInput_(
      candidate.hireDate
    ),
    'Manager Name': candidate.managerName,
    'Manager Email': candidate.managerEmail,
    'HR Name': hr.name,
    'HR Email': hr.email,
    'Manager Review Status':
      PR.DOC.NOT_STARTED,
    'Manager Review JSON': JSON.stringify(
      emptyManagerReview_()
    ),
    'Self Evaluation Status':
      PR.DOC.NOT_STARTED,
    'Self Evaluation JSON': JSON.stringify(
      emptySelfEvaluation_()
    ),
    'Meeting Opened At': '',
    'Meeting Opened By': '',
    'Meeting JSON': JSON.stringify(
      emptyMeeting_()
    ),
    'Signatures Released At': '',
    'Signatures Released By': '',
    'MGR Manager Signature ID': '',
    'MGR Manager Signed At': '',
    'MGR Employee Signature ID': '',
    'MGR Employee Signed At': '',
    'MGR HR Signature ID': '',
    'MGR HR Signed At': '',
    'SELF Employee Signature ID': '',
    'SELF Employee Signed At': '',
    'SELF Manager Signature ID': '',
    'SELF Manager Signed At': '',
    'SELF HR Signature ID': '',
    'SELF HR Signed At': '',
    'Manager Review PDF ID': '',
    'Self Evaluation PDF ID': '',
    'Completed At': '',

    'Cycle Source': 'Automated',
    'Automation Key': candidate.automationKey,
    'Automation Notice Sent At': '',
    'Manager Due Date': parseDateInput_(
      candidate.managerDueDate
    ),
    'Employee Due Date': parseDateInput_(
      candidate.employeeDueDate
    ),
    'Calendar Status': '',
    'Calendar Event ID': '',
    'Calendar Created At': '',
    'Calendar Attempt ID': '',
    'Calendar Started At': '',
    'Manager Email Status': '',
    'Manager Email Sent At': '',
    'Manager Email Attempt ID': '',
    'Manager Email Started At': '',
    'Employee Email Status': '',
    'Employee Email Sent At': '',
    'Employee Email Attempt ID': '',
    'Employee Email Started At': '',
    'HR Email Status': '',
    'HR Email Sent At': '',
    'HR Email Attempt ID': '',
    'HR Email Started At': '',
    'Launch Completed At': '',
    'Last Launch Error': '',
    'Launch Attempt Count': 0,
    'Manager PDF Status': '',
    'Manager PDF Attempt ID': '',
    'Manager PDF Started At': '',
    'Self PDF Status': '',
    'Self PDF Attempt ID': '',
    'Self PDF Started At': '',
    'Final Distribution Status': '',
    'Final Distribution Started At': '',
    'Final Distribution Sent At': '',
    'Finalization Last Error': '',
    'Finalization Attempt Count': 0,
    'Compensation Decision':
      V31.COMPENSATION.PENDING,
    'Compensation Decision Notes': '',
    'Compensation Decision At': '',
    'Compensation Decision By': '',
  };

  appendObject_(
    PR.SHEETS.CYCLES,
    PR.CYCLE_HEADERS.concat(V31.CYCLE_HEADERS),
    row
  );

  audit_(
    cycleId,
    'Automated review cycle created',
    hr.email,
    '',
    PR.CYCLE.OPEN,
    JSON.stringify({
      automationKey:
        candidate.automationKey,
      reviewDate: candidate.reviewDate,
    })
  );

  return row;
}

/* ======================== CALENDAR + LAUNCH EMAILS ======================= */

function applyV31DefaultsToCycle_(
  cycle,
  source
) {
  const settings = getSettings_();
  let meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );

  if (
    meetingDate &&
    v31Boolean_(
      settings.SHIFT_WEEKEND_MEETINGS,
      true
    )
  ) {
    meetingDate =
      v31ShiftWeekendForward_(meetingDate);
    cycle['Review Meeting Date'] = meetingDate;
  }

  const dueDate = meetingDate
    ? v31ShiftWeekendBackward_(
        v31AddDays_(
          meetingDate,
          -Number(
            settings.FORM_DUE_DAYS_BEFORE_MEETING ||
              7
          )
        )
      )
    : null;

  cycle['Cycle Source'] =
    cycle['Cycle Source'] ||
    source ||
    'Manual';
  cycle['Automation Key'] =
    cycle['Automation Key'] || '';
  cycle['Automation Notice Sent At'] =
    cycle['Automation Notice Sent At'] || '';
  cycle['Manager Due Date'] =
    cycle['Manager Due Date'] ||
    dueDate ||
    '';
  cycle['Employee Due Date'] =
    cycle['Employee Due Date'] ||
    dueDate ||
    '';

  // Calendar status/attempt fields. A cycle that already has an event ID
  // from before this field existed defaults to Created rather than Pending.
  cycle['Calendar Event ID'] =
    cycle['Calendar Event ID'] || '';
  cycle['Calendar Status'] =
    cycle['Calendar Status'] ||
    (cycle['Calendar Event ID']
      ? V31.CALENDAR.CREATED
      : V31.CALENDAR.PENDING);
  cycle['Calendar Created At'] =
    cycle['Calendar Created At'] || '';
  cycle['Calendar Attempt ID'] =
    cycle['Calendar Attempt ID'] || '';
  cycle['Calendar Started At'] =
    cycle['Calendar Started At'] || '';

  // Per-recipient email status/attempt fields. A cycle that already has a
  // Sent At timestamp from before status fields existed defaults to Sent.
  cycle['Manager Email Sent At'] =
    cycle['Manager Email Sent At'] || '';
  cycle['Manager Email Status'] =
    cycle['Manager Email Status'] ||
    (cycle['Manager Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Manager Email Attempt ID'] =
    cycle['Manager Email Attempt ID'] || '';
  cycle['Manager Email Started At'] =
    cycle['Manager Email Started At'] || '';

  cycle['Employee Email Sent At'] =
    cycle['Employee Email Sent At'] || '';
  cycle['Employee Email Status'] =
    cycle['Employee Email Status'] ||
    (cycle['Employee Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Employee Email Attempt ID'] =
    cycle['Employee Email Attempt ID'] || '';
  cycle['Employee Email Started At'] =
    cycle['Employee Email Started At'] || '';

  cycle['HR Email Sent At'] =
    cycle['HR Email Sent At'] || '';
  cycle['HR Email Status'] =
    cycle['HR Email Status'] ||
    (cycle['HR Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['HR Email Attempt ID'] =
    cycle['HR Email Attempt ID'] || '';
  cycle['HR Email Started At'] =
    cycle['HR Email Started At'] || '';

  cycle['Launch Completed At'] =
    cycle['Launch Completed At'] || '';
  cycle['Last Launch Error'] =
    cycle['Last Launch Error'] || '';
  cycle['Launch Attempt Count'] =
    cycle['Launch Attempt Count'] === '' ||
    cycle['Launch Attempt Count'] == null
      ? 0
      : Number(cycle['Launch Attempt Count'] || 0);

  cycle['Manager PDF Status'] =
    cycle['Manager PDF Status'] ||
    (cycle['Manager Review PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Manager PDF Attempt ID'] =
    cycle['Manager PDF Attempt ID'] || '';
  cycle['Manager PDF Started At'] =
    cycle['Manager PDF Started At'] || '';
  cycle['Self PDF Status'] =
    cycle['Self PDF Status'] ||
    (cycle['Self Evaluation PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Self PDF Attempt ID'] =
    cycle['Self PDF Attempt ID'] || '';
  cycle['Self PDF Started At'] =
    cycle['Self PDF Started At'] || '';
  cycle['Final Distribution Status'] =
    cycle['Final Distribution Status'] ||
    (cycle['Final Distribution Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Final Distribution Started At'] =
    cycle['Final Distribution Started At'] || '';
  cycle['Final Distribution Sent At'] =
    cycle['Final Distribution Sent At'] || '';
  cycle['Finalization Last Error'] =
    cycle['Finalization Last Error'] || '';
  cycle['Finalization Attempt Count'] =
    cycle['Finalization Attempt Count'] === '' ||
    cycle['Finalization Attempt Count'] == null
      ? 0
      : Number(cycle['Finalization Attempt Count'] || 0);

  cycle['Compensation Decision'] =
    cycle['Compensation Decision'] ||
    V31.COMPENSATION.PENDING;
  cycle['Compensation Decision Notes'] =
    cycle['Compensation Decision Notes'] || '';
  cycle['Compensation Decision At'] =
    cycle['Compensation Decision At'] || '';
  cycle['Compensation Decision By'] =
    cycle['Compensation Decision By'] || '';

  return backfillLegacyLaunchFields_(cycle);
}

/**
 * Backfill per-step launch fields for cycles completed under the
 * pre-idempotent V3.1 package (single Automation Notice Sent At).
 */
function backfillLegacyLaunchFields_(cycle) {
  if (
    cycle['Automation Notice Sent At'] &&
    cycle['Calendar Event ID'] &&
    !cycle['Launch Completed At']
  ) {
    const sentAt =
      cycle['Automation Notice Sent At'];

    cycle['Calendar Status'] =
      cycle['Calendar Status'] ||
      V31.CALENDAR.CREATED;
    cycle['Manager Email Sent At'] =
      cycle['Manager Email Sent At'] || sentAt;
    cycle['Manager Email Status'] =
      V31.DELIVERY.SENT;
    cycle['Employee Email Sent At'] =
      cycle['Employee Email Sent At'] || sentAt;
    cycle['Employee Email Status'] =
      V31.DELIVERY.SENT;
    cycle['HR Email Sent At'] =
      cycle['HR Email Sent At'] || sentAt;
    cycle['HR Email Status'] =
      V31.DELIVERY.SENT;
    cycle['Launch Completed At'] = sentAt;
  } else if (
    cycle['Calendar Event ID'] &&
    !cycle['Calendar Status']
  ) {
    cycle['Calendar Status'] =
      V31.CALENDAR.CREATED;
  }

  return cycle;
}

/**
 * Complete if the explicit completion timestamp is set, if this is a
 * legacy cycle (single notice timestamp + event), or if every component
 * has independently reached a terminal "done" state.
 */
function isReviewLaunchComplete_(cycle) {
  if (!cycle) return false;

  if (cycle['Launch Completed At']) {
    return true;
  }

  // Legacy completed launches used one notice timestamp for all emails.
  if (
    cycle['Automation Notice Sent At'] &&
    cycle['Calendar Event ID']
  ) {
    return true;
  }

  const calendarDone =
    !!cycle['Calendar Event ID'] &&
    [V31.CALENDAR.CREATED, V31.CALENDAR.CONFIGURED].indexOf(
      String(cycle['Calendar Status'] || '')
    ) >= 0;

  const emailsDone = [
    cycle['Manager Email Status'],
    cycle['Employee Email Status'],
    cycle['HR Email Status'],
  ].every(function (status) {
    return String(status || '') === V31.DELIVERY.SENT;
  });

  return calendarDone && emailsDone;
}

/**
 * Looser than isReviewLaunchComplete_: only cares that the Calendar
 * event exists and each recipient email is Sent (or has a Sent At
 * timestamp for cycles migrated before status fields existed). Used to
 * decide when to stamp Launch Completed At.
 */
function isReviewLaunchComponentsComplete_(cycle) {
  if (!cycle) return false;

  const managerDone =
    String(cycle['Manager Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['Manager Email Sent At'];
  const employeeDone =
    String(cycle['Employee Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['Employee Email Sent At'];
  const hrDone =
    String(cycle['HR Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['HR Email Sent At'];

  return (
    !!cycle['Calendar Event ID'] &&
    managerDone &&
    employeeDone &&
    hrDone
  );
}

function isCalendarConfigWarning_(message) {
  return (
    String(message || '').indexOf(
      'Calendar tag/reminder configuration failed'
    ) === 0
  );
}

/**
 * Clear transient launch errors without wiping a persisted calendar
 * Created-but-not-Configured warning that HR still needs to see.
 */
function clearLastLaunchErrorUnlessCalendarConfig_(cycle) {
  if (!isCalendarConfigWarning_(cycle['Last Launch Error'])) {
    cycle['Last Launch Error'] = '';
  }
}

/**
 * True when the shared calendar event exists but tag/reminder
 * configuration has not reached Configured. Launch can still complete.
 * Warn when configuration failed, or when launch finished while still
 * at Created (tags/reminders never confirmed).
 */
function hasCalendarConfigWarning_(cycle) {
  if (!cycle || !cycle['Calendar Event ID']) {
    return false;
  }

  const calendarStatus = String(cycle['Calendar Status'] || '');

  if (calendarStatus === V31.CALENDAR.CONFIGURED) {
    return false;
  }

  if (isCalendarConfigWarning_(cycle['Last Launch Error'])) {
    return true;
  }

  return (
    !!cycle['Launch Completed At'] &&
    calendarStatus === V31.CALENDAR.CREATED
  );
}

function getReviewLaunchComponentSummary_(cycle) {
  const calendarStatus = String(
    cycle['Calendar Status'] ||
      (cycle['Calendar Event ID']
        ? V31.CALENDAR.CREATED
        : V31.CALENDAR.PENDING)
  );
  const managerStatus = String(
    cycle['Manager Email Status'] ||
      (cycle['Manager Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const employeeStatus = String(
    cycle['Employee Email Status'] ||
      (cycle['Employee Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const hrStatus = String(
    cycle['HR Email Status'] ||
      (cycle['HR Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const calendarConfigWarning = hasCalendarConfigWarning_(cycle);

  return {
    calendar: !!cycle['Calendar Event ID'],
    calendarStatus: calendarStatus,
    calendarUnknown: calendarStatus === V31.CALENDAR.UNKNOWN,
    calendarConfigured:
      calendarStatus === V31.CALENDAR.CONFIGURED,
    calendarConfigWarning: calendarConfigWarning,
    managerEmail: managerStatus === V31.DELIVERY.SENT,
    managerEmailStatus: managerStatus,
    managerEmailUnknown: managerStatus === V31.DELIVERY.UNKNOWN,
    employeeEmail: employeeStatus === V31.DELIVERY.SENT,
    employeeEmailStatus: employeeStatus,
    employeeEmailUnknown: employeeStatus === V31.DELIVERY.UNKNOWN,
    hrEmail: hrStatus === V31.DELIVERY.SENT,
    hrEmailStatus: hrStatus,
    hrEmailUnknown: hrStatus === V31.DELIVERY.UNKNOWN,
    hasUnknown:
      calendarStatus === V31.CALENDAR.UNKNOWN ||
      managerStatus === V31.DELIVERY.UNKNOWN ||
      employeeStatus === V31.DELIVERY.UNKNOWN ||
      hrStatus === V31.DELIVERY.UNKNOWN,
    complete: isReviewLaunchComplete_(cycle),
    lastError: String(
      cycle['Last Launch Error'] || ''
    ),
    attemptCount: Number(
      cycle['Launch Attempt Count'] || 0
    ),
  };
}

function describeReviewLaunchStatus_(cycle) {
  if (isReviewLaunchComplete_(cycle)) {
    return 'Launch complete';
  }

  const summary = getReviewLaunchComponentSummary_(cycle);

  const describeComponent = function (
    label,
    status,
    doneFlag
  ) {
    if (
      status === V31.DELIVERY.UNKNOWN ||
      status === V31.CALENDAR.UNKNOWN
    ) {
      return label + ' delivery unknown';
    }

    if (
      status === V31.DELIVERY.SENDING ||
      status === V31.CALENDAR.CREATING ||
      status === V31.CALENDAR.CONFIGURING
    ) {
      return label + ' in progress';
    }

    if (
      status === V31.DELIVERY.FAILED ||
      status === V31.CALENDAR.FAILED
    ) {
      return label + ' failed';
    }

    return doneFlag ? label + ' done' : label + ' pending';
  };

  const parts = [
    describeComponent(
      'Calendar',
      summary.calendarStatus,
      summary.calendar
    ),
    describeComponent(
      'Manager email',
      summary.managerEmailStatus,
      summary.managerEmail
    ),
    describeComponent(
      'Employee email',
      summary.employeeEmailStatus,
      summary.employeeEmail
    ),
    describeComponent(
      'HR email',
      summary.hrEmailStatus,
      summary.hrEmail
    ),
  ];

  const error = String(
    cycle['Last Launch Error'] || ''
  ).trim();

  return (
    'Launch needs retry — ' +
    parts.join('; ') +
    (error ? ' (' + error + ')' : '')
  );
}

/**
 * Decide whether automation should skip, create, or retry a cycle for
 * a candidate review window.
 *
 * - Complete period match → skip (no duplicate launch)
 * - Incomplete automation-key match → retry that cycle
 * - Incomplete same-employee/period cycle (manual or orphaned) → retry it
 * - Otherwise → create
 */
function resolveAutomationLaunchTarget_(
  existingByKey,
  periodCycles
) {
  const period = periodCycles || [];

  if (
    existingByKey &&
    isReviewLaunchComplete_(existingByKey)
  ) {
    return { skip: true, retryCycle: null };
  }

  const completePeriod = period.find(function (
    cycle
  ) {
    return isReviewLaunchComplete_(cycle);
  });

  if (completePeriod) {
    return { skip: true, retryCycle: null };
  }

  if (
    existingByKey &&
    !isReviewLaunchComplete_(existingByKey)
  ) {
    return {
      skip: false,
      retryCycle: existingByKey,
    };
  }

  const incompletePeriod = period.find(function (
    cycle
  ) {
    return !isReviewLaunchComplete_(cycle);
  });

  return {
    skip: false,
    retryCycle: incompletePeriod || null,
  };
}

/**
 * Persist launch progress immediately and flush so concurrent readers
 * see component timestamps before the next external side effect.
 */
function persistLaunchCycle_(rowNumber, cycle) {
  writeCycle_(rowNumber, cycle);
  SpreadsheetApp.flush();
}

/**
 * Pure decision helper shared by the Calendar and email launch
 * components. No sheet or lock access — safe to unit test directly.
 *
 * - already done              -> skip (sent)
 * - in the matching "in
 *   progress" status and NOT
 *   stale                     -> skip (in-progress); never double-send
 * - in progress and stale     -> mark-unknown; caller must NOT auto-resend
 * - Delivery Unknown          -> skip (unknown) unless allowUnknownResend
 * - Pending or Failed         -> claim (safe to send)
 */
function decideLaunchComponentAction_(
  status,
  alreadyDone,
  startedAt,
  inProgressStatus,
  allowUnknownResend
) {
  if (alreadyDone) {
    return { action: 'skip', reason: 'sent' };
  }

  if (status === inProgressStatus) {
    if (!isDeliveryClaimStale_(startedAt)) {
      return { action: 'skip', reason: 'in-progress' };
    }

    return { action: 'mark-unknown' };
  }

  if (status === V31.DELIVERY.UNKNOWN) {
    return allowUnknownResend
      ? { action: 'claim' }
      : { action: 'skip', reason: 'unknown' };
  }

  // Pending or Failed may be claimed automatically.
  return { action: 'claim' };
}

function getLaunchEmailComponents_() {
  return [
    {
      key: 'manager',
      statusField: 'Manager Email Status',
      sentAtField: 'Manager Email Sent At',
      attemptField: 'Manager Email Attempt ID',
      startedField: 'Manager Email Started At',
      label: 'Manager email',
      send: sendV31ManagerLaunchEmail_,
    },
    {
      key: 'employee',
      statusField: 'Employee Email Status',
      sentAtField: 'Employee Email Sent At',
      attemptField: 'Employee Email Attempt ID',
      startedField: 'Employee Email Started At',
      label: 'Employee email',
      send: sendV31EmployeeLaunchEmail_,
    },
    {
      key: 'hr',
      statusField: 'HR Email Status',
      sentAtField: 'HR Email Sent At',
      attemptField: 'HR Email Attempt ID',
      startedField: 'HR Email Started At',
      label: 'HR email',
      send: sendV31HrLaunchEmail_,
    },
  ];
}

function getLaunchEmailComponentByKey_(key) {
  const components = getLaunchEmailComponents_();

  for (let i = 0; i < components.length; i++) {
    if (components[i].key === key) {
      return components[i];
    }
  }

  throw new Error('Unsupported email component: ' + key);
}

/**
 * Short lock: claim a Pending/Failed (or HR-approved Unknown) email
 * component by stamping Sending + a fresh attempt ID, then release.
 * Never sends mail while holding the lock.
 */
function claimLaunchEmailStep_(
  cycleId,
  component,
  allowUnknownResend
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const decision = decideLaunchComponentAction_(
      status,
      status === V31.DELIVERY.SENT ||
        !!cycle[component.sentAtField],
      cycle[component.startedField],
      V31.DELIVERY.SENDING,
      allowUnknownResend
    );

    if (decision.action === 'skip') {
      return {
        action: 'skip',
        reason: decision.reason,
        cycle: cycle,
      };
    }

    if (decision.action === 'mark-unknown') {
      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Last Launch Error'] =
        component.label +
        ' claim went stale before completion was confirmed.';
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return { action: 'skip', reason: 'unknown', cycle: cycle };
    }

    const attemptId = Utilities.getUuid();

    cycle[component.statusField] = V31.DELIVERY.SENDING;
    cycle[component.attemptField] = attemptId;
    cycle[component.startedField] = new Date();
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return {
      action: 'claim',
      attemptId: attemptId,
      cycle: cycle,
      rowNumber: location.rowNumber,
    };
  });
}

/**
 * Short lock: mark Sent/Unknown only if the attempt ID we claimed is
 * still current — a concurrent claim means someone else already moved
 * this component forward, so we must not overwrite their result.
 */
function commitLaunchEmailStep_(
  cycleId,
  component,
  attemptId,
  error
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (
      String(cycle[component.attemptField] || '') !==
      String(attemptId)
    ) {
      return cycle;
    }

    if (error) {
      // Ambiguous: MailApp may have accepted the message before the
      // error surfaced. Require explicit HR reconciliation.
      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Last Launch Error'] = String(
        error.message || error
      );
    } else {
      cycle[component.statusField] = V31.DELIVERY.SENT;
      cycle[component.sentAtField] = new Date();
      // Do not clear a calendar-config warning when a later email succeeds.
      clearLastLaunchErrorUnlessCalendarConfig_(cycle);
    }

    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Claim -> send (outside any lock) -> commit for a single email
 * component. Returns without throwing; callers inspect result.action.
 */
function runLaunchEmailStep_(
  cycleId,
  component,
  allowUnknownResend
) {
  const claim = claimLaunchEmailStep_(
    cycleId,
    component,
    allowUnknownResend
  );

  if (claim.action !== 'claim') {
    return claim;
  }

  let error = null;

  try {
    component.send(claim.cycle);
  } catch (err) {
    error = err;
  }

  const cycle = commitLaunchEmailStep_(
    cycleId,
    component,
    claim.attemptId,
    error
  );

  if (error) {
    return {
      action: 'error',
      reason: component.key,
      error: error,
      cycle: cycle,
    };
  }

  return { action: 'sent', cycle: cycle };
}

/**
 * Short lock: claim the Calendar create step the same way email
 * components are claimed. Skips entirely once an event ID exists.
 */
function claimCalendarCreateStep_(cycleId, allowUnknownResend) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(
      cycle['Calendar Status'] || V31.CALENDAR.PENDING
    );
    const decision = decideLaunchComponentAction_(
      status,
      !!cycle['Calendar Event ID'],
      cycle['Calendar Started At'],
      V31.CALENDAR.CREATING,
      allowUnknownResend
    );

    if (decision.action === 'skip') {
      return {
        action: 'skip',
        reason: decision.reason,
        cycle: cycle,
      };
    }

    if (decision.action === 'mark-unknown') {
      cycle['Calendar Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Last Launch Error'] =
        'Calendar claim went stale before an event ID was confirmed.';
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return { action: 'skip', reason: 'unknown', cycle: cycle };
    }

    const attemptId = Utilities.getUuid();

    cycle['Calendar Status'] = V31.CALENDAR.CREATING;
    cycle['Calendar Attempt ID'] = attemptId;
    cycle['Calendar Started At'] = new Date();
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return {
      action: 'create',
      attemptId: attemptId,
      cycle: cycle,
      rowNumber: location.rowNumber,
    };
  });
}

/**
 * Short lock: persist the recovered/created event ID immediately,
 * before any tag/reminder configuration, and only if our attempt ID
 * is still current.
 */
function commitCalendarCreatedStep_(
  cycleId,
  attemptId,
  event,
  error
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (
      String(cycle['Calendar Attempt ID'] || '') !==
      String(attemptId)
    ) {
      return cycle;
    }

    if (error) {
      // Ambiguous: the event may have been created without the ID
      // reaching us. Recovery-by-marker on the next attempt will find
      // it; require explicit HR reconciliation in the meantime.
      cycle['Calendar Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Last Launch Error'] = String(
        error.message || error
      );
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return cycle;
    }

    cycle['Calendar Event ID'] = event.getId();
    cycle['Calendar Created At'] = new Date();
    cycle['Calendar Status'] = V31.CALENDAR.CREATED;
    cycle['Last Launch Error'] = '';
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Best-effort setTag()/reminders pass. Created is already sufficient
 * for launch completion (the event exists and is discoverable), but
 * configuration failure is persisted as a Calendar warning until a
 * later retry reaches Configured. The warning is not cleared by
 * successful email steps.
 */
function configureCalendarLaunchStepBestEffort_(cycleId, event) {
  if (!event) return;

  try {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        cycle['Calendar Status'] === V31.CALENDAR.CREATED ||
        cycle['Calendar Status'] === V31.CALENDAR.CONFIGURING
      ) {
        cycle['Calendar Status'] = V31.CALENDAR.CONFIGURING;
        cycle['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, cycle);
      }
    });

    const settings = getSettings_();
    const cycle = findCycle_(cycleId).object;

    configureReviewCalendarEvent_(event, cycle, settings);

    withLock_(function () {
      const location = findCycle_(cycleId);
      const fresh = location.object;

      if (
        fresh['Calendar Status'] === V31.CALENDAR.CONFIGURING ||
        fresh['Calendar Status'] === V31.CALENDAR.CREATED
      ) {
        fresh['Calendar Status'] = V31.CALENDAR.CONFIGURED;
        // Clear only a prior calendar-config warning, not unrelated errors.
        if (
          String(fresh['Last Launch Error'] || '').indexOf(
            'Calendar tag/reminder configuration failed'
          ) === 0
        ) {
          fresh['Last Launch Error'] = '';
        }
        fresh['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, fresh);
      }
    });
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (cycle['Calendar Status'] === V31.CALENDAR.CONFIGURING) {
        // Leave Created so launch can still complete, but keep the
        // warning visible until configuration succeeds on retry.
        cycle['Calendar Status'] = V31.CALENDAR.CREATED;
      }

      cycle['Last Launch Error'] =
        'Calendar tag/reminder configuration failed: ' +
        String(error.message || error);
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);
    });
  }
}

/**
 * Claim -> create (outside any lock) -> commit ID -> best-effort
 * configure. Also resumes configuration for a Created event left
 * unconfigured by a prior crash.
 */
function runCalendarLaunchStep_(cycleId, allowUnknownResend) {
  const claim = claimCalendarCreateStep_(
    cycleId,
    allowUnknownResend
  );

  if (claim.action === 'create') {
    let event = null;
    let error = null;

    try {
      event = createReviewCalendarEvent_(claim.cycle);
    } catch (err) {
      error = err;
    }

    const committed = commitCalendarCreatedStep_(
      cycleId,
      claim.attemptId,
      event,
      error
    );

    if (error) {
      return {
        action: 'error',
        reason: 'calendar',
        error: error,
        cycle: committed,
      };
    }

    configureCalendarLaunchStepBestEffort_(cycleId, event);

    return { action: 'created', cycle: findCycle_(cycleId).object };
  }

  if (
    claim.cycle['Calendar Event ID'] &&
    claim.cycle['Calendar Status'] === V31.CALENDAR.CREATED
  ) {
    try {
      const settings = getSettings_();
      const calendar = openReviewCalendar_(settings);
      const event = calendar.getEventById(
        claim.cycle['Calendar Event ID']
      );

      if (event) {
        configureCalendarLaunchStepBestEffort_(cycleId, event);
      }
    } catch (lookupError) {
      // Best effort only; Created remains sufficient for launch completion.
    }
  }

  return {
    action: claim.action,
    reason: claim.reason,
    cycle: claim.cycle,
  };
}

/**
 * Short lock: stamp Launch Completed At once every component has
 * independently reached Sent/Created. Safe to call repeatedly.
 */
function maybeCompleteReviewLaunch_(cycleId) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (cycle['Launch Completed At']) {
      return { completedNow: false, cycle: cycle };
    }

    if (!isReviewLaunchComponentsComplete_(cycle)) {
      return { completedNow: false, cycle: cycle };
    }

    const completedAt = new Date();

    cycle['Launch Completed At'] = completedAt;
    cycle['Automation Notice Sent At'] =
      cycle['Automation Notice Sent At'] || completedAt;
    // Launch may complete at Created; keep a calendar-config warning until
    // a later configure retry reaches Configured.
    clearLastLaunchErrorUnlessCalendarConfig_(cycle);
    cycle['Updated At'] = completedAt;
    persistLaunchCycle_(location.rowNumber, cycle);

    return { completedNow: true, cycle: cycle };
  });
}

/**
 * Short lock: apply defaults, bump the attempt counter, and persist —
 * released before any Calendar/Mail call.
 */
function claimLaunchAttempt_(cycleId, source) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      source
    );

    cycle['Launch Attempt Count'] =
      Number(cycle['Launch Attempt Count'] || 0) + 1;
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Core launch orchestration. Every component (Calendar, then Manager,
 * Employee, HR email) is claimed, performed, and committed through its
 * own short lock — see claimLaunchEmailStep_ / claimCalendarCreateStep_.
 * One component failing does not block the others from making
 * progress; callers throw on the first recorded error after every
 * component has had a chance to run.
 *
 * options.allowUnknownResend may set { calendar, manager, employee, hr }
 * to true to let a specific Delivery Unknown component be claimed again
 * (HR-authorized reconciliation only).
 */
function orchestrateReviewLaunchSteps_(cycleId, options) {
  const opts = options || {};
  const allow = opts.allowUnknownResend || {};
  const actions = [];
  const errors = [];

  const calendarResult = runCalendarLaunchStep_(
    cycleId,
    !!allow.calendar
  );

  if (calendarResult.action === 'created') {
    actions.push('calendar');
  } else if (calendarResult.action === 'error') {
    errors.push(calendarResult);
  }

  getLaunchEmailComponents_().forEach(function (component) {
    const result = runLaunchEmailStep_(
      cycleId,
      component,
      !!allow[component.key]
    );

    if (result.action === 'sent') {
      actions.push(component.key);
    } else if (result.action === 'error') {
      errors.push(result);
    }
  });

  const completion = maybeCompleteReviewLaunch_(cycleId);

  if (completion.completedNow) {
    actions.push('complete');
  }

  return {
    cycle: completion.cycle,
    actions: actions,
    errors: errors,
  };
}

/**
 * Create the Calendar event and send launch emails with independently
 * persisted completion for each external action.
 *
 * Callers (createReviewCycle, runReviewAutomation, retryReviewLaunch)
 * must NOT already hold LockService.getScriptLock() — every external
 * action here is protected by its own short claim/commit lock instead
 * of one long-held lock, and script locks are not re-entrant.
 */
function launchReviewCycleCommunications_(
  cycle,
  automated,
  options
) {
  const cycleId = cycle['Cycle ID'];
  const location = findCycle_(cycleId);
  const stored = applyV31DefaultsToCycle_(
    location.object,
    automated ? 'Automated' : 'Manual'
  );

  if (isReviewLaunchComplete_(stored)) {
    const needsLegacyPersist =
      !location.object['Launch Completed At'] &&
      !!stored['Launch Completed At'];

    if (needsLegacyPersist) {
      stored['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, stored);
    }

    return stored;
  }

  claimLaunchAttempt_(
    cycleId,
    automated ? 'Automated' : 'Manual'
  );

  const result = orchestrateReviewLaunchSteps_(
    cycleId,
    options
  );

  if (result.errors.length) {
    const primary = result.errors[0];

    throw primary.error instanceof Error
      ? primary.error
      : new Error(
          String(primary.error || 'Review launch failed.')
        );
  }

  return result.cycle;
}

/**
 * HR-only: resume an incomplete launch without clearing completed
 * component timestamps. Distinct from intentional resend. Does not
 * wrap the launch in an outer lock — launchReviewCycleCommunications_
 * already claims each component under its own short lock.
 */
function retryReviewLaunch(cycleId, options) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry an incomplete review launch.'
    );
  }

  const location = findCycle_(cycleId);
  const cycle = applyV31DefaultsToCycle_(
    location.object,
    location.object['Cycle Source'] || 'Manual'
  );

  if (isReviewLaunchComplete_(cycle)) {
    return {
      ok: true,
      alreadyComplete: true,
      message:
        'Launch is already complete. Use Resend Instructions if recipients need the emails again.',
      launchComponents:
        getReviewLaunchComponentSummary_(cycle),
    };
  }

  const before = getReviewLaunchComponentSummary_(cycle);
  const launched = launchReviewCycleCommunications_(
    cycle,
    String(cycle['Cycle Source'] || '') === 'Automated',
    options || {}
  );
  const after = getReviewLaunchComponentSummary_(launched);

  audit_(
    cycleId,
    'Review launch retried',
    email,
    String(cycle['Status']),
    String(launched['Status'] || cycle['Status']),
    JSON.stringify({
      before: before,
      after: after,
      attemptCount: Number(
        launched['Launch Attempt Count'] || 0
      ),
    })
  );

  logReviewAutomation_({
    mode: String(
      getSettings_().AUTOMATION_MODE || 'Preview'
    ),
    action: 'Launch retried (HR)',
    employeeEmail: launched['Employee Email'],
    employeeName: launched['Employee Name'],
    reviewType: launched['Review Type'],
    reviewDate: formatDate_(
      launched['Review Meeting Date']
    ),
    cycleId: cycleId,
    result: isReviewLaunchComplete_(launched)
      ? 'Success'
      : 'Partial',
    details: describeReviewLaunchStatus_(launched),
  });

  return {
    ok: true,
    alreadyComplete: false,
    message: isReviewLaunchComplete_(launched)
      ? 'Launch completed. Calendar and role emails are in place.'
      : 'Launch still incomplete: ' +
        describeReviewLaunchStatus_(launched),
    launchComponents: after,
  };
}

function openReviewCalendar_(settings) {
  const calendarId = String(
    settings.CALENDAR_ID || 'primary'
  );
  const calendar =
    calendarId === 'primary'
      ? CalendarApp.getDefaultCalendar()
      : CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error(
      'The configured Google Calendar could not be opened.'
    );
  }

  return calendar;
}

/**
 * Pure helper: the literal marker text embedded in the event
 * description so a cycle's event is discoverable even if the Calendar
 * tag is ever stripped (e.g. by a guest's client).
 */
function buildCalendarCycleMarker_(cycleId) {
  return V31.CALENDAR_MARKER_PREFIX + String(cycleId) + ']';
}

/**
 * Pure helper: does this Calendar event belong to this review cycle?
 * Checks the Calendar tag, the description marker, and (defensively)
 * a known persisted event ID — any one match is sufficient.
 */
function eventMatchesCycleId_(event, cycleId, knownEventId) {
  if (!event || !cycleId) return false;

  const wanted = String(cycleId);

  const tag = String(
    (event.getTag && event.getTag('AITHERAS_REVIEW_CYCLE_ID')) || ''
  );

  if (tag === wanted) return true;

  const description = String(
    (event.getDescription && event.getDescription()) || ''
  );

  if (description.indexOf(buildCalendarCycleMarker_(wanted)) >= 0) {
    return true;
  }

  if (
    knownEventId &&
    event.getId &&
    String(event.getId()) === String(knownEventId)
  ) {
    return true;
  }

  return false;
}

/**
 * Recover an event created in a prior attempt whose ID was never
 * persisted (crash between createEvent and the commit lock). Tries the
 * already-known event ID first, then a widened ±7 day tag/description
 * search around the meeting date.
 */
function findExistingReviewCalendarEvent_(
  calendar,
  cycleId,
  meetingDate,
  knownEventId
) {
  if (!calendar || !cycleId) {
    return null;
  }

  if (knownEventId) {
    try {
      const known = calendar.getEventById(String(knownEventId));

      if (known) return known;
    } catch (error) {
      // Fall through to the window search below.
    }
  }

  if (!meetingDate) {
    return null;
  }

  const dayStart = new Date(
    meetingDate.getFullYear(),
    meetingDate.getMonth(),
    meetingDate.getDate(),
    0,
    0,
    0,
    0
  );
  const rangeStart = new Date(
    dayStart.getTime() - 7 * 86400000
  );
  const rangeEnd = new Date(
    dayStart.getTime() + 8 * 86400000
  );
  const events = calendar.getEvents(
    rangeStart,
    rangeEnd
  );

  for (let i = 0; i < events.length; i++) {
    if (eventMatchesCycleId_(events[i], cycleId, knownEventId)) {
      return events[i];
    }
  }

  return null;
}

/**
 * Recover first, otherwise create with the cycle marker embedded in
 * the description and guests invited. Returns as soon as the event
 * exists — setTag()/reminders happen separately in
 * configureReviewCalendarEvent_ so a crash right after creation still
 * leaves a discoverable, guest-invited event.
 */
function createReviewCalendarEvent_(cycle) {
  const settings = getSettings_();
  const calendar = openReviewCalendar_(settings);

  let meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );

  if (!meetingDate) {
    throw new Error(
      'The review meeting date is missing.'
    );
  }

  if (
    v31Boolean_(
      settings.SHIFT_WEEKEND_MEETINGS,
      true
    )
  ) {
    meetingDate =
      v31ShiftWeekendForward_(meetingDate);
  }

  const recovered = findExistingReviewCalendarEvent_(
    calendar,
    cycle['Cycle ID'],
    meetingDate,
    cycle['Calendar Event ID']
  );

  if (recovered) {
    return recovered;
  }

  const start = new Date(
    meetingDate.getFullYear(),
    meetingDate.getMonth(),
    meetingDate.getDate(),
    Number(
      settings.REVIEW_EVENT_START_HOUR || 12
    ),
    0,
    0,
    0
  );
  const end = new Date(
    start.getTime() +
      Number(
        settings.REVIEW_EVENT_DURATION_MINUTES ||
          60
      ) *
        60000
  );
  const guests = uniqueEmails_([
    cycle['Employee Email'],
    cycle['Manager Email'],
    cycle['HR Email'],
  ]).join(',');

  return calendar.createEvent(
    'Performance Review — ' +
      cycle['Employee Name'],
    start,
    end,
    {
      guests: guests,
      sendInvites: true,
      description:
        buildReviewCalendarDescription_(cycle),
    }
  );
}

/**
 * Best-effort configuration applied after the event ID is already
 * persisted: guest permissions, the recovery tag, and reminders.
 */
function configureReviewCalendarEvent_(event, cycle, settings) {
  event.setGuestsCanInviteOthers(false);
  event.setGuestsCanModify(false);
  event.setGuestsCanSeeGuests(true);
  event.setTag(
    'AITHERAS_REVIEW_CYCLE_ID',
    String(cycle['Cycle ID'])
  );

  event.removeAllReminders();

  const emailReminderMinutes =
    Number(
      settings.EVENT_EMAIL_REMINDER_DAYS || 7
    ) *
    1440;
  const popupReminderMinutes =
    Number(
      settings.EVENT_POPUP_REMINDER_HOURS || 24
    ) *
    60;

  if (
    emailReminderMinutes >= 5 &&
    emailReminderMinutes <= 40320
  ) {
    event.addEmailReminder(
      emailReminderMinutes
    );
  }

  if (
    popupReminderMinutes >= 5 &&
    popupReminderMinutes <= 40320
  ) {
    event.addPopupReminder(
      popupReminderMinutes
    );
  }
}

function buildReviewCalendarDescription_(cycle) {
  const overviewUrl =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=overview';
  const helpUrl =
    getWebAppUrl_() +
    '?action=help';

  return [
    buildCalendarCycleMarker_(cycle['Cycle ID']),
    'AITHERAS Performance Review',
    '',
    'Employee: ' + cycle['Employee Name'],
    'Manager: ' + cycle['Manager Name'],
    'Review type: ' + cycle['Review Type'],
    'Review period: ' +
      formatDate_(cycle['Review Period Start']) +
      ' – ' +
      formatDate_(cycle['Review Period End']),
    '',
    'Before the meeting:',
    'Manager review due: ' +
      formatDate_(cycle['Manager Due Date']),
    'Employee self-evaluation due: ' +
      formatDate_(cycle['Employee Due Date']),
    '',
    'Open the review portal:',
    overviewUrl,
    '',
    'How-to guide:',
    helpUrl,
    '',
    'The portal automatically shows each signed-in user only the actions and information authorized for their role.',
    '',
    'Do not open the review meeting workspace until the manager and employee are beginning the actual review discussion. Opening the meeting makes both evaluations visible.',
  ].join('\n');
}

function buildV31LaunchEmailUrls_(cycle) {
  return {
    managerUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=manager-review',
    employeeUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=self-evaluation',
    overviewUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=overview',
    helpUrl: getWebAppUrl_() + '?action=help',
    compensationUrl: String(
      getSettings_().COMPENSATION_ADJUSTMENT_URL ||
        ''
    ),
  };
}

function sendV31ManagerLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);
  const managerButtons =
    emailButton_(
      urls.managerUrl,
      'Start Manager Review'
    ) +
    (urls.compensationUrl
      ? emailButton_(
          urls.compensationUrl,
          'Open Compensation Adjustment'
        )
      : '');

  sendHtmlEmail_(
    cycle['Manager Email'],
    'Action required: ' +
      cycle['Review Type'] +
      ' for ' +
      cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(cycle['Manager Name']) +
      ',</p>' +
      '<p>The ' +
      htmlEscape_(cycle['Review Type']) +
      ' process for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> has started.</p>' +
      '<p><strong>Your tasks:</strong></p>' +
      '<ol>' +
      '<li>Complete and submit the Manager Performance Review by <strong>' +
      htmlEscape_(
        formatDate_(cycle['Manager Due Date'])
      ) +
      '</strong>.</li>' +
      '<li>Review compensation and either submit the Compensation Adjustment form or record that no adjustment is recommended.</li>' +
      '<li>Attend the calendar event and open the meeting workspace when the discussion begins.</li>' +
      '</ol>' +
      '<p>The employee self-evaluation remains private until both evaluations are submitted and the meeting is opened.</p>' +
      managerButtons +
      '<p><a href="' +
      htmlEscape_(urls.helpUrl) +
      '">View the step-by-step manager guide</a></p>'
  );
}

function sendV31EmployeeLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);

  sendHtmlEmail_(
    cycle['Employee Email'],
    'Action required: Complete your self-evaluation',
    '<p>Hello ' +
      htmlEscape_(cycle['Employee Name']) +
      ',</p>' +
      '<p>Your ' +
      htmlEscape_(cycle['Review Type']) +
      ' process has started.</p>' +
      '<p>Please complete and submit your Employee Self-Evaluation by <strong>' +
      htmlEscape_(
        formatDate_(cycle['Employee Due Date'])
      ) +
      '</strong>.</p>' +
      '<p>Your responses remain private from your manager until both evaluations are submitted and the review meeting is opened.</p>' +
      emailButton_(
        urls.employeeUrl,
        'Start Self-Evaluation'
      ) +
      '<p><a href="' +
      htmlEscape_(urls.helpUrl) +
      '">View the step-by-step employee guide</a></p>'
  );
}

function sendV31HrLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);

  sendHtmlEmail_(
    cycle['HR Email'],
    'Review process launched: ' +
      cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(cycle['HR Name']) +
      ',</p>' +
      '<p>The ' +
      htmlEscape_(cycle['Review Type']) +
      ' process for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> was launched.</p>' +
      '<ul>' +
      '<li>Manager notification sent to ' +
      htmlEscape_(cycle['Manager Email']) +
      '</li>' +
      '<li>Employee notification sent to ' +
      htmlEscape_(cycle['Employee Email']) +
      '</li>' +
      '<li>One calendar event created for the employee, manager, and HR</li>' +
      '<li>Meeting date: ' +
      htmlEscape_(
        formatDate_(
          cycle['Review Meeting Date']
        )
      ) +
      '</li>' +
      '</ul>' +
      emailButton_(
        urls.overviewUrl,
        'Open Review Cycle'
      )
  );
}

/**
 * Validates and normalizes the recipients array for an intentional
 * resend. Defaults to all three roles when omitted.
 */
function normalizeResendRecipients_(recipients) {
  const allowed = ['manager', 'employee', 'hr'];
  const requested =
    Array.isArray(recipients) && recipients.length
      ? recipients
      : allowed.slice();

  const cleaned = requested
    .map(function (recipient) {
      return String(recipient || '').trim().toLowerCase();
    })
    .filter(function (recipient) {
      return allowed.indexOf(recipient) >= 0;
    });

  if (!cleaned.length) {
    throw new Error(
      'No valid recipients were specified for resend.'
    );
  }

  return cleaned;
}

/**
 * Sends one launch email again for an intentional, audited HR resend.
 * Never touches Status/Sent At/Calendar fields — this is a deliberate
 * duplicate, distinct from the crash-safe claim/commit send path.
 */
function resendReviewLaunchRecipient_(cycle, recipient) {
  if (recipient === 'manager') {
    sendV31ManagerLaunchEmail_(cycle);
  } else if (recipient === 'employee') {
    sendV31EmployeeLaunchEmail_(cycle);
  } else if (recipient === 'hr') {
    sendV31HrLaunchEmail_(cycle);
  } else {
    throw new Error(
      'Unsupported resend recipient: ' + recipient
    );
  }
}

/**
 * HR-only intentional resend. recipients is an optional subset of
 * ['manager', 'employee', 'hr'] (defaults to all three). Each
 * recipient is attempted independently so one failure does not block
 * the others, and the full per-recipient outcome is audited.
 */
function resendReviewLaunchEmails(cycleId, recipients) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may resend launch emails.'
    );
  }

  const targets = normalizeResendRecipients_(recipients);
  const location = findCycle_(cycleId);
  const cycle = applyV31DefaultsToCycle_(
    location.object,
    location.object['Cycle Source'] || 'Manual'
  );

  const outcomes = targets.map(function (recipient) {
    try {
      resendReviewLaunchRecipient_(cycle, recipient);

      return { recipient: recipient, ok: true };
    } catch (error) {
      return {
        recipient: recipient,
        ok: false,
        error: String(error.message || error),
      };
    }
  });

  const failedOutcomes = outcomes.filter(function (outcome) {
    return !outcome.ok;
  });

  audit_(
    cycleId,
    'Review launch emails resent',
    email,
    String(cycle['Status']),
    String(cycle['Status']),
    JSON.stringify({
      intentionalResend: true,
      recipients: targets,
      outcomes: outcomes,
      calendarEventId: String(
        cycle['Calendar Event ID'] || ''
      ),
    })
  );

  return {
    ok: failedOutcomes.length === 0,
    outcomes: outcomes,
    message:
      failedOutcomes.length === 0
        ? targets.join(', ') +
          ' launch email(s) resent. The existing calendar event was not duplicated.'
        : 'Some launch emails failed to resend: ' +
          failedOutcomes
            .map(function (outcome) {
              return outcome.recipient + ' (' + outcome.error + ')';
            })
            .join('; '),
  };
}

/**
 * HR-only reconciliation for a component stuck at Delivery Unknown.
 * 'markSent' trusts HR's manual confirmation that delivery already
 * happened (or the Calendar event already exists) without resending.
 * 'resend' re-claims the component and performs the action again,
 * recovering an existing Calendar event by tag/marker first.
 */
function reconcileLaunchDelivery(cycleId, component, action) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may reconcile review launch delivery.'
    );
  }

  const validComponents = ['calendar', 'manager', 'employee', 'hr'];
  const validActions = ['markSent', 'resend'];

  if (validComponents.indexOf(component) < 0) {
    throw new Error(
      'Unsupported reconciliation component: ' + component
    );
  }

  if (validActions.indexOf(action) < 0) {
    throw new Error(
      'Unsupported reconciliation action: ' + action
    );
  }

  if (action === 'markSent') {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (component === 'calendar') {
        if (!cycle['Calendar Event ID']) {
          throw new Error(
            'Cannot mark the calendar as created without an event ID. Use resend instead.'
          );
        }

        cycle['Calendar Status'] = V31.CALENDAR.CREATED;
        cycle['Last Launch Error'] = '';
      } else {
        const fields = getLaunchEmailComponentByKey_(component);

        cycle[fields.statusField] = V31.DELIVERY.SENT;
        cycle[fields.sentAtField] =
          cycle[fields.sentAtField] || new Date();
        clearLastLaunchErrorUnlessCalendarConfig_(cycle);
      }

      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    maybeCompleteReviewLaunch_(cycleId);

    audit_(
      cycleId,
      'Review launch delivery reconciled (marked sent)',
      email,
      component,
      V31.DELIVERY.SENT,
      JSON.stringify({ component: component })
    );

    return {
      ok: true,
      message:
        'Marked ' + component + ' as delivered without resending.',
      launchComponents: getReviewLaunchComponentSummary_(
        findCycle_(cycleId).object
      ),
    };
  }

  // action === 'resend': re-claim under HR authorization and perform
  // the action again (Calendar recovers an existing event by
  // tag/marker before creating a new one).
  let result;

  if (component === 'calendar') {
    result = runCalendarLaunchStep_(cycleId, true);
  } else {
    result = runLaunchEmailStep_(
      cycleId,
      getLaunchEmailComponentByKey_(component),
      true
    );
  }

  if (result.action === 'error') {
    throw result.error;
  }

  maybeCompleteReviewLaunch_(cycleId);

  audit_(
    cycleId,
    'Review launch delivery reconciled (resent)',
    email,
    component,
    'resend',
    JSON.stringify({
      component: component,
      outcome: result.action,
    })
  );

  return {
    ok: true,
    message:
      'Resent ' + component + ' after Delivery Unknown reconciliation.',
    launchComponents: getReviewLaunchComponentSummary_(
      findCycle_(cycleId).object
    ),
  };
}

/* =============================== LOG ===================================== */

function logReviewAutomation_(entry) {
  appendObject_(
    V31.AUTOMATION_SHEET,
    V31.LOG_HEADERS,
    {
      Timestamp: new Date(),
      Mode: entry.mode || '',
      Action: entry.action || '',
      'Employee Email':
        entry.employeeEmail || '',
      'Employee Name':
        entry.employeeName || '',
      'Review Type':
        entry.reviewType || '',
      'Review Date':
        entry.reviewDate || '',
      'Cycle ID': entry.cycleId || '',
      Result: entry.result || '',
      Details: entry.details || '',
    }
  );
}

function getPrimaryAutomationHr_() {
  const settings = getSettings_();
  const configured = normalizeEmail_(
    settings.AUTOMATION_HR_EMAIL || ''
  );
  const rows = getAllObjects_(PR.SHEETS.HR).filter(
    function (row) {
      return (
        row.Active === true ||
        String(row.Active).toLowerCase() ===
          'true'
      );
    }
  );

  let row = null;

  if (configured) {
    row = rows.find(function (item) {
      return (
        normalizeEmail_(item.Email) ===
        configured
      );
    });
  }

  row = row || rows[0];

  if (!row) {
    throw new Error(
      'No active HR user is configured.'
    );
  }

  return {
    email: normalizeEmail_(row.Email),
    name: String(
      row.Name || row.Email
    ),
  };
}

/* ============================== DATE HELPERS ============================== */

function v31Today_() {
  return v31StartOfDay_(new Date());
}

function v31StartOfDay_(date) {
  const value = v31Date_(date);

  if (!value) return null;

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    12,
    0,
    0,
    0
  );
}

function v31Date_(value) {
  if (!value) return null;

  if (
    Object.prototype.toString.call(value) ===
      '[object Date]' &&
    !Number.isNaN(value.getTime())
  ) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12,
      0,
      0,
      0
    );
  }

  const text = String(value).trim();

  let match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0
    );
  }

  match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[1]) - 1,
      Number(match[2]),
      12,
      0,
      0,
      0
    );
  }

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
        0,
        0,
        0
      );
}

function v31AddDays_(date, days) {
  const value = v31StartOfDay_(date);

  value.setDate(value.getDate() + Number(days));

  return value;
}

function v31AddMonthsClamped_(date, months) {
  const value = v31StartOfDay_(date);
  const originalDay = value.getDate();
  const targetMonth =
    value.getMonth() + Number(months);
  const year =
    value.getFullYear() +
    Math.floor(targetMonth / 12);
  const month =
    ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(originalDay, lastDay),
    12,
    0,
    0,
    0
  );
}

function v31AnniversaryInYear_(hireDate, year) {
  const hire = v31StartOfDay_(hireDate);
  const month = hire.getMonth();
  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(hire.getDate(), lastDay),
    12,
    0,
    0,
    0
  );
}

function v31ShiftWeekendForward_(date) {
  const value = v31StartOfDay_(date);

  if (value.getDay() === 6) {
    return v31AddDays_(value, 2);
  }

  if (value.getDay() === 0) {
    return v31AddDays_(value, 1);
  }

  return value;
}

function v31ShiftWeekendBackward_(date) {
  const value = v31StartOfDay_(date);

  if (value.getDay() === 6) {
    return v31AddDays_(value, -1);
  }

  if (value.getDay() === 0) {
    return v31AddDays_(value, -2);
  }

  return value;
}

function v31DaysBetween_(start, end) {
  const a = v31StartOfDay_(start);
  const b = v31StartOfDay_(end);

  return Math.round(
    (b.getTime() - a.getTime()) /
      86400000
  );
}

function v31SameDate_(a, b) {
  const left = v31Date_(a);
  const right = v31Date_(b);

  return (
    !!left &&
    !!right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function v31Boolean_(value, defaultValue) {
  if (value === '' || value == null) {
    return !!defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  return (
    String(value).trim().toLowerCase() ===
    'true'
  );
}

function v31Integer_(
  value,
  minimum,
  maximum,
  label
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new Error(
      label +
        ' must be a whole number between ' +
        minimum +
        ' and ' +
        maximum +
        '.'
    );
  }

  return number;
}
