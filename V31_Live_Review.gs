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
 * No Audit write. No locks. No Drive.
 */
function getLiveReviewState(cycleId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  const id = String(cycleId || '').trim();
  if (!id) {
    throw new Error('Cycle ID is required.');
  }

  const cycle = findCycle_(id).object;
  const viewerRole = assertLiveReviewAccess_(cycle, email);
  return buildLiveReviewStatePayload_(cycle, email, viewerRole);
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
    normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email);
  if (!authorized) {
    throw new Error(
      'Only the assigned manager or HR may accelerate signature notifications.'
    );
  }

  if (String(cycle['Status'] || '') !== PR.CYCLE.SIGNATURES) {
    throw new Error(
      'Signature notifications can only be accelerated while the cycle is Awaiting Signatures.'
    );
  }

  const results = [];
  try {
    sendCombinedSignatureEmail_(id, PR.ROLE.MANAGER);
    results.push({ key: 'signatureManager', ok: true });
  } catch (error) {
    results.push({
      key: 'signatureManager',
      ok: false,
      error: String(error.message || error),
    });
  }
  try {
    sendCombinedSignatureEmail_(id, PR.ROLE.EMPLOYEE);
    results.push({ key: 'signatureEmployee', ok: true });
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
 * Pure policy helpers mirrored by Index.html client behavior.
 */
function shouldRestoreLiveReviewDocumentTitle_(isDocumentHidden) {
  return isDocumentHidden !== true;
}

function shouldWarnSignatureReleaseEmailAcceleration_(result) {
  return !(result && result.ok === true);
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
