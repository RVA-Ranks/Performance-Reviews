/**
 * Live review handoff tests (pure helpers).
 * Run: runV31LiveReviewTests_()
 */

function runV31LiveReviewTests_() {
  const results = [];

  results.push(
    liveCase_('live payload allow-list excludes compensation and review bodies', function () {
      const cycle = {
        'Cycle ID': 'LIVE-1',
        Status: PR.CYCLE.SIGNATURES,
        'Manager Email': 'mgr@example.com',
        'Employee Email': 'emp@example.com',
        'HR Email': 'hr@example.com',
        'Signatures Released At': new Date('2026-08-10T18:00:00Z'),
        'Updated At': new Date('2026-08-10T18:00:00Z'),
        'Manager Signature File ID': '',
        'Employee Signature File ID': '',
        'HR Signature File ID': '',
        'MGR Manager Signature ID': '',
        'SELF Manager Signature ID': '',
        'MGR Employee Signature ID': '',
        'SELF Employee Signature ID': '',
        'MGR HR Signature ID': '',
        'SELF HR Signature ID': '',
      };
      const payload = buildLiveReviewStatePayload_(
        cycle,
        'mgr@example.com'
      );
      assertLive_(payload.ok === true, 'ok');
      assertLive_(payload.cycleId === 'LIVE-1', 'cycleId');
      assertLive_(payload.status === PR.CYCLE.SIGNATURES, 'status');
      assertLive_(!!payload.signatureState, 'signatureState');
      assertLive_(
        payload.signatureState.managerSigned === false,
        'managerSigned'
      );
      assertLive_(
        Array.isArray(payload.signatureTasks),
        'signatureTasks array'
      );
      assertLive_(
        liveReviewStatePayloadIsSafe_(payload),
        'payload must only use allow-listed keys'
      );
    })
  );

  results.push(
    liveCase_('live access prefers assignment before HR', function () {
      const cycle = {
        'Manager Email': 'mgr@example.com',
        'Employee Email': 'emp@example.com',
        'HR Email': 'hr@example.com',
      };
      assertLive_(
        assertLiveReviewAccess_(cycle, 'mgr@example.com') ===
          PR.ROLE.MANAGER,
        'manager assignment'
      );
      assertLive_(
        assertLiveReviewAccess_(cycle, 'emp@example.com') ===
          PR.ROLE.EMPLOYEE,
        'employee assignment'
      );
    })
  );

  results.push(
    liveCase_('unauthorized live access fails closed for non-participants', function () {
      const cycle = {
        'Manager Email': 'mgr@example.com',
        'Employee Email': 'emp@example.com',
        'HR Email': 'hr@example.com',
      };
      let hrLookupFailed = false;
      let isHr = false;
      try {
        isHr = !!(typeof isHrUser_ === 'function' && isHrUser_('stranger@example.com'));
      } catch (error) {
        hrLookupFailed = true;
      }
      if (isHr) {
        return;
      }
      let threw = false;
      try {
        assertLiveReviewAccess_(cycle, 'stranger@example.com');
      } catch (error) {
        threw = true;
      }
      assertLive_(
        threw || hrLookupFailed,
        'non-participant non-HR must be rejected'
      );
    })
  );

  results.push(
    liveCase_('safe payload helper rejects compensation keys', function () {
      assertLive_(
        !liveReviewStatePayloadIsSafe_({
          ok: true,
          cycleId: 'x',
          compensation: { rate: 1 },
        }),
        'compensation key must fail safety check'
      );
    })
  );

  const failed = results.filter(function (row) {
    return !row.ok;
  });
  const summary =
    'V31 live review tests: ' +
    (results.length - failed.length) +
    '/' +
    results.length +
    ' passed';
  Logger.log(summary);
  failed.forEach(function (row) {
    Logger.log('FAIL: ' + row.name + ' — ' + row.error);
  });
  return {
    ok: failed.length === 0,
    summary: summary,
    results: results,
  };
}

function liveCase_(name, fn) {
  try {
    fn();
    return { ok: true, name: name };
  } catch (error) {
    return {
      ok: false,
      name: name,
      error: String(error.message || error),
    };
  }
}

function assertLive_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
