/**
 * Pre-meeting Reopen for Editing.
 *
 * Lets a participant return their own submitted evaluation to Draft while
 * the review is still in private preparation. Meeting Open is the hard cutoff.
 * Does not create a new lifecycle, fabricate ACKs, or mutate compensation.
 */

var V31_REOPEN = Object.freeze({
  CONFIRMATION_TOKEN: 'REVIEW_REOPEN_CONFIRMED',
  AUDIT_ACTION: 'REVIEW_REOPENED',
  SHEET: 'ReviewRevisionHistory',
  HEADERS: [
    'Revision ID',
    'Cycle ID',
    'Review Type',
    'Revision Number',
    'Submitted JSON',
    'Submitted At',
    'Reopened At',
    'Reopened By',
    'Reopen Reason',
    'Resubmitted At',
  ],
});

function normalizeReopenReviewType_(reviewType) {
  const raw = String(reviewType || '')
    .trim()
    .toLowerCase();
  if (raw === 'manager' || raw === String(PR.TYPE.MANAGER).toLowerCase()) {
    return { key: 'manager', label: PR.TYPE.MANAGER };
  }
  if (
    raw === 'self' ||
    raw === 'employee' ||
    raw === String(PR.TYPE.SELF).toLowerCase()
  ) {
    return { key: 'self', label: PR.TYPE.SELF };
  }
  throw new Error('Unsupported review type.');
}

function reopenDocumentFields_(reviewType) {
  const type = normalizeReopenReviewType_(reviewType);
  if (type.key === 'manager') {
    return {
      key: 'manager',
      label: PR.TYPE.MANAGER,
      statusField: 'Manager Review Status',
      jsonField: 'Manager Review JSON',
      authorField: 'Manager Email',
    };
  }
  return {
    key: 'self',
    label: PR.TYPE.SELF,
    statusField: 'Self Evaluation Status',
    jsonField: 'Self Evaluation JSON',
    authorField: 'Employee Email',
  };
}

function hasMeetingOpenedMarker_(cycle) {
  const opened = cycle && cycle['Meeting Opened At'];
  return opened !== '' && opened !== null && typeof opened !== 'undefined';
}

function isPreMeetingPreparationStage_(cycle) {
  const status = String((cycle && cycle['Status']) || '');
  return (
    (status === PR.CYCLE.OPEN || status === PR.CYCLE.READY) &&
    !hasMeetingOpenedMarker_(cycle)
  );
}

function compensationRecommendationAlreadyExists_(cycle) {
  const decision = normalizeCompensationDecision_(
    cycle && cycle['Compensation Decision']
  );
  return (
    decision === V31.COMPENSATION.ADJUSTMENT ||
    decision === V31.COMPENSATION.NONE
  );
}

function ensureReviewRevisionHistoryDataModel_() {
  const ss = getSpreadsheet_();
  const sheet =
    ss.getSheetByName(V31_REOPEN.SHEET) || ss.insertSheet(V31_REOPEN.SHEET);
  ensureHeaders_(sheet, V31_REOPEN.HEADERS);
  formatSingleSheet_(sheet);
  protectV31Sheet_(sheet, V31_REOPEN.SHEET + ' - HR managed');
  return sheet;
}

function assertReviewRevisionHistoryReady_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(V31_REOPEN.SHEET);
  if (!sheet) {
    throw new Error(
      'ReviewRevisionHistory is missing. HR must complete V3.1 data-model setup before reopening a submitted review.'
    );
  }
  const headers = getHeaders_(sheet).map(String);
  const missing = [];
  V31_REOPEN.HEADERS.forEach(function (header) {
    if (headers.indexOf(String(header)) < 0) missing.push(String(header));
  });
  if (missing.length) {
    throw new Error(
      'ReviewRevisionHistory columns are missing: ' +
        missing.join(', ') +
        '. HR must complete V3.1 data-model setup before continuing.'
    );
  }
}

function listReviewRevisionHistory_(cycleId, reviewType) {
  const wantedCycle = String(cycleId || '');
  const wantedType = reopenDocumentFields_(reviewType).label;
  return getAllObjects_(V31_REOPEN.SHEET).filter(function (row) {
    return (
      String(row['Cycle ID'] || '') === wantedCycle &&
      String(row['Review Type'] || '') === wantedType
    );
  });
}

