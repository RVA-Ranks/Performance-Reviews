/**
 * Delivery A production-readiness tests.
 *
 * Run from the Apps Script editor:
 *   runV31ProductionReadinessTests_()
 *
 * This delivery covers version, environment, owner, fault, and trigger gates.
 * Resource, workflow, and live-boundary checks are expanded in Delivery E.
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
        'Healthy Preview configuration can pass trigger gate',
        testReadinessHealthyPreview_
      ),
      triggerTestCase_(
        'Production readiness runner remains private',
        testReadinessRunnerPrivate_
      ),
      {
        name: 'Live owner-visible trigger and replacement evidence',
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
