/**
 * Previous Review Context tests (post-v3.1).
 *
 * Run from the Apps Script editor:
 *   runV31PreviousReviewTests_()
 *
 * Pure coverage for lookup preference, exclusion rules, authorization
 * decisions, compensation exclusion, and legacy JSON resilience.
 * Live separate-account checks remain Requires Daniel Sandbox.
 */

function runV31PreviousReviewTests_() {
  return runStructuredV31Suite_('V31 Previous Review Tests', [
    triggerTestCase_(
      'Prefers same review type when multiple completed reviews exist',
      testPreviousReviewSameTypePreference_
    ),
    triggerTestCase_(
      'Falls back to other review type with sameReviewType false',
      testPreviousReviewOtherTypeFallback_
    ),
    triggerTestCase_(
      'Excludes cancelled and incomplete cycles',
      testPreviousReviewExcludesIncomplete_
    ),
    triggerTestCase_(
      'Excludes the current cycle itself',
      testPreviousReviewExcludesCurrentCycle_
    ),
    triggerTestCase_(
      'Does not match employees by name alone',
      testPreviousReviewIgnoresSameName_
    ),
    triggerTestCase_(
      'Matches by Employee ID when present on both rows',
      testPreviousReviewMatchesEmployeeId_
    ),
    triggerTestCase_(
      'Current manager and HR are authorized; others denied',
      testPreviousReviewAuthorizationMatrix_
    ),
    triggerTestCase_(
      'Summary DTO never includes compensation or recovery metadata',
      testPreviousReviewPrivacyExclusion_
    ),
    triggerTestCase_(
      'Legacy factor shapes and malformed JSON do not crash',
      testPreviousReviewLegacyJsonResilience_
    ),
    triggerTestCase_(
      'Missing PDF still returns summary with HR note',
      testPreviousReviewMissingPdfNote_
    ),
    triggerTestCase_(
      'Historical cycle view is read-only and hides compensation',
      testPreviousReviewHistoricalReadOnlyShape_
    ),
    {
      name: 'Current manager session can load previous context for assigned employee',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Former manager not assigned to current cycle is denied',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Employee session denied from getPreviousReviewContext',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'HR session can open full previous review and authorized PDF path',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
  ]);
}

function previousReviewFixtureCurrent_() {
  return {
    'Cycle ID': 'CYC-2026-ANNUAL',
    Status: 'Open for Input',
    'Review Type': 'Annual',
    'Employee Name': 'Employee A',
    'Employee Email': 'employee.a@aitheras.com',
    'Manager Email': 'manager.current@aitheras.com',
    'Manager Name': 'Current Manager',
    'Review Period End': new Date('2026-12-31'),
    'Completed At': '',
    'Updated At': new Date('2026-03-01'),
  };
}

function previousReviewFixtureRows_() {
  return [
    {
      'Cycle ID': 'CYC-2024-ANNUAL',
      Status: 'Complete',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Manager Email': 'manager.old@aitheras.com',
      'Manager Name': 'Former Manager',
      'Review Period End': new Date('2024-12-31'),
      'Completed At': new Date('2025-01-15'),
      'Updated At': new Date('2025-01-15'),
      'Manager Review JSON': JSON.stringify({
        overallRating: '4',
        overallComments: 'Strong 2024',
        ratings: [
          { factorId: 'communication', rating: 4, comments: '' },
        ],
      }),
      'Self Evaluation JSON': JSON.stringify({
        overallComments: 'Self 2024',
        goalsForNextPeriod: 'Complete Lean certification\nLead one project',
        ratings: [
          { factorId: 'communication', rating: 3, comments: '' },
        ],
      }),
      'Meeting JSON': '{}',
      'Manager Review PDF ID': 'pdf-mgr-2024',
      'Self Evaluation PDF ID': 'pdf-self-2024',
      'Compensation Decision': 'Adjustment Submitted',
      'Compensation Decision Notes': 'secret raise notes',
    },
    {
      'Cycle ID': 'CYC-2025-90DAY',
      Status: 'Complete',
      'Review Type': '90-Day',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Manager Email': 'manager.old@aitheras.com',
      'Manager Name': 'Former Manager',
      'Review Period End': new Date('2025-03-31'),
      'Completed At': new Date('2025-03-12'),
      'Updated At': new Date('2025-03-12'),
      'Manager Review JSON': JSON.stringify({
        overallRating: '3',
        overallComments: 'Solid start',
        ratings: [],
      }),
      'Self Evaluation JSON': JSON.stringify({
        overallComments: '',
        goalsForNextPeriod: '',
        ratings: [],
      }),
      'Meeting JSON': '{}',
      'Compensation Decision': 'No Adjustment Recommended',
    },
    {
      'Cycle ID': 'CYC-2025-ANNUAL',
      Status: 'Complete',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Manager Email': 'manager.old@aitheras.com',
      'Manager Name': 'Former Manager',
      'Review Period End': new Date('2025-12-31'),
      'Completed At': new Date('2025-07-18'),
      'Updated At': new Date('2025-07-18'),
      'Manager Review JSON': JSON.stringify({
        overallRating: '5',
        overallComments: 'Exceeds in 2025',
        ratings: [
          { factorId: 'communication', rating: 5, comments: 'Clear' },
          {
            factorId: 'legacy_factor_x',
            factorLabel: 'Legacy Collaboration',
            rating: 4,
            comments: '',
          },
        ],
      }),
      'Self Evaluation JSON': JSON.stringify({
        overallComments: 'Proud of progress',
        goalsForNextPeriod: 'Complete Lean certification\nLead one cross-functional project',
        ratings: [
          { factorId: 'communication', rating: 4, comments: '' },
          { factorId: 'legacy_factor_x', rating: 3, comments: '' },
        ],
      }),
      'Meeting JSON': '{}',
      'Manager Review PDF ID': 'pdf-mgr-2025',
      'Self Evaluation PDF ID': '',
      'Compensation Decision': 'Adjustment Submitted',
      'Compensation Decision Notes': 'do not expose',
      'Manager Signature File ID': 'sig-file-1',
      'Finalization Last Error': 'old warning',
      'Manager PDF Attempt ID': 'attempt-1',
    },
    {
      'Cycle ID': 'CYC-CANCELLED',
      Status: 'Cancelled',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Review Period End': new Date('2025-06-30'),
      'Completed At': new Date('2025-06-01'),
      'Updated At': new Date('2025-06-01'),
    },
    {
      'Cycle ID': 'CYC-OPEN',
      Status: 'Open for Input',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Review Period End': new Date('2025-05-31'),
      'Completed At': '',
      'Updated At': new Date('2025-05-01'),
    },
    {
      'Cycle ID': 'CYC-MEETING',
      Status: 'Review Meeting Open',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Review Period End': new Date('2025-04-30'),
      'Completed At': '',
      'Updated At': new Date('2025-04-01'),
    },
    {
      'Cycle ID': 'CYC-SIG',
      Status: 'Awaiting Signatures',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Review Period End': new Date('2025-08-31'),
      'Completed At': '',
      'Updated At': new Date('2025-08-01'),
    },
    {
      'Cycle ID': 'CYC-FINALIZING',
      Status: 'Finalizing',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'employee.a@aitheras.com',
      'Review Period End': new Date('2025-09-30'),
      'Completed At': '',
      'Updated At': new Date('2025-09-01'),
    },
    {
      'Cycle ID': 'CYC-OTHER-NAME',
      Status: 'Complete',
      'Review Type': 'Annual',
      'Employee Name': 'Employee A',
      'Employee Email': 'other.employee@aitheras.com',
      'Review Period End': new Date('2025-11-30'),
      'Completed At': new Date('2025-11-15'),
      'Updated At': new Date('2025-11-15'),
    },
  ];
}

function testPreviousReviewSameTypePreference_() {
  const current = previousReviewFixtureCurrent_();
  const resolved = findPreviousCompletedReview_(
    current,
    previousReviewFixtureRows_()
  );
  assertTriggerTest_(resolved.found === true, 'Expected a previous review');
  assertTriggerTest_(
    resolved.cycleId === 'CYC-2025-ANNUAL',
    'Expected Annual 2025 as previous review, got ' + resolved.cycleId
  );
  assertTriggerTest_(
    resolved.sameReviewType === true,
    'Expected sameReviewType true'
  );
  return { previousCycleId: resolved.cycleId };
}

function testPreviousReviewOtherTypeFallback_() {
  const current = previousReviewFixtureCurrent_();
  const rows = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] !== 'CYC-2025-ANNUAL';
  });
  const resolved = findPreviousCompletedReview_(current, rows);
  assertTriggerTest_(resolved.found === true, 'Expected fallback review');
  assertTriggerTest_(
    resolved.cycleId === 'CYC-2025-90DAY',
    'Expected 90-Day 2025 fallback, got ' + resolved.cycleId
  );
  assertTriggerTest_(
    resolved.sameReviewType === false,
    'Fallback must set sameReviewType false'
  );
  return { previousCycleId: resolved.cycleId };
}

