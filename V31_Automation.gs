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
    'Manager Email Sent At',
    'Employee Email Sent At',
    'HR Email Sent At',
    'Launch Completed At',
    'Last Launch Error',
    'Launch Attempt Count',
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

  CALENDAR: {
    CREATED: 'Created',
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

function runReviewAutomation() {
  return withLock_(function () {
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
    let retried = 0;
    let failed = 0;
    const results = [];

    candidates.forEach(function (candidate) {
      try {
        let cycle;

        if (candidate.existingCycleId) {
          cycle = findCycle_(
            candidate.existingCycleId
          ).object;
          retried++;
        } else {
          cycle = createAutomatedReviewCycle_(
            candidate
          );
          created++;
        }

        const launched =
          launchReviewCycleCommunications_(
            cycle,
            true
          );
        const summary =
          getReviewLaunchComponentSummary_(
            launched
          );

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
        results.push({
          employeeName: candidate.employeeName,
          reviewType: candidate.reviewType,
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
          cycleId:
            candidate.existingCycleId || '',
          result: 'Failed',
          details: error.message,
        });
      }
    });

    const now = new Date();
    setSetting_(
      getSpreadsheet_().getSheetByName(
        PR.SHEETS.SETTINGS
      ),
      'AUTOMATION_LAST_RUN',
      now.toISOString()
    );

    return {
      ok: failed === 0,
      created: created,
      retried: retried,
      failed: failed,
      results: results,
      message:
        created +
        ' review cycle(s) created, ' +
        retried +
        ' launch(es) retried, and ' +
        failed +
        ' failure(s).',
    };
  });
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
    'Manager Email Sent At': '',
    'Employee Email Sent At': '',
    'HR Email Sent At': '',
    'Launch Completed At': '',
    'Last Launch Error': '',
    'Launch Attempt Count': 0,
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
  cycle['Calendar Status'] =
    cycle['Calendar Status'] || '';
  cycle['Calendar Event ID'] =
    cycle['Calendar Event ID'] || '';
  cycle['Calendar Created At'] =
    cycle['Calendar Created At'] || '';
  cycle['Manager Email Sent At'] =
    cycle['Manager Email Sent At'] || '';
  cycle['Employee Email Sent At'] =
    cycle['Employee Email Sent At'] || '';
  cycle['HR Email Sent At'] =
    cycle['HR Email Sent At'] || '';
  cycle['Launch Completed At'] =
    cycle['Launch Completed At'] || '';
  cycle['Last Launch Error'] =
    cycle['Last Launch Error'] || '';
  cycle['Launch Attempt Count'] =
    cycle['Launch Attempt Count'] === '' ||
    cycle['Launch Attempt Count'] == null
      ? 0
      : Number(cycle['Launch Attempt Count'] || 0);
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
    cycle['Employee Email Sent At'] =
      cycle['Employee Email Sent At'] || sentAt;
    cycle['HR Email Sent At'] =
      cycle['HR Email Sent At'] || sentAt;
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

function isReviewLaunchComplete_(cycle) {
  if (!cycle) return false;

  if (cycle['Launch Completed At']) {
    return true;
  }

  // Legacy completed launches used one notice timestamp for all emails.
  return !!(
    cycle['Automation Notice Sent At'] &&
    cycle['Calendar Event ID']
  );
}

function isReviewLaunchComponentsComplete_(cycle) {
  return !!(
    cycle['Calendar Event ID'] &&
    cycle['Manager Email Sent At'] &&
    cycle['Employee Email Sent At'] &&
    cycle['HR Email Sent At']
  );
}

function getReviewLaunchComponentSummary_(cycle) {
  return {
    calendar: !!cycle['Calendar Event ID'],
    managerEmail: !!cycle['Manager Email Sent At'],
    employeeEmail: !!cycle['Employee Email Sent At'],
    hrEmail: !!cycle['HR Email Sent At'],
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

  const parts = [
    cycle['Calendar Event ID']
      ? 'Calendar done'
      : 'Calendar pending',
    cycle['Manager Email Sent At']
      ? 'Manager email done'
      : 'Manager email pending',
    cycle['Employee Email Sent At']
      ? 'Employee email done'
      : 'Employee email pending',
    cycle['HR Email Sent At']
      ? 'HR email done'
      : 'HR email pending',
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

function getDefaultLaunchAdapters_() {
  return {
    createCalendar: createReviewCalendarEvent_,
    sendManager: sendV31ManagerLaunchEmail_,
    sendEmployee: sendV31EmployeeLaunchEmail_,
    sendHr: sendV31HrLaunchEmail_,
  };
}

/**
 * Core launch orchestration. Used by production and idempotency tests.
 * adapters may stub Calendar/Mail; persistFn must persist each step.
 */
function orchestrateReviewLaunchSteps_(
  stored,
  persistFn,
  adapters
) {
  const actions = [];
  const hooks =
    adapters || getDefaultLaunchAdapters_();

  if (isReviewLaunchComplete_(stored)) {
    return {
      cycle: stored,
      actions: actions,
      alreadyComplete: true,
    };
  }

  stored['Launch Attempt Count'] =
    Number(stored['Launch Attempt Count'] || 0) +
    1;
  stored['Updated At'] = new Date();
  persistFn(stored);

  try {
    if (!stored['Calendar Event ID']) {
      const event = hooks.createCalendar(stored);

      stored['Calendar Event ID'] =
        event.getId();
      stored['Calendar Created At'] =
        new Date();
      stored['Calendar Status'] =
        V31.CALENDAR.CREATED;
      stored['Last Launch Error'] = '';
      stored['Updated At'] = new Date();
      persistFn(stored);
      actions.push('calendar');
    } else if (!stored['Calendar Status']) {
      stored['Calendar Status'] =
        V31.CALENDAR.CREATED;
      stored['Updated At'] = new Date();
      persistFn(stored);
    }

    if (!stored['Manager Email Sent At']) {
      hooks.sendManager(stored);
      stored['Manager Email Sent At'] =
        new Date();
      stored['Last Launch Error'] = '';
      stored['Updated At'] = new Date();
      persistFn(stored);
      actions.push('manager');
    }

    if (!stored['Employee Email Sent At']) {
      hooks.sendEmployee(stored);
      stored['Employee Email Sent At'] =
        new Date();
      stored['Last Launch Error'] = '';
      stored['Updated At'] = new Date();
      persistFn(stored);
      actions.push('employee');
    }

    if (!stored['HR Email Sent At']) {
      hooks.sendHr(stored);
      stored['HR Email Sent At'] = new Date();
      stored['Last Launch Error'] = '';
      stored['Updated At'] = new Date();
      persistFn(stored);
      actions.push('hr');
    }

    if (
      isReviewLaunchComponentsComplete_(stored) &&
      !stored['Launch Completed At']
    ) {
      const completedAt = new Date();

      stored['Launch Completed At'] =
        completedAt;
      stored['Automation Notice Sent At'] =
        stored['Automation Notice Sent At'] ||
        completedAt;
      stored['Last Launch Error'] = '';
      stored['Updated At'] = completedAt;
      persistFn(stored);
      actions.push('complete');
    }

    return {
      cycle: stored,
      actions: actions,
      alreadyComplete: false,
    };
  } catch (error) {
    stored['Last Launch Error'] = String(
      error.message || error
    );
    stored['Updated At'] = new Date();
    persistFn(stored);
    throw error;
  }
}

/**
 * Create Calendar event and send launch emails with independently
 * persisted completion for each external action.
 *
 * Callers that mutate cycles (createReviewCycle, runReviewAutomation,
 * retryReviewLaunch) must already hold LockService.getScriptLock() —
 * script locks are not re-entrant, so this function does not nest
 * another lock.
 */
function launchReviewCycleCommunications_(
  cycle,
  automated
) {
  const location = findCycle_(
    cycle['Cycle ID']
  );
  let stored = applyV31DefaultsToCycle_(
    location.object,
    automated ? 'Automated' : 'Manual'
  );

  if (isReviewLaunchComplete_(stored)) {
    const needsLegacyPersist =
      !location.object['Launch Completed At'] &&
      !!stored['Launch Completed At'];

    if (needsLegacyPersist) {
      stored['Updated At'] = new Date();
      persistLaunchCycle_(
        location.rowNumber,
        stored
      );
    }

    return stored;
  }

  const result = orchestrateReviewLaunchSteps_(
    stored,
    function (row) {
      persistLaunchCycle_(
        location.rowNumber,
        row
      );
    },
    getDefaultLaunchAdapters_()
  );

  return result.cycle;
}

/**
 * HR-only: resume an incomplete launch without clearing completed
 * component timestamps. Distinct from intentional resend.
 */
function retryReviewLaunch(cycleId) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry an incomplete review launch.'
    );
  }

  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] ||
        'Manual'
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

    const before = getReviewLaunchComponentSummary_(
      cycle
    );
    const launched = launchReviewCycleCommunications_(
      cycle,
      String(cycle['Cycle Source'] || '') ===
        'Automated'
    );
    const after = getReviewLaunchComponentSummary_(
      launched
    );

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
      details: describeReviewLaunchStatus_(
        launched
      ),
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
  });
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
 * Recover an event created in a prior attempt whose ID was never
 * persisted (crash between createEvent and writeCycle_).
 */
