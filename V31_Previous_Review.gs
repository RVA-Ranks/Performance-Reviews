/**
 * Previous Review Context — post-v3.1 enhancement.
 *
 * Shows the current assigned manager (or HR) a read-only summary of the
 * employee's most recent completed prior review. Does not mutate history,
 * expose compensation, or change Drive sharing.
 *
 * Employee identity: prefer stable Employee ID when present on both rows,
 * otherwise normalized Employee Email. Never match by name alone.
 * (Current ReviewCycles schema has no Employee ID column; email is used.)
 */

const V31_PREVIOUS_REVIEW = Object.freeze({
  CACHE_PREFIX: 'v31_prev_review_id_v1:',
  CACHE_TTL_SECONDS: 300,
  NOT_RECORDED: 'Not Recorded',
  HISTORICAL_FACTOR: 'Historical factor',
});

/**
 * Pure helper: does this cycle qualify as a previous completed review?
 */
function isPreviousCompletedReviewCandidate_(currentCycle, candidate) {
  if (!currentCycle || !candidate) return false;
  if (String(candidate.Status || '') !== PR.CYCLE.COMPLETE) return false;
  if (
    String(candidate['Cycle ID'] || '') ===
    String(currentCycle['Cycle ID'] || '')
  ) {
    return false;
  }
  if (!employeesMatchForPreviousReview_(currentCycle, candidate)) {
    return false;
  }
  return isPreviousReviewCompletedBeforeCurrent_(currentCycle, candidate);
}

/**
 * Match employees by Employee ID first, then normalized email. Never by name.
 */
function employeesMatchForPreviousReview_(currentCycle, candidate) {
  const currentId = String(
    currentCycle['Employee ID'] || currentCycle.employeeId || ''
  ).trim();
  const candidateId = String(
    candidate['Employee ID'] || candidate.employeeId || ''
  ).trim();
  if (currentId && candidateId) {
    return currentId.toLowerCase() === candidateId.toLowerCase();
  }
  const currentEmail = normalizeEmail_(currentCycle['Employee Email']);
  const candidateEmail = normalizeEmail_(candidate['Employee Email']);
  return !!(currentEmail && currentEmail === candidateEmail);
}

function isPreviousReviewCompletedBeforeCurrent_(currentCycle, candidate) {
  const currentEnd = toMillisSafe_(currentCycle['Review Period End']);
  const candidateEnd = toMillisSafe_(candidate['Review Period End']);
  if (currentEnd && candidateEnd && candidateEnd < currentEnd) {
    return true;
  }
  const currentCompleted = toMillisSafe_(currentCycle['Completed At']);
  const candidateCompleted = toMillisSafe_(candidate['Completed At']);
  if (currentCompleted && candidateCompleted) {
    return candidateCompleted < currentCompleted;
  }
  if (candidateCompleted && !currentCompleted) {
    return true;
  }
  const currentUpdated = toMillisSafe_(currentCycle['Updated At']);
  const candidateUpdated = toMillisSafe_(candidate['Updated At']);
  if (currentUpdated && candidateUpdated) {
    return candidateUpdated < currentUpdated;
  }
  // Current open cycles without completion: any prior Complete for the
  // employee is eligible when period end is not after current period end.
  if (candidateEnd && currentEnd) {
    return candidateEnd <= currentEnd;
  }
  return !!candidateCompleted || String(candidate.Status) === PR.CYCLE.COMPLETE;
}

function toMillisSafe_(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return isNaN(time) ? 0 : time;
}

function isPreviousReviewFallbackAnyTypeEnabled_() {
  try {
    const settings = getSettings_();
    if (
      !Object.prototype.hasOwnProperty.call(
        settings,
        'PREVIOUS_REVIEW_FALLBACK_ANY_TYPE'
      )
    ) {
      return true;
    }
    return v31Boolean_(settings.PREVIOUS_REVIEW_FALLBACK_ANY_TYPE, true);
  } catch (error) {
    return true;
  }
}

/**
 * Pure helper: rank candidates. Lower score sorts first.
 */
