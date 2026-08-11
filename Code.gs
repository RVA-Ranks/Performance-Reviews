/**
 * AITHERAS Performance Review Portal
 *
 * Deploy as:
 *   Execute as: Me
 *   Who has access: Anyone within AITHERAS
 *
 * Combined signature workflow:
 *   Manager and Employee each sign once, in either order.
 *   HR signs once after both participants.
 *   Each signature is applied to both final review documents.
 */

const APP_VERSION = '3.1-production-candidate';

const PR = Object.freeze({
  SHEETS: {
    SETTINGS: 'ReviewSettings',
    HR: 'ReviewHRUsers',
    ASSIGNMENTS: 'EmployeeAssignments',
    CYCLES: 'ReviewCycles',
    AUDIT: 'ReviewAuditLog',
    PENDING_AUDIT: 'ReviewPendingAudits',
  },

  CYCLE: {
    OPEN: 'Open for Input',
    READY: 'Ready for Review Meeting',
    MEETING: 'Review Meeting Open',
    SIGNATURES: 'Awaiting Signatures',
    FINALIZING: 'Finalizing',
    COMPLETE: 'Complete',
    CANCELLED: 'Cancelled',
  },

  DOC: {
    NOT_STARTED: 'Not Started',
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING_PARTICIPANTS: 'Pending Manager and Employee Signatures',
    PENDING_MANAGER: 'Pending Manager Signature',
    PENDING_EMPLOYEE: 'Pending Employee Signature',
    PENDING_HR: 'Pending HR Signature',
    COMPLETE: 'Complete',
  },

  TYPE: {
    MANAGER: 'Manager Review',
    SELF: 'Self-Evaluation',
  },

  ROLE: {
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    HR: 'HR',
  },

  SETTINGS_DEFAULTS: {
    APP_NAME: 'AITHERAS Performance Reviews',
    APP_VERSION: '3.1-production-candidate',
    ENVIRONMENT: 'Production',
    ALLOWED_DOMAIN: 'aitheras.com',
    REVIEW_FOLDER_ID: '',
    MANAGER_TEMPLATE_ID: '',
    SELF_TEMPLATE_ID: '',
    WEB_APP_URL: '',
    AUTOSAVE_DELAY_SECONDS: '5',
  },

  CYCLE_HEADERS: [
    'Cycle ID',
    'Created At',
    'Updated At',
    'Status',
    'Review Type',
    'Review Period Start',
    'Review Period End',
    'Review Meeting Date',
    'Employee Name',
    'Employee Email',
    'Employee Job Title',
    'Department / Project',
    'Hire Date',
    'Manager Name',
    'Manager Email',
    'HR Name',
    'HR Email',
    'Manager Review Status',
    'Manager Review JSON',
    'Self Evaluation Status',
    'Self Evaluation JSON',
    'Meeting Opened At',
    'Meeting Opened By',
    'Meeting JSON',
    'Signatures Released At',
    'Signatures Released By',
    'MGR Manager Signature ID',
    'MGR Manager Signed At',
    'MGR Employee Signature ID',
    'MGR Employee Signed At',
    'MGR HR Signature ID',
    'MGR HR Signed At',
    'SELF Employee Signature ID',
    'SELF Employee Signed At',
    'SELF Manager Signature ID',
    'SELF Manager Signed At',
    'SELF HR Signature ID',
    'SELF HR Signed At',
    'Manager Signature File ID',
    'Manager Signed At',
    'Manager Signature Last Error',
    'Employee Signature File ID',
    'Employee Signed At',
    'Employee Signature Last Error',
    'HR Signature File ID',
    'Manager Signature Recovery File ID',
    'Employee Signature Recovery File ID',
    'HR Signature Recovery File ID',
    'Manager Signature Reconciliation Selected File ID',
    'Employee Signature Reconciliation Selected File ID',
    'HR Signature Reconciliation Selected File ID',
    'HR Signed At',
    'HR Signature Last Error',
    'Manager Review PDF ID',
    'Self Evaluation PDF ID',
    'Completed At',
  ],

  AUDIT_HEADERS: [
    'Timestamp',
    'Event ID',
    'Cycle ID',
    'Action',
    'Actor Email',
    'Previous Status',
    'New Status',
    'Details',
  ],

  PENDING_AUDIT_HEADERS: [
    'Event ID',
    'Created At',
    'Updated At',
    'Cycle ID',
    'Action',
    'Actor Email',
    'Previous Status',
    'New Status',
    'Details',
    'Status',
    'Last Error',
    'Completed At',
  ],

  FACTORS: [
    {
      id: 'quality',
      label: 'Quality of Work',
      description:
        'Accuracy, thoroughness, professionalism, compliance, and overall usefulness of completed work.',
    },
    {
      id: 'productivity',
      label: 'Productivity / Volume of Work',
      description:
        'Amount of work completed, efficient use of time, and ability to manage competing priorities.',
    },
    {
      id: 'dependability',
      label: 'Dependability and Follow-Through',
      description:
        'Reliability in meeting commitments, completing work, communicating delays, and closing the loop.',
    },
    {
      id: 'collaboration',
      label: 'Collaboration / Working With Others',
      description:
        'Cooperation, professionalism, communication, trust, and effectiveness with coworkers and stakeholders.',
    },
    {
      id: 'planning',
      label: 'Planning and Organization',
      description:
        'Ability to prioritize, anticipate needs, organize work, and prepare for deadlines or recurring responsibilities.',
    },
    {
      id: 'skills',
      label: 'Job Knowledge / Skills Proficiency',
      description:
        'Knowledge and technical proficiency required for the role, continued learning, and sound judgment.',
    },
    {
      id: 'safetyCompliance',
      label: 'Safety, Security, and Compliance',
      description:
        'Adherence to applicable safety, security, confidentiality, contractual, regulatory, and company requirements.',
    },
    {
      id: 'attendance',
      label: 'Attendance and Availability',
      description:
        'Reliability of attendance, punctuality, responsiveness, and appropriate availability for job responsibilities.',
    },
    {
      id: 'initiative',
      label: 'Initiative',
      description:
        'Proactive problem-solving, ownership, judgment, and willingness to improve work or address emerging needs.',
    },
    {
      id: 'adaptability',
      label: 'Adaptability / Versatility',
      description:
        'Ability to adjust to changing priorities, learn new responsibilities, and contribute across different needs.',
    },
  ],

  RATINGS: [
    {
      value: 1,
      label: 'Unsatisfactory',
      definition:
        'Does not meet essential job expectations. Immediate and substantial improvement is required.',
    },
    {
      value: 2,
      label: 'Significantly Below Expectations',
      definition:
        'Frequently falls below important expectations and requires significant support or corrective action.',
    },
    {
      value: 3,
      label: 'Partially Meets Expectations',
      definition:
        'Meets some expectations, but recurring gaps or inconsistencies require improvement.',
    },
    {
      value: 4,
      label: 'Fully Meets Expectations',
      definition:
        'Consistently performs the job at the expected level with reliable quality, productivity, and conduct.',
    },
    {
      value: 5,
      label: 'Frequently Exceeds Expectations',
      definition:
        'Fully meets all expectations and often performs above the expected level.',
    },
    {
      value: 6,
      label: 'Consistently Exceeds Expectations',
      definition:
        'Regularly performs above expectations across most responsibilities with strong independence and impact.',
    },
    {
      value: 7,
      label: 'Exceptional',
      definition:
        'Sustained, extraordinary performance with significant impact beyond normal role expectations. Rare and supported by specific examples.',
    },
  ],
});

/* ============================== SETUP ==================================== */

function setupReviewSystem_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Create a blank Google Sheet, open Extensions → Apps Script, and run setupReviewSystem_() from that bound project.'
    );
  }

  PropertiesService.getScriptProperties().setProperty(
    'REVIEW_SPREADSHEET_ID',
    ss.getId()
  );

  const settings = getOrCreateSheet_(ss, PR.SHEETS.SETTINGS);
  const hr = getOrCreateSheet_(ss, PR.SHEETS.HR);
  const assignments = getOrCreateSheet_(ss, PR.SHEETS.ASSIGNMENTS);
  const cycles = getOrCreateSheet_(ss, PR.SHEETS.CYCLES);
  const audit = getOrCreateSheet_(ss, PR.SHEETS.AUDIT);

  ensureHeaders_(settings, ['Key', 'Value']);
  ensureHeaders_(hr, ['Email', 'Name', 'Active']);
  ensureHeaders_(assignments, [
    'Employee Email',
    'Employee Name',
    'Manager Email',
    'Manager Name',
    'Job Title',
    'Department / Project',
    'Hire Date',
    'Active',
  ]);
  ensureHeaders_(cycles, PR.CYCLE_HEADERS);
  ensureReviewAuditEventIdHeader_(audit);
  ensurePendingAuditSheet_();

  // V3.1 adds automation, calendar, compensation-task, and guidance fields.
  ensureV31DataModel_();

  const current = readSettings_(settings);
  Object.keys(PR.SETTINGS_DEFAULTS).forEach(function (key) {
    if (!(key in current)) {
      settings.appendRow([key, PR.SETTINGS_DEFAULTS[key]]);
    }
  });

  let updated = readSettings_(settings);

  if (!updated.REVIEW_FOLDER_ID) {
    const folder = DriveApp.createFolder(
      'AITHERAS Performance Review Records'
    );
    setSetting_(settings, 'REVIEW_FOLDER_ID', folder.getId());
  }

  updated = readSettings_(settings);
  provisionSignatureRecoveryFolder_();

  if (!updated.MANAGER_TEMPLATE_ID) {
    setSetting_(
      settings,
      'MANAGER_TEMPLATE_ID',
      createReviewTemplate_(
        PR.TYPE.MANAGER,
        updated.REVIEW_FOLDER_ID
      )
    );
  }

  updated = readSettings_(settings);

  if (!updated.SELF_TEMPLATE_ID) {
    setSetting_(
      settings,
      'SELF_TEMPLATE_ID',
      createReviewTemplate_(
        PR.TYPE.SELF,
        updated.REVIEW_FOLDER_ID
      )
    );
  }

  if (hr.getLastRow() === 1) {
    const email = normalizeEmail_(
      Session.getEffectiveUser().getEmail()
    );
    hr.appendRow([email, 'Initial HR Administrator', true]);
  }

  formatSheets_(ss);
  protectSheets_(ss);

  SpreadsheetApp.getUi().alert(
    'Setup complete.\n\n' +
      'Add HR users and employee-manager assignments, customize the two templates, and deploy the web app.'
  );
}

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialCycleId = sanitizeDeepLinkCycleId_(
    e && e.parameter && e.parameter.cycleId
  );
  template.initialAction = sanitizeDeepLinkAction_(
    e && e.parameter && e.parameter.action
  );

  return template
    .evaluate()
    .setTitle('AITHERAS Performance Reviews')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Deep-link cycle IDs must be strict opaque identifiers (UUID / token shape).
 */
function sanitizeDeepLinkCycleId_(value) {
  const id = String(value == null ? '' : value).trim();
  if (!id) return '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return '';
  return id;
}

/**
 * Deep-link actions are allow-listed. Unknown values are dropped.
 */
function sanitizeDeepLinkAction_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  const allowed = {
    overview: true,
    manager: true,
    'manager-review': true,
    self: true,
    'self-evaluation': true,
    meeting: true,
    signature: true,
    signatures: true,
    compensation: true,
  };
  return allowed[raw] ? raw : '';
}

/* ============================= BOOTSTRAP ================================= */

function getReviewBootstrapData(initialCycleId) {
  perfBeginRequest_('homeBootstrap');
  const total = perfStart_('bootstrap total');
  try {
    const authTimer = perfStart_('auth');

    const userTimer = perfStart_('auth › active user');
    const email = getCurrentUserEmail_();
    perfEnd_(userTimer);

    const settingsTimer = perfStart_('auth › ReviewSettings');
    const settings = getSettings_();
    perfEnd_(settingsTimer);

    const domainTimer = perfStart_('auth › domain validation');
    assertDomain_(email, settings.ALLOWED_DOMAIN);
    perfEnd_(domainTimer);

    const hrTimer = perfStart_('auth › ReviewHRUsers / role');
    const isHr = isHrUser_(email);
    perfEnd_(hrTimer, { isHr: isHr });

    perfEnd_(authTimer, { isHr: isHr, nested: true });

    const profileTimer = perfStart_('userProfile');
    const user = getUserProfile_(email, isHr);
    perfEnd_(profileTimer);

    const cyclesTimer = perfStart_('cycles');
    const cycles = listVisibleCycles_(email, isHr);
    perfEnd_(cyclesTimer, {
      cycleCount: cycles.length,
      note: 'parent of review summaries',
    });

    const assignTimer = perfStart_('assignments');
    const assignments = isHr ? getActiveAssignments_() : [];
    perfEnd_(assignTimer, { assignmentCount: assignments.length });

    const v31Timer = perfStart_('v31Bootstrap');
    const v31 = getV31BootstrapData_(email, isHr);
    perfEnd_(v31Timer, { nested: true });

    let selectedCycle = null;
    if (initialCycleId) {
      const selectedTimer = perfStart_('selectedCycle');
      selectedCycle = getCycleView_(initialCycleId, email, isHr);
      perfEnd_(selectedTimer);
    }

    const payload = {
      appVersion: APP_VERSION,
      environment: String(settings.ENVIRONMENT || 'Production'),
      currentUserEmail: email,
      isHr: isHr,
      user: user,
      appName: settings.APP_NAME,
      autosaveDelaySeconds:
        Math.max(Number(settings.AUTOSAVE_DELAY_SECONDS || 5), 2),
      factors: PR.FACTORS,
      ratings: PR.RATINGS,
      assignments: assignments,
      cycles: cycles,
      v31: v31,
      selectedCycle: selectedCycle,
      perfDiagnostics: isPerfDiagnosticsEnabled_(),
    };

    const serializeTimer = perfStart_('serialization');
    perfLogPayloadBytes_('bootstrap', payload);
    perfEnd_(serializeTimer);
    perfEnd_(total, {
      cycleCount: cycles.length,
      isHr: isHr,
    });
    const req = perfGetRequest_();
    perfEndRequest_({
      cycleCount: cycles.length,
      isHr: isHr,
      sheetReads: req ? req.sheetReads : null,
      driveCalls: req ? req.driveCalls : null,
    });
    return payload;
  } catch (error) {
    perfEndRequest_({ error: String(error.message || error) });
    throw error;
  }
}

function getReviewCycle(cycleId) {
  perfBeginRequest_('openReview');
  const total = perfStart_('openReview total');
  try {
    const email = getCurrentUserEmail_();
    const settings = getSettings_();
    assertDomain_(email, settings.ALLOWED_DOMAIN);
    const isHr = isHrUser_(email);
    const cycle = getCycleView_(cycleId, email, isHr);
    const payload = { cycle: cycle };
    perfLogPayloadBytes_('openReview', payload);
    perfEnd_(total);
    perfEndRequest_();
    return payload;
  } catch (error) {
    perfEndRequest_({ error: String(error.message || error) });
    throw error;
  }
}

/* ============================= CYCLE CRUD ================================ */

function createReviewCycle(payload) {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();

  assertDomain_(email, settings.ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error('Only HR may create a review cycle.');
  }

  const clean = validateCyclePayload_(
    payload,
    settings.ALLOWED_DOMAIN
  );
  const hrRecord = getHrRecord_(email);
  const now = new Date();
  const cycleId = Utilities.getUuid();

  const row = withLock_(function () {
    const duplicate = findDuplicateActiveManualCycle_(
      clean.employeeEmail,
      clean.reviewType,
      parseDateInput_(clean.reviewPeriodStart),
      parseDateInput_(clean.reviewPeriodEnd)
    );

    if (duplicate) {
      throw new Error(
        'An active review cycle already exists for this employee, review type, and period (' +
          duplicate['Cycle ID'] +
          '). Open that cycle and use Retry Launch instead of creating another.'
      );
    }

    const created = {
      'Cycle ID': cycleId,
      'Created At': now,
      'Updated At': now,
      'Status': PR.CYCLE.OPEN,
      'Review Type': clean.reviewType,
      'Review Period Start': parseDateInput_(clean.reviewPeriodStart),
      'Review Period End': parseDateInput_(clean.reviewPeriodEnd),
      'Review Meeting Date': parseDateInput_(clean.reviewMeetingDate),
      'Employee Name': clean.employeeName,
      'Employee Email': clean.employeeEmail,
      'Employee Job Title': clean.employeeJobTitle,
      'Department / Project': clean.departmentProject,
      'Hire Date': clean.hireDate
        ? parseDateInput_(clean.hireDate)
        : '',
      'Manager Name': clean.managerName,
      'Manager Email': clean.managerEmail,
      'HR Name': hrRecord.name,
      'HR Email': email,
      'Manager Review Status': PR.DOC.NOT_STARTED,
      'Manager Review JSON': JSON.stringify(emptyManagerReview_()),
      'Self Evaluation Status': PR.DOC.NOT_STARTED,
      'Self Evaluation JSON': JSON.stringify(emptySelfEvaluation_()),
      'Meeting Opened At': '',
      'Meeting Opened By': '',
      'Meeting JSON': JSON.stringify(emptyMeeting_()),
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
    };

    applyV31DefaultsToCycle_(created, 'Manual');

    appendObject_(
      PR.SHEETS.CYCLES,
      PR.CYCLE_HEADERS.concat(V31.CYCLE_HEADERS),
      created
    );

    return {
      cycle: created,
      pendingAuditEvent: buildPendingAuditEvent_(
        cycleId,
        'Review cycle created',
        email,
        '',
        PR.CYCLE.OPEN,
        JSON.stringify({
          employeeEmail: clean.employeeEmail,
          managerEmail: clean.managerEmail,
        })
      ),
    };
  });

  let auditWarning = '';
  if (row.pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(
      row.pendingAuditEvent
    );
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }

  // After the row is committed, never present creation as a total failure.
  let launchError = '';
  let launched = row.cycle;

  try {
    launched = launchReviewCycleCommunications_(row.cycle, false);
  } catch (error) {
    launchError = String(error.message || error);
    launched = findCycle_(cycleId).object;
  }

  const launchComplete = isReviewLaunchComplete_(launched);

  return {
    ok: true,
    cycleCreated: true,
    launchComplete: launchComplete,
    cycleId: cycleId,
    message: launchComplete
      ? 'The review cycle was created, HR and both participants were notified, and one shared calendar event was added.'
      : 'Review created, but launch requires attention.' +
        (launchError ? ' ' + launchError : ' ' + describeReviewLaunchStatus_(launched)),
    launchComponents: getReviewLaunchComponentSummary_(launched),
    auditWarning: auditWarning || '',
  };
}

/**
 * Reject a second active manual cycle for the same employee, type, and
 * period window. Complete cycles do not block a later period reuse.
 */
function findDuplicateActiveManualCycle_(
  employeeEmail,
  reviewType,
  periodStart,
  periodEnd
) {
  const wantedEmail = normalizeEmail_(employeeEmail);
  const wantedType = String(reviewType || '');
  const startMs = periodStart ? new Date(periodStart).getTime() : NaN;
  const endMs = periodEnd ? new Date(periodEnd).getTime() : NaN;
  const blockingStatuses = [
    PR.CYCLE.OPEN,
    PR.CYCLE.READY,
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
  ];

  if (!wantedEmail || !wantedType || Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }

  const cycles = getAllObjects_(PR.SHEETS.CYCLES);

  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];

    if (
      blockingStatuses.indexOf(String(cycle['Status'] || '')) < 0
    ) {
      continue;
    }

    if (normalizeEmail_(cycle['Employee Email']) !== wantedEmail) {
      continue;
    }

    if (String(cycle['Review Type'] || '') !== wantedType) {
      continue;
    }

    const existingStart = cycle['Review Period Start']
      ? new Date(cycle['Review Period Start']).getTime()
      : NaN;
    const existingEnd = cycle['Review Period End']
      ? new Date(cycle['Review Period End']).getTime()
      : NaN;

    if (existingStart === startMs && existingEnd === endMs) {
      return cycle;
    }
  }

  return null;
}

function saveManagerReview(cycleId, payload, submit) {
  return saveIndependentReview_(
    cycleId,
    PR.TYPE.MANAGER,
    payload,
    !!submit,
    'manual'
  );
}

function saveSelfEvaluation(cycleId, payload, submit) {
  return saveIndependentReview_(
    cycleId,
    PR.TYPE.SELF,
    payload,
    !!submit,
    'manual'
  );
}

function autosaveReview(cycleId, type, payload) {
  if (![PR.TYPE.MANAGER, PR.TYPE.SELF].includes(type)) {
    throw new Error('Unsupported review type.');
  }

  return saveIndependentReview_(
    cycleId,
    type,
    payload,
    false,
    'autosave'
  );
}

function saveIndependentReview_(
  cycleId,
  type,
  payload,
  submit,
  source
) {
  const saved = withLock_(function () {
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;

    const isAuthorized =
      (type === PR.TYPE.MANAGER &&
        normalizeEmail_(cycle['Manager Email']) === email) ||
      (type === PR.TYPE.SELF &&
        normalizeEmail_(cycle['Employee Email']) === email);

    if (!isAuthorized) {
      throw new Error(
        'Only the assigned participant may edit this evaluation.'
      );
    }

    const statusField =
      type === PR.TYPE.MANAGER
        ? 'Manager Review Status'
        : 'Self Evaluation Status';
    const jsonField =
      type === PR.TYPE.MANAGER
        ? 'Manager Review JSON'
        : 'Self Evaluation JSON';

    if (
      ![PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle[statusField])
      )
    ) {
      throw new Error(
        'This review has already been submitted and is sealed.'
      );
    }

    const clean =
      type === PR.TYPE.MANAGER
        ? validateManagerReview_(payload, submit)
        : validateSelfEvaluation_(payload, submit);

    const now = new Date();
    const previousStatus = String(cycle[statusField]);
    const newStatus = submit ? PR.DOC.SUBMITTED : PR.DOC.DRAFT;

    clean.lastSavedAt = now.toISOString();
    clean.submittedAt = submit
      ? now.toISOString()
      : clean.submittedAt || '';

    cycle[statusField] = newStatus;
    cycle[jsonField] = JSON.stringify(clean);
    cycle['Updated At'] = now;

    updateCycleReadiness_(cycle);
    writeCycle_(location.rowNumber, cycle);

    let pendingAuditEvent = null;
    if (source !== 'autosave') {
      pendingAuditEvent = buildPendingAuditEvent_(
        cycleId,
        type +
          (submit ? ' submitted and sealed' : ' draft saved'),
        email,
        previousStatus,
        newStatus,
        ''
      );
    }

    return {
      ok: true,
      status: newStatus,
      savedAt: formatDateTime_(now),
      savedAtIso: now.toISOString(),
      message: submit
        ? type + ' submitted and sealed.'
        : source === 'autosave'
        ? 'Draft autosaved.'
        : type + ' draft saved.',
      notifyReady:
        submit && String(cycle['Status']) === PR.CYCLE.READY,
      pendingAuditEvent: pendingAuditEvent,
    };
  });

  let auditWarning = '';
  if (saved.pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(
      saved.pendingAuditEvent
    );
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }
  saved.auditWarning = auditWarning;

  if (saved.notifyReady) {
    try {
      deliverWorkflowNotification_(
        cycleId,
        getWorkflowNotificationComponent_('ready'),
        function (cycle) {
          sendReadyForMeetingEmailBody_(cycle);
        },
        {}
      );
      dispatchPendingWorkflowNotifications_(cycleId);
    } catch (notifyError) {
      Logger.log(
        'Post-submit notification acceleration failed: ' +
          String(
            (notifyError && notifyError.message) || notifyError
          )
      );
      auditWarning =
        (auditWarning ? auditWarning + ' ' : '') +
        'The review was saved, but notification delivery needs attention and will retry through the durable outbox.';
      saved.auditWarning = auditWarning;
    }
  }

  if (submit) {
    try {
      maybeRaiseCompensationOwnerAlert_(findCycle_(cycleId).object);
    } catch (compAlertError) {
      Logger.log(
        'Compensation owner alert (submit) failed: ' +
          String(compAlertError.message || compAlertError)
      );
    }
  }

  return {
    ok: saved.ok,
    status: saved.status,
    savedAt: saved.savedAt,
    savedAtIso: saved.savedAtIso,
    message: saved.message,
    auditWarning: saved.auditWarning || '',
    notificationWarning: /notification delivery needs attention/i.test(
      String(saved.auditWarning || '')
    )
      ? saved.auditWarning
      : '',
    compensationDecisionRequired:
      type === PR.TYPE.MANAGER &&
      !!submit &&
      v31Boolean_(
        getSettings_().COMPENSATION_DECISION_REQUIRED,
        true
      ) &&
      !isV31CompensationComplete_(
        findCycle_(cycleId).object
      ),
    compensationDecision:
      type === PR.TYPE.MANAGER && submit
        ? normalizeCompensationDecision_(
            findCycle_(cycleId).object['Compensation Decision']
          )
        : '',
  };
}

/**
 * Pure planner for startReviewMeeting — testable without Sheets I/O.
 * Returns action: open | alreadyOpen | reject.
 */
function planStartReviewMeeting_(cycle) {
  const status = String((cycle && cycle['Status']) || '');
  const openedAt = cycle && cycle['Meeting Opened At'];
  const hasOpenedMarker =
    openedAt !== '' &&
    openedAt !== null &&
    typeof openedAt !== 'undefined';

  if (status === PR.CYCLE.MEETING && hasOpenedMarker) {
    return {
      action: 'alreadyOpen',
      message:
        'The review meeting is already open. Both reviews are visible to the manager and employee.',
    };
  }

  if (
    status === PR.CYCLE.SIGNATURES ||
    status === PR.CYCLE.FINALIZING ||
    status === PR.CYCLE.COMPLETE
  ) {
    return {
      action: 'alreadyOpen',
      message:
        'The review meeting was already opened. The cycle has progressed past the meeting stage.',
    };
  }

  if (status !== PR.CYCLE.READY) {
    return {
      action: 'reject',
      message:
        'Both reviews must be submitted before the meeting can be opened.',
    };
  }

  return { action: 'open' };
}

function startReviewMeeting(cycleId) {
  const email = getCurrentUserEmail_();
  let pendingAuditEvent = null;
  let alreadyOpen = false;
  const cycle = withLock_(function () {
    const location = findCycle_(cycleId);
    const stored = location.object;

    const authorized =
      isHrUser_(email) ||
      normalizeEmail_(stored['Manager Email']) === email;

    if (!authorized) {
      throw new Error(
        'Only the assigned manager or HR may start the meeting.'
      );
    }

    const plan = planStartReviewMeeting_(stored);
    if (plan.action === 'alreadyOpen') {
      alreadyOpen = true;
      return stored;
    }
    if (plan.action === 'reject') {
      throw new Error(plan.message);
    }

    if (!isV31CompensationComplete_(stored)) {
      throw new Error(
        'The compensation decision must be resolved before the review meeting can be opened.'
      );
    }

    stored['Status'] = PR.CYCLE.MEETING;
    stored['Meeting Opened At'] = new Date();
    stored['Meeting Opened By'] = email;
    stored['Updated At'] = new Date();

    writeCycle_(location.rowNumber, stored);

    pendingAuditEvent = buildPendingAuditEvent_(
      cycleId,
      'Review meeting opened',
      email,
      PR.CYCLE.READY,
      PR.CYCLE.MEETING,
      '',
      'MEETING_OPENED:' +
        String(cycleId) +
        ':' +
        toIsoString_(stored['Meeting Opened At'])
    );

    return stored;
  });

  let auditWarning = '';
  if (pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(pendingAuditEvent);
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }

  let notificationWarning = '';
  if (!alreadyOpen) {
    try {
      sendMeetingOpenedEmails_(cycleId);
      dispatchPendingWorkflowNotifications_(cycleId);
    } catch (notifyError) {
      Logger.log(
        'Post-meeting-open notification failed: ' +
          String(
            (notifyError && notifyError.message) || notifyError
          )
      );
      notificationWarning =
        'The meeting is open, but notification delivery needs attention and will retry through the durable outbox.';
    }
  }

  return {
    ok: true,
    alreadyOpen: alreadyOpen,
    status: String(cycle['Status'] || ''),
    message: alreadyOpen
      ? 'The review meeting is already open. Both reviews are visible to the manager and employee.'
      : 'The meeting is open. Both reviews are now visible to the manager and employee.',
    auditWarning: auditWarning || '',
    notificationWarning: notificationWarning || '',
  };
}

