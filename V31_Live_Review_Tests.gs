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
        'mgr@example.com',
        PR.ROLE.MANAGER
      );
      assertLive_(payload.ok === true, 'ok');
      assertLive_(payload.cycleId === 'LIVE-1', 'cycleId');
      assertLive_(payload.status === PR.CYCLE.SIGNATURES, 'status');
      assertLive_(payload.viewerRole === PR.ROLE.MANAGER, 'viewerRole');
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
    liveCase_('viewerRole uses authorized role not only cycle HR Email', function () {
      const cycle = {
        'Cycle ID': 'LIVE-HR',
        Status: PR.CYCLE.MEETING,
        'Manager Email': 'mgr@example.com',
        'Employee Email': 'emp@example.com',
        'HR Email': 'assigned-hr@example.com',
        'Updated At': new Date(),
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
        'other-hr@example.com',
        PR.ROLE.HR
      );
      assertLive_(
        payload.viewerRole === PR.ROLE.HR,
        'authorized HR viewerRole must be HR even when email differs from cycle HR Email'
      );
    })
  );

  results.push(
    liveCase_('stale updatedAtIso is rejected by monotonic guard', function () {
      assertLive_(
        isLiveReviewStateStale_(
          '2026-08-10T18:00:00.000Z',
          '2026-08-10T18:01:00.000Z'
        ) === true,
        'older incoming is stale'
      );
      assertLive_(
        isLiveReviewStateStale_(
          '2026-08-10T18:02:00.000Z',
          '2026-08-10T18:01:00.000Z'
        ) === false,
        'newer incoming is accepted'
      );
      assertLive_(
        isLiveReviewStateStale_('', '2026-08-10T18:01:00.000Z') === false,
        'blank incoming is not treated as stale'
      );
    })
  );

  results.push(
    liveCase_('review submit contract rejects document status as cycleStatus', function () {
      assertLive_(
        assertReviewSubmitResultContract_({
          documentStatus: PR.DOC.SUBMITTED,
          cycleStatus: PR.CYCLE.OPEN,
        }) === true,
        'Open cycleStatus accepted'
      );
      assertLive_(
        assertReviewSubmitResultContract_({
          documentStatus: PR.DOC.SUBMITTED,
          cycleStatus: PR.CYCLE.READY,
        }) === true,
        'Ready cycleStatus accepted'
      );
      let rejected = false;
      try {
        assertReviewSubmitResultContract_({
          documentStatus: PR.DOC.SUBMITTED,
          cycleStatus: PR.DOC.SUBMITTED,
        });
      } catch (error) {
        rejected = /Submitted/i.test(String(error.message || error));
      }
      assertLive_(rejected, 'Submitted cycleStatus rejected');
    })
  );

  results.push(
    liveCase_('finalization continuation is HR-leader only', function () {
      assertLive_(
        shouldKickFinalizationContinuationAsLeader_({ asLeader: true }) ===
          true,
        'HR signature leader kicks'
      );
      assertLive_(
        shouldKickFinalizationContinuationAsLeader_({}) === false,
        'empty options do not kick'
      );
      assertLive_(
        shouldKickFinalizationContinuationAsLeader_({ asLeader: false }) ===
          false,
        'asLeader false does not kick'
      );
      assertLive_(
        shouldKickFinalizationContinuationAsLeader_(null) === false,
        'null options do not kick'
      );
      assertLive_(
        typeof continueReviewFinalization === 'function',
        'continueReviewFinalization exists'
      );
    })
  );

  results.push(
    liveCase_('post-lock cycleStatus prefers reread Ready over saved Open', function () {
      assertLive_(
        preferAuthoritativeCycleStatus_(
          PR.CYCLE.OPEN,
          PR.CYCLE.READY
        ) === PR.CYCLE.READY,
        'reread Ready wins'
      );
      assertLive_(
        preferAuthoritativeCycleStatus_(PR.CYCLE.OPEN, '') === PR.CYCLE.OPEN,
        'blank reread falls back to saved'
      );
      assertLive_(
        preferAuthoritativeCycleStatus_(
          PR.DOC.SUBMITTED,
          PR.CYCLE.READY
        ) === PR.CYCLE.READY,
        'never keep document Submitted when reread is Ready'
      );
    })
  );

  results.push(
    liveCase_('live Cycle-ID lookup range is one column / lastRow-1 rows', function () {
      const args = liveCycleIdLookupRangeArgs_(4, 12);
      assertLive_(args.row === 2, 'row');
      assertLive_(args.column === 4, 'column');
      assertLive_(args.numRows === 11, 'numRows');
      assertLive_(args.numColumns === 1, 'numColumns');
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

  results.push(
    liveCase_('Signature Ready title restores only when tab is visible', function () {
      assertLive_(
        shouldRestoreLiveReviewDocumentTitle_(true) === false,
        'hidden tab must keep Signature Ready title'
      );
      assertLive_(
        shouldRestoreLiveReviewDocumentTitle_(false) === true,
        'visible tab may restore normal title'
      );
    })
  );

  results.push(
    liveCase_('email acceleration ok:false must warn without rolling back', function () {
      assertLive_(
        shouldWarnSignatureReleaseEmailAcceleration_({ ok: false, results: [] }) ===
          true,
        'partial failure must warn'
      );
      assertLive_(
        shouldWarnSignatureReleaseEmailAcceleration_({ ok: true }) === false,
        'full success must not warn'
      );
      assertLive_(
        shouldWarnSignatureReleaseEmailAcceleration_(null) === true,
        'missing result must warn'
      );
    })
  );

  results.push(
    liveCase_('Index.html locks submit editability and refreshes on live transitions', function () {
      const html = HtmlService.createHtmlOutputFromFile('Index').getContent();
      assertLive_(
        html.indexOf('function reconcileCurrentCyclePrimaryAction_') !== -1,
        'reconcileCurrentCyclePrimaryAction_ must exist'
      );
      assertLive_(
        html.indexOf('canEditManagerReview = false') !== -1,
        'manager submit must clear canEditManagerReview'
      );
      assertLive_(
        html.indexOf('canEditSelfEvaluation = false') !== -1,
        'employee submit must clear canEditSelfEvaluation'
      );
      assertLive_(
        html.indexOf('managerReview = deepClone') !== -1,
        'manager submit must seal local draft into managerReview'
      );
      assertLive_(
        html.indexOf('selfEvaluation = deepClone') !== -1,
        'employee submit must seal local draft into selfEvaluation'
      );
      assertLive_(
        html.indexOf('meaningfulLiveTransition') !== -1,
        'live poll must gate summary rerender on meaningful transitions'
      );
      assertLive_(
        html.indexOf('refreshLocalSummaryViews_()') !== -1,
        'meaningful live transitions must call refreshLocalSummaryViews_'
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
