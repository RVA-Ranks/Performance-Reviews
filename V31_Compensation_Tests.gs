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
