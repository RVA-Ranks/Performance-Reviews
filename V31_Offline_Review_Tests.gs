/**
 * Offline / Paper Review Signature Override tests.
 * Run: runV31OfflineReviewTests_()
 */

function runV31OfflineReviewTests_() {
  const results = [];

  function check(name, fn) {
    try {
      fn();
      results.push({ name: name, ok: true });
    } catch (error) {
      results.push({
        name: name,
        ok: false,
        error: String(error.message || error),
      });
    }
  }

  function assert_(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  check('Open / Ready / Meeting are eligible', function () {
    [PR.CYCLE.OPEN, PR.CYCLE.READY, PR.CYCLE.MEETING].forEach(function (status) {
      const plan = evaluateOfflineReviewOverrideEligibility_(
        sampleOfflineCycle_({ Status: status })
      );
      assert_(plan.action === 'allow', status + ' must allow');
    });
  });

  check('Awaiting Signatures / Finalizing / Complete / Cancelled reject', function () {
    const cases = [
      [PR.CYCLE.SIGNATURES, 'STANDARD_SIGNATURES'],
      [PR.CYCLE.FINALIZING, 'FINALIZING'],
      [PR.CYCLE.COMPLETE, 'COMPLETE'],
      [PR.CYCLE.CANCELLED, 'CANCELLED'],
    ];
    cases.forEach(function (row) {
      const plan = evaluateOfflineReviewOverrideEligibility_(
        sampleOfflineCycle_({ Status: row[0] })
      );
      assert_(plan.action === 'reject', row[0] + ' must reject');
      assert_(plan.code === row[1], row[0] + ' code');
    });
  });

  check('Repeat offline release is idempotent alreadyReleased', function () {
    const plan = evaluateOfflineReviewOverrideEligibility_(
      sampleOfflineCycle_({
        Status: PR.CYCLE.SIGNATURES,
        'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
        'Signatures Released At': new Date(),
      })
    );
    assert_(plan.action === 'alreadyReleased', 'alreadyReleased');
  });

  check('Blank and whitespace reasons reject', function () {
    let blankFailed = false;
    let spaceFailed = false;
    try {
      validateOfflineReviewOverrideReason_('');
    } catch (error) {
      blankFailed = true;
    }
    try {
      validateOfflineReviewOverrideReason_('   \n\t  ');
    } catch (error) {
      spaceFailed = true;
    }
    assert_(blankFailed && spaceFailed, 'blank/whitespace must reject');
    assert_(
      validateOfflineReviewOverrideReason_(
        'Manager and employee completed review using printed copies.'
      ).indexOf('printed copies') !== -1,
      'valid reason accepted'
    );
  });

  check('Existing signature claim fails closed', function () {
    const plan = evaluateOfflineReviewOverrideEligibility_(
      sampleOfflineCycle_({
        Status: PR.CYCLE.READY,
        'Manager Signature File ID': 'file-1',
      })
    );
    assert_(plan.action === 'reject' && plan.code === 'SIGNATURE_EXISTS');
  });

  check('Ordinary release planner still requires meeting', function () {
    assert_(
      planReleaseReviewSignatures_({
        Status: PR.CYCLE.OPEN,
        'Signatures Released At': '',
      }).action === 'reject',
      'ordinary release must still reject Open'
    );
    assert_(
      planReleaseReviewSignatures_({
        Status: PR.CYCLE.READY,
        'Signatures Released At': '',
      }).action === 'reject',
      'ordinary release must still reject Ready'
    );
  });

  check('Offline disclosure is employee-safe', function () {
    const notice = buildOfflineReviewDisclosure_({
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'Offline Override Reason': 'INTERNAL_REASON_SECRET',
    });
    assert_(notice.indexOf('outside the AITHERAS') !== -1, 'notice present');
    assert_(
      notice.indexOf('INTERNAL_REASON_SECRET') === -1,
      'reason must not appear in employee disclosure'
    );
    assert_(buildOfflineReviewDisclosure_({}) === '', 'standard has no notice');
  });

  check('HR success commits without fabricating ACKs', function () {
    const store = sampleOfflineCycle_({
      Status: PR.CYCLE.OPEN,
      'Compensation Decision': V31.COMPENSATION.NONE,
    });
    const result = withOfflineEndpointDoubles_(store, 'hr@aitheras.com', {
      isHr: true,
      compensationComplete: true,
    }, function () {
      return releaseOfflineReviewForSignatures(store['Cycle ID'], {
        confirmed: true,
        confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
        reason: 'Manager and employee completed review using printed copies.',
      });
    });
    assert_(result.ok === true, 'ok');
    assert_(result.alreadyReleased === false, 'first release');
    assert_(store.Status === PR.CYCLE.SIGNATURES, 'status');
    assert_(
      store['Signature Release Mode'] === V31_OFFLINE.MODE_OVERRIDE,
      'mode'
    );
    const meeting = parseMeetingJson_(store);
    assert_(!!meeting.releaseRequestId, 'truthful releaseRequestId');
    assert_(
      normalizeEmail_(meeting.releaseRequestedBy) === 'hr@aitheras.com',
      'HR initiator'
    );
    assert_(
      !meeting.managerReleaseAckRequestId &&
        !meeting.employeeReleaseAckRequestId &&
        !meeting.managerReleaseAckAt &&
        !meeting.employeeReleaseAckAt,
      'no fabricated ACKs'
    );
    assert_(
      store.__audits &&
        store.__audits[0] &&
        store.__audits[0].action === V31_OFFLINE.AUDIT_ACTION,
      'audit event'
    );
  });

  check('Manager and employee cannot invoke override', function () {
    const store = sampleOfflineCycle_({ Status: PR.CYCLE.READY });
    let managerDenied = false;
    let employeeDenied = false;
    try {
      withOfflineEndpointDoubles_(store, 'mgr@aitheras.com', {
        isHr: false,
        compensationComplete: true,
      }, function () {
        releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Manager and employee completed review using printed copies.',
        });
      });
    } catch (error) {
      managerDenied = /only active hr/i.test(String(error.message || error));
    }
    try {
      withOfflineEndpointDoubles_(store, 'emp@aitheras.com', {
        isHr: false,
        compensationComplete: true,
      }, function () {
        releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Manager and employee completed review using printed copies.',
        });
      });
    } catch (error) {
      employeeDenied = /only active hr/i.test(String(error.message || error));
    }
    assert_(managerDenied && employeeDenied, 'non-HR denied');
  });

  check('Pending compensation blocks override', function () {
    const store = sampleOfflineCycle_({
      Status: PR.CYCLE.READY,
      'Compensation Decision': V31.COMPENSATION.PENDING,
    });
    let blocked = false;
    try {
      withOfflineEndpointDoubles_(store, 'hr@aitheras.com', {
        isHr: true,
        compensationComplete: false,
      }, function () {
        releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Manager and employee completed review using printed copies.',
        });
      });
    } catch (error) {
      blocked = /compensation/i.test(String(error.message || error));
    }
    assert_(blocked, 'unresolved compensation must block');
    assert_(store.Status === PR.CYCLE.READY, 'status unchanged');
  });

  check('Second identical override does not rewrite attribution', function () {
    const store = sampleOfflineCycle_({
      Status: PR.CYCLE.OPEN,
      'Compensation Decision': V31.COMPENSATION.NONE,
    });
    withOfflineEndpointDoubles_(store, 'hr@aitheras.com', {
      isHr: true,
      compensationComplete: true,
    }, function () {
      releaseOfflineReviewForSignatures(store['Cycle ID'], {
        confirmed: true,
        confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
        reason: 'Manager and employee completed review using printed copies.',
      });
    });
    const firstAt = store['Offline Override At'];
    const firstBy = store['Offline Override By'];
    const firstReason = store['Offline Override Reason'];
    const firstRequest = parseMeetingJson_(store).releaseRequestId;
    const second = withOfflineEndpointDoubles_(store, 'hr@aitheras.com', {
      isHr: true,
      compensationComplete: true,
    }, function () {
      return releaseOfflineReviewForSignatures(store['Cycle ID'], {
        confirmed: true,
        confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
        reason: 'Different reason should not overwrite.',
      });
    });
    assert_(second.alreadyReleased === true, 'idempotent');
    assert_(store['Offline Override At'] === firstAt, 'At unchanged');
    assert_(store['Offline Override By'] === firstBy, 'By unchanged');
    assert_(store['Offline Override Reason'] === firstReason, 'Reason unchanged');
    assert_(
      parseMeetingJson_(store).releaseRequestId === firstRequest,
      'releaseRequestId unchanged'
    );
    assert_(
      !parseMeetingJson_(store).managerReleaseAckAt &&
        !parseMeetingJson_(store).employeeReleaseAckAt,
      'still no ACKs'
    );
  });

  check('Release result includes disclosure and clears override flag', function () {
    const cycle = sampleOfflineCycle_({
      Status: PR.CYCLE.SIGNATURES,
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'Offline Override At': new Date('2026-08-13T16:00:00.000Z'),
      'Offline Override Reason': 'Printed copies were used.',
    });
    const originals = {
      buildLiveReviewStatePayload_: buildLiveReviewStatePayload_,
    };
    buildLiveReviewStatePayload_ = function () {
      return { status: PR.CYCLE.SIGNATURES };
    };
    try {
      const result = buildOfflineReviewReleaseResult_(cycle, 'hr@aitheras.com', {
        alreadyReleased: false,
        message: 'ok',
      });
      assert_(
        result.offlineReviewDisclosure === V31_OFFLINE.NOTICE,
        'disclosure returned'
      );
      assert_(result.canOfflineReviewOverride === false, 'override flag cleared');
      assert_(
        result.signatureReleaseMode === V31_OFFLINE.MODE_OVERRIDE,
        'mode returned'
      );
    } finally {
      buildLiveReviewStatePayload_ = originals.buildLiveReviewStatePayload_;
    }
  });

  check('Audit Event ID is deterministic from cycle and override at', function () {
    const when = new Date('2026-08-13T16:00:00.000Z');
    assert_(
      offlineReviewOverrideAuditEventId_('OFF-1', when) ===
        'OFFLINE_REVIEW_OVERRIDE:OFF-1:' + toIsoString_(when),
      'deterministic id'
    );
  });

  check('alreadyReleased recovers missing override audit without rewriting attribution', function () {
    const when = new Date('2026-08-13T16:00:00.000Z');
    const store = sampleOfflineCycle_({
      Status: PR.CYCLE.SIGNATURES,
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'Signatures Released At': when,
      'Signatures Released By': 'hr@aitheras.com',
      'Offline Override At': when,
      'Offline Override By': 'hr@aitheras.com',
      'Offline Override Reason': 'Printed copies were used.',
      'Meeting JSON': JSON.stringify({
        releaseRequestId: 'rel-offline-1',
        signatureReleaseMode: V31_OFFLINE.MODE_OVERRIDE,
      }),
    });
    const firstAt = store['Offline Override At'];
    const firstBy = store['Offline Override By'];
    const firstReason = store['Offline Override Reason'];
    const firstRequest = parseMeetingJson_(store).releaseRequestId;

    withOfflineEndpointDoubles_(
      store,
      'hr@aitheras.com',
      {
        isHr: true,
        compensationComplete: true,
        existingAudits: [],
      },
      function () {
        const result = releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Different reason should not overwrite.',
        });
        assert_(result.alreadyReleased === true, 'alreadyReleased');
        assert_(store['Offline Override At'] === firstAt, 'At unchanged');
        assert_(store['Offline Override By'] === firstBy, 'By unchanged');
        assert_(store['Offline Override Reason'] === firstReason, 'Reason unchanged');
        assert_(
          parseMeetingJson_(store).releaseRequestId === firstRequest,
          'releaseRequestId unchanged'
        );
        assert_((store.__audits || []).length === 1, 'recovered one audit');
        assert_(
          store.__audits[0].eventId ===
            offlineReviewOverrideAuditEventId_(store['Cycle ID'], when),
          'deterministic recovered event id'
        );
        assert_(
          String(store.__audits[0].details || '').indexOf('"recovered":true') !==
            -1,
          'recovered marker'
        );
        assert_(
          normalizeEmail_(store.__audits[0].actorEmail) ===
            'hr@aitheras.com',
          'same-HR recovery keeps original actor'
        );
      }
    );

    withOfflineEndpointDoubles_(
      store,
      'hr@aitheras.com',
      {
        isHr: true,
        compensationComplete: true,
        existingAudits: store.__audits,
      },
      function () {
        releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Different reason should not overwrite.',
        });
        assert_((store.__audits || []).length === 1, 'no duplicate audit');
        assert_(store['Offline Override Reason'] === firstReason, 'reason still unchanged');
      }
    );
  });

  check('HR live state is not signature-ready immediately after offline release', function () {
    const cycle = sampleOfflineCycle_({
      Status: PR.CYCLE.SIGNATURES,
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'HR Email': 'hr-a@aitheras.com',
      'Manager Email': 'mgr@aitheras.com',
      'Employee Email': 'emp@aitheras.com',
    });
    const live = buildLiveReviewStatePayload_(
      cycle,
      'hr-a@aitheras.com',
      PR.ROLE.HR
    );
    assert_(live.status === PR.CYCLE.SIGNATURES, 'Awaiting Signatures');
    assert_(live.signatureTaskReady === false, 'HR not yet eligible');
    assert_((live.signatureTasks || []).length === 0, 'no HR signature task');
  });

  check('HR live state becomes signature-ready after both participants sign', function () {
    const cycle = sampleOfflineCycle_({
      Status: PR.CYCLE.SIGNATURES,
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'HR Email': 'hr-a@aitheras.com',
      'Manager Email': 'mgr@aitheras.com',
      'Employee Email': 'emp@aitheras.com',
      'Manager Signature File ID': 'sig-m',
      'Employee Signature File ID': 'sig-e',
      'MGR Manager Signature ID': 'sig-m',
      'SELF Manager Signature ID': 'sig-m',
      'MGR Employee Signature ID': 'sig-e',
      'SELF Employee Signature ID': 'sig-e',
    });
    const live = buildLiveReviewStatePayload_(
      cycle,
      'hr-a@aitheras.com',
      PR.ROLE.HR
    );
    assert_(live.signatureTaskReady === true, 'HR now eligible');
    assert_((live.signatureTasks || []).length === 1, 'HR signature task present');
  });

  check('Audit recovery preserves original override actor across HR users', function () {
    const when = new Date('2026-08-13T16:00:00.000Z');
    const store = sampleOfflineCycle_({
      Status: PR.CYCLE.SIGNATURES,
      'Signature Release Mode': V31_OFFLINE.MODE_OVERRIDE,
      'Signatures Released At': when,
      'Signatures Released By': 'hr-a@aitheras.com',
      'Offline Override At': when,
      'Offline Override By': 'hr-a@aitheras.com',
      'Offline Override Reason': 'Printed copies were used.',
      'HR Email': 'hr-a@aitheras.com',
      'Meeting JSON': JSON.stringify({
        releaseRequestId: 'rel-offline-1',
        signatureReleaseMode: V31_OFFLINE.MODE_OVERRIDE,
      }),
    });
    const firstAt = store['Offline Override At'];
    const firstBy = store['Offline Override By'];
    const firstReason = store['Offline Override Reason'];
    const firstRequest = parseMeetingJson_(store).releaseRequestId;

    withOfflineEndpointDoubles_(
      store,
      'hr-b@aitheras.com',
      {
        isHr: true,
        compensationComplete: true,
        existingAudits: [],
      },
      function () {
        const result = releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          confirmationToken: V31_OFFLINE.CONFIRMATION_TOKEN,
          reason: 'Different reason should not overwrite.',
        });
        assert_(result.alreadyReleased === true, 'alreadyReleased');
        assert_(store['Offline Override At'] === firstAt, 'At unchanged');
        assert_(store['Offline Override By'] === firstBy, 'By unchanged');
        assert_(
          store['Offline Override Reason'] === firstReason,
          'Reason unchanged'
        );
        assert_(
          parseMeetingJson_(store).releaseRequestId === firstRequest,
          'releaseRequestId unchanged'
        );
        assert_((store.__audits || []).length === 1, 'exactly one audit');
        assert_(
          normalizeEmail_(store.__audits[0].actorEmail) ===
            'hr-a@aitheras.com',
          'Actor Email remains HR-A'
        );
        assert_(
          String(store.__audits[0].details || '').indexOf(
            '"recoveredBy":"hr-b@aitheras.com"'
          ) !== -1,
          'recoveredBy records HR-B'
        );
      }
    );
  });

  check('Missing confirmation token rejects', function () {
    const store = sampleOfflineCycle_({ Status: PR.CYCLE.READY });
    let rejected = false;
    try {
      withOfflineEndpointDoubles_(store, 'hr@aitheras.com', {
        isHr: true,
        compensationComplete: true,
      }, function () {
        releaseOfflineReviewForSignatures(store['Cycle ID'], {
          confirmed: true,
          reason: 'Manager and employee completed review using printed copies.',
        });
      });
    } catch (error) {
      rejected = /confirmation/i.test(String(error.message || error));
    }
    assert_(rejected, 'token required');
  });

  const failed = results.filter(function (row) {
    return !row.ok;
  });
  const summary =
    'V31 offline review tests: ' +
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