function saveMeetingOutcomes(cycleId, payload) {
  return saveMeetingOutcomes_(cycleId, payload, false);
}

function autosaveMeetingOutcomes(cycleId, payload) {
  return saveMeetingOutcomes_(cycleId, payload, true);
}

function emptyMeeting_() {
  return {
    managerFinalComments: '',
    developmentGoals: '',
    actionSteps: '',
    employeeComments: '',
    lastSavedAt: '',
    contentRevision: 0,
    releaseRequestId: '',
    releaseRequestedAt: '',
    releaseRequestedBy: '',
    managerReleaseAckRequestId: '',
    managerReleaseAckRevision: null,
    managerReleaseAckAt: '',
    employeeReleaseAckRequestId: '',
    employeeReleaseAckRevision: null,
    employeeReleaseAckAt: '',
    sealedAt: '',
    sealedBy: '',
  };
}

function parseMeetingJson_(cycle) {
  const meeting = parseJson_(
    cycle && cycle['Meeting JSON'],
    emptyMeeting_()
  );
  if (!Number.isFinite(Number(meeting.contentRevision))) {
    meeting.contentRevision = 0;
  }
  meeting.releaseRequestId = String(meeting.releaseRequestId || '');
  meeting.releaseRequestedAt = String(
    meeting.releaseRequestedAt || ''
  );
  meeting.releaseRequestedBy = String(
    meeting.releaseRequestedBy || ''
  );
  meeting.managerReleaseAckRequestId = String(
    meeting.managerReleaseAckRequestId || ''
  );
  meeting.employeeReleaseAckRequestId = String(
    meeting.employeeReleaseAckRequestId || ''
  );
  meeting.managerReleaseAckAt = String(
    meeting.managerReleaseAckAt || ''
  );
  meeting.employeeReleaseAckAt = String(
    meeting.employeeReleaseAckAt || ''
  );
  meeting.sealedAt = String(meeting.sealedAt || '');
  meeting.sealedBy = String(meeting.sealedBy || '');
  return meeting;
}

function clearMeetingReleaseAcks_(meeting) {
  meeting.managerReleaseAckRequestId = '';
  meeting.managerReleaseAckRevision = null;
  meeting.managerReleaseAckAt = '';
  meeting.employeeReleaseAckRequestId = '';
  meeting.employeeReleaseAckRevision = null;
  meeting.employeeReleaseAckAt = '';
  return meeting;
}

/**
 * Start or reuse an immutable release request. New request clears ACKs.
 */
function requestMeetingReleaseOnMeetingJson_(
  meeting,
  actorEmail,
  now,
  cycleId
) {
  if (meeting.releaseRequestId && meeting.releaseRequestedAt) {
    return { meeting: meeting, created: false };
  }
  const when = now instanceof Date ? now : new Date();
  const requestId =
    'RELEASE:' +
    String(cycleId || 'cycle') +
    ':' +
    when.toISOString();
  meeting.releaseRequestId = requestId;
  meeting.releaseRequestedAt = when.toISOString();
  meeting.releaseRequestedBy = normalizeEmail_(actorEmail);
  clearMeetingReleaseAcks_(meeting);
  return { meeting: meeting, created: true };
}

function hasMeetingReleaseAckForRole_(meeting, role) {
  const requestId = String(
    (meeting && meeting.releaseRequestId) || ''
  );
  if (!requestId) return false;
  if (role === PR.ROLE.MANAGER) {
    return (
      String(meeting.managerReleaseAckRequestId || '') ===
        requestId && !!meeting.managerReleaseAckAt
    );
  }
  if (role === PR.ROLE.EMPLOYEE) {
    return (
      String(meeting.employeeReleaseAckRequestId || '') ===
        requestId && !!meeting.employeeReleaseAckAt
    );
  }
  return false;
}

function areMeetingReleaseAcksComplete_(meeting) {
  return (
    hasMeetingReleaseAckForRole_(meeting, PR.ROLE.MANAGER) &&
    hasMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE)
  );
}

function missingMeetingReleaseAckRoles_(meeting) {
  const missing = [];
  if (!hasMeetingReleaseAckForRole_(meeting, PR.ROLE.MANAGER)) {
    missing.push(PR.ROLE.MANAGER);
  }
  if (!hasMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE)) {
    missing.push(PR.ROLE.EMPLOYEE);
  }
  return missing;
}

function recordMeetingReleaseAck_(meeting, role, revision, now) {
  const when = now instanceof Date ? now : new Date();
  const requestId = String(meeting.releaseRequestId || '');
  const rev = Number(revision);
  if (role === PR.ROLE.MANAGER) {
    meeting.managerReleaseAckRequestId = requestId;
    meeting.managerReleaseAckRevision = Number.isFinite(rev)
      ? rev
      : Number(meeting.contentRevision || 0);
    meeting.managerReleaseAckAt = when.toISOString();
  } else if (role === PR.ROLE.EMPLOYEE) {
    meeting.employeeReleaseAckRequestId = requestId;
    meeting.employeeReleaseAckRevision = Number.isFinite(rev)
      ? rev
      : Number(meeting.contentRevision || 0);
    meeting.employeeReleaseAckAt = when.toISOString();
  }
  return meeting;
}

function sealMeetingJsonOnRelease_(cycle, actorEmail, sealedAt) {
  const meeting = parseMeetingJson_(cycle);
  if (!meeting.sealedAt) {
    const when =
      sealedAt instanceof Date
        ? sealedAt
        : new Date(sealedAt || Date.now());
    meeting.sealedAt = isNaN(when.getTime())
      ? new Date().toISOString()
      : when.toISOString();
    meeting.sealedBy = normalizeEmail_(actorEmail);
  }
  cycle['Meeting JSON'] = JSON.stringify(meeting);
  return meeting;
}

function meetingNotesAlreadySealedResponse_(cycle) {
  const meeting = parseMeetingJson_(cycle);
  const savedAtIso = String(
    meeting.lastSavedAt || meeting.sealedAt || ''
  );
  return {
    ok: true,
    alreadySealed: true,
    sealed: true,
    savedAt: savedAtIso ? formatDateTime_(new Date(savedAtIso)) : '',
    savedAtIso: savedAtIso,
    message:
      'Meeting notes are sealed because signatures were released. Keep any unsaved device text until you copy it — it was not applied to the sealed packet.',
    preserveLocalDraft: true,
  };
}

function saveMeetingOutcomes_(cycleId, payload, isAutosave) {
  let pendingAuditEvent = null;
  const result = withLock_(function () {
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(cycle['Status'] || '');

    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(cycle['Manager Email']) === email;
    const isEmployee =
      normalizeEmail_(cycle['Employee Email']) === email;

    if (!isHr && !isManager && !isEmployee) {
      throw new Error('You are not authorized to update this cycle.');
    }

    if (status !== PR.CYCLE.MEETING) {
      if (
        status === PR.CYCLE.SIGNATURES ||
        status === PR.CYCLE.FINALIZING ||
        status === PR.CYCLE.COMPLETE
      ) {
        return meetingNotesAlreadySealedResponse_(cycle);
      }
      throw new Error(
        'Meeting outcomes may only be edited while the review meeting is open.'
      );
    }

    const meeting = parseMeetingJson_(cycle);

    if (meeting.sealedAt) {
      return meetingNotesAlreadySealedResponse_(cycle);
    }

    if (isHr || isManager) {
      meeting.managerFinalComments = cleanText_(
        payload.managerFinalComments
      );
      meeting.developmentGoals = cleanText_(
        payload.developmentGoals
      );
      meeting.actionSteps = cleanText_(payload.actionSteps);
      if (
        meeting.releaseRequestId &&
        hasMeetingReleaseAckForRole_(meeting, PR.ROLE.MANAGER)
      ) {
        invalidateMeetingReleaseAckForRole_(
          meeting,
          PR.ROLE.MANAGER
        );
      }
    }

    if (isHr || isEmployee) {
      meeting.employeeComments = cleanText_(
        payload.employeeComments
      );
      if (
        meeting.releaseRequestId &&
        hasMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE)
      ) {
        invalidateMeetingReleaseAckForRole_(
          meeting,
          PR.ROLE.EMPLOYEE
        );
      }
    }

    const now = new Date();
    meeting.lastSavedAt = now.toISOString();
    meeting.contentRevision =
      Number(meeting.contentRevision || 0) + 1;
    cycle['Meeting JSON'] = JSON.stringify(meeting);
    cycle['Updated At'] = now;

    writeCycle_(location.rowNumber, cycle);

    if (!isAutosave) {
      pendingAuditEvent = buildPendingAuditEvent_(
        cycleId,
        'Meeting outcomes updated',
        email,
        PR.CYCLE.MEETING,
        PR.CYCLE.MEETING,
        JSON.stringify({
          contentRevision: meeting.contentRevision,
          releaseRequestId: meeting.releaseRequestId || '',
        }),
        'MEETING_SAVE:' +
          String(cycleId) +
          ':' +
          String(meeting.contentRevision)
      );
    }

    return {
      ok: true,
      alreadySealed: false,
      preserveLocalDraft: false,
      savedAt: formatDateTime_(now),
      savedAtIso: now.toISOString(),
      contentRevision: meeting.contentRevision,
      meetingReleasePending: !!meeting.releaseRequestId,
      releaseRequestId: meeting.releaseRequestId || '',
      message: isAutosave
        ? 'Meeting notes autosaved.'
        : 'Meeting outcomes saved.',
      auditWarning: '',
    };
  });

  if (pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(pendingAuditEvent);
    if (!auditResult.ok) {
      result.auditWarning = auditResult.warning;
    }
  }

  return result;
}

/**
 * Pure planner for releaseReviewSignatures — testable without Sheets I/O.
 * Returns action: release | alreadyReleased | returnCurrent | reject.
 */
function planReleaseReviewSignatures_(cycle) {
  const status = String((cycle && cycle['Status']) || '');
  const releasedAt = cycle && cycle['Signatures Released At'];
  const hasReleasedMarker =
    releasedAt !== '' &&
    releasedAt !== null &&
    typeof releasedAt !== 'undefined';

  if (status === PR.CYCLE.SIGNATURES) {
    return {
      action: 'alreadyReleased',
      message:
        'Signatures were already released. The manager and employee may each sign once, in either order. HR will sign last.',
      hasReleasedMarker: hasReleasedMarker,
    };
  }

  if (
    status === PR.CYCLE.FINALIZING ||
    status === PR.CYCLE.COMPLETE
  ) {
    return {
      action: 'returnCurrent',
      message:
        'This review has already progressed past signature release.',
    };
  }

  if (status !== PR.CYCLE.MEETING) {
    return {
      action: 'reject',
      message:
        'The review meeting must be open before signatures are released.',
    };
  }

  return { action: 'release' };
}

/**
 * In-memory first-release mutation. Tests assert this is only applied once.
 * releaseActorEmail must be the release initiator (releaseRequestedBy), never
 * the participant who happened to supply the second ACK.
 */
function applyFirstReleaseReviewSignaturesMutation_(
  stored,
  releaseActorEmail,
  now
) {
  const when = now instanceof Date ? now : new Date();
  const meeting = parseMeetingJson_(stored);
  const actor =
    normalizeEmail_(meeting.releaseRequestedBy) ||
    normalizeEmail_(releaseActorEmail);
  clearCombinedSignatureFields_(stored);
  sealMeetingJsonOnRelease_(stored, actor, when);
  stored['Status'] = PR.CYCLE.SIGNATURES;
  stored['Manager Review Status'] = PR.DOC.PENDING_PARTICIPANTS;
  stored['Self Evaluation Status'] = PR.DOC.PENDING_PARTICIPANTS;
  stored['Signatures Released At'] = when;
  stored['Signatures Released By'] = actor;
  stored['Updated At'] = when;
  return stored;
}

function resolveReleaseAuthorityEmail_(meeting, fallbackEmail) {
  return (
    normalizeEmail_(meeting && meeting.releaseRequestedBy) ||
    normalizeEmail_(fallbackEmail)
  );
}

/**
 * Invalidate a role ACK when that role mutates meeting content after ACK.
 */
function invalidateMeetingReleaseAckForRole_(meeting, role) {
  if (role === PR.ROLE.MANAGER) {
    meeting.managerReleaseAckRequestId = '';
    meeting.managerReleaseAckRevision = null;
    meeting.managerReleaseAckAt = '';
  } else if (role === PR.ROLE.EMPLOYEE) {
    meeting.employeeReleaseAckRequestId = '';
    meeting.employeeReleaseAckRevision = null;
    meeting.employeeReleaseAckAt = '';
  }
  return meeting;
}

function buildReleaseWaitingMessage_(missingRoles) {
  const missing = missingRoles || [];
  if (!missing.length) {
    return 'Participant acknowledgements are complete. Releasing…';
  }
  if (missing.length === 2) {
    return 'Waiting for Manager and Employee pages to synchronize meeting notes…';
  }
  return (
    'Waiting for ' +
    missing[0] +
    ' page to synchronize meeting notes…'
  );
}

/**
 * Create immutable releaseRequestId and clear prior ACKs.
 * Status stays Meeting Open until both ACKs exist.
 */
function prepareReleaseReviewSignatures(cycleId) {
  const email = getCurrentUserEmail_();
  let pendingAuditEvent = null;
  let alreadyReleased = false;
  let createdRequest = false;
  const cycle = withLock_(function () {
    const location = findCycle_(cycleId);
    const stored = location.object;
    const authorized =
      isHrUser_(email) ||
      normalizeEmail_(stored['Manager Email']) === email;
    if (!authorized) {
      throw new Error(
        'Only the assigned manager or HR may release signatures.'
      );
    }

    const plan = planReleaseReviewSignatures_(stored);
    if (
      plan.action === 'alreadyReleased' ||
      plan.action === 'returnCurrent'
    ) {
      alreadyReleased = true;
      return stored;
    }
    if (plan.action === 'reject') {
      throw new Error(plan.message);
    }
    if (!isV31CompensationComplete_(stored)) {
      throw new Error(
        'Resolve the compensation decision before releasing the review packet for signature.'
      );
    }

    const meeting = parseMeetingJson_(stored);
    const requested = requestMeetingReleaseOnMeetingJson_(
      meeting,
      email,
      new Date(),
      cycleId
    );
    createdRequest = requested.created;
    stored['Meeting JSON'] = JSON.stringify(requested.meeting);
    stored['Updated At'] = new Date();
    writeCycle_(location.rowNumber, stored);

    if (createdRequest) {
      pendingAuditEvent = buildPendingAuditEvent_(
        cycleId,
        'Meeting release sync requested',
        email,
        PR.CYCLE.MEETING,
        PR.CYCLE.MEETING,
        JSON.stringify({
          releaseRequestId: requested.meeting.releaseRequestId,
          contentRevision: requested.meeting.contentRevision,
        }),
        'MEETING_RELEASE_REQUESTED:' +
          String(cycleId) +
          ':' +
          String(requested.meeting.releaseRequestId)
      );
    }
    return stored;
  });

  let auditWarning = '';
  if (pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(pendingAuditEvent);
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }

  const live = buildLiveReviewStatePayload_(
    cycle,
    email,
    assertLiveReviewAccess_(cycle, email)
  );
  live.alreadyReleased = alreadyReleased;
  live.releasePending = !alreadyReleased;
  live.auditWarning = auditWarning || '';
  live.message = alreadyReleased
    ? 'Signatures were already released.'
    : 'Meeting release sync started. Both Manager and Employee must acknowledge after saving notes.';
  return live;
}

/**
 * Participant acknowledges the current releaseRequestId after saving
 * (or confirming clean). When both ACKs exist, seals immediately.
 */
function acknowledgeMeetingRelease(cycleId, payload) {
  const email = getCurrentUserEmail_();
  const input = payload || {};
  let pendingAuditEvent = null;
  let alreadyReleased = false;
  let sealedNow = false;
  const cycle = withLock_(function () {
    const location = findCycle_(cycleId);
    const stored = location.object;
    const plan = planReleaseReviewSignatures_(stored);
    if (
      plan.action === 'alreadyReleased' ||
      plan.action === 'returnCurrent'
    ) {
      alreadyReleased = true;
      return stored;
    }
    if (plan.action === 'reject') {
      throw new Error(plan.message);
    }

    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(stored['Manager Email']) === email;
    const isEmployee =
      normalizeEmail_(stored['Employee Email']) === email;
    if (!isHr && !isManager && !isEmployee) {
      throw new Error(
        'You are not authorized to acknowledge meeting release.'
      );
    }

    const meeting = parseMeetingJson_(stored);
    if (!meeting.releaseRequestId) {
      throw new Error(
        'No meeting release request is pending. Prepare release first.'
      );
    }
    const claimedId = String(input.releaseRequestId || '').trim();
    if (!claimedId) {
      throw new Error(
        'releaseRequestId is required to acknowledge meeting release.'
      );
    }
    if (claimedId !== meeting.releaseRequestId) {
      throw new Error(
        'This acknowledgement does not match the current release request.'
      );
    }

    const authoritativeRevision = Number(meeting.contentRevision || 0);
    if (
      input.contentRevision === '' ||
      input.contentRevision == null
    ) {
      throw new Error(
        'contentRevision is required to acknowledge meeting release.'
      );
    }
    const claimedRevision = Number(input.contentRevision);
    if (
      !Number.isFinite(claimedRevision) ||
      claimedRevision !== authoritativeRevision
    ) {
      throw new Error(
        'Stale meeting acknowledgement. Save the latest meeting notes and try again.'
      );
    }

    // HR may acknowledge on behalf of neither required role for seal —
    // only Manager and Employee ACKs count. If HR is also manager/employee
    // via assignment, the assignment role wins.
    let ackRole = '';
    if (isManager) ackRole = PR.ROLE.MANAGER;
    else if (isEmployee) ackRole = PR.ROLE.EMPLOYEE;
    else {
      // Pure HR: record no participant ACK; return waiting state.
      return stored;
    }

    recordMeetingReleaseAck_(
      meeting,
      ackRole,
      authoritativeRevision,
      new Date()
    );
    stored['Meeting JSON'] = JSON.stringify(meeting);
    stored['Updated At'] = new Date();

    if (areMeetingReleaseAcksComplete_(meeting)) {
      const releaseActor = resolveReleaseAuthorityEmail_(
        meeting,
        email
      );
      applyFirstReleaseReviewSignaturesMutation_(
        stored,
        releaseActor,
        new Date()
      );
      sealedNow = true;
      pendingAuditEvent = buildPendingAuditEvent_(
        cycleId,
        'Review packet released for combined signatures',
        releaseActor,
        PR.CYCLE.MEETING,
        PR.CYCLE.SIGNATURES,
        JSON.stringify({
          releaseRequestId: meeting.releaseRequestId,
          via: 'acknowledgeMeetingRelease',
          releaseRequestedBy: meeting.releaseRequestedBy,
          secondAckBy: normalizeEmail_(email),
        }),
        'SIGNATURES_RELEASED:' +
          String(cycleId) +
          ':' +
          toIsoString_(stored['Signatures Released At'])
      );
    }

    writeCycle_(location.rowNumber, stored);
    return stored;
  });

  let auditWarning = '';
  if (pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(pendingAuditEvent);
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }

  const live = buildLiveReviewStatePayload_(
    cycle,
    email,
    assertLiveReviewAccess_(cycle, email)
  );
  live.alreadyReleased =
    alreadyReleased ||
    String(cycle['Status']) === PR.CYCLE.SIGNATURES;
  live.sealedNow = sealedNow;
  live.releasePending =
    String(cycle['Status']) === PR.CYCLE.MEETING &&
    !!parseMeetingJson_(cycle).releaseRequestId;
  live.auditWarning = auditWarning || '';
  live.message = live.alreadyReleased
    ? 'Signatures were already released. The manager and employee may each sign once, in either order. HR will sign last.'
    : buildReleaseWaitingMessage_(live.missingReleaseAcks || []);
  return live;
}

function releaseReviewSignatures(cycleId, options) {
  const opts = options || {};
  const email = getCurrentUserEmail_();
  const forceOverride =
    opts.forceCommit === true &&
    String(opts.forceReleaseConfirmation || '') ===
      'FORCE_RELEASE_WITHOUT_PARTICIPANT_ACK';
  let pendingAuditEvent = null;
  let alreadyReleased = false;
  let releasePending = false;
  const cycle = withLock_(function () {
    const location = findCycle_(cycleId);
    const stored = location.object;

    const authorized =
      isHrUser_(email) ||
      normalizeEmail_(stored['Manager Email']) === email;

    if (!authorized) {
      throw new Error(
        'Only the assigned manager or HR may release signatures.'
      );
    }

    const plan = planReleaseReviewSignatures_(stored);
    if (
      plan.action === 'alreadyReleased' ||
      plan.action === 'returnCurrent'
    ) {
      alreadyReleased = true;
      return stored;
    }
    if (plan.action === 'reject') {
      throw new Error(plan.message);
    }

    if (!isV31CompensationComplete_(stored)) {
      throw new Error(
        'Resolve the compensation decision before releasing the review packet for signature.'
      );
    }

    const meeting = parseMeetingJson_(stored);
    const now = new Date();
    if (!meeting.releaseRequestId) {
      const requested = requestMeetingReleaseOnMeetingJson_(
        meeting,
        email,
        now,
        cycleId
      );
      stored['Meeting JSON'] = JSON.stringify(requested.meeting);
      stored['Updated At'] = now;
      writeCycle_(location.rowNumber, stored);
      releasePending = true;
      pendingAuditEvent = buildPendingAuditEvent_(
        cycleId,
        'Meeting release sync requested',
        email,
        PR.CYCLE.MEETING,
        PR.CYCLE.MEETING,
        JSON.stringify({
          releaseRequestId: requested.meeting.releaseRequestId,
          contentRevision: requested.meeting.contentRevision,
        }),
        'MEETING_RELEASE_REQUESTED:' +
          String(cycleId) +
          ':' +
          String(requested.meeting.releaseRequestId)
      );
      return stored;
    }

    const acksComplete = areMeetingReleaseAcksComplete_(meeting);
    if (!acksComplete) {
      if (forceOverride) {
        if (!isHrUser_(email)) {
          throw new Error(
            'Only HR may force release without participant acknowledgements.'
          );
        }
      } else {
        releasePending = true;
        return stored;
      }
    }

    // First successful release only — never re-clear signatures on retry.
    const releaseActor = resolveReleaseAuthorityEmail_(meeting, email);
    applyFirstReleaseReviewSignaturesMutation_(
      stored,
      releaseActor,
      now
    );
    writeCycle_(location.rowNumber, stored);

    pendingAuditEvent = buildPendingAuditEvent_(
      cycleId,
      forceOverride && !acksComplete
        ? 'Review packet force-released without full participant acknowledgements'
        : 'Review packet released for combined signatures',
      releaseActor,
      PR.CYCLE.MEETING,
      PR.CYCLE.SIGNATURES,
      JSON.stringify({
        releaseRequestId: meeting.releaseRequestId,
        forceOverride: !!(forceOverride && !acksComplete),
        missingAcks: missingMeetingReleaseAckRoles_(meeting),
        releaseRequestedBy: meeting.releaseRequestedBy,
      }),
      'SIGNATURES_RELEASED:' +
        String(cycleId) +
        ':' +
        toIsoString_(stored['Signatures Released At'])
    );

    return stored;
  });

  let auditWarning = '';
  if (pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(pendingAuditEvent);
    if (!auditResult.ok) {
      auditWarning = auditResult.warning;
    }
  }

  const live = buildLiveReviewStatePayload_(
    cycle,
    email,
    assertLiveReviewAccess_(cycle, email)
  );
  live.alreadyReleased = alreadyReleased;
  live.releasePending = releasePending;
  live.auditWarning = auditWarning || '';
  if (alreadyReleased) {
    live.message =
      'Signatures were already released. The manager and employee may each sign once, in either order. HR will sign last.';
  } else if (releasePending) {
    live.message = buildReleaseWaitingMessage_(
      live.missingReleaseAcks || []
    );
  } else {
    live.message =
      'The review packet was released. The manager and employee may each sign once, in either order. HR will sign last.';
  }
  return live;
}

/**
 * Run once after installing V2 if a test cycle was already in the signature
 * stage. Existing manager or employee signatures are copied to both documents.
 */
function upgradeToSingleReviewSignatureWorkflow_() {
  assertAutomationOwner_(getSettings_());

  const migration = withLock_(function () {
    const cycles = getAllObjects_(PR.SHEETS.CYCLES);
    let updated = 0;
    const notifications = [];

    cycles.forEach(function (record) {
      if (String(record['Status']) !== PR.CYCLE.SIGNATURES) {
        return;
      }

      const location = findCycle_(record['Cycle ID']);
      const cycle = location.object;

      consolidateExistingParticipantSignatures_(cycle);
      updateCombinedSignatureStatuses_(cycle);
      cycle['Updated At'] = new Date();

      writeCycle_(location.rowNumber, cycle);

      const state = getCombinedSignatureState_(cycle);

      if (!state.managerSigned) {
        notifications.push({
          cycleId: cycle['Cycle ID'],
          role: PR.ROLE.MANAGER,
        });
      }

      if (!state.employeeSigned) {
        notifications.push({
          cycleId: cycle['Cycle ID'],
          role: PR.ROLE.EMPLOYEE,
        });
      }

      if (
        state.managerSigned &&
        state.employeeSigned &&
        !state.hrSigned
      ) {
        notifications.push({
          cycleId: cycle['Cycle ID'],
          role: PR.ROLE.HR,
        });
      }

      audit_(
        cycle['Cycle ID'],
        'Cycle upgraded to single-signature workflow',
        Session.getEffectiveUser().getEmail(),
        PR.CYCLE.SIGNATURES,
        PR.CYCLE.SIGNATURES,
        ''
      );

      updated++;
    });

    return {
      updated: updated,
      notifications: notifications,
    };
  });

  migration.notifications.forEach(function (notification) {
    sendCombinedSignatureEmail_(
      notification.cycleId,
      notification.role
    );
  });

  SpreadsheetApp.getUi().alert(
    'Single-signature workflow upgrade complete.\n\n' +
      'Cycles updated: ' +
      migration.updated
  );

  return migration;
}

/* =============================== SIGNING ================================= */

/**
 * One signature is applied to both the Manager Review and Self-Evaluation.
 *
 * Manager and employee may sign in either order.
 * HR may sign only after both participants have signed.
 */
