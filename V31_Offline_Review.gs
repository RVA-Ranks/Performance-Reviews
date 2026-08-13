/**
 * HR Offline / Paper Review Signature Override.
 *
 * Narrow eligibility branch into the EXISTING Awaiting Signatures →
 * Manager/Employee → HR → Finalizing → Complete architecture.
 * Does not fabricate participant ACKs or bypass compensation integrity.
 */

var V31_OFFLINE = Object.freeze({
  MODE_STANDARD: 'Standard',
  MODE_OVERRIDE: 'Offline Review Override',
  CONFIRMATION_TOKEN: 'OFFLINE_REVIEW_OVERRIDE_CONFIRMED',
  AUDIT_ACTION: 'OFFLINE_REVIEW_SIGNATURE_OVERRIDE',
  NOTICE:
    'This review was completed outside the AITHERAS Performance Review Portal. Electronic signatures acknowledge completion and discussion of the offline review materials. The portal record may not reproduce all handwritten or separately maintained review content.',
  CYCLE_HEADERS: [
    'Signature Release Mode',
    'Offline Override At',
    'Offline Override By',
    'Offline Override Reason',
  ],
});

function isOfflineReviewRelease_(cycle) {
  return (
    String((cycle && cycle['Signature Release Mode']) || '').trim() ===
    V31_OFFLINE.MODE_OVERRIDE
  );
}

function buildOfflineReviewDisclosure_(cycle) {
  if (!isOfflineReviewRelease_(cycle)) return '';
  return V31_OFFLINE.NOTICE;
}

/**
 * Insert the employee-safe Offline Review Notice on final Manager/Self PDFs.
 * Does not include override reason, HR notes, or compensation.
 */
function insertOfflineReviewNoticeOnBody_(body, cycle) {
  if (!body) return false;
  const notice = buildOfflineReviewDisclosure_(cycle);
  if (!notice) {
    try {
      body.replaceText('\\{\\{OFFLINE_REVIEW_BLOCK\\}\\}', '');
    } catch (error) {}
    return false;
  }
  try {
    if (body.findText('\\{\\{OFFLINE_REVIEW_BLOCK\\}\\}')) {
      body.replaceText(
        '\\{\\{OFFLINE_REVIEW_BLOCK\\}\\}',
        'Offline Review Notice\n' + notice
      );
      return true;
    }
  } catch (error) {}

  let insertIndex = body.getNumChildren();
  try {
    const found = body.findText('Signatures');
    if (found) {
      const parent = found.getElement().getParent();
      insertIndex = Math.max(0, body.getChildIndex(parent));
    }
  } catch (error) {}

  const heading = body.insertParagraph(insertIndex, 'Offline Review Notice');
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.insertParagraph(insertIndex + 1, notice);
  return true;
}

function assertOfflineReviewDataModelReady_() {
  const ss = getSpreadsheet_();
  const cycles = ss.getSheetByName(PR.SHEETS.CYCLES);
  if (!cycles) {
    throw new Error(
      'ReviewCycles sheet is missing. HR must complete setup before Offline Review Override.'
    );
  }
  const headers = getHeaders_(cycles).map(String);
  const missing = [];
  V31_OFFLINE.CYCLE_HEADERS.forEach(function (header) {
    if (headers.indexOf(String(header)) < 0) missing.push(String(header));
  });
  if (missing.length) {
    throw new Error(
      'Offline Review columns are missing: ' +
        missing.join(', ') +
        '. HR must complete V3.1 data-model setup before continuing.'
    );
  }
}

function validateOfflineReviewOverrideReason_(reason) {
  const text = String(reason || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    throw new Error(
      'A reason is required for Release Signatures — Offline Review Override.'
    );
  }
  return text;
}

function assertOfflineReviewOverrideAuthorized_(email, cycle) {
  const settings = getSettings_();
  assertDomain_(email, settings.ALLOWED_DOMAIN);
  if (!isHrUser_(email)) {
    throw new Error(
      'Only active HR may release signatures via Offline Review Override.'
    );
  }
  if (!cycle) {
    throw new Error('Review cycle not found.');
  }
  return normalizeEmail_(email);
}