function nextReviewRevisionNumber_(cycleId, reviewType) {
  let max = 0;
  listReviewRevisionHistory_(cycleId, reviewType).forEach(function (row) {
    const number = Number(row['Revision Number'] || 0);
    if (number > max) max = number;
  });
  return max + 1;
}

function preserveSubmittedReviewRevision_(cycle, fields, actorEmail, reason, now) {
  const cycleId = String((cycle && cycle['Cycle ID']) || '');
  const submittedJson = String((cycle && cycle[fields.jsonField]) || '');
  const existing = listReviewRevisionHistory_(cycleId, fields.key);
  for (let index = existing.length - 1; index >= 0; index--) {
    const row = existing[index];
    if (
      String(row['Submitted JSON'] || '') === submittedJson &&
      !String(row['Resubmitted At'] || '').trim()
    ) {
      return {
        revisionId: String(row['Revision ID'] || ''),
        revisionNumber: Number(row['Revision Number'] || 0),
        reused: true,
      };
    }
  }

  const revisionNumber = nextReviewRevisionNumber_(cycleId, fields.key);
  const revisionId =
    'REV:' + cycleId + ':' + fields.key + ':' + String(revisionNumber);
  const parsed = parseJson_(submittedJson, {});
  appendObject_(V31_REOPEN.SHEET, V31_REOPEN.HEADERS, {
    'Revision ID': revisionId,
    'Cycle ID': cycleId,
    'Review Type': fields.label,
    'Revision Number': revisionNumber,
    'Submitted JSON': submittedJson,
    'Submitted At': parsed.submittedAt || cycle['Updated At'] || now,
    'Reopened At': now,
    'Reopened By': normalizeEmail_(actorEmail),
    'Reopen Reason': reason || '',
    'Resubmitted At': '',
  });
  return {
    revisionId: revisionId,
    revisionNumber: revisionNumber,
    reused: false,
  };
}

function stampReviewRevisionResubmittedAt_(cycleId, reviewType, when) {
  try {
    const ss = getSpreadsheet_();
    if (!ss.getSheetByName(V31_REOPEN.SHEET)) return;
    const fields = reopenDocumentFields_(reviewType);
    const rows = getAllObjects_(V31_REOPEN.SHEET);
    for (let index = rows.length - 1; index >= 0; index--) {
      const row = rows[index];
      if (
        String(row['Cycle ID'] || '') === String(cycleId || '') &&
        String(row['Review Type'] || '') === fields.label &&
        !String(row['Resubmitted At'] || '').trim()
      ) {
        row['Resubmitted At'] = when;
        writeObject_(V31_REOPEN.SHEET, index + 2, row);
        return;
      }
    }
  } catch (error) {
    Logger.log(
      'Review revision resubmit stamp skipped: ' + String(error.message || error)
    );
  }
}

function evaluateReopenSubmittedReview_(cycle, reviewType, email, isHr) {
  const fields = reopenDocumentFields_(reviewType);
  const status = String((cycle && cycle['Status']) || '');
  const documentStatus = String((cycle && cycle[fields.statusField]) || '');
  const normalized = normalizeEmail_(email);
  const isAuthor =
    normalizeEmail_((cycle && cycle[fields.authorField]) || '') === normalized;

  if (!cycle) {
    return {
      action: 'reject',
      code: 'NOT_FOUND',
      message: 'Review cycle not found.',
    };
  }
  if (!isHr && !isAuthor) {
    return {
      action: 'reject',
      code: 'UNAUTHORIZED',
      message:
        'Only the assigned participant or HR may reopen this submitted review.',
    };
  }
  if (status === PR.CYCLE.CANCELLED) {
    return {
      action: 'reject',
      code: 'CANCELLED',
      message: 'Cancelled cycles cannot be reopened for editing.',
    };
  }
  if (status === PR.CYCLE.MEETING || hasMeetingOpenedMarker_(cycle)) {
    return {
      action: 'reject',
      code: 'MEETING_OPEN',
      message:
        'This review can no longer be reopened because the review meeting has been opened.',
    };
  }
  if (status === PR.CYCLE.SIGNATURES) {
    return {
      action: 'reject',
      code: 'SIGNATURES',
      message:
        'Signatures are already released. This review can no longer be reopened for editing.',
    };
  }
  if (status === PR.CYCLE.FINALIZING) {
    return {
      action: 'reject',
      code: 'FINALIZING',
      message: 'Finalizing reviews cannot be reopened for editing.',
    };
  }
  if (status === PR.CYCLE.COMPLETE) {
    return {
      action: 'reject',
      code: 'COMPLETE',
      message: 'Completed reviews cannot be reopened for editing.',
    };
  }
  if (status !== PR.CYCLE.OPEN && status !== PR.CYCLE.READY) {
    return {
      action: 'reject',
      code: 'STATUS',
      message:
        'Reviews can only be reopened before the review meeting is opened.',
    };
  }
  if (cycleHasAuthoritativeSignatureClaim_(cycle)) {
    return {
      action: 'reject',
      code: 'SIGNATURE_EXISTS',
      message:
        'This review already has signature evidence and cannot be reopened for editing.',
    };
  }
  if (documentStatus === PR.DOC.DRAFT || documentStatus === PR.DOC.NOT_STARTED) {
    return {
      action: 'alreadyOpen',
      code: 'ALREADY_DRAFT',
      message: 'This review is already open for editing.',
    };
  }
  if (documentStatus !== PR.DOC.SUBMITTED) {
    return {
      action: 'reject',
      code: 'NOT_SUBMITTED',
      message: 'Only a submitted review can be reopened for editing.',
    };
  }
  return {
    action: 'allow',
    code: 'ALLOW',
    message: '',
    fields: fields,
  };
}