function findExistingReviewCalendarEventByTag_(
  calendar,
  cycleId,
  meetingDate
) {
  if (!calendar || !cycleId || !meetingDate) {
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
    dayStart.getTime() - 86400000
  );
  const rangeEnd = new Date(
    dayStart.getTime() + 2 * 86400000
  );
  const events = calendar.getEvents(
    rangeStart,
    rangeEnd
  );
  const wanted = String(cycleId);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const tag = String(
      event.getTag('AITHERAS_REVIEW_CYCLE_ID') ||
        ''
    );

    if (tag === wanted) {
      return event;
    }
  }

  return null;
}

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

  const recovered =
    findExistingReviewCalendarEventByTag_(
      calendar,
      cycle['Cycle ID'],
      meetingDate
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

  const event = calendar.createEvent(
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

  return event;
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
 * Sends all three launch emails. Used only by the intentional HR
 * resend control — does not update per-recipient timestamps.
 */
function sendV31LaunchEmails_(cycle) {
  sendV31ManagerLaunchEmail_(cycle);
  sendV31EmployeeLaunchEmail_(cycle);
  sendV31HrLaunchEmail_(cycle);
}

function resendReviewLaunchEmails(cycleId) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may resend launch emails.'
    );
  }

  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] ||
        'Manual'
    );

    sendV31LaunchEmails_(cycle);

    audit_(
      cycleId,
      'Review launch emails resent',
      email,
      String(cycle['Status']),
      String(cycle['Status']),
      JSON.stringify({
        intentionalResend: true,
        calendarEventId: String(
          cycle['Calendar Event ID'] || ''
        ),
      })
    );

    return {
      ok: true,
      message:
        'The HR, manager, and employee launch emails were resent. The existing calendar event was not duplicated.',
    };
  });
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
