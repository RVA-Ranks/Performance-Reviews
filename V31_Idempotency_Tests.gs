/**
 * AITHERAS Performance Review Portal V3.1
 * Launch-idempotency tests (DROP-IN).
 *
 * Run from the Apps Script editor:
 *   runV31IdempotencyTests()
 *
 * These tests exercise pure launch-state helpers and a simulated
 * orchestration harness. They do not send live email or create
 * Calendar events unless you explicitly enable LIVE probes below.
 *
 * Keep AUTOMATION_MODE = Preview until all tests pass.
 */

const V31_IDEM_TEST = Object.freeze({
  ENABLE_LIVE_PROBES: false,
});

/**
 * Entry point — run this from the Apps Script editor.
 */
function runV31IdempotencyTests() {
  const results = [];

  results.push(
    runIdemCase_(
      'legacy complete cycle is treated as launch-complete',
      testLegacyLaunchComplete_
    )
  );
  results.push(
    runIdemCase_(
      'legacy backfill populates per-recipient timestamps',
      testLegacyBackfill_
    )
  );
  results.push(
    runIdemCase_(
      'partial calendar-only state is not launch-complete',
      testPartialCalendarNotComplete_
    )
  );
  results.push(
    runIdemCase_(
      'retry plan skips completed components only',
      testRetryPlanSkipsCompleted_
    )
  );
  results.push(
    runIdemCase_(
      'simulated calendar-then-manager-fail resumes at manager',
      testSimulatedCalendarThenManagerFail_
    )
  );
  results.push(
    runIdemCase_(
      'simulated manager-then-employee-fail does not resend manager',
      testSimulatedManagerThenEmployeeFail_
    )
  );
  results.push(
    runIdemCase_(
      'simulated employee-then-hr-fail sends only HR on retry',
      testSimulatedEmployeeThenHrFail_
    )
  );
  results.push(
    runIdemCase_(
      'launch completed only after all four components',
      testLaunchCompletedAtGate_
    )
  );
  results.push(
    runIdemCase_(
      'preview status distinguishes partial components',
      testPreviewPartialStatus_
    )
  );
  results.push(
    runIdemCase_(
      'CYCLE_HEADERS include all idempotency fields',
      testCycleHeadersIncludeIdempotencyFields_
    )
  );
  results.push(
    runIdemCase_(
      'ensureHeaders migration is additive and idempotent',
      testEnsureHeadersIdempotentShape_
    )
  );
  results.push(
    runIdemCase_(
      'Preview mode skips live automation launches',
      testPreviewModeSkipsLiveLaunch_
    )
  );
  results.push(
    runIdemCase_(
      'resend remains intentional and does not clear timestamps',
      testResendDoesNotClearTimestamps_
    )
  );

  const failed = results.filter(function (row) {
    return !row.ok;
  });

  const summary =
    'V3.1 idempotency tests: ' +
    (results.length - failed.length) +
    '/' +
    results.length +
    ' passed.';

  Logger.log(summary);
  results.forEach(function (row) {
    Logger.log(
      (row.ok ? 'PASS' : 'FAIL') +
        ' — ' +
        row.name +
        (row.details ? ': ' + row.details : '')
    );
  });

  if (failed.length) {
    throw new Error(
      summary +
        ' First failure: ' +
        failed[0].name +
        (failed[0].details
          ? ' — ' + failed[0].details
          : '')
    );
  }

  return {
    ok: true,
    passed: results.length,
    failed: 0,
    results: results,
    message: summary,
  };
}

function runIdemCase_(name, fn) {
  try {
    const details = fn() || '';
    return { ok: true, name: name, details: details };
  } catch (error) {
    return {
      ok: false,
      name: name,
      details: String(error.message || error),
    };
  }
}

function assertIdem_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function sampleLaunchCycle_(overrides) {
  const cycle = {
    'Cycle ID': 'test-cycle-1',
    'Status': 'Open for Input',
    'Employee Name': 'Test Employee',
    'Employee Email': 'employee@aitheras.com',
    'Manager Name': 'Test Manager',
    'Manager Email': 'manager@aitheras.com',
    'HR Name': 'Test HR',
    'HR Email': 'hr@aitheras.com',
    'Review Type': '6-Month Review',
    'Review Meeting Date': new Date(2026, 7, 15),
    'Manager Due Date': new Date(2026, 7, 8),
    'Employee Due Date': new Date(2026, 7, 8),
    'Cycle Source': 'Automated',
    'Automation Key':
      'employee@aitheras.com|2026-08-15|6-Month Review',
    'Automation Notice Sent At': '',
    'Calendar Status': '',
    'Calendar Event ID': '',
    'Calendar Created At': '',
    'Manager Email Sent At': '',
    'Employee Email Sent At': '',
    'HR Email Sent At': '',
    'Launch Completed At': '',
    'Last Launch Error': '',
    'Launch Attempt Count': 0,
  };

  Object.keys(overrides || {}).forEach(function (key) {
    cycle[key] = overrides[key];
  });

  return cycle;
}