function signReviewCycle(cycleId, signatureDataUrl) {
  const email = getCurrentUserEmail_();
  validateSignatureDataUrl_(signatureDataUrl);

  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );

    if (String(cycle['Status']) !== PR.CYCLE.SIGNATURES) {
      throw new Error(
        'This review cycle is not currently awaiting signatures.'
      );
    }

    const state = getCombinedSignatureState_(cycle);
    let role = '';

    if (
      normalizeEmail_(cycle['Manager Email']) === email &&
      !state.managerSigned
    ) {
      role = PR.ROLE.MANAGER;
    } else if (
      normalizeEmail_(cycle['Employee Email']) === email &&
      !state.employeeSigned
    ) {
      role = PR.ROLE.EMPLOYEE;
    } else if (
      normalizeEmail_(cycle['HR Email']) === email &&
      !state.hrSigned
    ) {
      if (!state.managerSigned || !state.employeeSigned) {
        throw new Error(
          'HR may sign only after both the manager and employee have signed.'
        );
      }

      role = PR.ROLE.HR;
    }

    if (!role) {
      throw new Error(
        'You do not currently have an outstanding signature for this review packet.'
      );
    }

    const fields = getSignatureClaimFields_(role);
    const currentStatus = String(
      cycle[fields.statusField] || V31.SIGNATURE.PENDING
    );

    if (
      currentStatus === V31.SIGNATURE.SIGNED ||
      currentStatus === V31.DELIVERY.SENT
    ) {
      throw new Error(role + ' signature is already recorded.');
    }

    if (
      currentStatus === V31.SIGNATURE.SIGNING ||
      currentStatus === V31.DELIVERY.SENDING
    ) {
      if (isDeliveryClaimStale_(cycle[fields.startedField])) {
        cycle[fields.statusField] = V31.SIGNATURE.UNKNOWN;
        cycle[fields.attemptField] = '';
        cycle[fields.startedField] = '';
        cycle[fields.errorField] =
          'Signature claim went stale. HR reconciliation is required.';
        cycle['Updated At'] = new Date();
        writeCycle_(location.rowNumber, cycle);
        SpreadsheetApp.flush();
        throw new Error(
          role +
            ' signature claim went stale. HR must reconcile before another attempt.'
        );
      }
      throw new Error(
        role + ' signature capture is already in progress.'
      );
    }

    if (currentStatus === V31.SIGNATURE.UNKNOWN) {
      throw new Error(
        role +
          ' signature is Delivery Unknown because multiple signature images may exist. HR must reconcile before retrying.'
      );
    }

    // Pending and Failed may claim. Failed is a clean no-artifact outcome.
    const attemptId = Utilities.getUuid();

    cycle[fields.statusField] = V31.SIGNATURE.SIGNING;
    cycle[fields.attemptField] = attemptId;
    cycle[fields.startedField] = new Date();
    cycle[fields.errorField] = '';
    if (currentStatus === V31.SIGNATURE.FAILED) {
      cycle[fields.recoveryFileField] = '';
      cycle[fields.recoveryAttemptField] = '';
      cycle[fields.recoveryDetailsField] = '';
    }
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return { role: role, attemptId: attemptId, fields: fields };
  });

  let artifact = null;

  try {
    artifact = saveSignature_(
      cycleId,
      claim.role,
      signatureDataUrl,
      claim.attemptId
    );
    maybeInjectSignatureFault_(
      'AFTER_SIGNATURE_ARTIFACT_CREATED',
      cycleId
    );
  } catch (error) {
    if (!(artifact && artifact.fileId)) {
      const classification = classifySignatureArtifactCreationFailure_(
        cycleId,
        claim,
        error
      );
      if (classification.artifact && classification.artifact.fileId) {
        artifact = classification.artifact;
      } else if (classification.status === V31.SIGNATURE.FAILED) {
        persistSignatureCommitFailed_(
          cycleId,
          claim,
          error,
          classification
        );
        throw new Error(
          claim.role +
            ' signature Failed with no Drive artifact. Ordinary retry is allowed.'
        );
      } else {
        const recovery = persistSignatureCommitUnknown_(
          cycleId,
          claim,
          null,
          error,
          {
            writeReturned: false,
            flushSucceeded: false,
            rereadClassification:
              classification.resolution ||
              'artifact-creation-unconfirmed',
          }
        );
        if (
          recovery.observedOutcome ===
            V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED ||
          recovery.observedOutcome ===
            V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED
        ) {
          const observedCycle =
            recovery.observedCycle || findCycle_(cycleId).object;
          return buildParticipantSignatureLiveResult_(
            cycleId,
            email,
            claim.role,
            {
              outcome: recovery.observedOutcome,
              cycle: observedCycle,
              updatedState: getCombinedSignatureState_(observedCycle),
            },
            {
              auditWarning: '',
              canonicalWarning: '',
              notificationWarning: '',
            }
          );
        }
        // Delivery Unknown must not throw into the generic Try Again UI.
        return {
          ok: false,
          signatureRecorded: false,
          recoveryRequired: true,
          status: V31.SIGNATURE.UNKNOWN,
          outcome: V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
          role: claim.role,
          cycleId: String(cycleId),
          recovery: recovery,
          message:
            'Your signature could not be safely confirmed. HR must reconcile this attempt before another signature can be submitted.',
        };
      }
    }
    // Artifact was created before the throw — continue to winner commit.
  }

  let commitResult;
  try {
    commitResult = commitSignatureWinner_(
      cycleId,
      claim,
      artifact
    );
  } catch (error) {
    commitResult = classifySignatureCommitAfterFailure_(
      cycleId,
      claim,
      artifact,
      error
    );
  }

  if (
    commitResult.outcome ===
    V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED
  ) {
    const recovery = handleSupersededSignatureArtifact_(
      cycleId,
      claim.role,
      claim.attemptId,
      artifact
    );
    return buildSupersededSignatureResult_(recovery);
  }

  if (
    commitResult.outcome ===
    V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN
  ) {
    if (!commitResult.recovery) {
      commitResult.recovery = persistSignatureCommitUnknown_(
        cycleId,
        claim,
        artifact,
        new Error('Signature claim changed before commitment.'),
        {
          writeReturned: false,
          flushSucceeded: false,
          rereadClassification:
            'claim-changed-without-authoritative-winner',
        }
      );
    }
    if (commitResult.recovery.observedOutcome) {
      commitResult.outcome =
        commitResult.recovery.observedOutcome;
      commitResult.cycle =
        commitResult.recovery.observedCycle || {};
      commitResult.updatedState = getCombinedSignatureState_(
        commitResult.cycle
      );
      if (
        commitResult.outcome ===
        V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED
      ) {
        const recovery = handleSupersededSignatureArtifact_(
          cycleId,
          claim.role,
          claim.attemptId,
          artifact
        );
        return buildSupersededSignatureResult_(recovery);
      }
    } else {
    return {
      ok: false,
      recoveryRequired: true,
      signatureRecorded: false,
      outcome: commitResult.outcome,
      warning:
        'Signature commit could not be confirmed. The artifact was preserved for HR reconciliation.',
      recovery: commitResult.recovery,
      message:
        'Your signature could not be confirmed. HR must reconcile the preserved signature artifact.',
    };
    }
  }

  let auditWarning = '';
  try {
    maybeInjectSignatureFault_(
      'SIGNATURE_AUDIT_APPEND',
      cycleId
    );
    audit_(
      cycleId,
      'Both review documents signed by ' + claim.role,
      email,
      PR.CYCLE.SIGNATURES,
      String(commitResult.cycle['Status']),
      JSON.stringify({
        schemaVersion: 1,
        outcome: commitResult.outcome,
        fileId: artifact.fileId,
        winningAttemptId: claim.attemptId,
      })
    );
  } catch (error) {
    auditWarning =
      'Signature committed, but its audit record could not be written: ' +
      String(error.message || error);
    try {
      persistSignatureWarning_(
        cycleId,
        claim.role,
        'audit',
        auditWarning
      );
    } catch (persistAuditWarningError) {}
  }

  const canonicalWarning = finalizeSignatureArtifactName_(
    cycleId,
    claim.role,
    artifact
  );

  let notificationWarning = '';
  // HR signature-request email is accelerated off this critical path via
  // accelerateHrSignatureNotification (durable outbox). Participant success
  // returns as soon as the authoritative signature is committed.
  const bothParticipantsSigned =
    commitResult.role !== PR.ROLE.HR &&
    commitResult.updatedState.managerSigned &&
    commitResult.updatedState.employeeSigned;

  if (commitResult.role === PR.ROLE.HR) {
    let compensationPdfResult = null;
    try {
      compensationPdfResult =
        maybeGenerateCompensationPdfAfterSignatures_(cycleId);
    } catch (compensationPdfError) {
      compensationPdfResult = {
        ok: false,
        error: String(
          compensationPdfError.message || compensationPdfError
        ),
      };
    }

    const finalizeResult =
      attemptFinalizationAfterSignature_(cycleId);

    const hrLive = buildParticipantSignatureLiveResult_(
      cycleId,
      email,
      claim.role,
      commitResult,
      {
        auditWarning: auditWarning,
        canonicalWarning: canonicalWarning,
        notificationWarning: notificationWarning,
      }
    );
    hrLive.finalization = finalizeResult;
    hrLive.compensationPdf = compensationPdfResult;
    hrLive.partial =
      hrLive.partial ||
      !!(compensationPdfResult && compensationPdfResult.error) ||
      !!(finalizeResult && finalizeResult.ok === false);
    hrLive.message =
      finalizeResult.message +
      ([
        auditWarning,
        canonicalWarning,
        notificationWarning,
        compensationPdfResult && compensationPdfResult.error
          ? 'Compensation CAF PDF needs recovery.'
          : '',
      ].filter(Boolean).length
        ? ' ' +
          [
            auditWarning,
            canonicalWarning,
            notificationWarning,
            compensationPdfResult && compensationPdfResult.error
              ? 'Compensation CAF PDF needs recovery.'
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        : '');
    return hrLive;
  }

  const live = buildParticipantSignatureLiveResult_(
    cycleId,
    email,
    claim.role,
    commitResult,
    {
      auditWarning: auditWarning,
      canonicalWarning: canonicalWarning,
      notificationWarning: notificationWarning,
    }
  );
  live.accelerateHrNotification = bothParticipantsSigned;
  live.message =
    commitResult.role +
    ' signature recorded for both review documents.' +
    (bothParticipantsSigned
      ? ' HR can now sign last.'
      : ' The other participant may now sign from the same review cycle.') +
    ([auditWarning, canonicalWarning, notificationWarning].filter(
      Boolean
    ).length
      ? ' ' +
        [auditWarning, canonicalWarning, notificationWarning]
          .filter(Boolean)
          .join(' ')
      : '');
  return live;
}

function commitSignatureWinner_(cycleId, claim, artifact) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const now = new Date();
    const state = getCombinedSignatureState_(cycle);
    const existingWinner = String(
      cycle[claim.fields.fileField] || ''
    );

    if (
      String(cycle[claim.fields.attemptField] || '') !==
      String(claim.attemptId)
    ) {
      return {
        outcome:
          existingWinner && existingWinner !== artifact.fileId
            ? V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED
            : V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
        role: claim.role,
        cycle: cycle,
        updatedState: state,
      };
    }

    if (String(cycle['Status']) !== PR.CYCLE.SIGNATURES) {
      throw new Error(
        'This review cycle is not currently awaiting signatures.'
      );
    }

    if (
      (claim.role === PR.ROLE.MANAGER && state.managerSigned) ||
      (claim.role === PR.ROLE.EMPLOYEE && state.employeeSigned) ||
      (claim.role === PR.ROLE.HR && state.hrSigned)
    ) {
      return {
        outcome:
          existingWinner === artifact.fileId
            ? V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED
            : V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED,
        role: claim.role,
        cycle: cycle,
        updatedState: state,
      };
    }

    if (
      claim.role === PR.ROLE.HR &&
      (!state.managerSigned || !state.employeeSigned)
    ) {
      throw new Error(
        'HR may sign only after both the manager and employee have signed.'
      );
    }

    applySignatureWinnerToCycle_(
      cycle,
      claim.role,
      artifact.fileId,
      claim.attemptId,
      now
    );
    updateCombinedSignatureStatuses_(cycle);
    cycle['Updated At'] = now;
    maybeInjectSignatureFault_(
      'BEFORE_SIGNATURE_WINNER_WRITE',
      cycleId
    );
    writeCycle_(location.rowNumber, cycle);
    maybeInjectSignatureFault_(
      'AFTER_SIGNATURE_WINNER_WRITE_BEFORE_FLUSH',
      cycleId
    );
    SpreadsheetApp.flush();

    return {
      outcome: V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
      role: claim.role,
      cycle: cycle,
      updatedState: getCombinedSignatureState_(cycle),
    };
  });
}

function applySignatureWinnerToCycle_(
  cycle,
  role,
  fileId,
  attemptId,
  signedAt
) {
  const fields = getSignatureClaimFields_(role);
  const mirrors = getLegacySignatureMirrorFields_(role);
  cycle[mirrors.managerId] = fileId;
  cycle[mirrors.selfId] = fileId;
  cycle[mirrors.managerAt] = signedAt;
  cycle[mirrors.selfAt] = signedAt;
  cycle[fields.fileField] = fileId;
  cycle[fields.signedAtField] = signedAt;
  cycle[fields.winningAttemptField] = attemptId;
  cycle[fields.statusField] = V31.SIGNATURE.SIGNED;
  cycle[fields.attemptField] = '';
  cycle[fields.startedField] = '';
  cycle[fields.errorField] = '';
  cycle[fields.artifactWarningField] = '';
  cycle[fields.auditWarningField] = '';
  cycle[fields.recoveryFileField] = '';
  cycle[fields.recoveryAttemptField] = '';
  cycle[fields.recoveryDetailsField] = '';
  cycle[fields.recoveryRecordedAtField] = '';
}

function decideSignatureCommitOutcome_(
  authoritativeFileId,
  status,
  artifactFileId
) {
  const winner = String(authoritativeFileId || '');
  if (
    winner === String(artifactFileId || '') &&
    String(status || '') === V31.SIGNATURE.SIGNED
  ) {
    return V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED;
  }
  if (
    winner &&
    winner !== String(artifactFileId || '') &&
    String(status || '') === V31.SIGNATURE.SIGNED
  ) {
    return V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED;
  }
  return V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN;
}

function classifySignatureCommitAfterFailure_(
  cycleId,
  claim,
  artifact,
  error
) {
  let reread;
  try {
    reread = withLock_(function () {
      return findCycle_(cycleId).object;
    });
  } catch (rereadError) {
    try {
      const retry = withLock_(function () {
        return findCycle_(cycleId).object;
      });
      const retryOutcome = decideSignatureCommitOutcome_(
        retry[claim.fields.fileField],
        retry[claim.fields.statusField],
        artifact.fileId
      );
      if (
        retryOutcome !==
        V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN
      ) {
        return {
          outcome: retryOutcome,
          role: claim.role,
          cycle: retry,
          updatedState: getCombinedSignatureState_(retry),
          auditPending:
            retryOutcome ===
            V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
          commitError: String(error.message || error),
          rereadWarning: String(
            rereadError.message || rereadError
          ),
        };
      }
    } catch (retryRereadError) {}
    const recovery = persistSignatureCommitUnknown_(
      cycleId,
      claim,
      artifact,
      error,
      {
        writeReturned: true,
        flushSucceeded: false,
        rereadClassification:
          'authoritative-reread-failed: ' +
          String(rereadError.message || rereadError),
      }
    );
    if (recovery.observedOutcome) {
      return {
        outcome: recovery.observedOutcome,
        role: claim.role,
        cycle: recovery.observedCycle || {},
        updatedState: getCombinedSignatureState_(
          recovery.observedCycle || {}
        ),
        auditPending:
          recovery.observedOutcome ===
          V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
        commitError: String(error.message || error),
      };
    }
    return {
      outcome: V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
      role: claim.role,
      cycle: {},
      updatedState: {
        managerSigned: false,
        employeeSigned: false,
        hrSigned: false,
      },
      recovery: recovery,
      commitError: String(error.message || error),
    };
  }
  const fileId = String(
    reread[claim.fields.fileField] || ''
  );
  const status = String(
    reread[claim.fields.statusField] || ''
  );

  const outcome = decideSignatureCommitOutcome_(
    fileId,
    status,
    artifact.fileId
  );

  if (outcome === V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED) {
    return {
      outcome: V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
      role: claim.role,
      cycle: reread,
      updatedState: getCombinedSignatureState_(reread),
      auditPending: true,
      commitError: String(error.message || error),
    };
  }

  if (outcome === V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED) {
    return {
      outcome: V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED,
      role: claim.role,
      cycle: reread,
      updatedState: getCombinedSignatureState_(reread),
      commitError: String(error.message || error),
    };
  }

  const recovery = persistSignatureCommitUnknown_(
    cycleId,
    claim,
    artifact,
    error,
    {
      writeReturned: true,
      flushSucceeded: false,
      rereadClassification: 'no-authoritative-winner',
    }
  );
  if (recovery.observedOutcome) {
    return {
      outcome: recovery.observedOutcome,
      role: claim.role,
      cycle: recovery.observedCycle || {},
      updatedState: getCombinedSignatureState_(
        recovery.observedCycle || {}
      ),
      auditPending:
        recovery.observedOutcome ===
        V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
      commitError: String(error.message || error),
    };
  }
  return {
    outcome: V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
    role: claim.role,
    cycle: reread,
    updatedState: getCombinedSignatureState_(reread),
    recovery: recovery,
    commitError: String(error.message || error),
  };
}

/**
 * Compact post-sign live state for Manager/Employee/HR clients.
 * Reuses live-review DTO shape so polling can reconcile the other browser.
 */
function buildParticipantSignatureLiveResult_(
  cycleId,
  email,
  role,
  commitResult,
  warnings
) {
  const warn = warnings || {};
  const cycle =
    commitResult.cycle || findCycle_(cycleId).object;
  let viewerRole = '';
  try {
    viewerRole = assertLiveReviewAccess_(cycle, email);
  } catch (accessError) {
    viewerRole = String(role || '');
  }
  const live = buildLiveReviewStatePayload_(
    cycle,
    email,
    viewerRole
  );
  return {
    ok: true,
    signatureRecorded: true,
    role: String(role || ''),
    outcome: commitResult.outcome,
    cycleId: live.cycleId,
    status: live.status,
    signaturesReleasedAt: live.signaturesReleasedAt,
    updatedAtIso: live.updatedAtIso,
    signatureState: live.signatureState,
    signatureTaskReady: live.signatureTaskReady,
    signatureTasks: live.signatureTasks,
    viewerRole: live.viewerRole,
    partial: !!(
      warn.auditWarning ||
      warn.canonicalWarning ||
      warn.notificationWarning
    ),
    warning: [
      warn.auditWarning,
      warn.canonicalWarning,
      warn.notificationWarning,
    ]
      .filter(Boolean)
      .join(' '),
    message: '',
  };
}

/**
 * Exact attempt-scoped signature artifact search (no silent truncation).
 */
function collectSignatureAttemptArtifactsDetailed_(
  cycleId,
  role,
  attemptId
) {
  const settings = getSettings_();
  const fileName = buildSignatureAttemptFileName_(
    cycleId,
    role,
    attemptId
  );
  const folderIds = [
    String(settings.REVIEW_FOLDER_ID || ''),
    String(settings.SIGNATURE_RECOVERY_FOLDER_ID || ''),
  ].filter(Boolean);
  const matches = [];
  const seen = {};
  let complete = true;
  let error = null;

  folderIds.forEach(function (folderId) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      const files = folder.getFilesByName(fileName);
      while (files.hasNext()) {
        const file = files.next();
        try {
          assertValidSignatureAttemptFile_(
            file,
            cycleId,
            role,
            attemptId,
            folderId
          );
          const id = String(file.getId());
          if (!seen[id]) {
            seen[id] = true;
            matches.push({
              fileId: id,
              fileName: fileName,
              role: role,
              attemptId: attemptId,
              origin: 'recovered',
              createdByCurrentAttempt: false,
              recoveredCandidate: true,
              folderId: folderId,
            });
          }
        } catch (rejectError) {
          // Soft reject invalid peers.
        }
      }
    } catch (folderError) {
      complete = false;
      error = String(folderError.message || folderError);
    }
  });

  return {
    matches: matches,
    complete: complete,
    error: error,
  };
}

/**
 * Classify saveSignature_ failures: Failed (retryable) vs Unknown vs recover.
 */
function classifySignatureArtifactCreationFailure_(
  cycleId,
  claim,
  generationError
) {
  let scan;
  try {
    scan = collectSignatureAttemptArtifactsDetailed_(
      cycleId,
      claim.role,
      claim.attemptId
    );
  } catch (scanError) {
    return classifySignatureAttemptScanResult_(
      {
        matches: [],
        complete: false,
        error: String(scanError.message || scanError),
      },
      generationError
    );
  }
  return classifySignatureAttemptScanResult_(scan, generationError);
}

/**
 * Pure helper: classify an exact-attempt artifact scan after creation error.
 */
function classifySignatureAttemptScanResult_(scan, generationError) {
  const result = scan || {};
  if (!result.complete || result.error) {
    return {
      status: V31.SIGNATURE.UNKNOWN,
      resolution: result.error
        ? 'recovery-search-failed'
        : 'incomplete-search',
      artifact: null,
      clearClaim: false,
      error:
        result.error ||
        'Signature artifact search incomplete.',
    };
  }

  const matches = result.matches || [];
  if (matches.length === 1) {
    return {
      status: V31.SIGNATURE.SIGNED,
      resolution: 'post-creation-self-heal',
      artifact: matches[0],
      clearClaim: false,
      error: '',
    };
  }

  if (matches.length > 1) {
    return {
      status: V31.SIGNATURE.UNKNOWN,
      resolution: 'ambiguous',
      artifact: null,
      clearClaim: false,
      error: String(
        (generationError &&
          (generationError.message || generationError)) ||
          'Multiple signature attempt artifacts exist.'
      ),
    };
  }

  return {
    status: V31.SIGNATURE.FAILED,
    resolution: 'generation-failed-no-artifact',
    artifact: null,
    clearClaim: true,
    error: String(
      (generationError &&
        (generationError.message || generationError)) ||
        'Signature artifact was not created.'
    ),
  };
}

/**
 * Exact claim ownership required before persisting Failed or Delivery Unknown.
 * Stale/cleared/superseded attempts must not mutate the role row.
 */
function canPersistSignatureClaimOutcome_(
  currentStatus,
  currentAttemptId,
  claimAttemptId
) {
  return (
    String(currentStatus || '') === V31.SIGNATURE.SIGNING &&
    !!String(claimAttemptId || '') &&
    String(currentAttemptId || '') === String(claimAttemptId || '')
  );
}

function persistSignatureCommitFailed_(
  cycleId,
  claim,
  error,
  classification
) {
  const details = {
    schemaVersion: 1,
    outcome: 'Failed',
    resolution:
      (classification && classification.resolution) ||
      'generation-failed-no-artifact',
    attemptId: claim.attemptId,
    error: String(error.message || error),
    recoveryRecommendation:
      'Ordinary retry is allowed. No Drive artifact was found for this attempt.',
  };

  withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const fields = claim.fields;
    const currentAttempt = String(cycle[fields.attemptField] || '');
    const currentStatus = String(cycle[fields.statusField] || '');
    if (
      !canPersistSignatureClaimOutcome_(
        currentStatus,
        currentAttempt,
        claim.attemptId
      )
    ) {
      details.persistenceSkipped =
        'Claim ownership changed; Failed classification skipped.';
      details.observedStatus = currentStatus;
      details.observedAttemptId = currentAttempt;
      details.observedCycle = cycle;
      return;
    }
    if (String(cycle[fields.fileField] || '')) {
      details.persistenceSkipped =
        'Signature file already present; Failed classification skipped.';
      details.observedCycle = cycle;
      return;
    }
    cycle[fields.statusField] = V31.SIGNATURE.FAILED;
    cycle[fields.fileField] = '';
    cycle[fields.signedAtField] = '';
    cycle[fields.winningAttemptField] = '';
    cycle[fields.attemptField] = '';
    cycle[fields.startedField] = '';
    cycle[fields.errorField] = details.error;
    cycle[fields.recoveryFileField] = '';
    cycle[fields.recoveryAttemptField] = '';
    cycle[fields.recoveryDetailsField] = JSON.stringify(details);
    cycle[fields.recoveryRecordedAtField] = new Date();
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
  });

  return details;
}

function persistSignatureCommitUnknown_(
  cycleId,
  claim,
  artifact,
  error,
  evidence
) {
  const details = {
    schemaVersion: 1,
    outcome: V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
    artifactOrigin: artifact ? artifact.origin : 'unconfirmed',
    fileId: artifact ? artifact.fileId : '',
    attemptId: claim.attemptId,
    writeReturned: !!(evidence && evidence.writeReturned),
    flushSucceeded: !!(evidence && evidence.flushSucceeded),
    rereadClassification:
      (evidence && evidence.rereadClassification) || 'unknown',
    error: String(error.message || error),
    recoveryRecommendation:
      'HR must inspect the candidate and either attach it or reset the role.',
  };

  try {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      const fields = claim.fields;
      const currentWinner = String(cycle[fields.fileField] || '');
      const currentAttempt = String(
        cycle[fields.attemptField] || ''
      );
      const currentStatus = String(cycle[fields.statusField] || '');
      const observedOutcome = decideSignatureCommitOutcome_(
        currentWinner,
        cycle[fields.statusField],
        artifact ? artifact.fileId : ''
      );
      if (
        observedOutcome !==
        V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN
      ) {
        details.observedOutcome = observedOutcome;
        details.observedCycle = cycle;
        return;
      }
      if (
        !canPersistSignatureClaimOutcome_(
          currentStatus,
          currentAttempt,
          claim.attemptId
        )
      ) {
        details.persistenceSkipped =
          'Claim ownership changed; Delivery Unknown classification skipped.';
        details.observedStatus = currentStatus;
        details.observedAttemptId = currentAttempt;
        details.observedCycle = cycle;
        return;
      }
      clearSignatureArtifactMirrorsIfMatching_(
        cycle,
        claim.role,
        artifact ? artifact.fileId : ''
      );
      cycle[fields.statusField] = V31.SIGNATURE.UNKNOWN;
      cycle[fields.fileField] = '';
      cycle[fields.signedAtField] = '';
      cycle[fields.winningAttemptField] = '';
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.errorField] =
        'Signature commit could not be confirmed. HR reconciliation is required.';
      cycle[fields.recoveryFileField] = artifact
        ? artifact.fileId
        : '';
      cycle[fields.recoveryAttemptField] = claim.attemptId;
      cycle[fields.recoveryDetailsField] =
        JSON.stringify(details);
      cycle[fields.recoveryRecordedAtField] = new Date();
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
  } catch (persistError) {
    details.persistenceError = String(
      persistError.message || persistError
    );
  }
  return details;
}

function clearSignatureArtifactMirrorsIfMatching_(
  cycle,
  role,
  fileId
) {
  if (!fileId) return;
  const mirrors = getLegacySignatureMirrorFields_(role);
  if (String(cycle[mirrors.managerId] || '') === fileId) {
    cycle[mirrors.managerId] = '';
    cycle[mirrors.managerAt] = '';
  }
  if (String(cycle[mirrors.selfId] || '') === fileId) {
    cycle[mirrors.selfId] = '';
    cycle[mirrors.selfAt] = '';
  }
}

function attemptFinalizationAfterSignature_(cycleId) {
  try {
    const result = finalizeReviewCycle_(cycleId);
    if (result && result.ok === false) {
      result.partial = true;
      result.retryFinalization = true;
      result.message =
        'The signature is recorded. ' +
        (result.message ||
          'Finalization did not complete; use Retry Finalization.');
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      partial: true,
      retryFinalization: true,
      message:
        'The signature is recorded. Finalization did not complete; use Retry Finalization.',
      error: String(error.message || error),
    };
  }
}

function buildSupersededSignatureResult_(recovery) {
  return {
    ok: true,
    superseded: true,
    signatureRecorded: false,
    artifactRecovery: recovery,
    warning: (recovery && recovery.warning) || '',
    message:
      'Another signature attempt completed first. This submission was not attached.',
  };
}

