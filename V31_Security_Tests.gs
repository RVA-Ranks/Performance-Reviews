/**
 * Delivery E security authorization tests.
 *
 * Run from the Apps Script editor:
 *   runV31SecurityTests_()
 *
 * Pure coverage proves employee/manager callers cannot receive admin or
 * recovery capability flags, automation-owner gates reject non-owners, and
 * private setup/test entry points stay underscore-suffixed (not web-client
 * APIs). Session-backed rejection evidence remains Requires Daniel Sandbox.
 */

function runV31SecurityTests_() {
  return runStructuredV31Suite_('V31 Security Tests', [
    triggerTestCase_(
      'Employee cannot receive admin or recovery authorization',
      testSecurityEmployeeDeniedAdmin_
    ),
    triggerTestCase_(
      'Manager cannot receive HR recovery or other-cycle access',
      testSecurityManagerDeniedHrRecovery_
    ),
    triggerTestCase_(
      'HR receives recovery authorization without trigger ownership',
      testSecurityHrRecoveryWithoutOwner_
    ),
    triggerTestCase_(
      'Automation owner alone may administer triggers',
      testSecurityAutomationOwnerTriggerGate_
    ),
    triggerTestCase_(
      'Off-domain callers are denied all admin capabilities',
      testSecurityOffDomainDenied_
    ),
    triggerTestCase_(
      'Compensation remains hidden from employees',
      testSecurityCompensationHiddenFromEmployee_
    ),
    triggerTestCase_(
      'assertAutomationOwnerValues rejects blank and mismatched owners',
      testSecurityAssertAutomationOwnerValues_
    ),
    triggerTestCase_(
      'Manual recovery send requires domain, HR, and confirmation',
      testSecurityManualRecoverySendGate_
    ),
    triggerTestCase_(
      'Private setup and test entry points remain underscore-suffixed',
      testSecurityPrivateEntryPointSuffixes_
    ),
    triggerTestCase_(
      'Public recovery and System Health APIs remain HR-gated names',
      testSecurityPublicRecoveryApiSurface_
    ),
    {
      name: 'Employee session rejected from System Health and recovery endpoints',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Manager session rejected from drains, reconcile, and finalization retry',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Non-owner HR rejected from trigger install/replace/migrate',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
  ]);
}

function testSecurityEmployeeDeniedAdmin_() {
  const auth = decidePublicAdminAuthorization_({
    email: 'employee@aitheras.com',
    allowedDomain: 'aitheras.com',
    isActiveHr: false,
    isManager: false,
    isEmployee: true,
    automationOwnerEmail: 'aitheras-hr@aitheras.com',
  });
  [
    'canSystemHealth',
    'canDrainSystemAlerts',
    'canDrainWorkflowOutbox',
    'canReconcilePdf',
    'canReconcileSignature',
    'canRetryFinalization',
    'canRetryLaunch',
    'canRebuildCalendar',
    'canChangeAutomationSettings',
    'canEnableLiveMode',
    'canAdministerTriggers',
    'canAccessOtherCycles',
    'canInvokePrivateSetupOrTestsFromWebClient',
  ].forEach(function (key) {
    assertTriggerTest_(
      auth[key] === false,
      'Employee must be denied ' + key
    );
  });
}

function testSecurityManagerDeniedHrRecovery_() {
  const auth = decidePublicAdminAuthorization_({
    email: 'manager@aitheras.com',
    allowedDomain: 'aitheras.com',
    isActiveHr: false,
    isManager: true,
    isEmployee: false,
    automationOwnerEmail: 'aitheras-hr@aitheras.com',
  });
  assertTriggerTest_(
    auth.canSeeCompensation === true,
    'Manager may see compensation when authorized.'
  );
  [
    'canSystemHealth',
    'canDrainSystemAlerts',
    'canReconcilePdf',
    'canReconcileSignature',
    'canRetryFinalization',
    'canAccessOtherCycles',
    'canAdministerTriggers',
  ].forEach(function (key) {
    assertTriggerTest_(
      auth[key] === false,
      'Manager must be denied ' + key
    );
  });
}

function testSecurityHrRecoveryWithoutOwner_() {
  const auth = decidePublicAdminAuthorization_({
    email: 'hr.colleague@aitheras.com',
    allowedDomain: 'aitheras.com',
    isActiveHr: true,
    isManager: false,
    isEmployee: false,
    automationOwnerEmail: 'aitheras-hr@aitheras.com',
  });
  assertTriggerTest_(
    auth.canSystemHealth === true &&
      auth.canDrainSystemAlerts === true &&
      auth.canReconcileSignature === true &&
      auth.canRetryFinalization === true,
    'Active HR must receive recovery authorization.'
  );
  assertTriggerTest_(
    auth.canAdministerTriggers === false &&
      auth.canEnableLiveMode === false,
    'Non-owner HR must not administer triggers or enable Live alone.'
  );
}

function testSecurityAutomationOwnerTriggerGate_() {
  const owner = decidePublicAdminAuthorization_({
    email: 'aitheras-hr@aitheras.com',
    allowedDomain: 'aitheras.com',
    isActiveHr: true,
    automationOwnerEmail: 'aitheras-hr@aitheras.com',
  });
  assertTriggerTest_(
    owner.canAdministerTriggers === true &&
      owner.canEnableLiveMode === true,
    'Configured automation owner HR may administer triggers and enable Live.'
  );
}

function testSecurityOffDomainDenied_() {
  const auth = decidePublicAdminAuthorization_({
    email: 'outsider@example.com',
    allowedDomain: 'aitheras.com',
    isActiveHr: true,
    isManager: true,
    automationOwnerEmail: 'outsider@example.com',
  });
  assertTriggerTest_(
    auth.onDomain === false,
    'Off-domain email must fail domain check.'
  );
  assertTriggerTest_(
    auth.canSystemHealth === false &&
      auth.canAdministerTriggers === false &&
      auth.canSeeCompensation === false,
    'Off-domain callers must receive no admin capabilities.'
  );
}

function testSecurityCompensationHiddenFromEmployee_() {
  const employee = decidePublicAdminAuthorization_({
    email: 'employee@aitheras.com',
    allowedDomain: 'aitheras.com',
    isEmployee: true,
    isActiveHr: false,
    isManager: false,
  });
  const manager = decidePublicAdminAuthorization_({
    email: 'manager@aitheras.com',
    allowedDomain: 'aitheras.com',
    isEmployee: false,
    isActiveHr: false,
    isManager: true,
  });
  assertTriggerTest_(
    employee.canSeeCompensation === false,
    'Employees must not see compensation.'
  );
  assertTriggerTest_(
    manager.canSeeCompensation === true,
    'Managers may see compensation.'
  );
}

function testSecurityAssertAutomationOwnerValues_() {
  let blankFailed = false;
  try {
    assertAutomationOwnerValues_('', 'aitheras-hr@aitheras.com');
  } catch (error) {
    blankFailed = /AUTOMATION_OWNER_EMAIL/i.test(
      String(error.message || error)
    );
  }
  assertTriggerTest_(
    blankFailed,
    'Blank automation owner must throw.'
  );

  let mismatchFailed = false;
  try {
    assertAutomationOwnerValues_(
      'aitheras-hr@aitheras.com',
      'other@aitheras.com'
    );
  } catch (error) {
    mismatchFailed = /designated automation owner/i.test(
      String(error.message || error)
    );
  }
  assertTriggerTest_(
    mismatchFailed,
    'Mismatched effective user must throw.'
  );

  assertTriggerTest_(
    assertAutomationOwnerValues_(
      'aitheras-hr@aitheras.com',
      'aitheras-hr@aitheras.com'
    ) === 'aitheras-hr@aitheras.com',
    'Matching owner must return the normalized owner email.'
  );
}

function testSecurityManualRecoverySendGate_() {
  assertTriggerTest_(
    canManualRecoverySend_(false, true, {
      confirmed: true,
      confirmationToken: 'SEND_CONFIRMED_RECOVERY_EMAILS',
    }) === false,
    'Off-domain manual recovery must fail.'
  );
  assertTriggerTest_(
    canManualRecoverySend_(true, false, {
      confirmed: true,
      confirmationToken: 'SEND_CONFIRMED_RECOVERY_EMAILS',
    }) === false,
    'Non-HR manual recovery must fail.'
  );
  assertTriggerTest_(
    canManualRecoverySend_(true, true, {
      confirmed: false,
      confirmationToken: 'SEND_CONFIRMED_RECOVERY_EMAILS',
    }) === false,
    'Unconfirmed manual recovery must fail.'
  );
  assertTriggerTest_(
    typeof isSystemRecoveryConfirmationValid_ === 'function',
    'Recovery confirmation validator must exist.'
  );
}

function testSecurityPrivateEntryPointSuffixes_() {
  assertTriggerTest_(
    typeof setupReviewSystem_ === 'function' &&
      String(setupReviewSystem_.name || 'setupReviewSystem_').slice(
        -1
      ) === '_',
    'setupReviewSystem_ must remain private.'
  );
  assertTriggerTest_(
    typeof upgradeToV31_ === 'function',
    'upgradeToV31_ must remain private.'
  );
  assertTriggerTest_(
    typeof runProductionReadinessChecks_ === 'function' &&
      runProductionReadinessChecks_.name.slice(-1) === '_',
    'runProductionReadinessChecks_ must remain private.'
  );
  assertTriggerTest_(
    typeof executeSandboxLiveProbes_ === 'function' &&
      executeSandboxLiveProbes_.name.slice(-1) === '_',
    'executeSandboxLiveProbes_ must remain private.'
  );
  assertTriggerTest_(
    typeof runV31SecurityTests_ === 'function' &&
      runV31SecurityTests_.name.slice(-1) === '_',
    'runV31SecurityTests_ must remain private.'
  );
  assertTriggerTest_(
    typeof runV31SignatureSandboxHarness_ === 'function',
    'runV31SignatureSandboxHarness_ must remain private.'
  );
}

function testSecurityPublicRecoveryApiSurface_() {
  assertTriggerTest_(
    typeof getSystemHealthSummary === 'function',
    'getSystemHealthSummary must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof runSystemHealthDeepCheck === 'function',
    'runSystemHealthDeepCheck must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof runSystemHealthSandboxLiveProbes === 'function',
    'runSystemHealthSandboxLiveProbes must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof getSystemAlertsAdminData === 'function',
    'getSystemAlertsAdminData must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof drainSystemAlertsNow === 'function',
    'drainSystemAlertsNow must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof retryReviewFinalization === 'function',
    'retryReviewFinalization must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof reconcileFinalPdf === 'function',
    'reconcileFinalPdf must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof reconcileSignature === 'function',
    'reconcileSignature must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof retryReviewLaunch === 'function',
    'retryReviewLaunch must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof rebuildReviewCalendarEvent === 'function',
    'rebuildReviewCalendarEvent must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof retryPendingAudit === 'function',
    'retryPendingAudit must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof prepareReleaseReviewSignatures === 'function',
    'prepareReleaseReviewSignatures must remain a public release API.'
  );
  assertTriggerTest_(
    typeof getPreviousReviewContext === 'function',
    'getPreviousReviewContext must remain a public manager/HR API.'
  );
  assertTriggerTest_(
    typeof getPreviousReviewCycle === 'function',
    'getPreviousReviewCycle must remain a public manager/HR API.'
  );
  assertTriggerTest_(
    typeof getPreviousReviewPdf === 'function',
    'getPreviousReviewPdf must remain a public manager/HR API.'
  );
  assertTriggerTest_(
    typeof findPreviousCompletedReview_ === 'function' &&
      String(findPreviousCompletedReview_.name || '').slice(-1) === '_',
    'findPreviousCompletedReview_ must remain private.'
  );
  assertTriggerTest_(
    isPreviousReviewCallerAuthorized_({
      isHr: false,
      isCurrentManager: true,
    }) === true &&
      isPreviousReviewCallerAuthorized_({
        isHr: false,
        isCurrentManager: false,
      }) === false,
    'Previous-review access requires current manager or HR.'
  );
}
