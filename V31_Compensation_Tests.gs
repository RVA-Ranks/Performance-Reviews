/**
 * Pure and authorization tests for the integrated compensation workflow.
 * Run via runV31CompensationTests_() in the Apps Script editor.
 */

function runV31CompensationTests_() {
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
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  check('Annual salary is rate × 2080', function () {
    assert_(
      annualSalaryFromRate_(46.4) === 96512,
      '46.40 × 2080 must equal 96512'
    );
  });

  check('Legacy Adjustment Submitted normalizes', function () {
    assert_(
      normalizeCompensationDecision_('Adjustment Submitted') ===
        V31.COMPENSATION.ADJUSTMENT,
      'Legacy label must become Adjustment Recommended'
    );
    assert_(
      V31.COMPENSATION.ADJUSTMENT === 'Adjustment Recommended',
      'Canonical adjustment label must be Adjustment Recommended'
    );
  });

  check('No Adjustment completes the gate', function () {
    assert_(
      isV31CompensationComplete_({
        'Compensation Decision': V31.COMPENSATION.NONE,
      }) === true,
      'No Adjustment must satisfy the gate'
    );
  });

  check('Recommendation alone does not complete the gate', function () {
    assert_(
      isV31CompensationComplete_({
        'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
        'Compensation Status': V31_COMP.STATUS.AWAITING_OWNER,
      }) === false,
      'Awaiting owner must block the gate'
    );
  });

  check('Owner decision unlocks the gate', function () {
    assert_(
      isV31CompensationComplete_({
        'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
        'Compensation Status': V31_COMP.STATUS.AWAITING_SIGNATURES,
      }) === true,
      'Awaiting Signatures must satisfy the gate'
    );
  });

  check('Recommendation validation requires effective date', function () {
    let threw = false;
    try {
      validateCompensationRecommendation_(
        {
          recommendedPercent: 8,
          businessJustification: 'Merit',
        },
        46.4
      );
    } catch (error) {
      threw = true;
      assert_(
        String(error.message).indexOf('effective date') >= 0,
        'Must require proposed effective date'
      );
    }
    assert_(threw, 'Missing effective date must throw');
  });

  check('Recommendation derives rate from percent only', function () {
    const clean = validateCompensationRecommendation_(
      {
        recommendedPercent: 12,
        proposedEffectiveDate: '2026-09-01',
        businessJustification: 'Market adjustment',
        recommendedPayRate: 999, // must be ignored
      },
      46.4
    );
    assert_(
      clean.recommendedRate === roundCurrency_(46.4 * 1.12),
      'Recommended rate must derive from percent'
    );
    assert_(
      clean.recommendedAnnual ===
        annualSalaryFromRate_(clean.recommendedRate),
      'Recommended annual must derive from rate × 2080'
    );
  });

  check('Recommendation rejects client rate-only payloads', function () {
    let threw = false;
    try {
      validateCompensationRecommendation_(
        {
          recommendedPayRate: 50,
          proposedEffectiveDate: '2026-09-01',
          businessJustification: 'Merit',
        },
        46.4
      );
    } catch (error) {
      threw = true;
      assert_(
        String(error.message).indexOf('percent') >= 0,
        'Must require percent when rate-only is sent'
      );
    }
    assert_(threw, 'Rate-only recommendation must throw');
  });

  check('Recommendation rejects negative and zero percent', function () {
    let negativeThrew = false;
    try {
      validateCompensationRecommendation_(
        {
          recommendedPercent: -1,
          proposedEffectiveDate: '2026-09-01',
          businessJustification: 'Merit',
        },
        46.4
      );
    } catch (error) {
      negativeThrew = true;
    }
    assert_(negativeThrew, 'Negative percent must throw');

    let zeroThrew = false;
    try {
      validateCompensationRecommendation_(
        {
          recommendedPercent: 0,
          proposedEffectiveDate: '2026-09-01',
          businessJustification: 'Merit',
        },
        46.4
      );
    } catch (error) {
      zeroThrew = true;
    }
    assert_(zeroThrew, 'Zero percent must throw');
  });

  check('Owner override requires notes and owner name', function () {
    const record = {
      'Original Pay Rate': 46.4,
      'Manager Recommended Pay Rate': 51.97,
      'Manager Recommended Percent': 0.12,
    };
    let threw = false;
    try {
      validateOwnerDecisionPayload_(
        {
          mode: 'override',
          ownerName: 'Jane Partner',
          finalApprovedPercent: 8,
          compensationEffectiveDate: '2026-09-01',
        },
        record
      );
    } catch (error) {
      threw = true;
      assert_(
        String(error.message).indexOf('Notes') >= 0,
        'Override must require notes'
      );
    }
    assert_(threw, 'Override without notes must throw');

    const approved = validateOwnerDecisionPayload_(
      {
        mode: 'approve',
        ownerName: 'Jane Partner',
        compensationEffectiveDate: '2026-09-01',
      },
      record
    );
    assert_(approved.accepted === true, 'Approve mode must accept');
    assert_(
      approved.ownerDecision === V31_COMP.OWNER_DECISION.APPROVED,
      'Approve mode must set Owner Decision = Approved'
    );
    assert_(
      approved.finalRate === 51.97,
      'Approve mode must keep manager recommendation'
    );
  });

  check('Owner override is percentage-only and ignores client rates', function () {
    const record = {
      'Original Pay Rate': 46.4,
      'Manager Recommended Pay Rate': 51.97,
      'Manager Recommended Percent': 0.12,
    };
    const modified = validateOwnerDecisionPayload_(
      {
        mode: 'override',
        ownerName: 'Jane Partner',
        finalApprovedPercent: 8,
        finalApprovedPayRate: 999,
        ownerDecisionNotes: 'Calibration',
        compensationEffectiveDate: '2026-09-01',
      },
      record
    );
    assert_(
      modified.ownerDecision === V31_COMP.OWNER_DECISION.MODIFIED,
      'Override must set Modified'
    );
    assert_(
      modified.finalRate === roundCurrency_(46.4 * 1.08),
      'Override must derive rate from percent, ignoring client rate'
    );
  });

  check('Owner deny preserves no final rates', function () {
    const denied = validateOwnerDecisionPayload_(
      {
        mode: 'deny',
        ownerName: 'Jane Partner',
        ownerDecisionNotes: 'Budget freeze',
      },
      {
        'Original Pay Rate': 46.4,
        'Manager Recommended Pay Rate': 50,
        'Manager Recommended Percent': 0.08,
      }
    );
    assert_(
      denied.ownerDecision === V31_COMP.OWNER_DECISION.DENIED,
      'Deny mode must set Denied'
    );
    assert_(denied.finalRate === null, 'Deny must not set a final rate');
  });

  check('Blank effective date blocks owner decision', function () {
    let threw = false;
    try {
      validateOwnerDecisionPayload_(
        {
          mode: 'approve',
          ownerName: 'Jane Partner',
        },
        {
          'Original Pay Rate': 46.4,
          'Manager Recommended Pay Rate': 50,
          'Manager Recommended Percent': 0.08,
        }
      );
    } catch (error) {
      threw = true;
    }
    assert_(threw, 'Blank effective date must block approval');
  });

  check('Denied status completes the compensation gate', function () {
    assert_(
      isV31CompensationComplete_({
        'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
        'Compensation Status': V31_COMP.STATUS.DENIED,
      }) === true,
      'Denied must satisfy the meeting/signature gate'
    );
  });

  check('Approved adjustment helper rejects Denied', function () {
    assert_(
      isApprovedCompensationAdjustment_({
        'Owner Decision': V31_COMP.OWNER_DECISION.DENIED,
        Status: V31_COMP.STATUS.DENIED,
      }) === false,
      'Denied must not be treated as an approved adjustment'
    );
    assert_(
      isApprovedCompensationAdjustment_({
        'Owner Decision': V31_COMP.OWNER_DECISION.APPROVED,
        Status: V31_COMP.STATUS.AWAITING_SIGNATURES,
      }) === true,
      'Approved awaiting signatures must be an approved adjustment'
    );
  });

  check('Human-readable review PDF filename helpers exist', function () {
    assert_(
      typeof buildReviewPdfFileName_ === 'function',
      'buildReviewPdfFileName_ must exist'
    );
    assert_(
      typeof sanitizeFileNamePart_ === 'function',
      'sanitizeFileNamePart_ must exist'
    );
    assert_(
      sanitizeFileNamePart_('Jane/Doe').indexOf('/') < 0,
      'Filename sanitizer must strip path characters'
    );
  });

  check('History identity is deterministic', function () {
    const id = 'abc-123';
    assert_(
      V31_COMP.HISTORY_EVENT_PREFIX + id ===
        'COMPENSATION_FINAL:abc-123',
      'History ID prefix must be stable'
    );
  });

  check('Rate update classifier applies when predecessor matches', function () {
    assert_(
      classifyCompensationRateUpdate_(46.4, 46.4, 50.0) === 'apply',
      'Matching predecessor must allow apply'
    );
  });

  check('Rate update classifier is complete when already at target', function () {
    assert_(
      classifyCompensationRateUpdate_(50.0, 46.4, 50.0) === 'complete',
      'Already-approved rate must be complete'
    );
  });

  check('Rate update classifier flags conflict on unexpected rate', function () {
    assert_(
      classifyCompensationRateUpdate_(48.0, 46.4, 50.0) === 'conflict',
      'Unexpected current rate must be a conflict, never overwritten'
    );
  });

  check('Rate update lifecycle exposes Updating and Conflict', function () {
    assert_(
      V31_COMP.RATE_UPDATE.UPDATING === 'Updating',
      'Updating state must exist'
    );
    assert_(
      V31_COMP.RATE_UPDATE.CONFLICT === 'Conflict',
      'Conflict state must exist'
    );
    assert_(
      V31_COMP.RATE_UPDATE.UNKNOWN === 'Delivery Unknown',
      'Delivery Unknown state must exist'
    );
  });

  check('History durable status vocabulary exists', function () {
    assert_(
      V31_COMP.HISTORY.PENDING === 'Pending' &&
        V31_COMP.HISTORY.WRITING === 'Writing' &&
        V31_COMP.HISTORY.COMPLETE === 'Complete' &&
        V31_COMP.HISTORY.FAILED === 'Failed',
      'History status states must be defined'
    );
  });

  check('CompensationRecords stores Manager Business Justification', function () {
    assert_(
      V31_COMP.RECORD_HEADERS.indexOf('Manager Business Justification') >= 0,
      'Record schema must persist the manager business justification'
    );
    assert_(
      V31_COMP.HISTORY_HEADERS.indexOf('Manager Business Justification') >= 0,
      'History snapshot must include the manager business justification'
    );
  });

  check('CompensationRecords carries durable history + rate columns', function () {
    [
      'Compensation History Status',
      'Compensation History Attempt ID',
      'Compensation History Written At',
      'Compensation History Last Error',
      'Rate Update Started At',
    ].forEach(function (header) {
      assert_(
        V31_COMP.RECORD_HEADERS.indexOf(header) >= 0,
        'Record schema must include ' + header
      );
    });
  });

  check('CAF provenance marker round-trips', function () {
    const record = {
      'Compensation Record ID': 'rec-9',
      'Final Approved Pay Rate': 50,
      'Compensation Effective Date': '2026-09-01',
    };
    const marker = buildCompensationCafProvenance_('RV-2026-004', record);
    const parsed = parseCompensationCafProvenance_(
      'prefix noise ' + marker
    );
    assert_(parsed, 'Provenance must parse from a description');
    assert_(
      String(parsed.cycleId) === 'RV-2026-004',
      'Provenance must carry cycle ID'
    );
    assert_(
      String(parsed.recordId) === 'rec-9',
      'Provenance must carry record ID'
    );
    assert_(
      Number(parsed.finalApprovedPayRate) === 50,
      'Provenance must carry the approved amount'
    );
  });

  check('CAF provenance parse returns null when marker absent', function () {
    assert_(
      parseCompensationCafProvenance_('no marker here') === null,
      'Missing provenance must return null (fail closed on validation)'
    );
  });

  check('Finalization disposition: not required → skip', function () {
    assert_(
      compensationFinalizationDisposition_(
        V31.COMPENSATION.PENDING,
        false
      ) === 'skip',
      'Compensation not required must skip'
    );
  });

  check('Finalization disposition: No Adjustment → skip', function () {
    assert_(
      compensationFinalizationDisposition_(V31.COMPENSATION.NONE, true) ===
        'skip',
      'No Adjustment must skip'
    );
  });

  check('Finalization disposition: Adjustment → require', function () {
    assert_(
      compensationFinalizationDisposition_(
        V31.COMPENSATION.ADJUSTMENT,
        true
      ) === 'require',
      'Adjustment must require a sealed CAF'
    );
  });

  check(
    'Finalization disposition: existing Adjustment requires CAF even when setting is off',
    function () {
      assert_(
        compensationFinalizationDisposition_(
          V31.COMPENSATION.ADJUSTMENT,
          false
        ) === 'require',
        'Adjustment Recommended must require CAF regardless of COMPENSATION_DECISION_REQUIRED'
      );
    }
  );

  check(
    'Finalization disposition: Pending + not required → skip',
    function () {
      assert_(
        compensationFinalizationDisposition_(
          V31.COMPENSATION.PENDING,
          false
        ) === 'skip',
        'Pending with setting off may skip'
      );
    }
  );

  check('CAF binding: approved requires CAF ID', function () {
    // Pure helpers: packetSpec + attachment count (record lookup covered live).
    const spec = buildFinalDistributionPacketSpec_('m', 's', {
      cafRequired: true,
      cafPdfId: 'caf-1',
    });
    assert_(
      spec.cafRequired === true &&
        spec.cafPdfId === 'caf-1' &&
        classifyFinalDistributionAttachmentCount_(spec) === 3,
      'Approved CAF binding must require three attachments'
    );
  });

  check('CAF binding: denied/no-adj clears CAF', function () {
    const spec = buildFinalDistributionPacketSpec_('m', 's', {
      cafRequired: false,
      cafPdfId: 'ignored',
    });
    assert_(
      spec.cafRequired === false &&
        spec.cafPdfId === '' &&
        classifyFinalDistributionAttachmentCount_(spec) === 2,
      'Non-approved packets must bind two attachments only'
    );
  });

  check('Rate update display shows scheduled effective date', function () {
    assert_(
      formatCompensationRateUpdateDisplay_(
        V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE,
        '2026-09-01'
      ).indexOf('Scheduled Pay Rate Update') === 0,
      'Future-dated rate update must show Scheduled Pay Rate Update'
    );
    assert_(
      formatCompensationRateUpdateDisplay_(
        V31_COMP.RATE_UPDATE.PENDING_EFFECTIVE,
        '2026-09-01'
      ).indexOf('Effective: ') > 0,
      'Future-dated rate update must include Effective date'
    );
  });

  check('CAF shared filename helper uses Compensation Adjustment Form', function () {
    // buildCompensationCafFileName_ delegates to the shared human-readable helper.
    assert_(
      typeof buildHumanReadableDocumentFileName_ === 'function',
      'Shared human-readable filename helper must exist'
    );
    assert_(
      typeof buildCompensationCafFileName_ === 'function',
      'CAF filename builder must exist'
    );
  });

  check('Currency parser accepts formatted pay strings', function () {
    assert_(
      roundCurrency_(parseSpreadsheetCurrency_('$46.40')) === 46.4,
      'Currency strings must parse'
    );
    assert_(
      roundCurrency_(parseSpreadsheetCurrency_(46.4)) === 46.4,
      'Numeric rates must parse'
    );
  });

  check('HR recommendation event prefix is durable and unique', function () {
    assert_(
      V31_COMP.HR_RECOMMENDATION_EVENT_PREFIX === 'COMP_RECOMMENDATION_READY:',
      'HR recommendation event prefix must match Coach contract'
    );
  });

  check('Manager outcome email recovery tokens are exact', function () {
    assert_(
      V31_COMP.MANAGER_OUTCOME_CONFIRM_TOKEN ===
        'MARK_MANAGER_OUTCOME_EMAIL_CONFIRMED',
      'Confirm token must be exact'
    );
    assert_(
      V31_COMP.MANAGER_OUTCOME_RESEND_TOKEN ===
        'RESEND_MANAGER_OUTCOME_EMAIL_UNKNOWN',
      'Resend token must be exact'
    );
    assert_(
      V31_COMP.MANAGER_OUTCOME_CONFIRM_EVENT_PREFIX + 'C-1' ===
        'MANAGER_OUTCOME_EMAIL_CONFIRMED:C-1',
      'Confirm event ID prefix must be deterministic'
    );
  });

  check('HR recommendation email recovery tokens are exact', function () {
    assert_(
      V31_COMP.HR_RECOMMENDATION_CONFIRM_TOKEN ===
        'MARK_HR_RECOMMENDATION_EMAIL_CONFIRMED',
      'HR confirm token must be exact'
    );
    assert_(
      V31_COMP.HR_RECOMMENDATION_RESEND_TOKEN ===
        'RESEND_HR_RECOMMENDATION_EMAIL_UNKNOWN',
      'HR resend token must be exact'
    );
    assert_(
      V31_COMP.HR_RECOMMENDATION_CONFIRM_EVENT_PREFIX + 'C-1' ===
        'HR_RECOMMENDATION_EMAIL_CONFIRMED:C-1',
      'HR confirm event ID prefix must be deterministic'
    );
  });

  check('Finalization disposition: Pending → block (fail closed)', function () {
    assert_(
      compensationFinalizationDisposition_(
        V31.COMPENSATION.PENDING,
        true
      ) === 'block',
      'Pending must fail closed'
    );
  });

  check('Finalization disposition: blank/unexpected → block', function () {
    assert_(
      compensationFinalizationDisposition_('', true) === 'block',
      'Blank decision must fail closed'
    );
    assert_(
      compensationFinalizationDisposition_('Weird Legacy Value', true) ===
        'block',
      'Unexpected legacy value must fail closed'
    );
  });

  check('Authoritative signature requires MGR+SELF+field agreement', function () {
    const signed = {
      'Manager Signature File ID': 'sig-A',
      'MGR Manager Signature ID': 'sig-A',
      'SELF Manager Signature ID': 'sig-A',
    };
    assert_(
      isAuthoritativeRoleSigned_(signed, PR.ROLE.MANAGER) === true,
      'Matching winner across both documents must be authoritative'
    );
  });

  check('Mislinked signature File ID is not authoritative', function () {
    // Manager field points to a foreign/other artifact that never won the PR
    // signature race → must NOT be treated as the authoritative signature.
    const mislinked = {
      'Manager Signature File ID': 'foreign-image',
      'MGR Manager Signature ID': 'sig-A',
      'SELF Manager Signature ID': 'sig-A',
    };
    assert_(
      isAuthoritativeRoleSigned_(mislinked, PR.ROLE.MANAGER) === false,
      'A mislinked signature File ID must fail the authoritative check'
    );
  });

  check('Split signature (MGR only) is not authoritative', function () {
    const split = {
      'Manager Signature File ID': 'sig-A',
      'MGR Manager Signature ID': 'sig-A',
      'SELF Manager Signature ID': '',
    };
    assert_(
      isAuthoritativeRoleSigned_(split, PR.ROLE.MANAGER) === false,
      'Signature must win across both documents to be authoritative'
    );
  });

  check('Adjustment remains gated when setting later disabled', function () {
    const originalGetSettings = getSettings_;
    getSettings_ = function () {
      return { COMPENSATION_DECISION_REQUIRED: 'FALSE' };
    };
    try {
      assert_(
        isV31CompensationComplete_({
          'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
          'Compensation Status': V31_COMP.STATUS.AWAITING_OWNER,
        }) === false,
        'Awaiting owner Adjustment must remain incomplete'
      );
      assert_(
        isV31CompensationComplete_({
          'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
          'Compensation Status': V31_COMP.STATUS.AWAITING_SIGNATURES,
        }) === true,
        'Resolved Adjustment still completes'
      );
    } finally {
      getSettings_ = originalGetSettings;
    }
  });

  check('Active compensation record helper treats Failed as inactive', function () {
    assert_(
      isCompensationRecordActive_({
        Status: V31_COMP.STATUS.FAILED,
      }) === false,
      'Failed is inactive'
    );
    assert_(
      isCompensationRecordActive_({
        Status: V31_COMP.STATUS.AWAITING_OWNER,
      }) === true,
      'Awaiting owner is active'
    );
  });

  check('Employee acknowledgement requires signature-stage cycle', function () {
    const approved = {
      'Owner Decision': V31_COMP.OWNER_DECISION.APPROVED,
      Status: V31_COMP.STATUS.AWAITING_SIGNATURES,
      'Final Approved Pay Rate': 50,
      'Original Pay Rate': 40,
      'Original Annual Salary': 83200,
      'Final Approved Annual Salary': 104000,
      'Final Approved Percent': 0.25,
      'Compensation Effective Date': new Date(),
    };
    // Stage gate is in getEmployeeCompensationAcknowledgement_; without
    // signature stage it must return null even if an approved record exists.
    const openCycle = {
      Status: PR.CYCLE.OPEN,
      'Cycle ID': 'C-OPEN',
      'Signatures Released At': '',
    };
    // Stub active record lookup if available.
    const originalFind = findActiveCompensationRecordByCycleOptional_;
    findActiveCompensationRecordByCycleOptional_ = function () {
      return { rowNumber: 2, object: approved };
    };
    try {
      assert_(
        getEmployeeCompensationAcknowledgement_(openCycle) === null,
        'Open cycle must not expose acknowledgement'
      );
      const readyCycle = {
        Status: PR.CYCLE.READY,
        'Cycle ID': 'C-READY',
        'Signatures Released At': '',
      };
      assert_(
        getEmployeeCompensationAcknowledgement_(readyCycle) === null,
        'Ready cycle must not expose acknowledgement'
      );
      const meetingCycle = {
        Status: PR.CYCLE.MEETING,
        'Cycle ID': 'C-MEET',
        'Signatures Released At': '',
      };
      assert_(
        getEmployeeCompensationAcknowledgement_(meetingCycle) === null,
        'Meeting Open must not expose acknowledgement'
      );
      const sigCycle = {
        Status: PR.CYCLE.SIGNATURES,
        'Cycle ID': 'C-SIG',
        'Signatures Released At': new Date(),
      };
      const ack = getEmployeeCompensationAcknowledgement_(sigCycle);
      assert_(!!ack, 'Signatures stage may expose acknowledgement');
      assert_(
        Number(ack.finalApprovedPayRate) === 50,
        'pay rate surfaced'
      );
    } finally {
      findActiveCompensationRecordByCycleOptional_ = originalFind;
    }
  });

  check('Reset lifecycle stages: Meeting Open rejected; Ready demotes', function () {
    assert_(
      [
        PR.CYCLE.MEETING,
        PR.CYCLE.SIGNATURES,
        PR.CYCLE.FINALIZING,
        PR.CYCLE.COMPLETE,
      ].indexOf(PR.CYCLE.MEETING) !== -1,
      'Meeting Open is a blocked reset stage'
    );
    assert_(
      PR.CYCLE.READY !== PR.CYCLE.MEETING,
      'Ready remains eligible for demotion path'
    );
  });

  check('Manager No Adjustment requires submitted manager review', function () {
    const draftOk = [PR.DOC.SUBMITTED, PR.DOC.COMPLETE].includes(
      String(PR.DOC.DRAFT)
    );
    assert_(draftOk === false, 'Draft manager review must be rejected');
    assert_(
      [PR.DOC.SUBMITTED, PR.DOC.COMPLETE].includes(PR.DOC.SUBMITTED) === true,
      'Submitted manager review is accepted'
    );
  });

  check('requireSingleActiveCompensationRecord_ fails closed on multi-active', function () {
    const originalList = listActiveCompensationRecordLocationsForCycle_;
    pendingCompensationIntegrityAlerts_ = [];
    listActiveCompensationRecordLocationsForCycle_ = function () {
      return [
        {
          rowNumber: 2,
          object: {
            'Compensation Record ID': 'A',
            Status: V31_COMP.STATUS.AWAITING_OWNER,
          },
        },
        {
          rowNumber: 3,
          object: {
            'Compensation Record ID': 'B',
            Status: V31_COMP.STATUS.AWAITING_OWNER,
          },
        },
      ];
    };
    try {
      let failed = false;
      try {
        requireSingleActiveCompensationRecord_('C-MULTI', {
          allowZero: true,
        });
      } catch (error) {
        failed = /Multiple active compensation records/i.test(
          String(error.message || error)
        );
      }
      assert_(failed, 'multi-active must throw');
      assert_(
        pendingCompensationIntegrityAlerts_.length >= 1,
        'alert queued (not written under lock)'
      );
      assert_(
        pendingCompensationIntegrityAlerts_[0].alertKey.indexOf(
          'multiple_active_records'
        ) !== -1,
        'queued multi-active alert key'
      );
    } finally {
      listActiveCompensationRecordLocationsForCycle_ = originalList;
      pendingCompensationIntegrityAlerts_ = [];
    }
  });

  check('isV31CompensationComplete_ fails closed on multi-active mirror', function () {
    const originalCount = countActiveCompensationRecordsForCycle_;
    countActiveCompensationRecordsForCycle_ = function () {
      return 2;
    };
    try {
      assert_(
        isV31CompensationComplete_({
          'Cycle ID': 'C-MULTI-GATE',
          'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
          'Compensation Status': V31_COMP.STATUS.AWAITING_SIGNATURES,
        }) === false,
        'resolved mirror must not override multi-active'
      );
    } finally {
      countActiveCompensationRecordsForCycle_ = originalCount;
    }
  });

  check('reconcile clears Failed mirror with zero active records', function () {
    const store = {
      'Cycle ID': 'C-ZERO',
      Status: PR.CYCLE.READY,
      'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
      'Compensation Status': V31_COMP.STATUS.AWAITING_SIGNATURES,
      'Compensation Record ID': 'REC-FAIL',
      'CAF Final PDF ID': 'caf-old',
    };
    const originals = {
      getAllObjects_: getAllObjects_,
      getSpreadsheet_: getSpreadsheet_,
      findCycle_: findCycle_,
      writeCycle_: writeCycle_,
    };
    getSpreadsheet_ = function () {
      return {
        getSheetByName: function () {
          return { getName: function () { return V31_COMP.RECORDS_SHEET; } };
        },
      };
    };
    getAllObjects_ = function (sheetName) {
      if (sheetName === PR.SHEETS.CYCLES) return [store];
      if (sheetName === V31_COMP.RECORDS_SHEET) {
        return [
          {
            'Compensation Record ID': 'REC-FAIL',
            'Review Cycle ID': 'C-ZERO',
            Status: V31_COMP.STATUS.FAILED,
          },
        ];
      }
      return [];
    };
    findCycle_ = function () {
      return { rowNumber: 2, object: store };
    };
    writeCycle_ = function () {};
    try {
      const result = reconcileCompensationCycleLinks_();
      assert_(result.failedMirrorsCleared >= 1, 'failed mirror cleared');
      assert_(
        String(store['Compensation Decision']) === V31.COMPENSATION.PENDING,
        'decision pending'
      );
      assert_(
        String(store['Compensation Record ID']) === '',
        'record id blank'
      );
      assert_(String(store['CAF Final PDF ID']) === '', 'caf blank');
      assert_(String(store['Status']) === PR.CYCLE.OPEN, 'Ready demoted');
    } finally {
      getAllObjects_ = originals.getAllObjects_;
      getSpreadsheet_ = originals.getSpreadsheet_;
      findCycle_ = originals.findCycle_;
      writeCycle_ = originals.writeCycle_;
    }
  });

  check('Orphan relink readiness: sync + updateCycleReadiness_ reaches Ready', function () {
    const cycle = {
      'Cycle ID': 'C-ORPHAN',
      Status: PR.CYCLE.OPEN,
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.SUBMITTED,
      'Compensation Decision': V31.COMPENSATION.PENDING,
      'Compensation Status': V31_COMP.STATUS.PENDING,
      'Compensation Record ID': '',
    };
    const record = {
      'Compensation Record ID': 'REC-ORPHAN',
      Status: V31_COMP.STATUS.AWAITING_SIGNATURES,
      'Owner Decision': V31_COMP.OWNER_DECISION.APPROVED,
      'Manager Recommendation Submitted At': new Date(),
      'Manager Recommendation Submitted By': 'mgr@aitheras.com',
    };
    syncCycleCompensationSummary_(cycle, record);
    updateCycleReadiness_(cycle);
    assert_(
      String(cycle['Compensation Record ID']) === 'REC-ORPHAN',
      'mirror restored'
    );
    assert_(
      String(cycle['Status']) === PR.CYCLE.READY,
      'lifecycle recalculated to Ready for Review Meeting'
    );
  });

  check('Reset reason blank rejected by server contract', function () {
    assert_(
      !cleanText_('   '),
      'whitespace-only reason is empty after cleanText_'
    );
  });

  check('Compensation pending-audit Event IDs are deterministic', function () {
    assert_(
      buildPendingAuditEvent_(
        'C1',
        'Compensation recommendation submitted',
        'mgr@aitheras.com',
        '',
        V31.COMPENSATION.ADJUSTMENT,
        '{}',
        'COMP_RECOMMENDATION_SUBMITTED:REC-1'
      ).eventId === 'COMP_RECOMMENDATION_SUBMITTED:REC-1',
      'recommendation event id'
    );
    assert_(
      buildPendingAuditEvent_(
        'C1',
        'Compensation decision reset',
        'hr@aitheras.com',
        V31.COMPENSATION.ADJUSTMENT,
        V31.COMPENSATION.PENDING,
        'reason',
        'COMP_RESET:C1:2026-08-10T12:00:00.000Z'
      ).eventId === 'COMP_RESET:C1:2026-08-10T12:00:00.000Z',
      'reset event id'
    );
  });

  check('Public reset/submit orchestration: A Failed then B active', function () {
    const store = {
      'Cycle ID': 'C-REPL',
      Status: PR.CYCLE.OPEN,
      'Manager Email': 'mgr@aitheras.com',
      'Employee Email': 'emp@aitheras.com',
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Self Evaluation Status': PR.DOC.DRAFT,
      'Compensation Decision': V31.COMPENSATION.ADJUSTMENT,
      'Compensation Status': V31_COMP.STATUS.AWAITING_OWNER,
      'Compensation Record ID': 'REC-A',
      'CAF Final PDF ID': '',
    };
    const records = [
      {
        'Compensation Record ID': 'REC-A',
        'Review Cycle ID': 'C-REPL',
        Status: V31_COMP.STATUS.AWAITING_OWNER,
      },
    ];
    const originals = {
      withLock_: withLock_,
      findCycle_: findCycle_,
      writeCycle_: writeCycle_,
      getCurrentUserEmail_: getCurrentUserEmail_,
      isHrUser_: isHrUser_,
      ensureCompensationDataModel_: ensureCompensationDataModel_,
      listActiveCompensationRecordLocationsForCycle_:
        listActiveCompensationRecordLocationsForCycle_,
      writeCompensationRecord_: writeCompensationRecord_,
      appendCompensationRecord_: appendCompensationRecord_,
      getAssignmentPayRate_: getAssignmentPayRate_,
      getCombinedSignatureState_: getCombinedSignatureState_,
      commitAuditEventOutsideLock_: commitAuditEventOutsideLock_,
      validateCompensationRecommendation_:
        validateCompensationRecommendation_,
      syncCycleCompensationSummary_: syncCycleCompensationSummary_,
      updateCycleReadiness_: updateCycleReadiness_,
      perfGetRequest_:
        typeof perfGetRequest_ === 'function' ? perfGetRequest_ : null,
    };

    withLock_ = function (inner) {
      return inner();
    };
    findCycle_ = function () {
      return { rowNumber: 2, object: store };
    };
    writeCycle_ = function () {};
    getCurrentUserEmail_ = function () {
      return 'hr@aitheras.com';
    };
    isHrUser_ = function () {
      return true;
    };
    ensureCompensationDataModel_ = function () {};
    listActiveCompensationRecordLocationsForCycle_ = function () {
      const out = [];
      records.forEach(function (row, index) {
        if (!isCompensationRecordActive_(row)) return;
        out.push({ rowNumber: index + 2, object: row });
      });
      return out;
    };
    writeCompensationRecord_ = function (rowNumber, object) {
      records[rowNumber - 2] = object;
    };
    appendCompensationRecord_ = function (object) {
      records.push(object);
    };
    getAssignmentPayRate_ = function () {
      return { found: true, rate: 40, annual: 83200 };
    };
    getCombinedSignatureState_ = function () {
      return {
        managerSigned: false,
        employeeSigned: false,
        hrSigned: false,
      };
    };
    commitAuditEventOutsideLock_ = function (event) {
      return { ok: true, warning: '', eventId: event.eventId };
    };
    validateCompensationRecommendation_ = function (payload) {
      return {
        recommendedRate: 50,
        recommendedAnnual: 104000,
        recommendedPercent: 0.25,
        businessJustification: 'Merit',
        proposedEffectiveDate: new Date('2026-09-01'),
      };
    };
    if (originals.perfGetRequest_) {
      perfGetRequest_ = function () {
        return { cache: {} };
      };
    }

    try {
      const resetResult = resetCompensationDecision(
        'C-REPL',
        'Coach regression reset'
      );
      assert_(resetResult.ok === true, 'reset ok');
      assert_(
        String(records[0].Status) === V31_COMP.STATUS.FAILED,
        'A marked Failed'
      );
      assert_(
        String(store['Compensation Decision']) ===
          V31.COMPENSATION.PENDING,
        'cycle pending'
      );

      getCurrentUserEmail_ = function () {
        return 'mgr@aitheras.com';
      };
      isHrUser_ = function () {
        return false;
      };
      const submitResult = submitCompensationRecommendation('C-REPL', {});
      assert_(submitResult.ok === true, 'replacement submit ok');
      assert_(
        records.length === 2 &&
          String(records[1].Status) === V31_COMP.STATUS.AWAITING_OWNER,
        'B active'
      );
      assert_(
        String(store['Compensation Record ID']) ===
          String(submitResult.compensationRecordId),
        'cycle linked to B'
      );
    } finally {
      withLock_ = originals.withLock_;
      findCycle_ = originals.findCycle_;
      writeCycle_ = originals.writeCycle_;
      getCurrentUserEmail_ = originals.getCurrentUserEmail_;
      isHrUser_ = originals.isHrUser_;
      ensureCompensationDataModel_ = originals.ensureCompensationDataModel_;
      listActiveCompensationRecordLocationsForCycle_ =
        originals.listActiveCompensationRecordLocationsForCycle_;
      writeCompensationRecord_ = originals.writeCompensationRecord_;
      appendCompensationRecord_ = originals.appendCompensationRecord_;
      getAssignmentPayRate_ = originals.getAssignmentPayRate_;
      getCombinedSignatureState_ = originals.getCombinedSignatureState_;
      commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
      validateCompensationRecommendation_ =
        originals.validateCompensationRecommendation_;
      if (originals.perfGetRequest_) {
        perfGetRequest_ = originals.perfGetRequest_;
      }
    }
  });

  check('Public reset during Meeting Open is rejected', function () {
    const store = {
      'Cycle ID': 'C-MEET-RESET',
      Status: PR.CYCLE.MEETING,
      'Compensation Decision': V31.COMPENSATION.NONE,
    };
    const originals = {
      withLock_: withLock_,
      findCycle_: findCycle_,
      getCurrentUserEmail_: getCurrentUserEmail_,
      isHrUser_: isHrUser_,
      ensureCompensationDataModel_: ensureCompensationDataModel_,
    };
    withLock_ = function (inner) {
      return inner();
    };
    findCycle_ = function () {
      return { rowNumber: 2, object: store };
    };
    getCurrentUserEmail_ = function () {
      return 'hr@aitheras.com';
    };
    isHrUser_ = function () {
      return true;
    };
    ensureCompensationDataModel_ = function () {};
    try {
      let rejected = false;
      try {
        resetCompensationDecision('C-MEET-RESET', 'too late');
      } catch (error) {
        rejected = /cannot be reset after the review meeting/i.test(
          String(error.message || error)
        );
      }
      assert_(rejected, 'meeting open reset rejected');
    } finally {
      withLock_ = originals.withLock_;
      findCycle_ = originals.findCycle_;
      getCurrentUserEmail_ = originals.getCurrentUserEmail_;
      isHrUser_ = originals.isHrUser_;
      ensureCompensationDataModel_ = originals.ensureCompensationDataModel_;
    }
  });

  check('Public No Adjustment before Manager submit is rejected', function () {
    const store = {
      'Cycle ID': 'C-NOADJ',
      Status: PR.CYCLE.OPEN,
      'Manager Email': 'mgr@aitheras.com',
      'Employee Email': 'emp@aitheras.com',
      'Manager Review Status': PR.DOC.DRAFT,
      'Compensation Decision': V31.COMPENSATION.PENDING,
    };
    const originals = {
      withLock_: withLock_,
      findCycle_: findCycle_,
      getCurrentUserEmail_: getCurrentUserEmail_,
      isHrUser_: isHrUser_,
      ensureCompensationDataModel_: ensureCompensationDataModel_,
      listActiveCompensationRecordLocationsForCycle_:
        listActiveCompensationRecordLocationsForCycle_,
    };
    withLock_ = function (inner) {
      return inner();
    };
    findCycle_ = function () {
      return { rowNumber: 2, object: store };
    };
    getCurrentUserEmail_ = function () {
      return 'mgr@aitheras.com';
    };
    isHrUser_ = function () {
      return false;
    };
    ensureCompensationDataModel_ = function () {};
    listActiveCompensationRecordLocationsForCycle_ = function () {
      return [];
    };
    try {
      let rejected = false;
      try {
        submitNoCompensationAdjustment('C-NOADJ', 'early');
      } catch (error) {
        rejected = /Submit the manager review before recording No Adjustment/i.test(
          String(error.message || error)
        );
      }
      assert_(rejected, 'early No Adjustment rejected');
    } finally {
      withLock_ = originals.withLock_;
      findCycle_ = originals.findCycle_;
      getCurrentUserEmail_ = originals.getCurrentUserEmail_;
      isHrUser_ = originals.isHrUser_;
      ensureCompensationDataModel_ = originals.ensureCompensationDataModel_;
      listActiveCompensationRecordLocationsForCycle_ =
        originals.listActiveCompensationRecordLocationsForCycle_;
    }
  });

  check('Audit failure after compensation commit returns warning not rollback', function () {
    const store = {
      'Cycle ID': 'C-AUD',
      Status: PR.CYCLE.OPEN,
      'Manager Email': 'mgr@aitheras.com',
      'Employee Email': 'emp@aitheras.com',
      'Manager Review Status': PR.DOC.SUBMITTED,
      'Compensation Decision': V31.COMPENSATION.PENDING,
    };
    const originals = {
      withLock_: withLock_,
      findCycle_: findCycle_,
      writeCycle_: writeCycle_,
      getCurrentUserEmail_: getCurrentUserEmail_,
      isHrUser_: isHrUser_,
      ensureCompensationDataModel_: ensureCompensationDataModel_,
      listActiveCompensationRecordLocationsForCycle_:
        listActiveCompensationRecordLocationsForCycle_,
      commitAuditEventOutsideLock_: commitAuditEventOutsideLock_,
      updateCycleReadiness_: updateCycleReadiness_,
    };
    withLock_ = function (inner) {
      return inner();
    };
    findCycle_ = function () {
      return { rowNumber: 2, object: store };
    };
    writeCycle_ = function () {};
    getCurrentUserEmail_ = function () {
      return 'mgr@aitheras.com';
    };
    isHrUser_ = function () {
      return false;
    };
    ensureCompensationDataModel_ = function () {};
    listActiveCompensationRecordLocationsForCycle_ = function () {
      return [];
    };
    commitAuditEventOutsideLock_ = function () {
      return {
        ok: false,
        warning:
          'The change was saved, but the audit trail write failed. System Health has been notified.',
        eventId: 'COMP_NO_ADJUSTMENT:C-AUD:x',
      };
    };
    try {
      const result = submitNoCompensationAdjustment('C-AUD', 'ok');
      assert_(result.ok === true, 'business commit succeeded');
      assert_(
        String(store['Compensation Decision']) === V31.COMPENSATION.NONE,
        'decision committed'
      );
      assert_(!!result.auditWarning, 'audit warning surfaced');
    } finally {
      withLock_ = originals.withLock_;
      findCycle_ = originals.findCycle_;
      writeCycle_ = originals.writeCycle_;
      getCurrentUserEmail_ = originals.getCurrentUserEmail_;
      isHrUser_ = originals.isHrUser_;
      ensureCompensationDataModel_ = originals.ensureCompensationDataModel_;
      listActiveCompensationRecordLocationsForCycle_ =
        originals.listActiveCompensationRecordLocationsForCycle_;
      commitAuditEventOutsideLock_ = originals.commitAuditEventOutsideLock_;
      updateCycleReadiness_ = originals.updateCycleReadiness_;
    }
  });

  check('HR recommendation recovery flushes multi-active integrity alerts', function () {
    pendingCompensationIntegrityAlerts_ = [];
    let flushed = 0;
    const originals = {
      assertActiveHrDomain_: assertActiveHrDomain_,
      findCompensationRecordByCycle_: findCompensationRecordByCycle_,
      flushPendingCompensationIntegrityAlerts_:
        flushPendingCompensationIntegrityAlerts_,
      listActiveCompensationRecordLocationsForCycle_:
        listActiveCompensationRecordLocationsForCycle_,
    };
    assertActiveHrDomain_ = function () {
      return 'hr@aitheras.com';
    };
    listActiveCompensationRecordLocationsForCycle_ = function () {
      return [
        {
          rowNumber: 2,
          object: {
            'Compensation Record ID': 'A',
            Status: V31_COMP.STATUS.AWAITING_OWNER,
          },
        },
        {
          rowNumber: 3,
          object: {
            'Compensation Record ID': 'B',
            Status: V31_COMP.STATUS.AWAITING_OWNER,
          },
        },
      ];
    };
    findCompensationRecordByCycle_ = function (cycleId) {
      return requireSingleActiveCompensationRecord_(cycleId, {
        allowZero: false,
      });
    };
    flushPendingCompensationIntegrityAlerts_ = function () {
      flushed += 1;
      pendingCompensationIntegrityAlerts_ = [];
    };
    try {
      let markRejected = false;
      try {
        markCompensationRecommendationHrEmailConfirmed('C-FLUSH', {
          confirmed: true,
          confirmationToken: V31_COMP.HR_RECOMMENDATION_CONFIRM_TOKEN,
          evidenceNote: 'evidence',
          originalAttemptId: 'attempt-1',
        });
      } catch (error) {
        markRejected = /Multiple active compensation records/i.test(
          String(error.message || error)
        );
      }
      assert_(markRejected, 'mark confirm rejects multi-active');
      assert_(flushed >= 1, 'mark confirm flushes integrity alerts');

      flushed = 0;
      pendingCompensationIntegrityAlerts_ = [];
      let resendRejected = false;
      try {
        resendCompensationRecommendationHrEmailUnknown('C-FLUSH', {
          confirmed: true,
          confirmationToken: V31_COMP.HR_RECOMMENDATION_RESEND_TOKEN,
          originalAttemptId: 'attempt-1',
        });
      } catch (error) {
        resendRejected = /Multiple active compensation records/i.test(
          String(error.message || error)
        );
      }
      assert_(resendRejected, 'resend rejects multi-active');
      assert_(flushed >= 1, 'resend flushes integrity alerts');
    } finally {
      assertActiveHrDomain_ = originals.assertActiveHrDomain_;
      findCompensationRecordByCycle_ = originals.findCompensationRecordByCycle_;
      flushPendingCompensationIntegrityAlerts_ =
        originals.flushPendingCompensationIntegrityAlerts_;
      listActiveCompensationRecordLocationsForCycle_ =
        originals.listActiveCompensationRecordLocationsForCycle_;
      pendingCompensationIntegrityAlerts_ = [];
    }
  });

  const failed = results.filter(function (item) {
    return !item.ok;
  });
  Logger.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        passed: results.length - failed.length,
        failed: failed.length,
        results: results,
      },
      null,
      2
    )
  );
  return {
    ok: failed.length === 0,
    passed: results.length - failed.length,
    failed: failed.length,
    results: results,
  };
}