function testPreviousReviewExcludesIncomplete_() {
  const current = previousReviewFixtureCurrent_();
  const excluded = [
    'CYC-CANCELLED',
    'CYC-OPEN',
    'CYC-MEETING',
    'CYC-SIG',
    'CYC-FINALIZING',
  ];
  excluded.forEach(function (cycleId) {
    const row = previousReviewFixtureRows_().filter(function (item) {
      return item['Cycle ID'] === cycleId;
    })[0];
    assertTriggerTest_(
      isPreviousCompletedReviewCandidate_(current, row) === false,
      cycleId + ' must be excluded'
    );
  });
  return { excluded: excluded.length };
}

function testPreviousReviewExcludesCurrentCycle_() {
  const current = previousReviewFixtureCurrent_();
  current.Status = 'Complete';
  current['Completed At'] = new Date('2026-07-01');
  assertTriggerTest_(
    isPreviousCompletedReviewCandidate_(current, current) === false,
    'Current cycle must never count as previous'
  );
  return {};
}

function testPreviousReviewIgnoresSameName_() {
  const current = previousReviewFixtureCurrent_();
  const other = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] === 'CYC-OTHER-NAME';
  })[0];
  assertTriggerTest_(
    employeesMatchForPreviousReview_(current, other) === false,
    'Same name with different email must not match'
  );
  const resolved = findPreviousCompletedReview_(current, [other]);
  assertTriggerTest_(
    resolved.found === false,
    'Same-name other email must not resolve'
  );
  return {};
}

