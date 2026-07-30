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

const PR = Object.freeze({
  SHEETS: {
    SETTINGS: 'ReviewSettings',
    HR: 'ReviewHRUsers',
    ASSIGNMENTS: 'EmployeeAssignments',
    CYCLES: 'ReviewCycles',
    AUDIT: 'ReviewAuditLog',
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
    'Manager Review PDF ID',
    'Self Evaluation PDF ID',
    'Completed At',
  ],

  AUDIT_HEADERS: [
    'Timestamp',
    'Cycle ID',
    'Action',
    'Actor Email',
    'Previous Status',
    'New Status',
    'Details',
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

function setupReviewSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Create a blank Google Sheet, open Extensions → Apps Script, and run setupReviewSystem() from that bound project.'
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
  ensureHeaders_(audit, PR.AUDIT_HEADERS);

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
  template.initialCycleId =
    (e && e.parameter && e.parameter.cycleId) || '';
  template.initialAction =
    (e && e.parameter && e.parameter.action) || '';

  return template
    .evaluate()
    .setTitle('AITHERAS Performance Reviews')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ============================= BOOTSTRAP ================================= */

function getReviewBootstrapData(initialCycleId) {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();

  assertDomain_(email, settings.ALLOWED_DOMAIN);

  const isHr = isHrUser_(email);
  const cycles = listVisibleCycles_(email, isHr);

  return {
    currentUserEmail: email,
    isHr: isHr,
    user: getUserProfile_(email, isHr),
    appName: settings.APP_NAME,
    autosaveDelaySeconds:
      Math.max(Number(settings.AUTOSAVE_DELAY_SECONDS || 5), 2),
    factors: PR.FACTORS,
    ratings: PR.RATINGS,
    assignments: isHr ? getActiveAssignments_() : [],
    cycles: cycles,
    v31: getV31BootstrapData_(email, isHr),
    selectedCycle: initialCycleId
      ? getCycleView_(initialCycleId, email, isHr)
      : null,
  };
}

function getReviewCycle(cycleId) {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();

  assertDomain_(email, settings.ALLOWED_DOMAIN);

  return {
    cycle: getCycleView_(cycleId, email, isHrUser_(email)),
  };
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

    audit_(
      cycleId,
      'Review cycle created',
      email,
      '',
      PR.CYCLE.OPEN,
      JSON.stringify({
        employeeEmail: clean.employeeEmail,
        managerEmail: clean.managerEmail,
      })
    );

    return created;
  });

  // External Calendar/Mail must not hold the global script lock.
  launchReviewCycleCommunications_(row, false);

  return {
    ok: true,
    cycleId: cycleId,
    message:
      'The review cycle was created, HR and both participants were notified, and one shared calendar event was added.',
  };
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
  return withLock_(function () {
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

    if (source !== 'autosave') {
      audit_(
        cycleId,
        type +
          (submit ? ' submitted and sealed' : ' draft saved'),
        email,
        previousStatus,
        newStatus,
        ''
      );
    }

    if (
      submit &&
      String(cycle['Status']) === PR.CYCLE.READY
    ) {
      sendReadyForMeetingEmail_(cycle);
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
    };
  });
}

function startReviewMeeting(cycleId) {
  const email = getCurrentUserEmail_();
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

    if (String(stored['Status']) !== PR.CYCLE.READY) {
      throw new Error(
        'Both reviews must be submitted before the meeting can be opened.'
      );
    }

    stored['Status'] = PR.CYCLE.MEETING;
    stored['Meeting Opened At'] = new Date();
    stored['Meeting Opened By'] = email;
    stored['Updated At'] = new Date();

    writeCycle_(location.rowNumber, stored);

    audit_(
      cycleId,
      'Review meeting opened',
      email,
      PR.CYCLE.READY,
      PR.CYCLE.MEETING,
      ''
    );

    return stored;
  });

  sendMeetingOpenedEmails_(cycle);

  return {
    ok: true,
    message:
      'The meeting is open. Both reviews are now visible to the manager and employee.',
  };
}

function saveMeetingOutcomes(cycleId, payload) {
  return saveMeetingOutcomes_(cycleId, payload, false);
}

function autosaveMeetingOutcomes(cycleId, payload) {
  return saveMeetingOutcomes_(cycleId, payload, true);
}

