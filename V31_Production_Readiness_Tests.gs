/**
 * Delivery E production-readiness security and live-boundary tests.
 *
 * Run from the Apps Script editor:
 *   runV31ProductionReadinessTests_()
 *
 * Pure coverage for settings/security gates, live-probe honesty, and
 * Complete-cycle audit-row deep checks. Workspace Drive/Calendar/PDF
 * execution remains Requires Daniel Sandbox.
 */

function runV31ProductionReadinessTests_() {
  return runStructuredV31Suite_(
    'V31 Production Readiness Tests',
    [
      triggerTestCase_(
        'Delivery A required settings are migrated',
        testReadinessSettingsPresent_
      ),
      triggerTestCase_(
        'Blank automation owner blocks readiness',
        testReadinessBlankOwnerBlocks_
      ),
      triggerTestCase_(
        'Blank signature recovery setting blocks readiness',
        testReadinessBlankSignatureRecoveryBlocks_
      ),
      triggerTestCase_(
        'Blank system alert recipient blocks readiness',
        testReadinessBlankSystemAlertRecipientBlocks_
      ),
      triggerTestCase_(
        'Delivery B correction headers are migrated',
        testSignatureCorrectionHeadersPresent_
      ),
      triggerTestCase_(
        'Production fault injection blocks readiness',
        testReadinessProductionFaultBlocks_
      ),
      triggerTestCase_(
        'Live probes require all Sandbox guards',
        testReadinessLiveProbeGuards_
      ),
      triggerTestCase_(
        'Sandbox live-probe report never claims execution without probes',
        testReadinessLiveProbeHonesty_
      ),
      triggerTestCase_(
        'Complete cycle with matching Event ID but missing audit row blocks deep readiness',
        testReadinessMissingFinalizationAuditRow_
      ),
      triggerTestCase_(
        'Completed PDF probe classifier covers missing trashed folder and identity defects',
        testCompletedPdfProbeClassifier_
      ),
      triggerTestCase_(
        'Healthy Preview configuration can pass trigger gate',
        testReadinessHealthyPreview_
      ),
      triggerTestCase_(
        'Production readiness runner remains private',
        testReadinessRunnerPrivate_
      ),
      triggerTestCase_(
        'Public System Health APIs remain HR-gated names',
        testSystemHealthPublicApiSurface_
      ),
      {
        name: 'Live owner-visible trigger and replacement evidence',
        severity: 'Blocking',
        skip: true,
        skipMessage: 'Requires Daniel Sandbox',
      },
      {
        name: 'Sandbox live Drive/Calendar/template/PDF probe execution',
        severity: 'Blocking',
        skip: true,
        skipMessage: 'Requires Daniel Sandbox',
      },
      {
        name: 'Completed PDF Drive existence trash MIME folder identity probes',
        severity: 'Blocking',
        skip: true,
        skipMessage: 'Requires Daniel Sandbox',
      },
    ]
  );
}

function readinessSettingsFixture_() {
  const values = {};
  Object.keys(V31.SETTINGS_DEFAULTS).forEach(function (key) {
    values[key] = V31.SETTINGS_DEFAULTS[key];
  });
  values.APP_VERSION = APP_VERSION;
  values.ENVIRONMENT = 'Production';
  values.ALLOWED_DOMAIN = 'aitheras.com';
  values.AUTOMATION_MODE = 'Preview';
  values.AUTOMATION_TRIGGER_HOUR = '8';
  values.SYSTEM_ADMIN_EMAIL = 'aitheras-hr@aitheras.com';
  values.SIGNATURE_RECOVERY_FOLDER_ID = 'test-recovery-folder';
  values.ENABLE_FAULT_INJECTION = 'false';
  return values;
}

function healthyPreviewTriggerFixture_(settings) {
  return buildAutomationTriggerHealth_(
    settings,
    [],
    settings.AUTOMATION_OWNER_EMAIL,
    'America/New_York'
  );
}

function testReadinessSettingsPresent_() {
  const required = [
    'APP_VERSION',
    'ENVIRONMENT',
    'AUTOMATION_OWNER_EMAIL',
    'SYSTEM_ADMIN_EMAIL',
    'OUTBOX_STALE_MINUTES',
    'SYSTEM_ALERT_STALE_MINUTES',
    'FINAL_DISTRIBUTION_STALE_MINUTES',
    'FINALIZATION_AUDIT_STALE_MINUTES',
    'PDF_GENERATION_STALE_MINUTES',
    'SYSTEM_ALERT_RECIPIENT',
    'SIGNATURE_RECOVERY_FOLDER_ID',
    'AUTOMATION_TRIGGER_UNIQUE_ID',
    'AUTOMATION_TRIGGER_INSTALLED_AT',
    'AUTOMATION_LAST_RUN',
    'AUTOMATION_LAST_SUCCESS',
    'AUTOMATION_LAST_FAILURE',
    'AUTOMATION_LAST_ERROR',
    'ENABLE_FAULT_INJECTION',
    'FAULT_POINT',
    'FAULT_CYCLE_ID',
    'FAULT_ONCE',
  ];

  required.forEach(function (key) {
    assertTriggerTest_(
      Object.prototype.hasOwnProperty.call(
        V31.SETTINGS_DEFAULTS,
        key
      ),
      'Missing Delivery A setting: ' + key
    );
  });
}