function getSignatureClaimFields_(role) {
  if (role === PR.ROLE.MANAGER) {
    return {
      statusField: 'Manager Signature Status',
      attemptField: 'Manager Signature Attempt ID',
      startedField: 'Manager Signature Started At',
      errorField: 'Manager Signature Last Error',
      artifactWarningField: 'Manager Signature Artifact Warning',
      auditWarningField: 'Manager Signature Audit Warning',
      fileField: 'Manager Signature File ID',
      signedAtField: 'Manager Signed At',
      winningAttemptField: 'Manager Signature Winning Attempt ID',
      recoveryFileField: 'Manager Signature Recovery File ID',
      recoveryAttemptField: 'Manager Signature Recovery Attempt ID',
      recoveryDetailsField: 'Manager Signature Recovery Details JSON',
      recoveryRecordedAtField: 'Manager Signature Recovery Recorded At',
      reconciliationStatusField:
        'Manager Signature Reconciliation Status',
      reconciliationAttemptField:
        'Manager Signature Reconciliation Attempt ID',
      reconciliationSelectedFileField:
        'Manager Signature Reconciliation Selected File ID',
      reconciliationStartedField:
        'Manager Signature Reconciliation Started At',
      reconciliationErrorField:
        'Manager Signature Reconciliation Last Error',
    };
  }

  if (role === PR.ROLE.EMPLOYEE) {
    return {
      statusField: 'Employee Signature Status',
      attemptField: 'Employee Signature Attempt ID',
      startedField: 'Employee Signature Started At',
      errorField: 'Employee Signature Last Error',
      artifactWarningField: 'Employee Signature Artifact Warning',
      auditWarningField: 'Employee Signature Audit Warning',
      fileField: 'Employee Signature File ID',
      signedAtField: 'Employee Signed At',
      winningAttemptField: 'Employee Signature Winning Attempt ID',
      recoveryFileField: 'Employee Signature Recovery File ID',
      recoveryAttemptField: 'Employee Signature Recovery Attempt ID',
      recoveryDetailsField: 'Employee Signature Recovery Details JSON',
      recoveryRecordedAtField: 'Employee Signature Recovery Recorded At',
      reconciliationStatusField:
        'Employee Signature Reconciliation Status',
      reconciliationAttemptField:
        'Employee Signature Reconciliation Attempt ID',
      reconciliationSelectedFileField:
        'Employee Signature Reconciliation Selected File ID',
      reconciliationStartedField:
        'Employee Signature Reconciliation Started At',
      reconciliationErrorField:
        'Employee Signature Reconciliation Last Error',
    };
  }

  return {
    statusField: 'HR Signature Status',
    attemptField: 'HR Signature Attempt ID',
    startedField: 'HR Signature Started At',
    errorField: 'HR Signature Last Error',
    artifactWarningField: 'HR Signature Artifact Warning',
    auditWarningField: 'HR Signature Audit Warning',
    fileField: 'HR Signature File ID',
    signedAtField: 'HR Signed At',
    winningAttemptField: 'HR Signature Winning Attempt ID',
    recoveryFileField: 'HR Signature Recovery File ID',
    recoveryAttemptField: 'HR Signature Recovery Attempt ID',
    recoveryDetailsField: 'HR Signature Recovery Details JSON',
    recoveryRecordedAtField: 'HR Signature Recovery Recorded At',
    reconciliationStatusField: 'HR Signature Reconciliation Status',
    reconciliationAttemptField:
      'HR Signature Reconciliation Attempt ID',
    reconciliationSelectedFileField:
      'HR Signature Reconciliation Selected File ID',
    reconciliationStartedField:
      'HR Signature Reconciliation Started At',
    reconciliationErrorField:
      'HR Signature Reconciliation Last Error',
  };
}

function getCombinedSignatureState_(cycle) {
  const managerId =
    cycle['Manager Signature File ID'] ||
    (cycle['MGR Manager Signature ID'] ===
    cycle['SELF Manager Signature ID']
      ? cycle['MGR Manager Signature ID']
      : '');
  const employeeId =
    cycle['Employee Signature File ID'] ||
    (cycle['MGR Employee Signature ID'] ===
    cycle['SELF Employee Signature ID']
      ? cycle['MGR Employee Signature ID']
      : '');
  const hrId =
    cycle['HR Signature File ID'] ||
    (cycle['MGR HR Signature ID'] ===
    cycle['SELF HR Signature ID']
      ? cycle['MGR HR Signature ID']
      : '');
  return {
    managerSigned:
      !!managerId &&
      cycle['MGR Manager Signature ID'] === managerId &&
      cycle['SELF Manager Signature ID'] === managerId,
    employeeSigned:
      !!employeeId &&
      cycle['MGR Employee Signature ID'] === employeeId &&
      cycle['SELF Employee Signature ID'] === employeeId,
    hrSigned:
      !!hrId &&
      cycle['MGR HR Signature ID'] === hrId &&
      cycle['SELF HR Signature ID'] === hrId,
  };
}

function updateCombinedSignatureStatuses_(cycle) {
  const state = getCombinedSignatureState_(cycle);

  if (state.managerSigned && state.employeeSigned && state.hrSigned) {
    cycle['Manager Review Status'] = PR.DOC.COMPLETE;
    cycle['Self Evaluation Status'] = PR.DOC.COMPLETE;
    // Do not set Complete here — PDF/distribution use Finalizing.
    if (
      String(cycle['Status']) !== PR.CYCLE.COMPLETE &&
      String(cycle['Status']) !== PR.CYCLE.FINALIZING
    ) {
      cycle['Status'] = PR.CYCLE.FINALIZING;
    }
    return;
  }

  if (state.managerSigned && state.employeeSigned) {
    cycle['Manager Review Status'] = PR.DOC.PENDING_HR;
    cycle['Self Evaluation Status'] = PR.DOC.PENDING_HR;
    return;
  }

  if (state.managerSigned) {
    cycle['Manager Review Status'] = PR.DOC.PENDING_EMPLOYEE;
    cycle['Self Evaluation Status'] = PR.DOC.PENDING_EMPLOYEE;
    return;
  }

  if (state.employeeSigned) {
    cycle['Manager Review Status'] = PR.DOC.PENDING_MANAGER;
    cycle['Self Evaluation Status'] = PR.DOC.PENDING_MANAGER;
    return;
  }

  cycle['Manager Review Status'] =
    PR.DOC.PENDING_PARTICIPANTS;
  cycle['Self Evaluation Status'] =
    PR.DOC.PENDING_PARTICIPANTS;
}

function clearCombinedSignatureFields_(cycle) {
  [
    'MGR Manager Signature ID',
    'MGR Manager Signed At',
    'MGR Employee Signature ID',
    'MGR Employee Signed At',
    'MGR HR Signature ID',
    'MGR HR Signed At',
    'SELF Employee Signature ID',
    'SELF Employee Signed At',
    'SELF Manager Signature ID',
    'SELF Manager Signed At',
    'SELF HR Signature ID',
    'SELF HR Signed At',
  ].forEach(function (field) {
    cycle[field] = '';
  });
  [
    PR.ROLE.MANAGER,
    PR.ROLE.EMPLOYEE,
    PR.ROLE.HR,
  ].forEach(function (role) {
    const fields = getSignatureClaimFields_(role);
    [
      fields.attemptField,
      fields.startedField,
      fields.errorField,
      fields.artifactWarningField,
      fields.auditWarningField,
      fields.fileField,
      fields.signedAtField,
      fields.winningAttemptField,
      fields.recoveryFileField,
      fields.recoveryAttemptField,
      fields.recoveryDetailsField,
      fields.recoveryRecordedAtField,
      fields.reconciliationAttemptField,
      fields.reconciliationSelectedFileField,
      fields.reconciliationStartedField,
      fields.reconciliationErrorField,
    ].forEach(function (field) {
      cycle[field] = '';
    });
    cycle[fields.statusField] = V31.SIGNATURE.PENDING;
    cycle[fields.reconciliationStatusField] =
      V31.SIGNATURE_RECONCILIATION.PENDING;
  });
}

function consolidateExistingParticipantSignatures_(cycle) {
  [
    PR.ROLE.MANAGER,
    PR.ROLE.EMPLOYEE,
    PR.ROLE.HR,
  ].forEach(function (role) {
    const fields = getSignatureClaimFields_(role);
    const mirrors = getLegacySignatureMirrorFields_(role);
    const authoritative = String(cycle[fields.fileField] || '');
    if (!authoritative) return;
    const signedAt = cycle[fields.signedAtField] || new Date();
    cycle[mirrors.managerId] = authoritative;
    cycle[mirrors.selfId] = authoritative;
    cycle[mirrors.managerAt] = signedAt;
    cycle[mirrors.selfAt] = signedAt;
    cycle[fields.statusField] = V31.SIGNATURE.SIGNED;
  });
}

function getSignatureTasks_(cycle, email) {
  if (String(cycle['Status']) !== PR.CYCLE.SIGNATURES) {
    return [];
  }

  const state = getCombinedSignatureState_(cycle);
  const normalized = normalizeEmail_(email);

  if (
    normalized === normalizeEmail_(cycle['Manager Email']) &&
    !state.managerSigned
  ) {
    return [
      {
        role: PR.ROLE.MANAGER,
        documentType: 'Manager Review and Self-Evaluation',
      },
    ];
  }

  if (
    normalized === normalizeEmail_(cycle['Employee Email']) &&
    !state.employeeSigned
  ) {
    return [
      {
        role: PR.ROLE.EMPLOYEE,
        documentType: 'Manager Review and Self-Evaluation',
      },
    ];
  }

  if (
    normalized === normalizeEmail_(cycle['HR Email']) &&
    state.managerSigned &&
    state.employeeSigned &&
    !state.hrSigned
  ) {
    return [
      {
        role: PR.ROLE.HR,
        documentType: 'Manager Review and Self-Evaluation',
      },
    ];
  }

  return [];
}

/* ============================= VIEW MODELS =============================== */

function listVisibleCycles_(email, isHr) {
  // Child of parent timer "cycles" in getReviewBootstrapData — do not sum both.
  const enrichmentTimer = perfStart_('cycles › review summaries');
  // One CompensationRecords scan for the whole list (not once per cycle).
  const compensationByCycleId = getCompensationRecordsByCycleId_();
  const rows = getAllObjects_(PR.SHEETS.CYCLES)
    .filter(function (cycle) {
      return (
        isHr ||
        normalizeEmail_(cycle['Manager Email']) === email ||
        normalizeEmail_(cycle['Employee Email']) === email
      );
    })
    .map(function (cycle) {
      const isManager =
        normalizeEmail_(cycle['Manager Email']) === email;
      const isEmployee =
        normalizeEmail_(cycle['Employee Email']) === email;
      const managerReview = parseJson_(
        cycle['Manager Review JSON'],
        emptyManagerReview_()
      );
      const selfEvaluation = parseJson_(
        cycle['Self Evaluation JSON'],
        emptySelfEvaluation_()
      );
      let relationship = isHr ? 'HR' : '';

      if (isManager) {
        relationship = relationship
          ? relationship + ' / Manager'
          : 'Manager';
      }

      if (isEmployee) {
        relationship = relationship
          ? relationship + ' / Employee'
          : 'Employee';
      }

      const action = determinePrimaryAction_(
        cycle,
        email,
        isHr
      );

      return {
        cycleId: String(cycle['Cycle ID']),
        employeeName: String(cycle['Employee Name']),
        employeeEmail: String(cycle['Employee Email']),
        employeeJobTitle: String(cycle['Employee Job Title']),
        departmentProject: String(cycle['Department / Project']),
        managerName: String(cycle['Manager Name']),
        managerEmail: String(cycle['Manager Email']),
        reviewType: String(cycle['Review Type']),
        reviewMeetingDate: formatDate_(
          cycle['Review Meeting Date']
        ),
        reviewMeetingDateIso: formatDateIso_(
          cycle['Review Meeting Date']
        ),
        status: String(cycle['Status']),
        managerReviewStatus: String(
          cycle['Manager Review Status']
        ),
        selfEvaluationStatus: String(
          cycle['Self Evaluation Status']
        ),
        relationship: relationship,
        isManager: isManager,
        isEmployee: isEmployee,
        isHr: isHr,
        managerProgress: calculateReviewProgress_(
          managerReview,
          PR.TYPE.MANAGER
        ),
        selfProgress: calculateReviewProgress_(
          selfEvaluation,
          PR.TYPE.SELF
        ),
        actionKey: action.key,
        actionLabel: action.label,
        actionTone: action.tone,
        actionRequired: action.required,
        v31: getV31CycleData_(cycle, email, isHr, {
          compensationByCycleId: compensationByCycleId,
          summaryOnly: true,
        }),
        updatedAt: formatDateTime_(cycle['Updated At']),
        updatedAtIso: toIsoString_(cycle['Updated At']),
      };
    })
    .sort(function (a, b) {
      return new Date(b.updatedAtIso) - new Date(a.updatedAtIso);
    });
  perfEnd_(enrichmentTimer, { cycleCount: rows.length });
  return rows;
}

function getCycleView_(cycleId, email, isHr) {
  const cycle = findCycle_(cycleId).object;
  const isManager =
    normalizeEmail_(cycle['Manager Email']) === email;
  const isEmployee =
    normalizeEmail_(cycle['Employee Email']) === email;

  if (!isHr && !isManager && !isEmployee) {
    throw new Error('You are not authorized to view this cycle.');
  }

  const meetingOpen = [
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
    PR.CYCLE.COMPLETE,
  ].includes(String(cycle['Status']));

  const managerReview = parseJson_(
    cycle['Manager Review JSON'],
    emptyManagerReview_()
  );
  const selfEvaluation = parseJson_(
    cycle['Self Evaluation JSON'],
    emptySelfEvaluation_()
  );
  const meeting = parseJson_(
    cycle['Meeting JSON'],
    emptyMeeting_()
  );

  const managerVisible =
    isHr || isManager || (isEmployee && meetingOpen);
  const selfVisible =
    isHr || isEmployee || (isManager && meetingOpen);
  const action = determinePrimaryAction_(cycle, email, isHr);
  const signatureState = getCombinedSignatureState_(cycle);
  const v31Data = getV31CycleData_(cycle, email, isHr);

  return {
    cycleId: String(cycle['Cycle ID']),
    status: String(cycle['Status']),
    reviewType: String(cycle['Review Type']),
    reviewPeriodStart: formatDate_(
      cycle['Review Period Start']
    ),
    reviewPeriodEnd: formatDate_(cycle['Review Period End']),
    reviewMeetingDate: formatDate_(
      cycle['Review Meeting Date']
    ),
    reviewMeetingDateIso: formatDateIso_(
      cycle['Review Meeting Date']
    ),
    employeeName: String(cycle['Employee Name']),
    employeeEmail: String(cycle['Employee Email']),
    employeeJobTitle: String(cycle['Employee Job Title']),
    departmentProject: String(cycle['Department / Project']),
    hireDate: formatDate_(cycle['Hire Date']),
    managerName: String(cycle['Manager Name']),
    managerEmail: String(cycle['Manager Email']),
    hrName: String(cycle['HR Name']),
    hrEmail: String(cycle['HR Email']),
    managerReviewStatus: String(
      cycle['Manager Review Status']
    ),
    selfEvaluationStatus: String(
      cycle['Self Evaluation Status']
    ),
    meetingOpenedAt: formatDateTime_(
      cycle['Meeting Opened At']
    ),
    signaturesReleasedAt: formatDateTime_(
      cycle['Signatures Released At']
    ),
    completedAt: formatDateTime_(cycle['Completed At']),
    updatedAt: formatDateTime_(cycle['Updated At']),
    updatedAtIso: toIsoString_(cycle['Updated At']),

    isHr: isHr,
    isManager: isManager,
    isEmployee: isEmployee,

    managerReviewVisible: managerVisible,
    selfEvaluationVisible: selfVisible,
    managerReview: managerVisible
      ? addSignatureTimes_(managerReview, cycle, PR.TYPE.MANAGER)
      : null,
    selfEvaluation: selfVisible
      ? addSignatureTimes_(selfEvaluation, cycle, PR.TYPE.SELF)
      : null,
    meeting: meeting,

    managerReviewProgress: calculateReviewProgress_(
      managerReview,
      PR.TYPE.MANAGER
    ),
    selfEvaluationProgress: calculateReviewProgress_(
      selfEvaluation,
      PR.TYPE.SELF
    ),
    lifecycle: buildLifecycle_(cycle),
    primaryAction: action,
    signatureState: signatureState,
    v31: v31Data,

    canEditManagerReview:
      isManager &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Manager Review Status'])
      ),

    canEditSelfEvaluation:
      isEmployee &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Self Evaluation Status'])
      ),

    canStartMeeting:
      (isManager || isHr) &&
      String(cycle['Status']) === PR.CYCLE.READY,

    canEditManagerMeeting:
      (isManager || isHr) &&
      String(cycle['Status']) === PR.CYCLE.MEETING,

    canEditEmployeeMeeting:
      (isEmployee || isHr) &&
      String(cycle['Status']) === PR.CYCLE.MEETING,

    canReleaseSignatures:
      (isManager || isHr) &&
      String(cycle['Status']) === PR.CYCLE.MEETING &&
      v31Data.compensationComplete,

    signatureTasks: getSignatureTasks_(cycle, email),

    canDownloadManager:
      !!cycle['Manager Review PDF ID'] &&
      (isHr || isManager || isEmployee),

    canDownloadSelf:
      !!cycle['Self Evaluation PDF ID'] &&
      (isHr || isManager || isEmployee),
  };
}

function determinePrimaryAction_(cycle, email, isHr) {
  const isManager =
    normalizeEmail_(cycle['Manager Email']) === email;
  const isEmployee =
    normalizeEmail_(cycle['Employee Email']) === email;
  const signatures = getSignatureTasks_(cycle, email);

  if (signatures.length) {
    return {
      key: 'signature',
      label: 'Sign Review Packet',
      tone: 'warning',
      required: true,
    };
  }

  if (
    isManager &&
    [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
      String(cycle['Manager Review Status'])
    )
  ) {
    return {
      key: 'manager-review',
      label:
        String(cycle['Manager Review Status']) === PR.DOC.DRAFT
          ? 'Continue Manager Review'
          : 'Start Manager Review',
      tone: 'primary',
      required: true,
    };
  }

  if (
    isManager &&
    !isV31CompensationComplete_(cycle) &&
    normalizeCompensationDecision_(
      cycle['Compensation Decision']
    ) === V31.COMPENSATION.PENDING &&
    ![PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
      String(cycle['Manager Review Status'])
    ) &&
    String(cycle['Status']) !== PR.CYCLE.COMPLETE
  ) {
    return {
      key: 'compensation',
      label: 'Complete Compensation Decision',
      tone: 'warning',
      required: true,
    };
  }

  if (
    isEmployee &&
    [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
      String(cycle['Self Evaluation Status'])
    )
  ) {
    return {
      key: 'self-evaluation',
      label:
        String(cycle['Self Evaluation Status']) === PR.DOC.DRAFT
          ? 'Continue Self-Evaluation'
          : 'Start Self-Evaluation',
      tone: 'primary',
      required: true,
    };
  }

  if (
    (isManager || isHr) &&
    String(cycle['Status']) === PR.CYCLE.READY
  ) {
    return {
      key: 'meeting',
      label: 'Start Review Meeting',
      tone: 'success',
      required: true,
    };
  }

  if (
    String(cycle['Status']) === PR.CYCLE.MEETING &&
    (isManager || isEmployee || isHr)
  ) {
    return {
      key: 'meeting',
      label: 'Continue Review Meeting',
      tone: 'primary',
      required: isManager || isEmployee,
    };
  }

  if (String(cycle['Status']) === PR.CYCLE.FINALIZING) {
    return {
      key: 'overview',
      label: isHr
        ? 'Retry Final Documents'
        : 'Final Documents Preparing',
      tone: isHr ? 'warning' : 'secondary',
      required: isHr,
    };
  }

  if (String(cycle['Status']) === PR.CYCLE.COMPLETE) {
    return {
      key: 'overview',
      label: 'View Completed Review',
      tone: 'secondary',
      required: false,
    };
  }

  return {
    key: 'overview',
    label: 'View Review',
    tone: 'secondary',
    required: false,
  };
}

function calculateReviewProgress_(review, type) {
  const byId = {};
  const ratings = Array.isArray(review.ratings)
    ? review.ratings
    : [];

  ratings.forEach(function (item) {
    byId[item.factorId] = item;
  });

  let completed = 0;
  let total = PR.FACTORS.length;
  let blocking = 0;

  PR.FACTORS.forEach(function (factor) {
    const item = byId[factor.id] || {};

    if (item.rating) {
      completed++;
    } else {
      blocking++;
    }

    const numeric = Number(item.rating);
    const requiresComment =
      item.rating !== 'N/A' && [1, 2, 6, 7].includes(numeric);

    if (requiresComment && !cleanText_(item.comments)) {
      blocking++;
    }
  });

  const narrativeFields =
    type === PR.TYPE.MANAGER
      ? [
          'overallComments',
          'areasForImprovement',
          'actionSteps',
          'supervisorComments',
        ]
      : [
          'overallComments',
          'keyAccomplishments',
          'areasForGrowth',
          'goalsForNextPeriod',
          'supportNeeded',
        ];

  narrativeFields.forEach(function (field) {
    total++;
    if (cleanText_(review[field])) {
      completed++;
    }
  });

  // Derived overall counts once factor ratings exist.
  total++;
  if (calculateOverallScore_(ratings)) {
    completed++;
  }

  return {
    completed: completed,
    total: total,
    percent: total
      ? Math.round((completed / total) * 100)
      : 0,
    blockingIssues: blocking,
    ratingsCompleted: PR.FACTORS.filter(function (factor) {
      return !!(byId[factor.id] || {}).rating;
    }).length,
    ratingsTotal: PR.FACTORS.length,
  };
}

function buildLifecycle_(cycle) {
  const status = String(cycle['Status']);
  const stages = [
    {
      key: 'drafting',
      label: 'Preparation',
      complete: status !== PR.CYCLE.OPEN,
      current: status === PR.CYCLE.OPEN,
    },
    {
      key: 'ready',
      label: 'Ready for Meeting',
      complete: [
        PR.CYCLE.MEETING,
        PR.CYCLE.SIGNATURES,
        PR.CYCLE.FINALIZING,
        PR.CYCLE.COMPLETE,
      ].includes(status),
      current: status === PR.CYCLE.READY,
    },
    {
      key: 'meeting',
      label: 'Review Meeting',
      complete: [
        PR.CYCLE.SIGNATURES,
        PR.CYCLE.FINALIZING,
        PR.CYCLE.COMPLETE,
      ].includes(status),
      current: status === PR.CYCLE.MEETING,
    },
    {
      key: 'signatures',
      label: 'Signatures',
      complete: [
        PR.CYCLE.FINALIZING,
        PR.CYCLE.COMPLETE,
      ].includes(status),
      current: status === PR.CYCLE.SIGNATURES,
    },
    {
      key: 'finalizing',
      label: 'Finalizing',
      complete: status === PR.CYCLE.COMPLETE,
      current: status === PR.CYCLE.FINALIZING,
    },
    {
      key: 'complete',
      label: 'Complete',
      complete: status === PR.CYCLE.COMPLETE,
      current: status === PR.CYCLE.COMPLETE,
    },
  ];

  return stages;
}

function addSignatureTimes_(review, cycle, type) {
  const clone = JSON.parse(JSON.stringify(review));

  if (type === PR.TYPE.MANAGER) {
    clone.managerSignedAt = formatDateTime_(
      cycle['MGR Manager Signed At']
    );
    clone.employeeSignedAt = formatDateTime_(
      cycle['MGR Employee Signed At']
    );
    clone.hrSignedAt = formatDateTime_(
      cycle['MGR HR Signed At']
    );
  } else {
    clone.employeeSignedAt = formatDateTime_(
      cycle['SELF Employee Signed At']
    );
    clone.managerSignedAt = formatDateTime_(
      cycle['SELF Manager Signed At']
    );
    clone.hrSignedAt = formatDateTime_(
      cycle['SELF HR Signed At']
    );
  }

  return clone;
}

/* ============================= VALIDATION ================================ */

function validateCyclePayload_(payload, domain) {
  const required = [
    'reviewType',
    'reviewPeriodStart',
    'reviewPeriodEnd',
    'reviewMeetingDate',
    'employeeName',
    'employeeEmail',
    'employeeJobTitle',
    'departmentProject',
    'managerName',
    'managerEmail',
  ];

  required.forEach(function (field) {
    if (!cleanText_(payload[field])) {
      throw new Error('Missing required field: ' + field);
    }
  });

  const clean = {};
  Object.keys(payload).forEach(function (key) {
    clean[key] = cleanText_(payload[key]);
  });

  clean.employeeEmail = normalizeEmail_(clean.employeeEmail);
  clean.managerEmail = normalizeEmail_(clean.managerEmail);

  assertDomain_(clean.employeeEmail, domain);
  assertDomain_(clean.managerEmail, domain);

  if (clean.employeeEmail === clean.managerEmail) {
    throw new Error(
      'The employee and manager must use different email addresses.'
    );
  }

  const periodStart = parseDateInput_(clean.reviewPeriodStart);
  const periodEnd = parseDateInput_(clean.reviewPeriodEnd);
  const meetingDate = parseDateInput_(clean.reviewMeetingDate);
  if (!periodStart || isNaN(periodStart.getTime())) {
    throw new Error('Review Period Start must be a valid date.');
  }
  if (!periodEnd || isNaN(periodEnd.getTime())) {
    throw new Error('Review Period End must be a valid date.');
  }
  if (!meetingDate || isNaN(meetingDate.getTime())) {
    throw new Error('Review Meeting Date must be a valid date.');
  }
  if (periodStart.getTime() > periodEnd.getTime()) {
    throw new Error(
      'Review Period Start must be on or before Review Period End.'
    );
  }
  if (clean.hireDate) {
    const hireDate = parseDateInput_(clean.hireDate);
    if (!hireDate || isNaN(hireDate.getTime())) {
      throw new Error('Hire Date must be a valid date when provided.');
    }
  }

  return clean;
}

function validateManagerReview_(payload, submitting) {
  const ratings = validateRatings_(payload.ratings, submitting);
  return {
    ratings: ratings,
    // Server-authoritative overall: ignore any client-supplied overallRating.
    overallRating: calculateOverallScore_(ratings),
    overallComments: cleanText_(payload.overallComments),
    areasForImprovement: cleanText_(
      payload.areasForImprovement
    ),
    actionSteps: cleanText_(payload.actionSteps),
    supervisorComments: cleanText_(payload.supervisorComments),
    submittedAt: cleanText_(payload.submittedAt),
  };
}

function validateSelfEvaluation_(payload, submitting) {
  const ratings = validateRatings_(payload.ratings, submitting);
  return {
    ratings: ratings,
    // Server-authoritative overall: ignore any client-supplied overallRating.
    overallRating: calculateOverallScore_(ratings),
    overallComments: cleanText_(payload.overallComments),
    keyAccomplishments: cleanText_(payload.keyAccomplishments),
    areasForGrowth: cleanText_(payload.areasForGrowth),
    goalsForNextPeriod: cleanText_(payload.goalsForNextPeriod),
    supportNeeded: cleanText_(payload.supportNeeded),
    submittedAt: cleanText_(payload.submittedAt),
  };
}

/**
 * Overall Score = average of scored competency/factor ratings.
 * Ignores blank and N/A factors. Returns '' when nothing is scored yet.
 * Display precision: 2 decimals (e.g. "4.00").
 */