function cycleHasAuthoritativeSignatureClaim_(cycle) {
  const idFields = [
    'Manager Signature File ID',
    'Employee Signature File ID',
    'HR Signature File ID',
    'MGR Manager Signature ID',
    'MGR Employee Signature ID',
    'MGR HR Signature ID',
    'SELF Employee Signature ID',
    'SELF Manager Signature ID',
    'SELF HR Signature ID',
  ];
  return idFields.some(function (field) {
    return String((cycle && cycle[field]) || '').trim() !== '';
  });
}

function evaluateOfflineReviewOverrideEligibility_(cycle) {
  const status = String((cycle && cycle['Status']) || '');
  const mode = String((cycle && cycle['Signature Release Mode']) || '').trim();
  const offline = mode === V31_OFFLINE.MODE_OVERRIDE;
  const releasedAt = cycle && cycle['Signatures Released At'];
  const hasReleasedMarker =
    releasedAt !== '' &&
    releasedAt !== null &&
    typeof releasedAt !== 'undefined';

  if (status === PR.CYCLE.CANCELLED) {
    return {
      action: 'reject',
      code: 'CANCELLED',
      message:
        'Cancelled cycles cannot use Offline Review Override.',
    };
  }
  if (status === PR.CYCLE.FINALIZING) {
    return {
      action: 'reject',
      code: 'FINALIZING',
      message:
        'This review is already finalizing. Use existing finalization recovery tools.',
    };
  }
  if (status === PR.CYCLE.COMPLETE) {
    return {
      action: 'reject',
      code: 'COMPLETE',
      message: 'Completed cycles cannot use Offline Review Override.',
    };
  }
  if (status === PR.CYCLE.SIGNATURES) {
    if (offline) {
      return {
        action: 'alreadyReleased',
        code: 'ALREADY_OFFLINE',
        message:
          'Signatures were already released via Offline Review Override. The manager and employee may each sign once, in either order. HR will sign last.',
      };
    }
    return {
      action: 'reject',
      code: 'STANDARD_SIGNATURES',
      message:
        'Signatures are already released. Use existing signature resend or recovery tools instead of Offline Review Override.',
    };
  }
  if (
    status !== PR.CYCLE.OPEN &&
    status !== PR.CYCLE.READY &&
    status !== PR.CYCLE.MEETING
  ) {
    return {
      action: 'reject',
      code: 'STATUS',
      message:
        'Offline Review Override is only available before signatures are released.',
    };
  }
  if (hasReleasedMarker) {
    return {
      action: 'reject',
      code: 'ALREADY_RELEASED',
      message:
        'Signatures were already released for this cycle. Use existing signature tools instead of Offline Review Override.',
    };
  }
  if (cycleHasAuthoritativeSignatureClaim_(cycle)) {
    return {
      action: 'reject',
      code: 'SIGNATURE_EXISTS',
      message:
        'An authoritative signature already exists. Use signature recovery instead of Offline Review Override.',
    };
  }
  return { action: 'allow', code: 'ALLOW', message: '' };
}

function compensationDispositionForOfflineAudit_(cycle) {
  const decision = normalizeCompensationDecision_(
    cycle && cycle['Compensation Decision']
  );
  return {
    complete: !!isV31CompensationComplete_(cycle),
    decision: decision,
    status: String((cycle && cycle['Compensation Status']) || ''),
  };
}

function commitOfflineReviewSignatureRelease_(stored, email, reason, now) {
  const when = now instanceof Date ? now : new Date();
  const actor = normalizeEmail_(email);
  const meeting = parseMeetingJson_(stored);
  requestMeetingReleaseOnMeetingJson_(
    meeting,
    actor,
    when,
    String(stored['Cycle ID'] || '')
  );
  meeting.signatureReleaseMode = V31_OFFLINE.MODE_OVERRIDE;
  stored['Meeting JSON'] = JSON.stringify(meeting);
  stored['Signature Release Mode'] = V31_OFFLINE.MODE_OVERRIDE;
  stored['Offline Override At'] = when;
  stored['Offline Override By'] = actor;
  stored['Offline Override Reason'] = reason;
  applyFirstReleaseReviewSignaturesMutation_(stored, actor, when);
  return stored;
}

