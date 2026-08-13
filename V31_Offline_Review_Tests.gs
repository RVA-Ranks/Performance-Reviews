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
  commitAuditEventOutsideLock_ = function (event) {
    store.__audits = store.__audits || [];
    store.__audits.push(event);
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
    getSettings_ = originals.getSettings_;
    assertDomain_ = originals.assertDomain_;
    assertOfflineReviewDataModelReady_ =
      originals.assertOfflineReviewDataModelReady_;
    isV31CompensationComplete_ = originals.isV31CompensationComplete_;
    commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
  }
}
