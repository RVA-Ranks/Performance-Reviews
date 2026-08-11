/**
 * Lifecycle transactional closure tests.
 * Run: runV31LifecycleTests_()
 *
 * Covers planners, meeting-release handshake, fault-injected audit commit,
 * and in-memory first-release mutation idempotency.
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
      const again = parseMeetingJson_(cycle);
      assertLife_(again.sealedAt === sealedAt, 'seal is sticky');
      assertLife_(
        again.sealedBy === 'mgr@aitheras.com',
        'first sealer retained'
      );
    })
  );

  results.push(
    lifeCase_('release request barrier is sticky until seal', function () {
      const meeting = emptyMeeting_();
      const first = requestMeetingReleaseOnMeetingJson_(
        meeting,
        'mgr@aitheras.com',
        new Date('2026-08-10T15:00:00.000Z')
      );
      assertLife_(first.created === true, 'created');
      assertLife_(!!first.meeting.releaseRequestedAt, 'requestedAt');
      const second = requestMeetingReleaseOnMeetingJson_(
        first.meeting,
        'hr@aitheras.com',
        new Date('2026-08-10T15:01:00.000Z')
      );
      assertLife_(second.created === false, 'not recreated');
      assertLife_(
        second.meeting.releaseRequestedBy === 'mgr@aitheras.com',
        'first requester retained'
      );
    })
  );

  results.push(
    lifeCase_('meeting release sync readiness uses draft window', function () {
      const meeting = {
        releaseRequestedAt: new Date(
          Date.now() - MEETING_RELEASE_DRAFT_SYNC_MS - 100
        ).toISOString(),
      };
      assertLife_(
        isMeetingReleaseSyncReady_(meeting, Date.now()) === true,
        'ready after window'
      );
      const fresh = {
        releaseRequestedAt: new Date().toISOString(),
      };
      assertLife_(
        isMeetingReleaseSyncReady_(fresh, Date.now()) === false,
        'not ready immediately'
      );
    })
  );

  results.push(
    lifeCase_('already-sealed meeting response preserves local draft flag', function () {
      const response = meetingNotesAlreadySealedResponse_({
        'Meeting JSON': JSON.stringify({
          lastSavedAt: '2026-08-10T12:00:00.000Z',
          sealedAt: '2026-08-10T13:00:00.000Z',
        }),
      });
      assertLife_(response.ok === true, 'ok');
      assertLife_(response.alreadySealed === true, 'alreadySealed');
      assertLife_(response.preserveLocalDraft === true, 'preserveLocalDraft');
      assertLife_(/copy/i.test(response.message), 'message asks to keep text');
    })
  );

  results.push(
    lifeCase_(
      'first release mutation clears signatures only once; planner then alreadyReleased',
      function () {
        const stored = {
          Status: PR.CYCLE.MEETING,
          'Meeting JSON': JSON.stringify({
            employeeComments: 'keep me',
            contentRevision: 2,
          }),
          'MGR Manager Signature ID': 'sig-old',
          'SELF Manager Signature ID': 'sig-old',
          'Signatures Released At': '',
          'Manager Review Status': PR.DOC.SUBMITTED,
          'Self Evaluation Status': PR.DOC.SUBMITTED,
        };
        assertLife_(
          planReleaseReviewSignatures_(stored).action === 'release',
          'first plan release'
        );
        applyFirstReleaseReviewSignaturesMutation_(
          stored,
          'mgr@aitheras.com',
          new Date('2026-08-10T16:00:00.000Z')
        );
        assertLife_(
          stored.Status === PR.CYCLE.SIGNATURES,
          'status signatures'
        );
        assertLife_(
          String(stored['MGR Manager Signature ID'] || '') === '',
          'cleared once'
        );
        assertLife_(
          !!parseMeetingJson_(stored).sealedAt,
          'meeting sealed'
        );
        assertLife_(
          /keep me/.test(String(stored['Meeting JSON'] || '')),
          'employee comments retained through seal'
        );
        const plan2 = planReleaseReviewSignatures_(stored);
        assertLife_(plan2.action === 'alreadyReleased', 'second plan');
        // Simulate lost-response retry: planner forbids another clear.
        const before = String(stored['MGR Manager Signature ID'] || 'x');
        assertLife_(
          plan2.action !== 'release',
          'must not re-enter clear path'
        );
        assertLife_(before === '', 'signature fields stay empty');
      }
    )
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
          assertLife_(!!result.eventId, 'eventId assigned');
          assertLife_(!!result.event, 'event payload returned');
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

  results.push(
    lifeCase_(
      'commitAuditEventOutsideLock_ fault path persists recoverable event shape',
      function () {
        const originalAudit = audit_;
        const originalPersist = persistPendingAuditEvent_;
        const originalAlert = raisePostCommitAuditAlert_;
        const originalMark = markPendingAuditComplete_;
        let persisted = null;
        let alerted = null;
        audit_ = function () {
          throw new Error('forced outside-lock audit failure');
        };
        persistPendingAuditEvent_ = function (event, err) {
          persisted = { event: event, err: err };
          return event;
        };
        raisePostCommitAuditAlert_ = function (event, err) {
          alerted = { event: event, err: err };
        };
        markPendingAuditComplete_ = function () {};
        try {
          const event = buildPendingAuditEvent_(
            'CYCLE-OUT',
            'Review packet released for combined signatures',
            'mgr@aitheras.com',
            PR.CYCLE.MEETING,
            PR.CYCLE.SIGNATURES,
            'details'
          );
          const result = commitAuditEventOutsideLock_(event);
          assertLife_(result.ok === false, 'ok false');
          assertLife_(result.eventId === event.eventId, 'stable event id');
          assertLife_(!!persisted, 'pending persisted');
          assertLife_(
            persisted.event.eventId === event.eventId,
            'persisted event id'
          );
          assertLife_(
            persisted.event.actorEmail === 'mgr@aitheras.com',
            'actor preserved'
          );
          assertLife_(
            persisted.event.previousStatus === PR.CYCLE.MEETING,
            'previous status'
          );
          assertLife_(
            persisted.event.newStatus === PR.CYCLE.SIGNATURES,
            'new status'
          );
          assertLife_(!!alerted, 'alert raised');
          assertLife_(
            /Retry Audit/i.test(result.warning),
            'warning points to Retry Audit'
          );
        } finally {
          audit_ = originalAudit;
          persistPendingAuditEvent_ = originalPersist;
          raisePostCommitAuditAlert_ = originalAlert;
          markPendingAuditComplete_ = originalMark;
        }
      }
    )
  );

  results.push(
    lifeCase_('deep-link cycleId sanitizer rejects unsafe values', function () {
      assertLife_(sanitizeDeepLinkCycleId_('') === '', 'empty');
      assertLife_(
        sanitizeDeepLinkCycleId_('<script>') === '',
        'script rejected'
      );
      assertLife_(
        sanitizeDeepLinkCycleId_('abc') === '',
        'too short'
      );
      assertLife_(
        sanitizeDeepLinkCycleId_('cycle-1234-ABCD') ===
          'cycle-1234-ABCD',
        'token accepted'
      );
    })
  );

  results.push(
    lifeCase_('deep-link action sanitizer allow-lists only', function () {
      assertLife_(sanitizeDeepLinkAction_('signatures') === 'signatures', 'ok');
      assertLife_(sanitizeDeepLinkAction_('javascript:alert(1)') === '', 'reject');
      assertLife_(sanitizeDeepLinkAction_('meeting') === 'meeting', 'meeting');
    })
  );

  results.push(
    lifeCase_('period start after end is rejected by validator helper', function () {
      let threw = false;
      try {
        validateCyclePayload_(
          {
            reviewType: 'Annual',
            reviewPeriodStart: '2026-12-31',
            reviewPeriodEnd: '2026-01-01',
            reviewMeetingDate: '2026-06-01',
            employeeName: 'Emp',
            employeeEmail: 'emp@aitheras.com',
            employeeJobTitle: 'Role',
            departmentProject: 'Dept',
            managerName: 'Mgr',
            managerEmail: 'mgr@aitheras.com',
          },
          'aitheras.com'
        );
      } catch (error) {
        threw = /period start/i.test(String(error.message || error));
      }
      assertLife_(threw, 'chronology rejected');
    })
  );

  results.push(
    lifeCase_('live payload allow-list includes meeting release sync fields', function () {
      const payload = buildLiveReviewStatePayload_(
        {
          'Cycle ID': 'LIVE-REL',
          Status: PR.CYCLE.MEETING,
          'Manager Email': 'mgr@example.com',
          'Employee Email': 'emp@example.com',
          'HR Email': 'hr@example.com',
          'Updated At': new Date(),
          'Meeting JSON': JSON.stringify({
            releaseRequestedAt: '2026-08-10T16:00:00.000Z',
            contentRevision: 3,
            lastSavedAt: '2026-08-10T15:59:00.000Z',
          }),
          'Manager Signature File ID': '',
          'Employee Signature File ID': '',
          'HR Signature File ID': '',
          'MGR Manager Signature ID': '',
          'SELF Manager Signature ID': '',
          'MGR Employee Signature ID': '',
          'SELF Employee Signature ID': '',
          'MGR HR Signature ID': '',
          'SELF HR Signature ID': '',
        },
        'mgr@example.com',
        PR.ROLE.MANAGER
      );
      assertLife_(payload.meetingReleasePending === true, 'pending');
      assertLife_(payload.meetingContentRevision === 3, 'revision');
      assertLife_(
        liveReviewStatePayloadIsSafe_(payload),
        'allow-list safe'
      );
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