function calculateOverallScore_(ratings) {
  let sum = 0;
  let count = 0;
  (ratings || []).forEach(function (item) {
    const raw = String((item && item.rating) || '').trim();
    if (!raw || raw.toUpperCase() === 'N/A') return;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return;
    sum += numeric;
    count += 1;
  });
  if (!count) return '';
  return (Math.round((sum / count) * 100) / 100).toFixed(2);
}

/**
 * Side-by-side difference convention:
 *   Manager score − Employee score
 * Positive means the manager rated higher than the employee.
 */
function calculateScoreDifference_(managerScore, employeeScore) {
  const manager = Number(managerScore);
  const employee = Number(employeeScore);
  if (!Number.isFinite(manager) || !Number.isFinite(employee)) {
    return null;
  }
  return manager - employee;
}

function formatScoreDifference_(difference) {
  if (difference == null || !Number.isFinite(Number(difference))) {
    return '—';
  }
  const value = Number(difference);
  if (value > 0) return '+' + String(value);
  return String(value);
}

function validateRatings_(ratings, submitting) {
  if (!Array.isArray(ratings)) {
    throw new Error('Invalid rating data.');
  }

  const byId = {};

  ratings.forEach(function (item) {
    byId[String(item.factorId)] = {
      factorId: String(item.factorId),
      rating: normalizeRating_(item.rating),
      comments: cleanText_(item.comments),
    };
  });

  return PR.FACTORS.map(function (factor) {
    const item = byId[factor.id] || {
      factorId: factor.id,
      rating: '',
      comments: '',
    };

    if (submitting && !item.rating) {
      throw new Error(
        'A rating is required for ' + factor.label + '.'
      );
    }

    const numeric = Number(item.rating);
    const requiresComment =
      item.rating !== 'N/A' &&
      [1, 2, 6, 7].includes(numeric);

    if (submitting && requiresComment && !item.comments) {
      throw new Error(
        'Comments are required for a rating of ' +
          item.rating +
          ' in ' +
          factor.label +
          '.'
      );
    }

    return item;
  });
}

function normalizeRating_(value) {
  const text = cleanText_(value);

  if (!text) return '';
  if (text.toUpperCase() === 'N/A') return 'N/A';

  const numeric = Number(text);

  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 7) {
    throw new Error('Ratings must be 1 through 7 or N/A.');
  }

  return String(numeric);
}

function emptyManagerReview_() {
  return {
    ratings: [],
    overallRating: '',
    overallComments: '',
    areasForImprovement: '',
    actionSteps: '',
    supervisorComments: '',
    submittedAt: '',
    lastSavedAt: '',
  };
}

function emptySelfEvaluation_() {
  return {
    ratings: [],
    overallRating: '',
    overallComments: '',
    keyAccomplishments: '',
    areasForGrowth: '',
    goalsForNextPeriod: '',
    supportNeeded: '',
    submittedAt: '',
    lastSavedAt: '',
  };
}

function updateCycleReadiness_(cycle) {
  if (
    String(cycle['Manager Review Status']) === PR.DOC.SUBMITTED &&
    String(cycle['Self Evaluation Status']) === PR.DOC.SUBMITTED &&
    String(cycle['Status']) === PR.CYCLE.OPEN &&
    isV31CompensationComplete_(cycle)
  ) {
    cycle['Status'] = PR.CYCLE.READY;
  }
}

/* ============================ FINALIZATION =============================== */

/**
 * Resume PDF generation and final distribution after all signatures.
 * Uses short locks around claim/result persistence; never holds the
 * global lock during Drive/Mail calls.
 */
function finalizeReviewCycleLegacy_(cycleId, options) {
  const opts = options || {};
  const allowUnknownResend = !!opts.allowUnknownResend;

  const claimed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    const state = getCombinedSignatureState_(cycle);

    if (!state.hrSigned || !state.managerSigned || !state.employeeSigned) {
      throw new Error(
        'Finalization requires manager, employee, and HR signatures.'
      );
    }

    if (String(cycle['Status']) === PR.CYCLE.COMPLETE) {
      return { alreadyComplete: true, cycle: cycle, rowNumber: location.rowNumber };
    }

    if (
      String(cycle['Status']) !== PR.CYCLE.FINALIZING &&
      String(cycle['Status']) !== PR.CYCLE.SIGNATURES
    ) {
      throw new Error(
        'This review cycle is not ready for finalization.'
      );
    }

    cycle['Status'] = PR.CYCLE.FINALIZING;
    cycle['Finalization Attempt Count'] =
      Number(cycle['Finalization Attempt Count'] || 0) + 1;
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return {
      alreadyComplete: false,
      cycle: cycle,
      rowNumber: location.rowNumber,
    };
  });

  if (claimed.alreadyComplete) {
    return {
      ok: true,
      alreadyComplete: true,
      message: 'This review is already complete.',
      components: getFinalizationSummary_(claimed.cycle),
    };
  }

  try {
    ensureFinalPdfComponent_(
      cycleId,
      'Manager',
      'Manager Review PDF ID',
      'Manager PDF Status',
      PR.TYPE.MANAGER
    );
    ensureFinalPdfComponent_(
      cycleId,
      'Self',
      'Self Evaluation PDF ID',
      'Self PDF Status',
      PR.TYPE.SELF
    );
    ensureFinalDistribution_(cycleId, allowUnknownResend);

    const completed = withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        !cycle['Manager Review PDF ID'] ||
        !cycle['Self Evaluation PDF ID'] ||
        String(cycle['Final Distribution Status']) !==
          V31.DELIVERY.SENT
      ) {
        throw new Error(
          'Finalization components are incomplete: ' +
            describeFinalizationStatus_(cycle)
        );
      }

      cycle['Status'] = PR.CYCLE.COMPLETE;
      cycle['Completed At'] = cycle['Completed At'] || new Date();
      cycle['Manager Review Status'] = PR.DOC.COMPLETE;
      cycle['Self Evaluation Status'] = PR.DOC.COMPLETE;
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      invalidatePreviousReviewCachesForEmployee_(cycle);

      return cycle;
    });

    return {
      ok: true,
      alreadyComplete: false,
      message:
        'Final PDFs were generated and the completed packet was emailed.',
      components: getFinalizationSummary_(completed),
    };
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      cycle['Status'] = PR.CYCLE.FINALIZING;
      cycle['Finalization Last Error'] = String(
        error.message || error
      );
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    throw error;
  }
}

function retryReviewFinalization(cycleId, options) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry review finalization.'
    );
  }

  try {
    const result = finalizeReviewCycle_(cycleId, options || {});
    audit_(
      cycleId,
      'Review finalization retried',
      email,
      PR.CYCLE.FINALIZING,
      result.alreadyComplete
        ? PR.CYCLE.COMPLETE
        : result.ok
          ? PR.CYCLE.COMPLETE
          : PR.CYCLE.FINALIZING,
      JSON.stringify(result.components || {})
    );
    return result;
  } catch (error) {
    let cycle = null;
    try {
      cycle = findCycle_(cycleId).object;
    } catch (lookupError) {
      throw error;
    }
    const components = getFinalizationSummary_(cycle);
    const blocker = classifyFinalizationBlocker_(cycle);
    const result = {
      ok: false,
      partial: true,
      cycleId: String(cycleId),
      message: String(error.message || error),
      blocker: blocker,
      components: components,
      recommendedAction: blocker && blocker.recommendedAction
        ? blocker.recommendedAction
        : 'retryFinalization',
    };
    try {
      audit_(
        cycleId,
        'Review finalization retry blocked',
        email,
        PR.CYCLE.FINALIZING,
        PR.CYCLE.FINALIZING,
        JSON.stringify({
          schemaVersion: 1,
          blocker: blocker,
          components: components,
          error: result.message,
        })
      );
    } catch (auditError) {
      Logger.log(
        'Finalization retry audit failed: ' +
          String(auditError.message || auditError)
      );
    }
    return result;
  }
}

function ensureFinalPdfComponentLegacy_(
  cycleId,
  label,
  idField,
  statusField,
  documentType
) {
  const attemptField =
    documentType === PR.TYPE.MANAGER
      ? 'Manager PDF Attempt ID'
      : 'Self PDF Attempt ID';
  const startedField =
    documentType === PR.TYPE.MANAGER
      ? 'Manager PDF Started At'
      : 'Self PDF Started At';

  const before = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );

    if (cycle[idField]) {
      if (String(cycle[statusField]) !== V31.DELIVERY.SENT) {
        cycle[statusField] = V31.DELIVERY.SENT;
        cycle['Updated At'] = new Date();
        writeCycle_(location.rowNumber, cycle);
        SpreadsheetApp.flush();
      }

      return { skip: true };
    }

    // Recover an orphaned PDF created before its ID was persisted.
    const recoveredId = findExistingReviewPdfId_(
      cycleId,
      documentType
    );

    if (recoveredId) {
      cycle[idField] = recoveredId;
      cycle[statusField] = V31.DELIVERY.SENT;
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();

      return { skip: true };
    }

    const status = String(cycle[statusField] || V31.DELIVERY.PENDING);
    const decision = decideLaunchComponentAction_(
      status,
      false,
      cycle[startedField],
      V31.DELIVERY.SENDING,
      false
    );

    if (decision.action === 'skip') {
      if (decision.reason === 'in-progress') {
        throw new Error(
          label + ' PDF generation is already in progress.'
        );
      }

      if (decision.reason === 'unknown') {
        throw new Error(
          label +
            ' PDF is Delivery Unknown. Confirm whether a Drive file already exists, then retry with reconciliation.'
        );
      }

      return { skip: true };
    }

    if (decision.action === 'mark-unknown') {
      cycle[statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Finalization Last Error'] =
        label +
        ' PDF claim went stale before an ID was persisted.';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();

      throw new Error(
        label +
          ' PDF is Delivery Unknown. HR must reconcile before automatic retry continues.'
      );
    }

    const attemptId = Utilities.getUuid();

    cycle[statusField] = V31.DELIVERY.SENDING;
    cycle[attemptField] = attemptId;
    cycle[startedField] = new Date();
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return { skip: false, attemptId: attemptId };
  });

  if (before.skip) {
    return;
  }

  try {
    const pdfId = generateReviewPdf_(cycleId, documentType);

    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle[attemptField] || '') !==
        String(before.attemptId)
      ) {
        return;
      }

      cycle[idField] = pdfId;
      cycle[statusField] = V31.DELIVERY.SENT;
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle[attemptField] || '') !==
        String(before.attemptId)
      ) {
        return;
      }

      // Ambiguous: Drive may have created the PDF before the error.
      // Recovery-by-name on the next attempt will find it.
      cycle[statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Finalization Last Error'] = String(
        error.message || error
      );
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    throw error;
  }
}

/**
 * Deterministic PDF artifact name used for orphan recovery.
 */
function buildReviewPdfFileNameLegacy_(cycleId, documentType) {
  return (
    String(documentType) +
    ' - ' +
    String(cycleId) +
    '.pdf'
  );
}

/**
 * Search the review folder for an existing PDF created for this
 * cycle/document before regenerating another copy.
 */
function findExistingReviewPdfIdLegacy_(cycleId, documentType) {
  const matches = listMatchingReviewPdfArtifacts_(
    cycleId,
    documentType
  );

  if (matches.length === 1) {
    return matches[0].id;
  }

  if (matches.length > 1) {
    throw new Error(
      'Multiple ' +
        documentType +
        ' PDF artifacts exist for cycle ' +
        cycleId +
        '. HR must choose which file to keep.'
    );
  }

  return '';
}

function listMatchingReviewPdfArtifactsLegacy_(cycleId, documentType) {
  const settings = getSettings_();
  const folderId = String(settings.REVIEW_FOLDER_ID || '');
  const folder = DriveApp.getFolderById(folderId);
  const wanted = buildReviewPdfFileName_(
    cycleId,
    documentType
  );
  const matches = [];
  const files = folder.getFilesByName(wanted);

  while (files.hasNext()) {
    const file = files.next();

    try {
      assertValidReviewPdfFile_(
        file,
        cycleId,
        documentType,
        folderId
      );
      matches.push({
        id: file.getId(),
        name: file.getName(),
        updatedAt: file.getLastUpdated()
          ? file.getLastUpdated().toISOString()
          : '',
      });
    } catch (error) {
      // Skip non-conforming files with the same name outside policy.
    }
  }

  return matches;
}

function assertValidReviewPdfFileLegacy_(
  file,
  cycleId,
  documentType,
  folderId
) {
  if (!file) {
    throw new Error('Drive file was not found.');
  }

  const mime = String(file.getMimeType() || '');

  if (
    mime !== MimeType.PDF &&
    mime !== 'application/pdf'
  ) {
    throw new Error(
      'Reconciled file must be application/pdf.'
    );
  }

  if (!isDriveFileInFolder_(file, folderId)) {
    throw new Error(
      'Reconciled PDF must live in the restricted review folder.'
    );
  }

  const wanted = buildReviewPdfFileName_(
    cycleId,
    documentType
  );

  if (String(file.getName() || '') !== wanted) {
    throw new Error(
      'Reconciled PDF must use the deterministic name "' +
        wanted +
        '".'
    );
  }
}

function isDriveFileInFolder_(file, folderId) {
  const wanted = String(folderId || '');

  if (!wanted) {
    return false;
  }

  const parents = file.getParents();

  while (parents.hasNext()) {
    if (String(parents.next().getId()) === wanted) {
      return true;
    }
  }

  return false;
}

function assertPdfReconciliationAllowed_(cycle, documentType) {
  if (String(cycle['Status']) !== PR.CYCLE.FINALIZING) {
    throw new Error(
      'PDF reconciliation is only allowed while the cycle is Finalizing.'
    );
  }

  const fields = getFinalPdfFields_(documentType);
  const status = String(
    cycle[fields.statusField] || V31.DELIVERY.PENDING
  );

  if (status !== V31.DELIVERY.UNKNOWN) {
    throw new Error(
      documentType +
        ' PDF reconciliation requires Delivery Unknown status.'
    );
  }
}

function validateAndLoadReviewPdfCandidate_(
  fileId,
  cycleId,
  documentType
) {
  const settings = getSettings_();
  const folderId = String(settings.REVIEW_FOLDER_ID || '');
  const candidates = listMatchingReviewPdfArtifacts_(
    cycleId,
    documentType
  );
  const allowed = candidates.some(function (row) {
    return String(row.id) === String(fileId);
  });

  if (!allowed) {
    throw new Error(
      'Choose a PDF from the current candidate list for this cycle and document.'
    );
  }

  const file = DriveApp.getFileById(String(fileId));
  assertValidReviewPdfFile_(
    file,
    cycleId,
    documentType,
    folderId,
    {
      allowStampSelectedId: true,
      selectedFileId: String(fileId),
    }
  );

  return file;
}

/**
 * HR-only reconciliation for Manager/Self PDF Delivery Unknown states.
 * Never silently regenerates when artifacts are ambiguous.
 */
function reconcileFinalPdf(
  cycleId,
  documentType,
  action,
  options
) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error('Only HR may reconcile final PDFs.');
  }

  const opts = options || {};
  const fields = getFinalPdfFields_(documentType);
  const location = findCycle_(cycleId);
  assertPdfReconciliationAllowed_(location.object, documentType);

  if (action === 'cancel') {
    return {
      ok: true,
      message:
        documentType +
        ' left as Delivery Unknown. No Drive changes were made.',
      finalization: getFinalizationSummary_(location.object),
      candidates: listMatchingReviewPdfArtifacts_(
        cycleId,
        documentType
      ),
    };
  }

  if (action === 'useFileId' || action === 'chooseFile') {
    const fileId = String(opts.fileId || '').trim();

    if (!fileId) {
      throw new Error('Choose a candidate PDF from the list.');
    }

    const file = validateAndLoadReviewPdfCandidate_(
      fileId,
      cycleId,
      documentType
    );

    withLock_(function () {
      const freshLocation = findCycle_(cycleId);
      const cycle = freshLocation.object;
      assertPdfReconciliationAllowed_(cycle, documentType);
      cycle[fields.idField] = file.getId();
      cycle[fields.statusField] = V31.DELIVERY.SENT;
      cycle[fields.completedField] = new Date();
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.errorField] = '';
      cycle[fields.recoveryField] = JSON.stringify({
        schemaVersion: 1,
        resolution: 'hr-selected-artifact',
        selectedFileId: file.getId(),
        reconciledBy: email,
        reconciledAt: new Date().toISOString(),
      });
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(freshLocation.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    audit_(
      cycleId,
      'Final PDF reconciled with existing file',
      email,
      documentType,
      file.getId(),
      action
    );
    safelyAutoResolveSystemAlertByKey_(
      buildSystemAlertKey_(
        cycleId,
        'PDF',
        String(documentType) + ':ambiguous'
      ),
      function () {
        const fresh = findCycle_(cycleId).object;
        return (
          String(fresh[fields.idField] || '') === String(file.getId()) &&
          String(fresh[fields.statusField] || '') === V31.DELIVERY.SENT
        );
      }
    );

    return {
      ok: true,
      message: documentType + ' PDF attached from validated candidate.',
      finalization: getFinalizationSummary_(
        findCycle_(cycleId).object
      ),
    };
  }

  if (action === 'regenerate') {
    const matches = listMatchingReviewPdfArtifacts_(
      cycleId,
      documentType
    );

    if (matches.length > 0) {
      throw new Error(
        'Matching PDF candidate(s) already exist. Choose one instead of regenerating.'
      );
    }

    if (!opts.confirmMissing) {
      throw new Error(
        'Confirm no Drive file exists (confirmMissing) before regenerating a Delivery Unknown PDF.'
      );
    }

    withLock_(function () {
      const freshLocation = findCycle_(cycleId);
      const cycle = freshLocation.object;
      assertPdfReconciliationAllowed_(cycle, documentType);
      cycle[fields.idField] = '';
      cycle[fields.statusField] = V31.DELIVERY.PENDING;
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.completedField] = '';
      cycle[fields.errorField] = '';
      cycle[fields.recoveryField] = JSON.stringify({
        schemaVersion: 1,
        resolution: 'hr-confirmed-regeneration',
        confirmedBy: email,
        confirmedAt: new Date().toISOString(),
      });
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(freshLocation.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    ensureFinalPdfComponent_(
      cycleId,
      fields.label,
      fields.idField,
      fields.statusField,
      documentType
    );

    audit_(
      cycleId,
      'Final PDF regenerated after HR confirmation',
      email,
      documentType,
      String(findCycle_(cycleId).object[fields.idField] || ''),
      action
    );

    return {
      ok: true,
      message: documentType + ' PDF regenerated.',
      finalization: getFinalizationSummary_(
        findCycle_(cycleId).object
      ),
    };
  }

  throw new Error(
    'Unsupported PDF reconciliation action. Use useFileId, chooseFile, regenerate, or cancel.'
  );
}

function getFinalPdfFieldsLegacy_(documentType) {
  if (documentType === PR.TYPE.MANAGER) {
    return {
      label: 'Manager Review',
      idField: 'Manager Review PDF ID',
      statusField: 'Manager PDF Status',
      attemptField: 'Manager PDF Attempt ID',
      startedField: 'Manager PDF Started At',
    };
  }

  if (documentType === PR.TYPE.SELF) {
    return {
      label: 'Self-Evaluation',
      idField: 'Self Evaluation PDF ID',
      statusField: 'Self PDF Status',
      attemptField: 'Self PDF Attempt ID',
      startedField: 'Self PDF Started At',
    };
  }

  throw new Error('Unsupported PDF document type.');
}

function listFinalPdfCandidates(cycleId, documentType) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error('Only HR may list final PDF candidates.');
  }

  const cycle = findCycle_(cycleId).object;
  assertPdfReconciliationAllowed_(cycle, documentType);

  return {
    ok: true,
    files: listMatchingReviewPdfArtifacts_(cycleId, documentType),
  };
}

function listMatchingSignatureArtifacts_(cycleId, role) {
  const settings = getSettings_();
  const cycle = findCycle_(cycleId).object;
  const signatureFields = getSignatureClaimFields_(role);
  const recoveryFileId = String(
    cycle[signatureFields.recoveryFileField] || ''
  );
  const folderIds = [
    String(settings.REVIEW_FOLDER_ID || ''),
    String(settings.SIGNATURE_RECOVERY_FOLDER_ID || ''),
  ].filter(Boolean);
  const canonical = buildCanonicalSignatureFileName_(cycleId, role);
  const legacy = buildLegacySignatureFileName_(cycleId, role);
  const attemptPrefix =
    'AITHERAS_' +
    String(cycleId) +
    '_' +
    signatureRoleToken_(role) +
    '_SIGNATURE_ATTEMPT_';
  const matches = [];
  const seen = {};

  folderIds.forEach(function (folderId) {
    const files = DriveApp.getFolderById(folderId).getFiles();
    let checked = 0;
    while (files.hasNext() && checked < 100) {
      checked++;
      const file = files.next();
      const name = String(file.getName() || '');
      if (
        name !== canonical &&
        name !== legacy &&
        !(
          name.indexOf(attemptPrefix) === 0 &&
          name.slice(-4) === '.png'
        )
      ) {
        continue;
      }
      try {
        if (
          String(file.getMimeType() || '') !== 'image/png' ||
          !isDriveFileInFolder_(file, folderId)
        ) {
          continue;
        }
        const description = String(
          file.getDescription() || ''
        );
        const provenance =
          parseSignatureProvenance_(description);
        const exactProof =
          name === legacy ||
          file.getId() === recoveryFileId ||
          (provenance &&
            provenance.cycleId === String(cycleId) &&
            provenance.role === signatureRoleToken_(role));
        if (!exactProof) {
          continue;
        }
        const id = file.getId();
        if (!seen[id]) {
          seen[id] = true;
          matches.push({
            id: id,
            name: name,
            folderId: folderId,
            location:
              folderId === settings.REVIEW_FOLDER_ID
                ? 'Review Records'
                : 'Signature Recovery',
            provenance: description,
            legacy: name === legacy,
            recoveryMetadataMatch: id === recoveryFileId,
            updatedAt: file.getLastUpdated()
              ? file.getLastUpdated().toISOString()
              : '',
          });
        }
      } catch (error) {}
    }
  });

  return matches;
}

function assertValidSignatureFile_(file, expectedName, folderId) {
  if (!file) {
    throw new Error('Drive signature file was not found.');
  }

  const mime = String(file.getMimeType() || '');

  if (mime !== MimeType.PNG && mime !== 'image/png') {
    throw new Error('Signature file must be image/png.');
  }

  if (!isDriveFileInFolder_(file, folderId)) {
    throw new Error(
      'Signature file must live in the restricted review folder.'
    );
  }

  if (String(file.getName() || '') !== String(expectedName)) {
    throw new Error(
      'Signature file must use the deterministic name "' +
        expectedName +
        '".'
    );
  }
}

function assertSignatureReconciliationAllowed_(cycle, role) {
  if (String(cycle['Status']) !== PR.CYCLE.SIGNATURES) {
    throw new Error(
      'Signature reconciliation is only allowed while awaiting signatures.'
    );
  }

  const fields = getSignatureClaimFields_(role);
  const status = String(
    cycle[fields.statusField] || V31.DELIVERY.PENDING
  );

  if (status !== V31.DELIVERY.UNKNOWN) {
    throw new Error(
      role +
        ' signature reconciliation requires Delivery Unknown status.'
    );
  }

  const state = getCombinedSignatureState_(cycle);

  if (role === PR.ROLE.MANAGER && state.managerSigned) {
    throw new Error('Manager signature is already recorded.');
  }

  if (role === PR.ROLE.EMPLOYEE && state.employeeSigned) {
    throw new Error('Employee signature is already recorded.');
  }

  if (role === PR.ROLE.HR) {
    if (!state.managerSigned || !state.employeeSigned) {
      throw new Error(
        'HR signature reconciliation requires both participant signatures first.'
      );
    }

    if (state.hrSigned) {
      throw new Error('HR signature is already recorded.');
    }
  }
}

function applyReconciledSignatureId_(
  cycle,
  role,
  signatureId,
  winningAttemptId,
  reconciliationAttemptId
) {
  const now = new Date();
  const fields = getSignatureClaimFields_(role);
  applySignatureWinnerToCycle_(
    cycle,
    role,
    signatureId,
    winningAttemptId || '',
    now
  );
  cycle[fields.reconciliationStatusField] =
    V31.SIGNATURE_RECONCILIATION.RESOLVED;
  cycle[fields.reconciliationAttemptField] = '';
  cycle[fields.reconciliationSelectedFileField] = '';
  cycle[fields.reconciliationStartedField] = '';
  cycle[fields.reconciliationErrorField] = '';
  cycle[fields.recoveryFileField] = '';
  cycle[fields.recoveryAttemptField] = '';
  cycle[fields.recoveryDetailsField] = '';
  cycle[fields.recoveryRecordedAtField] = '';
  cycle[fields.auditWarningField] = '';
  cycle[fields.artifactWarningField] = '';
  updateCombinedSignatureStatuses_(cycle);
}

function claimSignatureReconciliation_(cycleId, role, fileId) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const fields = getSignatureClaimFields_(role);
    assertSignatureReconciliationAllowed_(cycle, role);
    const status = String(
      cycle[fields.reconciliationStatusField] ||
        V31.SIGNATURE_RECONCILIATION.PENDING
    );

    if (
      status === V31.SIGNATURE_RECONCILIATION.RECONCILING
    ) {
      if (
        !isDeliveryClaimStale_(
          cycle[fields.reconciliationStartedField]
        )
      ) {
        throw new Error(
          role + ' signature reconciliation is already in progress.'
        );
      }
      cycle[fields.reconciliationStatusField] =
        V31.SIGNATURE_RECONCILIATION.UNKNOWN;
      cycle[fields.reconciliationAttemptField] = '';
      cycle[fields.reconciliationStartedField] = '';
      cycle[fields.reconciliationErrorField] =
        'A reconciliation claim went stale. HR must inspect the selected candidate.';
      cycle[fields.statusField] = V31.SIGNATURE.UNKNOWN;
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      throw new Error(
        role +
          ' reconciliation claim went stale and now requires HR review.'
      );
    }

    const attemptId = Utilities.getUuid();
    cycle[fields.reconciliationStatusField] =
      V31.SIGNATURE_RECONCILIATION.RECONCILING;
    cycle[fields.reconciliationAttemptField] = attemptId;
    cycle[fields.reconciliationSelectedFileField] = fileId;
    cycle[fields.reconciliationStartedField] = new Date();
    cycle[fields.reconciliationErrorField] = '';
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return {
      attemptId: attemptId,
      selectedFileId: fileId,
      role: role,
    };
  });
}

function validateSignatureReconciliationCandidate_(
  cycleId,
  role,
  fileId
) {
  const settings = getSettings_();
  const file = DriveApp.getFileById(fileId);
  if (String(file.getMimeType() || '') !== 'image/png') {
    throw new Error('Signature candidate must be image/png.');
  }
  const inReview = isDriveFileInFolder_(
    file,
    settings.REVIEW_FOLDER_ID
  );
  const inRecovery = isDriveFileInFolder_(
    file,
    settings.SIGNATURE_RECOVERY_FOLDER_ID
  );
  if (!inReview && !inRecovery) {
    throw new Error(
      'Signature candidate must remain in a restricted review or recovery folder.'
    );
  }

  const name = String(file.getName() || '');
  const legacyName = buildLegacySignatureFileName_(
    cycleId,
    role
  );
  const provenance = parseSignatureProvenance_(
    file.getDescription()
  );
  const provenanceMatches =
    provenance &&
    provenance.cycleId === String(cycleId) &&
    provenance.role === signatureRoleToken_(role);
  const cycle = findCycle_(cycleId).object;
  const fields = getSignatureClaimFields_(role);
  const recoveryMetadataMatches =
    String(cycle[fields.recoveryFileField] || '') ===
    String(fileId);
  if (
    name !== legacyName &&
    !provenanceMatches &&
    !recoveryMetadataMatches
  ) {
    throw new Error(
      'Signature candidate lacks an exact recognized legacy name, structured provenance marker, or explicit recovery record.'
    );
  }

  return {
    file: file,
    fileId: file.getId(),
    fileName: name,
    originalFolder:
      inRecovery && !inReview ? 'recovery' : 'review',
    recoveredCandidate: inRecovery,
    provenance: provenance,
    recoveryMetadataMatch: recoveryMetadataMatches,
    winningAttemptId: provenanceMatches
      ? String(provenance.attemptId || '')
      : recoveryMetadataMatches
      ? String(cycle[fields.recoveryAttemptField] || '')
      : '',
  };
}

