/**
 * AITHERAS Performance Review Portal V3.1
 * Automation, calendar, compensation-task, and guided-help services.
 *
 * Important:
 * - V3.1 defaults to Preview mode.
 * - No automatic review cycles are created until HR enables Live mode.
 * - The daily trigger runs as the account that installs it.
 */

const V31 = Object.freeze({
  VERSION: '3.1',
  AUTOMATION_SHEET: 'ReviewAutomationLog',
  SENDING_STALE_MS: 15 * 60 * 1000,
  CALENDAR_MARKER_PREFIX: '[AITHERAS_REVIEW_CYCLE_ID:',

  SETTINGS_DEFAULTS: {
    APP_VERSION: '3.1-production-candidate',
    ENVIRONMENT: 'Production',
    AUTOMATION_MODE: 'Preview',
    REVIEW_NOTICE_DAYS: '28',
    FORM_DUE_DAYS_BEFORE_MEETING: '7',
    AUTOMATION_TRIGGER_HOUR: '8',
    REVIEW_EVENT_START_HOUR: '12',
    REVIEW_EVENT_DURATION_MINUTES: '60',
    SHIFT_WEEKEND_MEETINGS: 'TRUE',
    CALENDAR_ID: 'primary',
    EVENT_EMAIL_REMINDER_DAYS: '7',
    EVENT_POPUP_REMINDER_HOURS: '24',
    COMPENSATION_ADJUSTMENT_URL: '',
    COMPENSATION_DECISION_REQUIRED: 'TRUE',
    COMPENSATION_FOLDER_ID: '',
    HELP_CENTER_ENABLED: 'TRUE',
    AUTOMATION_LAST_RUN: '',
    AUTOMATION_LAST_SUCCESS: '',
    AUTOMATION_LAST_FAILURE: '',
    AUTOMATION_LAST_ERROR: '',
    AUTOMATION_OWNER_EMAIL: 'aitheras-hr@aitheras.com',
    SYSTEM_ADMIN_EMAIL: 'aitheras-hr@aitheras.com',
    OUTBOX_STALE_MINUTES: '15',
    SYSTEM_ALERT_STALE_MINUTES: '15',
    FINAL_DISTRIBUTION_STALE_MINUTES: '15',
    FINALIZATION_AUDIT_STALE_MINUTES: '15',
    PDF_GENERATION_STALE_MINUTES: '30',
    SYSTEM_ALERT_RECIPIENT: 'aitheras-hr@aitheras.com',
    SIGNATURE_RECOVERY_FOLDER_ID: '',
    AUTOMATION_TRIGGER_UNIQUE_ID: '',
    AUTOMATION_TRIGGER_INSTALLED_AT: '',
    ENABLE_FAULT_INJECTION: 'false',
    FAULT_POINT: '',
    FAULT_CYCLE_ID: '',
    FAULT_ONCE: 'true',
  },

  ASSIGNMENT_HEADERS: [
    'Review Automation',
  ],

  CYCLE_HEADERS: [
    'Cycle Source',
    'Automation Key',
    'Automation Notice Sent At',
    'Manager Due Date',
    'Employee Due Date',
    'Calendar Status',
    'Calendar Event ID',
    'Calendar Created At',
    'Calendar Attempt ID',
    'Calendar Started At',
    'Calendar Configuration Status',
    'Calendar Configuration Attempt ID',
    'Calendar Configuration Started At',
    'Calendar Configuration Completed At',
    'Calendar Configuration Last Error',
    'Calendar Configuration Recovery Details JSON',
    'Manager Email Status',
    'Manager Email Sent At',
    'Manager Email Attempt ID',
    'Manager Email Started At',
    'Employee Email Status',
    'Employee Email Sent At',
    'Employee Email Attempt ID',
    'Employee Email Started At',
    'HR Email Status',
    'HR Email Sent At',
    'HR Email Attempt ID',
    'HR Email Started At',
    'Launch Completed At',
    'Last Launch Error',
    'Launch Attempt Count',
    'Manager PDF Status',
    'Manager PDF Attempt ID',
    'Manager PDF Started At',
    'Manager PDF Completed At',
    'Manager PDF Last Error',
    'Manager PDF Recovery Details JSON',
    'Self PDF Status',
    'Self PDF Attempt ID',
    'Self PDF Started At',
    'Self PDF Completed At',
    'Self PDF Last Error',
    'Self PDF Recovery Details JSON',
    'Final Distribution Status',
    'Final Distribution Attempt ID',
    'Final Distribution Started At',
    'Final Distribution Sent At',
    'Final Distribution Last Error',
    'Final Distribution Recovery Details JSON',
    'Finalization Audit Status',
    'Finalization Audit Attempt ID',
    'Finalization Audit Started At',
    'Finalization Audit Completed At',
    'Finalization Audit Last Error',
    'Finalization Audit Event ID',
    'Finalization Last Error',
    'Finalization Attempt Count',
    'Manager Signature Status',
    'Manager Signature Attempt ID',
    'Manager Signature Started At',
    'Manager Signature Last Error',
    'Manager Signature Artifact Warning',
    'Manager Signature Audit Warning',
    'Manager Signature File ID',
    'Manager Signed At',
    'Manager Signature Winning Attempt ID',
    'Manager Signature Recovery File ID',
    'Manager Signature Recovery Attempt ID',
    'Manager Signature Recovery Details JSON',
    'Manager Signature Recovery Recorded At',
    'Manager Signature Reconciliation Status',
    'Manager Signature Reconciliation Attempt ID',
    'Manager Signature Reconciliation Selected File ID',
    'Manager Signature Reconciliation Started At',
    'Manager Signature Reconciliation Last Error',
    'Employee Signature Status',
    'Employee Signature Attempt ID',
    'Employee Signature Started At',
    'Employee Signature Last Error',
    'Employee Signature Artifact Warning',
    'Employee Signature Audit Warning',
    'Employee Signature File ID',
    'Employee Signed At',
    'Employee Signature Winning Attempt ID',
    'Employee Signature Recovery File ID',
    'Employee Signature Recovery Attempt ID',
    'Employee Signature Recovery Details JSON',
    'Employee Signature Recovery Recorded At',
    'Employee Signature Reconciliation Status',
    'Employee Signature Reconciliation Attempt ID',
    'Employee Signature Reconciliation Selected File ID',
    'Employee Signature Reconciliation Started At',
    'Employee Signature Reconciliation Last Error',
    'HR Signature Status',
    'HR Signature Attempt ID',
    'HR Signature Started At',
    'HR Signature Last Error',
    'HR Signature Artifact Warning',
    'HR Signature Audit Warning',
    'HR Signature File ID',
    'HR Signed At',
    'HR Signature Winning Attempt ID',
    'HR Signature Recovery File ID',
    'HR Signature Recovery Attempt ID',
    'HR Signature Recovery Details JSON',
    'HR Signature Recovery Recorded At',
    'HR Signature Reconciliation Status',
    'HR Signature Reconciliation Attempt ID',
    'HR Signature Reconciliation Selected File ID',
    'HR Signature Reconciliation Started At',
    'HR Signature Reconciliation Last Error',
    'Ready Notification Status',
    'Ready Notification Attempt ID',
    'Ready Notification Started At',
    'Ready Notification Sent At',
    'Ready Notification Last Error',
    'Meeting Manager Email Status',
    'Meeting Manager Email Attempt ID',
    'Meeting Manager Email Started At',
    'Meeting Manager Email Sent At',
    'Meeting Manager Email Last Error',
    'Meeting Employee Email Status',
    'Meeting Employee Email Attempt ID',
    'Meeting Employee Email Started At',
    'Meeting Employee Email Sent At',
    'Meeting Employee Email Last Error',
    'Manager Signature Email Status',
    'Manager Signature Email Attempt ID',
    'Manager Signature Email Started At',
    'Manager Signature Email Sent At',
    'Manager Signature Email Last Error',
    'Employee Signature Email Status',
    'Employee Signature Email Attempt ID',
    'Employee Signature Email Started At',
    'Employee Signature Email Sent At',
    'Employee Signature Email Last Error',
    'HR Signature Email Status',
    'HR Signature Email Attempt ID',
    'HR Signature Email Started At',
    'HR Signature Email Sent At',
    'HR Signature Email Last Error',
    'Compensation Decision',
    'Compensation Decision Notes',
    'Compensation Decision At',
    'Compensation Decision By',
    'Compensation Status',
    'Compensation Record ID',
    'CAF Final PDF ID',
  ],

  LOG_HEADERS: [
    'Timestamp',
    'Mode',
    'Action',
    'Employee Email',
    'Employee Name',
    'Review Type',
    'Review Date',
    'Cycle ID',
    'Result',
    'Details',
  ],

  COMPENSATION: {
    PENDING: 'Pending',
    ADJUSTMENT: 'Adjustment Recommended',
    NONE: 'No Adjustment Recommended',
  },

  DELIVERY: {
    PENDING: 'Pending',
    SENDING: 'Sending',
    SENT: 'Sent',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
    SUPERSEDED: 'Superseded',
  },

  SIGNATURE: {
    PENDING: 'Pending',
    SIGNING: 'Signing',
    SIGNED: 'Signed',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
  },

  SIGNATURE_RECONCILIATION: {
    PENDING: 'Pending',
    RECONCILING: 'Reconciling',
    RESOLVED: 'Resolved',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
  },

  SIGNATURE_COMMIT_OUTCOME: {
    COMMITTED: 'COMMITTED',
    SUPERSEDED: 'SUPERSEDED',
    UNKNOWN: 'COMMIT_UNKNOWN',
  },

  CALENDAR: {
    PENDING: 'Pending',
    CREATING: 'Creating',
    CREATED: 'Created',
    CONFIGURING: 'Configuring',
    CONFIGURED: 'Configured',
    UNKNOWN: 'Delivery Unknown',
    FAILED: 'Failed',
  },
});

/* =========================== DATA MODEL / UPGRADE ======================== */

function upgradeToV31_() {
  ensureV31DataModel_();
  ensureConfirmedAdminSettings_();
  let signatureFolder;
  let signatureMigration;
  try {
    signatureFolder = provisionSignatureRecoveryFolder_();
    signatureMigration = migrateLegacySignatureRoleFields_();
    signatureMigration.correctionUpdated =
      migrateSignatureCorrectionFields_().updated;
  } catch (error) {
    persistAutomationSettings_({ AUTOMATION_MODE: 'Preview' });
    throw new Error(
      'Signature recovery migration blocked; automation remains Preview. ' +
        String(error.message || error)
    );
  }
  const settings = getSettings_();
  const ownerEmail = normalizeEmail_(
    settings.AUTOMATION_OWNER_EMAIL
  );
  const triggerMigration = ownerEmail
    ? migrateLegacyReviewAutomationTrigger_()
    : disableReviewAutomationSafely_(
        'Preview',
        getEffectiveAutomationUserEmail_()
      );

  if (!ownerEmail) {
    triggerMigration.partial = true;
    triggerMigration.mode = 'Preview';
    triggerMigration.message =
      'AUTOMATION_OWNER_EMAIL is blank. Automation was forced to Preview and Live remains blocked.';
  }

  SpreadsheetApp.getUi().alert(
    'V3.1 upgrade complete.\n\n' +
      'The upgrade did not send email or create review cycles.\n' +
      'Current automation mode: ' +
      triggerMigration.mode +
      '\n\n' +
      'Trigger migration: ' +
      triggerMigration.message +
      '\nSignature recovery folder: ' +
      signatureFolder.action +
      ' (' +
      signatureFolder.folderId +
      ')' +
      '\nLegacy signature rows normalized: ' +
      String(signatureMigration.updated || 0) +
      '\nSignature correction rows migrated: ' +
      String(signatureMigration.correctionUpdated || 0) +
      '\n\n' +
      'Next:\n' +
      '1. Open the web app as HR.\n' +
      '2. Go to Administration → Review Automation.\n' +
      '3. Add the Compensation Adjustment app URL.\n' +
      '4. Preview upcoming reviews.\n' +
      '5. Enable Live Automation only after the preview is correct.'
  );
}

function ensureConfirmedAdminSettings_() {
  const settings = getSettings_();
  const values = {};
  if (!normalizeEmail_(settings.AUTOMATION_OWNER_EMAIL)) {
    values.AUTOMATION_OWNER_EMAIL =
      'aitheras-hr@aitheras.com';
  }
  if (!normalizeEmail_(settings.SYSTEM_ADMIN_EMAIL)) {
    values.SYSTEM_ADMIN_EMAIL = 'aitheras-hr@aitheras.com';
  }
  if (Object.keys(values).length) {
    persistAutomationSettings_(values);
  }
  return getSettings_();
}

function ensureV31DataModel_() {
  const timer = perfStart_('ensureV31DataModel');
  const ss = getSpreadsheet_();
  const settingsSheet = ss.getSheetByName(PR.SHEETS.SETTINGS);
  const assignments = ss.getSheetByName(PR.SHEETS.ASSIGNMENTS);
  const cycles = ss.getSheetByName(PR.SHEETS.CYCLES);
  const audit =
    ss.getSheetByName(PR.SHEETS.AUDIT) ||
    ss.insertSheet(PR.SHEETS.AUDIT);
  const log =
    ss.getSheetByName(V31.AUTOMATION_SHEET) ||
    ss.insertSheet(V31.AUTOMATION_SHEET);

  ensureHeaders_(settingsSheet, ['Key', 'Value']);
  ensureHeaders_(assignments, V31.ASSIGNMENT_HEADERS);
  ensureHeaders_(cycles, V31.CYCLE_HEADERS);
  ensureReviewAuditEventIdHeader_(audit);
  ensureHeaders_(log, V31.LOG_HEADERS);

  const current = readSettings_(settingsSheet);

  Object.keys(V31.SETTINGS_DEFAULTS).forEach(function (key) {
    const populateWhenBlank = [
      'OUTBOX_STALE_MINUTES',
      'SYSTEM_ALERT_STALE_MINUTES',
      'FINAL_DISTRIBUTION_STALE_MINUTES',
      'FINALIZATION_AUDIT_STALE_MINUTES',
      'PDF_GENERATION_STALE_MINUTES',
      'SYSTEM_ALERT_RECIPIENT',
    ].indexOf(key) >= 0;
    if (!(key in current)) {
      settingsSheet.appendRow([
        key,
        V31.SETTINGS_DEFAULTS[key],
      ]);
    } else if (populateWhenBlank && !String(current[key] || '').trim()) {
      setSetting_(
        settingsSheet,
        key,
        V31.SETTINGS_DEFAULTS[key]
      );
    }
  });

  ensureSystemAlertsDataModel_();
  ensureCompensationDataModel_();

  const assignmentHeaders = getHeaders_(assignments);
  const automationColumn =
    assignmentHeaders.indexOf('Review Automation') + 1;
  const activeColumn =
    assignmentHeaders.indexOf('Active') + 1;

  if (
    automationColumn > 0 &&
    assignments.getMaxRows() > 1
  ) {
    const rowCount = assignments.getMaxRows() - 1;
    const automationRange = assignments.getRange(
      2,
      automationColumn,
      rowCount,
      1
    );

    automationRange.insertCheckboxes();

    if (activeColumn > 0) {
      const automationValues =
        automationRange.getValues();
      const activeValues = assignments
        .getRange(2, activeColumn, rowCount, 1)
        .getValues();
      let changed = false;

      for (let row = 0; row < rowCount; row++) {
        const active =
          activeValues[row][0] === true ||
          String(activeValues[row][0]).toLowerCase() ===
            'true';

        if (
          active &&
          (automationValues[row][0] === '' ||
            automationValues[row][0] == null)
        ) {
          automationValues[row][0] = true;
          changed = true;
        }
      }

      if (changed) {
        automationRange.setValues(
          automationValues
        );
      }
    }
  }

  formatSingleSheet_(log);
  protectV31Sheet_(log);
  perfEnd_(timer);
}

function validateSignatureRecoveryFolder_(
  folderId,
  reviewFolderId,
  requireRestricted
) {
  let folder;
  try {
    perfCountDriveCall_('getFolderById');
    folder = DriveApp.getFolderById(String(folderId || ''));
  } catch (error) {
    throw new Error(
      'SIGNATURE_RECOVERY_FOLDER_ID is configured but inaccessible. Correct or clear the setting.'
    );
  }

  if (
    folder.getId() === String(reviewFolderId || '') ||
    folder.getName() !== 'AITHERAS Signature Recovery' ||
    (typeof folder.isTrashed === 'function' && folder.isTrashed())
  ) {
    throw new Error(
      'SIGNATURE_RECOVERY_FOLDER_ID is configured but invalid. Correct or clear the setting.'
    );
  }

  let directChild = false;
  const parents = folder.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === String(reviewFolderId || '')) {
      directChild = true;
      break;
    }
  }

  if (!directChild) {
    throw new Error(
      'SIGNATURE_RECOVERY_FOLDER_ID must be a direct child of REVIEW_FOLDER_ID. Correct or clear the setting.'
    );
  }

  const checkRestricted = requireRestricted !== false;
  if (checkRestricted) {
    let sharingAccess;
    try {
      sharingAccess = folder.getSharingAccess();
    } catch (sharingError) {
      throw new Error(
        'SIGNATURE_RECOVERY_FOLDER_ID permission state is unsupported or inherited and could not be verified: ' +
          String(sharingError.message || sharingError)
      );
    }
    if (sharingAccess !== DriveApp.Access.PRIVATE) {
      throw new Error(
        'SIGNATURE_RECOVERY_FOLDER_ID has link or domain sharing enabled (' +
          String(sharingAccess) +
          ').'
      );
    }

    try {
      if (
        typeof folder.getOwner === 'function' &&
        !folder.getOwner()
      ) {
        throw new Error(
          'Shared Drive ownership does not expose a verifiable individual owner.'
        );
      }
    } catch (ownerError) {
      throw new Error(
        'SIGNATURE_RECOVERY_FOLDER_ID is in a Shared Drive or has an unsupported ownership model: ' +
          String(ownerError.message || ownerError)
      );
    }

    const allowed = getAllowedSignatureRecoveryEmails_();
    const unauthorizedEditors = folder
      .getEditors()
      .map(function (user) {
        return normalizeEmail_(user.getEmail());
      })
      .filter(function (email) {
        return email && !allowed[email];
      });
    if (unauthorizedEditors.length) {
      throw new Error(
        'SIGNATURE_RECOVERY_FOLDER_ID has unauthorized explicit editor access: ' +
          unauthorizedEditors.join(', ')
      );
    }
    const unauthorizedViewers = folder
      .getViewers()
      .map(function (user) {
        return normalizeEmail_(user.getEmail());
      })
      .filter(function (email) {
        return email && !allowed[email];
      });
    if (unauthorizedViewers.length) {
      throw new Error(
        'SIGNATURE_RECOVERY_FOLDER_ID has unauthorized explicit viewer access: ' +
          unauthorizedViewers.join(', ')
      );
    }
  }

  return {
    folder: folder,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
  };
}

function getAllowedSignatureRecoveryEmails_() {
  const allowed = {};
  const settings = getSettings_();
  [
    settings.AUTOMATION_OWNER_EMAIL,
    settings.SYSTEM_ADMIN_EMAIL,
    Session.getEffectiveUser().getEmail(),
  ]
    .concat(
      getAllObjects_(PR.SHEETS.HR)
        .filter(function (row) {
          return (
            row.Active === true ||
            String(row.Active).toLowerCase() === 'true'
          );
        })
        .map(function (row) {
          return row.Email;
        })
    )
    .forEach(function (email) {
      const normalized = normalizeEmail_(email);
      if (normalized) allowed[normalized] = true;
    });
  return allowed;
}

function restrictSignatureRecoveryFolder_(folder) {
  folder.setSharing(
    DriveApp.Access.PRIVATE,
    DriveApp.Permission.NONE
  );
  const allowed = getAllowedSignatureRecoveryEmails_();
  []
    .concat(folder.getEditors ? folder.getEditors() : [])
    .concat(folder.getViewers ? folder.getViewers() : [])
    .forEach(function (user) {
      const email = normalizeEmail_(user.getEmail());
      if (!email || allowed[email]) return;
      try {
        folder.removeEditor(email);
      } catch (editorError) {}
      try {
        folder.removeViewer(email);
      } catch (viewerError) {}
    });
}

function decideSignatureRecoveryFolderProvisioning_(candidates) {
  const count = (candidates || []).length;
  return count === 0
    ? { action: 'create' }
    : count === 1
    ? { action: 'reuse', candidate: candidates[0] }
    : {
        action: 'block',
        code: 'MULTIPLE_SIGNATURE_RECOVERY_FOLDERS',
        candidates: candidates,
      };
}

function provisionSignatureRecoveryFolder_() {
  const initial = getSettings_();
  const reviewFolderId = String(initial.REVIEW_FOLDER_ID || '');
  if (!reviewFolderId) {
    throw new Error(
      'REVIEW_FOLDER_ID must be configured before provisioning signature recovery.'
    );
  }

  try {
    DriveApp.getFolderById(reviewFolderId).getName();
  } catch (error) {
    throw new Error(
      'REVIEW_FOLDER_ID is inaccessible. Signature recovery cannot be provisioned.'
    );
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error(
      'Another signature recovery folder migration is in progress.'
    );
  }

  try {
    const settings = getSettings_();
    const configured = String(
      settings.SIGNATURE_RECOVERY_FOLDER_ID || ''
    );
    if (configured) {
      const preserved = validateSignatureRecoveryFolder_(
        configured,
        reviewFolderId
      );
      preserved.action = 'preserved';
      return preserved;
    }

    const reviewFolder = DriveApp.getFolderById(reviewFolderId);
    const folders = reviewFolder.getFoldersByName(
      'AITHERAS Signature Recovery'
    );
    const candidates = [];
    while (folders.hasNext()) {
      const folder = folders.next();
      try {
        candidates.push(
          validateSignatureRecoveryFolder_(
            folder.getId(),
            reviewFolderId,
            false
          )
        );
      } catch (error) {}
    }

    const decision =
      decideSignatureRecoveryFolderProvisioning_(candidates);
    if (decision.action === 'block') {
      const failure = new Error(
        'Multiple direct child folders named AITHERAS Signature Recovery were found. HR must select one explicitly.'
      );
      failure.code = 'MULTIPLE_SIGNATURE_RECOVERY_FOLDERS';
      failure.candidates = candidates.map(function (candidate) {
        return {
          folderId: candidate.folderId,
          folderName: candidate.folderName,
          folderUrl: candidate.folderUrl,
        };
      });
      throw failure;
    }

    let selected;
    let action;
    if (decision.action === 'reuse') {
      selected = decision.candidate;
      action = 'recovered';
    } else {
      const created = reviewFolder.createFolder(
        'AITHERAS Signature Recovery'
      );
      selected = validateSignatureRecoveryFolder_(
        created.getId(),
        reviewFolderId,
        false
      );
      action = 'created';
    }

    restrictSignatureRecoveryFolder_(selected.folder);
    selected = validateSignatureRecoveryFolder_(
      selected.folderId,
      reviewFolderId
    );
    if (action === 'created') {
      maybeInjectSignatureFault_(
        'AFTER_SIGNATURE_RECOVERY_FOLDER_CREATION',
        ''
      );
    }

    persistAutomationSettings_({
      SIGNATURE_RECOVERY_FOLDER_ID: selected.folderId,
    });
    if (
      String(
        getSettings_().SIGNATURE_RECOVERY_FOLDER_ID || ''
      ) !== selected.folderId
    ) {
      throw new Error(
        'Signature recovery folder setting could not be verified.'
      );
    }

    selected.action = action;
    return selected;
  } finally {
    lock.releaseLock();
  }
}

function getLegacySignatureMirrorFields_(role) {
  if (role === PR.ROLE.MANAGER) {
    return {
      managerId: 'MGR Manager Signature ID',
      selfId: 'SELF Manager Signature ID',
      managerAt: 'MGR Manager Signed At',
      selfAt: 'SELF Manager Signed At',
    };
  }
  if (role === PR.ROLE.EMPLOYEE) {
    return {
      managerId: 'MGR Employee Signature ID',
      selfId: 'SELF Employee Signature ID',
      managerAt: 'MGR Employee Signed At',
      selfAt: 'SELF Employee Signed At',
    };
  }
  return {
    managerId: 'MGR HR Signature ID',
    selfId: 'SELF HR Signature ID',
    managerAt: 'MGR HR Signed At',
    selfAt: 'SELF HR Signed At',
  };
}

function validateLegacySignatureArtifact_(
  cycleId,
  role,
  fileId,
  settings
) {
  try {
    const file = DriveApp.getFileById(fileId);
    const inReview = isDriveFileInFolder_(
      file,
      settings.REVIEW_FOLDER_ID
    );
    const inRecovery =
      settings.SIGNATURE_RECOVERY_FOLDER_ID &&
      isDriveFileInFolder_(
        file,
        settings.SIGNATURE_RECOVERY_FOLDER_ID
      );
    const name = String(file.getName() || '');
    const roleToken = signatureRoleToken_(role);
    const provenance = parseSignatureProvenance_(
      file.getDescription()
    );
    const exactLegacyName =
      name === buildLegacySignatureFileName_(cycleId, role);
    const exactProvenance =
      provenance &&
      provenance.cycleId === String(cycleId) &&
      provenance.role === roleToken;
    return (
      String(file.getMimeType() || '') === 'image/png' &&
      (inReview || inRecovery) &&
      (exactLegacyName || exactProvenance)
    );
  } catch (error) {
    return false;
  }
}

function planLegacySignatureNormalization_(
  cycle,
  role,
  settings,
  validateFile
) {
  const validator =
    validateFile || validateLegacySignatureArtifact_;
  const fields = getSignatureClaimFields_(role);
  const mirrors = getLegacySignatureMirrorFields_(role);
  const normalizedId = String(cycle[fields.fileField] || '');
  const managerId = String(cycle[mirrors.managerId] || '');
  const selfId = String(cycle[mirrors.selfId] || '');
  const hasAuthoritativeMetadata = [
    cycle[fields.fileField],
    cycle[fields.attemptField],
    cycle[fields.startedField],
    cycle[fields.errorField],
    cycle[fields.signedAtField],
    cycle[fields.winningAttemptField],
    cycle[fields.recoveryFileField],
    cycle[fields.recoveryAttemptField],
    cycle[fields.recoveryDetailsField],
  ].some(function (value) {
    return value !== '' && value != null;
  });
  const plan = {
    role: role,
    snapshotNormalizedId: normalizedId,
    snapshotManagerId: managerId,
    snapshotSelfId: selfId,
    status: '',
    fileId: normalizedId,
    signedAt: cycle[fields.signedAtField] || '',
    error: '',
    event: '',
  };

  if (hasAuthoritativeMetadata) {
    plan.status = String(cycle[fields.statusField] || '');
    plan.error = String(cycle[fields.errorField] || '');
    plan.event = 'normalized-role-preserved';
    plan.preserve = true;
    return plan;
  }

  if (normalizedId) {
    const valid = validator(
      cycle['Cycle ID'],
      role,
      normalizedId,
      settings
    );
    if (
      valid &&
      managerId === normalizedId &&
      selfId === normalizedId
    ) {
      plan.status = V31.SIGNATURE.SIGNED;
      plan.event =
        String(cycle[fields.statusField] || '') ===
          V31.SIGNATURE.SIGNED &&
        !String(cycle[fields.errorField] || '')
          ? 'already-normalized'
          : 'normalized-role-preserved';
    } else {
      plan.status = V31.SIGNATURE.UNKNOWN;
      plan.error =
        'Normalized signature data conflicts with document mirrors and requires HR reconciliation.';
      plan.event = 'normalized-role-inconsistent';
    }
    return plan;
  }

  if (managerId && selfId && managerId === selfId) {
    if (
      validator(
        cycle['Cycle ID'],
        role,
        managerId,
        settings
      )
    ) {
      plan.status = V31.SIGNATURE.SIGNED;
      plan.fileId = managerId;
      plan.signedAt =
        cycle[mirrors.managerAt] || cycle[mirrors.selfAt] || '';
      plan.event = 'legacy-signature-normalized';
    } else {
      plan.status = V31.SIGNATURE.UNKNOWN;
      plan.error =
        'Legacy signature file could not be validated and requires HR reconciliation.';
      plan.event = 'legacy-signature-invalid';
    }
    return plan;
  }

  if (managerId || selfId) {
    plan.status = V31.SIGNATURE.UNKNOWN;
    plan.error =
      managerId && selfId
        ? 'Legacy signature fields conflict and require HR reconciliation.'
        : 'Legacy signature fields are incomplete and require HR reconciliation.';
    plan.event = managerId && selfId
      ? 'legacy-signature-conflict'
      : 'legacy-signature-incomplete';
    return plan;
  }

  plan.status = V31.SIGNATURE.PENDING;
  plan.event = 'no-legacy-signature';
  return plan;
}

