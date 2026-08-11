/**
 * Lifecycle transactional closure tests (pure planners + audit helper).
 * Run: runV31LifecycleTests_()
 *
 * Covers Coach P0–P3 blockers: release/start idempotency planners,
 * meeting seal markers, and post-commit audit non-throw contract.
 */

function runV31LifecycleTests_() {
  const results = [];

  results.push(
    lifeCase_('release planner rejects non-meeting status', function () {
      const plan = planReleaseReviewSignatures_({
        Status: PR.CYCLE.READY,
        'Signatures Released At': '',
      });
      assertLife_(plan.action === 'reject', 'expect reject');
      assertLife_(
        /meeting must be open/i.test(plan.message),
        'meeting-open message'
      );
    })
  );

  results.push(
    lifeCase_('release planner is idempotent for Awaiting Signatures', function () {
      const plan = planReleaseReviewSignatures_({
        Status: PR.CYCLE.SIGNATURES,
        'Signatures Released At': new Date(),
      });
      assertLife_(plan.action === 'alreadyReleased', 'alreadyReleased');
    })
  );

  results.push(
    lifeCase_(
      'release planner treats SIGNATURES without marker as alreadyReleased',
      function () {
        const plan = planReleaseReviewSignatures_({
          Status: PR.CYCLE.SIGNATURES,
          'Signatures Released At': '',
        });
        assertLife_(
          plan.action === 'alreadyReleased',
          'missing marker must not reject as meeting-not-open'
        );
      }
    )
  );

  results.push(
    lifeCase_('release planner returns current for Finalizing/Complete', function () {
      assertLife_(
        planReleaseReviewSignatures_({
          Status: PR.CYCLE.FINALIZING,
        }).action === 'returnCurrent',
        'Finalizing'
      );
      assertLife_(
        planReleaseReviewSignatures_({
          Status: PR.CYCLE.COMPLETE,
        }).action === 'returnCurrent',
        'Complete'
      );
    })
  );

  results.push(
    lifeCase_('release planner allows first release from Meeting Open', function () {
      const plan = planReleaseReviewSignatures_({
        Status: PR.CYCLE.MEETING,
        'Signatures Released At': '',
      });
      assertLife_(plan.action === 'release', 'release');
    })
  );

  results.push(
    lifeCase_('start planner is idempotent when meeting already open', function () {
      const plan = planStartReviewMeeting_({
        Status: PR.CYCLE.MEETING,
        'Meeting Opened At': new Date(),
      });
      assertLife_(plan.action === 'alreadyOpen', 'alreadyOpen');
    })
  );

  results.push(
    lifeCase_('start planner returns alreadyOpen past meeting stage', function () {
      assertLife_(
        planStartReviewMeeting_({
          Status: PR.CYCLE.SIGNATURES,
        }).action === 'alreadyOpen',
        'Signatures'
      );
      assertLife_(
        planStartReviewMeeting_({
          Status: PR.CYCLE.FINALIZING,
        }).action === 'alreadyOpen',
        'Finalizing'
      );
    })
  );

  results.push(
    lifeCase_('start planner opens from Ready', function () {
      const plan = planStartReviewMeeting_({
        Status: PR.CYCLE.READY,
        'Meeting Opened At': '',
      });
      assertLife_(plan.action === 'open', 'open');
    })
  );

  results.push(
    lifeCase_('start planner rejects Open/not-ready', function () {
      const plan = planStartReviewMeeting_({
        Status: PR.CYCLE.OPEN,
      });
      assertLife_(plan.action === 'reject', 'reject');
    })
  );

  results.push(
    lifeCase_('meeting seal stamps sealedAt once', function () {
      const cycle = {
        'Meeting JSON': JSON.stringify({
          managerFinalComments: 'ok',
          developmentGoals: '',
          actionSteps: '',
          employeeComments: 'note',
          lastSavedAt: '2026-08-10T12:00:00.000Z',
        }),
      };
      const first = sealMeetingJsonOnRelease_(
        cycle,
        'mgr@aitheras.com',
        new Date('2026-08-10T13:00:00.000Z')
      );
      assertLife_(!!first.sealedAt, 'sealedAt set');
      assertLife_(
        first.sealedBy === 'mgr@aitheras.com',
        'sealedBy normalized'
      );
      const sealedAt = first.sealedAt;
      sealMeetingJsonOnRelease_(
        cycle,
        'other@aitheras.com',
        new Date('2026-08-10T14:00:00.000Z')
      );
      const again = parseJson_(cycle['Meeting JSON'], emptyMeeting_());
      assertLife_(again.sealedAt === sealedAt, 'seal is sticky');
      assertLife_(
        again.sealedBy === 'mgr@aitheras.com',
        'first sealer retained'
      );
    })
  );

  results.push(
    lifeCase_('already-sealed meeting response is non-throwing success', function () {
      const response = meetingNotesAlreadySealedResponse_({
        'Meeting JSON': JSON.stringify({
          lastSavedAt: '2026-08-10T12:00:00.000Z',
          sealedAt: '2026-08-10T13:00:00.000Z',
        }),
      });
      assertLife_(response.ok === true, 'ok');
      assertLife_(response.alreadySealed === true, 'alreadySealed');
      assertLife_(/sealed/i.test(response.message), 'message');
    })
  );

  results.push(
    lifeCase_(
      'tryAuditAfterCommit_ returns warning instead of throwing',
      function () {
        const original = audit_;
        audit_ = function () {
          throw new Error('forced audit failure');
        };
        try {
          const result = tryAuditAfterCommit_(
            'CYCLE-AUDIT',
            'test action',
            'actor@aitheras.com',
            'A',
            'B',
            ''
          );
          assertLife_(result.ok === false, 'ok false');
          assertLife_(!!result.warning, 'warning present');
          assertLife_(/audit trail write failed/i.test(result.warning), 'copy');
        } finally {
          audit_ = original;
        }
      }
    )
  );

  results.push(
    lifeCase_('tryAuditAfterCommit_ success path', function () {
      const original = audit_;
      let called = false;
      audit_ = function () {
        called = true;
      };
      try {
        const result = tryAuditAfterCommit_(
          'CYCLE-AUDIT-OK',
          'test action',
          'actor@aitheras.com',
          'A',
          'B',
          ''
        );
        assertLife_(called === true, 'audit invoked');
        assertLife_(result.ok === true, 'ok');
        assertLife_(result.warning === '', 'no warning');
      } finally {
        audit_ = original;
      }
    })
  );

  const failed = results.filter(function (row) {
    return !row.ok;
  });
  const summary =
    'V31 lifecycle tests: ' +
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

function lifeCase_(name, fn) {
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

function assertLife_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
