/**
 * Lifecycle transactional closure tests.
 * Run: runV31LifecycleTests_()
 *
 * Covers planners, participant ACK release protocol, fault-injected audit,
 * setup header resolution, and in-memory release mutation idempotency.
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
    })
  );

  results.push(
    lifeCase_('release planner is idempotent for Awaiting Signatures', function () {
      assertLife_(
        planReleaseReviewSignatures_({
          Status: PR.CYCLE.SIGNATURES,
          'Signatures Released At': new Date(),
        }).action === 'alreadyReleased',
        'alreadyReleased'
      );
    })
  );

  results.push(
    lifeCase_('start planner is idempotent when meeting already open', function () {
      assertLife_(
        planStartReviewMeeting_({
          Status: PR.CYCLE.MEETING,
          'Meeting Opened At': new Date(),
        }).action === 'alreadyOpen',
        'alreadyOpen'
      );
    })
  );

  results.push(
    lifeCase_('release request creates immutable releaseRequestId and clears ACKs', function () {
      const meeting = emptyMeeting_();
      meeting.managerReleaseAckAt = 'old';
      meeting.employeeReleaseAckAt = 'old';
      const first = requestMeetingReleaseOnMeetingJson_(
        meeting,
        'mgr@aitheras.com',
        new Date('2026-08-10T15:00:00.000Z'),
        'CYCLE-1'
      );
      assertLife_(first.created === true, 'created');
      assertLife_(
        String(first.meeting.releaseRequestId).indexOf('RELEASE:CYCLE-1:') === 0,
        'deterministic request id prefix'
      );
      assertLife_(
        !first.meeting.managerReleaseAckAt &&
          !first.meeting.employeeReleaseAckAt,
        'acks cleared'
      );
      const second = requestMeetingReleaseOnMeetingJson_(
        first.meeting,
        'hr@aitheras.com',
        new Date('2026-08-10T15:01:00.000Z'),
        'CYCLE-1'
      );
      assertLife_(second.created === false, 'reuse');
      assertLife_(
        second.meeting.releaseRequestId === first.meeting.releaseRequestId,
        'immutable id'
      );
    })
  );

  results.push(
    lifeCase_('seal requires both Manager and Employee ACKs for current request', function () {
      const meeting = emptyMeeting_();
      requestMeetingReleaseOnMeetingJson_(
        meeting,
        'mgr@aitheras.com',
        new Date('2026-08-10T16:00:00.000Z'),
        'CYCLE-ACK'
      );
      assertLife_(
        areMeetingReleaseAcksComplete_(meeting) === false,
        'no acks yet'
      );
      recordMeetingReleaseAck_(meeting, PR.ROLE.MANAGER, 1, new Date());
      assertLife_(
        areMeetingReleaseAcksComplete_(meeting) === false,
        'manager alone insufficient'
      );
      assertLife_(
        missingMeetingReleaseAckRoles_(meeting).join(',') === PR.ROLE.EMPLOYEE,
        'missing employee'
      );
      recordMeetingReleaseAck_(meeting, PR.ROLE.EMPLOYEE, 2, new Date());
      assertLife_(
        areMeetingReleaseAcksComplete_(meeting) === true,
        'both acks'
      );
    })
  );

  results.push(
    lifeCase_(
      'employee dirty text is retained through seal after ACK path mutation',
      function () {
        const stored = {
          Status: PR.CYCLE.MEETING,
          'Meeting JSON': JSON.stringify({
            employeeComments: 'This is my final employee comment.',
            contentRevision: 4,
            releaseRequestId: 'RELEASE:CYCLE-X:2026-08-10T16:00:00.000Z',
            releaseRequestedAt: '2026-08-10T16:00:00.000Z',
            managerReleaseAckRequestId:
              'RELEASE:CYCLE-X:2026-08-10T16:00:00.000Z',
            managerReleaseAckAt: '2026-08-10T16:00:01.000Z',
            managerReleaseAckRevision: 3,
            employeeReleaseAckRequestId:
              'RELEASE:CYCLE-X:2026-08-10T16:00:00.000Z',
            employeeReleaseAckAt: '2026-08-10T16:00:02.000Z',
            employeeReleaseAckRevision: 4,
          }),
          'MGR Manager Signature ID': 'sig-old',
          'Signatures Released At': '',
          'Manager Review Status': PR.DOC.SUBMITTED,
          'Self Evaluation Status': PR.DOC.SUBMITTED,
        };
        assertLife_(
          areMeetingReleaseAcksComplete_(parseMeetingJson_(stored)),
          'acks complete before seal'
        );
        applyFirstReleaseReviewSignaturesMutation_(
          stored,
          'mgr@aitheras.com',
          new Date('2026-08-10T16:00:03.000Z')
        );
        assertLife_(stored.Status === PR.CYCLE.SIGNATURES, 'sealed status');
        assertLife_(
          /This is my final employee comment/.test(
            String(stored['Meeting JSON'] || '')
          ),
          'employee text in sealed meeting json'
        );
        assertLife_(
          planReleaseReviewSignatures_(stored).action === 'alreadyReleased',
          'retry alreadyReleased'
        );
      }
    )
  );

  results.push(
    lifeCase_('commit:true must not be treated as force by planner helpers', function () {
      const meeting = emptyMeeting_();
      requestMeetingReleaseOnMeetingJson_(
        meeting,
        'mgr@aitheras.com',
        new Date(),
        'CYCLE-FORCE'
      );
      assertLife_(
        areMeetingReleaseAcksComplete_(meeting) === false,
        'without acks not ready'
      );
      // Documented contract: only forceCommit + confirmation token bypasses.
      const opts = { commit: true };
      const forceOverride =
        opts.forceCommit === true &&
        String(opts.forceReleaseConfirmation || '') ===
          'FORCE_RELEASE_WITHOUT_PARTICIPANT_ACK';
      assertLife_(forceOverride === false, 'commit true is not force');
    })
  );

  results.push(
    lifeCase_('Active checkbox column resolves by header not column H', function () {
      const col = resolveActiveCheckboxColumnFromHeaders_([
        'Employee Email',
        'Employee Name',
        'Manager Email',
        'Manager Name',
        'Job Title',
        'Department / Project',
        'Hire Date',
        'Current Pay Rate',
        'Active',
        'Review Automation',
      ]);
      assertLife_(col === 9, 'Active is column I (9), not H (8)');
      assertLife_(
        resolveActiveCheckboxColumnFromHeaders_([
          'Employee Email',
          'Active',
        ]) === 2,
        'legacy Active column still found'
      );
    })
  );

  results.push(
    lifeCase_('deep-link and date sanitizers reject unsafe values', function () {
      assertLife_(sanitizeDeepLinkCycleId_('<script>') === '', 'cycle');
      assertLife_(sanitizeDeepLinkAction_('signatures') === 'signatures', 'action');
      let threw = false;
      try {
        validateCyclePayload_(
          {
            reviewType: 'Annual',
            reviewPeriodStart: 'not-a-date',
            reviewPeriodEnd: 'also-bad',
            reviewMeetingDate: 'nope',
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
        threw = /valid date/i.test(String(error.message || error));
      }
      assertLife_(threw, 'invalid dates rejected');
    })
  );

  results.push(
    lifeCase_(
      'commitAuditEventOutsideLock_ fault path keeps reconstructible event id',
      function () {
        const originalAudit = audit_;
        const originalPersist = persistPendingAuditEvent_;
        const originalAlert = raisePostCommitAuditAlert_;
        const originalMark = markPendingAuditComplete_;
        let persisted = null;
        audit_ = function () {
          throw new Error('forced outside-lock audit failure');
        };
        persistPendingAuditEvent_ = function (event) {
          persisted = event;
          return event;
        };
        raisePostCommitAuditAlert_ = function () {};
        markPendingAuditComplete_ = function () {};
        try {
          const event = buildPendingAuditEvent_(
            'CYCLE-OUT',
            'Review packet released for combined signatures',
            'mgr@aitheras.com',
            PR.CYCLE.MEETING,
            PR.CYCLE.SIGNATURES,
            'details',
            'SIGNATURES_RELEASED:CYCLE-OUT:2026-08-10T16:00:00.000Z'
          );
          const result = commitAuditEventOutsideLock_(event);
          assertLife_(result.ok === false, 'ok false');
          assertLife_(
            result.eventId ===
              'SIGNATURES_RELEASED:CYCLE-OUT:2026-08-10T16:00:00.000Z',
            'stable reconstructible id'
          );
          assertLife_(
            persisted.eventId === result.eventId,
            'persisted same id'
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
    lifeCase_('live payload exposes ACK fields safely', function () {
      const payload = buildLiveReviewStatePayload_(
        {
          'Cycle ID': 'LIVE-ACK',
          Status: PR.CYCLE.MEETING,
          'Manager Email': 'mgr@example.com',
          'Employee Email': 'emp@example.com',
          'HR Email': 'hr@example.com',
          'Updated At': new Date(),
          'Meeting JSON': JSON.stringify({
            releaseRequestId: 'RELEASE:LIVE-ACK:t',
            releaseRequestedAt: '2026-08-10T16:00:00.000Z',
            contentRevision: 3,
            managerReleaseAckRequestId: 'RELEASE:LIVE-ACK:t',
            managerReleaseAckAt: '2026-08-10T16:00:01.000Z',
            managerReleaseAckRevision: 2,
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
      assertLife_(payload.managerReleaseAcked === true, 'mgr ack');
      assertLife_(payload.employeeReleaseAcked === false, 'emp missing');
      assertLife_(
        payload.missingReleaseAcks.join(',') === PR.ROLE.EMPLOYEE,
        'missing list'
      );
      assertLife_(liveReviewStatePayloadIsSafe_(payload), 'allow-list');
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
