/**
 * Previous Review Context — post-v3.1 enhancement.
 *
 * Shows the current assigned manager (or HR) a read-only summary of the
 * employee's most recent completed prior review. Does not mutate history,
 * expose compensation, or change Drive sharing.
 *
 * Employee identity strategy (this release — no migration):
 * Prefer stable Employee ID when present on both rows, otherwise normalized
 * Employee Email. Never match by name alone. ReviewCycles currently has no
 * Employee ID column, so production matching is email-based. Email renames,
 * domain changes, or corrected typos break continuity until HR updates the
 * historical Employee Email values (or a later release adds Employee ID).
 */

const V31_PREVIOUS_REVIEW = Object.freeze({
  CACHE_PREFIX: 'v31_prev_review_id_v2:',
  CACHE_TTL_SECONDS: 300,
  NOT_RECORDED: 'Not Recorded',
  HISTORICAL_FACTOR: 'Historical factor',
  DATE_UNVERIFIABLE: 'PREVIOUS_REVIEW_DATE_UNVERIFIABLE',
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
  return classifyPreviousReviewChronology_(currentCycle, candidate)
    .eligible;
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

/**
 * Chronology must be proven. Unverifiable Complete rows are ineligible.
 */
function classifyPreviousReviewChronology_(currentCycle, candidate) {
  const currentEnd = toMillisSafe_(currentCycle['Review Period End']);
  const candidateEnd = toMillisSafe_(candidate['Review Period End']);
  if (currentEnd && candidateEnd) {
    if (candidateEnd < currentEnd) {
      return { eligible: true, reason: '' };
    }
    if (candidateEnd > currentEnd) {
      return {
        eligible: false,
        reason: 'PREVIOUS_REVIEW_AFTER_CURRENT_PERIOD',
      };
    }
    // Equal period ends require other evidence below.
  }

  const currentCompleted = toMillisSafe_(currentCycle['Completed At']);
  const candidateCompleted = toMillisSafe_(candidate['Completed At']);
  if (currentCompleted && candidateCompleted) {
    if (candidateCompleted < currentCompleted) {
      return { eligible: true, reason: '' };
    }
    if (candidateCompleted > currentCompleted) {
      return {
        eligible: false,
        reason: 'PREVIOUS_REVIEW_AFTER_CURRENT_COMPLETION',
      };
    }
  }

  // Open/current unfinished cycle: completed-at before current period end.
  if (candidateCompleted && currentEnd && !currentCompleted) {
    if (candidateCompleted < currentEnd) {
      return { eligible: true, reason: '' };
    }
  }

  const currentUpdated = toMillisSafe_(currentCycle['Updated At']);
  const candidateUpdated = toMillisSafe_(candidate['Updated At']);
  if (
    currentUpdated &&
    candidateUpdated &&
    candidateCompleted &&
    candidateUpdated < currentUpdated
  ) {
    return { eligible: true, reason: '' };
  }

  return {
    eligible: false,
    reason: V31_PREVIOUS_REVIEW.DATE_UNVERIFIABLE,
  };
}

function isPreviousReviewCompletedBeforeCurrent_(currentCycle, candidate) {
  return classifyPreviousReviewChronology_(currentCycle, candidate)
    .eligible;
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
function findPreviousCompletedReview_(currentCycle, allCycles, options) {
  if (!currentCycle) {
    return {
      found: false,
      reason: 'NO_PREVIOUS_COMPLETED_REVIEW',
    };
  }

  const opts = options || {};
  const rows = allCycles || getAllObjects_(PR.SHEETS.CYCLES);
  const allowAnyType =
    opts.allowAnyType == null
      ? isPreviousReviewFallbackAnyTypeEnabled_()
      : !!opts.allowAnyType;
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

function previousReviewCacheKey_(currentCycleId, allowAnyType) {
  return (
    V31_PREVIOUS_REVIEW.CACHE_PREFIX +
    String(currentCycleId || '') +
    ':fallback-' +
    (allowAnyType ? 'true' : 'false')
  );
}

function readCachedPreviousReviewCycleId_(currentCycleId, allowAnyType) {
  try {
    const cache = CacheService.getScriptCache();
    if (!cache) return '';
    return String(
      cache.get(previousReviewCacheKey_(currentCycleId, allowAnyType)) ||
        ''
    );
  } catch (error) {
    return '';
  }
}

function writeCachedPreviousReviewCycleId_(
  currentCycleId,
  previousCycleId,
  allowAnyType
) {
  try {
    const cache = CacheService.getScriptCache();
    if (!cache || !previousCycleId) return;
    cache.put(
      previousReviewCacheKey_(currentCycleId, allowAnyType),
      String(previousCycleId),
      V31_PREVIOUS_REVIEW.CACHE_TTL_SECONDS
    );
  } catch (error) {
    // ignore cache failures
  }
}

function removeCachedPreviousReviewCycleId_(currentCycleId) {
  try {
    const cache = CacheService.getScriptCache();
    if (!cache) return;
    cache.remove(previousReviewCacheKey_(currentCycleId, true));
    cache.remove(previousReviewCacheKey_(currentCycleId, false));
  } catch (error) {
    // ignore cache failures
  }
}

/**
 * Clear previous-review caches for an employee's open/current cycles when a
 * review becomes Complete so a newer prior can be selected.
 * Five-minute TTL may still retain a selection until invalidation or expiry;
 * completion invalidation is the forced refresh path.
 */
function invalidatePreviousReviewCachesForEmployee_(completedCycle) {
  if (!completedCycle) return;
  try {
    const rows = getAllObjects_(PR.SHEETS.CYCLES);
    (rows || []).forEach(function (row) {
      if (!employeesMatchForPreviousReview_(completedCycle, row)) {
        return;
      }
      removeCachedPreviousReviewCycleId_(String(row['Cycle ID'] || ''));
    });
  } catch (error) {
    Logger.log(
      'invalidatePreviousReviewCachesForEmployee_ failed: ' +
        String(error.message || error)
    );
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

function isCachedPreviousReviewStillValid_(
  currentCycle,
  cachedCycle,
  allowAnyType
) {
  if (
    !isPreviousCompletedReviewCandidate_(currentCycle, cachedCycle)
  ) {
    return false;
  }
  if (allowAnyType) return true;
  return (
    String(cachedCycle['Review Type'] || '') ===
    String(currentCycle['Review Type'] || '')
  );
}

function resolvePreviousReviewForAccess_(access, options) {
  const opts = options || {};
  const allowAnyType =
    opts.allowAnyType == null
      ? isPreviousReviewFallbackAnyTypeEnabled_()
      : !!opts.allowAnyType;
  const cachedId = opts.skipCache
    ? ''
    : readCachedPreviousReviewCycleId_(
        access.currentCycleId,
        allowAnyType
      );
  if (cachedId) {
    try {
      const cachedCycle = findCycle_(cachedId).object;
      if (
        isCachedPreviousReviewStillValid_(
          access.currentCycle,
          cachedCycle,
          allowAnyType
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
    opts.cycles,
    { allowAnyType: allowAnyType }
  );
  if (resolved.found) {
    writeCachedPreviousReviewCycleId_(
      access.currentCycleId,
      resolved.cycleId,
      allowAnyType
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
  return V31_PREVIOUS_REVIEW.HISTORICAL_FACTOR;
}

/**
 * Only factors present in historical manager or employee ratings.
 * Do not seed every current factor as Not Recorded.
 */
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

function parsePreviousReviewJsonSafe_(raw, fallback) {
  try {
    return parseJson_(raw, fallback);
  } catch (error) {
    return fallback;
  }
}

/**
 * Allow-listed manager review fields only — never pass raw historical JSON.
 */
function sanitizeHistoricalManagerReview_(raw) {
  const source = raw || {};
  const ratings = [];
  ((source.ratings || []) || []).forEach(function (item) {
    if (!item || !item.factorId) return;
    ratings.push({
      factorId: String(item.factorId || ''),
      factorLabel: String(item.factorLabel || ''),
      rating: item.rating == null ? '' : item.rating,
      comments: String(item.comments || ''),
    });
  });
  return {
    ratings: ratings,
    overallRating:
      source.overallRating == null ? '' : source.overallRating,
    overallComments: String(source.overallComments || ''),
    areasForImprovement: String(source.areasForImprovement || ''),
    actionSteps: String(source.actionSteps || ''),
    supervisorComments: String(source.supervisorComments || ''),
    submittedAt: String(source.submittedAt || ''),
  };
}

/**
 * Allow-listed self-evaluation fields only.
 */
function sanitizeHistoricalSelfEvaluation_(raw) {
  const source = raw || {};
  const ratings = [];
  ((source.ratings || []) || []).forEach(function (item) {
    if (!item || !item.factorId) return;
    ratings.push({
      factorId: String(item.factorId || ''),
      factorLabel: String(item.factorLabel || ''),
      rating: item.rating == null ? '' : item.rating,
      comments: String(item.comments || ''),
    });
  });
  return {
    ratings: ratings,
    overallRating:
      source.overallRating == null ? '' : source.overallRating,
    overallComments: String(source.overallComments || ''),
    keyAccomplishments: String(source.keyAccomplishments || ''),
    areasForGrowth: String(source.areasForGrowth || ''),
    goalsForNextPeriod: String(source.goalsForNextPeriod || ''),
    supportNeeded: String(source.supportNeeded || ''),
    submittedAt: String(source.submittedAt || ''),
  };
}

/**
 * Allow-listed meeting outcome fields only.
 */
function sanitizeHistoricalMeeting_(raw) {
  const source = raw || {};
  return {
    managerFinalComments: String(source.managerFinalComments || ''),
    developmentGoals: String(source.developmentGoals || ''),
    actionSteps: String(source.actionSteps || ''),
    employeeComments: String(source.employeeComments || ''),
  };
}

/**
 * Pure helper: assert historical view payload has no forbidden privacy keys.
 */
function historicalPayloadContainsForbiddenPrivacy_(payload) {
  const blob = JSON.stringify(payload || {}).toLowerCase();
  const forbidden = [
    'compensationdecision',
    'compensation decision',
    'compensationdecisionnotes',
    'compensation decision notes',
    'salary',
    'internalhrnotes',
    'internal hr notes',
    'recoverydetails',
    'recovery details',
    'signaturefileid',
    'signature file id',
    'attemptid',
    'attempt id',
    'finalization last error',
    'finalizationlasterror',
  ];
  for (let i = 0; i < forbidden.length; i += 1) {
    if (blob.indexOf(forbidden[i]) >= 0) {
      return forbidden[i];
    }
  }
  return '';
}

function buildPreviousReviewSummaryDto_(previousCycle, resolution) {
  const managerReview = sanitizeHistoricalManagerReview_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Manager Review JSON'],
      emptyManagerReview_()
    )
  );
  const selfEvaluation = sanitizeHistoricalSelfEvaluation_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Self Evaluation JSON'],
      emptySelfEvaluation_()
    )
  );
  const meeting = sanitizeHistoricalMeeting_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Meeting JSON'],
      emptyMeeting_()
    )
  );

  const overallValue = managerReview.overallRating;
  const goals = splitGoalsText_(selfEvaluation.goalsForNextPeriod);
  if (!goals.length) {
    splitGoalsText_(meeting.developmentGoals).forEach(function (goal) {
      goals.push(goal);
    });
  }

  const managerPdfAvailable = !!String(
    previousCycle['Manager Review PDF ID'] || ''
  ).trim();
  const selfPdfAvailable = !!String(
    previousCycle['Self Evaluation PDF ID'] || ''
  ).trim();

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
    managerPdfVerified: false,
    selfPdfVerified: false,
    pdfAccessNote:
      managerPdfAvailable || selfPdfAvailable
        ? 'Stored PDF IDs are verified only when downloaded.'
        : 'PDF available through HR',
  };
}

/**
 * Build the allow-listed full historical cycle DTO (no raw JSON passthrough).
 */
function buildPreviousReviewCycleDto_(
  previousCycle,
  resolution,
  access
) {
  const managerReview = sanitizeHistoricalManagerReview_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Manager Review JSON'],
      emptyManagerReview_()
    )
  );
  const selfEvaluation = sanitizeHistoricalSelfEvaluation_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Self Evaluation JSON'],
      emptySelfEvaluation_()
    )
  );
  const meeting = sanitizeHistoricalMeeting_(
    parsePreviousReviewJsonSafe_(
      previousCycle['Meeting JSON'],
      emptyMeeting_()
    )
  );

  const managerWithSignatures = addSignatureTimes_(
    managerReview,
    previousCycle,
    PR.TYPE.MANAGER
  );
  const selfWithSignatures = addSignatureTimes_(
    selfEvaluation,
    previousCycle,
    PR.TYPE.SELF
  );

  const managerPdfAvailable = !!String(
    previousCycle['Manager Review PDF ID'] || ''
  ).trim();
  const selfPdfAvailable = !!String(
    previousCycle['Self Evaluation PDF ID'] || ''
  ).trim();

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
    isHr: !!(access && access.isHr),
    isManager: !!(access && access.isManager),
    isEmployee: false,
    historicalPreviousReview: true,
    linkedFromCycleId: access ? access.currentCycleId : '',
    sameReviewType: !!(resolution && resolution.sameReviewType),
    periodLabel:
      (resolution && resolution.periodLabel) ||
      buildPreviousReviewPeriodLabel_(previousCycle),
    managerReviewVisible: true,
    selfEvaluationVisible: true,
    managerReview: managerWithSignatures,
    selfEvaluation: selfWithSignatures,
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
    canDownloadManager: managerPdfAvailable,
    canDownloadSelf: selfPdfAvailable,
    managerPdfAvailable: managerPdfAvailable,
    selfPdfAvailable: selfPdfAvailable,
    managerPdfVerified: false,
    selfPdfVerified: false,
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

  return buildPreviousReviewCycleDto_(
    resolution.cycle,
    resolution,
    access
  );
}