function testReadinessBlankOwnerBlocks_() {
  const settings = readinessSettingsFixture_();
  settings.AUTOMATION_OWNER_EMAIL = '';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    { liveProbes: false }
  );

  assertTriggerTest_(!report.ok, 'Blank owner must block readiness.');
  assertTriggerTest_(
    report.blocking.some(function (row) {
      return row.code === 'AUTOMATION_OWNER_REQUIRED';
    }),
    'Owner blocker must be explicit.'
  );
}

function testReadinessBlankSignatureRecoveryBlocks_() {
  const settings = readinessSettingsFixture_();
  settings.SIGNATURE_RECOVERY_FOLDER_ID = '';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    { liveProbes: false }
  );
  assertTriggerTest_(
    report.blocking.some(function (row) {
      return (
        row.code === 'SIGNATURE_RECOVERY_FOLDER_REQUIRED'
      );
    }),
    'Blank signature recovery folder must block readiness.'
  );
}

function testReadinessBlankSystemAlertRecipientBlocks_() {
  const settings = readinessSettingsFixture_();
  settings.SYSTEM_ALERT_RECIPIENT = '';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    { liveProbes: false }
  );
  assertTriggerTest_(
    report.blocking.some(function (row) {
      return row.code === 'SYSTEM_ALERT_RECIPIENT_REQUIRED';
    }),
    'Blank system alert recipient must block readiness.'
  );
}

function testSignatureCorrectionHeadersPresent_() {
  [
    'Signature Artifact Warning',
    'Signature Audit Warning',
    'Signature Winning Attempt ID',
    'Signature Recovery File ID',
    'Signature Recovery Attempt ID',
    'Signature Recovery Details JSON',
    'Signature Reconciliation Status',
    'Signature Reconciliation Attempt ID',
    'Signature Reconciliation Selected File ID',
    'Signature Reconciliation Started At',
    'Signature Reconciliation Last Error',
  ].forEach(function (suffix) {
    [PR.ROLE.MANAGER, PR.ROLE.EMPLOYEE, PR.ROLE.HR].forEach(
      function (role) {
        const prefix =
          role === PR.ROLE.HR ? 'HR' : String(role);
        assertTriggerTest_(
          V31.CYCLE_HEADERS.indexOf(prefix + ' ' + suffix) >= 0,
          'Missing Delivery B correction header: ' +
            prefix +
            ' ' +
            suffix
        );
      }
    );
  });
}

function testReadinessProductionFaultBlocks_() {
  const settings = readinessSettingsFixture_();
  settings.AUTOMATION_OWNER_EMAIL = 'owner@aitheras.com';
  settings.ENABLE_FAULT_INJECTION = 'true';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    { liveProbes: false }
  );

  assertTriggerTest_(
    report.blocking.some(function (row) {
      return row.code === 'PRODUCTION_FAULT_INJECTION';
    }),
    'Production fault setting must be blocking.'
  );
}

function testReadinessLiveProbeGuards_() {
  const settings = readinessSettingsFixture_();
  settings.AUTOMATION_OWNER_EMAIL = 'owner@aitheras.com';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    {
      liveProbes: true,
      sandboxConfirmed: true,
      confirmationToken: 'SANDBOX_LIVE_PROBES',
    }
  );

  assertTriggerTest_(
    report.blocking.some(function (row) {
      return row.code === 'LIVE_PROBE_GUARD';
    }),
    'Production environment must reject live probes.'
  );
  assertTriggerTest_(
    report.liveProbesExecuted === false,
    'Readiness checks must not execute live probes by default.'
  );
  assertTriggerTest_(
    report.liveProbes &&
      report.liveProbes.requested === true &&
      report.liveProbes.allowed === false &&
      report.liveProbes.executed === false,
    'Live-probe report must record requested/allowed/executed honestly.'
  );
}

function testReadinessLiveProbeHonesty_() {
  const settings = readinessSettingsFixture_();
  settings.ENVIRONMENT = 'Sandbox';
  settings.AUTOMATION_OWNER_EMAIL = 'owner@aitheras.com';
  const report = buildProductionReadinessReport_(
    settings,
    healthyPreviewTriggerFixture_(settings),
    {
      liveProbes: true,
      sandboxConfirmed: true,
      confirmationToken: 'SANDBOX_LIVE_PROBES',
    }
  );

  assertTriggerTest_(
    report.liveProbesExecuted === false,
    'Sandbox confirmation must not claim probes executed before implementation.'
  );
  assertTriggerTest_(
    report.liveProbes &&
      report.liveProbes.requested === true &&
      report.liveProbes.allowed === true &&
      report.liveProbes.executed === false,
    'Allowed Sandbox probe report must keep executed=false until probes exist.'
  );
  assertTriggerTest_(
    Array.isArray(report.liveProbes.checksSkipped) &&
      report.liveProbes.checksSkipped.indexOf('Calendar access') >=
        0 &&
      report.liveProbes.checksSkipped.indexOf('PDF validation') >= 0,
    'Skipped probe catalog must list Calendar and PDF validation.'
  );
  assertTriggerTest_(
    report.warnings.some(function (row) {
      return row.code === 'REQUIRES_DANIEL_SANDBOX';
    }),
    'Unexecuted Sandbox probes must warn Requires Daniel Sandbox.'
  );
  assertTriggerTest_(
    !report.blocking.some(function (row) {
      return row.code === 'LIVE_PROBE_GUARD';
    }),
    'Valid Sandbox confirmation must not raise LIVE_PROBE_GUARD.'
  );
}