function failSignatureReconciliationClaim_(
  cycleId,
  role,
  attemptId,
  error
) {
  withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const fields = getSignatureClaimFields_(role);
    if (
      String(cycle[fields.reconciliationAttemptField] || '') !==
      String(attemptId)
    ) {
      return;
    }
    cycle[fields.reconciliationStatusField] =
      V31.SIGNATURE_RECONCILIATION.FAILED;
    cycle[fields.reconciliationAttemptField] = '';
    cycle[fields.reconciliationStartedField] = '';
    cycle[fields.reconciliationErrorField] = String(
      error.message || error
    );
    cycle[fields.errorField] =
      'Selected signature candidate validation failed: ' +
      String(error.message || error);
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
  });
}

function commitSignatureReconciliation_(
  cycleId,
  role,
  claim,
  candidate
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const fields = getSignatureClaimFields_(role);
    assertSignatureReconciliationAllowed_(cycle, role);
    if (
      String(cycle[fields.reconciliationStatusField] || '') !==
        V31.SIGNATURE_RECONCILIATION.RECONCILING ||
      String(cycle[fields.reconciliationAttemptField] || '') !==
        String(claim.attemptId) ||
      String(
        cycle[fields.reconciliationSelectedFileField] || ''
      ) !== String(candidate.fileId)
    ) {
      throw new Error(
        'Signature reconciliation claim no longer matches this request.'
      );
    }
    const recoveryAttempt =
      String(cycle[fields.recoveryFileField] || '') ===
      String(candidate.fileId)
        ? String(cycle[fields.recoveryAttemptField] || '')
        : '';
    applyReconciledSignatureId_(
      cycle,
      role,
      candidate.fileId,
      recoveryAttempt || candidate.winningAttemptId,
      claim.attemptId
    );
    cycle['Updated At'] = new Date();
    maybeInjectSignatureFault_(
      'BEFORE_SIGNATURE_RECONCILIATION_WRITE',
      cycleId
    );
    writeCycle_(location.rowNumber, cycle);
    maybeInjectSignatureFault_(
      'AFTER_SIGNATURE_RECONCILIATION_WRITE_BEFORE_FLUSH',
      cycleId
    );
    SpreadsheetApp.flush();
    return {
      committed: true,
      reconciliationAttemptId: claim.attemptId,
      selectedFileId: candidate.fileId,
      cycle: cycle,
      signatureState: getCombinedSignatureState_(cycle),
    };
  });
}

function classifySignatureReconciliationAfterFailure_(
  cycleId,
  role,
  claim,
  candidate,
  error
) {
  try {
    return withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      const fields = getSignatureClaimFields_(role);
      if (
        String(cycle[fields.fileField] || '') ===
          String(candidate.fileId) &&
        String(cycle[fields.statusField] || '') ===
          V31.SIGNATURE.SIGNED
      ) {
        return {
          committed: true,
          cycle: cycle,
          signatureState: getCombinedSignatureState_(cycle),
          rereadClassification: 'committed',
          commitError: String(error.message || error),
        };
      }

      markSignatureReconciliationUnknownOnCycle_(
        cycle,
        fields,
        claim.attemptId,
        error
      );
      try {
        writeCycle_(location.rowNumber, cycle);
        SpreadsheetApp.flush();
      } catch (persistError) {}
      return {
        committed: false,
        rereadClassification: 'delivery-unknown',
        selectedFileId: candidate.fileId,
        commitError: String(error.message || error),
      };
    });
  } catch (rereadError) {
    try {
      return withLock_(function () {
        const location = findCycle_(cycleId);
        const cycle = location.object;
        const fields = getSignatureClaimFields_(role);
        if (
          String(cycle[fields.fileField] || '') ===
            String(candidate.fileId) &&
          String(cycle[fields.statusField] || '') ===
            V31.SIGNATURE.SIGNED
        ) {
          return {
            committed: true,
            cycle: cycle,
            signatureState: getCombinedSignatureState_(cycle),
            rereadClassification: 'committed-on-retry',
            commitError: String(error.message || error),
          };
        }
        if (
          markSignatureReconciliationUnknownOnCycle_(
            cycle,
            fields,
            claim.attemptId,
            error
          )
        ) {
          writeCycle_(location.rowNumber, cycle);
          SpreadsheetApp.flush();
        }
        return {
          committed: false,
          rereadClassification: 'delivery-unknown-on-retry',
          selectedFileId: candidate.fileId,
          commitError: String(error.message || error),
        };
      });
    } catch (persistUnknownError) {}
    return {
      committed: false,
      rereadClassification: 'authoritative-reread-failed',
      selectedFileId: candidate.fileId,
      commitError:
        String(error.message || error) +
        '; reread failed: ' +
        String(rereadError.message || rereadError),
    };
  }
}

function markSignatureReconciliationUnknownOnCycle_(
  cycle,
  fields,
  attemptId,
  error
) {
  if (
    String(cycle[fields.reconciliationAttemptField] || '') !==
    String(attemptId)
  ) {
    return false;
  }
  cycle[fields.reconciliationStatusField] =
    V31.SIGNATURE_RECONCILIATION.UNKNOWN;
  cycle[fields.reconciliationAttemptField] = '';
  cycle[fields.reconciliationStartedField] = '';
  cycle[fields.reconciliationErrorField] =
    'Reconciliation commit could not be confirmed: ' +
    String(error.message || error);
  cycle[fields.statusField] = V31.SIGNATURE.UNKNOWN;
  cycle[fields.errorField] =
    'Reconciliation commit could not be confirmed. The selected candidate remains preserved.';
  cycle['Updated At'] = new Date();
  return true;
}

function organizeReconciledSignatureCandidate_(
  cycleId,
  role,
  candidate
) {
  try {
    const settings = getSettings_();
    if (
      !isDriveFileInFolder_(
        candidate.file,
        settings.REVIEW_FOLDER_ID
      )
    ) {
      candidate.file.moveTo(
        DriveApp.getFolderById(settings.REVIEW_FOLDER_ID)
      );
    }
    candidate.file.setName(
      buildCanonicalSignatureFileName_(cycleId, role)
    );
    candidate.file.setDescription(
      buildSignatureProvenanceMarker_(
        cycleId,
        role,
        candidate.winningAttemptId,
        'winner-reconciled'
      )
    );
    return '';
  } catch (error) {
    const warning =
      'The reconciled winner is authoritative, but its Drive organization requires HR attention: ' +
      String(error.message || error);
    try {
      persistSignatureWarning_(
        cycleId,
        role,
        'artifact',
        warning
      );
    } catch (persistError) {}
    return warning;
  }
}

/**
 * HR-only reconciliation for per-role signature Delivery Unknown states.
 */
function reconcileSignature(cycleId, role, action, options) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error('Only HR may reconcile signatures.');
  }

  if (
    [PR.ROLE.MANAGER, PR.ROLE.EMPLOYEE, PR.ROLE.HR].indexOf(
      role
    ) < 0
  ) {
    throw new Error('Unsupported signature role.');
  }

  const opts = options || {};
  const fields = getSignatureClaimFields_(role);
  const location = findCycle_(cycleId);
  assertSignatureReconciliationAllowed_(location.object, role);

  if (action === 'cancel') {
    return {
      ok: true,
      message:
        role +
        ' signature left as Delivery Unknown. No Drive changes were made.',
      candidates: listMatchingSignatureArtifacts_(cycleId, role),
    };
  }

  if (action === 'useFileId' || action === 'chooseFile') {
    const fileId = String(opts.fileId || '').trim();
    const candidates = listMatchingSignatureArtifacts_(
      cycleId,
      role
    );
    const allowed = candidates.some(function (row) {
      return String(row.id) === fileId;
    });

    if (!fileId || !allowed) {
      throw new Error(
        'Choose a signature file from the current candidate list.'
      );
    }

    const reconciliationClaim =
      claimSignatureReconciliation_(
        cycleId,
        role,
        fileId
      );
    maybeInjectSignatureFault_(
      'AFTER_SIGNATURE_RECONCILIATION_CLAIM',
      cycleId
    );
    let candidate;
    try {
      candidate = validateSignatureReconciliationCandidate_(
        cycleId,
        role,
        fileId
      );
      maybeInjectSignatureFault_(
        'AFTER_SIGNATURE_RECONCILIATION_VALIDATION',
        cycleId
      );
    } catch (validationError) {
      failSignatureReconciliationClaim_(
        cycleId,
        role,
        reconciliationClaim.attemptId,
        validationError
      );
      throw validationError;
    }

    let reconciliationResult;
    try {
      reconciliationResult =
        commitSignatureReconciliation_(
          cycleId,
          role,
          reconciliationClaim,
          candidate
        );
    } catch (commitError) {
      reconciliationResult =
        classifySignatureReconciliationAfterFailure_(
          cycleId,
          role,
          reconciliationClaim,
          candidate,
          commitError
        );
    }

    if (!reconciliationResult.committed) {
      return {
        ok: false,
        recoveryRequired: true,
        signatureReconciled: false,
        message:
          'Signature reconciliation could not be confirmed. The selected candidate remains preserved.',
        reconciliation: reconciliationResult,
      };
    }

    let auditWarning = '';
    try {
      audit_(
        cycleId,
        'Signature reconciled with existing file',
        email,
        role,
        fileId,
        JSON.stringify({
          schemaVersion: 1,
          action: action,
          reconciliationAttemptId:
            reconciliationClaim.attemptId,
          selectedFileId: fileId,
        })
      );
      ['artifact', 'audit'].forEach(function (warningType) {
        safelyAutoResolveSystemAlertByKey_(
          buildSystemAlertKey_(
            cycleId,
            'Signature',
            role + ':' + warningType
          ),
          function () {
            const fresh = findCycle_(cycleId).object;
            const fields = getSignatureClaimFields_(role);
            const warningField =
              warningType === 'audit'
                ? fields.auditWarningField
                : fields.artifactWarningField;
            return !String(fresh[warningField] || '').trim();
          }
        );
      });
    } catch (auditError) {
      auditWarning =
        'Reconciliation committed, but its audit record could not be written: ' +
        String(auditError.message || auditError);
      try {
        persistSignatureWarning_(
          cycleId,
          role,
          'audit',
          auditWarning
        );
      } catch (persistAuditWarningError) {}
    }

    const organizationWarning =
      organizeReconciledSignatureCandidate_(
        cycleId,
        role,
        candidate
      );
    let signed = reconciliationResult.cycle || {};
    let state =
      reconciliationResult.signatureState ||
      getCombinedSignatureState_(signed);
    let stateReadWarning = '';
    try {
      signed = findCycle_(cycleId).object;
      state = getCombinedSignatureState_(signed);
    } catch (stateReadError) {
      stateReadWarning =
        'The reconciliation committed, but the follow-up state refresh failed.';
    }

    let notificationWarning = stateReadWarning;
    if (
      role !== PR.ROLE.HR &&
      state.managerSigned &&
      state.employeeSigned
    ) {
      try {
        sendCombinedSignatureEmail_(cycleId, PR.ROLE.HR);
      } catch (notificationError) {
        notificationWarning =
          'The reconciled signature is recorded, but the durable HR signature notification requires retry.';
      }
    }

    if (role === PR.ROLE.HR) {
      try {
        const finalizeResult =
          attemptFinalizationAfterSignature_(cycleId);

        return {
          ok: true,
          partial:
            !!auditWarning ||
            !!organizationWarning ||
            !!notificationWarning,
          signatureReconciled: true,
          signatureStatus: V31.SIGNATURE.SIGNED,
          finalizationComplete: !!finalizeResult.ok,
          cycleStatus: finalizeResult.ok
            ? PR.CYCLE.COMPLETE
            : PR.CYCLE.FINALIZING,
          warning: [
            auditWarning,
            organizationWarning,
            notificationWarning,
          ]
            .filter(Boolean)
            .join(' '),
          message:
            finalizeResult.message +
            ([
              auditWarning,
              organizationWarning,
              notificationWarning,
            ]
              .filter(Boolean)
              .length
              ? ' ' +
                [
                  auditWarning,
                  organizationWarning,
                  notificationWarning,
                ]
                  .filter(Boolean)
                  .join(' ')
              : ''),
          finalization: finalizeResult,
          signatureState: state,
        };
      } catch (finalizeError) {
        return {
          ok: true,
          signatureReconciled: true,
          signatureStatus: V31.SIGNATURE.SIGNED,
          finalizationComplete: false,
          cycleStatus: PR.CYCLE.FINALIZING,
          message:
            'HR signature was attached. Final document preparation requires attention. ' +
            String(finalizeError.message || finalizeError),
          signatureState: state,
        };
      }
    }

    return {
      ok: true,
      partial:
        !!auditWarning ||
        !!organizationWarning ||
        !!notificationWarning,
      signatureReconciled: true,
      signatureStatus: V31.SIGNATURE.SIGNED,
      warning: [
        auditWarning,
        organizationWarning,
        notificationWarning,
      ]
        .filter(Boolean)
        .join(' '),
      message:
        role +
        ' signature attached from validated candidate.' +
        ([
          auditWarning,
          organizationWarning,
          notificationWarning,
        ]
          .filter(Boolean)
          .length
          ? ' ' +
            [
              auditWarning,
              organizationWarning,
              notificationWarning,
            ]
              .filter(Boolean)
              .join(' ')
          : ''),
      signatureState: state,
    };
  }

  if (action === 'resetPending') {
    const matches = listMatchingSignatureArtifacts_(
      cycleId,
      role
    );

    if (matches.length > 0) {
      throw new Error(
        'Matching signature files exist. Select one or remove them before resetting.'
      );
    }

    if (!opts.confirmMissing) {
      throw new Error(
        'Confirm that no signature file exists before resetting to Pending.'
      );
    }

    withLock_(function () {
      const freshLocation = findCycle_(cycleId);
      const cycle = freshLocation.object;
      assertSignatureReconciliationAllowed_(cycle, role);
      cycle[fields.statusField] = V31.DELIVERY.PENDING;
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.errorField] = '';
      cycle[fields.fileField] = '';
      cycle[fields.signedAtField] = '';
      cycle[fields.recoveryFileField] = '';
      cycle[fields.recoveryAttemptField] = '';
      cycle[fields.recoveryDetailsField] = '';
      cycle[fields.recoveryRecordedAtField] = '';
      cycle[fields.reconciliationStatusField] =
        V31.SIGNATURE_RECONCILIATION.PENDING;
      cycle[fields.reconciliationAttemptField] = '';
      cycle[fields.reconciliationSelectedFileField] = '';
      cycle[fields.reconciliationStartedField] = '';
      cycle[fields.reconciliationErrorField] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(freshLocation.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    audit_(
      cycleId,
      'Signature claim reset to Pending',
      email,
      role,
      V31.DELIVERY.PENDING,
      action
    );

    return {
      ok: true,
      message:
        role +
        ' signature claim reset to Pending. The signer may try again.',
    };
  }

  throw new Error(
    'Unsupported signature reconciliation action. Use useFileId, chooseFile, resetPending, or cancel.'
  );
}

function listSignatureCandidates(cycleId, role) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error('Only HR may list signature candidates.');
  }

  const cycle = findCycle_(cycleId).object;
  assertSignatureReconciliationAllowed_(cycle, role);

  return {
    ok: true,
    files: listMatchingSignatureArtifacts_(cycleId, role),
  };
}

function ensureFinalDistributionLegacy_(cycleId, allowUnknownResend) {
  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(
      cycle['Final Distribution Status'] || V31.DELIVERY.PENDING
    );

    if (status === V31.DELIVERY.SENT) {
      return { skip: true };
    }

    if (
      !cycle['Manager Review PDF ID'] ||
      !cycle['Self Evaluation PDF ID']
    ) {
      throw new Error(
        'Both PDF IDs are required before final distribution.'
      );
    }

    if (status === V31.DELIVERY.SENDING) {
      if (!isDeliveryClaimStale_(cycle['Final Distribution Started At'])) {
        throw new Error(
          'Final distribution is already in progress.'
        );
      }

      cycle['Final Distribution Status'] = V31.DELIVERY.UNKNOWN;
      cycle['Finalization Last Error'] =
        'Final distribution claim went stale after send may have occurred.';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();

      throw new Error(
        'Final distribution is Delivery Unknown. HR must explicitly reconcile before resending.'
      );
    }

    if (status === V31.DELIVERY.UNKNOWN && !allowUnknownResend) {
      throw new Error(
        'Final distribution is Delivery Unknown. Pass allowUnknownResend after confirming recipients did not receive the packet.'
      );
    }

    const attemptId = Utilities.getUuid();

    cycle['Final Distribution Status'] = V31.DELIVERY.SENDING;
    cycle['Final Distribution Attempt ID'] = attemptId;
    cycle['Final Distribution Started At'] = new Date();
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return { skip: false, cycle: cycle, attemptId: attemptId };
  });

  if (claim.skip) {
    return;
  }

  try {
    sendCompletedPacket_(claim.cycle);

    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle['Final Distribution Attempt ID'] || '') !==
        String(claim.attemptId)
      ) {
        return;
      }

      cycle['Final Distribution Status'] = V31.DELIVERY.SENT;
      cycle['Final Distribution Sent At'] = new Date();
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle['Final Distribution Attempt ID'] || '') !==
        String(claim.attemptId)
      ) {
        return;
      }

      // Ambiguous: MailApp may have accepted the message.
      cycle['Final Distribution Status'] = V31.DELIVERY.UNKNOWN;
      cycle['Finalization Last Error'] = String(
        error.message || error
      );
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    throw new Error(
      'Final distribution is Delivery Unknown after send failure: ' +
        String(error.message || error)
    );
  }
}

function isDeliveryClaimStale_(startedAt) {
  const started = startedAt ? new Date(startedAt) : null;

  if (!started || Number.isNaN(started.getTime())) {
    return true;
  }

  return (
    Date.now() - started.getTime() >
    Number(V31.SENDING_STALE_MS || 900000)
  );
}