function migrateLegacySignatureRoleFields_() {
  const settings = getSettings_();
  const cycles = getAllObjects_(PR.SHEETS.CYCLES);
  let updated = 0;
  let skipped = 0;

  cycles.forEach(function (snapshot) {
    const plans = [
      PR.ROLE.MANAGER,
      PR.ROLE.EMPLOYEE,
      PR.ROLE.HR,
    ].map(function (role) {
      return planLegacySignatureNormalization_(
        snapshot,
        role,
        settings
      );
    });

    plans.forEach(function (plan) {
      if (
        plan.event === 'no-legacy-signature' ||
        plan.event === 'already-normalized' ||
        plan.preserve === true
      ) {
        return;
      }
      const snapshotFields = getSignatureClaimFields_(
        plan.role
      );
      if (
        String(snapshot[snapshotFields.statusField] || '') ===
          plan.status &&
        String(snapshot[snapshotFields.fileField] || '') ===
          String(plan.fileId || '') &&
        String(snapshot[snapshotFields.errorField] || '') ===
          String(plan.error || '')
      ) {
        return;
      }
      const applied = withLock_(function () {
        const location = findCycle_(snapshot['Cycle ID']);
        const cycle = location.object;
        const fields = getSignatureClaimFields_(plan.role);
        const mirrors = getLegacySignatureMirrorFields_(plan.role);

        if (
          String(cycle[fields.fileField] || '') !==
            plan.snapshotNormalizedId ||
          String(cycle[mirrors.managerId] || '') !==
            plan.snapshotManagerId ||
          String(cycle[mirrors.selfId] || '') !==
            plan.snapshotSelfId
        ) {
          return false;
        }

        cycle[fields.statusField] = plan.status;
        cycle[fields.fileField] = plan.fileId;
        cycle[fields.signedAtField] = plan.signedAt;
        cycle[fields.errorField] = plan.error;
        cycle[fields.attemptField] =
          cycle[fields.attemptField] || '';
        cycle['Updated At'] = new Date();
        writeCycle_(location.rowNumber, cycle);
        SpreadsheetApp.flush();
        return true;
      });

      if (!applied) {
        skipped++;
        return;
      }
      updated++;
      audit_(
        snapshot['Cycle ID'],
        'Legacy signature normalized',
        getEffectiveAutomationUserEmail_(),
        plan.role,
        plan.status,
        JSON.stringify({
          schemaVersion: 1,
          event: plan.event,
          source: 'legacy-document-fields',
          attemptId: null,
          managerDocumentFileId: plan.snapshotManagerId,
          selfDocumentFileId: plan.snapshotSelfId,
        })
      );
    });
  });

  return { ok: true, updated: updated, skipped: skipped };
}

function migrateSignatureCorrectionFields_() {
  const snapshots = getAllObjects_(PR.SHEETS.CYCLES);
  let updated = 0;
  snapshots.forEach(function (snapshot) {
    const changed = withLock_(function () {
      const location = findCycle_(snapshot['Cycle ID']);
      const cycle = location.object;
      let dirty = false;
      [
        PR.ROLE.MANAGER,
        PR.ROLE.EMPLOYEE,
        PR.ROLE.HR,
      ].forEach(function (role) {
        const fields = getSignatureClaimFields_(role);
        const status = String(cycle[fields.statusField] || '');
        const activeAttempt = String(
          cycle[fields.attemptField] || ''
        );
        if (status === V31.SIGNATURE.SIGNED && activeAttempt) {
          if (!cycle[fields.winningAttemptField]) {
            cycle[fields.winningAttemptField] = activeAttempt;
          }
          cycle[fields.attemptField] = '';
          cycle[fields.startedField] = '';
          dirty = true;
        } else if (
          status === V31.SIGNATURE.UNKNOWN &&
          activeAttempt
        ) {
          if (!cycle[fields.recoveryAttemptField]) {
            cycle[fields.recoveryAttemptField] = activeAttempt;
          }
          cycle[fields.attemptField] = '';
          cycle[fields.startedField] = '';
          dirty = true;
        }
        if (!cycle[fields.reconciliationStatusField]) {
          cycle[fields.reconciliationStatusField] =
            V31.SIGNATURE_RECONCILIATION.PENDING;
          dirty = true;
        }
      });
      if (!dirty) return false;
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return true;
    });
    if (changed) {
      updated++;
      try {
        audit_(
          snapshot['Cycle ID'],
          'Signature correction fields migrated',
          getEffectiveAutomationUserEmail_(),
          'Delivery B correction',
          'migrated',
          JSON.stringify({
            schemaVersion: 1,
            event: 'signature-correction-fields-migrated',
            activeClaimsClearedAfterResolution: true,
            existingAuthoritativeDataPreserved: true,
          })
        );
      } catch (auditError) {}
    }
  });
  return { ok: true, updated: updated };
}

function formatSingleSheet_(sheet) {
  if (!sheet) return;

  const columns = Math.max(sheet.getLastColumn(), 1);

  sheet
    .getRange(1, 1, 1, columns)
    .setFontWeight('bold')
    .setBackground('#5b128b')
    .setFontColor('#ffffff');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(columns, 12));
}

function protectV31Sheet_(sheet, description) {
  if (
    sheet.getProtections(
      SpreadsheetApp.ProtectionType.SHEET
    ).length
  ) {
    return;
  }

  const protection = sheet
    .protect()
    .setDescription(
      description || 'Review automation log - HR managed'
    );

  try {
    const owner = Session.getEffectiveUser();

    protection.addEditor(owner);
    protection.removeEditors(
      protection.getEditors().filter(function (user) {
        return user.getEmail() !== owner.getEmail();
      })
    );

    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (error) {
    console.log(
      'Could not fully protect automation log: ' +
        error.message
    );
  }
}

/* ============================= BOOTSTRAP ================================= */

function getV31BootstrapData_(email, isHr) {
  // Do not run ensureV31DataModel_ on interactive bootstrap.
  // Schema/migrate belongs to upgrade/setup/admin/mutations.

  const settings = getSettings_();
  const normalized = normalizeEmail_(email);
  const isManager = getActiveAssignments_().some(
    function (assignment) {
      return (
        normalizeEmail_(assignment.managerEmail) ===
        normalized
      );
    }
  );
  const mayViewCompensation = isHr || isManager;

  return {
    version: V31.VERSION,
    compensationAdjustmentUrl:
      mayViewCompensation
        ? String(
            settings.COMPENSATION_ADJUSTMENT_URL || ''
          )
        : '',
    compensationDecisionRequired:
      mayViewCompensation
        ? v31Boolean_(
            settings.COMPENSATION_DECISION_REQUIRED,
            true
          )
        : false,
    helpCenterEnabled:
      v31Boolean_(settings.HELP_CENTER_ENABLED, true),
    automation: isHr
      ? getAutomationAdminData_()
      : null,
  };
}

function getV31CycleData_(cycle, email, isHr, options) {
  options = options || {};
  const summaryOnly = !!options.summaryOnly;
  const settings = getSettings_();
  const isManager =
    normalizeEmail_(cycle['Manager Email']) ===
    normalizeEmail_(email);
  const isEmployee =
    normalizeEmail_(cycle['Employee Email']) ===
    normalizeEmail_(email);

  const compensationRequired =
    v31Boolean_(
      settings.COMPENSATION_DECISION_REQUIRED,
      true
    );
  const decision = normalizeCompensationDecision_(
    cycle['Compensation Decision']
  );
  const compensationComplete = isV31CompensationComplete_(cycle);
  const compensationByCycleId =
    options.compensationByCycleId || getCompensationRecordsByCycleId_();
  const compensationRecord =
    compensationByCycleId[String(cycle['Cycle ID'] || '')] || null;

  const meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );
  const daysUntilMeeting = meetingDate
    ? v31DaysBetween_(v31Today_(), meetingDate)
    : null;

  return {
    cycleSource: String(cycle['Cycle Source'] || 'Manual'),
    automationKey: String(cycle['Automation Key'] || ''),
    noticeSentAt: formatDateTime_(
      cycle['Automation Notice Sent At']
    ),
    managerDueDate: formatDate_(
      cycle['Manager Due Date']
    ),
    employeeDueDate: formatDate_(
      cycle['Employee Due Date']
    ),
    calendarEventId: String(
      cycle['Calendar Event ID'] || ''
    ),
    calendarCreatedAt: formatDateTime_(
      cycle['Calendar Created At']
    ),
    calendarStatus: String(
      cycle['Calendar Status'] || ''
    ),
    managerEmailSentAt: formatDateTime_(
      cycle['Manager Email Sent At']
    ),
    employeeEmailSentAt: formatDateTime_(
      cycle['Employee Email Sent At']
    ),
    hrEmailSentAt: formatDateTime_(
      cycle['HR Email Sent At']
    ),
    launchCompletedAt: formatDateTime_(
      cycle['Launch Completed At']
    ),
    lastLaunchError: isHr
      ? String(cycle['Last Launch Error'] || '')
      : '',
    launchAttemptCount: isHr
      ? Number(cycle['Launch Attempt Count'] || 0)
      : 0,
    launchComplete: isReviewLaunchComplete_(cycle),
    launchComponents:
      isHr && !summaryOnly
        ? getReviewLaunchComponentSummary_(cycle)
        : null,
    launchHasUnknownDelivery: isHr
      ? getReviewLaunchComponentSummary_(cycle).hasUnknown
      : false,
    calendarConfigWarning: isHr
      ? hasCalendarConfigWarning_(cycle)
      : false,
    calendarEventMissing: isHr
      ? String(cycle['Last Launch Error'] || '').indexOf(
          'Calendar event missing or inaccessible:'
        ) === 0
      : false,
    finalization:
      isHr && !summaryOnly
        ? getFinalizationSummary_(cycle)
        : null,
    needsFinalizationRetry:
      isHr &&
      String(cycle['Status']) === PR.CYCLE.FINALIZING,
    notifications:
      isHr && !summaryOnly
        ? getWorkflowNotificationSummary_(cycle)
        : null,
    signatureClaims:
      isHr && !summaryOnly
      ? {
          manager: String(
            cycle['Manager Signature Status'] || ''
          ),
          employee: String(
            cycle['Employee Signature Status'] || ''
          ),
          hr: String(cycle['HR Signature Status'] || ''),
          managerUnknown:
            String(cycle['Manager Signature Status'] || '') ===
            V31.DELIVERY.UNKNOWN,
          employeeUnknown:
            String(cycle['Employee Signature Status'] || '') ===
            V31.DELIVERY.UNKNOWN,
          hrUnknown:
            String(cycle['HR Signature Status'] || '') ===
            V31.DELIVERY.UNKNOWN,
          managerError: String(
            cycle['Manager Signature Last Error'] || ''
          ),
          employeeError: String(
            cycle['Employee Signature Last Error'] || ''
          ),
          hrError: String(
            cycle['HR Signature Last Error'] || ''
          ),
          reconciliation: {
            manager: String(
              cycle['Manager Signature Reconciliation Status'] ||
                ''
            ),
            employee: String(
              cycle['Employee Signature Reconciliation Status'] ||
                ''
            ),
            hr: String(
              cycle['HR Signature Reconciliation Status'] || ''
            ),
          },
          recoveryWarnings: [
            cycle['Manager Signature Last Error']
              ? 'Manager error: ' +
                cycle['Manager Signature Last Error']
              : '',
            cycle['Manager Signature Artifact Warning']
              ? 'Manager artifact: ' +
                cycle['Manager Signature Artifact Warning']
              : '',
            cycle['Manager Signature Audit Warning']
              ? 'Manager audit: ' +
                cycle['Manager Signature Audit Warning']
              : '',
            cycle['Employee Signature Last Error']
              ? 'Employee error: ' +
                cycle['Employee Signature Last Error']
              : '',
            cycle['Employee Signature Artifact Warning']
              ? 'Employee artifact: ' +
                cycle['Employee Signature Artifact Warning']
              : '',
            cycle['Employee Signature Audit Warning']
              ? 'Employee audit: ' +
                cycle['Employee Signature Audit Warning']
              : '',
            cycle['HR Signature Last Error']
              ? 'HR error: ' + cycle['HR Signature Last Error']
              : '',
            cycle['HR Signature Artifact Warning']
              ? 'HR artifact: ' +
                cycle['HR Signature Artifact Warning']
              : '',
            cycle['HR Signature Audit Warning']
              ? 'HR audit: ' +
                cycle['HR Signature Audit Warning']
              : '',
          ].filter(Boolean),
          reconciliationRequired:
            String(cycle['Manager Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN ||
            String(cycle['Employee Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN ||
            String(cycle['HR Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN,
          needsAttention:
            String(cycle['Manager Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN ||
            String(cycle['Employee Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN ||
            String(cycle['HR Signature Status'] || '') ===
              V31.DELIVERY.UNKNOWN ||
            !!cycle['Manager Signature Last Error'] ||
            !!cycle['Manager Signature Artifact Warning'] ||
            !!cycle['Manager Signature Audit Warning'] ||
            !!cycle['Employee Signature Last Error'] ||
            !!cycle['Employee Signature Artifact Warning'] ||
            !!cycle['Employee Signature Audit Warning'] ||
            !!cycle['HR Signature Last Error'] ||
            !!cycle['HR Signature Artifact Warning'] ||
            !!cycle['HR Signature Audit Warning'],
        }
      : null,
    daysUntilMeeting: daysUntilMeeting,

    compensationRequired:
      isManager || isHr
        ? compensationRequired
        : false,
    compensationDecision:
      isManager || isHr
        ? decision
        : '',
    compensationStatus:
      isManager || isHr
        ? String(
            cycle['Compensation Status'] ||
              V31_COMP.STATUS.PENDING
          )
        : '',
    compensationRecordId:
      isManager || isHr
        ? String(cycle['Compensation Record ID'] || '')
        : '',
    compensationDecisionNotes:
      isManager || isHr
        ? String(
            cycle['Compensation Decision Notes'] || ''
          )
        : '',
    compensationDecisionAt:
      isManager || isHr
        ? formatDateTime_(
            cycle['Compensation Decision At']
          )
        : '',
    compensationDecisionBy:
      isManager || isHr
        ? String(
            cycle['Compensation Decision By'] || ''
          )
        : '',
    compensationComplete:
      isManager || isHr
        ? compensationComplete
        : true,
    compensationActionRequired:
      isManager &&
      compensationRequired &&
      !compensationComplete &&
      decision === V31.COMPENSATION.PENDING &&
      String(cycle['Status']) !== PR.CYCLE.COMPLETE,
    canManageCompensation:
      (isManager || isHr) &&
      String(cycle['Status']) !== PR.CYCLE.COMPLETE,
    compensationRecord:
      !summaryOnly &&
      (isManager || isHr) &&
      compensationRecord
        ? (function () {
            const view = toCompensationRecordView_(
              compensationRecord.object,
              isHr
            );
            if (view && view.canEditOwnerDecision) {
              const signatures = getCombinedSignatureState_(cycle);
              view.canEditOwnerDecision =
                !signatures.managerSigned &&
                !signatures.employeeSigned &&
                !signatures.hrSigned;
            }
            return view;
          })()
        : null,
    employeeCompensationAcknowledgement:
      !summaryOnly && isEmployee
        ? getEmployeeCompensationAcknowledgement_(cycle)
        : null,
    compensationAdjustmentUrl: '',

    guidance: summaryOnly
      ? []
      : buildV31Guidance_(
          cycle,
          email,
          isHr,
          isManager,
          isEmployee,
          compensationComplete
        ),
  };
}

function getEmployeeCompensationAcknowledgement_(cycle) {
  const recordLoc = findCompensationRecordByCycleOptional_(
    cycle['Cycle ID']
  );
  if (!recordLoc) {
    return null;
  }
  const record = recordLoc.object;
  // Hard privacy: denied recommendations are invisible to employees.
  if (
    String(record['Owner Decision'] || '') ===
      V31_COMP.OWNER_DECISION.DENIED ||
    String(record['Status'] || '') === V31_COMP.STATUS.DENIED
  ) {
    return null;
  }
  if (!isApprovedCompensationAdjustment_(record)) {
    return null;
  }
  if (
    record['Final Approved Pay Rate'] === '' ||
    record['Final Approved Pay Rate'] == null
  ) {
    return null;
  }
  return {
    currentPayRate: Number(record['Original Pay Rate'] || 0),
    currentAnnualSalary: Number(
      record['Original Annual Salary'] || 0
    ),
    finalApprovedPayRate: Number(
      record['Final Approved Pay Rate'] || 0
    ),
    finalApprovedAnnualSalary: Number(
      record['Final Approved Annual Salary'] || 0
    ),
    approvedIncreasePercent: roundPercent_(
      Number(record['Final Approved Percent'] || 0) * 100
    ),
    effectiveDate: formatDate_(
      record['Compensation Effective Date']
    ),
  };
}

function buildV31Guidance_(
  cycle,
  email,
  isHr,
  isManager,
  isEmployee,
  compensationComplete
) {
  const status = String(cycle['Status']);
  const items = [];

  if (status === PR.CYCLE.OPEN) {
    if (
      isManager &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Manager Review Status'])
      )
    ) {
      items.push({
        tone: 'info',
        title: 'Complete the manager review',
        message:
          'Rate each factor, add specific examples, and submit the review before ' +
          (formatDate_(cycle['Manager Due Date']) ||
            'the review meeting') +
          '. The employee cannot see your responses yet.',
        action: 'manager-review',
        actionLabel: 'Continue Manager Review',
      });
    }

    if (
      isEmployee &&
      [PR.DOC.NOT_STARTED, PR.DOC.DRAFT].includes(
        String(cycle['Self Evaluation Status'])
      )
    ) {
      items.push({
        tone: 'info',
        title: 'Complete your self-evaluation',
        message:
          'Reflect on accomplishments, growth areas, and goals before ' +
          (formatDate_(cycle['Employee Due Date']) ||
            'the review meeting') +
          '. Your manager cannot see your responses yet.',
        action: 'self-evaluation',
        actionLabel: 'Continue Self-Evaluation',
      });
    }

    if (
      isManager &&
      !compensationComplete &&
      normalizeCompensationDecision_(
        cycle['Compensation Decision']
      ) === V31.COMPENSATION.PENDING
    ) {
      items.push({
        tone: 'warning',
        title: 'Compensation decision required',
        message:
          'Recommend a compensation adjustment or confirm that no adjustment is recommended.',
        action: 'compensation',
        actionLabel: 'Review Compensation',
      });
    }

    if (
      isHr &&
      !compensationComplete &&
      normalizeCompensationDecision_(
        cycle['Compensation Decision']
      ) === V31.COMPENSATION.ADJUSTMENT
    ) {
      items.push({
        tone: 'warning',
        title: 'Owner compensation decision required',
        message:
          'Record the owner-approved amount in the Compensation Queue before the meeting can open.',
        action: 'overview',
        actionLabel: 'Open Review Overview',
      });
    }

    if (isHr) {
      items.push({
        tone: 'info',
        title: 'Independent preparation is underway',
        message:
          'The manager and employee are completing separate evaluations. Their responses remain private from each other until both submit and the meeting opens.',
        action: 'overview',
        actionLabel: 'View Status',
      });
    }
  }

  if (status === PR.CYCLE.READY) {
    items.push({
      tone: 'success',
      title: 'Both evaluations are ready',
      message:
        'Open the review meeting only when the manager and employee are beginning the actual discussion. Opening it makes both evaluations visible.',
      action: 'meeting',
      actionLabel: 'Open Meeting Workspace',
    });
  }

  if (status === PR.CYCLE.MEETING) {
    items.push({
      tone: 'info',
      title: 'Use the meeting workspace',
      message:
        'Discuss rating differences, confirm goals and action steps, and give the employee an opportunity to add comments before finalizing the packet.',
      action: 'meeting',
      actionLabel: 'Continue Meeting',
    });

    if (!compensationComplete && (isManager || isHr)) {
      items.push({
        tone: 'warning',
        title: 'Compensation decision is still pending',
        message:
          'A compensation decision must be resolved before the review meeting can open and signatures can be released.',
        action: 'compensation',
        actionLabel: 'Complete Compensation Decision',
      });
    }
  }

  if (status === PR.CYCLE.SIGNATURES) {
    items.push({
      tone: 'warning',
      title: 'The review packet is locked',
      message:
        'The manager and employee each sign once. HR signs last after both participants. The same signatures are placed on both final documents.',
      action: 'signature',
      actionLabel: 'View Signature Status',
    });
  }

  if (status === PR.CYCLE.FINALIZING) {
    items.push({
      tone: isHr ? 'warning' : 'info',
      title: isHr
        ? 'Final documents still preparing'
        : 'Final documents are preparing',
      message: isHr
        ? 'Signatures are complete. Retry finalization to resume PDF generation and packet distribution. Complete is set only after both PDFs and Sent distribution.'
        : 'Signatures are complete. Final PDFs and distribution are still preparing. You will receive the completed packet by email when ready.',
      action: 'overview',
      actionLabel: isHr ? 'Retry Final Documents' : 'View Status',
    });
  }

  if (isHr && !isReviewLaunchComplete_(cycle)) {
    items.push({
      tone: 'warning',
      title: 'Launch is incomplete',
      message: describeReviewLaunchStatus_(cycle),
      action: 'overview',
      actionLabel: 'Retry Launch',
    });
  } else if (isHr && hasCalendarConfigWarning_(cycle)) {
    const missing =
      String(cycle['Last Launch Error'] || '').indexOf(
        'Calendar event missing or inaccessible:'
      ) === 0;

    items.push({
      tone: 'warning',
      title: missing
        ? 'Calendar event missing or inaccessible'
        : 'Calendar event is not fully configured',
      message: missing
        ? 'The persisted calendar event could not be loaded and marker recovery found nothing. Use Rebuild Calendar Event only after confirming the original event is gone.'
        : 'The shared calendar event exists, but tags/reminders are not Configured yet. Launch emails may already be complete. Use Retry Calendar Config to finish configuration without duplicating Sent emails.' +
          (isCalendarConfigWarning_(cycle['Last Launch Error'])
            ? ' Last error: ' +
              String(cycle['Last Launch Error'])
            : ''),
      action: 'overview',
      actionLabel: missing
        ? 'Rebuild Calendar Event'
        : 'Retry Calendar Config',
    });
  }

  if (status === PR.CYCLE.COMPLETE) {
    items.push({
      tone: 'success',
      title: 'Review complete',
      message:
        'The signed manager review and self-evaluation are available in the Signatures tab and were emailed to the participants and HR.',
      action: 'signatures',
      actionLabel: 'View Final Documents',
    });
  }

  return items;
}

/* ============================ AUTOMATION ADMIN =========================== */

function getReviewAutomationAdminData() {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may access review automation settings.'
    );
  }

  return getAutomationAdminData_();
}

function getAutomationAdminData_() {
  const settings = getSettings_();
  const visibleTriggers = getOwnedReviewAutomationTriggers_();
  const triggerHealth = getAutomationTriggerHealth_(
    settings,
    visibleTriggers
  );
  const effectiveEmail = normalizeEmail_(
    Session.getEffectiveUser().getEmail()
  );
  const ownerEmail = normalizeEmail_(
    settings.AUTOMATION_OWNER_EMAIL
  );
  let signatureRecoveryFolder = {
    folderId: String(
      settings.SIGNATURE_RECOVERY_FOLDER_ID || ''
    ),
    folderUrl: '',
    warning: '',
  };
  try {
    const validated = validateSignatureRecoveryFolder_(
      settings.SIGNATURE_RECOVERY_FOLDER_ID,
      settings.REVIEW_FOLDER_ID
    );
    signatureRecoveryFolder.folderUrl = validated.folderUrl;
  } catch (error) {
    signatureRecoveryFolder.warning = String(
      error.message || error
    );
  }

  return {
    appVersion: APP_VERSION,
    environment: String(settings.ENVIRONMENT || 'Production'),
    mode: String(settings.AUTOMATION_MODE || 'Preview'),
    noticeDays: Number(settings.REVIEW_NOTICE_DAYS || 28),
    formDueDays: Number(
      settings.FORM_DUE_DAYS_BEFORE_MEETING || 7
    ),
    triggerHour: Number(
      settings.AUTOMATION_TRIGGER_HOUR || 8
    ),
    eventStartHour: Number(
      settings.REVIEW_EVENT_START_HOUR || 12
    ),
    eventDurationMinutes: Number(
      settings.REVIEW_EVENT_DURATION_MINUTES || 60
    ),
    shiftWeekendMeetings:
      v31Boolean_(
        settings.SHIFT_WEEKEND_MEETINGS,
        true
      ),
    calendarId: String(settings.CALENDAR_ID || 'primary'),
    eventEmailReminderDays: Number(
      settings.EVENT_EMAIL_REMINDER_DAYS || 7
    ),
    eventPopupReminderHours: Number(
      settings.EVENT_POPUP_REMINDER_HOURS || 24
    ),
    compensationAdjustmentUrl: String(
      settings.COMPENSATION_ADJUSTMENT_URL || ''
    ),
    compensationFolderId: String(
      settings.COMPENSATION_FOLDER_ID || ''
    ),
    compensationDecisionRequired:
      v31Boolean_(
        settings.COMPENSATION_DECISION_REQUIRED,
        true
      ),
    triggerInstalled:
      visibleTriggers.some(function (trigger) {
        return (
          getTriggerHandlerName_(trigger) ===
          'runReviewAutomationTrigger_'
        );
      }),
    automationOwnerEmail: ownerEmail,
    systemAdminEmail: normalizeEmail_(
      settings.SYSTEM_ADMIN_EMAIL
    ),
    signatureRecoveryFolder: signatureRecoveryFolder,
    effectiveAutomationUser: effectiveEmail,
    triggerUniqueId: String(
      settings.AUTOMATION_TRIGGER_UNIQUE_ID || ''
    ),
    triggerInstalledAt: String(
      settings.AUTOMATION_TRIGGER_INSTALLED_AT || ''
    ),
    triggerOwnerMatches:
      !!ownerEmail && ownerEmail === effectiveEmail,
    triggerOwnerWarning:
      'Apps Script triggers are visible only to the account that installed them. Other editors must remove any legacy triggers from My Triggers.',
    lastRun: String(settings.AUTOMATION_LAST_RUN || ''),
    lastSuccess: String(settings.AUTOMATION_LAST_SUCCESS || ''),
    lastFailure: String(settings.AUTOMATION_LAST_FAILURE || ''),
    lastError: String(settings.AUTOMATION_LAST_ERROR || ''),
    triggerHealth: triggerHealth,
    preview: findReviewAutomationCandidates_(
      Number(settings.REVIEW_NOTICE_DAYS || 28)
    ).slice(0, 20),
  };
}

function saveReviewAutomationSettings(payload) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may change review automation settings.'
    );
  }

  const clean = validateReviewAutomationSettings_(payload || {});
  const before = getSettings_();
  const mode = String(before.AUTOMATION_MODE || 'Preview');

  if (mode === 'Live') {
    assertAutomationOwner_(before);
  }

  withLock_(function () {
    persistAutomationSettings_(clean);
  });

  let triggerResult = null;

  if (mode === 'Live') {
    triggerResult = installReviewAutomationTriggerSafely_({
      actorEmail: email,
      reason: 'Live automation settings changed',
    });

    if (!triggerResult.ok) {
      withLock_(function () {
        persistAutomationSettings_({
          AUTOMATION_TRIGGER_HOUR: String(
            before.AUTOMATION_TRIGGER_HOUR || 8
          ),
        });
      });
    }
  }

  const result = triggerResult && !triggerResult.ok
    ? 'Partial'
    : triggerResult && triggerResult.partial
    ? 'Partial'
    : 'Success';
  const message =
    triggerResult && !triggerResult.ok
      ? 'Settings were saved, but the trigger replacement failed. The prior trigger and trigger hour were preserved.'
      : triggerResult && triggerResult.partial
      ? 'Settings were saved and the new trigger is active, but older triggers require manual cleanup.'
      : 'Review automation settings saved.';

  logReviewAutomation_({
    mode: mode,
    action: 'Settings updated',
    result: result,
    details: automationLogDetails_({
      component: 'Automation Settings',
      previousState: mode,
      newState: mode,
      error:
        triggerResult && !triggerResult.ok
          ? triggerResult.error || triggerResult.warning || ''
          : '',
      recoveryRecommendation:
        triggerResult && (triggerResult.partial || !triggerResult.ok)
          ? 'The automation owner must review trigger health and My Triggers.'
          : '',
      metadata: {
        actor: email,
        triggerResult: triggerResult,
      },
    }),
  });

  return {
    ok: !triggerResult || triggerResult.ok,
    partial: !!(
      triggerResult &&
      (triggerResult.partial || !triggerResult.ok)
    ),
    message: message,
    triggerResult: triggerResult,
    automation: getAutomationAdminData_(),
  };
}

function validateReviewAutomationSettings_(payload) {
  const compensationUrl = cleanText_(
    payload.compensationAdjustmentUrl
  );

  if (
    compensationUrl &&
    !/^https:\/\/.+/i.test(compensationUrl)
  ) {
    throw new Error(
      'The Compensation Adjustment URL must begin with https://.'
    );
  }

  return {
    REVIEW_NOTICE_DAYS: String(
      v31Integer_(payload.noticeDays, 7, 60, 'Notice days')
    ),
    FORM_DUE_DAYS_BEFORE_MEETING: String(
      v31Integer_(payload.formDueDays, 1, 21, 'Form due days')
    ),
    AUTOMATION_TRIGGER_HOUR: String(
      v31Integer_(payload.triggerHour, 0, 23, 'Trigger hour')
    ),
    REVIEW_EVENT_START_HOUR: String(
      v31Integer_(
        payload.eventStartHour,
        0,
        23,
        'Event start hour'
      )
    ),
    REVIEW_EVENT_DURATION_MINUTES: String(
      v31Integer_(
        payload.eventDurationMinutes,
        15,
        240,
        'Event duration'
      )
    ),
    SHIFT_WEEKEND_MEETINGS: payload.shiftWeekendMeetings
      ? 'TRUE'
      : 'FALSE',
    CALENDAR_ID: cleanText_(payload.calendarId) || 'primary',
    EVENT_EMAIL_REMINDER_DAYS: String(
      v31Integer_(
        payload.eventEmailReminderDays,
        0,
        28,
        'Email reminder days'
      )
    ),
    EVENT_POPUP_REMINDER_HOURS: String(
      v31Integer_(
        payload.eventPopupReminderHours,
        0,
        672,
        'Popup reminder hours'
      )
    ),
    COMPENSATION_ADJUSTMENT_URL: compensationUrl,
    COMPENSATION_FOLDER_ID: cleanText_(
      payload.compensationFolderId || ''
    ),
    COMPENSATION_DECISION_REQUIRED:
      payload.compensationDecisionRequired ? 'TRUE' : 'FALSE',
  };
}

function persistAutomationSettings_(values) {
  const settingsSheet = getSpreadsheet_().getSheetByName(
    PR.SHEETS.SETTINGS
  );

  Object.keys(values || {}).forEach(function (key) {
    setSetting_(settingsSheet, key, values[key]);
  });
  SpreadsheetApp.flush();
}

function setReviewAutomationMode(mode) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may enable or pause review automation.'
    );
  }

  if (!['Preview', 'Live', 'Paused'].includes(mode)) {
    throw new Error('Unsupported automation mode.');
  }

  if (mode === 'Live') {
    const liveResult = installReviewAutomationTriggerSafely_({
      actorEmail: email,
      reason: 'Live automation enabled',
    });

    return {
      ok: liveResult.ok,
      partial: !!liveResult.partial,
      message: liveResult.ok
        ? liveResult.partial
          ? 'Live automation is enabled, but older triggers require manual cleanup in My Triggers.'
          : 'Live automation enabled with a verified owner-controlled daily trigger.'
        : 'Live automation was not enabled. The prior mode and trigger were preserved. ' +
          String(liveResult.error || liveResult.warning || ''),
      triggerResult: liveResult,
      automation: getAutomationAdminData_(),
    };
  }

  return disableReviewAutomationSafely_(mode, email);
}

function getReviewAutomationPreview(days) {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may preview review automation.'
    );
  }

  const settings = getSettings_();
  const previewDays =
    days == null
      ? Number(settings.REVIEW_NOTICE_DAYS || 28)
      : v31Integer_(days, 1, 120, 'Preview days');

  return {
    ok: true,
    candidates:
      findReviewAutomationCandidates_(previewDays),
  };
}

