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
  values.AUTOMATION_MODE = 'Preview';
  values.AUTOMATION_TRIGGER_HOUR = '8';
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