function saveMeetingOutcomes_(cycleId, payload, isAutosave) {
  return withLock_(function () {
    const email = getCurrentUserEmail_();
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (String(cycle['Status']) !== PR.CYCLE.MEETING) {
      throw new Error(
        'Meeting outcomes may only be edited while the review meeting is open.'
      );
    }

    const isHr = isHrUser_(email);
    const isManager =
      normalizeEmail_(cycle['Manager Email']) === email;
    const isEmployee =
      normalizeEmail_(cycle['Employee Email']) === email;

    if (!isHr && !isManager && !isEmployee) {
      throw new Error('You are not authorized to update this cycle.');
    }

    const meeting = parseJson_(
      cycle['Meeting JSON'],
      emptyMeeting_()
    );

    if (isHr || isManager) {
      meeting.managerFinalComments = cleanText_(
        payload.managerFinalComments
      );
      meeting.developmentGoals = cleanText_(
        payload.developmentGoals
      );
      meeting.actionSteps = cleanText_(payload.actionSteps);
    }

    if (isHr || isEmployee) {
      meeting.employeeComments = cleanText_(
        payload.employeeComments
      );
    }

    const now = new Date();
    meeting.lastSavedAt = now.toISOString();
    cycle['Meeting JSON'] = JSON.stringify(meeting);
    cycle['Updated At'] = now;

    writeCycle_(location.rowNumber, cycle);

    if (!isAutosave) {
      audit_(
        cycleId,
        'Meeting outcomes updated',
        email,
        PR.CYCLE.MEETING,
        PR.CYCLE.MEETING,
        ''
      );
    }

    return {
      ok: true,
      savedAt: formatDateTime_(now),
      savedAtIso: now.toISOString(),
      message: isAutosave
        ? 'Meeting notes autosaved.'
        : 'Meeting outcomes saved.',
    };
  });
}

function releaseReviewSignatures(cycleId) {
  const email = getCurrentUserEmail_();
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

    if (String(stored['Status']) !== PR.CYCLE.MEETING) {
      throw new Error(
        'The review meeting must be open before signatures are released.'
      );
    }

    if (!isV31CompensationComplete_(stored)) {
      throw new Error(
        'Record the compensation decision before releasing the review packet for signature.'
      );
    }

    clearCombinedSignatureFields_(stored);

    stored['Status'] = PR.CYCLE.SIGNATURES;
    stored['Manager Review Status'] =
      PR.DOC.PENDING_PARTICIPANTS;
    stored['Self Evaluation Status'] =
      PR.DOC.PENDING_PARTICIPANTS;
    stored['Signatures Released At'] = new Date();
    stored['Signatures Released By'] = email;
    stored['Updated At'] = new Date();

    writeCycle_(location.rowNumber, stored);

    audit_(
      cycleId,
      'Review packet released for combined signatures',
      email,
      PR.CYCLE.MEETING,
      PR.CYCLE.SIGNATURES,
      ''
    );

    return stored;
  });

  sendCombinedSignatureEmail_(cycle, PR.ROLE.MANAGER);
  sendCombinedSignatureEmail_(cycle, PR.ROLE.EMPLOYEE);

  return {
    ok: true,
    message:
      'The review packet was released. The manager and employee may each sign once, in either order. HR will sign last.',
  };
}

/**
 * Run once after installing V2 if a test cycle was already in the signature
 * stage. Existing manager or employee signatures are copied to both documents.
 */