function comparePreviousReviewCandidates_(currentCycle, left, right) {
  const currentType = String(currentCycle['Review Type'] || '');
  const leftSame =
    String(left['Review Type'] || '') === currentType ? 0 : 1;
  const rightSame =
    String(right['Review Type'] || '') === currentType ? 0 : 1;
  if (leftSame !== rightSame) return leftSame - rightSame;

  const endDiff =
    toMillisSafe_(right['Review Period End']) -
    toMillisSafe_(left['Review Period End']);
  if (endDiff) return endDiff;

  const completedDiff =
    toMillisSafe_(right['Completed At']) -
    toMillisSafe_(left['Completed At']);
  if (completedDiff) return completedDiff;

  return (
    toMillisSafe_(right['Updated At']) -
    toMillisSafe_(left['Updated At'])
  );
}

/**
 * Private resolver: one previous completed review for the employee.
 * Pure when cycles are provided; otherwise reads ReviewCycles once.
 */
function findPreviousCompletedReview_(currentCycle, allCycles) {
  if (!currentCycle) {
    return {
      found: false,
      reason: 'NO_PREVIOUS_COMPLETED_REVIEW',
    };
  }

  const rows = allCycles || getAllObjects_(PR.SHEETS.CYCLES);
  const allowAnyType = isPreviousReviewFallbackAnyTypeEnabled_();
  const currentType = String(currentCycle['Review Type'] || '');

  let candidates = (rows || []).filter(function (candidate) {
    return isPreviousCompletedReviewCandidate_(currentCycle, candidate);
  });

  if (!allowAnyType) {
    candidates = candidates.filter(function (candidate) {
      return String(candidate['Review Type'] || '') === currentType;
    });
  }

  if (!candidates.length) {
    return {
      found: false,
      reason: 'NO_PREVIOUS_COMPLETED_REVIEW',
    };
  }

  candidates.sort(function (left, right) {
    return comparePreviousReviewCandidates_(
      currentCycle,
      left,
      right
    );
  });

  const selected = candidates[0];
  const sameReviewType =
    String(selected['Review Type'] || '') === currentType;

  return {
    found: true,
    cycleId: String(selected['Cycle ID'] || ''),
    reviewType: String(selected['Review Type'] || ''),
    periodLabel: buildPreviousReviewPeriodLabel_(selected),
    completedAt: selected['Completed At'] || '',
    sameReviewType: sameReviewType,
    cycle: selected,
  };
}

function buildPreviousReviewPeriodLabel_(cycle) {
  const type = String(cycle['Review Type'] || 'Review');
  const end = cycle['Review Period End']
    ? formatDate_(cycle['Review Period End'])
    : '';
  const year = cycle['Review Period End']
    ? new Date(cycle['Review Period End']).getFullYear()
    : '';
  if (year && !isNaN(year)) {
    return year + ' ' + type;
  }
  if (end) {
    return type + ' ending ' + end;
  }
  return type;
}

function readCachedPreviousReviewCycleId_(currentCycleId) {
  try {
    const cache = CacheService.getScriptCache();
    if (!cache) return '';
    return String(
      cache.get(
        V31_PREVIOUS_REVIEW.CACHE_PREFIX + String(currentCycleId || '')
      ) || ''
    );
  } catch (error) {
    return '';
  }
}

function writeCachedPreviousReviewCycleId_(currentCycleId, previousCycleId) {
  try {
    const cache = CacheService.getScriptCache();
    if (!cache || !previousCycleId) return;
    cache.put(
      V31_PREVIOUS_REVIEW.CACHE_PREFIX + String(currentCycleId || ''),
      String(previousCycleId),
      V31_PREVIOUS_REVIEW.CACHE_TTL_SECONDS
    );
  } catch (error) {
    // ignore cache failures
  }
}

/**
 * Pure authorization decision for previous-review context.
 * Current assigned manager or HR only — never former-manager alone.
 */
function isPreviousReviewCallerAuthorized_(options) {
  const opts = options || {};
  return !!(opts.isHr || opts.isCurrentManager);
}

/**
 * Authorize previous-review access via the CURRENT cycle assignment.
 * Former managers of the prior cycle are not authorized unless they are
 * also the current assigned manager or HR.
 */