function runReviewAutomationNow() {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may run review automation.'
    );
  }

  const settings = getSettings_();

  if (
    String(settings.AUTOMATION_MODE || 'Preview') !==
    'Live'
  ) {
    return {
      ok: true,
      previewOnly: true,
      message:
        'Automation is not Live. No cycles were created. The preview was refreshed.',
      candidates: findReviewAutomationCandidates_(
        Number(settings.REVIEW_NOTICE_DAYS || 28)
      ),
    };
  }

  assertAutomationOwner_(settings);
  try {
    return runReviewAutomationCore_();
  } catch (error) {
    recordAutomationRunHealth_(
      false,
      String(error.message || error)
    );
    throw error;
  }
}

function getOwnedReviewAutomationTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    const handler = trigger.getHandlerFunction();
    return (
      handler === 'runReviewAutomationTrigger_' ||
      handler === 'runReviewAutomation'
    );
  });
}

function getTriggerUniqueId_(trigger) {
  return trigger && typeof trigger.getUniqueId === 'function'
    ? String(trigger.getUniqueId() || '')
    : '';
}

function getTriggerHandlerName_(trigger) {
  return trigger && typeof trigger.getHandlerFunction === 'function'
    ? String(trigger.getHandlerFunction() || '')
    : '';
}

function createReviewAutomationTrigger_(hour, timeZone) {
  return ScriptApp.newTrigger('runReviewAutomationTrigger_')
    .timeBased()
    .atHour(hour)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(timeZone)
    .create();
}

function removeOwnedReviewAutomationTriggers_(
  triggers,
  deleteTrigger
) {
  const removedIds = [];
  const failedIds = [];
  const errors = [];
  const remove = deleteTrigger || function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  };

  (triggers || []).forEach(function (trigger) {
    const id = getTriggerUniqueId_(trigger);
    try {
      remove(trigger);
      removedIds.push(id);
    } catch (error) {
      failedIds.push(id);
      errors.push(String(error.message || error));
    }
  });

  return {
    ok: failedIds.length === 0,
    removedIds: removedIds,
    failedIds: failedIds,
    errors: errors,
  };
}

function getEffectiveAutomationUserEmail_() {
  return normalizeEmail_(
    Session.getEffectiveUser().getEmail()
  );
}

function assertAutomationOwnerValues_(ownerEmail, effectiveEmail) {
  const owner = normalizeEmail_(ownerEmail);
  const effective = normalizeEmail_(effectiveEmail);

  if (!owner) {
    throw new Error(
      'AUTOMATION_OWNER_EMAIL is not configured. Live automation remains blocked until Daniel supplies the designated AITHERAS account.'
    );
  }

  if (effective !== owner) {
    throw new Error(
      'Only the designated automation owner (' +
        owner +
        ') may install, replace, or migrate triggers. Current effective user: ' +
        (effective || 'unknown') +
        '.'
    );
  }

  return owner;
}

function assertAutomationOwner_(settings) {
  const currentSettings = settings || getSettings_();
  return assertAutomationOwnerValues_(
    currentSettings.AUTOMATION_OWNER_EMAIL,
    getEffectiveAutomationUserEmail_()
  );
}

function validateAutomationTriggerConfiguration_(settings) {
  assertAutomationOwner_(settings);
  const hour = Number(settings.AUTOMATION_TRIGGER_HOUR);
  const timeZone = String(
    Session.getScriptTimeZone() || ''
  );

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    throw new Error(
      'AUTOMATION_TRIGGER_HOUR must be an integer from 0 through 23.'
    );
  }

  if (!timeZone) {
    throw new Error(
      'The Apps Script project time zone is not configured.'
    );
  }

  return {
    hour: hour,
    timeZone: timeZone,
  };
}

function defaultTriggerAdministrationServices_() {
  return {
    readSettings: function () {
      return getSettings_();
    },
    effectiveEmail: function () {
      return getEffectiveAutomationUserEmail_();
    },
    listTriggers: function () {
      return getOwnedReviewAutomationTriggers_();
    },
    createTrigger: function (hour, timeZone) {
      return createReviewAutomationTrigger_(hour, timeZone);
    },
    deleteTrigger: function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    },
    persist: function (values) {
      persistAutomationSettings_(values);
    },
    nowIso: function () {
      return new Date().toISOString();
    },
    fault: function (point) {
      maybeInjectTriggerFault_(point);
    },
    timeZone: function () {
      return String(Session.getScriptTimeZone() || '');
    },
  };
}

function verifyReplacementAutomationTrigger_(
  trigger,
  visibleTriggers
) {
  const id = getTriggerUniqueId_(trigger);
  const handler = getTriggerHandlerName_(trigger);
  const visible = (visibleTriggers || []).some(function (item) {
    return (
      getTriggerUniqueId_(item) === id &&
      getTriggerHandlerName_(item) ===
        'runReviewAutomationTrigger_'
    );
  });

  if (!id) {
    throw new Error(
      'The replacement trigger did not return a unique ID.'
    );
  }

  if (handler !== 'runReviewAutomationTrigger_') {
    throw new Error(
      'The replacement trigger has an unexpected handler: ' +
        (handler || 'unknown') +
        '.'
    );
  }

  if (!visible) {
    throw new Error(
      'The replacement trigger was not visible after creation.'
    );
  }

  return id;
}

function executeAutomationTriggerReplacement_(
  options,
  services
) {
  const opts = options || {};
  const svc = services || defaultTriggerAdministrationServices_();
  const before = svc.readSettings();
  const owner = normalizeEmail_(before.AUTOMATION_OWNER_EMAIL);
  const effective = normalizeEmail_(svc.effectiveEmail());
  assertAutomationOwnerValues_(owner, effective);

  const hour = Number(before.AUTOMATION_TRIGGER_HOUR);
  const timeZone = String(svc.timeZone() || '');

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(
      'AUTOMATION_TRIGGER_HOUR must be an integer from 0 through 23.'
    );
  }

  if (!timeZone) {
    throw new Error(
      'The Apps Script project time zone is not configured.'
    );
  }

  const oldTriggers = svc.listTriggers().slice();
  const oldIds = oldTriggers.map(getTriggerUniqueId_);
  let replacement = null;
  let replacementId = '';
  let liveVerified = false;
  let rollbackError = '';

  try {
    svc.fault('BEFORE_TRIGGER_CREATION');
    replacement = svc.createTrigger(hour, timeZone);
    replacementId = verifyReplacementAutomationTrigger_(
      replacement,
      svc.listTriggers()
    );
    svc.fault('AFTER_TRIGGER_CREATION');

    const installedAt = svc.nowIso();
    svc.persist({
      AUTOMATION_TRIGGER_UNIQUE_ID: replacementId,
      AUTOMATION_TRIGGER_INSTALLED_AT: installedAt,
    });
    svc.fault('AFTER_TRIGGER_METADATA_PERSISTENCE');

    let stored = svc.readSettings();
    if (
      String(stored.AUTOMATION_TRIGGER_UNIQUE_ID || '') !==
        replacementId ||
      String(stored.AUTOMATION_TRIGGER_INSTALLED_AT || '') !==
        installedAt
    ) {
      throw new Error(
        'Replacement trigger metadata could not be verified.'
      );
    }

    svc.fault('BEFORE_LIVE_MODE_PERSISTENCE');
    svc.persist({ AUTOMATION_MODE: 'Live' });
    stored = svc.readSettings();

    if (
      String(stored.AUTOMATION_MODE || '') !== 'Live' ||
      String(stored.AUTOMATION_TRIGGER_UNIQUE_ID || '') !==
        replacementId
    ) {
      throw new Error(
        'Live mode and replacement trigger metadata could not be verified together.'
      );
    }
    liveVerified = true;

    let cleanup;
    try {
      svc.fault('BEFORE_OLD_TRIGGER_CLEANUP');
      cleanup = removeOwnedReviewAutomationTriggers_(
        oldTriggers,
        svc.deleteTrigger
      );
    } catch (cleanupError) {
      cleanup = {
        ok: false,
        removedIds: [],
        failedIds: oldIds,
        errors: [String(cleanupError.message || cleanupError)],
      };
    }

    return {
      ok: true,
      partial: !cleanup.ok,
      newTriggerActive: true,
      cleanupRequired: !cleanup.ok,
      newTriggerId: replacementId,
      oldTriggerIds: oldIds,
      removedTriggerIds: cleanup.removedIds,
      failedRemovalIds: cleanup.failedIds,
      installedAt: installedAt,
      mode: 'Live',
      warning: cleanup.ok
        ? ''
        : 'The new trigger is active, but one or more older triggers could not be removed. Review My Triggers.',
      cleanupErrors: cleanup.errors,
      actorEmail: opts.actorEmail || effective,
    };
  } catch (error) {
    if (liveVerified) {
      return {
        ok: true,
        partial: true,
        newTriggerActive: true,
        cleanupRequired: true,
        newTriggerId: replacementId,
        oldTriggerIds: oldIds,
        removedTriggerIds: [],
        failedRemovalIds: oldIds,
        mode: 'Live',
        warning:
          'The new trigger is active, but old-trigger cleanup could not be completed.',
        error: String(error.message || error),
      };
    }

    if (replacement) {
      try {
        svc.deleteTrigger(replacement);
      } catch (deleteError) {
        rollbackError =
          ' Replacement cleanup failed: ' +
          String(deleteError.message || deleteError);
      }
    }

    try {
      svc.persist({
        AUTOMATION_TRIGGER_UNIQUE_ID: String(
          before.AUTOMATION_TRIGGER_UNIQUE_ID || ''
        ),
        AUTOMATION_TRIGGER_INSTALLED_AT: String(
          before.AUTOMATION_TRIGGER_INSTALLED_AT || ''
        ),
        AUTOMATION_MODE: String(
          before.AUTOMATION_MODE || 'Preview'
        ),
      });
    } catch (restoreError) {
      rollbackError +=
        ' Prior settings restoration failed: ' +
        String(restoreError.message || restoreError);
    }

    return {
      ok: false,
      partial: !!rollbackError,
      newTriggerActive: false,
      cleanupRequired: !!rollbackError,
      oldTriggerIds: oldIds,
      preservedMode: String(
        before.AUTOMATION_MODE || 'Preview'
      ),
      error: String(error.message || error) + rollbackError,
      actorEmail: opts.actorEmail || effective,
    };
  }
}

function installReviewAutomationTriggerSafely_(options, services) {
  if (services) {
    return executeAutomationTriggerReplacement_(
      options,
      services
    );
  }

  const lock = LockService.getUserLock();

  if (!lock.tryLock(30000)) {
    return {
      ok: false,
      partial: false,
      error:
        'Another trigger-administration operation is in progress. Try again after it completes.',
    };
  }

  let result;
  try {
    try {
      result = executeAutomationTriggerReplacement_(
        options,
        defaultTriggerAdministrationServices_()
      );
    } catch (error) {
      result = {
        ok: false,
        partial: false,
        newTriggerActive: false,
        cleanupRequired: false,
        preservedMode: String(
          getSettings_().AUTOMATION_MODE || 'Preview'
        ),
        error: String(error.message || error),
      };
    }
  } finally {
    lock.releaseLock();
  }

  try {
    logReviewAutomation_({
      mode: result.mode || result.preservedMode || '',
      action: 'Automation trigger replacement',
      result: result.ok
        ? result.partial
          ? 'Partial'
          : 'Success'
        : 'Failed',
      details: automationLogDetails_({
        component: 'Review Automation Trigger',
        attemptId: result.newTriggerId || '',
        previousState: result.preservedMode || '',
        newState: result.mode || result.preservedMode || '',
        error: result.error || result.warning || '',
        recoveryRecommendation: result.cleanupRequired
          ? 'The automation owner must inspect My Triggers and remove owner-visible duplicates.'
          : result.ok
          ? ''
          : 'Correct the reported problem and retry Live activation.',
        metadata: result,
      }),
    });
  } catch (logError) {
    result.partial = result.ok ? true : !!result.partial;
    result.auditError = String(logError.message || logError);
    result.warning =
      String(result.warning || '') +
      ' The trigger outcome could not be written to the automation log.';
  }

  return result;
}

function disableReviewAutomationSafely_(mode, actorEmail) {
  const lock = LockService.getUserLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Another trigger-administration operation is in progress.'
    );
  }

  let cleanup;
  try {
    persistAutomationSettings_({ AUTOMATION_MODE: mode });
    cleanup = removeOwnedReviewAutomationTriggers_(
      getOwnedReviewAutomationTriggers_()
    );

    if (cleanup.ok) {
      persistAutomationSettings_({
        AUTOMATION_TRIGGER_UNIQUE_ID: '',
        AUTOMATION_TRIGGER_INSTALLED_AT: '',
      });
    }
  } finally {
    lock.releaseLock();
  }

  let logError = '';
  try {
    logReviewAutomation_({
      mode: mode,
      action: 'Automation mode changed',
      result: cleanup.ok ? 'Success' : 'Partial',
      details: automationLogDetails_({
        component: 'Review Automation Trigger',
        previousState: 'Live',
        newState: mode,
        error: cleanup.errors.join('; '),
        recoveryRecommendation: cleanup.ok
          ? ''
          : 'The automation owner must remove remaining triggers from My Triggers.',
        metadata: {
          actor: actorEmail,
          cleanup: cleanup,
        },
      }),
    });
  } catch (error) {
    logError = String(error.message || error);
  }

  return {
    ok: true,
    partial: !cleanup.ok || !!logError,
    message: cleanup.ok && !logError
      ? mode === 'Preview'
        ? 'Automation returned to Preview mode. No automatic cycles will be sent.'
        : 'Automation paused and owner-visible triggers were removed.'
      : !cleanup.ok
      ? 'Automation is no longer Live, but one or more owner-visible triggers require manual cleanup.'
      : 'Automation is no longer Live, but the outcome could not be written to the automation log.',
    cleanup: cleanup,
    auditError: logError,
    automation: getAutomationAdminData_(),
  };
}

function hasReviewAutomationTrigger_() {
  return getOwnedReviewAutomationTriggers_().some(
    function (trigger) {
      return (
        getTriggerHandlerName_(trigger) ===
        'runReviewAutomationTrigger_'
      );
    }
  );
}

function verifyStoredAutomationTrigger_(settings, triggers) {
  const storedId = String(
    settings.AUTOMATION_TRIGGER_UNIQUE_ID || ''
  );
  return (triggers || []).find(function (trigger) {
    return (
      getTriggerUniqueId_(trigger) === storedId &&
      getTriggerHandlerName_(trigger) ===
        'runReviewAutomationTrigger_'
    );
  }) || null;
}

function getAutomationTriggerHealth_(settings, triggers) {
  const currentSettings = settings || getSettings_();
  const visibleTriggers =
    triggers || getOwnedReviewAutomationTriggers_();
  const effectiveEmail = getEffectiveAutomationUserEmail_();
  return buildAutomationTriggerHealth_(
    currentSettings,
    visibleTriggers,
    effectiveEmail,
    String(Session.getScriptTimeZone() || 'America/New_York')
  );
}

function buildAutomationTriggerHealth_(
  currentSettings,
  visibleTriggers,
  effectiveEmail,
  timeZone
) {
  const ownerEmail = normalizeEmail_(
    currentSettings.AUTOMATION_OWNER_EMAIL
  );
  const mode = String(
    currentSettings.AUTOMATION_MODE || 'Preview'
  );
  const current = visibleTriggers.filter(function (trigger) {
    return (
      getTriggerHandlerName_(trigger) ===
      'runReviewAutomationTrigger_'
    );
  });
  const stored = verifyStoredAutomationTrigger_(
    currentSettings,
    current
  );
  const ownerMatches =
    !!ownerEmail && ownerEmail === effectiveEmail;
  const modeConsistent =
    mode === 'Live'
      ? current.length === 1 &&
        visibleTriggers.length === 1 &&
        !!stored
      : visibleTriggers.length === 0;
  const warnings = [];

  if (!ownerEmail) {
    warnings.push(
      'AUTOMATION_OWNER_EMAIL is blank; Live activation is blocked.'
    );
  } else if (!ownerMatches) {
    warnings.push(
      'The effective user does not match the configured automation owner.'
    );
  }

  if (!modeConsistent) {
    warnings.push(
      mode === 'Live'
        ? 'Live mode does not have exactly one matching owner-visible trigger.'
        : 'An owner-visible automation trigger exists while automation is not Live.'
    );
  }

  warnings.push(
    'Triggers installed by other accounts cannot be inspected here.'
  );

  return {
    configuredOwnerEmail: ownerEmail,
    effectiveUserEmail: effectiveEmail,
    ownerMatches: ownerMatches,
    storedTriggerId: String(
      currentSettings.AUTOMATION_TRIGGER_UNIQUE_ID || ''
    ),
    visibleTriggerIds: visibleTriggers.map(getTriggerUniqueId_),
    visibleTriggerCount: visibleTriggers.length,
    installedAt: String(
      currentSettings.AUTOMATION_TRIGGER_INSTALLED_AT || ''
    ),
    handlerName: stored
      ? getTriggerHandlerName_(stored)
      : '',
    expectedHour: Number(
      currentSettings.AUTOMATION_TRIGGER_HOUR || 8
    ),
    timeZone: String(timeZone || 'America/New_York'),
    expectedSchedule:
      'Daily at ' +
      Number(currentSettings.AUTOMATION_TRIGGER_HOUR || 8) +
      ':00 ' +
      String(timeZone || 'America/New_York'),
    healthy: ownerMatches && modeConsistent,
    warning: warnings.join(' '),
    mode: mode,
    lastRun: String(currentSettings.AUTOMATION_LAST_RUN || ''),
    lastSuccess: String(
      currentSettings.AUTOMATION_LAST_SUCCESS || ''
    ),
    lastFailure: String(
      currentSettings.AUTOMATION_LAST_FAILURE || ''
    ),
    lastError: String(
      currentSettings.AUTOMATION_LAST_ERROR || ''
    ),
  };
}

function refreshReviewAutomationHealth() {
  const email = getCurrentUserEmail_();

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may refresh automation health.'
    );
  }

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    triggerHealth: getAutomationTriggerHealth_(),
  };
}

function buildProductionReadinessReport_(
  settings,
  triggerHealth,
  options
) {
  const opts = options || {};
  const blocking = [];
  const warnings = [];
  const requiredSettings = [
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
    'AUTOMATION_MODE',
    'AUTOMATION_TRIGGER_HOUR',
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

  requiredSettings.forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) {
      blocking.push({
        code: 'MISSING_SETTING',
        setting: key,
        message: 'Required setting is missing: ' + key,
      });
    }
  });

  if (String(settings.APP_VERSION || '') !== APP_VERSION) {
    blocking.push({
      code: 'APP_VERSION_MISMATCH',
      message:
        'APP_VERSION setting does not match the deployed source version.',
    });
  }

  if (
    ['Sandbox', 'Production'].indexOf(
      String(settings.ENVIRONMENT || '')
    ) < 0
  ) {
    blocking.push({
      code: 'INVALID_ENVIRONMENT',
      message:
        'ENVIRONMENT must be exactly Sandbox or Production.',
    });
  }

  if (!normalizeEmail_(settings.AUTOMATION_OWNER_EMAIL)) {
    blocking.push({
      code: 'AUTOMATION_OWNER_REQUIRED',
      message:
        'AUTOMATION_OWNER_EMAIL must be explicitly configured before Live activation.',
    });
  }

  if (!normalizeEmail_(settings.SYSTEM_ADMIN_EMAIL)) {
    blocking.push({
      code: 'SYSTEM_ADMIN_REQUIRED',
      message:
        'SYSTEM_ADMIN_EMAIL must be explicitly configured.',
    });
  }

  if (
    !isValidSystemAlertRecipient_(
      settings.SYSTEM_ALERT_RECIPIENT,
      settings.ALLOWED_DOMAIN
    )
  ) {
    blocking.push({
      code: 'SYSTEM_ALERT_RECIPIENT_REQUIRED',
      message:
        'SYSTEM_ALERT_RECIPIENT must be an explicit AITHERAS-domain email address.',
    });
  }

  [
    ['OUTBOX_STALE_MINUTES', settings.OUTBOX_STALE_MINUTES],
    [
      'SYSTEM_ALERT_STALE_MINUTES',
      settings.SYSTEM_ALERT_STALE_MINUTES,
    ],
    [
      'FINAL_DISTRIBUTION_STALE_MINUTES',
      settings.FINAL_DISTRIBUTION_STALE_MINUTES,
    ],
    [
      'FINALIZATION_AUDIT_STALE_MINUTES',
      settings.FINALIZATION_AUDIT_STALE_MINUTES,
    ],
    [
      'PDF_GENERATION_STALE_MINUTES',
      settings.PDF_GENERATION_STALE_MINUTES,
    ],
  ].forEach(function (entry) {
    const minutes = Number(entry[1]);
    if (!isFinite(minutes) || minutes <= 0) {
      blocking.push({
        code: 'INVALID_STALE_MINUTES',
        setting: entry[0],
        message: entry[0] + ' must be a positive number.',
      });
    }
  });

  if (!String(settings.SIGNATURE_RECOVERY_FOLDER_ID || '')) {
    blocking.push({
      code: 'SIGNATURE_RECOVERY_FOLDER_REQUIRED',
      message:
        'SIGNATURE_RECOVERY_FOLDER_ID must be provisioned before production readiness can pass.',
    });
  }

  if (
    String(settings.ENVIRONMENT || 'Production') ===
      'Production' &&
    v31Boolean_(settings.ENABLE_FAULT_INJECTION, false)
  ) {
    blocking.push({
      code: 'PRODUCTION_FAULT_INJECTION',
      message:
        'Fault injection must be disabled in Production.',
    });
  }

  if (!triggerHealth.healthy) {
    blocking.push({
      code: 'TRIGGER_HEALTH',
      message:
        triggerHealth.warning ||
        'Automation trigger health requires attention.',
    });
  }

  const liveProbeReport = buildSandboxLiveProbeReport_(
    settings,
    opts
  );
  if (liveProbeReport.requested && !liveProbeReport.allowed) {
    blocking.push({
      code: 'LIVE_PROBE_GUARD',
      message:
        'Live probes require Sandbox, sandboxConfirmed=true, and the SANDBOX_LIVE_PROBES confirmation token.',
    });
  } else if (
    liveProbeReport.requested &&
    liveProbeReport.allowed &&
    !liveProbeReport.executed
  ) {
    warnings.push({
      code: 'REQUIRES_DANIEL_SANDBOX',
      message:
        'Sandbox live-probe report prepared. Drive/Calendar/template/PDF probes were not executed and remain Requires Daniel Sandbox.',
      checksSkipped: liveProbeReport.checksSkipped,
    });
  }

  return {
    appVersion: APP_VERSION,
    environment: String(
      settings.ENVIRONMENT || 'Production'
    ),
    checkedAt: new Date().toISOString(),
    ok: blocking.length === 0,
    blocking: blocking,
    warnings: warnings,
    triggerHealth: triggerHealth,
    liveProbesExecuted: liveProbeReport.executed === true,
    liveProbes: liveProbeReport,
  };
}

/**
 * Catalog of Workspace probes that require Daniel Sandbox evidence.
 */
function getSandboxLiveProbeCatalog_() {
  return [
    'Calendar access',
    'Manager template',
    'Self template',
    'Review folder',
    'PDF validation',
    'Signature artifact validation',
  ];
}

/**
 * Pure helper: describe whether Sandbox live probes were requested,
 * allowed, and actually executed. Never claims execution when false.
 * Pass options.probeResults from executeSandboxLiveProbes_() when run.
 */
function buildSandboxLiveProbeReport_(settings, options) {
  const opts = options || {};
  const requested = opts.liveProbes === true;
  const allowed =
    requested &&
    String((settings && settings.ENVIRONMENT) || '') ===
      'Sandbox' &&
    opts.sandboxConfirmed === true &&
    String(opts.confirmationToken || '') === 'SANDBOX_LIVE_PROBES';
  const catalog = getSandboxLiveProbeCatalog_();
  const probeResults = opts.probeResults || null;
  if (
    allowed &&
    probeResults &&
    probeResults.executed === true
  ) {
    return {
      requested: true,
      allowed: true,
      executed: true,
      checksRun: (probeResults.checksRun || []).slice(),
      checksSkipped: (probeResults.checksSkipped || []).slice(),
    };
  }
  return {
    requested: requested,
    allowed: allowed,
    executed: false,
    checksRun: [],
    checksSkipped: requested ? catalog.slice() : [],
  };
}

/**
 * Pure authorization matrix for public admin/recovery surfaces.
 * Used by V31_Security_Tests.gs; does not call Session or Sheets.
 */
function decidePublicAdminAuthorization_(actor) {
  const value = actor || {};
  const email = normalizeEmail_(value.email);
  const domain = String(value.allowedDomain || 'aitheras.com')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  const onDomain =
    !!email && !!domain && email.endsWith('@' + domain);
  const isHr = onDomain && value.isActiveHr === true;
  const isManager = onDomain && value.isManager === true;
  const isEmployee = onDomain && value.isEmployee === true;
  const isOwner =
    onDomain &&
    normalizeEmail_(value.automationOwnerEmail) === email &&
    !!email;
  return {
    email: email,
    onDomain: onDomain,
    isActiveHr: isHr,
    isManager: isManager,
    isEmployee: isEmployee,
    isAutomationOwner: isOwner,
    canSystemHealth: isHr,
    canDrainSystemAlerts: isHr,
    canDrainWorkflowOutbox: isHr,
    canReconcilePdf: isHr,
    canReconcileSignature: isHr,
    canRetryFinalization: isHr,
    canRetryLaunch: isHr,
    canRebuildCalendar: isHr,
    canChangeAutomationSettings: isHr,
    canPreviewAutomation: isHr,
    canEnableLiveMode: isHr && isOwner,
    canAdministerTriggers: isOwner,
    canSeeCompensation: isHr || isManager,
    canAccessOtherCycles: isHr,
    canInvokePrivateSetupOrTestsFromWebClient: false,
  };
}