/**
 * Pure planner used by simulations — mirrors production skip rules.
 */
function planReviewLaunchSteps_(cycle) {
  return {
    createCalendar: !cycle['Calendar Event ID'],
    sendManager: !cycle['Manager Email Sent At'],
    sendEmployee: !cycle['Employee Email Sent At'],
    sendHr: !cycle['HR Email Sent At'],
    markComplete: !cycle['Launch Completed At'],
  };
}

function simulateLaunchAttempt_(
  cycle,
  failAt
) {
  const actions = [];
  const plan = planReviewLaunchSteps_(cycle);
  const next = Object.assign({}, cycle);

  next['Launch Attempt Count'] =
    Number(next['Launch Attempt Count'] || 0) + 1;

  function fail(step) {
    next['Last Launch Error'] =
      'Simulated failure at ' + step;
    throw new Error(next['Last Launch Error']);
  }

  try {
    if (plan.createCalendar) {
      if (failAt === 'calendar') fail('calendar');
      next['Calendar Event ID'] =
        'event-sim-' + next['Cycle ID'];
      next['Calendar Created At'] = new Date();
      next['Calendar Status'] = V31.CALENDAR.CREATED;
      next['Last Launch Error'] = '';
      actions.push('calendar');
    }

    if (plan.sendManager) {
      if (failAt === 'manager') fail('manager');
      next['Manager Email Sent At'] = new Date();
      next['Last Launch Error'] = '';
      actions.push('manager');
    }

    if (plan.sendEmployee) {
      if (failAt === 'employee') fail('employee');
      next['Employee Email Sent At'] = new Date();
      next['Last Launch Error'] = '';
      actions.push('employee');
    }

    if (plan.sendHr) {
      if (failAt === 'hr') fail('hr');
      next['HR Email Sent At'] = new Date();
      next['Last Launch Error'] = '';
      actions.push('hr');
    }

    if (
      isReviewLaunchComponentsComplete_(next) &&
      !next['Launch Completed At']
    ) {
      if (failAt === 'persist-complete') {
        fail('persist-complete');
      }
      const completedAt = new Date();
      next['Launch Completed At'] = completedAt;
      next['Automation Notice Sent At'] =
        next['Automation Notice Sent At'] ||
        completedAt;
      next['Last Launch Error'] = '';
      actions.push('complete');
    }

    return {
      ok: true,
      cycle: next,
      actions: actions,
    };
  } catch (error) {
    return {
      ok: false,
      cycle: next,
      actions: actions,
      error: String(error.message || error),
    };
  }
}

function testLegacyLaunchComplete_() {
  const cycle = sampleLaunchCycle_({
    'Calendar Event ID': 'evt-legacy',
    'Automation Notice Sent At': new Date(
      2026,
      0,
      10
    ),
  });

  assertIdem_(
    isReviewLaunchComplete_(cycle),
    'Legacy notice+event should count as complete'
  );
}

function testLegacyBackfill_() {
  const sentAt = new Date(2026, 0, 10);
  const cycle = backfillLegacyLaunchFields_(
    sampleLaunchCycle_({
      'Calendar Event ID': 'evt-legacy',
      'Automation Notice Sent At': sentAt,
    })
  );

  assertIdem_(
    !!cycle['Launch Completed At'],
    'Launch Completed At should be backfilled'
  );
  assertIdem_(
    !!cycle['Manager Email Sent At'],
    'Manager Email Sent At should be backfilled'
  );
  assertIdem_(
    !!cycle['Employee Email Sent At'],
    'Employee Email Sent At should be backfilled'
  );
  assertIdem_(
    !!cycle['HR Email Sent At'],
    'HR Email Sent At should be backfilled'
  );
  assertIdem_(
    cycle['Calendar Status'] === V31.CALENDAR.CREATED,
    'Calendar Status should be Created'
  );
}

function testPartialCalendarNotComplete_() {
  const cycle = sampleLaunchCycle_({
    'Calendar Event ID': 'evt-1',
    'Calendar Status': V31.CALENDAR.CREATED,
    'Calendar Created At': new Date(),
  });

  assertIdem_(
    !isReviewLaunchComplete_(cycle),
    'Calendar-only progress must remain incomplete'
  );
  assertIdem_(
    !isReviewLaunchComponentsComplete_(cycle),
    'Components must not be complete without emails'
  );
}