function getFinalizationSummary_(cycle) {
  const managerPdf =
    String(cycle['Manager PDF Status'] || '') ||
    (cycle['Manager Review PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  const selfPdf =
    String(cycle['Self PDF Status'] || '') ||
    (cycle['Self Evaluation PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  const distribution = String(
    cycle['Final Distribution Status'] || V31.DELIVERY.PENDING
  );
  const finalizationAudit = String(
    cycle['Finalization Audit Status'] || 'Pending'
  );

  return {
    managerPdf: managerPdf,
    selfPdf: selfPdf,
    distribution: distribution,
    managerPdfUnknown: managerPdf === V31.DELIVERY.UNKNOWN,
    selfPdfUnknown: selfPdf === V31.DELIVERY.UNKNOWN,
    distributionUnknown: distribution === V31.DELIVERY.UNKNOWN,
    distributionRecipients: [
      normalizeEmail_(cycle['Employee Email']),
      normalizeEmail_(cycle['Manager Email']),
      normalizeEmail_(cycle['HR Email']),
    ],
    distributionLastError: String(
      cycle['Final Distribution Last Error'] || ''
    ),
    finalizationAudit: finalizationAudit,
    finalizationAuditEventId: String(
      cycle['Finalization Audit Event ID'] || ''
    ),
    managerPdfId: String(cycle['Manager Review PDF ID'] || ''),
    selfPdfId: String(cycle['Self Evaluation PDF ID'] || ''),
    lastError: String(cycle['Finalization Last Error'] || ''),
    attemptCount: Number(
      cycle['Finalization Attempt Count'] || 0
    ),
    status: String(cycle['Status'] || ''),
  };
}

function describeFinalizationStatus_(cycle) {
  const summary = getFinalizationSummary_(cycle);

  return [
    'Manager PDF: ' + summary.managerPdf,
    'Self PDF: ' + summary.selfPdf,
    'Distribution: ' + summary.distribution,
    'Finalization audit: ' + summary.finalizationAudit,
  ].join('; ');
}

/* =============================== PDF ===================================== */

function createReviewTemplate_(type, folderId) {
  const title =
    type === PR.TYPE.MANAGER
      ? 'Employee Performance Review'
      : 'Employee Self-Evaluation';
  const prefix =
    type === PR.TYPE.MANAGER ? 'MGR' : 'SELF';

  const doc = DocumentApp.create(
    'AITHERAS ' + title + ' Template'
  );
  const body = doc.getBody();
  body.clear();

  const brand = body.appendParagraph('AITHERAS');
  brand.setHeading(DocumentApp.ParagraphHeading.TITLE);
  brand.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const heading = body.appendParagraph(title);
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  heading.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body
    .appendParagraph('Review Cycle ID: {{CYCLE_ID}}')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendHorizontalRule();

  const detailTable = body.appendTable([
    ['Employee', '{{EMPLOYEE_NAME}}'],
    ['Job Title', '{{EMPLOYEE_JOB_TITLE}}'],
    ['Department / Project', '{{DEPARTMENT_PROJECT}}'],
    ['Manager', '{{MANAGER_NAME}}'],
    ['Review Type', '{{REVIEW_TYPE}}'],
    ['Review Period', '{{REVIEW_PERIOD}}'],
    ['Review Meeting Date', '{{REVIEW_MEETING_DATE}}'],
  ]);
  styleInfoTable_(detailTable);

  body
    .appendParagraph('Rating Scale')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const ratingRows = [['Score', 'Contextual Definition']];

  PR.RATINGS.forEach(function (rating) {
    ratingRows.push([
      rating.value + ' — ' + rating.label,
      rating.definition,
    ]);
  });

  ratingRows.push([
    'N/A',
    'Not applicable to the role or insufficient opportunity to evaluate.',
  ]);

  const scaleTable = body.appendTable(ratingRows);
  styleHeaderRow_(scaleTable);

  body
    .appendParagraph('Performance Factors')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const factorRows = [['Factor', 'Rating', 'Comments']];

  PR.FACTORS.forEach(function (factor) {
    factorRows.push([
      factor.label,
      '{{' +
        prefix +
        '_' +
        factor.id.toUpperCase() +
        '_RATING}}',
      '{{' +
        prefix +
        '_' +
        factor.id.toUpperCase() +
        '_COMMENTS}}',
    ]);
  });

  const factorTable = body.appendTable(factorRows);
  styleHeaderRow_(factorTable);

  if (type === PR.TYPE.MANAGER) {
    appendSection_(
      body,
      'Overall Performance',
      'Overall Score: {{MGR_OVERALL_RATING}}\n\n{{MGR_OVERALL_COMMENTS}}'
    );
    appendSection_(
      body,
      'Areas for Improvement',
      '{{MGR_AREAS_FOR_IMPROVEMENT}}'
    );
    appendSection_(
      body,
      'Action Steps',
      '{{MGR_ACTION_STEPS}}'
    );
    appendSection_(
      body,
      'Supervisor Comments',
      '{{MGR_SUPERVISOR_COMMENTS}}'
    );
  } else {
    appendSection_(
      body,
      'Overall Self-Assessment',
      'Overall Score: {{SELF_OVERALL_RATING}}\n\n{{SELF_OVERALL_COMMENTS}}'
    );
    appendSection_(
      body,
      'Key Accomplishments',
      '{{SELF_KEY_ACCOMPLISHMENTS}}'
    );
    appendSection_(
      body,
      'Areas for Growth',
      '{{SELF_AREAS_FOR_GROWTH}}'
    );
    appendSection_(
      body,
      'Goals for the Next Review Period',
      '{{SELF_GOALS}}'
    );
    appendSection_(
      body,
      'Support or Training Needed',
      '{{SELF_SUPPORT_NEEDED}}'
    );
  }

  appendSection_(
    body,
    'Review Meeting Outcomes',
    'Manager Final Comments:\n{{MEETING_MANAGER_COMMENTS}}\n\n' +
      'Development Goals:\n{{MEETING_DEVELOPMENT_GOALS}}\n\n' +
      'Action Steps:\n{{MEETING_ACTION_STEPS}}\n\n' +
      'Employee Comments:\n{{MEETING_EMPLOYEE_COMMENTS}}'
  );

  body
    .appendParagraph('Signatures')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const signatureRows =
    type === PR.TYPE.MANAGER
      ? [
          [
            'Manager',
            '{{MANAGER_NAME}}',
            '{{MGR_MANAGER_SIGNATURE}}',
            '{{MGR_MANAGER_SIGNED_AT}}',
          ],
          [
            'Employee',
            '{{EMPLOYEE_NAME}}',
            '{{MGR_EMPLOYEE_SIGNATURE}}',
            '{{MGR_EMPLOYEE_SIGNED_AT}}',
          ],
          [
            'HR',
            '{{HR_NAME}}',
            '{{MGR_HR_SIGNATURE}}',
            '{{MGR_HR_SIGNED_AT}}',
          ],
        ]
      : [
          [
            'Employee',
            '{{EMPLOYEE_NAME}}',
            '{{SELF_EMPLOYEE_SIGNATURE}}',
            '{{SELF_EMPLOYEE_SIGNED_AT}}',
          ],
          [
            'Manager',
            '{{MANAGER_NAME}}',
            '{{SELF_MANAGER_SIGNATURE}}',
            '{{SELF_MANAGER_SIGNED_AT}}',
          ],
          [
            'HR',
            '{{HR_NAME}}',
            '{{SELF_HR_SIGNATURE}}',
            '{{SELF_HR_SIGNED_AT}}',
          ],
        ];

  const sigTable = body.appendTable(signatureRows);
  const sigHeader = sigTable.insertTableRow(0);

  ['Role', 'Name', 'Signature', 'Signed At'].forEach(function (text) {
    const cell = sigHeader.appendTableCell(text);
    cell.setBackgroundColor('#5b128b');
    cell
      .editAsText()
      .setForegroundColor('#ffffff')
      .setBold(true);
  });

  if (type === PR.TYPE.MANAGER) {
    body
      .appendParagraph(
        'The employee signature acknowledges that the review was discussed and does not necessarily indicate agreement with every rating or comment.'
      )
      .setFontSize(8);
  }

  doc.saveAndClose();

  return moveFileToFolder_(doc.getId(), folderId);
}

function generateReviewPdf_(cycleId, type) {
  const cycle = findCycle_(cycleId).object;
  const settings = getSettings_();
  const templateId =
    type === PR.TYPE.MANAGER
      ? settings.MANAGER_TEMPLATE_ID
      : settings.SELF_TEMPLATE_ID;
  const folder = DriveApp.getFolderById(
    settings.REVIEW_FOLDER_ID
  );

  const copy = DriveApp.getFileById(templateId).makeCopy(
    type +
      ' - ' +
      cycle['Employee Name'] +
      ' - ' +
      cycleId,
    folder
  );

  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  const managerReview = parseJson_(
    cycle['Manager Review JSON'],
    emptyManagerReview_()
  );
  const selfEvaluation = parseJson_(
    cycle['Self Evaluation JSON'],
    emptySelfEvaluation_()
  );
  const meeting = parseJson_(
    cycle['Meeting JSON'],
    emptyMeeting_()
  );

  replaceMap_(body, {
    '{{CYCLE_ID}}': cycle['Cycle ID'],
    '{{EMPLOYEE_NAME}}': cycle['Employee Name'],
    '{{EMPLOYEE_JOB_TITLE}}': cycle['Employee Job Title'],
    '{{DEPARTMENT_PROJECT}}': cycle['Department / Project'],
    '{{MANAGER_NAME}}': cycle['Manager Name'],
    '{{HR_NAME}}': cycle['HR Name'],
    '{{REVIEW_TYPE}}': cycle['Review Type'],
    '{{REVIEW_PERIOD}}':
      formatDate_(cycle['Review Period Start']) +
      ' – ' +
      formatDate_(cycle['Review Period End']),
    '{{REVIEW_MEETING_DATE}}': formatDate_(
      cycle['Review Meeting Date']
    ),
    '{{MEETING_MANAGER_COMMENTS}}':
      meeting.managerFinalComments,
    '{{MEETING_DEVELOPMENT_GOALS}}':
      meeting.developmentGoals,
    '{{MEETING_ACTION_STEPS}}': meeting.actionSteps,
    '{{MEETING_EMPLOYEE_COMMENTS}}':
      meeting.employeeComments,
  });

  if (type === PR.TYPE.MANAGER) {
    replaceRatings_(body, 'MGR', managerReview.ratings);
    replaceMap_(body, {
      '{{MGR_OVERALL_RATING}}': ratingLabel_(
        managerReview.overallRating
      ),
      '{{MGR_OVERALL_COMMENTS}}':
        managerReview.overallComments,
      '{{MGR_AREAS_FOR_IMPROVEMENT}}':
        managerReview.areasForImprovement,
      '{{MGR_ACTION_STEPS}}': managerReview.actionSteps,
      '{{MGR_SUPERVISOR_COMMENTS}}':
        managerReview.supervisorComments,
      '{{MGR_MANAGER_SIGNED_AT}}': formatDateTime_(
        cycle['MGR Manager Signed At']
      ),
      '{{MGR_EMPLOYEE_SIGNED_AT}}': formatDateTime_(
        cycle['MGR Employee Signed At']
      ),
      '{{MGR_HR_SIGNED_AT}}': formatDateTime_(
        cycle['MGR HR Signed At']
      ),
    });

    replaceImage_(
      body,
      '{{MGR_MANAGER_SIGNATURE}}',
      cycle['MGR Manager Signature ID']
    );
    replaceImage_(
      body,
      '{{MGR_EMPLOYEE_SIGNATURE}}',
      cycle['MGR Employee Signature ID']
    );
    replaceImage_(
      body,
      '{{MGR_HR_SIGNATURE}}',
      cycle['MGR HR Signature ID']
    );
  } else {
    replaceRatings_(body, 'SELF', selfEvaluation.ratings);
    replaceMap_(body, {
      '{{SELF_OVERALL_RATING}}': ratingLabel_(
        selfEvaluation.overallRating
      ),
      '{{SELF_OVERALL_COMMENTS}}':
        selfEvaluation.overallComments,
      '{{SELF_KEY_ACCOMPLISHMENTS}}':
        selfEvaluation.keyAccomplishments,
      '{{SELF_AREAS_FOR_GROWTH}}':
        selfEvaluation.areasForGrowth,
      '{{SELF_GOALS}}': selfEvaluation.goalsForNextPeriod,
      '{{SELF_SUPPORT_NEEDED}}':
        selfEvaluation.supportNeeded,
      '{{SELF_EMPLOYEE_SIGNED_AT}}': formatDateTime_(
        cycle['SELF Employee Signed At']
      ),
      '{{SELF_MANAGER_SIGNED_AT}}': formatDateTime_(
        cycle['SELF Manager Signed At']
      ),
      '{{SELF_HR_SIGNED_AT}}': formatDateTime_(
        cycle['SELF HR Signed At']
      ),
    });

    replaceImage_(
      body,
      '{{SELF_EMPLOYEE_SIGNATURE}}',
      cycle['SELF Employee Signature ID']
    );
    replaceImage_(
      body,
      '{{SELF_MANAGER_SIGNATURE}}',
      cycle['SELF Manager Signature ID']
    );
    replaceImage_(
      body,
      '{{SELF_HR_SIGNATURE}}',
      cycle['SELF HR Signature ID']
    );
  }

  compactSignatureTables_(body);
  doc.saveAndClose();

  const pdf = folder.createFile(
    copy
      .getAs(MimeType.PDF)
      .setName(buildReviewPdfFileName_(cycleId, type))
  );
  pdf.setDescription(buildReviewPdfProvenance_(cycleId, type));

  copy.setTrashed(true);

  return pdf.getId();
}

function replaceRatings_(body, prefix, ratings) {
  const byId = {};

  (ratings || []).forEach(function (item) {
    byId[item.factorId] = item;
  });

  PR.FACTORS.forEach(function (factor) {
    const item = byId[factor.id] || {
      rating: '',
      comments: '',
    };

    const map = {};
    map[
      '{{' +
        prefix +
        '_' +
        factor.id.toUpperCase() +
        '_RATING}}'
    ] = ratingLabel_(item.rating);
    map[
      '{{' +
        prefix +
        '_' +
        factor.id.toUpperCase() +
        '_COMMENTS}}'
    ] = item.comments || '';

    replaceMap_(body, map);
  });
}

function replaceMap_(body, map) {
  Object.keys(map).forEach(function (placeholder) {
    body.replaceText(
      escapeRegex_(placeholder),
      String(map[placeholder] || '')
    );
  });
}

function replaceImage_(body, placeholder, fileId) {
  const found = body.findText(escapeRegex_(placeholder));

  if (!found) return;

  const text = found.getElement().asText();
  const parent = text.getParent();

  text.deleteText(
    found.getStartOffset(),
    found.getEndOffsetInclusive()
  );

  if (!fileId) return;

  const image = parent.insertInlineImage(
    parent.getChildIndex(text) + 1,
    DriveApp.getFileById(fileId).getBlob()
  );

  const width = Math.max(image.getWidth(), 1);
  const height = Math.max(image.getHeight(), 1);
  const scale = Math.min(105 / width, 42 / height, 1);

  image.setWidth(Math.max(1, Math.round(width * scale)));
  image.setHeight(Math.max(1, Math.round(height * scale)));

  if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
    parent
      .asParagraph()
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  }
}

function compactSignatureTables_(body) {
  body.getTables().forEach(function (table) {
    if (table.getNumRows() < 2 || table.getRow(0).getNumCells() < 4) {
      return;
    }

    const header = [];

    for (let column = 0; column < 4; column++) {
      header.push(
        table
          .getRow(0)
          .getCell(column)
          .getText()
          .trim()
          .toLowerCase()
      );
    }

    if (header.join('|') !== 'role|name|signature|signed at') {
      return;
    }

    for (let row = 0; row < table.getNumRows(); row++) {
      const tableRow = table.getRow(row);
      tableRow.setMinimumHeight(row === 0 ? 20 : 48);

      for (
        let column = 0;
        column < tableRow.getNumCells();
        column++
      ) {
        const cell = tableRow.getCell(column);

        cell.setPaddingTop(2);
        cell.setPaddingBottom(2);
        cell.setPaddingLeft(4);
        cell.setPaddingRight(4);
        cell.setVerticalAlignment(
          DocumentApp.VerticalAlignment.CENTER
        );
        cell.editAsText().setFontSize(row === 0 ? 8 : 9);
      }
    }
  });
}

function styleHeaderRow_(table) {
  for (let column = 0; column < table.getRow(0).getNumCells(); column++) {
    const cell = table.getRow(0).getCell(column);

    cell.setBackgroundColor('#5b128b');
    cell
      .editAsText()
      .setForegroundColor('#ffffff')
      .setBold(true);
  }

  for (let row = 1; row < table.getNumRows(); row++) {
    table.getRow(row).getCell(0).setBackgroundColor('#efe7f5');
    table.getRow(row).getCell(0).editAsText().setBold(true);
  }
}

function appendSection_(body, heading, text) {
  body
    .appendParagraph(heading)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(text);
}

function ratingLabel_(value) {
  const text = String(value || '');

  if (!text) return '';
  if (text === 'N/A') return 'N/A';

  const rating = PR.RATINGS.find(function (item) {
    return String(item.value) === text;
  });

  return rating
    ? rating.value + ' — ' + rating.label
    : text;
}

/* =============================== EMAIL =================================== */

function sendCycleCreatedEmails_(cycle) {
  const managerUrl =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=manager-review';
  const employeeUrl =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=self-evaluation';

  sendHtmlEmail_(
    cycle['Manager Email'],
    'Performance review assigned: ' + cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(cycle['Manager Name']) +
      ',</p><p>A ' +
      htmlEscape_(cycle['Review Type']) +
      ' performance review has been assigned for ' +
      htmlEscape_(cycle['Employee Name']) +
      '.</p><p>Complete the manager review independently before the meeting.</p>' +
      emailButton_(managerUrl, 'Open Manager Review')
  );

  sendHtmlEmail_(
    cycle['Employee Email'],
    'Self-evaluation assigned',
    '<p>Hello ' +
      htmlEscape_(cycle['Employee Name']) +
      ',</p><p>Your ' +
      htmlEscape_(cycle['Review Type']) +
      ' self-evaluation is ready.</p><p>Complete it independently before meeting with your manager.</p>' +
      emailButton_(employeeUrl, 'Open Self-Evaluation')
  );
}

function sendReadyForMeetingEmail_(cycle) {
  deliverWorkflowNotification_(
    cycle['Cycle ID'],
    getWorkflowNotificationComponent_('ready'),
    function (fresh) {
      sendReadyForMeetingEmailBody_(fresh);
    },
    {}
  );
}

function sendReadyForMeetingEmailBody_(cycle) {
  const url =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=meeting';

  sendHtmlEmail_(
    uniqueEmails_([
      cycle['Manager Email'],
      cycle['HR Email'],
    ]).join(','),
    'Both reviews submitted: ' + cycle['Employee Name'],
    '<p>The manager review and employee self-evaluation have both been submitted and sealed.</p><p>The manager or HR may open the review meeting when the discussion begins.</p>' +
      emailButton_(url, 'Open Review Cycle')
  );
}

function sendMeetingOpenedEmails_(cycleId) {
  deliverWorkflowNotification_(
    cycleId,
    getWorkflowNotificationComponent_('meetingManager'),
    function (cycle) {
      sendMeetingOpenedRecipientEmail_(cycle, 'manager');
    },
    {}
  );

  deliverWorkflowNotification_(
    cycleId,
    getWorkflowNotificationComponent_('meetingEmployee'),
    function (cycle) {
      sendMeetingOpenedRecipientEmail_(cycle, 'employee');
    },
    {}
  );
}

function sendMeetingOpenedRecipientEmail_(cycle, recipient) {
  const url =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=meeting';

  const to =
    recipient === 'employee'
      ? cycle['Employee Email']
      : uniqueEmails_([
          cycle['Manager Email'],
          cycle['HR Email'],
        ]).join(',');

  sendHtmlEmail_(
    to,
    'Review meeting opened: ' + cycle['Employee Name'],
    '<p>The review meeting has been opened.</p><p>The manager review and self-evaluation are now visible to both participants.</p>' +
      emailButton_(url, 'Open Review Meeting')
  );
}

function sendCombinedSignatureEmail_(cycleIdOrCycle, role) {
  const cycleId =
    typeof cycleIdOrCycle === 'string'
      ? cycleIdOrCycle
      : cycleIdOrCycle['Cycle ID'];
  const key =
    role === PR.ROLE.MANAGER
      ? 'signatureManager'
      : role === PR.ROLE.EMPLOYEE
      ? 'signatureEmployee'
      : 'signatureHr';

  deliverWorkflowNotification_(
    cycleId,
    getWorkflowNotificationComponent_(key),
    function (cycle) {
      sendCombinedSignatureEmailBody_(cycle, role);
    },
    {}
  );
}

function sendCombinedSignatureEmailBody_(cycle, role) {
  let to;
  let name;

  if (role === PR.ROLE.MANAGER) {
    to = cycle['Manager Email'];
    name = cycle['Manager Name'];
  } else if (role === PR.ROLE.EMPLOYEE) {
    to = cycle['Employee Email'];
    name = cycle['Employee Name'];
  } else {
    to = cycle['HR Email'];
    name = cycle['HR Name'];
  }

  const url =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=signature';

  const instruction =
    role === PR.ROLE.HR
      ? 'Both the manager and employee have signed. Your final HR signature will complete both documents.'
      : 'One signature will be applied to both the Manager Performance Review and Employee Self-Evaluation.';

  sendHtmlEmail_(
    to,
    'Signature needed: Performance review packet for ' +
      cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(name) +
      ',</p><p>The completed performance review packet is ready for your signature as ' +
      htmlEscape_(role) +
      '.</p><p>' +
      htmlEscape_(instruction) +
      '</p>' +
      emailButton_(url, 'Review Both Documents and Sign')
  );
}

/**
 * Send the completed review packet.
 * When packetSpec is provided (final-distribution claim path), attachments are
 * bound strictly to the claim: no opportunistic CAF attach/skip.
 * cafRequired=true → exactly 3 files (Manager, Self, CAF); failure if CAF missing.
 * cafRequired=false → exactly 2 files.
 */
function sendCompletedPacket_(cycle, recipients, packetSpec) {
  const managerPdfId = packetSpec
    ? String(packetSpec.managerPdfId || '')
    : String(cycle['Manager Review PDF ID'] || '');
  const selfPdfId = packetSpec
    ? String(packetSpec.selfPdfId || '')
    : String(cycle['Self Evaluation PDF ID'] || '');
  if (!managerPdfId || !selfPdfId) {
    throw new Error(
      'Final packet requires Manager and Self Evaluation PDF IDs.'
    );
  }

  const attachments = [
    DriveApp.getFileById(managerPdfId)
      .getBlob()
      .setName(buildReviewPdfFileName_(cycle['Cycle ID'], PR.TYPE.MANAGER)),
    DriveApp.getFileById(selfPdfId)
      .getBlob()
      .setName(buildReviewPdfFileName_(cycle['Cycle ID'], PR.TYPE.SELF)),
  ];

  let cafAttached = false;
  if (packetSpec) {
    if (packetSpec.cafRequired) {
      const cafPdfId = String(packetSpec.cafPdfId || '').trim();
      if (!cafPdfId) {
        throw new Error(
          'Approved compensation final packet requires a bound CAF PDF ID.'
        );
      }
      attachments.push(getNamedCompensationCafBlob_(cycle['Cycle ID'], cafPdfId));
      cafAttached = true;
    }
  } else {
    // Legacy callers without a claim packetSpec: fail closed for approved CAF.
    const recordLoc = findCompensationRecordByCycleOptional_(
      cycle['Cycle ID']
    );
    if (
      recordLoc &&
      isApprovedCompensationAdjustment_(recordLoc.object) &&
      String(recordLoc.object['Status']) === V31_COMP.STATUS.COMPLETE
    ) {
      const cafPdfId = String(recordLoc.object['CAF Final PDF ID'] || '').trim();
      if (!cafPdfId) {
        throw new Error(
          'Approved compensation final packet requires a sealed CAF PDF.'
        );
      }
      attachments.push(getNamedCompensationCafBlob_(cycle['Cycle ID'], cafPdfId));
      cafAttached = true;
    }
  }

  const htmlBody =
    '<p>The performance review cycle for <strong>' +
    htmlEscape_(cycle['Employee Name']) +
    '</strong> is complete.</p><p>The signed manager review and employee self-evaluation' +
    (cafAttached
      ? ', and the compensation adjustment form,'
      : '') +
    ' are attached.</p>';

  MailApp.sendEmail({
    to: uniqueEmails_(
      recipients || [
        cycle['Employee Email'],
        cycle['Manager Email'],
        cycle['HR Email'],
      ]
    ).join(','),
    subject:
      'Completed performance review: ' +
      cycle['Employee Name'],
    body: htmlToPlainText_(htmlBody),
    htmlBody: htmlBody,
    attachments: attachments,
    name: PR.SETTINGS_DEFAULTS.APP_NAME || 'AITHERAS HR',
  });

  audit_(
    cycle['Cycle ID'],
    'Completed review packet emailed',
    cycle['HR Email'],
    PR.CYCLE.FINALIZING,
    PR.CYCLE.FINALIZING,
    cafAttached ? 'with-caf' : 'without-caf'
  );
}

function getNamedCompensationCafBlob_(cycleId, cafPdfId) {
  ensureHumanReadableCompensationCafName_(cafPdfId, cycleId);
  return DriveApp.getFileById(cafPdfId)
    .getBlob()
    .setName(buildCompensationCafFileName_(cycleId));
}

function sendHtmlEmail_(to, subject, htmlBody) {
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: htmlToPlainText_(htmlBody),
    htmlBody: htmlBody,
    name: PR.SETTINGS_DEFAULTS.APP_NAME || 'AITHERAS HR',
  });
}

function htmlToPlainText_(htmlBody) {
  return String(htmlBody || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*li\s*>/gi, '- ')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*\/?(ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function emailButton_(url, label) {
  return (
    '<p><a href="' +
    htmlEscape_(url) +
    '" style="display:inline-block;padding:10px 16px;background:#5b128b;color:#ffffff;text-decoration:none;border-radius:5px;">' +
    htmlEscape_(label) +
    '</a></p>'
  );
}

function getWebAppUrl_() {
  const settings = getSettings_();

  if (settings.WEB_APP_URL) {
    return String(settings.WEB_APP_URL).replace(/\/+$/, '');
  }

  const url = ScriptApp.getService().getUrl();

  if (!url) {
    throw new Error(
      'Deploy the web app before creating live review cycles.'
    );
  }

  return url.replace(/\/+$/, '');
}

/* ============================= DOWNLOAD ================================== */

function getReviewPdf(cycleId, documentType) {
  const email = getCurrentUserEmail_();
  const cycle = findCycle_(cycleId).object;

  const authorized =
    isHrUser_(email) ||
    normalizeEmail_(cycle['Manager Email']) === email ||
    normalizeEmail_(cycle['Employee Email']) === email;

  if (!authorized) {
    throw new Error('You are not authorized to download this review.');
  }

  const type = String(documentType || '').trim();
  if (type !== PR.TYPE.MANAGER && type !== PR.TYPE.SELF) {
    throw new Error(
      'documentType must be Manager Review or Self-Evaluation.'
    );
  }

  const fileId =
    type === PR.TYPE.MANAGER
      ? cycle['Manager Review PDF ID']
      : cycle['Self Evaluation PDF ID'];

  if (!fileId) {
    throw new Error('The final PDF is not available yet.');
  }

  validateAuthoritativeFinalPdfId_(cycleId, type, fileId);

  const blob = DriveApp.getFileById(fileId).getBlob();

  return {
    fileName: blob.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

/* ============================= SHEETS ==================================== */

function getSpreadsheet_() {
  const req = perfGetRequest_();
  if (req && req.cache.spreadsheet !== undefined) {
    return req.cache.spreadsheet;
  }
  const id = PropertiesService.getScriptProperties().getProperty(
    'REVIEW_SPREADSHEET_ID'
  );

  if (!id) {
    throw new Error(
      'Run setupReviewSystem_() before using the app.'
    );
  }

  const ss = SpreadsheetApp.openById(id);
  if (req) req.cache.spreadsheet = ss;
  return ss;
}

function getSettings_() {
  const req = perfGetRequest_();
  if (req && req.cache.settings !== undefined) {
    return req.cache.settings;
  }
  const sheet = getSpreadsheet_().getSheetByName(PR.SHEETS.SETTINGS);
  const started = Date.now();
  const settings = readSettings_(sheet);
  // readSettings_ uses getDataRange; attribute the service latency here.
  perfCountSheetRead_(PR.SHEETS.SETTINGS, Date.now() - started);
  if (req) req.cache.settings = settings;
  return settings;
}

function findCycle_(cycleId) {
  return findObject_(
    PR.SHEETS.CYCLES,
    'Cycle ID',
    cycleId
  );
}

function writeCycle_(rowNumber, cycle) {
  writeObject_(
    PR.SHEETS.CYCLES,
    rowNumber,
    cycle
  );
}

function getAllObjects_(sheetName) {
  const req = perfGetRequest_();
  if (
    req &&
    req.cache.sheets &&
    Object.prototype.hasOwnProperty.call(req.cache.sheets, sheetName)
  ) {
    return req.cache.sheets[sheetName];
  }

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const values = perfTimedSheetValues_(sheet, sheetName);

  if (values.length < 2) {
    if (req && req.cache.sheets) req.cache.sheets[sheetName] = [];
    return [];
  }

  const headers = values[0].map(String);

  const objects = values.slice(1).map(function (row) {
    const object = {};

    headers.forEach(function (header, index) {
      object[header] = row[index];
    });

    return object;
  });

  if (req && req.cache.sheets) req.cache.sheets[sheetName] = objects;
  return objects;
}

function findObject_(sheetName, idHeader, idValue) {
  const objects = getAllObjects_(sheetName);
  for (let i = 0; i < objects.length; i++) {
    if (String(objects[i][idHeader]) === String(idValue)) {
      return {
        rowNumber: i + 2,
        object: objects[i],
      };
    }
  }

  throw new Error('Record not found.');
}

function appendObject_(sheetName, requiredHeaders, object) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  ensureHeaders_(sheet, requiredHeaders);

  const headers = getHeaders_(sheet);

  sheet.appendRow(
    headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(object, header)
        ? object[header]
        : '';
    })
  );
  invalidatePerfSheetCache_(sheetName);
}

function writeObject_(sheetName, rowNumber, object) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const headers = getHeaders_(sheet);

  sheet
    .getRange(rowNumber, 1, 1, headers.length)
    .setValues([
      headers.map(function (header) {
        return Object.prototype.hasOwnProperty.call(object, header)
          ? object[header]
          : '';
      }),
    ]);
  invalidatePerfSheetCache_(sheetName);
}

function audit_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details,
  eventId
) {
  assertReviewAuditSchema_();
  appendObject_(
    PR.SHEETS.AUDIT,
    PR.AUDIT_HEADERS,
    {
      Timestamp: new Date(),
      'Event ID': String(eventId || Utilities.getUuid()),
      'Cycle ID': cycleId,
      Action: action,
      'Actor Email': actorEmail,
      'Previous Status': previousStatus,
      'New Status': newStatus,
      Details: details || '',
    }
  );
}

function buildPendingAuditEvent_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details,
  eventId
) {
  return {
    eventId: String(eventId || Utilities.getUuid()),
    cycleId: String(cycleId || ''),
    action: String(action || ''),
    actorEmail: normalizeEmail_(actorEmail),
    previousStatus: String(previousStatus || ''),
    newStatus: String(newStatus || ''),
    details: details || '',
  };
}

/**
 * Post-commit audit must never overturn an already-written business state.
 * Prefer commitAuditEventOutsideLock_ after releasing the cycle lock.
 * This helper remains for tests and legacy call sites.
 */
function tryAuditAfterCommit_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details,
  eventId
) {
  const event = buildPendingAuditEvent_(
    cycleId,
    action,
    actorEmail,
    previousStatus,
    newStatus,
    details,
    eventId
  );
  try {
    audit_(
      event.cycleId,
      event.action,
      event.actorEmail,
      event.previousStatus,
      event.newStatus,
      event.details,
      event.eventId
    );
    return { ok: true, warning: '', eventId: event.eventId };
  } catch (error) {
    const message = String(
      (error && error.message) || error || 'Audit write failed'
    );
    Logger.log(
      'Post-commit audit failed for ' +
        event.cycleId +
        ' / ' +
        event.action +
        ': ' +
        message
    );
    return {
      ok: false,
      warning:
        'The change was saved, but the audit trail write failed. System Health has been notified.',
      error: message,
      eventId: event.eventId,
      event: event,
    };
  }
}

/**
 * Append audit outside the lifecycle lock. On failure, persist a durable
 * pending-audit recovery row with the deterministic Event ID.
 */
function commitAuditEventOutsideLock_(event) {
  const payload = event || {};
  const eventId = String(
    payload.eventId || Utilities.getUuid()
  );
  try {
    audit_(
      payload.cycleId,
      payload.action,
      payload.actorEmail,
      payload.previousStatus,
      payload.newStatus,
      payload.details,
      eventId
    );
    markPendingAuditComplete_(eventId);
    return { ok: true, warning: '', eventId: eventId };
  } catch (error) {
    const message = String(
      (error && error.message) || error || 'Audit write failed'
    );
    Logger.log(
      'Post-commit audit failed for ' +
        String(payload.cycleId || '') +
        ' / ' +
        String(payload.action || '') +
        ': ' +
        message
    );
    const pendingEvent = {
      eventId: eventId,
      cycleId: payload.cycleId,
      action: payload.action,
      actorEmail: payload.actorEmail,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      details: payload.details,
    };
    const persisted = persistPendingAuditEvent_(pendingEvent, message);
    raisePostCommitAuditAlert_(pendingEvent, message);
    return {
      ok: false,
      warning: persisted
        ? 'The change was saved, but the audit trail write failed. Use System Health → Retry Audit to recover.'
        : 'The change was saved, but the audit trail write failed and the pending-audit recovery row could not be created. Contact HR System Health immediately.',
      error: message,
      eventId: eventId,
      event: pendingEvent,
      pendingPersisted: !!persisted,
    };
  }
}

function ensurePendingAuditSheet_() {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, PR.SHEETS.PENDING_AUDIT);
  ensureHeaders_(sheet, PR.PENDING_AUDIT_HEADERS);
  return sheet;
}

function persistPendingAuditEvent_(event, lastError) {
  try {
    ensurePendingAuditSheet_();
    const existing = findPendingAuditByEventId_(event.eventId);
    const now = new Date();
    if (existing) {
      const location = findObject_(
        PR.SHEETS.PENDING_AUDIT,
        'Event ID',
        event.eventId
      );
      const row = location.object;
      if (String(row.Status) === 'Complete') {
        return row;
      }
      row['Updated At'] = now;
      row['Last Error'] = String(lastError || '');
      row.Status = 'Pending';
      writeObject_(PR.SHEETS.PENDING_AUDIT, location.rowNumber, row);
      return row;
    }
    const created = {
      'Event ID': String(event.eventId),
      'Created At': now,
      'Updated At': now,
      'Cycle ID': String(event.cycleId || ''),
      Action: String(event.action || ''),
      'Actor Email': normalizeEmail_(event.actorEmail),
      'Previous Status': String(event.previousStatus || ''),
      'New Status': String(event.newStatus || ''),
      Details: event.details || '',
      Status: 'Pending',
      'Last Error': String(lastError || ''),
      'Completed At': '',
    };
    appendObject_(
      PR.SHEETS.PENDING_AUDIT,
      PR.PENDING_AUDIT_HEADERS,
      created
    );
    return created;
  } catch (persistError) {
    Logger.log(
      'Pending audit persistence failed: ' +
        String(
          (persistError && persistError.message) || persistError
        )
    );
    return null;
  }
}

function findPendingAuditByEventId_(eventId) {
  const id = String(eventId || '').trim();
  if (!id) return null;
  if (
    !getSpreadsheet_().getSheetByName(PR.SHEETS.PENDING_AUDIT)
  ) {
    return null;
  }
  try {
    return findObject_(PR.SHEETS.PENDING_AUDIT, 'Event ID', id)
      .object;
  } catch (error) {
    return null;
  }
}

function auditEventAlreadyRecorded_(eventId) {
  const id = String(eventId || '').trim();
  if (!id) return false;
  const rows = getAllObjects_(PR.SHEETS.AUDIT);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]['Event ID'] || '') === id) {
      return true;
    }
  }
  return false;
}