/**
 * Bounded Sandbox-only Workspace probes. Production must never call this
 * successfully. Records checksRun/checksSkipped honestly.
 */
function executeSandboxLiveProbes_(settings) {
  const current = settings || getSettings_();
  if (String(current.ENVIRONMENT || '') !== 'Sandbox') {
    throw new Error(
      'executeSandboxLiveProbes_ is prohibited unless ENVIRONMENT is Sandbox.'
    );
  }

  const checksRun = [];
  const checksSkipped = [];
  const blocking = [];
  const warnings = [];
  const reviewFolderId = String(current.REVIEW_FOLDER_ID || '');

  try {
    const calendar = CalendarApp.getDefaultCalendar();
    if (!calendar || !calendar.getId()) {
      throw new Error('Default calendar is inaccessible.');
    }
    checksRun.push('Calendar access');
  } catch (error) {
    checksRun.push('Calendar access');
    blocking.push({
      code: 'CALENDAR_PROBE_FAILED',
      message: String(error.message || error),
    });
  }

  [
    {
      label: 'Manager template',
      setting: 'MANAGER_TEMPLATE_ID',
      code: 'MANAGER_TEMPLATE_PROBE_FAILED',
    },
    {
      label: 'Self template',
      setting: 'SELF_TEMPLATE_ID',
      code: 'SELF_TEMPLATE_PROBE_FAILED',
    },
  ].forEach(function (entry) {
    const fileId = String(current[entry.setting] || '');
    if (!fileId) {
      checksSkipped.push(entry.label);
      warnings.push({
        code: entry.code,
        message: entry.setting + ' is blank; probe skipped.',
      });
      return;
    }
    try {
      const file = DriveApp.getFileById(fileId);
      if (file.isTrashed()) {
        throw new Error(entry.label + ' is trashed.');
      }
      checksRun.push(entry.label);
    } catch (error) {
      checksRun.push(entry.label);
      blocking.push({
        code: entry.code,
        message: String(error.message || error),
      });
    }
  });

  if (!reviewFolderId) {
    checksSkipped.push('Review folder');
    warnings.push({
      code: 'REVIEW_FOLDER_PROBE_SKIPPED',
      message: 'REVIEW_FOLDER_ID is blank; probe skipped.',
    });
  } else {
    try {
      const folder = DriveApp.getFolderById(reviewFolderId);
      if (!folder || !folder.getName()) {
        throw new Error('Review folder is inaccessible.');
      }
      checksRun.push('Review folder');
    } catch (error) {
      checksRun.push('Review folder');
      blocking.push({
        code: 'REVIEW_FOLDER_PROBE_FAILED',
        message: String(error.message || error),
      });
    }
  }

  const pdfProbe = probeCompletedPdfsInSandbox_(
    current,
    reviewFolderId
  );
  if (pdfProbe.skipped) {
    checksSkipped.push('PDF validation');
    warnings.push({
      code: 'PDF_PROBE_SKIPPED',
      message: pdfProbe.message,
    });
  } else {
    checksRun.push('PDF validation');
    pdfProbe.blocking.forEach(function (issue) {
      blocking.push(issue);
    });
    pdfProbe.warnings.forEach(function (issue) {
      warnings.push(issue);
    });
  }

  const signatureProbe = probeSignatureArtifactsInSandbox_(current);
  if (signatureProbe.skipped) {
    checksSkipped.push('Signature artifact validation');
    warnings.push({
      code: 'SIGNATURE_ARTIFACT_PROBE_SKIPPED',
      message: signatureProbe.message,
    });
  } else {
    checksRun.push('Signature artifact validation');
    signatureProbe.blocking.forEach(function (issue) {
      blocking.push(issue);
    });
    signatureProbe.warnings.forEach(function (issue) {
      warnings.push(issue);
    });
  }

  return {
    executed: true,
    checksRun: checksRun,
    checksSkipped: checksSkipped,
    blocking: blocking,
    warnings: warnings,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Bounded completed-PDF Drive validation for Sandbox live probes.
 * Caps inspected Complete cycles to avoid Apps Script timeouts.
 */
function probeCompletedPdfsInSandbox_(settings, reviewFolderId) {
  const blocking = [];
  const warnings = [];
  const maxCycles = 25;
  let cycles = [];
  try {
    cycles = getAllObjects_(PR.SHEETS.CYCLES).filter(function (cycle) {
      return String(cycle.Status || '') === PR.CYCLE.COMPLETE;
    });
  } catch (error) {
    return {
      skipped: true,
      message:
        'Could not load ReviewCycles for PDF probes: ' +
        String(error.message || error),
      blocking: blocking,
      warnings: warnings,
    };
  }

  if (!cycles.length) {
    return {
      skipped: true,
      message: 'No Complete cycles available for PDF probes.',
      blocking: blocking,
      warnings: warnings,
    };
  }

  const sample = cycles.slice(0, maxCycles);
  sample.forEach(function (cycle) {
    const cycleId = String(cycle['Cycle ID'] || '');
    [
      {
        label: 'Manager PDF',
        idField: 'Manager Review PDF ID',
        documentType: PR.TYPE.MANAGER,
      },
      {
        label: 'Self PDF',
        idField: 'Self Evaluation PDF ID',
        documentType: PR.TYPE.SELF,
      },
    ].forEach(function (entry) {
      const fileId = String(cycle[entry.idField] || '');
      if (!fileId) {
        warnings.push({
          code: 'PDF_ID_MISSING',
          cycleId: cycleId,
          message:
            entry.label +
            ' ID is blank on Complete cycle ' +
            cycleId +
            '.',
        });
        return;
      }
      let facts = {
        exists: false,
        trashed: false,
        mimeType: '',
        folderId: '',
        expectedFolderId: String(reviewFolderId || ''),
        identityOk: true,
      };
      try {
        const file = DriveApp.getFileById(fileId);
        facts.exists = true;
        facts.trashed = !!file.isTrashed();
        facts.mimeType = String(file.getMimeType() || '');
        const parents = file.getParents();
        if (parents.hasNext()) {
          facts.folderId = String(parents.next().getId() || '');
        }
        const expectedNames =
          typeof getRecognizedReviewPdfNames_ === 'function'
            ? getRecognizedReviewPdfNames_(
                cycleId,
                entry.documentType
              )
            : [];
        if (
          expectedNames.length &&
          expectedNames.indexOf(String(file.getName() || '')) < 0
        ) {
          facts.identityOk = false;
        }
      } catch (error) {
        facts.exists = false;
      }
      const classified = classifyCompletedPdfProbeResult_(facts);
      if (!classified.ok) {
        blocking.push({
          code: classified.code,
          cycleId: cycleId,
          documentType: entry.documentType,
          message:
            entry.label +
            ' for cycle ' +
            cycleId +
            ': ' +
            classified.message,
          recommendation:
            'Reconcile the completed PDF. Do not automatically resend the final packet.',
        });
      }
    });
  });

  if (cycles.length > maxCycles) {
    warnings.push({
      code: 'PDF_PROBE_BOUNDED',
      message:
        'PDF probes inspected ' +
        maxCycles +
        ' of ' +
        cycles.length +
        ' Complete cycles.',
    });
  }

  return {
    skipped: false,
    message: '',
    blocking: blocking,
    warnings: warnings,
  };
}

function probeSignatureArtifactsInSandbox_(settings) {
  const blocking = [];
  const warnings = [];
  const maxFiles = 25;
  let cycles = [];
  try {
    cycles = getAllObjects_(PR.SHEETS.CYCLES);
  } catch (error) {
    return {
      skipped: true,
      message:
        'Could not load ReviewCycles for signature artifact probes: ' +
        String(error.message || error),
      blocking: blocking,
      warnings: warnings,
    };
  }

  const fileIds = [];
  cycles.forEach(function (cycle) {
    [
      'Manager Signature File ID',
      'Employee Signature File ID',
      'HR Signature File ID',
    ].forEach(function (field) {
      const fileId = String(cycle[field] || '');
      if (fileId) {
        fileIds.push({
          cycleId: String(cycle['Cycle ID'] || ''),
          field: field,
          fileId: fileId,
        });
      }
    });
  });

  if (!fileIds.length) {
    return {
      skipped: true,
      message: 'No signature file IDs available for artifact probes.',
      blocking: blocking,
      warnings: warnings,
    };
  }

  fileIds.slice(0, maxFiles).forEach(function (entry) {
    try {
      const file = DriveApp.getFileById(entry.fileId);
      if (file.isTrashed()) {
        blocking.push({
          code: 'SIGNATURE_ARTIFACT_TRASHED',
          cycleId: entry.cycleId,
          message:
            entry.field +
            ' for cycle ' +
            entry.cycleId +
            ' is trashed.',
        });
      }
    } catch (error) {
      blocking.push({
        code: 'SIGNATURE_ARTIFACT_MISSING',
        cycleId: entry.cycleId,
        message:
          entry.field +
          ' for cycle ' +
          entry.cycleId +
          ' is inaccessible: ' +
          String(error.message || error),
      });
    }
  });

  if (fileIds.length > maxFiles) {
    warnings.push({
      code: 'SIGNATURE_ARTIFACT_PROBE_BOUNDED',
      message:
        'Signature artifact probes inspected ' +
        maxFiles +
        ' of ' +
        fileIds.length +
        ' file IDs.',
    });
  }

  return {
    skipped: false,
    message: '',
    blocking: blocking,
    warnings: warnings,
  };
}

/**
 * Pure helper: Complete cycles that claim a healthy audit Event ID must
 * still have the deterministic ReviewAuditLog row. Used by deep readiness
 * only — not the lightweight System Health summary.
 */
function collectCompleteCycleAuditRowIssues_(
  cycles,
  auditEventIdSet
) {
  const blocking = [];
  const recoveryItems = [];
  const idSet = auditEventIdSet || {};
  (cycles || []).forEach(function (cycle) {
    if (String(cycle.Status || '') !== PR.CYCLE.COMPLETE) {
      return;
    }
    const cycleId = String(cycle['Cycle ID'] || '');
    const auditStatus = String(
      cycle['Finalization Audit Status'] || ''
    );
    const storedId = String(
      cycle['Finalization Audit Event ID'] || ''
    );
    const expectedId =
      typeof getFinalizationAuditEventId_ === 'function'
        ? getFinalizationAuditEventId_(cycleId)
        : 'FINALIZATION_COMPLETE:' + cycleId;
    if (auditStatus !== 'Complete' || storedId !== expectedId) {
      return;
    }
    if (idSet[expectedId]) {
      return;
    }
    blocking.push({
      code: 'FINALIZATION_AUDIT_ROW_MISSING',
      cycleId: cycleId,
      message:
        'Complete cycle ' +
        cycleId +
        ' stores Event ID ' +
        expectedId +
        ', but the ReviewAuditLog row is missing.',
      recommendation:
        'Retry Finalization so the deterministic audit event can be rewritten.',
    });
    recoveryItems.push({
      id: 'audit:' + cycleId,
      cycleId: cycleId,
      employeeName: String(cycle['Employee Name'] || cycleId),
      category: 'audit',
      component: 'Finalization Audit',
      status: 'Complete (audit row missing)',
      level: 'blocking',
      action: 'retryFinalization',
      actionLabel: 'Retry',
      recommendation:
        'Retry Finalization so the deterministic audit event can be rewritten.',
      lastError:
        'Cycle field Event ID is present, but the ReviewAuditLog row is missing.',
    });
  });
  return {
    blocking: blocking,
    recoveryItems: recoveryItems,
  };
}

/**
 * Pure helper: classify completed-PDF probe facts without Drive calls.
 * Live Drive probes remain Requires Daniel Sandbox.
 */
function classifyCompletedPdfProbeResult_(facts) {
  const value = facts || {};
  if (value.exists !== true) {
    return {
      ok: false,
      code: 'PDF_MISSING',
      level: 'blocking',
      message: 'Completed PDF file is missing.',
    };
  }
  if (value.trashed === true) {
    return {
      ok: false,
      code: 'PDF_TRASHED',
      level: 'blocking',
      message: 'Completed PDF file is in trash.',
    };
  }
  if (
    value.mimeType &&
    String(value.mimeType) !== 'application/pdf'
  ) {
    return {
      ok: false,
      code: 'PDF_MIME_INVALID',
      level: 'blocking',
      message: 'Completed PDF MIME type is invalid.',
    };
  }
  if (
    value.expectedFolderId &&
    value.folderId &&
    String(value.folderId) !== String(value.expectedFolderId)
  ) {
    return {
      ok: false,
      code: 'PDF_FOLDER_MISMATCH',
      level: 'blocking',
      message: 'Completed PDF is outside the review folder.',
    };
  }
  if (value.identityOk === false) {
    return {
      ok: false,
      code: 'PDF_IDENTITY_MISMATCH',
      level: 'blocking',
      message:
        'Completed PDF identity does not match the deterministic cycle artifact.',
    };
  }
  return {
    ok: true,
    code: 'PDF_OK',
    level: 'healthy',
    message: 'Completed PDF facts are valid.',
  };
}

function buildAuditEventIdSet_(auditRows) {
  const idSet = {};
  const prefix = 'FINALIZATION_COMPLETE:';
  (auditRows || []).forEach(function (row) {
    const eventId = String(row['Event ID'] || '').trim();
    if (eventId.indexOf(prefix) === 0) {
      idSet[eventId] = true;
    }
  });
  return idSet;
}

function runProductionReadinessChecks_(options) {
  const opts = options || { liveProbes: false };
  const settings = getSettings_();
  let probeResults = null;

  if (
    opts.liveProbes === true &&
    String(settings.ENVIRONMENT || '') === 'Sandbox' &&
    opts.sandboxConfirmed === true &&
    String(opts.confirmationToken || '') === 'SANDBOX_LIVE_PROBES'
  ) {
    try {
      probeResults = executeSandboxLiveProbes_(settings);
    } catch (error) {
      probeResults = {
        executed: false,
        checksRun: [],
        checksSkipped: getSandboxLiveProbeCatalog_(),
        blocking: [
          {
            code: 'SANDBOX_LIVE_PROBE_FAILED',
            message: String(error.message || error),
          },
        ],
        warnings: [],
      };
    }
  }

  const report = buildProductionReadinessReport_(
    settings,
    getAutomationTriggerHealth_(settings),
    {
      liveProbes: opts.liveProbes,
      sandboxConfirmed: opts.sandboxConfirmed,
      confirmationToken: opts.confirmationToken,
      probeResults: probeResults,
    }
  );

  if (probeResults) {
    (probeResults.blocking || []).forEach(function (issue) {
      report.blocking.push(issue);
    });
    (probeResults.warnings || []).forEach(function (issue) {
      // Avoid duplicating the REQUIRES_DANIEL_SANDBOX placeholder when
      // probes actually executed.
      if (
        probeResults.executed &&
        issue.code === 'REQUIRES_DANIEL_SANDBOX'
      ) {
        return;
      }
      report.warnings.push(issue);
    });
    if (probeResults.executed) {
      report.warnings = (report.warnings || []).filter(function (
        row
      ) {
        return row.code !== 'REQUIRES_DANIEL_SANDBOX';
      });
    }
    report.ok = report.blocking.length === 0;
  }

  if (settings.SIGNATURE_RECOVERY_FOLDER_ID) {
    try {
      const folder = validateSignatureRecoveryFolder_(
        settings.SIGNATURE_RECOVERY_FOLDER_ID,
        settings.REVIEW_FOLDER_ID
      );
      report.signatureRecoveryFolder = {
        folderId: folder.folderId,
        folderUrl: folder.folderUrl,
        manuallyVerifiedPermissions: false,
      };
      report.warnings.push({
        code: 'MANUAL_FOLDER_PERMISSION_CHECK',
        message:
          'Daniel must verify recovery-folder permissions in Sandbox and Production.',
      });
    } catch (error) {
      report.blocking.push({
        code: 'INVALID_SIGNATURE_RECOVERY_FOLDER',
        message: String(error.message || error),
      });
      report.ok = false;
    }
  }

  // Deep readiness only: verify deterministic finalization audit rows for
  // Complete cycles that claim a healthy Event ID. Lightweight summary skips.
  if (opts.verifyFinalizationAuditRows === true) {
    const auditStarted = Date.now();
    const allCycles =
      opts.cycles || getAllObjects_(PR.SHEETS.CYCLES);
    const completeCycles = (allCycles || []).filter(function (cycle) {
      return String(cycle.Status || '') === PR.CYCLE.COMPLETE;
    });
    const auditRows =
      opts.auditRows || getAllObjects_(PR.SHEETS.AUDIT);
    const auditIssues = collectCompleteCycleAuditRowIssues_(
      completeCycles,
      buildAuditEventIdSet_(auditRows)
    );
    auditIssues.blocking.forEach(function (issue) {
      report.blocking.push(issue);
    });
    report.finalizationAuditRecoveryItems =
      auditIssues.recoveryItems;
    report.finalizationAuditCheck = {
      completeCycleCount: completeCycles.length,
      durationMs: Date.now() - auditStarted,
    };
    if (auditIssues.blocking.length) {
      report.ok = false;
    }
  }
  return report;
}

function maybeInjectTriggerFault_(point) {
  const settings = getSettings_();
  const decision = decideTriggerFault_(settings, point);

  if (!decision.enabled) {
    return;
  }

  if (decision.prohibited) {
    throw new Error(
      'Fault injection is prohibited unless ENVIRONMENT is Sandbox.'
    );
  }

  if (!decision.inject) {
    return;
  }

  if (v31Boolean_(settings.FAULT_ONCE, true)) {
    persistAutomationSettings_({
      ENABLE_FAULT_INJECTION: 'false',
      FAULT_POINT: '',
    });
  }

  throw new Error(
    'Sandbox fault injected at ' + String(point) + '.'
  );
}

function decideTriggerFault_(settings, point) {
  const enabled = v31Boolean_(
    settings.ENABLE_FAULT_INJECTION,
    false
  );
  const environment = String(
    settings.ENVIRONMENT || 'Production'
  );
  const matches =
    String(settings.FAULT_POINT || '') === String(point);

  return {
    enabled: enabled,
    prohibited: enabled && environment !== 'Sandbox',
    inject:
      enabled &&
      environment === 'Sandbox' &&
      matches,
  };
}

/**
 * Replace legacy runReviewAutomation triggers with the private handler.
 * Trigger uniqueness can be enforced only for the configured owner.
 * Other editors must clear their own triggers from My Triggers.
 */
function migrateLegacyReviewAutomationTrigger_() {
  const settings = getSettings_();
  assertAutomationOwner_(settings);
  const mode = String(
    settings.AUTOMATION_MODE || 'Preview'
  );

  if (mode === 'Live') {
    const result = installReviewAutomationTriggerSafely_({
      actorEmail: getEffectiveAutomationUserEmail_(),
      reason: 'Legacy trigger migration',
    });
    result.message = result.ok
      ? result.partial
        ? 'A verified replacement is active; owner-visible legacy triggers require manual cleanup.'
        : 'A verified private-handler trigger replaced owner-visible legacy triggers.'
      : 'Legacy trigger migration failed; the prior trigger and mode were preserved.';
    return result;
  }

  const result = disableReviewAutomationSafely_(
    mode,
    getEffectiveAutomationUserEmail_()
  );
  result.mode = mode;
  return result;
}

/* ============================ AUTOMATION RUN ============================= */

/**
 * Short-lock claim helpers used by runReviewAutomation. Row claim/create
 * is the only part protected by the global lock — Calendar/Mail side
 * effects happen afterward, outside any lock (see
 * launchReviewCycleCommunications_).
 */
function claimNewAutomatedReviewCycle_(candidate) {
  return withLock_(function () {
    return createAutomatedReviewCycle_(candidate);
  });
}

function claimAutomationCycleForRetry_(existingCycleId) {
  return withLock_(function () {
    return findCycle_(existingCycleId).object;
  });
}

function runReviewAutomationTrigger_() {
  try {
    assertAutomationOwner_(getSettings_());
    return runReviewAutomationCore_();
  } catch (error) {
    recordAutomationRunHealth_(
      false,
      String(error.message || error)
    );
    throw error;
  }
}

function recordAutomationRunHealth_(successful, errorMessage) {
  const now = new Date().toISOString();
  const values = {
    AUTOMATION_LAST_RUN: now,
    AUTOMATION_LAST_ERROR: successful
      ? ''
      : String(errorMessage || 'Automation run failed.'),
  };

  if (successful) {
    values.AUTOMATION_LAST_SUCCESS = now;
  } else {
    values.AUTOMATION_LAST_FAILURE = now;
  }

  withLock_(function () {
    persistAutomationSettings_(values);
  });
}

/**
 * Live automation core. Private from google.script.run.
 * Preview/Paused return immediately with zero email/calendar side effects.
 */
function runReviewAutomationCore_() {
  ensureV31DataModel_();

  const settings = getSettings_();
  const mode = String(
    settings.AUTOMATION_MODE || 'Preview'
  );

  if (mode !== 'Live') {
    logReviewAutomation_({
      mode: mode,
      action: 'Scheduled automation check',
      result: 'Skipped',
      details:
        'Automation is not in Live mode. Preview/Paused send nothing automatically.',
    });

    return {
      ok: true,
      created: 0,
      retried: 0,
      retriedSuccessfully: 0,
      failed: 0,
      skipped: true,
      message:
        'Automation is not Live. No cycles were created and no emails were sent.',
    };
  }

  assertAutomationOwner_(settings);
  const outbox = dispatchPendingWorkflowNotificationsForAllCycles_();
  let historyRepairs = { repaired: 0, skipped: 0, failed: 0 };
  try {
    historyRepairs = processDueCompensationHistoryRepairs_();
  } catch (historyRepairError) {
    historyRepairs = {
      repaired: 0,
      skipped: 0,
      failed: 1,
      error: String(historyRepairError.message || historyRepairError),
    };
  }
  let rateUpdates = { updated: 0, skipped: 0, failed: 0 };
  try {
    rateUpdates = processDueCompensationRateUpdates_();
  } catch (rateUpdateError) {
    rateUpdates = {
      updated: 0,
      skipped: 0,
      failed: 1,
      error: String(rateUpdateError.message || rateUpdateError),
    };
  }
  let systemAlerts;
  try {
    systemAlerts = drainSystemAlertsAutomatically_();
  } catch (alertDrainError) {
    systemAlerts = {
      failed: 1,
      error: String(
        alertDrainError.message || alertDrainError
      ),
    };
    Logger.log(
      'Automatic system alert drain failed: ' +
        systemAlerts.error
    );
  }

  const candidates =
    findReviewAutomationCandidates_(
      Number(settings.REVIEW_NOTICE_DAYS || 28)
    );
  let created = 0;
  let retryAttempts = 0;
  let retriedSuccessfully = 0;
  let failed = 0;
  const results = [];

  candidates.forEach(function (candidate) {
    let cycle = null;

    try {
      if (candidate.existingCycleId) {
        retryAttempts++;
        cycle = claimAutomationCycleForRetry_(
          candidate.existingCycleId
        );
      } else {
        cycle = claimNewAutomatedReviewCycle_(
          candidate
        );
        created++;
      }

      // External Calendar/Mail side effects must not hold the
      // global script lock used above to claim/create the row.
      const launched =
        launchReviewCycleCommunications_(
          cycle,
          true
        );
      const summary =
        getReviewLaunchComponentSummary_(
          launched
        );

      if (candidate.existingCycleId && summary.complete) {
        retriedSuccessfully++;
      }

      results.push({
        employeeName: candidate.employeeName,
        reviewType: candidate.reviewType,
        cycleId: launched['Cycle ID'],
        result: summary.complete
          ? 'Created and sent'
          : 'Partial launch',
        launchComponents: summary,
      });

      logReviewAutomation_({
        mode: mode,
        action: candidate.existingCycleId
          ? 'Launch retried'
          : 'Review cycle created',
        employeeEmail:
          candidate.employeeEmail,
        employeeName:
          candidate.employeeName,
        reviewType: candidate.reviewType,
        reviewDate: candidate.reviewDate,
        cycleId: launched['Cycle ID'],
        result: summary.complete
          ? 'Success'
          : 'Partial',
        details: summary.complete
          ? 'Calendar event and three workflow emails completed.'
          : describeReviewLaunchStatus_(
              launched
            ),
      });
    } catch (error) {
      failed++;

      const cycleIdForLog =
        (cycle && cycle['Cycle ID']) ||
        candidate.existingCycleId ||
        '';

      results.push({
        employeeName: candidate.employeeName,
        reviewType: candidate.reviewType,
        cycleId: cycleIdForLog,
        result: 'Failed',
        details: error.message,
      });

      logReviewAutomation_({
        mode: mode,
        action: 'Review launch',
        employeeEmail:
          candidate.employeeEmail,
        employeeName:
          candidate.employeeName,
        reviewType: candidate.reviewType,
        reviewDate: candidate.reviewDate,
        cycleId: cycleIdForLog,
        result: 'Failed',
        details: error.message,
      });
    }
  });

  const runFailed =
    failed > 0 ||
    (outbox && outbox.ok === false) ||
    Number((systemAlerts && systemAlerts.failed) || 0) > 0 ||
    Number(
      (systemAlerts && systemAlerts.deliveryUnknown) || 0
    ) > 0;
  recordAutomationRunHealth_(
    !runFailed,
    runFailed
      ? failed +
          ' launch failure(s); outbox failures: ' +
          Number((outbox && outbox.failed) || 0) +
          '; system alert failures: ' +
          Number((systemAlerts && systemAlerts.failed) || 0) +
          '; system alert delivery unknown: ' +
          Number(
            (systemAlerts && systemAlerts.deliveryUnknown) || 0
          )
      : ''
  );

  return {
    ok: !runFailed,
    created: created,
    retried: retryAttempts,
    retriedSuccessfully: retriedSuccessfully,
    failed: failed,
    outbox: outbox,
    systemAlerts: systemAlerts,
    compensationRateUpdates: rateUpdates,
    compensationHistoryRepairs: historyRepairs,
    results: results,
    message:
      created +
      ' review cycle(s) created, ' +
      retryAttempts +
      ' launch(es) retried (' +
      retriedSuccessfully +
      ' completed), and ' +
      failed +
      ' failure(s). Outbox sent ' +
      Number(outbox.sent || 0) +
      '.',
  };
}

function findReviewAutomationCandidates_(windowDays) {
  const settings = getSettings_();
  const noticeDays = Number(
    settings.REVIEW_NOTICE_DAYS || 28
  );
  const today = v31Today_();
  const windowEnd = v31AddDays_(
    today,
    Math.max(
      Number(windowDays || noticeDays),
      noticeDays
    )
  );
  const assignments = getAllObjects_(
    PR.SHEETS.ASSIGNMENTS
  );
  const cycles = getAllObjects_(
    PR.SHEETS.CYCLES
  );
  const existingByKey = {};

  cycles.forEach(function (cycle) {
    const key = String(
      cycle['Automation Key'] || ''
    );

    if (key) {
      existingByKey[key] = cycle;
    }
  });

  const candidates = [];

  assignments.forEach(function (assignment) {
    const active =
      assignment.Active === true ||
      String(assignment.Active).toLowerCase() ===
        'true';
    const automationValue =
      assignment['Review Automation'];
    const automationEnabled =
      automationValue === '' ||
      automationValue == null ||
      automationValue === true ||
      String(automationValue).toLowerCase() ===
        'true';

    if (!active || !automationEnabled) {
      return;
    }

    const hireDate = v31Date_(
      assignment['Hire Date']
    );

    if (!hireDate) {
      return;
    }

    const employeeEmail = normalizeEmail_(
      assignment['Employee Email']
    );
    const employeeName = String(
      assignment['Employee Name'] || ''
    );
    const managerEmail = normalizeEmail_(
      assignment['Manager Email']
    );
    const managerName = String(
      assignment['Manager Name'] || ''
    );

    if (
      !employeeEmail ||
      !employeeName ||
      !managerEmail ||
      !managerName
    ) {
      return;
    }

    const possible = [];

    const sixMonthDate = v31AddMonthsClamped_(
      hireDate,
      6
    );

    possible.push({
      reviewType: '6-Month Review',
      reviewDate: sixMonthDate,
      reviewPeriodStart: hireDate,
      reviewPeriodEnd: sixMonthDate,
    });

    for (
      let year = today.getFullYear();
      year <= windowEnd.getFullYear();
      year++
    ) {
      const yearsOfService =
        year - hireDate.getFullYear();

      if (yearsOfService < 1) continue;

      const anniversary =
        v31AnniversaryInYear_(
          hireDate,
          year
        );

      possible.push({
        reviewType:
          yearsOfService === 1
            ? '1-Year Review'
            : 'Annual Review',
        reviewDate: anniversary,
        reviewPeriodStart:
          yearsOfService === 1
            ? hireDate
            : v31AnniversaryInYear_(
                hireDate,
                year - 1
              ),
        reviewPeriodEnd: anniversary,
      });
    }

    possible.forEach(function (review) {
      const reviewDate = v31StartOfDay_(
        review.reviewDate
      );
      const launchDate = v31AddDays_(
        reviewDate,
        -noticeDays
      );

      if (
        reviewDate < today ||
        reviewDate > windowEnd ||
        launchDate > today
      ) {
        return;
      }

      const automationKey =
        employeeEmail +
        '|' +
        formatDateIso_(reviewDate) +
        '|' +
        review.reviewType;
      const existing = existingByKey[
        automationKey
      ];

      const periodCycles = cycles.filter(
        function (cycle) {
          return (
            normalizeEmail_(
              cycle['Employee Email']
            ) === employeeEmail &&
            v31SameDate_(
              cycle['Review Period End'],
              reviewDate
            ) &&
            String(cycle['Status']) !==
              PR.CYCLE.CANCELLED
          );
        }
      );

      const launchTarget =
        resolveAutomationLaunchTarget_(
          existing,
          periodCycles
        );

      if (launchTarget.skip) {
        return;
      }

      const retryCycle = launchTarget.retryCycle;

      const meetingDate =
        v31Boolean_(
          settings.SHIFT_WEEKEND_MEETINGS,
          true
        )
          ? v31ShiftWeekendForward_(
              reviewDate
            )
          : reviewDate;
      const dueDate =
        v31ShiftWeekendBackward_(
          v31AddDays_(
            meetingDate,
            -Number(
              settings.FORM_DUE_DAYS_BEFORE_MEETING ||
                7
            )
          )
        );

      candidates.push({
        automationKey: automationKey,
        existingCycleId: retryCycle
          ? String(retryCycle['Cycle ID'])
          : '',
        employeeEmail: employeeEmail,
        employeeName: employeeName,
        managerEmail: managerEmail,
        managerName: managerName,
        employeeJobTitle: String(
          assignment['Job Title'] || ''
        ),
        departmentProject: String(
          assignment['Department / Project'] ||
            ''
        ),
        hireDate: formatDateIso_(hireDate),
        reviewType: review.reviewType,
        reviewDate: formatDateIso_(reviewDate),
        reviewPeriodStart: formatDateIso_(
          review.reviewPeriodStart
        ),
        reviewPeriodEnd: formatDateIso_(
          review.reviewPeriodEnd
        ),
        meetingDate: formatDateIso_(
          meetingDate
        ),
        managerDueDate: formatDateIso_(
          dueDate
        ),
        employeeDueDate: formatDateIso_(
          dueDate
        ),
        launchDate: formatDateIso_(
          launchDate
        ),
        daysUntilReview:
          v31DaysBetween_(today, reviewDate),
        status: retryCycle
          ? describeReviewLaunchStatus_(
              retryCycle
            )
          : 'Ready to create',
        launchComponents: retryCycle
          ? getReviewLaunchComponentSummary_(
              retryCycle
            )
          : null,
      });
    });
  });

  return candidates.sort(function (a, b) {
    return (
      new Date(a.reviewDate) -
      new Date(b.reviewDate)
    );
  });
}

function createAutomatedReviewCycle_(candidate) {
  const hr = getPrimaryAutomationHr_();
  const now = new Date();
  const cycleId = Utilities.getUuid();

  const row = {
    'Cycle ID': cycleId,
    'Created At': now,
    'Updated At': now,
    'Status': PR.CYCLE.OPEN,
    'Review Type': candidate.reviewType,
    'Review Period Start': parseDateInput_(
      candidate.reviewPeriodStart
    ),
    'Review Period End': parseDateInput_(
      candidate.reviewPeriodEnd
    ),
    'Review Meeting Date': parseDateInput_(
      candidate.meetingDate
    ),
    'Employee Name': candidate.employeeName,
    'Employee Email': candidate.employeeEmail,
    'Employee Job Title':
      candidate.employeeJobTitle,
    'Department / Project':
      candidate.departmentProject,
    'Hire Date': parseDateInput_(
      candidate.hireDate
    ),
    'Manager Name': candidate.managerName,
    'Manager Email': candidate.managerEmail,
    'HR Name': hr.name,
    'HR Email': hr.email,
    'Manager Review Status':
      PR.DOC.NOT_STARTED,
    'Manager Review JSON': JSON.stringify(
      emptyManagerReview_()
    ),
    'Self Evaluation Status':
      PR.DOC.NOT_STARTED,
    'Self Evaluation JSON': JSON.stringify(
      emptySelfEvaluation_()
    ),
    'Meeting Opened At': '',
    'Meeting Opened By': '',
    'Meeting JSON': JSON.stringify(
      emptyMeeting_()
    ),
    'Signatures Released At': '',
    'Signatures Released By': '',
    'MGR Manager Signature ID': '',
    'MGR Manager Signed At': '',
    'MGR Employee Signature ID': '',
    'MGR Employee Signed At': '',
    'MGR HR Signature ID': '',
    'MGR HR Signed At': '',
    'SELF Employee Signature ID': '',
    'SELF Employee Signed At': '',
    'SELF Manager Signature ID': '',
    'SELF Manager Signed At': '',
    'SELF HR Signature ID': '',
    'SELF HR Signed At': '',
    'Manager Review PDF ID': '',
    'Self Evaluation PDF ID': '',
    'Completed At': '',

    'Cycle Source': 'Automated',
    'Automation Key': candidate.automationKey,
    'Automation Notice Sent At': '',
    'Manager Due Date': parseDateInput_(
      candidate.managerDueDate
    ),
    'Employee Due Date': parseDateInput_(
      candidate.employeeDueDate
    ),
    'Calendar Status': '',
    'Calendar Event ID': '',
    'Calendar Created At': '',
    'Calendar Attempt ID': '',
    'Calendar Started At': '',
    'Calendar Configuration Status': '',
    'Calendar Configuration Attempt ID': '',
    'Calendar Configuration Started At': '',
    'Calendar Configuration Completed At': '',
    'Calendar Configuration Last Error': '',
    'Calendar Configuration Recovery Details JSON': '',
    'Manager Email Status': '',
    'Manager Email Sent At': '',
    'Manager Email Attempt ID': '',
    'Manager Email Started At': '',
    'Employee Email Status': '',
    'Employee Email Sent At': '',
    'Employee Email Attempt ID': '',
    'Employee Email Started At': '',
    'HR Email Status': '',
    'HR Email Sent At': '',
    'HR Email Attempt ID': '',
    'HR Email Started At': '',
    'Launch Completed At': '',
    'Last Launch Error': '',
    'Launch Attempt Count': 0,
    'Manager PDF Status': '',
    'Manager PDF Attempt ID': '',
    'Manager PDF Started At': '',
    'Manager PDF Completed At': '',
    'Manager PDF Last Error': '',
    'Manager PDF Recovery Details JSON': '',
    'Self PDF Status': '',
    'Self PDF Attempt ID': '',
    'Self PDF Started At': '',
    'Self PDF Completed At': '',
    'Self PDF Last Error': '',
    'Self PDF Recovery Details JSON': '',
    'Final Distribution Status': '',
    'Final Distribution Started At': '',
    'Final Distribution Sent At': '',
    'Final Distribution Last Error': '',
    'Final Distribution Recovery Details JSON': '',
    'Finalization Audit Status': '',
    'Finalization Audit Attempt ID': '',
    'Finalization Audit Started At': '',
    'Finalization Audit Completed At': '',
    'Finalization Audit Last Error': '',
    'Finalization Audit Event ID': '',
    'Finalization Last Error': '',
    'Finalization Attempt Count': 0,
    'Compensation Decision':
      V31.COMPENSATION.PENDING,
    'Compensation Decision Notes': '',
    'Compensation Decision At': '',
    'Compensation Decision By': '',
    'Compensation Status': V31_COMP.STATUS.PENDING,
    'Compensation Record ID': '',
    'CAF Final PDF ID': '',
  };

  appendObject_(
    PR.SHEETS.CYCLES,
    PR.CYCLE_HEADERS.concat(V31.CYCLE_HEADERS),
    row
  );

  audit_(
    cycleId,
    'Automated review cycle created',
    hr.email,
    '',
    PR.CYCLE.OPEN,
    JSON.stringify({
      automationKey:
        candidate.automationKey,
      reviewDate: candidate.reviewDate,
    })
  );

  return row;
}

/* ======================== CALENDAR + LAUNCH EMAILS ======================= */

function applyV31DefaultsToCycle_(
  cycle,
  source
) {
  const settings = getSettings_();
  let meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );

  if (
    meetingDate &&
    v31Boolean_(
      settings.SHIFT_WEEKEND_MEETINGS,
      true
    )
  ) {
    meetingDate =
      v31ShiftWeekendForward_(meetingDate);
    cycle['Review Meeting Date'] = meetingDate;
  }

  const dueDate = meetingDate
    ? v31ShiftWeekendBackward_(
        v31AddDays_(
          meetingDate,
          -Number(
            settings.FORM_DUE_DAYS_BEFORE_MEETING ||
              7
          )
        )
      )
    : null;

  cycle['Cycle Source'] =
    cycle['Cycle Source'] ||
    source ||
    'Manual';
  cycle['Automation Key'] =
    cycle['Automation Key'] || '';
  cycle['Automation Notice Sent At'] =
    cycle['Automation Notice Sent At'] || '';
  cycle['Manager Due Date'] =
    cycle['Manager Due Date'] ||
    dueDate ||
    '';
  cycle['Employee Due Date'] =
    cycle['Employee Due Date'] ||
    dueDate ||
    '';

  // Calendar status/attempt fields. A cycle that already has an event ID
  // from before this field existed defaults to Created rather than Pending.
  cycle['Calendar Event ID'] =
    cycle['Calendar Event ID'] || '';
  cycle['Calendar Status'] =
    cycle['Calendar Status'] ||
    (cycle['Calendar Event ID']
      ? V31.CALENDAR.CREATED
      : V31.CALENDAR.PENDING);
  cycle['Calendar Created At'] =
    cycle['Calendar Created At'] || '';
  cycle['Calendar Attempt ID'] =
    cycle['Calendar Attempt ID'] || '';
  cycle['Calendar Started At'] =
    cycle['Calendar Started At'] || '';
  cycle['Calendar Configuration Status'] =
    cycle['Calendar Configuration Status'] ||
    (cycle['Calendar Status'] === V31.CALENDAR.CONFIGURED
      ? V31.CALENDAR.CONFIGURED
      : cycle['Calendar Event ID']
      ? V31.CALENDAR.CREATED
      : V31.CALENDAR.PENDING);
  cycle['Calendar Configuration Attempt ID'] =
    cycle['Calendar Configuration Attempt ID'] || '';
  cycle['Calendar Configuration Started At'] =
    cycle['Calendar Configuration Started At'] || '';
  cycle['Calendar Configuration Completed At'] =
    cycle['Calendar Configuration Completed At'] || '';
  cycle['Calendar Configuration Last Error'] =
    cycle['Calendar Configuration Last Error'] || '';
  cycle['Calendar Configuration Recovery Details JSON'] =
    cycle['Calendar Configuration Recovery Details JSON'] || '';

  // Per-recipient email status/attempt fields. A cycle that already has a
  // Sent At timestamp from before status fields existed defaults to Sent.
  cycle['Manager Email Sent At'] =
    cycle['Manager Email Sent At'] || '';
  cycle['Manager Email Status'] =
    cycle['Manager Email Status'] ||
    (cycle['Manager Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Manager Email Attempt ID'] =
    cycle['Manager Email Attempt ID'] || '';
  cycle['Manager Email Started At'] =
    cycle['Manager Email Started At'] || '';

  cycle['Employee Email Sent At'] =
    cycle['Employee Email Sent At'] || '';
  cycle['Employee Email Status'] =
    cycle['Employee Email Status'] ||
    (cycle['Employee Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Employee Email Attempt ID'] =
    cycle['Employee Email Attempt ID'] || '';
  cycle['Employee Email Started At'] =
    cycle['Employee Email Started At'] || '';

  cycle['HR Email Sent At'] =
    cycle['HR Email Sent At'] || '';
  cycle['HR Email Status'] =
    cycle['HR Email Status'] ||
    (cycle['HR Email Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['HR Email Attempt ID'] =
    cycle['HR Email Attempt ID'] || '';
  cycle['HR Email Started At'] =
    cycle['HR Email Started At'] || '';

  cycle['Launch Completed At'] =
    cycle['Launch Completed At'] || '';
  cycle['Last Launch Error'] =
    cycle['Last Launch Error'] || '';
  cycle['Launch Attempt Count'] =
    cycle['Launch Attempt Count'] === '' ||
    cycle['Launch Attempt Count'] == null
      ? 0
      : Number(cycle['Launch Attempt Count'] || 0);

  cycle['Manager PDF Status'] =
    cycle['Manager PDF Status'] ||
    (cycle['Manager Review PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Manager PDF Attempt ID'] =
    cycle['Manager PDF Attempt ID'] || '';
  cycle['Manager PDF Started At'] =
    cycle['Manager PDF Started At'] || '';
  cycle['Manager PDF Completed At'] =
    cycle['Manager PDF Completed At'] ||
    (cycle['Manager Review PDF ID'] ? cycle['Updated At'] || '' : '');
  cycle['Manager PDF Last Error'] =
    cycle['Manager PDF Last Error'] || '';
  cycle['Manager PDF Recovery Details JSON'] =
    cycle['Manager PDF Recovery Details JSON'] || '';
  cycle['Self PDF Status'] =
    cycle['Self PDF Status'] ||
    (cycle['Self Evaluation PDF ID']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Self PDF Attempt ID'] =
    cycle['Self PDF Attempt ID'] || '';
  cycle['Self PDF Started At'] =
    cycle['Self PDF Started At'] || '';
  cycle['Self PDF Completed At'] =
    cycle['Self PDF Completed At'] ||
    (cycle['Self Evaluation PDF ID'] ? cycle['Updated At'] || '' : '');
  cycle['Self PDF Last Error'] =
    cycle['Self PDF Last Error'] || '';
  cycle['Self PDF Recovery Details JSON'] =
    cycle['Self PDF Recovery Details JSON'] || '';
  cycle['Final Distribution Status'] =
    cycle['Final Distribution Status'] ||
    (cycle['Final Distribution Sent At']
      ? V31.DELIVERY.SENT
      : V31.DELIVERY.PENDING);
  cycle['Final Distribution Attempt ID'] =
    cycle['Final Distribution Attempt ID'] || '';
  cycle['Final Distribution Started At'] =
    cycle['Final Distribution Started At'] || '';
  cycle['Final Distribution Sent At'] =
    cycle['Final Distribution Sent At'] || '';
  cycle['Final Distribution Last Error'] =
    cycle['Final Distribution Last Error'] || '';
  cycle['Final Distribution Recovery Details JSON'] =
    cycle['Final Distribution Recovery Details JSON'] || '';
  cycle['Finalization Audit Status'] =
    cycle['Finalization Audit Status'] || 'Pending';
  cycle['Finalization Audit Attempt ID'] =
    cycle['Finalization Audit Attempt ID'] || '';
  cycle['Finalization Audit Started At'] =
    cycle['Finalization Audit Started At'] || '';
  cycle['Finalization Audit Completed At'] =
    cycle['Finalization Audit Completed At'] || '';
  cycle['Finalization Audit Last Error'] =
    cycle['Finalization Audit Last Error'] || '';
  cycle['Finalization Audit Event ID'] =
    cycle['Finalization Audit Event ID'] || '';
  cycle['Finalization Last Error'] =
    cycle['Finalization Last Error'] || '';
  cycle['Finalization Attempt Count'] =
    cycle['Finalization Attempt Count'] === '' ||
    cycle['Finalization Attempt Count'] == null
      ? 0
      : Number(cycle['Finalization Attempt Count'] || 0);

  [PR.ROLE.MANAGER, PR.ROLE.EMPLOYEE, PR.ROLE.HR].forEach(
    function (role) {
      const fields = getSignatureClaimFields_(role);
      const oldStatus = String(cycle[fields.statusField] || '');
      cycle[fields.statusField] =
        oldStatus === V31.DELIVERY.SENT
          ? V31.SIGNATURE.SIGNED
          : oldStatus === V31.DELIVERY.SENDING
          ? V31.SIGNATURE.SIGNING
          : oldStatus || V31.SIGNATURE.PENDING;
      cycle[fields.attemptField] =
        cycle[fields.attemptField] || '';
      cycle[fields.startedField] =
        cycle[fields.startedField] || '';
      cycle[fields.errorField] =
        cycle[fields.errorField] || '';
      cycle[fields.artifactWarningField] =
        cycle[fields.artifactWarningField] || '';
      cycle[fields.auditWarningField] =
        cycle[fields.auditWarningField] || '';
      cycle[fields.fileField] =
        cycle[fields.fileField] || '';
      cycle[fields.signedAtField] =
        cycle[fields.signedAtField] || '';
      cycle[fields.winningAttemptField] =
        cycle[fields.winningAttemptField] || '';
      cycle[fields.recoveryFileField] =
        cycle[fields.recoveryFileField] || '';
      cycle[fields.recoveryAttemptField] =
        cycle[fields.recoveryAttemptField] || '';
      cycle[fields.recoveryDetailsField] =
        cycle[fields.recoveryDetailsField] || '';
      cycle[fields.recoveryRecordedAtField] =
        cycle[fields.recoveryRecordedAtField] || '';
      cycle[fields.reconciliationStatusField] =
        cycle[fields.reconciliationStatusField] ||
        V31.SIGNATURE_RECONCILIATION.PENDING;
      cycle[fields.reconciliationAttemptField] =
        cycle[fields.reconciliationAttemptField] || '';
      cycle[fields.reconciliationSelectedFileField] =
        cycle[fields.reconciliationSelectedFileField] || '';
      cycle[fields.reconciliationStartedField] =
        cycle[fields.reconciliationStartedField] || '';
      cycle[fields.reconciliationErrorField] =
        cycle[fields.reconciliationErrorField] || '';
      if (
        cycle[fields.statusField] === V31.SIGNATURE.SIGNED
      ) {
        cycle[fields.winningAttemptField] =
          cycle[fields.winningAttemptField] ||
          cycle[fields.attemptField] ||
          '';
        cycle[fields.attemptField] = '';
        cycle[fields.startedField] = '';
      } else if (
        cycle[fields.statusField] === V31.SIGNATURE.UNKNOWN
      ) {
        cycle[fields.recoveryAttemptField] =
          cycle[fields.recoveryAttemptField] ||
          cycle[fields.attemptField] ||
          '';
        cycle[fields.attemptField] = '';
        cycle[fields.startedField] = '';
      }
    }
  );

  ensureDeliveryFieldDefaults_(cycle, [
    [
      'Ready Notification Status',
      'Ready Notification Attempt ID',
      'Ready Notification Started At',
      'Ready Notification Sent At',
      'Ready Notification Last Error',
    ],
    [
      'Meeting Manager Email Status',
      'Meeting Manager Email Attempt ID',
      'Meeting Manager Email Started At',
      'Meeting Manager Email Sent At',
      'Meeting Manager Email Last Error',
    ],
    [
      'Meeting Employee Email Status',
      'Meeting Employee Email Attempt ID',
      'Meeting Employee Email Started At',
      'Meeting Employee Email Sent At',
      'Meeting Employee Email Last Error',
    ],
    [
      'Manager Signature Email Status',
      'Manager Signature Email Attempt ID',
      'Manager Signature Email Started At',
      'Manager Signature Email Sent At',
      'Manager Signature Email Last Error',
    ],
    [
      'Employee Signature Email Status',
      'Employee Signature Email Attempt ID',
      'Employee Signature Email Started At',
      'Employee Signature Email Sent At',
      'Employee Signature Email Last Error',
    ],
    [
      'HR Signature Email Status',
      'HR Signature Email Attempt ID',
      'HR Signature Email Started At',
      'HR Signature Email Sent At',
      'HR Signature Email Last Error',
    ],
  ]);

  cycle['Compensation Decision'] =
    normalizeCompensationDecision_(
      cycle['Compensation Decision']
    );
  cycle['Compensation Decision Notes'] =
    cycle['Compensation Decision Notes'] || '';
  cycle['Compensation Decision At'] =
    cycle['Compensation Decision At'] || '';
  cycle['Compensation Decision By'] =
    cycle['Compensation Decision By'] || '';
  cycle['Compensation Status'] =
    cycle['Compensation Status'] || V31_COMP.STATUS.PENDING;
  cycle['Compensation Record ID'] =
    cycle['Compensation Record ID'] || '';
  cycle['CAF Final PDF ID'] = cycle['CAF Final PDF ID'] || '';

  return backfillLegacyLaunchFields_(cycle);
}

/**
 * Initialize Pending/Sent delivery triplets used by signature claims
 * and workflow notification outbox fields.
 */
function ensureDeliveryFieldDefaults_(cycle, groups) {
  groups.forEach(function (group) {
    const statusField = group[0];
    const attemptField = group[1];
    const startedField = group[2];
    const sentAtField = group[3];
    const errorField = group[4];

    if (sentAtField) {
      cycle[sentAtField] = cycle[sentAtField] || '';
    }

    if (errorField) {
      cycle[errorField] = cycle[errorField] || '';
    }

    cycle[statusField] =
      cycle[statusField] ||
      (sentAtField && cycle[sentAtField]
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING);
    cycle[attemptField] = cycle[attemptField] || '';
    cycle[startedField] = cycle[startedField] || '';
  });
}

/**
 * Backfill per-step launch fields for cycles completed under the
 * pre-idempotent V3.1 package (single Automation Notice Sent At).
 */
function backfillLegacyLaunchFields_(cycle) {
  if (
    cycle['Automation Notice Sent At'] &&
    cycle['Calendar Event ID'] &&
    !cycle['Launch Completed At']
  ) {
    const sentAt =
      cycle['Automation Notice Sent At'];

    cycle['Calendar Status'] =
      cycle['Calendar Status'] ||
      V31.CALENDAR.CREATED;
    cycle['Manager Email Sent At'] =
      cycle['Manager Email Sent At'] || sentAt;
    cycle['Manager Email Status'] =
      V31.DELIVERY.SENT;
    cycle['Employee Email Sent At'] =
      cycle['Employee Email Sent At'] || sentAt;
    cycle['Employee Email Status'] =
      V31.DELIVERY.SENT;
    cycle['HR Email Sent At'] =
      cycle['HR Email Sent At'] || sentAt;
    cycle['HR Email Status'] =
      V31.DELIVERY.SENT;
    cycle['Launch Completed At'] = sentAt;
  } else if (
    cycle['Calendar Event ID'] &&
    !cycle['Calendar Status']
  ) {
    cycle['Calendar Status'] =
      V31.CALENDAR.CREATED;
  }

  return cycle;
}

/**
 * Complete if the explicit completion timestamp is set, if this is a
 * legacy cycle (single notice timestamp + event), or if every component
 * has independently reached a terminal "done" state.
 */
function isReviewLaunchComplete_(cycle) {
  if (!cycle) return false;

  if (cycle['Launch Completed At']) {
    return true;
  }

  // Legacy completed launches used one notice timestamp for all emails.
  if (
    cycle['Automation Notice Sent At'] &&
    cycle['Calendar Event ID']
  ) {
    return true;
  }

  const calendarDone =
    !!cycle['Calendar Event ID'] &&
    [V31.CALENDAR.CREATED, V31.CALENDAR.CONFIGURED].indexOf(
      String(cycle['Calendar Status'] || '')
    ) >= 0;

  const emailsDone = [
    cycle['Manager Email Status'],
    cycle['Employee Email Status'],
    cycle['HR Email Status'],
  ].every(function (status) {
    return String(status || '') === V31.DELIVERY.SENT;
  });

  return calendarDone && emailsDone;
}

/**
 * Looser than isReviewLaunchComplete_: only cares that the Calendar
 * event exists and each recipient email is Sent (or has a Sent At
 * timestamp for cycles migrated before status fields existed). Used to
 * decide when to stamp Launch Completed At.
 */
function isReviewLaunchComponentsComplete_(cycle) {
  if (!cycle) return false;

  const managerDone =
    String(cycle['Manager Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['Manager Email Sent At'];
  const employeeDone =
    String(cycle['Employee Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['Employee Email Sent At'];
  const hrDone =
    String(cycle['HR Email Status'] || '') ===
      V31.DELIVERY.SENT || !!cycle['HR Email Sent At'];

  return (
    !!cycle['Calendar Event ID'] &&
    managerDone &&
    employeeDone &&
    hrDone
  );
}

function isCalendarConfigWarning_(message) {
  return (
    String(message || '').indexOf(
      'Calendar tag/reminder configuration failed'
    ) === 0
  );
}

/**
 * Clear transient launch errors without wiping a persisted calendar
 * Created-but-not-Configured warning that HR still needs to see.
 */
function clearLastLaunchErrorUnlessCalendarConfig_(cycle) {
  if (!isCalendarConfigWarning_(cycle['Last Launch Error'])) {
    cycle['Last Launch Error'] = '';
  }
}

/**
 * True when the shared calendar event exists but tag/reminder
 * configuration has not reached Configured. Launch can still complete.
 * Warn when configuration failed, or when launch finished while still
 * at Created (tags/reminders never confirmed).
 */
function hasCalendarConfigWarning_(cycle) {
  if (!cycle || !cycle['Calendar Event ID']) {
    return false;
  }

  const calendarStatus = String(cycle['Calendar Status'] || '');

  if (calendarStatus === V31.CALENDAR.CONFIGURED) {
    return false;
  }

  if (isCalendarConfigWarning_(cycle['Last Launch Error'])) {
    return true;
  }

  return (
    !!cycle['Launch Completed At'] &&
    calendarStatus === V31.CALENDAR.CREATED
  );
}

function getReviewLaunchComponentSummary_(cycle) {
  const calendarStatus = String(
    cycle['Calendar Status'] ||
      (cycle['Calendar Event ID']
        ? V31.CALENDAR.CREATED
        : V31.CALENDAR.PENDING)
  );
  const managerStatus = String(
    cycle['Manager Email Status'] ||
      (cycle['Manager Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const employeeStatus = String(
    cycle['Employee Email Status'] ||
      (cycle['Employee Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const hrStatus = String(
    cycle['HR Email Status'] ||
      (cycle['HR Email Sent At']
        ? V31.DELIVERY.SENT
        : V31.DELIVERY.PENDING)
  );
  const calendarConfigWarning = hasCalendarConfigWarning_(cycle);
  const calendarConfigurationStatus = String(
    cycle['Calendar Configuration Status'] ||
      (calendarStatus === V31.CALENDAR.CONFIGURED
        ? V31.CALENDAR.CONFIGURED
        : cycle['Calendar Event ID']
        ? V31.CALENDAR.CREATED
        : V31.CALENDAR.PENDING)
  );

  return {
    calendar: !!cycle['Calendar Event ID'],
    calendarStatus: calendarStatus,
    calendarUnknown: calendarStatus === V31.CALENDAR.UNKNOWN,
    calendarConfigured:
      calendarConfigurationStatus === V31.CALENDAR.CONFIGURED,
    calendarConfigurationStatus: calendarConfigurationStatus,
    calendarConfigurationUnknown:
      calendarConfigurationStatus === V31.CALENDAR.UNKNOWN,
    calendarConfigurationLastError: String(
      cycle['Calendar Configuration Last Error'] || ''
    ),
    calendarConfigWarning: calendarConfigWarning,
    managerEmail: managerStatus === V31.DELIVERY.SENT,
    managerEmailStatus: managerStatus,
    managerEmailUnknown: managerStatus === V31.DELIVERY.UNKNOWN,
    employeeEmail: employeeStatus === V31.DELIVERY.SENT,
    employeeEmailStatus: employeeStatus,
    employeeEmailUnknown: employeeStatus === V31.DELIVERY.UNKNOWN,
    hrEmail: hrStatus === V31.DELIVERY.SENT,
    hrEmailStatus: hrStatus,
    hrEmailUnknown: hrStatus === V31.DELIVERY.UNKNOWN,
    hasUnknown:
      calendarStatus === V31.CALENDAR.UNKNOWN ||
      managerStatus === V31.DELIVERY.UNKNOWN ||
      employeeStatus === V31.DELIVERY.UNKNOWN ||
      hrStatus === V31.DELIVERY.UNKNOWN,
    complete: isReviewLaunchComplete_(cycle),
    lastError: String(
      cycle['Last Launch Error'] || ''
    ),
    attemptCount: Number(
      cycle['Launch Attempt Count'] || 0
    ),
  };
}

function describeReviewLaunchStatus_(cycle) {
  if (isReviewLaunchComplete_(cycle)) {
    return 'Launch complete';
  }

  const summary = getReviewLaunchComponentSummary_(cycle);

  const describeComponent = function (
    label,
    status,
    doneFlag
  ) {
    if (
      status === V31.DELIVERY.UNKNOWN ||
      status === V31.CALENDAR.UNKNOWN
    ) {
      return label + ' delivery unknown';
    }

    if (
      status === V31.DELIVERY.SENDING ||
      status === V31.CALENDAR.CREATING ||
      status === V31.CALENDAR.CONFIGURING
    ) {
      return label + ' in progress';
    }

    if (
      status === V31.DELIVERY.FAILED ||
      status === V31.CALENDAR.FAILED
    ) {
      return label + ' failed';
    }

    return doneFlag ? label + ' done' : label + ' pending';
  };

  const parts = [
    describeComponent(
      'Calendar',
      summary.calendarStatus,
      summary.calendar
    ),
    describeComponent(
      'Manager email',
      summary.managerEmailStatus,
      summary.managerEmail
    ),
    describeComponent(
      'Employee email',
      summary.employeeEmailStatus,
      summary.employeeEmail
    ),
    describeComponent(
      'HR email',
      summary.hrEmailStatus,
      summary.hrEmail
    ),
  ];

  const error = String(
    cycle['Last Launch Error'] || ''
  ).trim();

  return (
    'Launch needs retry — ' +
    parts.join('; ') +
    (error ? ' (' + error + ')' : '')
  );
}

/**
 * Decide whether automation should skip, create, or retry a cycle for
 * a candidate review window.
 *
 * - Complete period match → skip (no duplicate launch)
 * - Incomplete automation-key match → retry that cycle
 * - Incomplete same-employee/period cycle (manual or orphaned) → retry it
 * - Otherwise → create
 */
function resolveAutomationLaunchTarget_(
  existingByKey,
  periodCycles
) {
  const period = periodCycles || [];

  if (
    existingByKey &&
    isReviewLaunchComplete_(existingByKey)
  ) {
    return { skip: true, retryCycle: null };
  }

  const completePeriod = period.find(function (
    cycle
  ) {
    return isReviewLaunchComplete_(cycle);
  });

  if (completePeriod) {
    return { skip: true, retryCycle: null };
  }

  if (
    existingByKey &&
    !isReviewLaunchComplete_(existingByKey)
  ) {
    return {
      skip: false,
      retryCycle: existingByKey,
    };
  }

  const incompletePeriod = period.find(function (
    cycle
  ) {
    return !isReviewLaunchComplete_(cycle);
  });

  return {
    skip: false,
    retryCycle: incompletePeriod || null,
  };
}

/**
 * Persist launch progress immediately and flush so concurrent readers
 * see component timestamps before the next external side effect.
 */
function persistLaunchCycle_(rowNumber, cycle) {
  writeCycle_(rowNumber, cycle);
  SpreadsheetApp.flush();
}

/**
 * Pure decision helper shared by the Calendar and email launch
 * components. No sheet or lock access — safe to unit test directly.
 *
 * - already done              -> skip (sent)
 * - in the matching "in
 *   progress" status and NOT
 *   stale                     -> skip (in-progress); never double-send
 * - in progress and stale     -> mark-unknown; caller must NOT auto-resend
 * - Delivery Unknown          -> skip (unknown) unless allowUnknownResend
 * - Pending or Failed         -> claim (safe to send)
 */
function decideLaunchComponentAction_(
  status,
  alreadyDone,
  startedAt,
  inProgressStatus,
  allowUnknownResend
) {
  if (alreadyDone) {
    return { action: 'skip', reason: 'sent' };
  }

  if (status === V31.DELIVERY.SUPERSEDED) {
    return { action: 'skip', reason: 'superseded' };
  }

  if (status === V31.DELIVERY.SENT) {
    return { action: 'skip', reason: 'sent' };
  }

  if (status === inProgressStatus) {
    if (!isDeliveryClaimStale_(startedAt)) {
      return { action: 'skip', reason: 'in-progress' };
    }

    return { action: 'mark-unknown' };
  }

  if (status === V31.DELIVERY.UNKNOWN) {
    return allowUnknownResend
      ? { action: 'claim' }
      : { action: 'skip', reason: 'unknown' };
  }

  // Pending or Failed may be claimed automatically.
  return { action: 'claim' };
}

function getLaunchEmailComponents_() {
  return [
    {
      key: 'manager',
      statusField: 'Manager Email Status',
      sentAtField: 'Manager Email Sent At',
      attemptField: 'Manager Email Attempt ID',
      startedField: 'Manager Email Started At',
      label: 'Manager email',
      send: sendV31ManagerLaunchEmail_,
    },
    {
      key: 'employee',
      statusField: 'Employee Email Status',
      sentAtField: 'Employee Email Sent At',
      attemptField: 'Employee Email Attempt ID',
      startedField: 'Employee Email Started At',
      label: 'Employee email',
      send: sendV31EmployeeLaunchEmail_,
    },
    {
      key: 'hr',
      statusField: 'HR Email Status',
      sentAtField: 'HR Email Sent At',
      attemptField: 'HR Email Attempt ID',
      startedField: 'HR Email Started At',
      label: 'HR email',
      send: sendV31HrLaunchEmail_,
    },
  ];
}

function getLaunchEmailComponentByKey_(key) {
  const components = getLaunchEmailComponents_();

  for (let i = 0; i < components.length; i++) {
    if (components[i].key === key) {
      return components[i];
    }
  }

  throw new Error('Unsupported email component: ' + key);
}

/**
 * Short lock: claim a Pending/Failed (or HR-approved Unknown) email
 * component by stamping Sending + a fresh attempt ID, then release.
 * Never sends mail while holding the lock.
 */
function claimLaunchEmailStep_(
  cycleId,
  component,
  allowUnknownResend
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const decision = decideLaunchComponentAction_(
      status,
      status === V31.DELIVERY.SENT ||
        !!cycle[component.sentAtField],
      cycle[component.startedField],
      V31.DELIVERY.SENDING,
      allowUnknownResend
    );

    if (decision.action === 'skip') {
      return {
        action: 'skip',
        reason: decision.reason,
        cycle: cycle,
      };
    }

    if (decision.action === 'mark-unknown') {
      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Last Launch Error'] =
        component.label +
        ' claim went stale before completion was confirmed.';
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return { action: 'skip', reason: 'unknown', cycle: cycle };
    }

    const attemptId = Utilities.getUuid();

    cycle[component.statusField] = V31.DELIVERY.SENDING;
    cycle[component.attemptField] = attemptId;
    cycle[component.startedField] = new Date();
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return {
      action: 'claim',
      attemptId: attemptId,
      cycle: cycle,
      rowNumber: location.rowNumber,
    };
  });
}

/**
 * Short lock: mark Sent/Unknown only if the attempt ID we claimed is
 * still current — a concurrent claim means someone else already moved
 * this component forward, so we must not overwrite their result.
 */
function commitLaunchEmailStep_(
  cycleId,
  component,
  attemptId,
  error
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (
      String(cycle[component.attemptField] || '') !==
      String(attemptId)
    ) {
      return cycle;
    }

    if (error) {
      // Ambiguous: MailApp may have accepted the message before the
      // error surfaced. Require explicit HR reconciliation.
      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      cycle['Last Launch Error'] = String(
        error.message || error
      );
    } else {
      cycle[component.statusField] = V31.DELIVERY.SENT;
      cycle[component.sentAtField] = new Date();
      // Do not clear a calendar-config warning when a later email succeeds.
      clearLastLaunchErrorUnlessCalendarConfig_(cycle);
    }

    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Claim -> send (outside any lock) -> commit for a single email
 * component. Returns without throwing; callers inspect result.action.
 */
function runLaunchEmailStep_(
  cycleId,
  component,
  allowUnknownResend
) {
  const claim = claimLaunchEmailStep_(
    cycleId,
    component,
    allowUnknownResend
  );

  if (claim.action !== 'claim') {
    return claim;
  }

  let error = null;

  try {
    component.send(claim.cycle);
  } catch (err) {
    error = err;
  }

  const cycle = commitLaunchEmailStep_(
    cycleId,
    component,
    claim.attemptId,
    error
  );

  if (error) {
    return {
      action: 'error',
      reason: component.key,
      error: error,
      cycle: cycle,
    };
  }

  return { action: 'sent', cycle: cycle };
}

/**
 * Short lock: claim the Calendar create step the same way email
 * components are claimed. Skips entirely once an event ID exists.
 */
function claimCalendarCreateStep_(cycleId, allowUnknownResend) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const status = String(
      cycle['Calendar Status'] || V31.CALENDAR.PENDING
    );
    const decision = decideLaunchComponentAction_(
      status,
      !!cycle['Calendar Event ID'],
      cycle['Calendar Started At'],
      V31.CALENDAR.CREATING,
      allowUnknownResend
    );

    if (decision.action === 'skip') {
      return {
        action: 'skip',
        reason: decision.reason,
        cycle: cycle,
      };
    }

    if (decision.action === 'mark-unknown') {
      cycle['Calendar Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Last Launch Error'] =
        'Calendar claim went stale before an event ID was confirmed.';
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return { action: 'skip', reason: 'unknown', cycle: cycle };
    }

    const attemptId = Utilities.getUuid();

    cycle['Calendar Status'] = V31.CALENDAR.CREATING;
    cycle['Calendar Attempt ID'] = attemptId;
    cycle['Calendar Started At'] = new Date();
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return {
      action: 'create',
      attemptId: attemptId,
      cycle: cycle,
      rowNumber: location.rowNumber,
    };
  });
}

/**
 * Short lock: persist the recovered/created event ID immediately,
 * before any tag/reminder configuration, and only if our attempt ID
 * is still current.
 */
function commitCalendarCreatedStep_(
  cycleId,
  attemptId,
  event,
  error
) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (
      String(cycle['Calendar Attempt ID'] || '') !==
      String(attemptId)
    ) {
      return cycle;
    }

    if (error) {
      // Ambiguous: the event may have been created without the ID
      // reaching us. Recovery-by-marker on the next attempt will find
      // it; require explicit HR reconciliation in the meantime.
      cycle['Calendar Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Last Launch Error'] = String(
        error.message || error
      );
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      return cycle;
    }

    cycle['Calendar Event ID'] = event.getId();
    cycle['Calendar Created At'] = new Date();
    cycle['Calendar Status'] = V31.CALENDAR.CREATED;
    cycle['Last Launch Error'] = '';
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Best-effort setTag()/reminders pass. Created is already sufficient
 * for launch completion (the event exists and is discoverable), but
 * configuration failure is persisted as a Calendar warning until a
 * later retry reaches Configured. The warning is not cleared by
 * successful email steps.
 */
function configureCalendarLaunchStepBestEffortLegacy_(cycleId, event) {
  if (!event) return;

  try {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        cycle['Calendar Status'] === V31.CALENDAR.CREATED ||
        cycle['Calendar Status'] === V31.CALENDAR.CONFIGURING
      ) {
        cycle['Calendar Status'] = V31.CALENDAR.CONFIGURING;
        cycle['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, cycle);
      }
    });

    const settings = getSettings_();
    const cycle = findCycle_(cycleId).object;

    configureReviewCalendarEvent_(event, cycle, settings);

    withLock_(function () {
      const location = findCycle_(cycleId);
      const fresh = location.object;

      if (
        fresh['Calendar Status'] === V31.CALENDAR.CONFIGURING ||
        fresh['Calendar Status'] === V31.CALENDAR.CREATED
      ) {
        fresh['Calendar Status'] = V31.CALENDAR.CONFIGURED;
        // Clear only a prior calendar-config warning, not unrelated errors.
        if (
          String(fresh['Last Launch Error'] || '').indexOf(
            'Calendar tag/reminder configuration failed'
          ) === 0
        ) {
          fresh['Last Launch Error'] = '';
        }
        fresh['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, fresh);
      }
    });
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (cycle['Calendar Status'] === V31.CALENDAR.CONFIGURING) {
        // Leave Created so launch can still complete, but keep the
        // warning visible until configuration succeeds on retry.
        cycle['Calendar Status'] = V31.CALENDAR.CREATED;
      }

      cycle['Last Launch Error'] =
        'Calendar tag/reminder configuration failed: ' +
        String(error.message || error);
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);
    });
  }
}

/**
 * Claim -> create (outside any lock) -> commit ID -> best-effort
 * configure. Also resumes configuration for a Created event left
 * unconfigured by a prior crash.
 */
function runCalendarLaunchStep_(cycleId, allowUnknownResend) {
  const claim = claimCalendarCreateStep_(
    cycleId,
    allowUnknownResend
  );

  if (claim.action === 'create') {
    let event = null;
    let error = null;

    try {
      event = createReviewCalendarEvent_(claim.cycle);
    } catch (err) {
      error = err;
    }

    const committed = commitCalendarCreatedStep_(
      cycleId,
      claim.attemptId,
      event,
      error
    );

    if (
      !error &&
      (!event ||
        String(committed['Calendar Event ID'] || '') !==
          String(event.getId()))
    ) {
      return {
        action: 'error',
        reason: 'calendar-commit-unknown',
        error: new Error(
          'Calendar event exists but its ID could not be durably committed.'
        ),
        cycle: committed,
      };
    }

    if (error) {
      return {
        action: 'error',
        reason: 'calendar',
        error: error,
        cycle: committed,
      };
    }

    configureCalendarLaunchStepBestEffort_(cycleId, event);

    return { action: 'created', cycle: findCycle_(cycleId).object };
  }

  if (
    claim.cycle['Calendar Event ID'] &&
    claim.cycle['Calendar Status'] === V31.CALENDAR.CREATED
  ) {
    const resolved = resolveReviewCalendarEvent_(
      claim.cycle,
      false
    );

    if (resolved.event) {
      if (
        resolved.recoveredId &&
        resolved.recoveredId !==
          String(claim.cycle['Calendar Event ID'] || '')
      ) {
        withLock_(function () {
          const location = findCycle_(cycleId);
          const fresh = location.object;
          fresh['Calendar Event ID'] = resolved.recoveredId;
          fresh['Updated At'] = new Date();
          persistLaunchCycle_(location.rowNumber, fresh);
        });
      }

      configureCalendarLaunchStepBestEffort_(
        cycleId,
        resolved.event
      );
    } else if (resolved.error) {
      withLock_(function () {
        const location = findCycle_(cycleId);
        const fresh = location.object;
        fresh['Last Launch Error'] =
          'Calendar event missing or inaccessible: ' +
          resolved.error;
        fresh['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, fresh);
      });
    }
  }

  return {
    action: claim.action,
    reason: claim.reason,
    cycle: claim.cycle,
  };
}

/**
 * Short lock: stamp Launch Completed At once every component has
 * independently reached Sent/Created. Safe to call repeatedly.
 */
function maybeCompleteReviewLaunch_(cycleId) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;

    if (cycle['Launch Completed At']) {
      return { completedNow: false, cycle: cycle };
    }

    if (!isReviewLaunchComponentsComplete_(cycle)) {
      return { completedNow: false, cycle: cycle };
    }

    const completedAt = new Date();

    cycle['Launch Completed At'] = completedAt;
    cycle['Automation Notice Sent At'] =
      cycle['Automation Notice Sent At'] || completedAt;
    // Launch may complete at Created; keep a calendar-config warning until
    // a later configure retry reaches Configured.
    clearLastLaunchErrorUnlessCalendarConfig_(cycle);
    cycle['Updated At'] = completedAt;
    persistLaunchCycle_(location.rowNumber, cycle);

    return { completedNow: true, cycle: cycle };
  });
}

/**
 * Short lock: apply defaults, bump the attempt counter, and persist —
 * released before any Calendar/Mail call.
 */
function claimLaunchAttempt_(cycleId, source) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      source
    );

    cycle['Launch Attempt Count'] =
      Number(cycle['Launch Attempt Count'] || 0) + 1;
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return cycle;
  });
}

/**
 * Core launch orchestration. Every component (Calendar, then Manager,
 * Employee, HR email) is claimed, performed, and committed through its
 * own short lock — see claimLaunchEmailStep_ / claimCalendarCreateStep_.
 * One component failing does not block the others from making
 * progress; callers throw on the first recorded error after every
 * component has had a chance to run.
 *
 * options.allowUnknownResend may set { calendar, manager, employee, hr }
 * to true to let a specific Delivery Unknown component be claimed again
 * (HR-authorized reconciliation only).
 */
function orchestrateReviewLaunchSteps_(cycleId, options) {
  const opts = options || {};
  const allow = opts.allowUnknownResend || {};
  const actions = [];
  const errors = [];

  const calendarResult = runCalendarLaunchStep_(
    cycleId,
    !!allow.calendar
  );

  if (calendarResult.action === 'created') {
    actions.push('calendar');
  } else if (calendarResult.action === 'error') {
    errors.push(calendarResult);
  }

  getLaunchEmailComponents_().forEach(function (component) {
    const result = runLaunchEmailStep_(
      cycleId,
      component,
      !!allow[component.key]
    );

    if (result.action === 'sent') {
      actions.push(component.key);
    } else if (result.action === 'error') {
      errors.push(result);
    }
  });

  const completion = maybeCompleteReviewLaunch_(cycleId);

  if (completion.completedNow) {
    actions.push('complete');
  }

  return {
    cycle: completion.cycle,
    actions: actions,
    errors: errors,
  };
}

/**
 * Create the Calendar event and send launch emails with independently
 * persisted completion for each external action.
 *
 * Callers (createReviewCycle, runReviewAutomation, retryReviewLaunch)
 * must NOT already hold LockService.getScriptLock() — every external
 * action here is protected by its own short claim/commit lock instead
 * of one long-held lock, and script locks are not re-entrant.
 */
function launchReviewCycleCommunications_(
  cycle,
  automated,
  options
) {
  const cycleId = cycle['Cycle ID'];
  const location = findCycle_(cycleId);
  const stored = applyV31DefaultsToCycle_(
    location.object,
    automated ? 'Automated' : 'Manual'
  );

  if (isReviewLaunchComplete_(stored)) {
    const needsLegacyPersist =
      !location.object['Launch Completed At'] &&
      !!stored['Launch Completed At'];

    if (needsLegacyPersist) {
      stored['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, stored);
    }

    return stored;
  }

  claimLaunchAttempt_(
    cycleId,
    automated ? 'Automated' : 'Manual'
  );

  const result = orchestrateReviewLaunchSteps_(
    cycleId,
    options
  );

  if (result.errors.length) {
    const primary = result.errors[0];

    throw primary.error instanceof Error
      ? primary.error
      : new Error(
          String(primary.error || 'Review launch failed.')
        );
  }

  return result.cycle;
}

/**
 * HR-only: resume an incomplete launch without clearing completed
 * component timestamps. Distinct from intentional resend. Does not
 * wrap the launch in an outer lock — launchReviewCycleCommunications_
 * already claims each component under its own short lock.
 */
function retryReviewLaunch(cycleId, options) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry an incomplete review launch.'
    );
  }

  const location = findCycle_(cycleId);
  const cycle = applyV31DefaultsToCycle_(
    location.object,
    location.object['Cycle Source'] || 'Manual'
  );

  if (isReviewLaunchComplete_(cycle)) {
    return {
      ok: true,
      alreadyComplete: true,
      message:
        'Launch is already complete. Use Resend Instructions if recipients need the emails again.',
      launchComponents:
        getReviewLaunchComponentSummary_(cycle),
    };
  }

  const before = getReviewLaunchComponentSummary_(cycle);
  const launched = launchReviewCycleCommunications_(
    cycle,
    String(cycle['Cycle Source'] || '') === 'Automated',
    options || {}
  );
  const after = getReviewLaunchComponentSummary_(launched);

  audit_(
    cycleId,
    'Review launch retried',
    email,
    String(cycle['Status']),
    String(launched['Status'] || cycle['Status']),
    JSON.stringify({
      before: before,
      after: after,
      attemptCount: Number(
        launched['Launch Attempt Count'] || 0
      ),
    })
  );

  logReviewAutomation_({
    mode: String(
      getSettings_().AUTOMATION_MODE || 'Preview'
    ),
    action: 'Launch retried (HR)',
    employeeEmail: launched['Employee Email'],
    employeeName: launched['Employee Name'],
    reviewType: launched['Review Type'],
    reviewDate: formatDate_(
      launched['Review Meeting Date']
    ),
    cycleId: cycleId,
    result: isReviewLaunchComplete_(launched)
      ? 'Success'
      : 'Partial',
    details: describeReviewLaunchStatus_(launched),
  });

  return {
    ok: true,
    alreadyComplete: false,
    message: isReviewLaunchComplete_(launched)
      ? 'Launch completed. Calendar and role emails are in place.'
      : 'Launch still incomplete: ' +
        describeReviewLaunchStatus_(launched),
    launchComponents: after,
  };
}

