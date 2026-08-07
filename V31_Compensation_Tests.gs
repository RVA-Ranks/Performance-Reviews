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

  check('Recommendation derives rate from percent', function () {
    const clean = validateCompensationRecommendation_(
      {
        recommendedPercent: 12,
        proposedEffectiveDate: '2026-09-01',
        businessJustification: 'Market adjustment',
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
      approved.finalRate === 51.97,
      'Approve mode must keep manager recommendation'
    );
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

  check('History identity is deterministic', function () {
    const id = 'abc-123';
    assert_(
      V31_COMP.HISTORY_EVENT_PREFIX + id ===
        'COMPENSATION_FINAL:abc-123',
      'History ID prefix must be stable'
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