function upgradeToSingleReviewSignatureWorkflow() {
  return withLock_(function () {
    const cycles = getAllObjects_(PR.SHEETS.CYCLES);
    let updated = 0;

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
        sendCombinedSignatureEmail_(cycle, PR.ROLE.MANAGER);
      }

      if (!state.employeeSigned) {
        sendCombinedSignatureEmail_(cycle, PR.ROLE.EMPLOYEE);
      }

      if (
        state.managerSigned &&
        state.employeeSigned &&
        !state.hrSigned
      ) {
        sendCombinedSignatureEmail_(cycle, PR.ROLE.HR);
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

    SpreadsheetApp.getUi().alert(
      'Single-signature workflow upgrade complete.\n\n' +
        'Cycles updated: ' +
        updated
    );
  });
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
    const cycle = location.object;

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

    return { role: role, cycle: cycle };
  });

  // Drive write happens outside the global lock.
  const signatureId = saveSignature_(
    cycleId,
    'Combined Review Packet - ' + claim.role,
    signatureDataUrl
  );

  const signed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const now = new Date();
    const state = getCombinedSignatureState_(cycle);

    if (String(cycle['Status']) !== PR.CYCLE.SIGNATURES) {
      throw new Error(
        'This review cycle is not currently awaiting signatures.'
      );
    }

    if (claim.role === PR.ROLE.MANAGER) {
      if (state.managerSigned) {
        return {
          role: claim.role,
          cycle: cycle,
          updatedState: state,
          alreadySigned: true,
        };
      }

      cycle['MGR Manager Signature ID'] = signatureId;
      cycle['MGR Manager Signed At'] = now;
      cycle['SELF Manager Signature ID'] = signatureId;
      cycle['SELF Manager Signed At'] = now;
    } else if (claim.role === PR.ROLE.EMPLOYEE) {
      if (state.employeeSigned) {
        return {
          role: claim.role,
          cycle: cycle,
          updatedState: state,
          alreadySigned: true,
        };
      }

      cycle['MGR Employee Signature ID'] = signatureId;
      cycle['MGR Employee Signed At'] = now;
      cycle['SELF Employee Signature ID'] = signatureId;
      cycle['SELF Employee Signed At'] = now;
    } else {
      if (state.hrSigned) {
        return {
          role: claim.role,
          cycle: cycle,
          updatedState: state,
          alreadySigned: true,
        };
      }

      if (!state.managerSigned || !state.employeeSigned) {
        throw new Error(
          'HR may sign only after both the manager and employee have signed.'
        );
      }

      cycle['MGR HR Signature ID'] = signatureId;
      cycle['MGR HR Signed At'] = now;
      cycle['SELF HR Signature ID'] = signatureId;
      cycle['SELF HR Signed At'] = now;
    }

    updateCombinedSignatureStatuses_(cycle);
    cycle['Updated At'] = now;

    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    audit_(
      cycleId,
      'Both review documents signed by ' + claim.role,
      email,
      PR.CYCLE.SIGNATURES,
      String(cycle['Status']),
      ''
    );

    return {
      role: claim.role,
      cycle: cycle,
      updatedState: getCombinedSignatureState_(cycle),
      alreadySigned: false,
    };
  });

  if (
    !signed.alreadySigned &&
    signed.role !== PR.ROLE.HR &&
    signed.updatedState.managerSigned &&
    signed.updatedState.employeeSigned
  ) {
    sendCombinedSignatureEmail_(signed.cycle, PR.ROLE.HR);
  }

  if (signed.role === PR.ROLE.HR) {
    const finalizeResult = finalizeReviewCycle_(cycleId);

    return {
      ok: true,
      message: finalizeResult.message,
      finalization: finalizeResult,
    };
  }

  return {
    ok: true,
    message:
      signed.role +
      ' signature recorded for both review documents.' +
      (signed.updatedState.managerSigned &&
      signed.updatedState.employeeSigned
        ? ' HR has been notified to sign last.'
        : ' The other participant may now sign from the same review cycle.'),
  };
}

