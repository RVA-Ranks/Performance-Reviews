/**
 * Lightweight live review handoff (meeting ↔ signatures).
 * Deliberately tiny: no Drive, PDF, compensation, or System Health work.
 */

/**
 * Compact live-state DTO shared by release + polling.
 * Must never include compensation, review answers, PDFs, or recovery data.
 * viewerRole should come from assertLiveReviewAccess_ (includes any active HR).
 */
function buildLiveReviewStatePayload_(cycle, email, viewerRole) {
  const state = getCombinedSignatureState_(cycle);
  const status = String(cycle['Status'] || '');
  const tasks = getSignatureTasks_(cycle, email);
  const meeting = parseMeetingJson_(cycle);
  const releasePending =
    status === PR.CYCLE.MEETING &&
    !!meeting.releaseRequestId &&
    !meeting.sealedAt;
  const missingReleaseAcks = releasePending
    ? missingMeetingReleaseAckRoles_(meeting)
    : [];

  return {
    ok: true,
    cycleId: String(cycle['Cycle ID'] || ''),
    status: status,
    signaturesReleasedAt: formatDateTime_(
      cycle['Signatures Released At']
    ),
    updatedAtIso: toIsoString_(cycle['Updated At']),
    signatureState: {
      managerSigned: !!state.managerSigned,
      employeeSigned: !!state.employeeSigned,
      hrSigned: !!state.hrSigned,
    },
    signatureTaskReady: status === PR.CYCLE.SIGNATURES && tasks.length > 0,
    signatureTasks: tasks,
    viewerRole: String(viewerRole || ''),
    meetingReleasePending: releasePending,
    releaseRequestId: String(meeting.releaseRequestId || ''),
    meetingReleaseRequestedAtIso: String(meeting.releaseRequestedAt || ''),
    meetingLastSavedAtIso: String(meeting.lastSavedAt || ''),
    meetingContentRevision: Number(meeting.contentRevision || 0),
    meetingSealed: !!meeting.sealedAt,
    managerReleaseAcked: hasMeetingReleaseAckForRole_(
      meeting,
      PR.ROLE.MANAGER
    ),
    employeeReleaseAcked: hasMeetingReleaseAckForRole_(
      meeting,
      PR.ROLE.EMPLOYEE
    ),
    missingReleaseAcks: missingReleaseAcks,
    releaseAcksComplete: areMeetingReleaseAcksComplete_(meeting),
  };
}

/**
 * Authorize live-state reads: assigned Manager, assigned Employee, or HR.
 * Prefer direct assignment checks before HR-role lookup.
 */
function assertLiveReviewAccess_(cycle, email) {
  const normalized = normalizeEmail_(email);
  if (normalizeEmail_(cycle['Manager Email']) === normalized) {
    return PR.ROLE.MANAGER;
  }
  if (normalizeEmail_(cycle['Employee Email']) === normalized) {
    return PR.ROLE.EMPLOYEE;
  }
  if (isHrUser_(email)) {
    return PR.ROLE.HR;
  }
  throw new Error(
    'You are not authorized to view live review state for this cycle.'
  );
}

/**
 * Public: tiny live meeting/signature poll endpoint.
 * No Audit write. No locks. No Drive. Uses one-row cycle lookup.
 */
function getLiveReviewState(cycleId) {
  const started = Date.now();
  perfBeginRequest_('getLiveReviewState');
  try {
    const email = getCurrentUserEmail_();
    assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

    const id = String(cycleId || '').trim();
    if (!id) {
      throw new Error('Cycle ID is required.');
    }

    const cycle = findLiveCycleRow_(id).object;
    const viewerRole = assertLiveReviewAccess_(cycle, email);
    const payload = buildLiveReviewStatePayload_(cycle, email, viewerRole);
    perfEndRequest_({
      cycleId: id,
      durationMs: Date.now() - started,
    });
    return payload;
  } catch (error) {
    perfEndRequest_({
      error: String(error.message || error),
      durationMs: Date.now() - started,
    });
    throw error;
  }
}

/**
 * After durable signature release, accelerate Manager + Employee signature
 * request emails through the existing durable workflow outbox.
 * Failure must never roll back release.
 */
function accelerateSignatureReleaseNotifications(cycleId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  const id = String(cycleId || '').trim();
  if (!id) {
    throw new Error('Cycle ID is required.');
  }

  const cycle = findCycle_(id).object;
  const authorized =
    isHrUser_(email) ||
    normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email) ||
    normalizeEmail_(cycle['Employee Email']) === normalizeEmail_(email);
  if (!authorized) {
    throw new Error(
      'Only the assigned manager, employee, or HR may accelerate signature notifications after release.'
    );
  }

  if (String(cycle['Status'] || '') !== PR.CYCLE.SIGNATURES) {
    throw new Error(
      'Signature notifications can only be accelerated while the cycle is Awaiting Signatures.'
    );
  }

  const results = [];
  try {
    const managerResult = sendCombinedSignatureEmail_(
      id,
      PR.ROLE.MANAGER
    );
    const managerOk = isSignatureNotificationAccelerationOk_(managerResult);
    results.push({
      key: 'signatureManager',
      ok: managerOk,
      action: managerResult && managerResult.action,
      reason: managerResult && managerResult.reason,
      error: managerOk
        ? ''
        : String(
            (managerResult &&
              (managerResult.error || managerResult.reason)) ||
              'Signature manager notification did not complete'
          ),
    });
  } catch (error) {
    results.push({
      key: 'signatureManager',
      ok: false,
      error: String(error.message || error),
    });
  }
  try {
    const employeeResult = sendCombinedSignatureEmail_(
      id,
      PR.ROLE.EMPLOYEE
    );
    const employeeOk =
      isSignatureNotificationAccelerationOk_(employeeResult);
    results.push({
      key: 'signatureEmployee',
      ok: employeeOk,
      action: employeeResult && employeeResult.action,
      reason: employeeResult && employeeResult.reason,
      error: employeeOk
        ? ''
        : String(
            (employeeResult &&
              (employeeResult.error || employeeResult.reason)) ||
              'Signature employee notification did not complete'
          ),
    });
  } catch (error) {
    results.push({
      key: 'signatureEmployee',
      ok: false,
      error: String(error.message || error),
    });
  }

  return {
    ok: results.every(function (row) {
      return row.ok;
    }),
    cycleId: id,
    results: results,
    message:
      'Signature notification acceleration finished. Release state is unchanged.',
  };
}