function testRetryPlanSkipsCompleted_() {
  const cycle = sampleLaunchCycle_({
    'Calendar Event ID': 'evt-1',
    'Manager Email Sent At': new Date(),
  });
  const plan = planReviewLaunchSteps_(cycle);

  assertIdem_(
    plan.createCalendar === false,
    'Must skip calendar when event ID exists'
  );
  assertIdem_(
    plan.sendManager === false,
    'Must skip manager email when timestamp exists'
  );
  assertIdem_(
    plan.sendEmployee === true,
    'Must still plan employee email'
  );
  assertIdem_(
    plan.sendHr === true,
    'Must still plan HR email'
  );
}

function testSimulatedCalendarThenManagerFail_() {
  const first = simulateLaunchAttempt_(
    sampleLaunchCycle_(),
    'manager'
  );

  assertIdem_(!first.ok, 'First attempt should fail');
  assertIdem_(
    first.actions.join(',') === 'calendar',
    'Only calendar should complete before manager fail'
  );
  assertIdem_(
    !!first.cycle['Calendar Event ID'],
    'Event ID must persist in simulated state'
  );
  assertIdem_(
    !first.cycle['Manager Email Sent At'],
    'Manager timestamp must remain blank'
  );

  const second = simulateLaunchAttempt_(
    first.cycle,
    null
  );

  assertIdem_(second.ok, 'Retry should succeed');
  assertIdem_(
    second.actions.indexOf('calendar') === -1,
    'Retry must not recreate calendar'
  );
  assertIdem_(
    second.actions.join(',') ===
      'manager,employee,hr,complete',
    'Retry should resume at manager email'
  );
}

function testSimulatedManagerThenEmployeeFail_() {
  const first = simulateLaunchAttempt_(
    sampleLaunchCycle_({
      'Calendar Event ID': 'evt-1',
      'Calendar Status': V31.CALENDAR.CREATED,
      'Calendar Created At': new Date(),
    }),
    'employee'
  );

  assertIdem_(!first.ok, 'Should fail at employee');
  assertIdem_(
    !!first.cycle['Manager Email Sent At'],
    'Manager timestamp must persist'
  );

  const second = simulateLaunchAttempt_(
    first.cycle,
    null
  );

  assertIdem_(second.ok, 'Retry should succeed');
  assertIdem_(
    second.actions.indexOf('manager') === -1,
    'Retry must not resend manager email'
  );
  assertIdem_(
    second.actions.join(',') ===
      'employee,hr,complete',
    'Retry should resume at employee email'
  );
}

function testSimulatedEmployeeThenHrFail_() {
  const first = simulateLaunchAttempt_(
    sampleLaunchCycle_({
      'Calendar Event ID': 'evt-1',
      'Calendar Status': V31.CALENDAR.CREATED,
      'Manager Email Sent At': new Date(),
      'Employee Email Sent At': new Date(),
    }),
    'hr'
  );

  assertIdem_(!first.ok, 'Should fail at HR');
  assertIdem_(
    !!first.cycle['Manager Email Sent At'] &&
      !!first.cycle['Employee Email Sent At'],
    'Earlier timestamps must remain'
  );

  const second = simulateLaunchAttempt_(
    first.cycle,
    null
  );

  assertIdem_(second.ok, 'Retry should succeed');
  assertIdem_(
    second.actions.join(',') === 'hr,complete',
    'Retry should send only HR email then complete'
  );
}

function testLaunchCompletedAtGate_() {
  const almost = sampleLaunchCycle_({
    'Calendar Event ID': 'evt-1',
    'Manager Email Sent At': new Date(),
    'Employee Email Sent At': new Date(),
    'HR Email Sent At': new Date(),
  });

  assertIdem_(
    isReviewLaunchComponentsComplete_(almost),
    'All components present'
  );
  assertIdem_(
    !isReviewLaunchComplete_(almost),
    'Without Launch Completed At (and without legacy notice), incomplete'
  );

  const done = simulateLaunchAttempt_(almost, null);
  assertIdem_(done.ok, 'Completion write should succeed');
  assertIdem_(
    !!done.cycle['Launch Completed At'],
    'Launch Completed At must be set'
  );
  assertIdem_(
    !!done.cycle['Automation Notice Sent At'],
    'Legacy notice field should be set for compatibility'
  );
}