function canReopenSubmittedReview_(cycle, reviewType, email, isHr) {
  return evaluateReopenSubmittedReview_(cycle, reviewType, email, isHr)
    .action === 'allow';
}

function validateReopenSubmittedReviewPayload_(payload, isHr) {
  const confirmed =
    payload &&
    payload.confirmed === true &&
    String(payload.confirmationToken || '') === V31_REOPEN.CONFIRMATION_TOKEN;
  if (!confirmed) {
    throw new Error('Reopen for Editing requires explicit confirmation.');
  }
  const reason = String((payload && payload.reason) || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (isHr && !reason) {
    throw new Error(
      'HR must provide a reason when reopening a submitted personnel review.'
    );
  }
  return reason;
}

function commitReopenSubmittedReview_(cycle, fields, now) {
  const previousCycleStatus = String(cycle['Status'] || '');
  cycle[fields.statusField] = PR.DOC.DRAFT;
  if (previousCycleStatus === PR.CYCLE.READY) {
    cycle['Status'] = PR.CYCLE.OPEN;
  }
  cycle['Updated At'] = now;
  updateCycleReadiness_(cycle);
  return previousCycleStatus;
}

function buildReopenSubmittedReviewResult_(
  cycle,
  email,
  isHr,
  fields,
  extras
) {
  const extra = extras || {};
  const canEditManager =
    normalizeEmail_(cycle['Manager Email']) === normalizeEmail_(email) &&
    String(cycle['Manager Review Status'] || '') === PR.DOC.DRAFT;
  const canEditSelf =
    normalizeEmail_(cycle['Employee Email']) === normalizeEmail_(email) &&
    String(cycle['Self Evaluation Status'] || '') === PR.DOC.DRAFT;
  return {
    ok: true,
    alreadyReopened: extra.alreadyReopened === true,
    cycleId: String(cycle['Cycle ID'] || ''),
    reviewType: fields.key,
    documentStatus: String(cycle[fields.statusField] || PR.DOC.DRAFT),
    previousDocumentStatus: extra.previousDocumentStatus || PR.DOC.SUBMITTED,
    cycleStatus: String(cycle['Status'] || ''),
    previousCycleStatus: extra.previousCycleStatus || '',
    revisionNumber: Number(extra.revisionNumber || 0),
    canEditManagerReview: canEditManager,
    canEditSelfEvaluation: canEditSelf,
    canStartMeeting: false,
    canReopenManagerReview: canReopenSubmittedReview_(
      cycle,
      'manager',
      email,
      isHr
    ),
    canReopenSelfEvaluation: canReopenSubmittedReview_(
      cycle,
      'self',
      email,
      isHr
    ),
    compensationRecommendationRemainsUnchanged:
      fields.key === 'manager' &&
      extra.compensationRecommendationRemainsUnchanged === true,
    auditWarning: extra.auditWarning || '',
    message:
      extra.message ||
      'This review is open for editing again. Submit it before the review meeting can begin.',
  };
}

/**
 * Public endpoint. Returns a submitted evaluation to Draft before Meeting Open.
 */
function reopenSubmittedReview(cycleId, reviewType, payload) {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();
  assertDomain_(email, settings.ALLOWED_DOMAIN);
  const isHr = isHrUser_(email);
  const fields = reopenDocumentFields_(reviewType);
  const reason = validateReopenSubmittedReviewPayload_(payload, isHr);

  assertReviewRevisionHistoryReady_();

  const locked = withLock_(function () {
    const location = findCycle_(String(cycleId || ''));
    const stored = location.object;
    const eligibility = evaluateReopenSubmittedReview_(
      stored,
      fields.key,
      email,
      isHr
    );
    if (eligibility.action === 'alreadyOpen') {
      return {
        alreadyReopened: true,
        stored: stored,
        previousDocumentStatus: PR.DOC.DRAFT,
        previousCycleStatus: String(stored['Status'] || ''),
        revisionNumber: nextReviewRevisionNumber_(
          stored['Cycle ID'],
          fields.key
        ) - 1,
        compensationRecommendationRemainsUnchanged:
          compensationRecommendationAlreadyExists_(stored),
        pendingAuditEvent: null,
        message: eligibility.message,
      };
    }
    if (eligibility.action !== 'allow') {
      throw new Error(eligibility.message);
    }

    const previousDocumentStatus = String(stored[fields.statusField] || '');
    const previousCycleStatus = String(stored['Status'] || '');
    const compensationSnapshot = {
      decision: stored['Compensation Decision'],
      status: stored['Compensation Status'],
      recordId: stored['Compensation Record ID'],
      notes: stored['Compensation Decision Notes'],
    };
    const now = new Date();
    const revision = preserveSubmittedReviewRevision_(
      stored,
      fields,
      email,
      reason,
      now
    );
    commitReopenSubmittedReview_(stored, fields, now);
    if (
      String(stored['Compensation Decision'] || '') !==
        String(compensationSnapshot.decision || '') ||
      String(stored['Compensation Status'] || '') !==
        String(compensationSnapshot.status || '') ||
      String(stored['Compensation Record ID'] || '') !==
        String(compensationSnapshot.recordId || '') ||
      String(stored['Compensation Decision Notes'] || '') !==
        String(compensationSnapshot.notes || '')
    ) {
      throw new Error(
        'Reopen for Editing must not modify compensation records.'
      );
    }
    writeCycle_(location.rowNumber, stored);

    return {
      alreadyReopened: false,
      stored: stored,
      previousDocumentStatus: previousDocumentStatus,
      previousCycleStatus: previousCycleStatus,
      revisionNumber: revision.revisionNumber,
      compensationRecommendationRemainsUnchanged:
        compensationRecommendationAlreadyExists_(stored),
      pendingAuditEvent: buildPendingAuditEvent_(
        String(stored['Cycle ID']),
        V31_REOPEN.AUDIT_ACTION,
        email,
        previousCycleStatus,
        stored['Status'],
        JSON.stringify({
          reviewType: fields.key,
          actor: normalizeEmail_(email),
          actorRole: isHr ? PR.ROLE.HR : fields.key === 'manager'
            ? PR.ROLE.MANAGER
            : PR.ROLE.EMPLOYEE,
          previousDocumentStatus: previousDocumentStatus,
          newDocumentStatus: PR.DOC.DRAFT,
          previousCycleStatus: previousCycleStatus,
          newCycleStatus: String(stored['Status'] || ''),
          revisionNumber: revision.revisionNumber,
          revisionId: revision.revisionId,
          reason: reason || '',
          compensationUnchanged: true,
        }),
        'REVIEW_REOPENED:' +
          String(stored['Cycle ID']) +
          ':' +
          fields.key +
          ':' +
          String(revision.revisionNumber)
      ),
      message:
        'This review is open for editing again. Submit it before the review meeting can begin.',
    };
  });

  let auditWarning = '';
  if (locked.pendingAuditEvent) {
    const auditResult = commitAuditEventOutsideLock_(locked.pendingAuditEvent);
    if (auditResult && !auditResult.ok) {
      auditWarning = auditResult.warning || '';
    }
  }

  return buildReopenSubmittedReviewResult_(
    locked.stored,
    email,
    isHr,
    fields,
    {
      alreadyReopened: locked.alreadyReopened,
      previousDocumentStatus: locked.previousDocumentStatus,
      previousCycleStatus: locked.previousCycleStatus,
      revisionNumber: locked.revisionNumber,
      compensationRecommendationRemainsUnchanged:
        locked.compensationRecommendationRemainsUnchanged,
      auditWarning: auditWarning,
      message: locked.message,
    }
  );
}