function assertPreviousReviewAccess_(currentCycleId) {
  const email = getCurrentUserEmail_();
  const settings = getSettings_();
  assertDomain_(email, settings.ALLOWED_DOMAIN);
  const isHr = isHrUser_(email);
  const location = findCycle_(currentCycleId);
  const currentCycle = location.object;
  const isManager =
    normalizeEmail_(currentCycle['Manager Email']) === email;

  if (
    !isPreviousReviewCallerAuthorized_({
      isHr: isHr,
      isCurrentManager: isManager,
    })
  ) {
    throw new Error(
      'Only the currently assigned manager or HR may view previous review context.'
    );
  }

  return {
    email: email,
    isHr: isHr,
    isManager: isManager,
    currentCycle: currentCycle,
    currentCycleId: String(currentCycle['Cycle ID'] || ''),
  };
}

function resolvePreviousReviewForAccess_(access, options) {
  const opts = options || {};
  const cachedId = opts.skipCache
    ? ''
    : readCachedPreviousReviewCycleId_(access.currentCycleId);
  if (cachedId) {
    try {
      const cachedCycle = findCycle_(cachedId).object;
      if (
        isPreviousCompletedReviewCandidate_(
          access.currentCycle,
          cachedCycle
        )
      ) {
        return {
          found: true,
          cycleId: cachedId,
          reviewType: String(cachedCycle['Review Type'] || ''),
          periodLabel: buildPreviousReviewPeriodLabel_(cachedCycle),
          completedAt: cachedCycle['Completed At'] || '',
          sameReviewType:
            String(cachedCycle['Review Type'] || '') ===
            String(access.currentCycle['Review Type'] || ''),
          cycle: cachedCycle,
        };
      }
    } catch (error) {
      // fall through to full lookup
    }
  }

  const resolved = findPreviousCompletedReview_(
    access.currentCycle,
    opts.cycles
  );
  if (resolved.found) {
    writeCachedPreviousReviewCycleId_(
      access.currentCycleId,
      resolved.cycleId
    );
  }
  return resolved;
}

function getRatingLabelForValue_(value) {
  const numeric = Number(value);
  if (!isFinite(numeric)) {
    return V31_PREVIOUS_REVIEW.NOT_RECORDED;
  }
  for (let i = 0; i < PR.RATINGS.length; i += 1) {
    if (Number(PR.RATINGS[i].value) === numeric) {
      return PR.RATINGS[i].label;
    }
  }
  return String(value);
}

function getFactorLabelForId_(factorId) {
  const wanted = String(factorId || '');
  for (let i = 0; i < PR.FACTORS.length; i += 1) {
    if (PR.FACTORS[i].id === wanted) {
      return PR.FACTORS[i].label;
    }
  }
  return wanted
    ? V31_PREVIOUS_REVIEW.HISTORICAL_FACTOR
    : V31_PREVIOUS_REVIEW.HISTORICAL_FACTOR;
}

function buildPreviousReviewFactorRatings_(managerReview, selfEvaluation) {
  const managerById = {};
  const employeeById = {};
  ((managerReview && managerReview.ratings) || []).forEach(function (
    item
  ) {
    if (item && item.factorId) {
      managerById[String(item.factorId)] = item;
    }
  });
  ((selfEvaluation && selfEvaluation.ratings) || []).forEach(function (
    item
  ) {
    if (item && item.factorId) {
      employeeById[String(item.factorId)] = item;
    }
  });

  const ids = {};
  PR.FACTORS.forEach(function (factor) {
    ids[factor.id] = true;
  });
  Object.keys(managerById).forEach(function (id) {
    ids[id] = true;
  });
  Object.keys(employeeById).forEach(function (id) {
    ids[id] = true;
  });

  return Object.keys(ids).map(function (factorId) {
    const managerItem = managerById[factorId] || {};
    const employeeItem = employeeById[factorId] || {};
    const known = PR.FACTORS.some(function (factor) {
      return factor.id === factorId;
    });
    return {
      factorId: factorId,
      factorLabel: known
        ? getFactorLabelForId_(factorId)
        : managerItem.factorLabel ||
          employeeItem.factorLabel ||
          V31_PREVIOUS_REVIEW.HISTORICAL_FACTOR,
      historicalOnly: !known,
      managerRating:
        managerItem.rating == null || managerItem.rating === ''
          ? V31_PREVIOUS_REVIEW.NOT_RECORDED
          : managerItem.rating,
      employeeRating:
        employeeItem.rating == null || employeeItem.rating === ''
          ? V31_PREVIOUS_REVIEW.NOT_RECORDED
          : employeeItem.rating,
    };
  });
}