function testReadinessMissingFinalizationAuditRow_() {
  const cycleId = 'complete-audit-missing';
  const eventId = 'FINALIZATION_COMPLETE:' + cycleId;
  const cycle = {
    'Cycle ID': cycleId,
    Status: PR.CYCLE.COMPLETE,
    'Employee Name': 'Audit Missing',
    'Finalization Audit Status': 'Complete',
    'Finalization Audit Event ID': eventId,
  };
  const issues = collectCompleteCycleAuditRowIssues_([cycle], {});
  assertTriggerTest_(
    issues.blocking.some(function (row) {
      return row.code === 'FINALIZATION_AUDIT_ROW_MISSING';
    }),
    'Missing audit row must block deep readiness.'
  );
  assertTriggerTest_(
    issues.recoveryItems.some(function (item) {
      return (
        item.action === 'retryFinalization' &&
        item.id === 'audit:' + cycleId
      );
    }),
    'Missing audit row must expose Retry Finalization recovery.'
  );

  const present = collectCompleteCycleAuditRowIssues_([cycle], (function () {
    const set = {};
    set[eventId] = true;
    return set;
  })());
  assertTriggerTest_(
    present.blocking.length === 0,
    'Present audit row must not block.'
  );
}

function testCompletedPdfProbeClassifier_() {
  assertTriggerTest_(
    classifyCompletedPdfProbeResult_({ exists: false }).code ===
      'PDF_MISSING',
    'Missing PDF must be classified.'
  );
  assertTriggerTest_(
    classifyCompletedPdfProbeResult_({
      exists: true,
      trashed: true,
    }).code === 'PDF_TRASHED',
    'Trashed PDF must be classified.'
  );
  assertTriggerTest_(
    classifyCompletedPdfProbeResult_({
      exists: true,
      trashed: false,
      mimeType: 'application/pdf',
      folderId: 'other',
      expectedFolderId: 'review',
    }).code === 'PDF_FOLDER_MISMATCH',
    'Wrong folder must be classified.'
  );
  assertTriggerTest_(
    classifyCompletedPdfProbeResult_({
      exists: true,
      trashed: false,
      mimeType: 'application/pdf',
      folderId: 'review',
      expectedFolderId: 'review',
      identityOk: false,
    }).code === 'PDF_IDENTITY_MISMATCH',
    'Identity mismatch must be classified.'
  );
  assertTriggerTest_(
    classifyCompletedPdfProbeResult_({
      exists: true,
      trashed: false,
      mimeType: 'application/pdf',
      folderId: 'review',
      expectedFolderId: 'review',
      identityOk: true,
    }).ok === true,
    'Valid PDF facts must pass.'
  );
}

function testReadinessHealthyPreview_() {
  const settings = readinessSettingsFixture_();
  settings.AUTOMATION_OWNER_EMAIL = 'owner@aitheras.com';
  const health = healthyPreviewTriggerFixture_(settings);
  const report = buildProductionReadinessReport_(
    settings,
    health,
    { liveProbes: false }
  );

  assertTriggerTest_(health.healthy, 'Preview trigger state must be healthy.');
  assertTriggerTest_(
    report.ok,
    'Configured Preview should pass Delivery A readiness checks.'
  );
}

function testReadinessRunnerPrivate_() {
  assertTriggerTest_(
    typeof runProductionReadinessChecks_ === 'function',
    'Readiness runner must exist with a private trailing underscore.'
  );
  assertTriggerTest_(
    runProductionReadinessChecks_.name.slice(-1) === '_',
    'Readiness runner must not be exposed to google.script.run.'
  );
}

function testSystemHealthPublicApiSurface_() {
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
    typeof getSystemHealthItemDetails === 'function',
    'getSystemHealthItemDetails must remain a public HR API.'
  );
  assertTriggerTest_(
    typeof collectCompleteCycleAuditRowIssues_ === 'function',
    'Audit-row deep-check helper must exist.'
  );
  assertTriggerTest_(
    typeof buildSandboxLiveProbeReport_ === 'function',
    'Live-probe honesty helper must exist.'
  );
  assertTriggerTest_(
    typeof isTerminalCycleStatus_ === 'undefined',
    'Obsolete isTerminalCycleStatus_ must be removed.'
  );
}