function sampleOfflineCycle_(overrides) {
  const cycle = {
    'Cycle ID': 'OFF-1',
    Status: PR.CYCLE.OPEN,
    'Manager Email': 'mgr@aitheras.com',
    'Employee Email': 'emp@aitheras.com',
    'HR Email': 'hr@aitheras.com',
    'Manager Review Status': PR.DOC.DRAFT,
    'Self Evaluation Status': PR.DOC.NOT_STARTED,
    'Meeting Opened At': '',
    'Meeting JSON': JSON.stringify(emptyMeeting_()),
    'Signatures Released At': '',
    'Signatures Released By': '',
    'Signature Release Mode': '',
    'Offline Override At': '',
    'Offline Override By': '',
    'Offline Override Reason': '',
    'Compensation Decision': V31.COMPENSATION.NONE,
    'Compensation Status': '',
    'Manager Signature File ID': '',
    'Employee Signature File ID': '',
    'HR Signature File ID': '',
    'MGR Manager Signature ID': '',
    'MGR Employee Signature ID': '',
    'MGR HR Signature ID': '',
    'SELF Employee Signature ID': '',
    'SELF Manager Signature ID': '',
    'SELF HR Signature ID': '',
    'Updated At': new Date(),
  };
  Object.keys(overrides || {}).forEach(function (key) {
    cycle[key] = overrides[key];
  });
  return cycle;
}