function splitGoalsText_(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .split(/\r?\n|•|;/)
    .map(function (line) {
      return String(line || '')
        .replace(/^[\s\-–—*]+/, '')
        .trim();
    })
    .filter(function (line) {
      return !!line;
    });
}

function buildPreviousReviewSummaryDto_(previousCycle, resolution) {
  let managerReview = emptyManagerReview_();
  let selfEvaluation = emptySelfEvaluation_();
  let meeting = emptyMeeting_();

  try {
    managerReview = parseJson_(
      previousCycle['Manager Review JSON'],
      emptyManagerReview_()
    );
  } catch (error) {
    managerReview = emptyManagerReview_();
  }
  try {
    selfEvaluation = parseJson_(
      previousCycle['Self Evaluation JSON'],
      emptySelfEvaluation_()
    );
  } catch (error) {
    selfEvaluation = emptySelfEvaluation_();
  }
  try {
    meeting = parseJson_(
      previousCycle['Meeting JSON'],
      emptyMeeting_()
    );
  } catch (error) {
    meeting = emptyMeeting_();
  }

  const overallValue = managerReview.overallRating;
  const goals = splitGoalsText_(selfEvaluation.goalsForNextPeriod);
  if (!goals.length) {
    splitGoalsText_(meeting.developmentGoals).forEach(function (goal) {
      goals.push(goal);
    });
  }

  const managerPdfAvailable = !!previousCycle['Manager Review PDF ID'];
  const selfPdfAvailable = !!previousCycle['Self Evaluation PDF ID'];

  return {
    found: true,
    previousCycleId: String(previousCycle['Cycle ID'] || ''),
    reviewType: String(previousCycle['Review Type'] || ''),
    periodLabel:
      (resolution && resolution.periodLabel) ||
      buildPreviousReviewPeriodLabel_(previousCycle),
    completedAt: formatDateTime_(previousCycle['Completed At']),
    completedAtRaw: previousCycle['Completed At'] || '',
    previousManagerName: String(previousCycle['Manager Name'] || ''),
    sameReviewType: !!(resolution && resolution.sameReviewType),
    overallRating: {
      label: getRatingLabelForValue_(overallValue),
      numericValue:
        overallValue === '' || overallValue == null
          ? null
          : Number(overallValue),
    },
    factorRatings: buildPreviousReviewFactorRatings_(
      managerReview,
      selfEvaluation
    ),
    managerSummary: String(
      managerReview.overallComments ||
        V31_PREVIOUS_REVIEW.NOT_RECORDED
    ),
    employeeSummary: String(
      selfEvaluation.overallComments ||
        V31_PREVIOUS_REVIEW.NOT_RECORDED
    ),
    goals: goals,
    fullReviewAvailable: true,
    managerPdfAvailable: managerPdfAvailable,
    selfPdfAvailable: selfPdfAvailable,
    pdfAccessNote:
      managerPdfAvailable || selfPdfAvailable
        ? ''
        : 'PDF available through HR',
  };
}

/**
 * Public API: limited previous-review summary for the current cycle.
 */
function getPreviousReviewContext(cycleId) {
  const access = assertPreviousReviewAccess_(cycleId);
  try {
    const resolution = resolvePreviousReviewForAccess_(access);
    if (!resolution.found) {
      return {
        found: false,
        reason:
          resolution.reason || 'NO_PREVIOUS_COMPLETED_REVIEW',
        message:
          'No previous completed review was found for this employee.',
      };
    }
    return buildPreviousReviewSummaryDto_(
      resolution.cycle,
      resolution
    );
  } catch (error) {
    Logger.log(
      'getPreviousReviewContext failed for ' +
        String(cycleId) +
        ': ' +
        String(error.message || error)
    );
    return {
      found: false,
      reason: 'LOOKUP_FAILED',
      message:
        'Previous review context could not be loaded. The current review is still available.',
    };
  }
}

/**
 * Public API: read-only historical cycle view authorized via the current
 * cycle's manager/HR assignment (not the prior cycle's manager alone).
 */