/**
 * Resolve a cycle's Calendar event by persisted ID, then by marker /
 * tag recovery. Does not create a replacement event.
 */
function resolveReviewCalendarEvent_(cycle, persistLookupError) {
  const settings = getSettings_();
  const calendar = openReviewCalendar_(settings);
  const cycleId = String(cycle['Cycle ID'] || '');
  const knownId = String(cycle['Calendar Event ID'] || '');
  let lookupError = '';

  if (knownId) {
    try {
      const known = calendar.getEventById(knownId);

      if (known) {
        return {
          event: known,
          recoveredId: '',
          error: '',
          calendar: calendar,
        };
      }

      lookupError =
        'getEventById returned no event for the persisted ID.';
    } catch (error) {
      lookupError = String(error.message || error);
    }
  }

  const meetingDate = v31Date_(cycle['Review Meeting Date']);
  const recovered = findExistingReviewCalendarEvent_(
    calendar,
    cycleId,
    meetingDate,
    ''
  );

  if (recovered) {
    return {
      event: recovered,
      recoveredId: recovered.getId(),
      error: '',
      calendar: calendar,
    };
  }

  const message =
    lookupError ||
    (knownId
      ? 'Persisted calendar event is missing and marker recovery found nothing.'
      : 'No calendar event ID is stored and marker recovery found nothing.');

  if (persistLookupError) {
    // Caller decides whether to write; return the message either way.
  }

  return {
    event: null,
    recoveredId: '',
    error: message,
    calendar: calendar,
  };
}

