/**
 * Pre-meeting Reopen for Editing tests.
 * Run: runV31ReviewReopenTests_()
 */

function runV31ReviewReopenTests_() {
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

  function plan_(cycle, type, email, isHr) {
    return evaluateReopenSubmittedReview_(cycle, type, email, isHr);
  }

  check('Manager may reopen own submitted Manager Review', function () {
    const cycle = sampleReopenCycle_({
      Status: PR.CYCLE.OPEN,
      'Manager Review Status': PR.DOC.SUBMITTED,
    });
    const plan = plan_(cycle, 'manager', 'mgr@aitheras.com', false);
    assert_(plan.action === 'allow', 'manager own review allowed');
  });

  check('Manager cannot reopen Self-Evaluation', function () {
    const cycle = sampleReopenCycle_({
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    const plan = plan_(cycle, 'self', 'mgr@aitheras.com', false);
    assert_(plan.action === 'reject' && plan.code === 'UNAUTHORIZED');
  });

  check('Employee may reopen own submitted Self-Evaluation', function () {
    const cycle = sampleReopenCycle_({
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    const plan = plan_(cycle, 'self', 'emp@aitheras.com', false);
    assert_(plan.action === 'allow', 'employee own review allowed');
  });

  check('Employee cannot reopen Manager Review', function () {
    const cycle = sampleReopenCycle_({
      'Manager Review Status': PR.DOC.SUBMITTED,
    });
    const plan = plan_(cycle, 'manager', 'emp@aitheras.com', false);
    assert_(plan.action === 'reject' && plan.code === 'UNAUTHORIZED');
  });

  check('HR may reopen either submitted review', function () {
    const cycle = sampleReopenCycle_({
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    assert_(
      plan_(cycle, 'manager', 'hr@aitheras.com', true).action === 'allow',
      'HR manager review'
    );
    assert_(
      plan_(cycle, 'self', 'hr@aitheras.com', true).action === 'allow',
      'HR self-evaluation'
    );
  });

  check('Open and Ready are eligible; later statuses reject', function () {
    assert_(
      plan_(
        sampleReopenCycle_({ Status: PR.CYCLE.OPEN }),
        'manager',
        'mgr@aitheras.com',
        false
      ).action === 'allow',
      'Open allowed'
    );
    assert_(
      plan_(
        sampleReopenCycle_({
          Status: PR.CYCLE.READY,
          'Self Evaluation Status': PR.DOC.SUBMITTED,
        }),
        'manager',
        'mgr@aitheras.com',
        false
      ).action === 'allow',
      'Ready allowed'
    );
    const blocked = [
      [PR.CYCLE.MEETING, 'MEETING_OPEN'],
      [PR.CYCLE.SIGNATURES, 'SIGNATURES'],
      [PR.CYCLE.FINALIZING, 'FINALIZING'],
      [PR.CYCLE.COMPLETE, 'COMPLETE'],
      [PR.CYCLE.CANCELLED, 'CANCELLED'],
    ];
    blocked.forEach(function (row) {
      const plan = plan_(
        sampleReopenCycle_({
          Status: row[0],
          'Meeting Opened At': row[0] === PR.CYCLE.MEETING ? new Date() : '',
        }),
        'manager',
        'mgr@aitheras.com',
        false
      );
      assert_(plan.action === 'reject', row[0] + ' must reject');
      assert_(plan.code === row[1], row[0] + ' code');
    });
  });

  check('Meeting Opened At marker rejects even if status is still Open', function () {
    const plan = plan_(
      sampleReopenCycle_({
        Status: PR.CYCLE.OPEN,
        'Meeting Opened At': new Date(),
      }),
      'manager',
      'mgr@aitheras.com',
      false
    );
    assert_(plan.action === 'reject' && plan.code === 'MEETING_OPEN');
  });

  check('HR reason is required; participant reason is optional', function () {
    let hrFailed = false;
    try {
      validateReopenSubmittedReviewPayload_(
        {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          reason: '   ',
        },
        true
      );
    } catch (error) {
      hrFailed = /reason/i.test(String(error.message || error));
    }
    assert_(hrFailed, 'HR blank reason rejects');
    assert_(
      validateReopenSubmittedReviewPayload_(
        {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          reason: '',
        },
        false
      ) === '',
      'participant optional reason'
    );
  });

  check('Manager reopen of Ready cycle returns Open for Input', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
      'Compensation Decision': V31.COMPENSATION.NONE,
    });
    const originalJson = store['Manager Review JSON'];
    const result = withReopenEndpointDoubles_(
      store,
      'mgr@aitheras.com',
      { isHr: false, compensationComplete: true },
      function () {
        return reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          reason: '',
        });
      }
    );
    assert_(result.ok === true, 'ok');
    assert_(store['Manager Review Status'] === PR.DOC.DRAFT, 'manager draft');
    assert_(
      store['Self Evaluation Status'] === PR.DOC.SUBMITTED,
      'employee still submitted'
    );
    assert_(store.Status === PR.CYCLE.OPEN, 'Ready demoted to Open');
    assert_(result.canStartMeeting === false, 'no start meeting');
    assert_(result.canEditManagerReview === true, 'manager can edit');
    assert_(store['Manager Review JSON'] === originalJson, 'JSON retained');
    assert_((store.__revisions || []).length === 1, 'revision preserved');
    assert_(
      String(store.__revisions[0]['Submitted JSON'] || '').indexOf(
        'ORIGINAL_SUBMITTED_TEXT'
      ) !== -1,
      'prior submitted JSON preserved'
    );
    assert_(!store['Meeting Opened At'], 'meeting still sealed');
  });

  check('One-submitted cycle remains Open for Input', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.OPEN,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.DRAFT,
    });
    withReopenEndpointDoubles_(store, 'mgr@aitheras.com', { isHr: false }, function () {
      reopenSubmittedReview(store['Cycle ID'], 'manager', {
        confirmed: true,
        confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
      });
    });
    assert_(store.Status === PR.CYCLE.OPEN, 'stays Open');
    assert_(store['Self Evaluation Status'] === PR.DOC.DRAFT, 'peer unchanged');
  });

  check('Employee reopen leaves manager review private', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    withReopenEndpointDoubles_(store, 'emp@aitheras.com', { isHr: false }, function () {
      reopenSubmittedReview(store['Cycle ID'], 'self', {
        confirmed: true,
        confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
      });
    });
    assert_(store.Status === PR.CYCLE.OPEN, 'demoted');
    assert_(
      store['Manager Review Status'] === PR.DOC.SUBMITTED,
      'manager still submitted'
    );
    assert_(!store['Meeting Opened At'], 'not mutually visible');
  });

  check('HR reopen requires reason and is audited', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    const result = withReopenEndpointDoubles_(
      store,
      'hr@aitheras.com',
      { isHr: true },
      function () {
        return reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          reason: 'Manager asked HR to restore editing after a typo.',
        });
      }
    );
    assert_(result.ok === true, 'hr ok');
    assert_((store.__audits || []).length === 1, 'audit written');
    assert_(
      store.__audits[0].action === V31_REOPEN.AUDIT_ACTION,
      'REVIEW_REOPENED'
    );
    assert_(
      String(store.__audits[0].details || '').indexOf('"revisionNumber":1') !==
        -1,
      'revision number audited'
    );
  });

  check('HR reopen without reason rejects', function () {
    const store = sampleReopenCycle_({ Status: PR.CYCLE.READY });
    let rejected = false;
    try {
      withReopenEndpointDoubles_(store, 'hr@aitheras.com', { isHr: true }, function () {
        reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          reason: '',
        });
      });
    } catch (error) {
      rejected = /reason/i.test(String(error.message || error));
    }
    assert_(rejected, 'HR reason required');
    assert_(store['Manager Review Status'] === PR.DOC.SUBMITTED, 'unchanged');
  });

  check('Resubmit after reopen stamps history and returns to Ready', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
      'Compensation Decision': V31.COMPENSATION.NONE,
    });
    const originalJson = store['Manager Review JSON'];
    const compensationDecision = store['Compensation Decision'];
    const compensationRecordId = store['Compensation Record ID'];
    withReopenEndpointDoubles_(store, 'mgr@aitheras.com', { isHr: false }, function () {
      const reopened = reopenSubmittedReview(store['Cycle ID'], 'manager', {
        confirmed: true,
        confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
      });
      assert_(reopened.documentStatus === PR.DOC.DRAFT, 'reopened to Draft');
      assert_(store.Status === PR.CYCLE.OPEN, 'demoted to Open');
      const submitted = saveIndependentReview_(
        store['Cycle ID'],
        PR.TYPE.MANAGER,
        sampleReopenManagerPayload_('EDITED_RESUBMIT_TEXT'),
        true,
        'manual'
      );
      assert_(submitted.documentStatus === PR.DOC.SUBMITTED, 'resubmitted');
      assert_(submitted.cycleStatus === PR.CYCLE.READY, 'Ready via submit path');
    });
    assert_(store.Status === PR.CYCLE.READY, 'cycle Ready');
    assert_(store['Manager Review Status'] === PR.DOC.SUBMITTED, 'manager submitted');
    assert_(
      String(store['Manager Review JSON'] || '').indexOf('EDITED_RESUBMIT_TEXT') !==
        -1,
      'edited submission is authoritative'
    );
    assert_(
      String(store['Manager Review JSON'] || '').indexOf(
        'ORIGINAL_SUBMITTED_TEXT'
      ) === -1,
      'edited JSON replaced the live review'
    );
    assert_((store.__revisions || []).length === 1, 'exactly one revision');
    assert_(
      String(store.__revisions[0]['Submitted JSON'] || '') === originalJson,
      'history keeps original submitted JSON'
    );
    assert_(
      String(store.__revisions[0]['Submitted JSON'] || '').indexOf(
        'EDITED_RESUBMIT_TEXT'
      ) === -1,
      'history is not the edited resubmission'
    );
    assert_(!!store.__revisions[0]['Resubmitted At'], 'Resubmitted At stamped');
    assert_(
      store['Compensation Decision'] === compensationDecision &&
        store['Compensation Record ID'] === compensationRecordId,
      'compensation unchanged'
    );
  });

  check('Reopen surfaces auditWarning without rolling back', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
    });
    const result = withReopenEndpointDoubles_(
      store,
      'mgr@aitheras.com',
      {
        isHr: false,
        auditWarning: 'The change was saved, but the audit trail write failed.',
      },
      function () {
        return reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
        });
      }
    );
    assert_(store['Manager Review Status'] === PR.DOC.DRAFT, 'business commit kept');
    assert_(result.ok === true, 'success');
    assert_(
      String(result.auditWarning || '').indexOf('audit trail write failed') !==
        -1,
      'auditWarning surfaced'
    );
  });

  check('Compensation recommendation remains unchanged', function () {
    const store = sampleReopenCycle_({
      Status: PR.CYCLE.READY,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
      'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
      'Compensation Status': V31_COMP.STATUS.AWAITING_OWNER,
      'Compensation Record ID': 'REC-1',
      'Compensation Decision Notes': 'KEEP_INTERNAL',
    });
    const result = withReopenEndpointDoubles_(
      store,
      'mgr@aitheras.com',
      { isHr: false },
      function () {
        return reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
        });
      }
    );
    assert_(
      store['Compensation Decision'] === V31.COMPENSATION.ADJUSTMENT,
      'decision unchanged'
    );
    assert_(store['Compensation Record ID'] === 'REC-1', 'record id unchanged');
    assert_(
      store['Compensation Decision Notes'] === 'KEEP_INTERNAL',
      'notes unchanged'
    );
    assert_(
      result.compensationRecommendationRemainsUnchanged === true,
      'client note flag'
    );
    assert_(
      String(reopenSubmittedReview).indexOf('CompensationRecords') === -1,
      'endpoint must not rewrite CompensationRecords'
    );
  });

  check('Meeting Open / Signatures / Complete endpoints reject', function () {
    ['MEETING', 'SIGNATURES', 'COMPLETE'].forEach(function (key) {
      const status = PR.CYCLE[key];
      const store = sampleReopenCycle_({
        Status: status,
        'Meeting Opened At': status === PR.CYCLE.MEETING ? new Date() : '',
      });
      let rejected = false;
      try {
        withReopenEndpointDoubles_(store, 'mgr@aitheras.com', { isHr: false }, function () {
          reopenSubmittedReview(store['Cycle ID'], 'manager', {
            confirmed: true,
            confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
          });
        });
      } catch (error) {
        rejected = true;
      }
      assert_(rejected, status + ' endpoint rejects');
      assert_(store['Manager Review Status'] === PR.DOC.SUBMITTED, status + ' unchanged');
    });
  });

  check('Reopen result DTO does not expose revision JSON', function () {
    const store = sampleReopenCycle_({ Status: PR.CYCLE.READY });
    const result = withReopenEndpointDoubles_(
      store,
      'mgr@aitheras.com',
      { isHr: false },
      function () {
        return reopenSubmittedReview(store['Cycle ID'], 'manager', {
          confirmed: true,
          confirmationToken: V31_REOPEN.CONFIRMATION_TOKEN,
        });
      }
    );
    assert_(!Object.prototype.hasOwnProperty.call(result, 'submittedJson'));
    assert_(!Object.prototype.hasOwnProperty.call(result, 'revisionHistory'));
    assert_(JSON.stringify(result).indexOf('ORIGINAL_SUBMITTED_TEXT') === -1);
  });

  const failed = results.filter(function (row) {
    return !row.ok;
  });
  const summary =
    'V31 review reopen tests: ' +
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