function getPreviousReviewCycle(currentCycleId) {
  const access = assertPreviousReviewAccess_(currentCycleId);
  const resolution = resolvePreviousReviewForAccess_(access);
  if (!resolution.found) {
    throw new Error(
      'No previous completed review was found for this employee.'
    );
  }

  const previousCycle = resolution.cycle;
  const managerReview = parseJson_(
    previousCycle['Manager Review JSON'],
    emptyManagerReview_()
  );
  const selfEvaluation = parseJson_(
    previousCycle['Self Evaluation JSON'],
    emptySelfEvaluation_()
  );
  const meeting = parseJson_(
    previousCycle['Meeting JSON'],
    emptyMeeting_()
  );

  return {
    cycleId: String(previousCycle['Cycle ID'] || ''),
    status: PR.CYCLE.COMPLETE,
    reviewType: String(previousCycle['Review Type'] || ''),
    reviewPeriodStart: formatDate_(
      previousCycle['Review Period Start']
    ),
    reviewPeriodEnd: formatDate_(
      previousCycle['Review Period End']
    ),
    reviewMeetingDate: formatDate_(
      previousCycle['Review Meeting Date']
    ),
    employeeName: String(previousCycle['Employee Name'] || ''),
    employeeEmail: String(previousCycle['Employee Email'] || ''),
    employeeJobTitle: String(
      previousCycle['Employee Job Title'] || ''
    ),
    departmentProject: String(
      previousCycle['Department / Project'] || ''
    ),
    managerName: String(previousCycle['Manager Name'] || ''),
    managerEmail: String(previousCycle['Manager Email'] || ''),
    hrName: String(previousCycle['HR Name'] || ''),
    hrEmail: String(previousCycle['HR Email'] || ''),
    managerReviewStatus: String(
      previousCycle['Manager Review Status'] || ''
    ),
    selfEvaluationStatus: String(
      previousCycle['Self Evaluation Status'] || ''
    ),
    completedAt: formatDateTime_(previousCycle['Completed At']),
    updatedAt: formatDateTime_(previousCycle['Updated At']),
    isHr: access.isHr,
    isManager: access.isManager,
    isEmployee: false,
    historicalPreviousReview: true,
    linkedFromCycleId: access.currentCycleId,
    sameReviewType: resolution.sameReviewType,
    periodLabel: resolution.periodLabel,
    managerReviewVisible: true,
    selfEvaluationVisible: true,
    managerReview: addSignatureTimes_(
      managerReview,
      previousCycle,
      PR.TYPE.MANAGER
    ),
    selfEvaluation: addSignatureTimes_(
      selfEvaluation,
      previousCycle,
      PR.TYPE.SELF
    ),
    meeting: meeting,
    managerReviewProgress: calculateReviewProgress_(
      managerReview,
      PR.TYPE.MANAGER
    ),
    selfEvaluationProgress: calculateReviewProgress_(
      selfEvaluation,
      PR.TYPE.SELF
    ),
    signatureState: getCombinedSignatureState_(previousCycle),
    canEditManagerReview: false,
    canEditSelfEvaluation: false,
    canStartMeeting: false,
    canEditManagerMeeting: false,
    canEditEmployeeMeeting: false,
    canReleaseSignatures: false,
    signatureTasks: [],
    canDownloadManager: !!previousCycle['Manager Review PDF ID'],
    canDownloadSelf: !!previousCycle['Self Evaluation PDF ID'],
    v31: {
      compensationRequired: false,
      compensationComplete: true,
      canSeeCompensation: false,
      canManageCompensation: false,
      historicalReadOnly: true,
    },
    primaryAction: {
      key: 'overview',
      label: 'View Completed Review',
      tone: 'neutral',
      required: false,
    },
  };
}

/**
 * Public API: download a prior-cycle PDF using current-cycle authorization.
 * Does not change Drive sharing.
 */
function getPreviousReviewPdf(currentCycleId, documentType) {
  const access = assertPreviousReviewAccess_(currentCycleId);
  const resolution = resolvePreviousReviewForAccess_(access);
  if (!resolution.found) {
    throw new Error(
      'No previous completed review was found for this employee.'
    );
  }

  const previousCycle = resolution.cycle;
  const fileId =
    documentType === PR.TYPE.MANAGER
      ? previousCycle['Manager Review PDF ID']
      : previousCycle['Self Evaluation PDF ID'];

  if (!fileId) {
    throw new Error(
      'The previous review PDF is not available. PDF available through HR.'
    );
  }

  const blob = DriveApp.getFileById(String(fileId)).getBlob();
  return {
    fileName: blob.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
    previousCycleId: String(previousCycle['Cycle ID'] || ''),
  };
}