/**
 * HR-only: configure tags/reminders on the existing launch calendar
 * event. Never sends launch emails and never creates a second event.
 */
function retryReviewCalendarConfiguration(cycleId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may retry calendar configuration.'
    );
  }

  const location = findCycle_(cycleId);
  let cycle = applyV31DefaultsToCycle_(
    location.object,
    location.object['Cycle Source'] || 'Manual'
  );

  const resolved = resolveReviewCalendarEvent_(cycle, true);

  if (!resolved.event) {
    withLock_(function () {
      const freshLocation = findCycle_(cycleId);
      const fresh = freshLocation.object;
      fresh['Last Launch Error'] =
        'Calendar event missing or inaccessible: ' +
        resolved.error;
      fresh['Updated At'] = new Date();
      persistLaunchCycle_(freshLocation.rowNumber, fresh);
    });

    return {
      ok: false,
      missingEvent: true,
      message:
        'Event missing or inaccessible. Use Rebuild Calendar Event if HR confirms the original event is gone.',
      lastLaunchError:
        'Calendar event missing or inaccessible: ' +
        resolved.error,
      launchComponents: getReviewLaunchComponentSummary_(
        findCycle_(cycleId).object
      ),
    };
  }

  if (resolved.recoveredId) {
    withLock_(function () {
      const freshLocation = findCycle_(cycleId);
      const fresh = freshLocation.object;
      fresh['Calendar Event ID'] = resolved.recoveredId;
      fresh['Calendar Status'] =
        fresh['Calendar Status'] === V31.CALENDAR.CONFIGURED
          ? V31.CALENDAR.CONFIGURED
          : V31.CALENDAR.CREATED;
      fresh['Updated At'] = new Date();
      persistLaunchCycle_(freshLocation.rowNumber, fresh);
    });
  }

  configureCalendarLaunchStepBestEffort_(
    cycleId,
    resolved.event,
    true
  );

  cycle = findCycle_(cycleId).object;
  const configured =
    String(cycle['Calendar Status']) === V31.CALENDAR.CONFIGURED;

  audit_(
    cycleId,
    'Calendar configuration retried',
    email,
    V31.CALENDAR.CREATED,
    String(cycle['Calendar Status'] || ''),
    JSON.stringify({
      recoveredId: resolved.recoveredId || '',
      configured: configured,
    })
  );

  return {
    ok: configured,
    missingEvent: false,
    message: configured
      ? 'Calendar tags and reminders are configured.'
      : 'Calendar configuration still needs attention: ' +
        String(cycle['Last Launch Error'] || 'unknown error'),
    launchComponents: getReviewLaunchComponentSummary_(cycle),
  };
}

/**
 * HR-only: explicitly rebuild a missing calendar event. Does not send
 * launch emails. Use only after Retry Calendar Config reports missing.
 */
function rebuildReviewCalendarEvent(cycleId) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may rebuild a review calendar event.'
    );
  }

  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    const status = String(
      cycle['Calendar Status'] || V31.CALENDAR.PENDING
    );

    if (status === V31.CALENDAR.CREATING) {
      if (!isDeliveryClaimStale_(cycle['Calendar Started At'])) {
        throw new Error(
          'Calendar rebuild is already in progress.'
        );
      }

      cycle['Calendar Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Last Launch Error'] =
        'Calendar rebuild claim went stale before an event ID was persisted.';
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);

      throw new Error(
        'Calendar rebuild is Delivery Unknown. Retry after confirming whether an event already exists.'
      );
    }

    if (
      status === V31.CALENDAR.UNKNOWN &&
      !isDeliveryClaimStale_(cycle['Calendar Started At'])
    ) {
      throw new Error(
        'Calendar rebuild is Delivery Unknown. Confirm no event exists, then retry.'
      );
    }

    const attemptId = Utilities.getUuid();

    cycle['Calendar Status'] = V31.CALENDAR.CREATING;
    cycle['Calendar Attempt ID'] = attemptId;
    cycle['Calendar Started At'] = new Date();
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);

    return { attemptId: attemptId, cycle: cycle };
  });

  // Re-run marker recovery after owning the claim so a concurrent
  // create is visible before we create another event.
  const resolved = resolveReviewCalendarEvent_(
    findCycle_(cycleId).object,
    false
  );

  if (resolved.event) {
    const eventId = resolved.event.getId();

    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle['Calendar Attempt ID'] || '') !==
        String(claim.attemptId)
      ) {
        return;
      }

      cycle['Calendar Event ID'] = eventId;
      cycle['Calendar Status'] = V31.CALENDAR.CREATED;
      cycle['Calendar Created At'] =
        cycle['Calendar Created At'] || new Date();
      clearLastLaunchErrorUnlessCalendarConfig_(cycle);
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);
    });

    configureCalendarLaunchStepBestEffort_(
      cycleId,
      resolved.event,
      true
    );

    const after = findCycle_(cycleId).object;
    const configured =
      String(after['Calendar Status']) ===
      V31.CALENDAR.CONFIGURED;

    return {
      ok: configured,
      rebuilt: false,
      configured: configured,
      warning: !configured,
      message: configured
        ? 'An existing event was recovered and configured.'
        : 'An existing event was recovered, but configuration still needs attention.',
      launchComponents: getReviewLaunchComponentSummary_(after),
    };
  }

  let event = null;
  let error = null;

  try {
    event = createReviewCalendarEvent_(
      findCycle_(cycleId).object
    );
  } catch (err) {
    error = err;
  }

  const committed = commitCalendarCreatedStep_(
    cycleId,
    claim.attemptId,
    event,
    error
  );

  if (error) {
    throw new Error(
      'Calendar rebuild failed: ' + String(error.message || error)
    );
  }
  if (
    !event ||
    String(committed['Calendar Event ID'] || '') !== String(event.getId())
  ) {
    throw new Error(
      'Calendar rebuild is Delivery Unknown because the event ID commit could not be verified.'
    );
  }

  configureCalendarLaunchStepBestEffort_(cycleId, event, true);

  const after = findCycle_(cycleId).object;
  const configured =
    String(after['Calendar Status']) === V31.CALENDAR.CONFIGURED;

  auditIdempotent_(
    cycleId,
    'Calendar event rebuilt',
    email,
    '',
    String(after['Calendar Event ID'] || ''),
    JSON.stringify({ configured: configured }),
    'CALENDAR_REBUILT:' +
      String(cycleId) +
      ':' +
      String(claim.attemptId)
  );

  return {
    ok: configured,
    rebuilt: true,
    configured: configured,
    warning: !configured,
    message: configured
      ? 'A replacement calendar event was created and configured.'
      : 'A replacement calendar event was created, but configuration still needs attention.',
    launchComponents: getReviewLaunchComponentSummary_(after),
  };
}

/**
 * Claim -> send outside lock -> commit for a durable workflow
 * notification component (ready / meeting / signature request).
 */