/**
 * Validate historical document type and return the authoritative stored ID.
 */
function resolvePreviousReviewStoredPdfId_(previousCycle, documentType) {
  if (
    documentType !== PR.TYPE.MANAGER &&
    documentType !== PR.TYPE.SELF
  ) {
    throw new Error('Unsupported historical document type.');
  }
  const fileId =
    documentType === PR.TYPE.MANAGER
      ? previousCycle['Manager Review PDF ID']
      : previousCycle['Self Evaluation PDF ID'];
  const id = String(fileId || '').trim();
  if (!id) {
    throw new Error(
      'The previous review PDF is not available. PDF available through HR.'
    );
  }
  return id;
}

/**
 * Public API: download a prior-cycle PDF using current-cycle authorization.
 * Reuses strict authoritative PDF validation. Does not change Drive sharing.
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
  const previousCycleId = String(previousCycle['Cycle ID'] || '');
  const fileId = resolvePreviousReviewStoredPdfId_(
    previousCycle,
    documentType
  );

  // Strict validation: MIME, trash, approved folder, deterministic name
  // for the prior cycle and document type. Reject on any failure.
  validateAuthoritativeFinalPdfId_(
    previousCycleId,
    documentType,
    fileId
  );

  const blob = DriveApp.getFileById(String(fileId)).getBlob();
  return {
    fileName: blob.getName(),
    mimeType: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
    previousCycleId: previousCycleId,
    verified: true,
  };
}