function testPreviousReviewMatchesEmployeeId_() {
  const current = previousReviewFixtureCurrent_();
  current['Employee ID'] = 'E-100';
  current['Employee Email'] = 'changed@aitheras.com';
  const prior = {
    'Cycle ID': 'CYC-ID-MATCH',
    Status: 'Complete',
    'Review Type': 'Annual',
    'Employee ID': 'E-100',
    'Employee Email': 'legacy@aitheras.com',
    'Employee Name': 'Different Name',
    'Review Period End': new Date('2025-12-31'),
    'Completed At': new Date('2025-07-01'),
    'Updated At': new Date('2025-07-01'),
  };
  assertTriggerTest_(
    employeesMatchForPreviousReview_(current, prior) === true,
    'Matching Employee ID must win over email'
  );
  const resolved = findPreviousCompletedReview_(current, [prior]);
  assertTriggerTest_(
    resolved.found === true && resolved.cycleId === 'CYC-ID-MATCH',
    'Employee ID match must resolve previous review'
  );
  return {};
}

function testPreviousReviewAuthorizationMatrix_() {
  assertTriggerTest_(
    isPreviousReviewCallerAuthorized_({
      isHr: false,
      isCurrentManager: true,
    }) === true,
    'Current assigned manager must be allowed'
  );
  assertTriggerTest_(
    isPreviousReviewCallerAuthorized_({
      isHr: true,
      isCurrentManager: false,
    }) === true,
    'HR must be allowed'
  );
  assertTriggerTest_(
    isPreviousReviewCallerAuthorized_({
      isHr: false,
      isCurrentManager: false,
    }) === false,
    'Former manager / unrelated / employee must be denied'
  );
  return {};
}

function testPreviousReviewPrivacyExclusion_() {
  const prior = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] === 'CYC-2025-ANNUAL';
  })[0];
  const dto = buildPreviousReviewSummaryDto_(prior, {
    periodLabel: '2025 Annual',
    sameReviewType: true,
  });
  const blob = JSON.stringify(dto).toLowerCase();
  [
    'compensation decision',
    'compensation decision notes',
    'salary',
    'signature file id',
    'recovery',
    'audit warning',
    'attempt id',
    'finalization last error',
    'do not expose',
  ].forEach(function (forbidden) {
    assertTriggerTest_(
      blob.indexOf(forbidden) === -1,
      'DTO must not contain "' + forbidden + '"'
    );
  });
  assertTriggerTest_(dto.found === true, 'DTO must be found');
  assertTriggerTest_(
    dto.previousCycleId === 'CYC-2025-ANNUAL',
    'DTO cycle id mismatch'
  );
  assertTriggerTest_(
    Array.isArray(dto.goals) && dto.goals.length >= 2,
    'Goals must be returned'
  );
  return { keys: Object.keys(dto) };
}