function deliverWorkflowNotification_(
  cycleId,
  component,
  sendFn,
  options
) {
  const opts = options || {};
  const allowUnknownResend = !!opts.allowUnknownResend;
  const skipEligibility = !!opts.skipEligibility;
  const expectedRecipients = Array.isArray(opts.expectedRecipients)
    ? opts.expectedRecipients.map(normalizeEmail_)
    : null;
  const configuredStaleMinutes = Number(
    getSettings_().OUTBOX_STALE_MINUTES || 15
  );

  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );

    if (
      !skipEligibility &&
      !isWorkflowNotificationEligible_(cycle, component.key)
    ) {
      return {
        action: 'skip',
        reason: 'ineligible',
        cycle: cycle,
      };
    }

    if (
      expectedRecipients &&
      JSON.stringify(
        getWorkflowNotificationRecipients_(cycle, component.key)
      ) !== JSON.stringify(expectedRecipients)
    ) {
      throw new Error(
        component.label +
          ' recipients changed after confirmation. Refresh and confirm again.'
      );
    }

    const componentStatus = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const decision =
      componentStatus === V31.DELIVERY.SENDING &&
      !cycle[component.sentAtField]
        ? isWorkflowOutboxClaimStale_(
            cycle[component.startedField],
            configuredStaleMinutes
          )
          ? { action: 'mark-unknown' }
          : { action: 'skip', reason: 'in-progress' }
        : decideLaunchComponentAction_(
            componentStatus,
            !!cycle[component.sentAtField],
            cycle[component.startedField],
            V31.DELIVERY.SENDING,
            allowUnknownResend
          );

    if (decision.action === 'skip') {
      return {
        action: 'skip',
        reason: decision.reason,
        cycle: cycle,
      };
    }

    if (decision.action === 'mark-unknown') {
      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      if (component.errorField) {
        cycle[component.errorField] =
          component.label +
          ' claim went stale before send confirmation. Attempt ID: ' +
          String(cycle[component.attemptField] || 'not recorded');
      }
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      audit_(
        cycleId,
        'Workflow notification delivery unknown',
        Session.getEffectiveUser().getEmail(),
        component.key,
        V31.DELIVERY.UNKNOWN,
        String(cycle[component.errorField] || '')
      );

      return {
        action: 'skip',
        reason: 'unknown',
        cycle: cycle,
      };
    }

    const attemptId = Utilities.getUuid();

    cycle[component.statusField] = V31.DELIVERY.SENDING;
    cycle[component.attemptField] = attemptId;
    cycle[component.startedField] = new Date();
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();

    return {
      action: 'claim',
      attemptId: attemptId,
      cycle: cycle,
    };
  });

  if (claim.action !== 'claim') {
    if (claim.reason === 'unknown') {
      safelyRecordWorkflowDeliveryUnknownAlert_(
        cycleId,
        component.key,
        {
          reason: claim.reason,
          attemptId: String(
            claim.cycle[component.attemptField] || ''
          ),
          error: String(
            claim.cycle[component.errorField] || ''
          ),
        }
      );
    }
    return claim;
  }

  try {
    sendFn(claim.cycle);

    const committed = withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle[component.attemptField] || '') !==
        String(claim.attemptId)
      ) {
        return false;
      }

      cycle[component.statusField] = V31.DELIVERY.SENT;
      cycle[component.sentAtField] = new Date();
      if (component.errorField) {
        cycle[component.errorField] = '';
      }
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return true;
    });

    if (!committed) {
      safelyRecordWorkflowDeliveryUnknownAlert_(
        cycleId,
        component.key,
        {
          reason: 'attempt-replaced-before-commit',
          attemptId: claim.attemptId,
        }
      );
      return buildWorkflowCommitMismatchResult_(
        findCycle_(cycleId).object
      );
    }

    safelyAutoResolveSystemAlertByKey_(
      buildSystemAlertKey_(
        cycleId,
        'Workflow Notification',
        component.key + ':delivery-unknown'
      ),
      function () {
        const fresh = findCycle_(cycleId).object;
        return (
          String(fresh[component.statusField] || '') ===
            V31.DELIVERY.SENT &&
          !!fresh[component.sentAtField]
        );
      }
    );
    return { action: 'sent', cycle: findCycle_(cycleId).object };
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (
        String(cycle[component.attemptField] || '') !==
        String(claim.attemptId)
      ) {
        return;
      }

      cycle[component.statusField] = V31.DELIVERY.UNKNOWN;
      if (component.errorField) {
        cycle[component.errorField] = String(
          error.message || error
        );
      }
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    audit_(
      cycleId,
      'Workflow notification delivery unknown',
      Session.getEffectiveUser().getEmail(),
      component.key,
      V31.DELIVERY.UNKNOWN,
      String(error.message || error)
    );
    safelyRecordWorkflowDeliveryUnknownAlert_(
      cycleId,
      component.key,
      {
        reason: 'send-error',
        attemptId: claim.attemptId,
        error: String(error.message || error),
      }
    );

    return {
      action: 'error',
      error: error,
      cycle: findCycle_(cycleId).object,
    };
  }
}

function buildWorkflowCommitMismatchResult_(cycle) {
  return {
    action: 'unknown',
    reason: 'attempt-replaced-before-commit',
    cycle: cycle,
  };
}

function getWorkflowNotificationComponent_(key) {
  const map = {
    ready: {
      key: 'ready',
      label: 'Ready-for-meeting notification',
      statusField: 'Ready Notification Status',
      attemptField: 'Ready Notification Attempt ID',
      startedField: 'Ready Notification Started At',
      sentAtField: 'Ready Notification Sent At',
      errorField: 'Ready Notification Last Error',
    },
    meetingManager: {
      key: 'meetingManager',
      label: 'Meeting-opened manager email',
      statusField: 'Meeting Manager Email Status',
      attemptField: 'Meeting Manager Email Attempt ID',
      startedField: 'Meeting Manager Email Started At',
      sentAtField: 'Meeting Manager Email Sent At',
      errorField: 'Meeting Manager Email Last Error',
    },
    meetingEmployee: {
      key: 'meetingEmployee',
      label: 'Meeting-opened employee email',
      statusField: 'Meeting Employee Email Status',
      attemptField: 'Meeting Employee Email Attempt ID',
      startedField: 'Meeting Employee Email Started At',
      sentAtField: 'Meeting Employee Email Sent At',
      errorField: 'Meeting Employee Email Last Error',
    },
    signatureManager: {
      key: 'signatureManager',
      label: 'Manager signature request',
      statusField: 'Manager Signature Email Status',
      attemptField: 'Manager Signature Email Attempt ID',
      startedField: 'Manager Signature Email Started At',
      sentAtField: 'Manager Signature Email Sent At',
      errorField: 'Manager Signature Email Last Error',
    },
    signatureEmployee: {
      key: 'signatureEmployee',
      label: 'Employee signature request',
      statusField: 'Employee Signature Email Status',
      attemptField: 'Employee Signature Email Attempt ID',
      startedField: 'Employee Signature Email Started At',
      sentAtField: 'Employee Signature Email Sent At',
      errorField: 'Employee Signature Email Last Error',
    },
    signatureHr: {
      key: 'signatureHr',
      label: 'HR signature request',
      statusField: 'HR Signature Email Status',
      attemptField: 'HR Signature Email Attempt ID',
      startedField: 'HR Signature Email Started At',
      sentAtField: 'HR Signature Email Sent At',
      errorField: 'HR Signature Email Last Error',
    },
  };

  if (!map[key]) {
    throw new Error('Unknown workflow notification: ' + key);
  }

  return map[key];
}

function getWorkflowNotificationKeys_() {
  return [
    'ready',
    'meetingManager',
    'meetingEmployee',
    'signatureManager',
    'signatureEmployee',
    'signatureHr',
  ];
}

/** Workflow claims have their own configurable stale threshold. */
function isWorkflowOutboxClaimStale_(startedAt, staleMinutes) {
  const minutes =
    staleMinutes === undefined || staleMinutes === null
      ? Number(getSettings_().OUTBOX_STALE_MINUTES || 15)
      : Number(staleMinutes);
  const effectiveStaleMinutes =
    isFinite(minutes) && minutes > 0 ? minutes : 15;
  const started = startedAt ? new Date(startedAt) : null;
  return (
    !started ||
    isNaN(started.getTime()) ||
    Date.now() - started.getTime() >
      effectiveStaleMinutes * 60000
  );
}

/**
 * Return an ordered workflow rank for cycle statuses.
 * Unknown or empty statuses return -1 and are treated conservatively.
 */
function getWorkflowStageRank_(status) {
  const ranks = {};

  ranks[PR.CYCLE.OPEN] = 0;
  ranks[PR.CYCLE.READY] = 1;
  ranks[PR.CYCLE.MEETING] = 2;
  ranks[PR.CYCLE.SIGNATURES] = 3;
  ranks[PR.CYCLE.FINALIZING] = 4;
  ranks[PR.CYCLE.COMPLETE] = 5;
  ranks[PR.CYCLE.CANCELLED] = 6;

  const normalized = String(status || '');

  return Object.prototype.hasOwnProperty.call(ranks, normalized)
    ? ranks[normalized]
    : -1;
}

/**
 * Classify a workflow notification as future, eligible, or past.
 */
function getWorkflowNotificationDisposition_(cycle, key) {
  if (!cycle || !key) {
    return 'future';
  }

  const targetStatuses = {
    ready: PR.CYCLE.READY,
    meetingManager: PR.CYCLE.MEETING,
    meetingEmployee: PR.CYCLE.MEETING,
    signatureManager: PR.CYCLE.SIGNATURES,
    signatureEmployee: PR.CYCLE.SIGNATURES,
    signatureHr: PR.CYCLE.SIGNATURES,
  };

  if (!Object.prototype.hasOwnProperty.call(targetStatuses, key)) {
    throw new Error('Unknown workflow notification: ' + key);
  }

  const currentRank = getWorkflowStageRank_(cycle['Status']);
  const targetRank = getWorkflowStageRank_(targetStatuses[key]);

  if (currentRank < 0 || targetRank < 0 || currentRank < targetRank) {
    return 'future';
  }

  if (currentRank > targetRank) {
    return 'past';
  }

  if (
    key === 'ready' ||
    key === 'meetingManager' ||
    key === 'meetingEmployee'
  ) {
    return 'eligible';
  }

  const signatures = getCombinedSignatureState_(cycle);

  if (key === 'signatureManager') {
    return signatures.managerSigned ? 'past' : 'eligible';
  }

  if (key === 'signatureEmployee') {
    return signatures.employeeSigned ? 'past' : 'eligible';
  }

  if (key === 'signatureHr') {
    if (signatures.hrSigned) {
      return 'past';
    }

    return signatures.managerSigned && signatures.employeeSigned
      ? 'eligible'
      : 'future';
  }

  return 'future';
}

function isWorkflowNotificationEligible_(cycle, key) {
  return (
    getWorkflowNotificationDisposition_(cycle, key) ===
    'eligible'
  );
}

/**
 * Pure planner used by the locked supersession writer and lifecycle tests.
 */
function getSupersedableWorkflowNotifications_(cycle) {
  const planned = [];

  getWorkflowNotificationKeys_().forEach(function (key) {
    if (
      getWorkflowNotificationDisposition_(cycle, key) !== 'past'
    ) {
      return;
    }

    const component = getWorkflowNotificationComponent_(key);
    const previousStatus = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const maySupersede =
      previousStatus === V31.DELIVERY.PENDING ||
      previousStatus === V31.DELIVERY.FAILED ||
      previousStatus === V31.DELIVERY.UNKNOWN ||
      (previousStatus === V31.DELIVERY.SENDING &&
        isWorkflowOutboxClaimStale_(cycle[component.startedField]));

    if (maySupersede) {
      planned.push({
        key: key,
        previousStatus: previousStatus,
      });
    }
  });

  return planned;
}

/**
 * Mark only genuinely past notifications as Superseded.
 * Always writes from the fresh row loaded while the lock is held.
 */
function markSupersededWorkflowNotifications_(cycleId) {
  return withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    const superseded = getSupersedableWorkflowNotifications_(
      cycle
    );
    let changed = false;

    superseded.forEach(function (item) {
      const key = item.key;
      const previousStatus = item.previousStatus;
      const component = getWorkflowNotificationComponent_(key);
      cycle[component.statusField] = V31.DELIVERY.SUPERSEDED;
      cycle[component.attemptField] = '';
      cycle[component.startedField] = '';

      if (component.errorField) {
        cycle[component.errorField] =
          previousStatus === V31.DELIVERY.UNKNOWN ||
          previousStatus === V31.DELIVERY.SENDING
            ? 'Superseded after the workflow advanced. Prior delivery remained unconfirmed; no late resend was attempted.'
            : 'Superseded because the workflow advanced past this notification stage.';
      }

      changed = true;
    });

    if (changed) {
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();

      audit_(
        cycleId,
        'Workflow notifications superseded',
        Session.getEffectiveUser().getEmail(),
        '',
        V31.DELIVERY.SUPERSEDED,
        JSON.stringify({ superseded: superseded })
      );
    }

    return {
      cycle: cycle,
      superseded: superseded.map(function (item) {
        return item.key;
      }),
    };
  });
}

function shouldDispatchWorkflowNotification_(
  cycle,
  component,
  staleMinutes
) {
  const status = String(
    cycle[component.statusField] || V31.DELIVERY.PENDING
  );

  return (
    status === V31.DELIVERY.PENDING ||
    status === V31.DELIVERY.FAILED ||
    (status === V31.DELIVERY.SENDING &&
      isWorkflowOutboxClaimStale_(
        cycle[component.startedField],
        staleMinutes
      ))
  );
}

/**
 * Drain eligible workflow notifications for one cycle.
 * Fresh Sending is left alone; stale Sending becomes Delivery Unknown.
 * Private — not callable from google.script.run.
 */
function dispatchPendingWorkflowNotifications_(cycleId) {
  const totals = {
    eligible: 0,
    sent: 0,
    skipped: 0,
    superseded: 0,
    deliveryUnknown: 0,
    failed: 0,
  };
  const results = [];

  const marked = markSupersededWorkflowNotifications_(cycleId);
  totals.superseded = marked.superseded.length;

  const keys = getWorkflowNotificationKeys_();
  let cycle = marked.cycle;

  keys.forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);

    if (!isWorkflowNotificationEligible_(cycle, key)) {
      return;
    }

    if (!shouldDispatchWorkflowNotification_(cycle, component)) {
      return;
    }

    totals.eligible++;

    const result = deliverWorkflowNotification_(
      cycleId,
      component,
      function (fresh) {
        sendWorkflowNotificationBody_(key, fresh);
      },
      { allowUnknownResend: false }
    );

    results.push({
      key: key,
      action: result.action,
      reason: result.reason || '',
    });

    if (result.action === 'sent') {
      totals.sent++;
    } else if (
      result.action === 'unknown' ||
      result.reason === 'unknown' ||
      result.reason === 'attempt-replaced-before-commit'
    ) {
      totals.deliveryUnknown++;
      totals.skipped++;
    } else if (result.action === 'error') {
      totals.deliveryUnknown++;
      totals.failed++;
    } else {
      totals.skipped++;
    }

    cycle = result.cycle || findCycle_(cycleId).object;
  });

  return {
    ok: totals.failed === 0,
    cycleId: cycleId,
    results: results,
    totals: totals,
    notifications: getWorkflowNotificationSummary_(
      findCycle_(cycleId).object
    ),
  };
}

/**
 * Use a batch snapshot only to decide whether a fresh locked inspection
 * is necessary. This snapshot is never written back.
 */
function workflowCycleNeedsOutboxInspection_(cycle, staleMinutes) {
  const supportedStatuses = [
    PR.CYCLE.READY,
    PR.CYCLE.MEETING,
    PR.CYCLE.SIGNATURES,
    PR.CYCLE.FINALIZING,
    PR.CYCLE.COMPLETE,
    PR.CYCLE.CANCELLED,
  ];

  if (
    supportedStatuses.indexOf(String(cycle['Status'] || '')) < 0
  ) {
    return false;
  }

  return getWorkflowNotificationKeys_().some(function (key) {
    const disposition =
      getWorkflowNotificationDisposition_(cycle, key);

    if (disposition === 'future') {
      return false;
    }

    const component = getWorkflowNotificationComponent_(key);
    const status = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const staleSending =
      status === V31.DELIVERY.SENDING &&
      isWorkflowOutboxClaimStale_(
        cycle[component.startedField],
        staleMinutes
      );

    if (disposition === 'eligible') {
      return shouldDispatchWorkflowNotification_(
        cycle,
        component,
        staleMinutes
      );
    }

    return (
      status === V31.DELIVERY.PENDING ||
      status === V31.DELIVERY.FAILED ||
      status === V31.DELIVERY.UNKNOWN ||
      staleSending
    );
  });
}

/** Pure batch planner: clean and inactive cycle snapshots are skipped. */
function planWorkflowOutboxCycles_(cycles, staleMinutes) {
  return (cycles || [])
    .filter(function (cycle) {
      return workflowCycleNeedsOutboxInspection_(
        cycle,
        staleMinutes
      );
    })
    .map(function (cycle) {
      return String(cycle['Cycle ID'] || '');
    });
}

/**
 * Drain eligible pending workflow notifications across active cycles.
 * Private — not callable from google.script.run.
 */
function dispatchPendingWorkflowNotificationsForAllCycles_() {
  const cycles = getAllObjects_(PR.SHEETS.CYCLES);
  const plannedIds = planWorkflowOutboxCycles_(
    cycles,
    Number(getSettings_().OUTBOX_STALE_MINUTES || 15)
  );
  const plannedLookup = {};
  plannedIds.forEach(function (cycleId) {
    plannedLookup[cycleId] = true;
  });
  const totals = {
    scanned: 0,
    inspected: 0,
    eligible: 0,
    sent: 0,
    skipped: 0,
    superseded: 0,
    deliveryUnknown: 0,
    failed: 0,
  };
  const details = [];

  cycles.forEach(function (cycle) {
    totals.scanned++;

    if (
      !plannedLookup[String(cycle['Cycle ID'] || '')]
    ) {
      return;
    }

    totals.inspected++;

    try {
      const result = dispatchPendingWorkflowNotifications_(
        cycle['Cycle ID']
      );
      const rowTotals = result.totals || {};

      totals.eligible += Number(rowTotals.eligible || 0);
      totals.sent += Number(rowTotals.sent || 0);
      totals.skipped += Number(rowTotals.skipped || 0);
      totals.superseded += Number(rowTotals.superseded || 0);
      totals.deliveryUnknown += Number(
        rowTotals.deliveryUnknown || 0
      );
      totals.failed += Number(rowTotals.failed || 0);

      if (
        Number(rowTotals.sent || 0) ||
        Number(rowTotals.superseded || 0) ||
        Number(rowTotals.deliveryUnknown || 0) ||
        Number(rowTotals.failed || 0)
      ) {
        details.push({
          cycleId: cycle['Cycle ID'],
          totals: rowTotals,
        });
      }
    } catch (error) {
      totals.failed++;
      details.push({
        cycleId: cycle['Cycle ID'],
        error: String(error.message || error),
      });
    }
  });

  const resultLabel =
    totals.failed > 0 ? 'Partial' : 'Success';

  logReviewAutomation_({
    mode: String(getSettings_().AUTOMATION_MODE || 'Preview'),
    action: 'Workflow outbox drain',
    result: resultLabel,
    details: JSON.stringify(totals),
  });

  return {
    ok: totals.failed === 0,
    scanned: totals.scanned,
    inspected: totals.inspected,
    eligible: totals.eligible,
    sent: totals.sent,
    skipped: totals.skipped,
    superseded: totals.superseded,
    deliveryUnknown: totals.deliveryUnknown,
    failed: totals.failed,
    details: details,
  };
}

function getOutboxResultCount_(result, key) {
  if (
    result &&
    result[key] !== undefined &&
    result[key] !== null
  ) {
    return Number(result[key] || 0);
  }

  if (
    result &&
    result.totals &&
    result.totals[key] !== undefined &&
    result.totals[key] !== null
  ) {
    return Number(result.totals[key] || 0);
  }

  return 0;
}

function getWorkflowNotificationRecipients_(cycle, key) {
  if (key === 'ready' || key === 'meetingManager') {
    return uniqueEmails_([
      cycle['Manager Email'],
      cycle['HR Email'],
    ]);
  }
  if (key === 'meetingEmployee' || key === 'signatureEmployee') {
    return uniqueEmails_([cycle['Employee Email']]);
  }
  if (key === 'signatureManager') {
    return uniqueEmails_([cycle['Manager Email']]);
  }
  if (key === 'signatureHr') {
    return uniqueEmails_([cycle['HR Email']]);
  }
  return [];
}

/** Pure exact-send plan used by both confirmation UI and server validation. */
function planWorkflowOutboxForCycle_(cycle, requestedKeys) {
  const requested = Array.isArray(requestedKeys)
    ? requestedKeys.map(String)
    : [];
  const keys = requested.length
    ? requested
    : getWorkflowNotificationKeys_();
  const components = [];
  keys.forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    const status = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    if (
      isWorkflowNotificationEligible_(cycle, key) &&
      (status === V31.DELIVERY.PENDING ||
        status === V31.DELIVERY.FAILED)
    ) {
      components.push({
        key: key,
        label: component.label,
        recipients: getWorkflowNotificationRecipients_(cycle, key),
      });
    }
  });
  return {
    cycleId: String(cycle['Cycle ID'] || ''),
    componentCount: components.length,
    components: components,
  };
}

function getWorkflowOutboxManualPlan(cycleId, componentKeys) {
  assertActiveHrDomain_();
  return planWorkflowOutboxForCycle_(
    findCycle_(String(cycleId || '')).object,
    componentKeys
  );
}

function getWorkflowNotificationRetryPlan(cycleId, componentKey) {
  assertActiveHrDomain_();
  const cycle = findCycle_(String(cycleId || '')).object;
  const component = getWorkflowNotificationComponent_(
    String(componentKey || '')
  );
  const status = String(
    cycle[component.statusField] || V31.DELIVERY.PENDING
  );
  const eligible =
    isWorkflowNotificationEligible_(cycle, component.key) &&
    [
      V31.DELIVERY.PENDING,
      V31.DELIVERY.FAILED,
      V31.DELIVERY.UNKNOWN,
    ].indexOf(status) >= 0;
  return {
    cycleId: String(cycleId || ''),
    componentKey: component.key,
    componentCount: eligible ? 1 : 0,
    recipients: eligible
      ? getWorkflowNotificationRecipients_(cycle, component.key)
      : [],
    status: status,
    attemptId: String(cycle[component.attemptField] || ''),
    canMarkConfirmed:
      eligible && status === V31.DELIVERY.UNKNOWN,
  };
}

function dispatchSelectedWorkflowNotifications_(
  cycleId,
  componentKeys,
  expectedRecipientsByKey
) {
  const totals = {
    eligible: 0,
    sent: 0,
    skipped: 0,
    superseded: 0,
    deliveryUnknown: 0,
    failed: 0,
  };
  const results = [];
  (componentKeys || []).forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    const result = deliverWorkflowNotification_(
      cycleId,
      component,
      function (fresh) {
        sendWorkflowNotificationBody_(key, fresh);
      },
      {
        allowUnknownResend: false,
        expectedRecipients:
          (expectedRecipientsByKey || {})[key] || null,
      }
    );
    totals.eligible++;
    results.push({
      key: key,
      action: result.action,
      reason: result.reason || '',
    });
    if (result.action === 'sent') totals.sent++;
    else if (result.action === 'error') {
      totals.failed++;
      totals.deliveryUnknown++;
    } else {
      totals.skipped++;
      if (
        result.action === 'unknown' ||
        result.reason === 'unknown'
      ) {
        totals.deliveryUnknown++;
      }
    }
  });
  return {
    ok: totals.failed === 0,
    cycleId: cycleId,
    totals: totals,
    results: results,
    notifications: getWorkflowNotificationSummary_(
      findCycle_(cycleId).object
    ),
  };
}

/**
 * HR-only public outbox drain. Requires domain, active HR, and explicit
 * confirmation. Automatic Preview drains are intentionally unsupported.
 */
function drainWorkflowOutboxNow(options) {
  const email = assertActiveHrDomain_();
  const opts = options || {};
  assertSystemRecoveryConfirmation_(opts);
  const cycleId = String(opts.cycleId || '');
  const componentKeys = Array.isArray(opts.componentKeys)
    ? opts.componentKeys.map(String)
    : [];
  const uniqueComponentKeys = componentKeys.filter(
    function (key, index) {
      return componentKeys.indexOf(key) === index;
    }
  );
  if (
    !cycleId ||
    !componentKeys.length ||
    uniqueComponentKeys.length !== componentKeys.length
  ) {
    throw new Error(
      'A cycle and unique exact workflow components are required.'
    );
  }
  const plan = planWorkflowOutboxForCycle_(
    findCycle_(cycleId).object,
    componentKeys
  );
  if (
    Number(opts.componentCount) !== plan.componentCount ||
    plan.componentCount !== componentKeys.length ||
    JSON.stringify(opts.recipients || []) !==
      JSON.stringify(
        plan.components.map(function (component) {
          return component.recipients;
        })
      )
  ) {
    throw new Error(
      'Workflow recipients or component count changed. Refresh and confirm again.'
    );
  }
  const result = dispatchSelectedWorkflowNotifications_(
    cycleId,
    componentKeys,
    plan.components.reduce(function (lookup, component) {
      lookup[component.key] = component.recipients;
      return lookup;
    }, {})
  );

  audit_(
    cycleId,
    'Workflow outbox drained by HR',
    email,
    '',
    result.ok ? 'Success' : 'Partial',
    JSON.stringify({
      cycleId: cycleId,
      componentKeys: componentKeys,
      recipients: opts.recipients,
      scanned: getOutboxResultCount_(result, 'scanned'),
      eligible: getOutboxResultCount_(result, 'eligible'),
      sent: getOutboxResultCount_(result, 'sent'),
      skipped: getOutboxResultCount_(result, 'skipped'),
      superseded: getOutboxResultCount_(result, 'superseded'),
      deliveryUnknown: getOutboxResultCount_(
        result,
        'deliveryUnknown'
      ),
      failed: getOutboxResultCount_(result, 'failed'),
    })
  );

  return {
    ok: !!result.ok,
    message:
      'Outbox drain complete. Sent ' +
      getOutboxResultCount_(result, 'sent') +
      ', superseded ' +
      getOutboxResultCount_(result, 'superseded') +
      ', failed ' +
      getOutboxResultCount_(result, 'failed') +
      '.',
    scanned: getOutboxResultCount_(result, 'scanned'),
    eligible: getOutboxResultCount_(result, 'eligible'),
    sent: getOutboxResultCount_(result, 'sent'),
    skipped: getOutboxResultCount_(result, 'skipped'),
    superseded: getOutboxResultCount_(result, 'superseded'),
    deliveryUnknown: getOutboxResultCount_(
      result,
      'deliveryUnknown'
    ),
    failed: getOutboxResultCount_(result, 'failed'),
    results: result.results,
    details: result.details,
    notifications: result.notifications,
  };
}

/**
 * HR-only: retry a single durable workflow notification recipient.
 */
function retryWorkflowNotification(
  cycleId,
  componentKey,
  options
) {
  const email = assertActiveHrDomain_();
  const effectiveOptions = options || {};
  assertSystemRecoveryConfirmation_(effectiveOptions);
  const confirmationCycle = findCycle_(cycleId).object;
  const confirmationComponent =
    getWorkflowNotificationComponent_(componentKey);
  const confirmationStatus = String(
    confirmationCycle[confirmationComponent.statusField] ||
      V31.DELIVERY.PENDING
  );
  const confirmedRecipients =
    Array.isArray(effectiveOptions.recipients)
      ? effectiveOptions.recipients
      : [];
  const currentRecipients =
    getWorkflowNotificationRecipients_(
      confirmationCycle,
      componentKey
    );
  if (
    Number(effectiveOptions.componentCount) !== 1 ||
    !isWorkflowNotificationEligible_(
      confirmationCycle,
      componentKey
    ) ||
    [
      V31.DELIVERY.PENDING,
      V31.DELIVERY.FAILED,
      V31.DELIVERY.UNKNOWN,
    ].indexOf(confirmationStatus) < 0 ||
    JSON.stringify(confirmedRecipients) !==
      JSON.stringify(currentRecipients)
  ) {
    throw new Error(
      'The selected recipient changed or is not currently retryable.'
    );
  }
  if (
    effectiveOptions.allowUnknownResend === undefined ||
    effectiveOptions.allowUnknownResend === null
  ) {
    effectiveOptions.allowUnknownResend = true;
  }

  markSupersededWorkflowNotifications_(cycleId);

  const component = getWorkflowNotificationComponent_(
    componentKey
  );
  const cycle = findCycle_(cycleId).object;

  if (!isWorkflowNotificationEligible_(cycle, componentKey)) {
    throw new Error(
      component.label +
        ' is not eligible for the current cycle stage.'
    );
  }

  const result = deliverWorkflowNotification_(
    cycleId,
    component,
    function (fresh) {
      sendWorkflowNotificationBody_(componentKey, fresh);
    },
    Object.assign({}, effectiveOptions, {
      expectedRecipients: currentRecipients,
    })
  );

  audit_(
    cycleId,
    'Workflow notification retried',
    email,
    componentKey,
    result.action,
    JSON.stringify({
      allowUnknownResend: !!effectiveOptions.allowUnknownResend,
      reason: result.reason || '',
    })
  );

  if (result.action === 'error') {
    throw new Error(
      component.label +
        ' is Delivery Unknown after send failure: ' +
        String(result.error.message || result.error)
    );
  }

  return {
    ok: true,
    action: result.action,
    message:
      result.action === 'sent'
        ? component.label + ' sent.'
        : component.label +
          ' was not resent (' +
          (result.reason || result.action) +
          ').',
    notifications: getWorkflowNotificationSummary_(
      findCycle_(cycleId).object
    ),
  };
}