function buildOfflineReviewReleaseResult_(cycle, email, extras) {
  const extra = extras || {};
  return {
    ok: true,
    alreadyReleased: extra.alreadyReleased === true,
    cycleId: String((cycle && cycle['Cycle ID']) || ''),
    cycleStatus: String((cycle && cycle['Status']) || ''),
    signatureReleaseMode:
      String((cycle && cycle['Signature Release Mode']) || '') ||
      V31_OFFLINE.MODE_STANDARD,
    liveState: buildLiveReviewStatePayload_(cycle, email, PR.ROLE.HR),
    message: extra.message || '',
  };
}

/**
 * Public HR endpoint. Enters the existing signature workflow without
 * fabricating Manager/Employee release ACKs.
 */
function releaseOfflineReviewForSignatures(cycleId, payload) {
  const email = getCurrentUserEmail_();
  const confirmed =
    payload &&
    payload.confirmed === true &&
    String(payload.confirmationToken || '') === V31_OFFLINE.CONFIRMATION_TOKEN;
  if (!confirmed) {
    throw new Error(
      'Offline Review Override requires explicit confirmation.'
    );
  }
  const reason = validateOfflineReviewOverrideReason_(
    payload && payload.reason
  );

  assertOfflineReviewDataModelReady_();

  const locked = withLock_(function () {
    const location = findCycle_(String(cycleId || ''));
    const stored = location.object;
    assertOfflineReviewOverrideAuthorized_(email, stored);

    const eligibility = evaluateOfflineReviewOverrideEligibility_(stored);
    if (eligibility.action === 'alreadyReleased') {
      return {
        alreadyReleased: true,
        stored: stored,
        pendingAuditEvent: null,
        message: eligibility.message,
      };
    }
    if (eligibility.action !== 'allow') {
      throw new Error(eligibility.message);
    }
    if (!isV31CompensationComplete_(stored)) {
      throw new Error(
        'Compensation must be resolved before Offline Review Override. Open the Compensation Queue or System Health if the record is incomplete or corrupted.'
      );
    }

    const previousStatus = String(stored['Status'] || '');
    const mgrSubmitted =
      String(stored['Manager Review Status'] || '') === PR.DOC.SUBMITTED;
    const selfSubmitted =
      String(stored['Self Evaluation Status'] || '') === PR.DOC.SUBMITTED;
    const meetingOpened = !!stored['Meeting Opened At'];
    const compensation = compensationDispositionForOfflineAudit_(stored);

    commitOfflineReviewSignatureRelease_(stored, email, reason, new Date());
    writeCycle_(location.rowNumber, stored);

    return {
      alreadyReleased: false,
      stored: stored,
      message:
        'Signatures released via Offline Review Override. The manager and employee may now sign electronically.',
      pendingAuditEvent: buildPendingAuditEvent_(
        String(stored['Cycle ID']),
        V31_OFFLINE.AUDIT_ACTION,
        email,
        previousStatus,
        stored['Status'],
        JSON.stringify({
          releaseMode: V31_OFFLINE.MODE_OVERRIDE,
          reason: reason,
          managerReviewSubmitted: mgrSubmitted,
          selfEvaluationSubmitted: selfSubmitted,
          meetingOpened: meetingOpened,
          compensationDecision: compensation.decision,
          compensationStatus: compensation.status,
          compensationComplete: compensation.complete,
          releaseRequestId: parseMeetingJson_(stored).releaseRequestId || '',
          managerAckPresent: false,
          employeeAckPresent: false,
        }),
        'OFFLINE_REVIEW_OVERRIDE:' +
          String(stored['Cycle ID']) +
          ':' +
          toIsoString_(stored['Offline Override At'] || new Date())
      ),
    };
  });

  if (locked.pendingAuditEvent) {
    commitAuditEventOutsideLock_(locked.pendingAuditEvent);
  }

  return buildOfflineReviewReleaseResult_(locked.stored, email, {
    alreadyReleased: locked.alreadyReleased,
    message: locked.message,
  });
}