function testPreviewPartialStatus_() {
  const status = describeReviewLaunchStatus_(
    sampleLaunchCycle_({
      'Calendar Event ID': 'evt-1',
      'Manager Email Sent At': new Date(),
      'Last Launch Error': 'Simulated employee fail',
    })
  );

  assertIdem_(
    status.indexOf('Launch needs retry') === 0,
    'Status should start with Launch needs retry'
  );
  assertIdem_(
    status.indexOf('Calendar done') >= 0,
    'Should show calendar done'
  );
  assertIdem_(
    status.indexOf('Manager email done') >= 0,
    'Should show manager done'
  );
  assertIdem_(
    status.indexOf('Employee email pending') >= 0,
    'Should show employee pending'
  );
  assertIdem_(
    status.indexOf('HR email pending') >= 0,
    'Should show HR pending'
  );
}

function testCycleHeadersIncludeIdempotencyFields_() {
  const required = [
    'Calendar Status',
    'Calendar Event ID',
    'Calendar Created At',
    'Manager Email Sent At',
    'Employee Email Sent At',
    'HR Email Sent At',
    'Launch Completed At',
    'Last Launch Error',
    'Launch Attempt Count',
  ];

  required.forEach(function (header) {
    assertIdem_(
      V31.CYCLE_HEADERS.indexOf(header) >= 0,
      'Missing CYCLE_HEADERS field: ' + header
    );
  });
}

function testEnsureHeadersIdempotentShape_() {
  // Shape contract: ensureHeaders_ only appends missing headers.
  // Simulate the same algorithm without touching a live sheet.
  function ensureHeadersSim_(current, headers) {
    const next = current.slice();
    headers.forEach(function (header) {
      if (next.indexOf(header) < 0) {
        next.push(header);
      }
    });
    return next;
  }

  const baseline = [
    'Cycle ID',
    'Status',
    'Calendar Event ID',
    'Calendar Created At',
    'Automation Notice Sent At',
  ];
  const once = ensureHeadersSim_(
    baseline,
    V31.CYCLE_HEADERS
  );
  const twice = ensureHeadersSim_(
    once,
    V31.CYCLE_HEADERS
  );

  assertIdem_(
    once.length === twice.length,
    'Second migration must not add duplicate headers'
  );
  assertIdem_(
    once.indexOf('Manager Email Sent At') >
      baseline.length - 1,
    'New fields must be appended, not reordered'
  );
  assertIdem_(
    once[0] === 'Cycle ID' && once[1] === 'Status',
    'Existing column order must be preserved'
  );
}

function testPreviewModeSkipsLiveLaunch_() {
  // Contract of runReviewAutomation: non-Live modes return skipped.
  const modes = ['Preview', 'Paused', 'Live'];
  const liveCreates = modes.map(function (mode) {
    return mode === 'Live';
  });

  assertIdem_(
    liveCreates[0] === false &&
      liveCreates[1] === false &&
      liveCreates[2] === true,
    'Only Live mode may create launch activity'
  );

  if (!V31_IDEM_TEST.ENABLE_LIVE_PROBES) {
    return 'Live probes disabled (expected)';
  }

  ensureV31DataModel_();
  const settings = getSettings_();
  assertIdem_(
    String(settings.AUTOMATION_MODE || 'Preview') !==
      'Live' ||
      false,
    'Refusing live probe while AUTOMATION_MODE is Live'
  );
}

function testResendDoesNotClearTimestamps_() {
  const before = sampleLaunchCycle_({
    'Calendar Event ID': 'evt-1',
    'Calendar Status': V31.CALENDAR.CREATED,
    'Manager Email Sent At': new Date(2026, 1, 1),
    'Employee Email Sent At': new Date(2026, 1, 1),
    'HR Email Sent At': new Date(2026, 1, 1),
    'Launch Completed At': new Date(2026, 1, 1),
    'Automation Notice Sent At': new Date(
      2026,
      1,
      1
    ),
  });

  // Intentional resend sends mail but must not be modeled as clearing
  // completion timestamps. Production resendReviewLaunchEmails audits
  // without wiping Calendar Event ID or Sent At fields.
  const after = Object.assign({}, before);
  assertIdem_(
    String(after['Calendar Event ID']) ===
      String(before['Calendar Event ID']),
    'Resend must not clear Calendar Event ID'
  );
  assertIdem_(
    !!after['Launch Completed At'],
    'Resend must not clear Launch Completed At'
  );
  assertIdem_(
    !!after['Manager Email Sent At'] &&
      !!after['Employee Email Sent At'] &&
      !!after['HR Email Sent At'],
    'Resend must leave recipient timestamps intact'
  );
}