function markPendingAuditComplete_(eventId) {
  const existing = findPendingAuditByEventId_(eventId);
  if (!existing) return;
  if (String(existing.Status) === 'Complete') return;
  try {
    const location = findObject_(
      PR.SHEETS.PENDING_AUDIT,
      'Event ID',
      eventId
    );
    const row = location.object;
    row.Status = 'Complete';
    row['Completed At'] = new Date();
    row['Updated At'] = new Date();
    row['Last Error'] = '';
    writeObject_(PR.SHEETS.PENDING_AUDIT, location.rowNumber, row);
  } catch (error) {
    Logger.log(
      'markPendingAuditComplete_ failed: ' +
        String((error && error.message) || error)
    );
  }
}

/**
 * HR-only: retry one durable pending audit by deterministic Event ID.
 * Appends at most once under the script lock.
 */
function retryPendingAudit(eventId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);
  if (!isHrUser_(email)) {
    throw new Error('Only HR may retry missing audit events.');
  }
  const id = String(eventId || '').trim();
  if (!id) {
    throw new Error('Event ID is required.');
  }

  const result = withLock_(function () {
    const pending = findPendingAuditByEventId_(id);
    if (!pending) {
      if (auditEventAlreadyRecorded_(id)) {
        return {
          ok: true,
          alreadyComplete: true,
          eventId: id,
          message:
            'That audit event is already present in the audit log.',
        };
      }
      throw new Error('No pending audit was found for that Event ID.');
    }

    if (
      String(pending.Status) === 'Complete' ||
      auditEventAlreadyRecorded_(id)
    ) {
      markPendingAuditComplete_(id);
      return {
        ok: true,
        alreadyComplete: true,
        eventId: id,
        message:
          'That audit event is already present in the audit log.',
      };
    }

    audit_(
      pending['Cycle ID'],
      pending.Action,
      pending['Actor Email'],
      pending['Previous Status'],
      pending['New Status'],
      pending.Details,
      id
    );
    markPendingAuditComplete_(id);
    return {
      ok: true,
      alreadyComplete: false,
      eventId: id,
      cycleId: String(pending['Cycle ID'] || ''),
      message: 'Missing audit event was written successfully.',
    };
  });

  try {
    clearCachedSystemHealthSummary_();
  } catch (cacheError) {
    // optional
  }
  return result;
}

function listPendingAuditRecoveryItems_() {
  if (
    !getSpreadsheet_().getSheetByName(PR.SHEETS.PENDING_AUDIT)
  ) {
    return [];
  }
  return getAllObjects_(PR.SHEETS.PENDING_AUDIT)
    .filter(function (row) {
      return String(row.Status || '') === 'Pending';
    })
    .map(function (row) {
      return {
        id: 'pending-audit:' + String(row['Event ID'] || ''),
        category: 'audit',
        level: 'Warning',
        cycleId: String(row['Cycle ID'] || ''),
        component: 'Audit',
        title: 'Missing audit event',
        summary:
          String(row.Action || 'Audit event') +
          ' failed to append and can be retried safely.',
        action: 'retryPendingAudit',
        actionLabel: 'Retry Audit',
        actionable: true,
        eventId: String(row['Event ID'] || ''),
        details: {
          eventId: String(row['Event ID'] || ''),
          action: String(row.Action || ''),
          actorEmail: String(row['Actor Email'] || ''),
          previousStatus: String(row['Previous Status'] || ''),
          newStatus: String(row['New Status'] || ''),
          lastError: String(row['Last Error'] || ''),
        },
      };
    });
}

/**
 * Raise a System Alert for a failed post-commit audit. Must run outside
 * withLock_ — upsertSystemAlert_ acquires the script lock.
 */
function raisePostCommitAuditAlert_(eventOrCycleId, warningOrError) {
  let event = eventOrCycleId;
  if (typeof eventOrCycleId === 'string') {
    event = {
      cycleId: eventOrCycleId,
      action: '',
      eventId: '',
    };
  }
  event = event || {};
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        event.cycleId,
        'Audit',
        'post_commit_failure:' + String(event.eventId || 'unknown')
      ),
      cycleId: event.cycleId,
      severity: 'Warning',
      component: 'Audit',
      subject:
        'AITHERAS post-commit audit failure — ' +
        String(event.cycleId || 'unknown'),
      lastError: String(warningOrError || ''),
      details: {
        eventId: String(event.eventId || ''),
        action: String(event.action || ''),
        actorEmail: String(event.actorEmail || ''),
        previousStatus: String(event.previousStatus || ''),
        newStatus: String(event.newStatus || ''),
        details: event.details || '',
        error: String(warningOrError || ''),
        recoveryAction: 'retryPendingAudit',
      },
    });
  } catch (alertError) {
    Logger.log(
      'Post-commit audit System Alert failed: ' +
        String(
          (alertError && alertError.message) || alertError
        )
    );
  }
}

function getActiveAssignments_() {
  return getAllObjects_(PR.SHEETS.ASSIGNMENTS)
    .filter(function (row) {
      return (
        row.Active === true ||
        String(row.Active).toLowerCase() === 'true'
      );
    })
    .map(function (row) {
      return {
        employeeEmail: normalizeEmail_(
          row['Employee Email']
        ),
        employeeName: String(row['Employee Name'] || ''),
        managerEmail: normalizeEmail_(
          row['Manager Email']
        ),
        managerName: String(row['Manager Name'] || ''),
        employeeJobTitle: String(row['Job Title'] || ''),
        departmentProject: String(
          row['Department / Project'] || ''
        ),
        hireDate: formatDate_(row['Hire Date']),
        currentPayRate: (function () {
          const rate = Number(row['Current Pay Rate']);
          return Number.isFinite(rate) && rate > 0
            ? Math.round(rate * 100) / 100
            : null;
        })(),
      };
    });
}

function isHrUser_(email) {
  return getAllObjects_(PR.SHEETS.HR).some(function (row) {
    const active =
      row.Active === true ||
      String(row.Active).toLowerCase() === 'true';

    return (
      active &&
      normalizeEmail_(row.Email) === normalizeEmail_(email)
    );
  });
}

function getHrRecord_(email) {
  const row = getAllObjects_(PR.SHEETS.HR).find(function (item) {
    const active =
      item.Active === true ||
      String(item.Active).toLowerCase() === 'true';

    return (
      active &&
      normalizeEmail_(item.Email) === normalizeEmail_(email)
    );
  });

  if (!row) {
    throw new Error('Active HR record not found.');
  }

  return {
    email: normalizeEmail_(row.Email),
    name: String(row.Name || email),
  };
}

/* ============================= HELPERS =================================== */

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) return [];

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });
}

function ensureHeaders_(sheet, headers) {
  let current = getHeaders_(sheet);

  if (!current.length || current.every(function (value) { return !value; })) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);
    return;
  }

  headers.forEach(function (header) {
    if (!current.includes(header)) {
      sheet
        .getRange(1, sheet.getLastColumn() + 1)
        .setValue(header);
      current.push(header);
    }
  });
}

function readSettings_(sheet) {
  const values = sheet.getDataRange().getValues();
  const output = {};

  for (let row = 1; row < values.length; row++) {
    const key = String(values[row][0] || '').trim();

    if (key) {
      output[key] = String(values[row][1] || '').trim();
    }
  }

  return output;
}

function setSetting_(sheet, key, value) {
  const values = sheet.getDataRange().getValues();

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][0]).trim() === key) {
      sheet.getRange(row + 1, 2).setValue(value);
      return;
    }
  }

  sheet.appendRow([key, value]);
}

function formatSheets_(ss) {
  Object.values(PR.SHEETS).forEach(function (name) {
    const sheet = ss.getSheetByName(name);

    if (!sheet) return;

    const lastColumn = Math.max(sheet.getLastColumn(), 1);

    sheet
      .getRange(1, 1, 1, lastColumn)
      .setFontWeight('bold')
      .setBackground('#5b128b')
      .setFontColor('#ffffff');

    sheet.setFrozenRows(1);

    if (lastColumn) {
      sheet.autoResizeColumns(1, Math.min(lastColumn, 20));
    }
  });

  const hr = ss.getSheetByName(PR.SHEETS.HR);
  const assignments = ss.getSheetByName(
    PR.SHEETS.ASSIGNMENTS
  );

  if (hr && hr.getMaxRows() > 1) {
    const hrActiveCol = findSheetHeaderColumnIndex_(hr, 'Active');
    if (hrActiveCol > 0) {
      hr
        .getRange(2, hrActiveCol, hr.getMaxRows() - 1, 1)
        .insertCheckboxes();
    }
  }

  if (assignments && assignments.getMaxRows() > 1) {
    const activeCol = findSheetHeaderColumnIndex_(
      assignments,
      'Active'
    );
    if (activeCol > 0) {
      assignments
        .getRange(2, activeCol, assignments.getMaxRows() - 1, 1)
        .insertCheckboxes();
    }
  }
}

/**
 * 1-based column index for a header name, or 0 when missing.
 * Pure helper for setup formatting — never hard-code compensation-era columns.
 */
function findSheetHeaderColumnIndex_(sheet, headerName) {
  if (!sheet || sheet.getLastColumn() < 1) return 0;
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const target = String(headerName || '')
    .trim()
    .toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === target) {
      return i + 1;
    }
  }
  return 0;
}

/** Test helper: resolve Active checkbox column from header row values. */
function resolveActiveCheckboxColumnFromHeaders_(headers) {
  const list = headers || [];
  for (let i = 0; i < list.length; i++) {
    if (String(list[i] || '').trim() === 'Active') {
      return i + 1;
    }
  }
  return 0;
}

function protectSheets_(ss) {
  [
    PR.SHEETS.SETTINGS,
    PR.SHEETS.HR,
    PR.SHEETS.ASSIGNMENTS,
    PR.SHEETS.AUDIT,
    PR.SHEETS.PENDING_AUDIT,
  ].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;

    if (
      sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
        .length
    ) {
      return;
    }

    const protection = sheet
      .protect()
      .setDescription(name + ' - HR managed');

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
        'Could not fully protect ' + name + ': ' + error.message
      );
    }
  });
}

function styleInfoTable_(table) {
  for (let row = 0; row < table.getNumRows(); row++) {
    table.getRow(row).getCell(0).setBackgroundColor('#efe7f5');
    table.getRow(row).getCell(0).editAsText().setBold(true);
  }
}

function moveFileToFolder_(fileId, folderId) {
  const file = DriveApp.getFileById(fileId);
  const folder = DriveApp.getFolderById(folderId);

  folder.addFile(file);

  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (error) {}

  return fileId;
}

function maybeInjectSignatureFault_(point, cycleId) {
  const settings = getSettings_();
  const enabled = v31Boolean_(
    settings.ENABLE_FAULT_INJECTION,
    false
  );
  if (!enabled) return;
  if (String(settings.ENVIRONMENT || '') !== 'Sandbox') {
    throw new Error(
      'Signature fault injection is prohibited unless ENVIRONMENT is Sandbox.'
    );
  }
  if (
    String(settings.FAULT_POINT || '') !== String(point) ||
    (settings.FAULT_CYCLE_ID &&
      String(settings.FAULT_CYCLE_ID) !== String(cycleId))
  ) {
    return;
  }
  if (v31Boolean_(settings.FAULT_ONCE, true)) {
    persistAutomationSettings_({
      ENABLE_FAULT_INJECTION: 'false',
      FAULT_POINT: '',
    });
  }
  throw new Error(
    'Sandbox signature fault injected at ' +
      String(point) +
      ' for cycle ' +
      String(cycleId) +
      '.'
  );
}

function saveSignature_(cycleId, role, dataUrl, attemptId) {
  validateSignatureDataUrl_(dataUrl);

  const settings = getSettings_();
  const folder = DriveApp.getFolderById(
    settings.REVIEW_FOLDER_ID
  );
  const fileName = buildSignatureAttemptFileName_(
    cycleId,
    role,
    attemptId
  );
  const existing = [];
  const files = folder.getFilesByName(fileName);
  while (files.hasNext()) {
    existing.push(files.next());
  }

  if (existing.length > 1) {
    throw new Error(
      'Multiple signature artifacts exist for this attempt. HR reconciliation is required.'
    );
  }

  if (existing.length === 1) {
    assertValidSignatureAttemptFile_(
      existing[0],
      cycleId,
      role,
      attemptId,
      settings.REVIEW_FOLDER_ID
    );
    return {
      fileId: existing[0].getId(),
      fileName: fileName,
      role: role,
      attemptId: attemptId,
      origin: 'recovered',
      createdByCurrentAttempt: false,
      recoveredCandidate: true,
      folderId: settings.REVIEW_FOLDER_ID,
    };
  }

  const bytes = Utilities.base64Decode(
    String(dataUrl).split(',')[1]
  );

  const file = folder.createFile(
    Utilities.newBlob(bytes, 'image/png', fileName)
  );
  let provenanceError = '';
  try {
    file.setDescription(
      buildSignatureProvenanceMarker_(
        cycleId,
        role,
        attemptId,
        'created'
      )
    );
  } catch (error) {
    provenanceError = String(error.message || error);
  }
  return {
    fileId: file.getId(),
    fileName: fileName,
    role: role,
    attemptId: attemptId,
    origin: 'created',
    createdByCurrentAttempt: true,
    recoveredCandidate: false,
    folderId: settings.REVIEW_FOLDER_ID,
    provenanceError: provenanceError,
  };
}

function signatureRoleToken_(role) {
  return String(role || '').toUpperCase();
}

function buildSignatureAttemptFileName_(
  cycleId,
  role,
  attemptId
) {
  return (
    'AITHERAS_' +
    String(cycleId) +
    '_' +
    signatureRoleToken_(role) +
    '_SIGNATURE_ATTEMPT_' +
    String(attemptId) +
    '.png'
  );
}

function buildCanonicalSignatureFileName_(cycleId, role) {
  return (
    'AITHERAS_' +
    String(cycleId) +
    '_' +
    signatureRoleToken_(role) +
    '_SIGNATURE.png'
  );
}

function buildLegacySignatureFileName_(cycleId, role) {
  return (
    String(cycleId) +
    ' - Combined_Review_Packet_-_' +
    String(role) +
    '.png'
  );
}

function buildSignatureFileName_(cycleId, label) {
  const role = String(label || '').split(' - ').pop();
  return buildCanonicalSignatureFileName_(cycleId, role);
}

function buildSignatureProvenanceMarker_(
  cycleId,
  role,
  attemptId,
  origin
) {
  return [
    'AITHERAS_SIGNATURE',
    'cycleId=' + String(cycleId),
    'role=' + signatureRoleToken_(role),
    'attemptId=' + String(attemptId || ''),
    'origin=' + String(origin || ''),
  ].join('\n');
}

function parseSignatureProvenance_(description) {
  const lines = String(description || '').split('\n');
  if (lines.length !== 5 || lines[0] !== 'AITHERAS_SIGNATURE') {
    return null;
  }
  const expected = ['cycleId', 'role', 'attemptId', 'origin'];
  const parsed = {};
  for (let index = 0; index < expected.length; index++) {
    const prefix = expected[index] + '=';
    const line = lines[index + 1];
    if (line.indexOf(prefix) !== 0) return null;
    parsed[expected[index]] = line.slice(prefix.length);
  }
  return parsed;
}

function assertValidSignatureAttemptFile_(
  file,
  cycleId,
  role,
  attemptId,
  folderId
) {
  assertValidSignatureFile_(
    file,
    buildSignatureAttemptFileName_(cycleId, role, attemptId),
    folderId
  );
  const marker = buildSignatureProvenanceMarker_(
    cycleId,
    role,
    attemptId,
    'created'
  );
  if (String(file.getDescription() || '') !== marker) {
    throw new Error(
      'Signature artifact provenance marker does not match the current attempt.'
    );
  }
}

function getAllReferencedSignatureFileIds_(cycle) {
  return [
    'Manager Signature File ID',
    'Employee Signature File ID',
    'HR Signature File ID',
    'MGR Manager Signature ID',
    'SELF Manager Signature ID',
    'MGR Employee Signature ID',
    'SELF Employee Signature ID',
    'MGR HR Signature ID',
    'SELF HR Signature ID',
  ]
    .map(function (field) {
      return String(cycle[field] || '');
    })
    .filter(Boolean);
}

function isSafeToTrashSignatureArtifact_(checks) {
  return (
    checks.createdByCurrentAttempt === true &&
    checks.referencedByCycle === false &&
    checks.isWinningFile === false &&
    checks.recoveredCandidate === false &&
    checks.expectedFolder === true &&
    checks.deterministicAttemptName === true &&
    checks.provenanceMarkerMatches === true
  );
}

function persistSignatureRecoveryWarning_(
  cycleId,
  role,
  warning
) {
  return persistSignatureWarning_(
    cycleId,
    role,
    'artifact',
    warning
  );
}

function persistSignatureWarning_(
  cycleId,
  role,
  warningType,
  warning
) {
  withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const fields = getSignatureClaimFields_(role);
    const targetField =
      warningType === 'audit'
        ? fields.auditWarningField
        : fields.artifactWarningField;
    cycle[targetField] = String(warning || '');
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
  });
  safelyRecordSignatureWarningAlert_(
    cycleId,
    role,
    warningType,
    warning
  );
}

function handleSupersededSignatureArtifact_(
  cycleId,
  role,
  losingAttemptId,
  artifact
) {
  try {
    return handleSupersededSignatureArtifactCore_(
      cycleId,
      role,
      losingAttemptId,
      artifact
    );
  } catch (error) {
    const warning =
      'Urgent: a superseded signature artifact could not be inspected. HR must review Drive artifacts.';
    try {
      persistSignatureRecoveryWarning_(cycleId, role, warning);
    } catch (persistError) {}
    try {
      audit_(
        cycleId,
        'Superseded signature artifact handling failed',
        getEffectiveAutomationUserEmail_(),
        role,
        'left-in-place',
        JSON.stringify({
          schemaVersion: 1,
          losingAttemptId: losingAttemptId,
          losingFileId: artifact && artifact.fileId,
          error: String(error.message || error),
          recoveryRecommendation: warning,
        })
      );
    } catch (auditError) {
      try {
        persistSignatureWarning_(
          cycleId,
          role,
          'audit',
          'Superseded artifact handling audit could not be written: ' +
            String(auditError.message || auditError)
        );
      } catch (persistAuditWarningError) {}
    }
    return {
      disposition: 'left-in-place',
      warning: warning,
      error: String(error.message || error),
      checks: {},
    };
  }
}

function handleSupersededSignatureArtifactCore_(
  cycleId,
  role,
  losingAttemptId,
  artifact
) {
  const cycle = findCycle_(cycleId).object;
  const fields = getSignatureClaimFields_(role);
  const winningFileId = String(cycle[fields.fileField] || '');
  const file = DriveApp.getFileById(artifact.fileId);
  const settings = getSettings_();
  const checks = {
    createdByCurrentAttempt:
      artifact.createdByCurrentAttempt === true,
    referencedByCycle:
      getAllReferencedSignatureFileIds_(cycle).indexOf(
        artifact.fileId
      ) >= 0,
    isWinningFile: winningFileId === artifact.fileId,
    recoveredCandidate: artifact.recoveredCandidate === true,
    expectedFolder: isDriveFileInFolder_(
      file,
      settings.REVIEW_FOLDER_ID
    ),
    deterministicAttemptName:
      file.getName() ===
      buildSignatureAttemptFileName_(
        cycleId,
        role,
        losingAttemptId
      ),
    provenanceMarkerMatches:
      String(file.getDescription() || '') ===
      buildSignatureProvenanceMarker_(
        cycleId,
        role,
        losingAttemptId,
        'created'
      ),
  };
  const safe = isSafeToTrashSignatureArtifact_(checks);
  let disposition = '';
  let warning = '';
  let errorText = '';

  if (safe) {
    try {
      audit_(
        cycleId,
        'Superseded signature artifact trash started',
        getEffectiveAutomationUserEmail_(),
        role,
        'trash-pending',
        JSON.stringify({
          schemaVersion: 1,
          losingAttemptId: losingAttemptId,
          fileId: artifact.fileId,
          checks: checks,
        })
      );
      file.setTrashed(true);
      disposition = 'trashed';
    } catch (error) {
      errorText = String(error.message || error);
    }
  }

  if (!disposition) {
    try {
      const recovery = validateSignatureRecoveryFolder_(
        settings.SIGNATURE_RECOVERY_FOLDER_ID,
        settings.REVIEW_FOLDER_ID
      );
      file.moveTo(recovery.folder);
      disposition = 'moved-to-recovery';
      warning =
        'A superseded signature artifact was moved to the HR recovery folder for review.';
    } catch (error) {
      disposition = 'left-in-place';
      errorText = errorText || String(error.message || error);
      warning =
        'Urgent: a superseded signature artifact could not be safely removed or moved. HR must inspect the recovery queue.';
    }
  }

  if (disposition === 'trashed') {
    try {
      audit_(
        cycleId,
        'Superseded signature artifact trash complete',
        getEffectiveAutomationUserEmail_(),
        role,
        'trash-complete',
        JSON.stringify({
          schemaVersion: 1,
          losingAttemptId: losingAttemptId,
          fileId: artifact.fileId,
        })
      );
    } catch (trashAuditError) {
      warning =
        'The superseded artifact was trashed, but the completion audit could not be written.';
      try {
        persistSignatureWarning_(
          cycleId,
          role,
          'audit',
          warning +
            ' ' +
            String(
              trashAuditError.message || trashAuditError
            )
        );
      } catch (persistTrashAuditWarningError) {}
    }
  }

  if (warning) {
    try {
      persistSignatureRecoveryWarning_(cycleId, role, warning);
    } catch (persistError) {
      errorText =
        errorText ||
        'Recovery warning could not be persisted: ' +
          String(persistError.message || persistError);
    }
  }

  try {
    audit_(
      cycleId,
      'Superseded signature artifact disposition',
      getEffectiveAutomationUserEmail_(),
      role,
      disposition,
      JSON.stringify({
        schemaVersion: 1,
        component: role + ' Signature Artifact',
        event: 'superseded-artifact-disposition',
        losingAttemptId: losingAttemptId,
        winningAttemptId: String(
          cycle[fields.winningAttemptField] || ''
        ),
        losingFileId: artifact.fileId,
        winningFileId: winningFileId,
        disposition: disposition,
        error: errorText,
        recoveryRecommendation: warning,
        checks: checks,
      })
    );
  } catch (auditError) {
    warning =
      warning ||
      'Signature artifact disposition completed, but its audit record needs verification.';
    try {
      persistSignatureWarning_(
        cycleId,
        role,
        'audit',
        'Signature artifact disposition audit could not be confirmed: ' +
          String(auditError.message || auditError)
      );
    } catch (persistAuditWarningError) {}
  }

  return {
    disposition: disposition,
    warning: warning,
    error: errorText,
    checks: checks,
  };
}

function finalizeSignatureArtifactName_(cycleId, role, artifact) {
  try {
    const file = DriveApp.getFileById(artifact.fileId);
    file.setName(buildCanonicalSignatureFileName_(cycleId, role));
    file.setDescription(
      buildSignatureProvenanceMarker_(
        cycleId,
        role,
        artifact.attemptId,
        'winner'
      )
    );
    return '';
  } catch (error) {
    const warning =
      'The signature was recorded, but its Drive filename requires cleanup.';
    try {
      persistSignatureRecoveryWarning_(cycleId, role, warning);
    } catch (persistError) {}
    try {
      audit_(
        cycleId,
        'Signature winner rename warning',
        getEffectiveAutomationUserEmail_(),
        role,
        'Signed',
        JSON.stringify({
          schemaVersion: 1,
          fileId: artifact.fileId,
          error: String(error.message || error),
          recoveryRecommendation: warning,
        })
      );
    } catch (auditError) {
      try {
        persistSignatureWarning_(
          cycleId,
          role,
          'audit',
          'Signature winner cleanup audit could not be written: ' +
            String(auditError.message || auditError)
        );
      } catch (persistAuditWarningError) {}
    }
    return warning;
  }
}

/**
 * Recover an existing signature image before writing a replacement.
 * Multiple matches are an HR reconciliation case — never silently pick.
 */
function findExistingSignatureFileId_(folder, fileName) {
  const matches = [];
  const files = folder.getFilesByName(fileName);

  while (files.hasNext()) {
    matches.push(files.next());
  }

  if (matches.length === 1) {
    return matches[0].getId();
  }

  if (matches.length > 1) {
    throw new Error(
      'Multiple signature images named "' +
        fileName +
        '" exist. HR must choose which signature file to keep before retrying.'
    );
  }

  return '';
}

function getUserProfile_(email, isHr) {
  const assignments = getActiveAssignments_();
  const normalized = normalizeEmail_(email);
  const roles = [];
  let displayName = '';

  if (isHr) {
    roles.push(PR.ROLE.HR);
    try {
      displayName = getHrRecord_(email).name;
    } catch (error) {
      displayName = '';
    }
  }

  assignments.forEach(function (assignment) {
    if (
      normalizeEmail_(assignment.employeeEmail) === normalized
    ) {
      if (!roles.includes(PR.ROLE.EMPLOYEE)) {
        roles.push(PR.ROLE.EMPLOYEE);
      }
      displayName = displayName || assignment.employeeName;
    }

    if (
      normalizeEmail_(assignment.managerEmail) === normalized
    ) {
      if (!roles.includes(PR.ROLE.MANAGER)) {
        roles.push(PR.ROLE.MANAGER);
      }
      displayName = displayName || assignment.managerName;
    }
  });

  if (!displayName) {
    displayName = email
      .split('@')[0]
      .split(/[._-]/)
      .map(function (part) {
        return part
          ? part.charAt(0).toUpperCase() + part.slice(1)
          : '';
      })
      .join(' ');
  }

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (part) {
      return part.charAt(0).toUpperCase();
    })
    .join('');

  return {
    email: email,
    displayName: displayName,
    initials: initials || 'AU',
    roles: roles,
    primaryRole: isHr
      ? PR.ROLE.HR
      : roles.includes(PR.ROLE.MANAGER)
      ? PR.ROLE.MANAGER
      : PR.ROLE.EMPLOYEE,
  };
}

function formatDateIso_(value) {
  if (!value) return '';

  return Utilities.formatDate(
    new Date(value),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function toIsoString_(value) {
  if (!value) return '';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toISOString();
}

function getCurrentUserEmail_() {
  const email = normalizeEmail_(
    Session.getActiveUser().getEmail()
  );

  if (!email) {
    throw new Error(
      'Google could not identify your account. Sign in with your AITHERAS Google account.'
    );
  }

  return email;
}

function assertDomain_(email, domain) {
  const normalized = String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');

  if (!normalizeEmail_(email).endsWith('@' + normalized)) {
    throw new Error(
      'Access is restricted to authorized AITHERAS accounts.'
    );
  }
}

function validateSignatureDataUrl_(dataUrl) {
  const value = String(dataUrl || '');

  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) {
    throw new Error('A valid signature is required.');
  }

  if (value.length > 750000) {
    throw new Error('The signature image is too large.');
  }
}

function parseJson_(value, fallback) {
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanText_(value) {
  return String(value == null ? '' : value).trim();
}

function parseDateInput_(value) {
  return new Date(String(value) + 'T12:00:00');
}

function formatDate_(value) {
  if (!value) return '';

  return Utilities.formatDate(
    new Date(value),
    Session.getScriptTimeZone(),
    'MM/dd/yyyy'
  );
}

function formatDateTime_(value) {
  if (!value) return '';

  return Utilities.formatDate(
    new Date(value),
    Session.getScriptTimeZone(),
    'MM/dd/yyyy h:mm a'
  );
}

function uniqueEmails_(emails) {
  const seen = {};

  return emails
    .map(normalizeEmail_)
    .filter(function (email) {
      if (!email || seen[email]) return false;
      seen[email] = true;
      return true;
    });
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function htmlEscape_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex_(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}