/**
 * HR-only: mark a Delivery Unknown workflow notification Sent with evidence.
 * Never sends email.
 */
function markWorkflowNotificationConfirmed(
  cycleId,
  componentKey,
  payload
) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  const evidenceNote = String(input.evidenceNote || '').trim();
  if (
    input.confirmed !== true ||
    String(input.confirmationToken || '') !==
      V31_FINALIZATION.WORKFLOW_CONFIRM_TOKEN ||
    !evidenceNote
  ) {
    throw new Error(
      'Confirmation, exact token, and an evidence note are required.'
    );
  }
  const component = getWorkflowNotificationComponent_(
    String(componentKey || '')
  );
  const before = findCycle_(cycleId).object;
  const beforeRecipients = getWorkflowNotificationRecipients_(
    before,
    component.key
  );
  if (
    String(before[component.statusField] || '') !==
      V31.DELIVERY.UNKNOWN ||
    !isWorkflowNotificationEligible_(before, component.key) ||
    String(input.originalAttemptId || '') !==
      String(before[component.attemptField] || '') ||
    JSON.stringify(input.recipients || []) !==
      JSON.stringify(beforeRecipients)
  ) {
    throw new Error(
      'Workflow notification status, attempt, eligibility, or recipients changed. Refresh and confirm again.'
    );
  }
  const eventId = getWorkflowNotificationConfirmEventId_(
    cycleId,
    component.key
  );
  const result = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle[component.statusField] || '') !==
        V31.DELIVERY.UNKNOWN ||
      String(cycle[component.attemptField] || '') !==
        String(input.originalAttemptId || '')
    ) {
      throw new Error(
        'Only the confirmed Delivery Unknown attempt may be marked Sent.'
      );
    }
    const recipients = getWorkflowNotificationRecipients_(
      cycle,
      component.key
    );
    if (
      JSON.stringify(recipients) !==
      JSON.stringify(beforeRecipients)
    ) {
      throw new Error(
        'Workflow notification recipients changed before confirmation commit.'
      );
    }
    const priorAttempt = String(cycle[component.attemptField] || '');
    const confirmedAt = new Date();
    const details = buildWorkflowNotificationConfirmationDetails_(
      actor,
      confirmedAt,
      evidenceNote,
      priorAttempt,
      recipients,
      component.key
    );
    auditIdempotentUnlocked_(
      cycleId,
      'Workflow notification manually confirmed',
      actor,
      V31.DELIVERY.UNKNOWN,
      V31.DELIVERY.SENT,
      JSON.stringify(details),
      eventId
    );
    cycle[component.statusField] = V31.DELIVERY.SENT;
    cycle[component.sentAtField] =
      cycle[component.sentAtField] || confirmedAt;
    if (component.errorField) {
      cycle[component.errorField] = '';
    }
    cycle['Updated At'] = confirmedAt;
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return {
      recipients: recipients,
      attemptId: priorAttempt,
      details: details,
    };
  });
  safelyAutoResolveSystemAlertByKey_(
    buildSystemAlertKey_(
      cycleId,
      'Workflow Notification',
      component.key + ':delivery-unknown'
    ),
    function () {
      const fresh = findCycle_(cycleId).object;
      return (
        String(fresh[component.statusField] || '') ===
          V31.DELIVERY.SENT &&
        !!fresh[component.sentAtField]
      );
    }
  );
  return {
    ok: true,
    eventId: eventId,
    componentKey: component.key,
    recipients: result.recipients,
    attemptId: result.attemptId,
    message:
      component.label +
      ' marked confirmed without sending email.',
    notifications: getWorkflowNotificationSummary_(
      findCycle_(cycleId).object
    ),
  };
}

function getWorkflowNotificationConfirmEventId_(cycleId, componentKey) {
  return (
    V31_FINALIZATION.WORKFLOW_CONFIRM_EVENT_PREFIX +
    String(cycleId) +
    ':' +
    String(componentKey)
  );
}

function buildWorkflowNotificationConfirmationDetails_(
  confirmedBy,
  confirmedAt,
  evidenceNote,
  originalAttemptId,
  recipients,
  componentKey
) {
  return {
    schemaVersion: 1,
    resolution: 'manual-confirmation',
    componentKey: String(componentKey || ''),
    confirmedBy: String(confirmedBy || ''),
    confirmedAt: new Date(confirmedAt).toISOString(),
    priorStatus: V31.DELIVERY.UNKNOWN,
    evidenceNote: String(evidenceNote || ''),
    originalAttemptId: String(originalAttemptId || ''),
    recipients: (recipients || []).slice(),
  };
}

function getWorkflowNotificationSummary_(cycle) {
  const keys = getWorkflowNotificationKeys_();
  const summary = {
    components: {},
  };
  const eligibleUnresolved = [];

  keys.forEach(function (key) {
    const component = getWorkflowNotificationComponent_(key);
    const status = String(
      cycle[component.statusField] || V31.DELIVERY.PENDING
    );
    const eligible = isWorkflowNotificationEligible_(cycle, key);
    const staleSending =
      status === V31.DELIVERY.SENDING &&
      isWorkflowOutboxClaimStale_(cycle[component.startedField]);
    const unresolved =
      status === V31.DELIVERY.PENDING ||
      status === V31.DELIVERY.FAILED ||
      status === V31.DELIVERY.UNKNOWN ||
      staleSending;

    summary[key] = status;
    summary.components[key] = {
      status: status,
      eligible: eligible,
      staleSending: staleSending,
      lastError: String(
        (component.errorField && cycle[component.errorField]) || ''
      ),
      needsAttention: eligible && unresolved,
    };

    if (eligible && unresolved) {
      eligibleUnresolved.push(key);
    }
  });

  summary.hasUnknown = keys.some(function (key) {
    return (
      summary[key] === V31.DELIVERY.UNKNOWN ||
      summary.components[key].staleSending
    );
  });
  summary.eligibleUnresolved = eligibleUnresolved;
  summary.needsAttention = eligibleUnresolved.length > 0;

  return summary;
}

function sendWorkflowNotificationBody_(componentKey, cycle) {
  if (componentKey === 'ready') {
    sendReadyForMeetingEmailBody_(cycle);
    return;
  }

  if (componentKey === 'meetingManager') {
    sendMeetingOpenedRecipientEmail_(cycle, 'manager');
    return;
  }

  if (componentKey === 'meetingEmployee') {
    sendMeetingOpenedRecipientEmail_(cycle, 'employee');
    return;
  }

  if (componentKey === 'signatureManager') {
    sendCombinedSignatureEmailBody_(cycle, PR.ROLE.MANAGER);
    return;
  }

  if (componentKey === 'signatureEmployee') {
    sendCombinedSignatureEmailBody_(cycle, PR.ROLE.EMPLOYEE);
    return;
  }

  if (componentKey === 'signatureHr') {
    sendCombinedSignatureEmailBody_(cycle, PR.ROLE.HR);
  }
}

function openReviewCalendar_(settings) {
  const calendarId = String(
    settings.CALENDAR_ID || 'primary'
  );
  const calendar =
    calendarId === 'primary'
      ? CalendarApp.getDefaultCalendar()
      : CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error(
      'The configured Google Calendar could not be opened.'
    );
  }

  return calendar;
}

/**
 * Pure helper: the literal marker text embedded in the event
 * description so a cycle's event is discoverable even if the Calendar
 * tag is ever stripped (e.g. by a guest's client).
 */
function buildCalendarCycleMarker_(cycleId) {
  return V31.CALENDAR_MARKER_PREFIX + String(cycleId) + ']';
}

/**
 * Pure helper: does this Calendar event belong to this review cycle?
 * Checks the Calendar tag, the description marker, and (defensively)
 * a known persisted event ID — any one match is sufficient.
 */
function eventMatchesCycleId_(event, cycleId, knownEventId) {
  if (!event || !cycleId) return false;

  const wanted = String(cycleId);

  const tag = String(
    (event.getTag && event.getTag('AITHERAS_REVIEW_CYCLE_ID')) || ''
  );

  if (tag === wanted) return true;

  const description = String(
    (event.getDescription && event.getDescription()) || ''
  );

  if (description.indexOf(buildCalendarCycleMarker_(wanted)) >= 0) {
    return true;
  }

  if (
    knownEventId &&
    event.getId &&
    String(event.getId()) === String(knownEventId)
  ) {
    return true;
  }

  return false;
}

/**
 * Recover an event created in a prior attempt whose ID was never
 * persisted (crash between createEvent and the commit lock). Tries the
 * already-known event ID first, then a widened ±7 day tag/description
 * search around the meeting date.
 */
function findExistingReviewCalendarEvent_(
  calendar,
  cycleId,
  meetingDate,
  knownEventId
) {
  if (!calendar || !cycleId) {
    return null;
  }

  if (knownEventId) {
    try {
      const known = calendar.getEventById(String(knownEventId));

      if (known) return known;
    } catch (error) {
      // Fall through to the window search below.
    }
  }

  if (!meetingDate) {
    return null;
  }

  const dayStart = new Date(
    meetingDate.getFullYear(),
    meetingDate.getMonth(),
    meetingDate.getDate(),
    0,
    0,
    0,
    0
  );
  const rangeStart = new Date(
    dayStart.getTime() - 7 * 86400000
  );
  const rangeEnd = new Date(
    dayStart.getTime() + 8 * 86400000
  );
  const events = calendar.getEvents(
    rangeStart,
    rangeEnd
  );

  for (let i = 0; i < events.length; i++) {
    if (eventMatchesCycleId_(events[i], cycleId, knownEventId)) {
      return events[i];
    }
  }

  return null;
}

/**
 * Recover first, otherwise create with the cycle marker embedded in
 * the description and guests invited. Returns as soon as the event
 * exists — setTag()/reminders happen separately in
 * configureReviewCalendarEvent_ so a crash right after creation still
 * leaves a discoverable, guest-invited event.
 */
function createReviewCalendarEvent_(cycle) {
  const settings = getSettings_();
  const calendar = openReviewCalendar_(settings);

  let meetingDate = v31Date_(
    cycle['Review Meeting Date']
  );

  if (!meetingDate) {
    throw new Error(
      'The review meeting date is missing.'
    );
  }

  if (
    v31Boolean_(
      settings.SHIFT_WEEKEND_MEETINGS,
      true
    )
  ) {
    meetingDate =
      v31ShiftWeekendForward_(meetingDate);
  }

  const recovered = findExistingReviewCalendarEvent_(
    calendar,
    cycle['Cycle ID'],
    meetingDate,
    cycle['Calendar Event ID']
  );

  if (recovered) {
    return recovered;
  }

  const start = new Date(
    meetingDate.getFullYear(),
    meetingDate.getMonth(),
    meetingDate.getDate(),
    Number(
      settings.REVIEW_EVENT_START_HOUR || 12
    ),
    0,
    0,
    0
  );
  const end = new Date(
    start.getTime() +
      Number(
        settings.REVIEW_EVENT_DURATION_MINUTES ||
          60
      ) *
        60000
  );
  const guests = uniqueEmails_([
    cycle['Employee Email'],
    cycle['Manager Email'],
    cycle['HR Email'],
  ]).join(',');

  return calendar.createEvent(
    'Performance Review — ' +
      cycle['Employee Name'],
    start,
    end,
    {
      guests: guests,
      sendInvites: true,
      description:
        buildReviewCalendarDescription_(cycle),
    }
  );
}

/**
 * Best-effort configuration applied after the event ID is already
 * persisted: guest permissions, the recovery tag, and reminders.
 */
function configureReviewCalendarEvent_(event, cycle, settings) {
  event.setGuestsCanInviteOthers(false);
  event.setGuestsCanModify(false);
  event.setGuestsCanSeeGuests(true);
  event.setTag(
    'AITHERAS_REVIEW_CYCLE_ID',
    String(cycle['Cycle ID'])
  );

  event.removeAllReminders();

  const emailReminderMinutes =
    Number(
      settings.EVENT_EMAIL_REMINDER_DAYS || 7
    ) *
    1440;
  const popupReminderMinutes =
    Number(
      settings.EVENT_POPUP_REMINDER_HOURS || 24
    ) *
    60;

  if (
    emailReminderMinutes >= 5 &&
    emailReminderMinutes <= 40320
  ) {
    event.addEmailReminder(
      emailReminderMinutes
    );
  }

  if (
    popupReminderMinutes >= 5 &&
    popupReminderMinutes <= 40320
  ) {
    event.addPopupReminder(
      popupReminderMinutes
    );
  }
}

function buildReviewCalendarDescription_(cycle) {
  const overviewUrl =
    getWebAppUrl_() +
    '?cycleId=' +
    encodeURIComponent(cycle['Cycle ID']) +
    '&action=overview';
  const helpUrl =
    getWebAppUrl_() +
    '?action=help';

  return [
    buildCalendarCycleMarker_(cycle['Cycle ID']),
    'AITHERAS Performance Review',
    '',
    'Employee: ' + cycle['Employee Name'],
    'Manager: ' + cycle['Manager Name'],
    'Review type: ' + cycle['Review Type'],
    'Review period: ' +
      formatDate_(cycle['Review Period Start']) +
      ' – ' +
      formatDate_(cycle['Review Period End']),
    '',
    'Before the meeting:',
    'Manager review due: ' +
      formatDate_(cycle['Manager Due Date']),
    'Employee self-evaluation due: ' +
      formatDate_(cycle['Employee Due Date']),
    '',
    'Open the review portal:',
    overviewUrl,
    '',
    'How-to guide:',
    helpUrl,
    '',
    'The portal automatically shows each signed-in user only the actions and information authorized for their role.',
    '',
    'Do not open the review meeting workspace until the manager and employee are beginning the actual review discussion. Opening the meeting makes both evaluations visible.',
  ].join('\n');
}

function buildV31LaunchEmailUrls_(cycle) {
  return {
    managerUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=manager-review',
    employeeUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=self-evaluation',
    overviewUrl:
      getWebAppUrl_() +
      '?cycleId=' +
      encodeURIComponent(cycle['Cycle ID']) +
      '&action=overview',
    helpUrl: getWebAppUrl_() + '?action=help',
    compensationUrl: String(
      getSettings_().COMPENSATION_ADJUSTMENT_URL ||
        ''
    ),
  };
}

function sendV31ManagerLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);
  const managerButtons = emailButton_(
    urls.managerUrl,
    'Start Manager Review'
  );

  sendHtmlEmail_(
    cycle['Manager Email'],
    'Action required: ' +
      cycle['Review Type'] +
      ' for ' +
      cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(cycle['Manager Name']) +
      ',</p>' +
      '<p>The ' +
      htmlEscape_(cycle['Review Type']) +
      ' process for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> has started.</p>' +
      '<p><strong>Your tasks:</strong></p>' +
      '<ol>' +
      '<li>Complete and submit the Manager Performance Review by <strong>' +
      htmlEscape_(
        formatDate_(cycle['Manager Due Date'])
      ) +
      '</strong>.</li>' +
      '<li>After submission, recommend a compensation adjustment or confirm that no adjustment is recommended.</li>' +
      '<li>Attend the calendar event and open the meeting workspace when the discussion begins.</li>' +
      '</ol>' +
      '<p>The employee self-evaluation remains private until both evaluations are submitted and the meeting is opened.</p>' +
      managerButtons +
      '<p><a href="' +
      htmlEscape_(urls.helpUrl) +
      '">View the step-by-step manager guide</a></p>'
  );
}

function sendV31EmployeeLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);

  sendHtmlEmail_(
    cycle['Employee Email'],
    'Action required: Complete your self-evaluation',
    '<p>Hello ' +
      htmlEscape_(cycle['Employee Name']) +
      ',</p>' +
      '<p>Your ' +
      htmlEscape_(cycle['Review Type']) +
      ' process has started.</p>' +
      '<p>Please complete and submit your Employee Self-Evaluation by <strong>' +
      htmlEscape_(
        formatDate_(cycle['Employee Due Date'])
      ) +
      '</strong>.</p>' +
      '<p>Your responses remain private from your manager until both evaluations are submitted and the review meeting is opened.</p>' +
      emailButton_(
        urls.employeeUrl,
        'Start Self-Evaluation'
      ) +
      '<p><a href="' +
      htmlEscape_(urls.helpUrl) +
      '">View the step-by-step employee guide</a></p>'
  );
}

function sendV31HrLaunchEmail_(cycle) {
  const urls = buildV31LaunchEmailUrls_(cycle);

  sendHtmlEmail_(
    cycle['HR Email'],
    'Review process launched: ' +
      cycle['Employee Name'],
    '<p>Hello ' +
      htmlEscape_(cycle['HR Name']) +
      ',</p>' +
      '<p>The ' +
      htmlEscape_(cycle['Review Type']) +
      ' process for <strong>' +
      htmlEscape_(cycle['Employee Name']) +
      '</strong> was launched.</p>' +
      '<ul>' +
      '<li>Manager notification sent to ' +
      htmlEscape_(cycle['Manager Email']) +
      '</li>' +
      '<li>Employee notification sent to ' +
      htmlEscape_(cycle['Employee Email']) +
      '</li>' +
      '<li>One calendar event created for the employee, manager, and HR</li>' +
      '<li>Meeting date: ' +
      htmlEscape_(
        formatDate_(
          cycle['Review Meeting Date']
        )
      ) +
      '</li>' +
      '</ul>' +
      emailButton_(
        urls.overviewUrl,
        'Open Review Cycle'
      )
  );
}

/**
 * Validates and normalizes the recipients array for an intentional
 * resend. Defaults to all three roles when omitted.
 */
function normalizeResendRecipients_(recipients) {
  const allowed = ['manager', 'employee', 'hr'];
  const requested =
    Array.isArray(recipients) && recipients.length
      ? recipients
      : allowed.slice();

  const cleaned = requested
    .map(function (recipient) {
      return String(recipient || '').trim().toLowerCase();
    })
    .filter(function (recipient) {
      return allowed.indexOf(recipient) >= 0;
    });

  if (!cleaned.length) {
    throw new Error(
      'No valid recipients were specified for resend.'
    );
  }

  return cleaned;
}

/**
 * Sends one launch email again for an intentional, audited HR resend.
 * Never touches Status/Sent At/Calendar fields — this is a deliberate
 * duplicate, distinct from the crash-safe claim/commit send path.
 */
function resendReviewLaunchRecipient_(cycle, recipient) {
  if (recipient === 'manager') {
    sendV31ManagerLaunchEmail_(cycle);
  } else if (recipient === 'employee') {
    sendV31EmployeeLaunchEmail_(cycle);
  } else if (recipient === 'hr') {
    sendV31HrLaunchEmail_(cycle);
  } else {
    throw new Error(
      'Unsupported resend recipient: ' + recipient
    );
  }
}

/**
 * HR-only intentional resend. recipients is an optional subset of
 * ['manager', 'employee', 'hr'] (defaults to all three). Each
 * recipient is attempted independently so one failure does not block
 * the others, and the full per-recipient outcome is audited.
 */
function resendReviewLaunchEmails(cycleId, recipients) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may resend launch emails.'
    );
  }

  const targets = normalizeResendRecipients_(recipients);
  const location = findCycle_(cycleId);
  const cycle = applyV31DefaultsToCycle_(
    location.object,
    location.object['Cycle Source'] || 'Manual'
  );

  const outcomes = targets.map(function (recipient) {
    try {
      resendReviewLaunchRecipient_(cycle, recipient);

      return { recipient: recipient, ok: true };
    } catch (error) {
      return {
        recipient: recipient,
        ok: false,
        error: String(error.message || error),
      };
    }
  });

  const failedOutcomes = outcomes.filter(function (outcome) {
    return !outcome.ok;
  });

  audit_(
    cycleId,
    'Review launch emails resent',
    email,
    String(cycle['Status']),
    String(cycle['Status']),
    JSON.stringify({
      intentionalResend: true,
      recipients: targets,
      outcomes: outcomes,
      calendarEventId: String(
        cycle['Calendar Event ID'] || ''
      ),
    })
  );

  return {
    ok: failedOutcomes.length === 0,
    outcomes: outcomes,
    message:
      failedOutcomes.length === 0
        ? targets.join(', ') +
          ' launch email(s) resent. The existing calendar event was not duplicated.'
        : 'Some launch emails failed to resend: ' +
          failedOutcomes
            .map(function (outcome) {
              return outcome.recipient + ' (' + outcome.error + ')';
            })
            .join('; '),
  };
}

/**
 * HR-only reconciliation for a component stuck at Delivery Unknown.
 * 'markSent' trusts HR's manual confirmation that delivery already
 * happened (or the Calendar event already exists) without resending.
 * 'resend' re-claims the component and performs the action again,
 * recovering an existing Calendar event by tag/marker first.
 */
function reconcileLaunchDelivery(cycleId, component, action) {
  const email = getCurrentUserEmail_();
  assertDomain_(email, getSettings_().ALLOWED_DOMAIN);

  if (!isHrUser_(email)) {
    throw new Error(
      'Only HR may reconcile review launch delivery.'
    );
  }

  const validComponents = ['calendar', 'manager', 'employee', 'hr'];
  const validActions = ['markSent', 'resend'];

  if (validComponents.indexOf(component) < 0) {
    throw new Error(
      'Unsupported reconciliation component: ' + component
    );
  }

  if (validActions.indexOf(action) < 0) {
    throw new Error(
      'Unsupported reconciliation action: ' + action
    );
  }

  if (action === 'markSent') {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;

      if (component === 'calendar') {
        if (!cycle['Calendar Event ID']) {
          throw new Error(
            'Cannot mark the calendar as created without an event ID. Use resend instead.'
          );
        }

        cycle['Calendar Status'] = V31.CALENDAR.CREATED;
        cycle['Last Launch Error'] = '';
      } else {
        const fields = getLaunchEmailComponentByKey_(component);

        cycle[fields.statusField] = V31.DELIVERY.SENT;
        cycle[fields.sentAtField] =
          cycle[fields.sentAtField] || new Date();
        clearLastLaunchErrorUnlessCalendarConfig_(cycle);
      }

      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });

    maybeCompleteReviewLaunch_(cycleId);

    audit_(
      cycleId,
      'Review launch delivery reconciled (marked sent)',
      email,
      component,
      V31.DELIVERY.SENT,
      JSON.stringify({ component: component })
    );

    return {
      ok: true,
      message:
        'Marked ' + component + ' as delivered without resending.',
      launchComponents: getReviewLaunchComponentSummary_(
        findCycle_(cycleId).object
      ),
    };
  }

  // action === 'resend': re-claim under HR authorization and perform
  // the action again (Calendar recovers an existing event by
  // tag/marker before creating a new one).
  let result;

  if (component === 'calendar') {
    result = runCalendarLaunchStep_(cycleId, true);
  } else {
    result = runLaunchEmailStep_(
      cycleId,
      getLaunchEmailComponentByKey_(component),
      true
    );
  }

  if (result.action === 'error') {
    throw result.error;
  }

  maybeCompleteReviewLaunch_(cycleId);

  audit_(
    cycleId,
    'Review launch delivery reconciled (resent)',
    email,
    component,
    'resend',
    JSON.stringify({
      component: component,
      outcome: result.action,
    })
  );

  return {
    ok: true,
    message:
      'Resent ' + component + ' after Delivery Unknown reconciliation.',
    launchComponents: getReviewLaunchComponentSummary_(
      findCycle_(cycleId).object
    ),
  };
}

/* =============================== LOG ===================================== */

function automationLogDetails_(details) {
  const value = details || {};
  return JSON.stringify({
    schemaVersion: 1,
    appVersion: APP_VERSION,
    component: String(value.component || ''),
    attemptId: String(value.attemptId || ''),
    previousState: String(value.previousState || ''),
    newState: String(value.newState || ''),
    error: String(value.error || ''),
    recoveryRecommendation: String(
      value.recoveryRecommendation || ''
    ),
    metadata: value.metadata || {},
  });
}

function logReviewAutomation_(entry) {
  appendObject_(
    V31.AUTOMATION_SHEET,
    V31.LOG_HEADERS,
    {
      Timestamp: new Date(),
      Mode: entry.mode || '',
      Action: entry.action || '',
      'Employee Email':
        entry.employeeEmail || '',
      'Employee Name':
        entry.employeeName || '',
      'Review Type':
        entry.reviewType || '',
      'Review Date':
        entry.reviewDate || '',
      'Cycle ID': entry.cycleId || '',
      Result: entry.result || '',
      Details: entry.details || '',
    }
  );
}

function getPrimaryAutomationHr_() {
  const settings = getSettings_();
  const configured = normalizeEmail_(
    settings.AUTOMATION_HR_EMAIL || ''
  );
  const rows = getAllObjects_(PR.SHEETS.HR).filter(
    function (row) {
      return (
        row.Active === true ||
        String(row.Active).toLowerCase() ===
          'true'
      );
    }
  );

  let row = null;

  if (configured) {
    row = rows.find(function (item) {
      return (
        normalizeEmail_(item.Email) ===
        configured
      );
    });
  }

  row = row || rows[0];

  if (!row) {
    throw new Error(
      'No active HR user is configured.'
    );
  }

  return {
    email: normalizeEmail_(row.Email),
    name: String(
      row.Name || row.Email
    ),
  };
}

/* ============================== DATE HELPERS ============================== */

function v31Today_() {
  return v31StartOfDay_(new Date());
}

function v31StartOfDay_(date) {
  const value = v31Date_(date);

  if (!value) return null;

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    12,
    0,
    0,
    0
  );
}

function v31Date_(value) {
  if (!value) return null;

  if (
    Object.prototype.toString.call(value) ===
      '[object Date]' &&
    !Number.isNaN(value.getTime())
  ) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12,
      0,
      0,
      0
    );
  }

  const text = String(value).trim();

  let match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0
    );
  }

  match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[1]) - 1,
      Number(match[2]),
      12,
      0,
      0,
      0
    );
  }

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
        0,
        0,
        0
      );
}

function v31AddDays_(date, days) {
  const value = v31StartOfDay_(date);

  value.setDate(value.getDate() + Number(days));

  return value;
}

function v31AddMonthsClamped_(date, months) {
  const value = v31StartOfDay_(date);
  const originalDay = value.getDate();
  const targetMonth =
    value.getMonth() + Number(months);
  const year =
    value.getFullYear() +
    Math.floor(targetMonth / 12);
  const month =
    ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(originalDay, lastDay),
    12,
    0,
    0,
    0
  );
}

function v31AnniversaryInYear_(hireDate, year) {
  const hire = v31StartOfDay_(hireDate);
  const month = hire.getMonth();
  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(hire.getDate(), lastDay),
    12,
    0,
    0,
    0
  );
}

function v31ShiftWeekendForward_(date) {
  const value = v31StartOfDay_(date);

  if (value.getDay() === 6) {
    return v31AddDays_(value, 2);
  }

  if (value.getDay() === 0) {
    return v31AddDays_(value, 1);
  }

  return value;
}

function v31ShiftWeekendBackward_(date) {
  const value = v31StartOfDay_(date);

  if (value.getDay() === 6) {
    return v31AddDays_(value, -1);
  }

  if (value.getDay() === 0) {
    return v31AddDays_(value, -2);
  }

  return value;
}

function v31DaysBetween_(start, end) {
  const a = v31StartOfDay_(start);
  const b = v31StartOfDay_(end);

  return Math.round(
    (b.getTime() - a.getTime()) /
      86400000
  );
}

function v31SameDate_(a, b) {
  const left = v31Date_(a);
  const right = v31Date_(b);

  return (
    !!left &&
    !!right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function v31Boolean_(value, defaultValue) {
  if (value === '' || value == null) {
    return !!defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  return (
    String(value).trim().toLowerCase() ===
    'true'
  );
}

function v31Integer_(
  value,
  minimum,
  maximum,
  label
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new Error(
      label +
        ' must be a whole number between ' +
        minimum +
        ' and ' +
        maximum +
        '.'
    );
  }

  return number;
}