function withOfflineEndpointDoubles_(store, actorEmail, extras, fn) {
  const opts = extras || {};
  const originals = {
    withLock_: withLock_,
    findCycle_: findCycle_,
    writeCycle_: writeCycle_,
    getCurrentUserEmail_: getCurrentUserEmail_,
    isHrUser_: isHrUser_,
    getSettings_: getSettings_,
    assertDomain_: assertDomain_,
    assertOfflineReviewDataModelReady_: assertOfflineReviewDataModelReady_,
    isV31CompensationComplete_: isV31CompensationComplete_,
    commitAuditEventOutsideLock_: commitAuditEventOutsideLock_,
    findAuditByEventId_: findAuditByEventId_,
    auditIdempotent_: auditIdempotent_,
    buildLiveReviewStatePayload_: buildLiveReviewStatePayload_,
  };
  store.__audits = opts.existingAudits
    ? opts.existingAudits.slice()
    : store.__audits || [];
  withLock_ = function (inner) {
    return inner();
  };
  findCycle_ = function (id) {
    if (String(store['Cycle ID']) !== String(id)) {
      throw new Error('Cycle not found.');
    }
    return { rowNumber: 2, object: store };
  };
  writeCycle_ = function () {};
  getCurrentUserEmail_ = function () {
    return normalizeEmail_(actorEmail);
  };
  isHrUser_ = function () {
    return !!opts.isHr;
  };
  getSettings_ = function () {
    return { ALLOWED_DOMAIN: 'aitheras.com' };
  };
  assertDomain_ = function () {};
  assertOfflineReviewDataModelReady_ = function () {};
  isV31CompensationComplete_ = function () {
    return opts.compensationComplete !== false;
  };
  findAuditByEventId_ = function (eventId) {
    const wanted = String(eventId || '');
    const rows = store.__audits || [];
    for (let index = rows.length - 1; index >= 0; index--) {
      if (
        String(rows[index].eventId || rows[index]['Event ID'] || '') === wanted
      ) {
        return rows[index];
      }
    }
    return null;
  };
  auditIdempotent_ = function (
    cycleId,
    action,
    actorEmailValue,
    previousStatus,
    newStatus,
    details,
    eventId
  ) {
    const existing = findAuditByEventId_(eventId);
    if (existing) return existing;
    const event = {
      eventId: String(eventId || ''),
      cycleId: String(cycleId || ''),
      action: String(action || ''),
      actorEmail: String(actorEmailValue || ''),
      previousStatus: String(previousStatus || ''),
      newStatus: String(newStatus || ''),
      details: details || '',
    };
    store.__audits.push(event);
    return event;
  };
  commitAuditEventOutsideLock_ = function (event) {
    store.__audits = store.__audits || [];
    store.__audits.push(event);
    return { ok: true, warning: '', eventId: event.eventId };
  };
  buildLiveReviewStatePayload_ = function () {
    return {
      status: String(store.Status || ''),
      signatureReleaseMode: String(store['Signature Release Mode'] || ''),
    };
  };
  try {
    return fn();
  } finally {
    withLock_ = originals.withLock_;
    findCycle_ = originals.findCycle_;
    writeCycle_ = originals.writeCycle_;
    getCurrentUserEmail_ = originals.getCurrentUserEmail_;
    isHrUser_ = originals.isHrUser_;
    getSettings_ = originals.getSettings_;
    assertDomain_ = originals.assertDomain_;
    assertOfflineReviewDataModelReady_ =
      originals.assertOfflineReviewDataModelReady_;
    isV31CompensationComplete_ = originals.isV31CompensationComplete_;
    commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
    findAuditByEventId_ = originals.findAuditByEventId_;
    auditIdempotent_ = originals.auditIdempotent_;
    buildLiveReviewStatePayload_ = originals.buildLiveReviewStatePayload_;
  }
}
