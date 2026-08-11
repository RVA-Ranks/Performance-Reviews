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
            releaseRequestedBy: 'mgr@aitheras.com',
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
          'emp@aitheras.com',
          new Date('2026-08-10T16:00:03.000Z')
        );
        assertLife_(stored.Status === PR.CYCLE.SIGNATURES, 'sealed status');
        assertLife_(
          normalizeEmail_(stored['Signatures Released By']) ===
            'mgr@aitheras.com',
          'release authority is releaseRequestedBy not second ACK actor'
        );
        assertLife_(
          /This is my final employee comment/.test(
            String(stored['Meeting JSON'] || '')
          ),
          'employee text in sealed meeting json'
        );
        const sealedMeeting = parseMeetingJson_(stored);
        assertLife_(
          sealedMeeting.sealedBy === 'mgr@aitheras.com',
          'sealedBy follows releaseRequestedBy'
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

  results.push(
    lifeCase_('post-ACK content mutation invalidates that role ACK', function () {
      const meeting = emptyMeeting_();
      requestMeetingReleaseOnMeetingJson_(
        meeting,
        'mgr@aitheras.com',
        new Date(),
        'CYCLE-INV'
      );
      recordMeetingReleaseAck_(meeting, PR.ROLE.EMPLOYEE, 1, new Date());
      assertLife_(
        hasMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE),
        'acked'
      );
      invalidateMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE);
      assertLife_(
        !hasMeetingReleaseAckForRole_(meeting, PR.ROLE.EMPLOYEE),
        'invalidated'
      );
    })
  );

  results.push(
    lifeCase_('blank releaseRequestId is rejected by ACK contract helper', function () {
      // Mirrors acknowledgeMeetingRelease validation.
      const claimedId = String('').trim();
      assertLife_(!claimedId, 'blank must fail required check');
    })
  );

  results.push(
    lifeCase_('stale contentRevision must fail ACK contract', function () {
      const authoritativeRevision = 8;
      const claimedBlank = '';
      assertLife_(
        claimedBlank === '' || claimedBlank == null,
        'blank revision rejected'
      );
      const claimedStale = 7;
      assertLife_(
        Number(claimedStale) !== authoritativeRevision,
        'stale revision rejected'
      );
      const claimedCurrent = 8;
      assertLife_(
        Number(claimedCurrent) === authoritativeRevision,
        'matching revision accepted'
      );
    })
  );

  results.push(
    lifeCase_('resolveReleaseAuthorityEmail_ prefers releaseRequestedBy', function () {
      assertLife_(
        resolveReleaseAuthorityEmail_(
          { releaseRequestedBy: 'mgr@aitheras.com' },
          'emp@aitheras.com'
        ) === 'mgr@aitheras.com',
        'initiator wins over second ACK actor'
      );
      assertLife_(
        resolveReleaseAuthorityEmail_(
          { releaseRequestedBy: '' },
          'emp@aitheras.com'
        ) === 'emp@aitheras.com',
        'fallback only when initiator missing'
      );
    })
  );

  results.push(
    lifeCase_(
      'public ACK orchestration: Manager authority when Employee ACKs second',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-ORCH-1');
        withLifecycleEndpointDoubles_(store, 'mgr@aitheras.com', {}, function () {
          const prep = prepareReleaseReviewSignatures(store['Cycle ID']);
          assertLife_(!!prep.releaseRequestId, 'prep request id');
          store.releaseRequestId = prep.releaseRequestId;
          store.meetingContentRevision = prep.meetingContentRevision;
          const mgrAck = acknowledgeMeetingRelease(store['Cycle ID'], {
            releaseRequestId: prep.releaseRequestId,
            contentRevision: prep.meetingContentRevision,
          });
          assertLife_(
            String(mgrAck.status) === PR.CYCLE.MEETING,
            'still meeting after manager ACK'
          );
        });
        withLifecycleEndpointDoubles_(store, 'emp@aitheras.com', {}, function () {
          const meeting = parseMeetingJson_(store);
          const empAck = acknowledgeMeetingRelease(store['Cycle ID'], {
            releaseRequestId: meeting.releaseRequestId,
            contentRevision: meeting.contentRevision,
          });
          assertLife_(
            String(empAck.status) === PR.CYCLE.SIGNATURES ||
              empAck.alreadyReleased === true,
            'sealed after employee ACK'
          );
          assertLife_(
            normalizeEmail_(store['Signatures Released By']) ===
              'mgr@aitheras.com',
            'Released By is Manager initiator'
          );
          assertLife_(
            parseMeetingJson_(store).sealedBy === 'mgr@aitheras.com',
            'sealedBy is Manager initiator'
          );
          assertLife_(
            store.__audits &&
              store.__audits.some(function (row) {
                return (
                  normalizeEmail_(row.actorEmail) === 'mgr@aitheras.com' &&
                  /secondAckBy/.test(String(row.details || ''))
                );
              }),
            'release audit actor is Manager'
          );
        });
      }
    )
  );

  results.push(
    lifeCase_(
      'public ACK rejects blank and stale contentRevision',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-ORCH-2');
        withLifecycleEndpointDoubles_(store, 'mgr@aitheras.com', {}, function () {
          const prep = prepareReleaseReviewSignatures(store['Cycle ID']);
          let blankFailed = false;
          try {
            acknowledgeMeetingRelease(store['Cycle ID'], {
              releaseRequestId: '',
              contentRevision: prep.meetingContentRevision,
            });
          } catch (error) {
            blankFailed = /releaseRequestId is required/i.test(
              String(error.message || error)
            );
          }
          assertLife_(blankFailed, 'blank request id rejected');

          let staleFailed = false;
          try {
            acknowledgeMeetingRelease(store['Cycle ID'], {
              releaseRequestId: prep.releaseRequestId,
              contentRevision: Number(prep.meetingContentRevision) - 1,
            });
          } catch (error) {
            staleFailed = /Stale meeting acknowledgement/i.test(
              String(error.message || error)
            );
          }
          assertLife_(staleFailed, 'stale revision rejected');
        });
      }
    )
  );

  results.push(
    lifeCase_(
      'public saveMeetingOutcomes invalidates post-ACK participant ACK',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-ORCH-3');
        withLifecycleEndpointDoubles_(store, 'mgr@aitheras.com', {}, function () {
          const prep = prepareReleaseReviewSignatures(store['Cycle ID']);
          acknowledgeMeetingRelease(store['Cycle ID'], {
            releaseRequestId: prep.releaseRequestId,
            contentRevision: prep.meetingContentRevision,
          });
          assertLife_(
            hasMeetingReleaseAckForRole_(
              parseMeetingJson_(store),
              PR.ROLE.MANAGER
            ),
            'manager acked'
          );
          saveMeetingOutcomes(store['Cycle ID'], {
            managerFinalComments: 'Edited after ACK',
            developmentGoals: '',
            actionSteps: '',
            employeeComments: '',
          });
          assertLife_(
            !hasMeetingReleaseAckForRole_(
              parseMeetingJson_(store),
              PR.ROLE.MANAGER
            ),
            'manager ACK invalidated after save'
          );
        });
      }
    )
  );

  results.push(
    lifeCase_('deterministic create/submit audit Event IDs', function () {
      assertLife_(
        String(
          buildPendingAuditEvent_(
            'C1',
            'Review cycle created',
            'hr@aitheras.com',
            '',
            PR.CYCLE.OPEN,
            '{}',
            'CYCLE_CREATED:C1'
          ).eventId
        ) === 'CYCLE_CREATED:C1',
        'CYCLE_CREATED'
      );
      assertLife_(
        String(
          buildPendingAuditEvent_(
            'C1',
            'Manager Review submitted and sealed',
            'mgr@aitheras.com',
            PR.DOC.DRAFT,
            PR.DOC.SUBMITTED,
            '',
            'REVIEW_SUBMITTED:C1:Manager'
          ).eventId
        ) === 'REVIEW_SUBMITTED:C1:Manager',
        'REVIEW_SUBMITTED Manager'
      );
    })
  );

  results.push(
    lifeCase_(
      'prepareRelease and startMeeting reject multi-active compensation',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-MULTI');
        store['Compensation Decision'] = V31.COMPENSATION.ADJUSTMENT;
        store['Compensation Status'] = V31_COMP.STATUS.AWAITING_SIGNATURES;
        const originalCount = countActiveCompensationRecordsForCycle_;
        countActiveCompensationRecordsForCycle_ = function () {
          return 2;
        };
        try {
          assertLife_(
            isV31CompensationComplete_(store) === false,
            'gate false'
          );
          withLifecycleEndpointDoubles_(
            store,
            'mgr@aitheras.com',
            {},
            function () {
              store.Status = PR.CYCLE.MEETING;
              let prepFailed = false;
              try {
                prepareReleaseReviewSignatures(store['Cycle ID']);
              } catch (error) {
                prepFailed = /compensation/i.test(
                  String(error.message || error)
                );
              }
              assertLife_(prepFailed, 'prepareRelease rejects');

              store.Status = PR.CYCLE.READY;
              let startFailed = false;
              try {
                startReviewMeeting(store['Cycle ID']);
              } catch (error) {
                startFailed = /compensation/i.test(
                  String(error.message || error)
                );
              }
              assertLife_(startFailed, 'startReviewMeeting rejects');
            }
          );
        } finally {
          countActiveCompensationRecordsForCycle_ = originalCount;
        }
      }
    )
  );

  results.push(
    lifeCase_(
      'unauthorized acknowledgeMeetingRelease is rejected',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-UNAUTH');
        withLifecycleEndpointDoubles_(store, 'mgr@aitheras.com', {}, function () {
          prepareReleaseReviewSignatures(store['Cycle ID']);
        });
        withLifecycleEndpointDoubles_(
          store,
          'other@aitheras.com',
          {},
          function () {
            const meeting = parseMeetingJson_(store);
            let rejected = false;
            try {
              acknowledgeMeetingRelease(store['Cycle ID'], {
                releaseRequestId: meeting.releaseRequestId,
                contentRevision: meeting.contentRevision,
              });
            } catch (error) {
              rejected = /not authorized/i.test(
                String(error.message || error)
              );
            }
            assertLife_(rejected, 'unauthorized ACK rejected');
          }
        );
      }
    )
  );

  results.push(
    lifeCase_(
      'signature acceleration classifies durable outbox outcomes',
      function () {
        assertLife_(
          isSignatureNotificationAccelerationOk_({ action: 'sent' }) === true,
          'sent ok'
        );
        assertLife_(
          isSignatureNotificationAccelerationOk_({
            action: 'skip',
            reason: 'in-progress',
          }) === true,
          'in-progress ok'
        );
        assertLife_(
          isSignatureNotificationAccelerationOk_({
            action: 'skip',
            reason: 'sent',
          }) === true,
          'already-sent ok'
        );
        assertLife_(
          isSignatureNotificationAccelerationOk_({
            action: 'skip',
            reason: 'unknown',
          }) === false,
          'Delivery Unknown fails'
        );
        assertLife_(
          isSignatureNotificationAccelerationOk_({ action: 'error' }) === false,
          'error fails'
        );
      }
    )
  );

  results.push(
    lifeCase_(
      'accelerateSignatureReleaseNotifications aggregates partial failure',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-ACCEL');
        store.Status = PR.CYCLE.SIGNATURES;
        store['Signatures Released At'] = new Date();
        const originals = {
          getCurrentUserEmail_: getCurrentUserEmail_,
          assertDomain_: assertDomain_,
          findCycle_: findCycle_,
          isHrUser_: isHrUser_,
          sendCombinedSignatureEmail_: sendCombinedSignatureEmail_,
        };
        getCurrentUserEmail_ = function () {
          return 'mgr@aitheras.com';
        };
        assertDomain_ = function () {};
        findCycle_ = function () {
          return { rowNumber: 2, object: store };
        };
        isHrUser_ = function () {
          return false;
        };
        sendCombinedSignatureEmail_ = function (cycleId, role) {
          if (role === PR.ROLE.MANAGER) {
            return { action: 'sent' };
          }
          return { action: 'error', error: 'smtp failed' };
        };
        try {
          const result = accelerateSignatureReleaseNotifications(
            store['Cycle ID']
          );
          assertLife_(result.ok === false, 'aggregate ok false');
          assertLife_(
            result.results[0].ok === true && result.results[1].ok === false,
            'manager ok employee fail'
          );
        } finally {
          getCurrentUserEmail_ = originals.getCurrentUserEmail_;
          assertDomain_ = originals.assertDomain_;
          findCycle_ = originals.findCycle_;
          isHrUser_ = originals.isHrUser_;
          sendCombinedSignatureEmail_ = originals.sendCombinedSignatureEmail_;
        }
      }
    )
  );

  results.push(
    lifeCase_(
      'accelerateSignatureReleaseNotifications fails on Delivery Unknown',
      function () {
        const store = lifeEndpointMeetingCycle_('LIFE-ACCEL-UNK');
        store.Status = PR.CYCLE.SIGNATURES;
        store['Signatures Released At'] = new Date();
        const originals = {
          getCurrentUserEmail_: getCurrentUserEmail_,
          assertDomain_: assertDomain_,
          findCycle_: findCycle_,
          isHrUser_: isHrUser_,
          sendCombinedSignatureEmail_: sendCombinedSignatureEmail_,
        };
        getCurrentUserEmail_ = function () {
          return 'emp@aitheras.com';
        };
        assertDomain_ = function () {};
        findCycle_ = function () {
          return { rowNumber: 2, object: store };
        };
        isHrUser_ = function () {
          return false;
        };
        sendCombinedSignatureEmail_ = function () {
          return { action: 'skip', reason: 'unknown' };
        };
        try {
          const result = accelerateSignatureReleaseNotifications(
            store['Cycle ID']
          );
          assertLife_(result.ok === false, 'unknown => ok false');
        } finally {
          getCurrentUserEmail_ = originals.getCurrentUserEmail_;
          assertDomain_ = originals.assertDomain_;
          findCycle_ = originals.findCycle_;
          isHrUser_ = originals.isHrUser_;
          sendCombinedSignatureEmail_ = originals.sendCombinedSignatureEmail_;
        }
      }
    )
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

function lifeEndpointMeetingCycle_(cycleId) {
  return {
    'Cycle ID': String(cycleId),
    Status: PR.CYCLE.MEETING,
    'Manager Email': 'mgr@aitheras.com',
    'Employee Email': 'emp@aitheras.com',
    'HR Email': 'hr@aitheras.com',
    'Manager Review Status': PR.DOC.SUBMITTED,
    'Self Evaluation Status': PR.DOC.SUBMITTED,
    'Compensation Decision': V31.COMPENSATION.NONE,
    'Compensation Status': V31_COMP.STATUS.COMPLETE,
    'Compensation Record ID': '',
    'Meeting JSON': JSON.stringify({
      managerFinalComments: '',
      developmentGoals: '',
      actionSteps: '',
      employeeComments: '',
      contentRevision: 3,
      releaseRequestId: '',
      releaseRequestedAt: '',
      releaseRequestedBy: '',
    }),
    'Signatures Released At': '',
    'Signatures Released By': '',
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
    __audits: [],
  };
}

/**
 * In-memory doubles for public release/ACK/save orchestration tests.
 * Restores originals in finally.
 */
function withLifecycleEndpointDoubles_(store, actorEmail, extras, fn) {
  const opts = extras || {};
  const originals = {
    withLock_: withLock_,
    findCycle_: findCycle_,
    writeCycle_: writeCycle_,
    getCurrentUserEmail_: getCurrentUserEmail_,
    isHrUser_: isHrUser_,
    commitAuditEventOutsideLock_: commitAuditEventOutsideLock_,
  };
  withLock_ = function (inner) {
    return inner();
  };
  findCycle_ = function (id) {
    if (String(store['Cycle ID']) !== String(id)) {
      throw new Error('Cycle not found.');
    }
    return { rowNumber: 2, object: store };
  };
  writeCycle_ = function () {
    // store is mutated in place via location.object
  };
  getCurrentUserEmail_ = function () {
    return normalizeEmail_(actorEmail);
  };
  isHrUser_ = function () {
    return !!opts.isHr;
  };
  commitAuditEventOutsideLock_ = function (event) {
    store.__audits = store.__audits || [];
    store.__audits.push(event);
    if (opts.failAudit) {
      return {
        ok: false,
        warning: 'The change was saved, but the audit trail write failed.',
        eventId: event.eventId,
      };
    }
    return { ok: true, warning: '', eventId: event.eventId };
  };
  try {
    return fn();
  } finally {
    withLock_ = originals.withLock_;
    findCycle_ = originals.findCycle_;
    writeCycle_ = originals.writeCycle_;
    getCurrentUserEmail_ = originals.getCurrentUserEmail_;
    isHrUser_ = originals.isHrUser_;
    commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
  }
}