/**
 * Accelerate HR signature-request email after both participants have signed.
 * Must never roll back participant signatures.
 */
function accelerateHrSignatureNotification(cycleId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  const id = String(cycleId || '').trim();
  if (!id) {
    throw new Error('Cycle ID is required.');
  }

  const cycle = findCycle_(id).object;
  assertLiveReviewAccess_(cycle, email);

  if (String(cycle['Status'] || '') !== PR.CYCLE.SIGNATURES) {
    throw new Error(
      'HR signature notification can only be accelerated while Awaiting Signatures.'
    );
  }

  const state = getCombinedSignatureState_(cycle);
  if (!state.managerSigned || !state.employeeSigned) {
    throw new Error(
      'HR signature notification requires both manager and employee signatures.'
    );
  }
  if (state.hrSigned) {
    return {
      ok: true,
      skipped: true,
      cycleId: id,
      message: 'HR has already signed; notification skipped.',
    };
  }

  try {
    const delivery = sendCombinedSignatureEmail_(id, PR.ROLE.HR);
    const notificationOk =
      isSignatureNotificationAccelerationOk_(delivery);
    return {
      ok: notificationOk,
      cycleId: id,
      action: delivery && delivery.action,
      reason: delivery && delivery.reason,
      error: notificationOk
        ? ''
        : String(
            (delivery && (delivery.error || delivery.reason)) ||
              'HR signature notification did not complete'
          ),
      message: notificationOk
        ? 'HR signature notification accelerated.'
        : 'HR signature notification is pending in the durable workflow queue and may require HR recovery.',
    };
  } catch (error) {
    return {
      ok: false,
      cycleId: id,
      message:
        'HR signature notification is pending in the durable workflow queue and may require HR recovery.',
      error: String(error.message || error),
    };
  }
}

/**
 * Pure policy helpers mirrored by Index.html client behavior.
 */
function shouldRestoreLiveReviewDocumentTitle_(isDocumentHidden) {
  return isDocumentHidden !== true;
}

function shouldWarnSignatureReleaseEmailAcceleration_(result) {
  return !(result && result.ok === true);
}

/**
 * Pure policy: only the HR signature leader may kick finalization.
 * Manager/Employee Finalizing clients must poll only.
 */
function shouldKickFinalizationContinuationAsLeader_(options) {
  return !!(options && options.asLeader);
}

/**
 * Pure monotonic guard: older updatedAtIso must not overwrite newer client state.
 */
function isLiveReviewStateStale_(incomingUpdatedAtIso, currentUpdatedAtIso) {
  const previous = String(currentUpdatedAtIso || '');
  const next = String(incomingUpdatedAtIso || '');
  if (!previous || !next) return false;
  const nextMs = Date.parse(next);
  const prevMs = Date.parse(previous);
  if (!isFinite(nextMs) || !isFinite(prevMs)) return false;
  return nextMs < prevMs;
}

/**
 * Pure helper for tests: live payload keys must stay allow-listed.
 */
function liveReviewStatePayloadIsSafe_(payload) {
  const allowed = {
    ok: true,
    cycleId: true,
    status: true,
    signaturesReleasedAt: true,
    updatedAtIso: true,
    signatureState: true,
    signatureTaskReady: true,
    signatureTasks: true,
    viewerRole: true,
    message: true,
    meetingReleasePending: true,
    meetingReleaseRequestedAtIso: true,
    meetingLastSavedAtIso: true,
    meetingContentRevision: true,
    meetingSealed: true,
    releaseRequestId: true,
    managerReleaseAcked: true,
    employeeReleaseAcked: true,
    missingReleaseAcks: true,
    releaseAcksComplete: true,
    alreadyReleased: true,
    releasePending: true,
    syncRemainingMs: true,
    auditWarning: true,
    sealedNow: true,
  };
  const value = payload || {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    if (!allowed[keys[i]]) return false;
  }
  if (value.signatureState) {
    const stateKeys = Object.keys(value.signatureState);
    for (let j = 0; j < stateKeys.length; j++) {
      if (
        stateKeys[j] !== 'managerSigned' &&
        stateKeys[j] !== 'employeeSigned' &&
        stateKeys[j] !== 'hrSigned'
      ) {
        return false;
      }
    }
  }
  const tasks = value.signatureTasks || [];
  for (let t = 0; t < tasks.length; t++) {
    const taskKeys = Object.keys(tasks[t] || {});
    for (let k = 0; k < taskKeys.length; k++) {
      if (taskKeys[k] !== 'role' && taskKeys[k] !== 'documentType') {
        return false;
      }
    }
  }
  return true;
}