function getCombinedSignatureState_(cycle) {
  return {
    managerSigned:
      !!cycle['MGR Manager Signature ID'] &&
      !!cycle['SELF Manager Signature ID'],
    employeeSigned:
      !!cycle['MGR Employee Signature ID'] &&
      !!cycle['SELF Employee Signature ID'],
    hrSigned:
      !!cycle['MGR HR Signature ID'] &&
      !!cycle['SELF HR Signature ID'],
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
}

function consolidateExistingParticipantSignatures_(cycle) {
  const managerSignature =
    cycle['MGR Manager Signature ID'] ||
    cycle['SELF Manager Signature ID'];
  const managerSignedAt =
    cycle['MGR Manager Signed At'] ||
    cycle['SELF Manager Signed At'];

  if (managerSignature) {
    cycle['MGR Manager Signature ID'] = managerSignature;
    cycle['SELF Manager Signature ID'] = managerSignature;
    cycle['MGR Manager Signed At'] = managerSignedAt;
    cycle['SELF Manager Signed At'] = managerSignedAt;
  }

  const employeeSignature =
    cycle['MGR Employee Signature ID'] ||
    cycle['SELF Employee Signature ID'];
  const employeeSignedAt =
    cycle['MGR Employee Signed At'] ||
    cycle['SELF Employee Signed At'];

  if (employeeSignature) {
    cycle['MGR Employee Signature ID'] = employeeSignature;
    cycle['SELF Employee Signature ID'] = employeeSignature;
    cycle['MGR Employee Signed At'] = employeeSignedAt;
    cycle['SELF Employee Signed At'] = employeeSignedAt;
  }

  // HR is considered complete only if HR had already signed both documents.
  if (
    cycle['MGR HR Signature ID'] &&
    cycle['SELF HR Signature ID']
  ) {
    const hrSignature =
      cycle['MGR HR Signature ID'] ||
      cycle['SELF HR Signature ID'];
    const hrSignedAt =
      cycle['MGR HR Signed At'] ||
      cycle['SELF HR Signed At'];

    cycle['MGR HR Signature ID'] = hrSignature;
    cycle['SELF HR Signature ID'] = hrSignature;
    cycle['MGR HR Signed At'] = hrSignedAt;
    cycle['SELF HR Signed At'] = hrSignedAt;
  }
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
  return getAllObjects_(PR.SHEETS.CYCLES)
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
        v31: getV31CycleData_(cycle, email, isHr),
        updatedAt: formatDateTime_(cycle['Updated At']),
        updatedAtIso: toIsoString_(cycle['Updated At']),
      };
    })
    .sort(function (a, b) {
      return new Date(b.updatedAtIso) - new Date(a.updatedAtIso);
    });
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
          'overallRating',
          'overallComments',
          'areasForImprovement',
          'actionSteps',
          'supervisorComments',
        ]
      : [
          'overallRating',
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

  if (!cleanText_(review.overallRating)) {
    blocking++;
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

  return clean;
}

function validateManagerReview_(payload, submitting) {
  return {
    ratings: validateRatings_(payload.ratings, submitting),
    overallRating: normalizeRating_(payload.overallRating),
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
  return {
    ratings: validateRatings_(payload.ratings, submitting),
    overallRating: normalizeRating_(payload.overallRating),
    overallComments: cleanText_(payload.overallComments),
    keyAccomplishments: cleanText_(payload.keyAccomplishments),
    areasForGrowth: cleanText_(payload.areasForGrowth),
    goalsForNextPeriod: cleanText_(payload.goalsForNextPeriod),
    supportNeeded: cleanText_(payload.supportNeeded),
    submittedAt: cleanText_(payload.submittedAt),
  };
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

function emptyMeeting_() {
  return {
    managerFinalComments: '',
    developmentGoals: '',
    actionSteps: '',
    employeeComments: '',
    lastSavedAt: '',
  };
}

function updateCycleReadiness_(cycle) {
  if (
    String(cycle['Manager Review Status']) === PR.DOC.SUBMITTED &&
    String(cycle['Self Evaluation Status']) === PR.DOC.SUBMITTED &&
    String(cycle['Status']) === PR.CYCLE.OPEN
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
function finalizeReviewCycle_(cycleId, options) {
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

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry review finalization.'
    );
  }

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
}

function ensureFinalPdfComponent_(
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
function buildReviewPdfFileName_(cycleId, documentType) {
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
function findExistingReviewPdfId_(cycleId, documentType) {
  const settings = getSettings_();
  const folder = DriveApp.getFolderById(
    settings.REVIEW_FOLDER_ID
  );
  const wanted = buildReviewPdfFileName_(
    cycleId,
    documentType
  );
  const matches = [];
  const files = folder.getFilesByName(wanted);

  while (files.hasNext()) {
    matches.push(files.next());
  }

  if (matches.length === 1) {
    return matches[0].getId();
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

function ensureFinalDistribution_(cycleId, allowUnknownResend) {
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

    cycle['Final Distribution Status'] = V31.DELIVERY.SENDING;
    cycle['Final Distribution Started At'] = new Date();
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return { skip: false, cycle: cycle };
  });

  if (claim.skip) {
    return;
  }

  try {
    sendCompletedPacket_(claim.cycle);

    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
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
  return {
    managerPdf:
      String(cycle['Manager PDF Status'] || '') ||
      (cycle['Manager Review PDF ID']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING),
    selfPdf:
      String(cycle['Self PDF Status'] || '') ||
      (cycle['Self Evaluation PDF ID']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING),
    distribution: String(
      cycle['Final Distribution Status'] || V31.DELIVERY.PENDING
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
      'Overall Rating: {{MGR_OVERALL_RATING}}\n\n{{MGR_OVERALL_COMMENTS}}'
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
      'Overall Rating: {{SELF_OVERALL_RATING}}\n\n{{SELF_OVERALL_COMMENTS}}'
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

function sendMeetingOpenedEmails_(cycle) {
  const url =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=meeting';

  sendHtmlEmail_(
    uniqueEmails_([
      cycle['Manager Email'],
      cycle['Employee Email'],
      cycle['HR Email'],
    ]).join(','),
    'Review meeting opened: ' + cycle['Employee Name'],
    '<p>The review meeting has been opened.</p><p>The manager review and self-evaluation are now visible to both participants.</p>' +
      emailButton_(url, 'Open Review Meeting')
  );
}

function sendCombinedSignatureEmail_(cycle, role) {
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

function sendCompletedPacket_(cycle) {
  const htmlBody =
    '<p>The performance review cycle for <strong>' +
    htmlEscape_(cycle['Employee Name']) +
    '</strong> is complete.</p><p>The signed manager review and employee self-evaluation are attached.</p>';

  MailApp.sendEmail({
    to: uniqueEmails_([
      cycle['Manager Email'],
      cycle['Employee Email'],
      cycle['HR Email'],
    ]).join(','),
    subject:
      'Completed performance review: ' +
      cycle['Employee Name'],
    body: htmlToPlainText_(htmlBody),
    htmlBody: htmlBody,
    attachments: [
      DriveApp.getFileById(
        cycle['Manager Review PDF ID']
      ).getBlob(),
      DriveApp.getFileById(
        cycle['Self Evaluation PDF ID']
      ).getBlob(),
    ],
    name: PR.SETTINGS_DEFAULTS.APP_NAME || 'AITHERAS HR',
  });

  audit_(
    cycle['Cycle ID'],
    'Completed review packet emailed',
    cycle['HR Email'],
    PR.CYCLE.FINALIZING,
    PR.CYCLE.FINALIZING,
    ''
  );
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

  const fileId =
    documentType === PR.TYPE.MANAGER
      ? cycle['Manager Review PDF ID']
      : cycle['Self Evaluation PDF ID'];

  if (!fileId) {
    throw new Error('The final PDF is not available yet.');
  }

  const blob = DriveApp.getFileById(fileId).getBlob();

  return {
    fileName: blob.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

/* ============================= SHEETS ==================================== */

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(
    'REVIEW_SPREADSHEET_ID'
  );

  if (!id) {
    throw new Error(
      'Run setupReviewSystem() before using the app.'
    );
  }

  return SpreadsheetApp.openById(id);
}

function getSettings_() {
  return readSettings_(
    getSpreadsheet_().getSheetByName(PR.SHEETS.SETTINGS)
  );
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
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(String);

  return values.slice(1).map(function (row) {
    const object = {};

    headers.forEach(function (header, index) {
      object[header] = row[index];
    });

    return object;
  });
}

function findObject_(sheetName, idHeader, idValue) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIndex = headers.indexOf(idHeader);

  for (let row = 1; row < values.length; row++) {
    if (String(values[row][idIndex]) === String(idValue)) {
      const object = {};

      headers.forEach(function (header, index) {
        object[header] = values[row][index];
      });

      return {
        rowNumber: row + 1,
        object: object,
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
}

function audit_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details
) {
  appendObject_(
    PR.SHEETS.AUDIT,
    PR.AUDIT_HEADERS,
    {
      Timestamp: new Date(),
      'Cycle ID': cycleId,
      Action: action,
      'Actor Email': actorEmail,
      'Previous Status': previousStatus,
      'New Status': newStatus,
      Details: details || '',
    }
  );
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

  if (hr.getMaxRows() > 1) {
    hr
      .getRange(2, 3, hr.getMaxRows() - 1, 1)
      .insertCheckboxes();
  }

  if (assignments.getMaxRows() > 1) {
    assignments
      .getRange(2, 8, assignments.getMaxRows() - 1, 1)
      .insertCheckboxes();
  }
}

function protectSheets_(ss) {
  [
    PR.SHEETS.SETTINGS,
    PR.SHEETS.HR,
    PR.SHEETS.ASSIGNMENTS,
    PR.SHEETS.AUDIT,
  ].forEach(function (name) {
    const sheet = ss.getSheetByName(name);

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

function saveSignature_(cycleId, label, dataUrl) {
  validateSignatureDataUrl_(dataUrl);

  const settings = getSettings_();
  const folder = DriveApp.getFolderById(
    settings.REVIEW_FOLDER_ID
  );
  const fileName = buildSignatureFileName_(cycleId, label);
  const recoveredId = findExistingSignatureFileId_(
    folder,
    fileName
  );

  if (recoveredId) {
    return recoveredId;
  }

  const bytes = Utilities.base64Decode(
    String(dataUrl).split(',')[1]
  );

  return folder
    .createFile(
      Utilities.newBlob(bytes, 'image/png', fileName)
    )
    .getId();
}

/**
 * Deterministic signature image name used for orphan recovery.
 */
function buildSignatureFileName_(cycleId, label) {
  return (
    String(cycleId) +
    ' - ' +
    String(label).replace(/[^A-Za-z0-9_-]/g, '_') +
    '.png'
  );
}

/**
 * Recover an existing signature image before writing a replacement.
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
    // Prefer the most recently updated artifact and leave extras for
    // HR cleanup rather than blocking the signer.
    matches.sort(function (left, right) {
      return (
        right.getLastUpdated().getTime() -
        left.getLastUpdated().getTime()
      );
    });

    return matches[0].getId();
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