function sampleReopenManagerPayload_(overallComments) {
  return {
    ratings: PR.FACTORS.map(function (factor) {
      return {
        factorId: factor.id,
        rating: '4',
        comments: '',
      };
    }),
    overallComments: overallComments || 'EDITED_RESUBMIT_TEXT',
    areasForImprovement: 'Keep current development plan.',
    actionSteps: 'Continue current action steps.',
    supervisorComments: 'Supervisor comments retained.',
  };
}

function sampleReopenCycle_(overrides) {
  const submitted = JSON.stringify({
    overallComments: 'ORIGINAL_SUBMITTED_TEXT',
    submittedAt: '2026-08-14T12:00:00.000Z',
    lastSavedAt: '2026-08-14T12:00:00.000Z',
    ratings: [],
  });
  const cycle = {
    'Cycle ID': 'REOPEN-1',
    Status: PR.CYCLE.OPEN,
    'Manager Email': 'mgr@aitheras.com',
    'Employee Email': 'emp@aitheras.com',
    'HR Email': 'hr@aitheras.com',
    'Manager Review Status': PR.DOC.SUBMITTED,
    'Self Evaluation Status': PR.DOC.NOT_STARTED,
    'Manager Review JSON': submitted,
    'Self Evaluation JSON': submitted,
    'Meeting Opened At': '',
    'Meeting JSON': JSON.stringify(emptyMeeting_()),
    'Signatures Released At': '',
    'Signature Release Mode': '',
    'Compensation Decision': V31.COMPENSATION.NONE,
    'Compensation Status': '',
    'Compensation Record ID': '',
    'Compensation Decision Notes': '',
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

function withReopenEndpointDoubles_(store, actorEmail, extras, fn) {
  const opts = extras || {};
  const originals = {
    withLock_: withLock_,
    findCycle_: findCycle_,
    writeCycle_: writeCycle_,
    getCurrentUserEmail_: getCurrentUserEmail_,
    isHrUser_: isHrUser_,
    getSettings_: getSettings_,
    assertDomain_: assertDomain_,
    assertReviewRevisionHistoryReady_: assertReviewRevisionHistoryReady_,
    isV31CompensationComplete_: isV31CompensationComplete_,
    commitAuditEventOutsideLock_: commitAuditEventOutsideLock_,
    getAllObjects_: getAllObjects_,
    appendObject_: appendObject_,
    writeObject_: writeObject_,
    getSpreadsheet_: getSpreadsheet_,
  };
  store.__revisions = store.__revisions || [];
  store.__audits = store.__audits || [];
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
    return {
      ALLOWED_DOMAIN: 'aitheras.com',
      COMPENSATION_DECISION_REQUIRED: 'FALSE',
    };
  };
  assertDomain_ = function () {};
  assertReviewRevisionHistoryReady_ = function () {};
  isV31CompensationComplete_ = function () {
    return opts.compensationComplete !== false;
  };
  commitAuditEventOutsideLock_ = function (event) {
    store.__audits.push(event);
    if (opts.auditWarning) {
      return {
        ok: false,
        warning: opts.auditWarning,
        eventId: event.eventId,
      };
    }
    return { ok: true, warning: '', eventId: event.eventId };
  };
  getAllObjects_ = function (sheetName) {
    if (String(sheetName) === V31_REOPEN.SHEET) return store.__revisions;
    return [];
  };
  appendObject_ = function (sheetName, headers, object) {
    if (String(sheetName) === V31_REOPEN.SHEET) {
      store.__revisions.push(object);
    }
  };
  writeObject_ = function (sheetName, rowNumber, object) {
    if (String(sheetName) === V31_REOPEN.SHEET) {
      store.__revisions[rowNumber - 2] = object;
    }
  };
  getSpreadsheet_ = function () {
    return {
      getSheetByName: function (name) {
        if (String(name) === V31_REOPEN.SHEET) return { getName: function () { return name; } };
        return null;
      },
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
    assertReviewRevisionHistoryReady_ =
      originals.assertReviewRevisionHistoryReady_;
    isV31CompensationComplete_ = originals.isV31CompensationComplete_;
    commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
    getAllObjects_ = originals.getAllObjects_;
    appendObject_ = originals.appendObject_;
    writeObject_ = originals.writeObject_;
    getSpreadsheet_ = originals.getSpreadsheet_;
  }
}