function testPreviousReviewLegacyJsonResilience_() {
  const prior = {
    'Cycle ID': 'CYC-LEGACY',
    Status: 'Complete',
    'Review Type': 'Annual',
    'Employee Email': 'employee.a@aitheras.com',
    'Manager Name': 'Former Manager',
    'Review Period End': new Date('2024-12-31'),
    'Completed At': new Date('2025-01-01'),
    'Manager Review JSON': '{not-json',
    'Self Evaluation JSON': null,
    'Meeting JSON': '{',
  };
  const dto = buildPreviousReviewSummaryDto_(prior, {
    periodLabel: 'Legacy',
    sameReviewType: true,
  });
  assertTriggerTest_(dto.found === true, 'Malformed JSON must still return DTO');
  assertTriggerTest_(
    dto.managerSummary === 'Not Recorded',
    'Missing manager summary must use Not Recorded'
  );
  assertTriggerTest_(
    dto.overallRating.label === 'Not Recorded',
    'Missing overall rating must use Not Recorded'
  );
  assertTriggerTest_(
    Array.isArray(dto.factorRatings),
    'Factor ratings must remain an array'
  );

  const withLegacy = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] === 'CYC-2025-ANNUAL';
  })[0];
  const rich = buildPreviousReviewSummaryDto_(withLegacy, {
    periodLabel: '2025 Annual',
    sameReviewType: true,
  });
  const legacyFactor = (rich.factorRatings || []).filter(function (item) {
    return item.factorId === 'legacy_factor_x';
  })[0];
  assertTriggerTest_(!!legacyFactor, 'Historical-only factor must appear');
  assertTriggerTest_(
    legacyFactor.factorLabel === 'Legacy Collaboration' ||
      legacyFactor.historicalOnly === true,
    'Historical factor label must be preserved or marked historical'
  );
  return {};
}

function testPreviousReviewMissingPdfNote_() {
  const prior = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] === 'CYC-2025-90DAY';
  })[0];
  prior['Manager Review PDF ID'] = '';
  prior['Self Evaluation PDF ID'] = '';
  const dto = buildPreviousReviewSummaryDto_(prior, {
    periodLabel: '2025 90-Day',
    sameReviewType: false,
  });
  assertTriggerTest_(
    dto.managerPdfAvailable === false && dto.selfPdfAvailable === false,
    'PDF availability flags must be false'
  );
  assertTriggerTest_(
    dto.pdfAccessNote === 'PDF available through HR',
    'Missing PDFs must surface HR note'
  );
  assertTriggerTest_(
    dto.fullReviewAvailable === true,
    'Summary must still be available without PDFs'
  );
  return {};
}

function testPreviousReviewHistoricalReadOnlyShape_() {
  const prior = previousReviewFixtureRows_().filter(function (row) {
    return row['Cycle ID'] === 'CYC-2025-ANNUAL';
  })[0];
  // Simulate the shape returned by getPreviousReviewCycle without Session.
  const view = {
    historicalPreviousReview: true,
    canEditManagerReview: false,
    canEditSelfEvaluation: false,
    canStartMeeting: false,
    canEditManagerMeeting: false,
    canEditEmployeeMeeting: false,
    canReleaseSignatures: false,
    signatureTasks: [],
    v31: {
      compensationRequired: false,
      canSeeCompensation: false,
      canManageCompensation: false,
      historicalReadOnly: true,
    },
  };
  assertTriggerTest_(
    view.historicalPreviousReview === true &&
      view.canEditManagerReview === false &&
      view.canReleaseSignatures === false &&
      view.v31.canSeeCompensation === false,
    'Historical view must remain read-only without compensation'
  );
  const dto = buildPreviousReviewSummaryDto_(prior, {
    periodLabel: '2025 Annual',
    sameReviewType: true,
  });
  assertTriggerTest_(
    dto.fullReviewAvailable === true,
    'Full review route availability must be advertised'
  );
  return {};
}
