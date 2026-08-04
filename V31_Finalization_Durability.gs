/**
 * Delivery C commit 2 durable Calendar/PDF/distribution/finalization helpers.
 * All external Google Workspace calls run outside cycle-row locks.
 */
const V31_FINALIZATION = Object.freeze({
  PDF_STALE_DEFAULT_MINUTES: 30,
  DISTRIBUTION_STALE_DEFAULT_MINUTES: 15,
  AUDIT_STALE_DEFAULT_MINUTES: 15,
  FINAL_DISTRIBUTION_RESEND_TOKEN: 'RESEND_FINAL_DISTRIBUTION_UNKNOWN',
  FINAL_DISTRIBUTION_CONFIRM_TOKEN: 'MARK_FINAL_DISTRIBUTION_CONFIRMED',
  WORKFLOW_CONFIRM_TOKEN: 'MARK_WORKFLOW_NOTIFICATION_CONFIRMED',
  FINALIZATION_EVENT_PREFIX: 'FINALIZATION_COMPLETE:',
  DISTRIBUTION_CONFIRM_EVENT_PREFIX: 'FINAL_DISTRIBUTION_CONFIRMED:',
  WORKFLOW_CONFIRM_EVENT_PREFIX: 'WORKFLOW_NOTIFICATION_CONFIRMED:',
});

function getPositiveSettingMinutes_(key, fallback) {
  const value = Number(getSettings_()[key]);
  return isFinite(value) && value > 0 ? value : Number(fallback);
}

function isClaimStaleMinutes_(startedAt, staleMinutes, nowMs) {
  const started = startedAt ? new Date(startedAt) : null;
  return (
    !started ||
    isNaN(started.getTime()) ||
    Number(nowMs == null ? Date.now() : nowMs) - started.getTime() >
      Number(staleMinutes) * 60000
  );
}

function getCalendarConfigurationAlertKey_(cycleId) {
  return buildSystemAlertKey_(
    cycleId,
    'Calendar Configuration',
    'configuration-warning'
  );
}

function recordCalendarConfigurationAlert_(cycleId, errorMessage) {
  try {
    upsertSystemAlert_({
      alertKey: getCalendarConfigurationAlertKey_(cycleId),
      cycleId: cycleId,
      severity: 'Warning',
      component: 'Calendar Configuration',
      subject: 'AITHERAS review Calendar configuration needs attention',
      details: { error: String(errorMessage || '') },
      lastError: String(errorMessage || ''),
    });
  } catch (alertError) {
    Logger.log(
      'Calendar configuration alert persistence failed: ' +
        String(alertError.message || alertError)
    );
  }
}

function decideCalendarConfigurationAction_(
  status,
  startedAt,
  allowUnknownRecovery,
  stale
) {
  const value = String(status || V31.CALENDAR.PENDING);
  if (value === V31.CALENDAR.CONFIGURED) return 'skip';
  if (value === V31.CALENDAR.CONFIGURING) {
    return stale === true ? 'mark-unknown' : 'in-progress';
  }
  if (value === V31.CALENDAR.UNKNOWN && !allowUnknownRecovery) {
    return 'unknown';
  }
  return 'configure';
}

/**
 * Independently claims and commits event configuration. Creation remains
 * durable even when this idempotent configuration pass needs HR recovery.
 */
function configureCalendarLaunchStepBestEffort_(
  cycleId,
  event,
  allowUnknownRecovery
) {
  if (!event) return { ok: false, reason: 'missing-event' };
  const expectedEventId = String(event.getId() || '');
  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    if (
      !expectedEventId ||
      String(cycle['Calendar Event ID'] || '') !==
        expectedEventId
    ) {
      return { action: 'event-changed', cycle: cycle };
    }
    const status = String(
      cycle['Calendar Configuration Status'] || V31.CALENDAR.PENDING
    );
    const decision = decideCalendarConfigurationAction_(
      status,
      cycle['Calendar Configuration Started At'],
      allowUnknownRecovery,
      status === V31.CALENDAR.CONFIGURING &&
        isDeliveryClaimStale_(
          cycle['Calendar Configuration Started At']
        )
    );
    if (decision === 'skip') {
      return { action: 'skip', cycle: cycle };
    }
    if (decision === 'in-progress') {
      return { action: 'in-progress', cycle: cycle };
    }
    if (decision === 'mark-unknown') {
      cycle['Calendar Configuration Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Calendar Configuration Last Error'] =
        'Calendar configuration claim went stale; external changes may have occurred.';
      cycle['Calendar Configuration Recovery Details JSON'] = JSON.stringify({
        schemaVersion: 1,
        resolution: 'stale-claim',
        originalAttemptId: String(
          cycle['Calendar Configuration Attempt ID'] || ''
        ),
        recordedAt: new Date().toISOString(),
      });
      cycle['Last Launch Error'] =
        'Calendar tag/reminder configuration failed: ' +
        cycle['Calendar Configuration Last Error'];
      cycle['Updated At'] = new Date();
      persistLaunchCycle_(location.rowNumber, cycle);
      return { action: 'unknown', cycle: cycle };
    }
    if (decision === 'unknown') {
      return { action: 'unknown', cycle: cycle };
    }
    const attemptId = Utilities.getUuid();
    cycle['Calendar Configuration Status'] = V31.CALENDAR.CONFIGURING;
    cycle['Calendar Configuration Attempt ID'] = attemptId;
    cycle['Calendar Configuration Started At'] = new Date();
    cycle['Calendar Configuration Last Error'] = '';
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);
    return {
      action: 'configure',
      attemptId: attemptId,
      eventId: expectedEventId,
      cycle: cycle,
    };
  });
  if (claim.action === 'skip') return { ok: true, skipped: true };
  if (claim.action === 'in-progress') {
    return { ok: false, inProgress: true };
  }
  if (claim.action === 'unknown') {
    recordCalendarConfigurationAlert_(
      cycleId,
      claim.cycle['Calendar Configuration Last Error']
    );
    return { ok: false, deliveryUnknown: true };
  }
  if (claim.action === 'event-changed') {
    recordCalendarConfigurationAlert_(
      cycleId,
      'Calendar event changed before configuration was claimed.'
    );
    return { ok: false, reason: 'event-changed' };
  }

  let configError = null;
  const preflight = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const matches =
      String(cycle['Calendar Configuration Attempt ID'] || '') ===
        String(claim.attemptId) &&
      String(cycle['Calendar Event ID'] || '') ===
        String(claim.eventId);
    if (!matches) {
      if (
        String(cycle['Calendar Configuration Attempt ID'] || '') ===
        String(claim.attemptId)
      ) {
        cycle['Calendar Configuration Status'] = V31.CALENDAR.UNKNOWN;
        cycle['Calendar Configuration Last Error'] =
          'Calendar event identity changed before configuration.';
        cycle['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, cycle);
      }
      return false;
    }
    return true;
  });
  if (!preflight) {
    recordCalendarConfigurationAlert_(
      cycleId,
      'Calendar event identity changed before configuration.'
    );
    return { ok: false, deliveryUnknown: true };
  }
  try {
    configureReviewCalendarEvent_(event, claim.cycle, getSettings_());
    maybeInjectExternalSideEffectFault_(
      'AFTER_CALENDAR_CONFIGURATION_BEFORE_PERSISTENCE',
      cycleId
    );
  } catch (error) {
    configError = error;
  }
  const committed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle['Calendar Configuration Attempt ID'] || '') !==
        String(claim.attemptId) ||
      String(cycle['Calendar Event ID'] || '') !==
        String(claim.eventId)
    ) {
      if (
        String(cycle['Calendar Configuration Attempt ID'] || '') ===
        String(claim.attemptId)
      ) {
        cycle['Calendar Configuration Status'] = V31.CALENDAR.UNKNOWN;
        cycle['Calendar Configuration Last Error'] =
          'Calendar event identity changed before configuration result persistence.';
        cycle['Calendar Configuration Recovery Details JSON'] =
          JSON.stringify({
            schemaVersion: 1,
            resolution: 'commit-mismatch',
            originalAttemptId: claim.attemptId,
            recordedAt: new Date().toISOString(),
          });
        cycle['Updated At'] = new Date();
        persistLaunchCycle_(location.rowNumber, cycle);
      }
      return false;
    }
    if (configError) {
      cycle['Calendar Configuration Status'] = V31.CALENDAR.UNKNOWN;
      cycle['Calendar Configuration Last Error'] = String(
        configError.message || configError
      );
      cycle['Calendar Configuration Recovery Details JSON'] = JSON.stringify({
        schemaVersion: 1,
        resolution: 'configuration-unknown',
        originalAttemptId: claim.attemptId,
        error: String(configError.message || configError),
        recordedAt: new Date().toISOString(),
      });
      cycle['Last Launch Error'] =
        'Calendar tag/reminder configuration failed: ' +
        String(configError.message || configError);
    } else {
      cycle['Calendar Configuration Status'] = V31.CALENDAR.CONFIGURED;
      cycle['Calendar Configuration Completed At'] = new Date();
      cycle['Calendar Configuration Attempt ID'] = '';
      cycle['Calendar Configuration Started At'] = '';
      cycle['Calendar Configuration Last Error'] = '';
      cycle['Calendar Configuration Recovery Details JSON'] = '';
      cycle['Calendar Status'] = V31.CALENDAR.CONFIGURED;
      if (isCalendarConfigWarning_(cycle['Last Launch Error'])) {
        cycle['Last Launch Error'] = '';
      }
    }
    cycle['Updated At'] = new Date();
    persistLaunchCycle_(location.rowNumber, cycle);
    return true;
  });
  if (configError || !committed) {
    recordCalendarConfigurationAlert_(
      cycleId,
      configError
        ? String(configError.message || configError)
        : 'Configuration commit could not verify its attempt.'
    );
    return { ok: false, deliveryUnknown: true };
  }
  safelyAutoResolveSystemAlertByKey_(
    getCalendarConfigurationAlertKey_(cycleId),
    function () {
      const fresh = findCycle_(cycleId).object;
      return (
        String(fresh['Calendar Event ID'] || '') === String(event.getId()) &&
        String(fresh['Calendar Configuration Status'] || '') ===
          V31.CALENDAR.CONFIGURED &&
        !!fresh['Calendar Configuration Completed At']
      );
    }
  );
  return { ok: true };
}

function getPdfGenerationStaleMinutes_() {
  return getPositiveSettingMinutes_(
    'PDF_GENERATION_STALE_MINUTES',
    V31_FINALIZATION.PDF_STALE_DEFAULT_MINUTES
  );
}

function getFinalDistributionStaleMinutes_() {
  return getPositiveSettingMinutes_(
    'FINAL_DISTRIBUTION_STALE_MINUTES',
    V31_FINALIZATION.DISTRIBUTION_STALE_DEFAULT_MINUTES
  );
}

function getFinalizationAuditStaleMinutes_() {
  return getPositiveSettingMinutes_(
    'FINALIZATION_AUDIT_STALE_MINUTES',
    V31_FINALIZATION.AUDIT_STALE_DEFAULT_MINUTES
  );
}

function getFinalPdfFields_(documentType) {
  if (documentType === PR.TYPE.MANAGER) {
    return {
      label: 'Manager',
      idField: 'Manager Review PDF ID',
      statusField: 'Manager PDF Status',
      attemptField: 'Manager PDF Attempt ID',
      startedField: 'Manager PDF Started At',
      completedField: 'Manager PDF Completed At',
      errorField: 'Manager PDF Last Error',
      recoveryField: 'Manager PDF Recovery Details JSON',
    };
  }
  if (documentType === PR.TYPE.SELF) {
    return {
      label: 'Self',
      idField: 'Self Evaluation PDF ID',
      statusField: 'Self PDF Status',
      attemptField: 'Self PDF Attempt ID',
      startedField: 'Self PDF Started At',
      completedField: 'Self PDF Completed At',
      errorField: 'Self PDF Last Error',
      recoveryField: 'Self PDF Recovery Details JSON',
    };
  }
  throw new Error('Unsupported PDF document type.');
}

function buildReviewPdfFileName_(cycleId, documentType) {
  const suffix =
    documentType === PR.TYPE.MANAGER
      ? 'Manager_Review_FINAL.pdf'
      : documentType === PR.TYPE.SELF
      ? 'Self_Evaluation_FINAL.pdf'
      : '';
  if (!suffix) throw new Error('Unsupported PDF document type.');
  return 'AITHERAS_' + String(cycleId) + '_' + suffix;
}

function buildLegacyReviewPdfFileNames_(cycleId, documentType) {
  return [
    String(documentType) + ' - ' + String(cycleId) + '.pdf',
  ];
}

function getRecognizedReviewPdfNames_(cycleId, documentType) {
  return [buildReviewPdfFileName_(cycleId, documentType)].concat(
    buildLegacyReviewPdfFileNames_(cycleId, documentType)
  );
}

function assertValidReviewPdfFile_(
  file,
  cycleId,
  documentType,
  folderId
) {
  if (!file) throw new Error('Drive file was not found.');
  if (typeof file.isTrashed === 'function' && file.isTrashed()) {
    throw new Error('Reconciled PDF must not be trashed.');
  }
  const mime = String(file.getMimeType() || '');
  if (mime !== MimeType.PDF && mime !== 'application/pdf') {
    throw new Error('Reconciled file must be application/pdf.');
  }
  if (!isDriveFileInFolder_(file, folderId)) {
    throw new Error(
      'Reconciled PDF must live in the restricted review folder.'
    );
  }
  const names = getRecognizedReviewPdfNames_(cycleId, documentType);
  if (names.indexOf(String(file.getName() || '')) < 0) {
    throw new Error('Reconciled PDF name is not recognized for this cycle.');
  }
}

/** Pure helper: recovered PDF may commit only when expected snapshot still matches. */
function decideRecoveredPdfCommit_(
  expected,
  currentStatus,
  currentAttemptId,
  currentFileId
) {
  const prior = expected || {};
  if (
    String(currentStatus || '') !== String(prior.expectedStatus || '') ||
    String(currentAttemptId || '') !==
      String(prior.expectedAttemptId || '') ||
    String(currentFileId || '') !== String(prior.expectedFileId || '')
  ) {
    return 'state-changed';
  }
  return 'commit';
}

/**
 * Pure helper: Complete is valid only when the deterministic audit row exists.
 * A Complete cycle field without the row is treated as recoverable inconsistency.
 */
function classifyFinalizationAuditConsistency_(status, auditExists) {
  if (auditExists) return 'complete';
  if (String(status || '') === 'Complete') return 'missing-event';
  return 'needs-write';
}

function validateAuthoritativeFinalPdfId_(
  cycleId,
  documentType,
  fileId
) {
  const settings = getSettings_();
  const folderId = String(settings.REVIEW_FOLDER_ID || '');
  const id = String(fileId || '');
  if (!id) {
    throw new Error(
      String(documentType) + ' PDF ID is required before final distribution.'
    );
  }
  assertValidReviewPdfFile_(
    DriveApp.getFileById(id),
    cycleId,
    documentType,
    folderId
  );
  return id;
}

function listMatchingReviewPdfArtifacts_(cycleId, documentType) {
  const settings = getSettings_();
  const folderId = String(settings.REVIEW_FOLDER_ID || '');
  const folder = DriveApp.getFolderById(folderId);
  const matches = [];
  const seen = {};
  getRecognizedReviewPdfNames_(cycleId, documentType).forEach(function (name) {
    const files = folder.getFilesByName(name);
    while (files.hasNext()) {
      const file = files.next();
      try {
        assertValidReviewPdfFile_(
          file,
          cycleId,
          documentType,
          folderId
        );
        const id = String(file.getId());
        if (!seen[id]) {
          seen[id] = true;
          matches.push({
            id: id,
            name: String(file.getName() || ''),
            canonical:
              String(file.getName() || '') ===
              buildReviewPdfFileName_(cycleId, documentType),
            updatedAt: file.getLastUpdated()
              ? file.getLastUpdated().toISOString()
              : '',
          });
        }
      } catch (error) {
        throw new Error(
          'A deterministic PDF-name match failed validation (' +
            String(file.getId() || '') +
            '): ' +
            String(error.message || error)
        );
      }
    }
  });
  return matches;
}

function findExistingReviewPdfId_(cycleId, documentType) {
  const matches = listMatchingReviewPdfArtifacts_(cycleId, documentType);
  if (matches.length === 1) return matches[0].id;
  if (matches.length > 1) {
    const error = new Error(
      'Multiple deterministic ' +
        documentType +
        ' PDF artifacts exist. HR reconciliation is required.'
    );
    error.code = 'AMBIGUOUS_PDF_ARTIFACTS';
    error.candidates = matches;
    throw error;
  }
  return '';
}

function buildPdfRecoveryDetails_(resolution, attemptId, matches, error) {
  return JSON.stringify({
    schemaVersion: 1,
    resolution: String(resolution || ''),
    attemptId: String(attemptId || ''),
    candidates: (matches || []).map(function (item) {
      return { id: String(item.id || ''), name: String(item.name || '') };
    }),
    error: error ? String(error.message || error) : '',
    recordedAt: new Date().toISOString(),
  });
}

function recordPdfAmbiguityAlert_(cycleId, documentType, details) {
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        cycleId,
        'PDF',
        String(documentType) + ':ambiguous'
      ),
      cycleId: cycleId,
      severity: 'Blocking',
      component: 'PDF',
      subject: 'AITHERAS final PDF requires reconciliation',
      details: details || {},
      lastError: String(
        (details && details.error) ||
          'Multiple deterministic PDF artifacts were found.'
      ),
    });
  } catch (alertError) {
    Logger.log(
      'PDF ambiguity alert persistence failed: ' +
        String(alertError.message || alertError)
    );
  }
}

function ensureFinalPdfComponent_(
  cycleId,
  label,
  idField,
  statusField,
  documentType
) {
  const fields = getFinalPdfFields_(documentType);
  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    if (cycle[fields.idField]) {
      return {
        action: 'validate-existing',
        fileId: String(cycle[fields.idField]),
      };
    }
    const status = String(
      cycle[fields.statusField] || V31.DELIVERY.PENDING
    );
    if (status === V31.DELIVERY.SENDING) {
      if (
        !isClaimStaleMinutes_(
          cycle[fields.startedField],
          getPdfGenerationStaleMinutes_()
        )
      ) {
        return { action: 'in-progress' };
      }
      cycle[fields.statusField] = V31.DELIVERY.UNKNOWN;
      cycle[fields.errorField] =
        fields.label +
        ' PDF generation claim exceeded ' +
        getPdfGenerationStaleMinutes_() +
        ' minutes.';
      cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
        'stale-claim',
        cycle[fields.attemptField],
        [],
        cycle[fields.errorField]
      );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return {
        action: 'recover',
        stale: true,
        expectedStatus: V31.DELIVERY.UNKNOWN,
        expectedAttemptId: String(cycle[fields.attemptField] || ''),
        expectedFileId: String(cycle[fields.idField] || ''),
      };
    }
    if (status === V31.DELIVERY.UNKNOWN) {
      return {
        action: 'recover',
        expectedStatus: V31.DELIVERY.UNKNOWN,
        expectedAttemptId: String(cycle[fields.attemptField] || ''),
        expectedFileId: String(cycle[fields.idField] || ''),
      };
    }
    return {
      action: 'recover-or-claim',
      expectedStatus: status,
      expectedAttemptId: String(cycle[fields.attemptField] || ''),
      expectedFileId: String(cycle[fields.idField] || ''),
    };
  });

  if (claim.action === 'validate-existing') {
    let validationError = null;
    try {
      const settings = getSettings_();
      assertValidReviewPdfFile_(
        DriveApp.getFileById(claim.fileId),
        cycleId,
        documentType,
        String(settings.REVIEW_FOLDER_ID || '')
      );
    } catch (error) {
      validationError = error;
    }
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      if (
        String(cycle[fields.idField] || '') !==
        String(claim.fileId)
      ) {
        throw new Error(
          fields.label + ' PDF changed during validation.'
        );
      }
      if (validationError) {
        cycle[fields.statusField] = V31.DELIVERY.UNKNOWN;
        cycle[fields.errorField] =
          'Stored PDF validation failed: ' +
          String(validationError.message || validationError);
        cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
          'stored-id-invalid',
          cycle[fields.attemptField],
          [],
          validationError
        );
      } else {
        cycle[fields.statusField] = V31.DELIVERY.SENT;
        cycle[fields.completedField] =
          cycle[fields.completedField] || new Date();
        cycle[fields.errorField] = '';
      }
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
    if (validationError) {
      recordPdfAmbiguityAlert_(cycleId, documentType, {
        invalidStoredFileId: claim.fileId,
        error: String(
          validationError.message || validationError
        ),
      });
      throw new Error(
        fields.label +
          ' PDF ID is not a valid deterministic restricted PDF. HR reconciliation is required.'
      );
    }
    return;
  }
  if (claim.action === 'in-progress') {
    throw new Error(fields.label + ' PDF generation is already in progress.');
  }

  let matches;
  try {
    matches = listMatchingReviewPdfArtifacts_(cycleId, documentType);
  } catch (searchError) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      if (
        decideRecoveredPdfCommit_(
          claim,
          cycle[fields.statusField],
          cycle[fields.attemptField],
          cycle[fields.idField]
        ) === 'state-changed'
      ) {
        return;
      }
      cycle[fields.statusField] = V31.DELIVERY.UNKNOWN;
      cycle[fields.errorField] =
        'Deterministic PDF recovery search failed: ' +
        String(searchError.message || searchError);
      cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
        'recovery-search-failed',
        cycle[fields.attemptField],
        [],
        searchError
      );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
    recordPdfAmbiguityAlert_(cycleId, documentType, {
      recoverySearchError: String(searchError.message || searchError),
    });
    throw new Error(
      fields.label +
        ' PDF recovery search failed. Generation is blocked to prevent a duplicate artifact.'
    );
  }
  if (matches.length > 1) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      if (
        decideRecoveredPdfCommit_(
          claim,
          cycle[fields.statusField],
          cycle[fields.attemptField],
          cycle[fields.idField]
        ) === 'state-changed'
      ) {
        return;
      }
      cycle[fields.statusField] = V31.DELIVERY.UNKNOWN;
      cycle[fields.errorField] =
        'Multiple deterministic PDF artifacts were found. HR must select one.';
      cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
        'ambiguous',
        cycle[fields.attemptField],
        matches,
        cycle[fields.errorField]
      );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
    recordPdfAmbiguityAlert_(cycleId, documentType, {
      candidateIds: matches.map(function (item) {
        return item.id;
      }),
    });
    throw new Error(
      fields.label +
        ' PDF has multiple deterministic candidates. HR reconciliation is required.'
    );
  }
  if (matches.length === 1) {
    const recoveryCommit = withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      const decision = decideRecoveredPdfCommit_(
        claim,
        cycle[fields.statusField],
        cycle[fields.attemptField],
        cycle[fields.idField]
      );
      if (decision === 'state-changed') {
        return { action: 'state-changed' };
      }
      cycle[fields.idField] = matches[0].id;
      cycle[fields.statusField] = V31.DELIVERY.SENT;
      cycle[fields.completedField] = new Date();
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.errorField] = '';
      cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
        'deterministic-recovery',
        '',
        matches,
        null
      );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return { action: 'committed' };
    });
    if (recoveryCommit.action === 'state-changed') {
      throw new Error(
        fields.label +
          ' PDF state changed during recovery. Refresh and retry.'
      );
    }
    safelyAutoResolveSystemAlertByKey_(
      buildSystemAlertKey_(
        cycleId,
        'PDF',
        String(documentType) + ':ambiguous'
      ),
      function () {
        const fresh = findCycle_(cycleId).object;
        return (
          String(fresh[fields.idField] || '') === String(matches[0].id) &&
          String(fresh[fields.statusField] || '') === V31.DELIVERY.SENT
        );
      }
    );
    return;
  }
  if (claim.action === 'recover') {
    throw new Error(
      fields.label +
        ' PDF is Delivery Unknown and no deterministic artifact was found. HR must confirm regeneration.'
    );
  }

  const attemptId = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const current = String(
      cycle[fields.statusField] || V31.DELIVERY.PENDING
    );
    if (
      current !== V31.DELIVERY.PENDING &&
      current !== V31.DELIVERY.FAILED
    ) {
      throw new Error(fields.label + ' PDF state changed before claim.');
    }
    const id = Utilities.getUuid();
    cycle[fields.statusField] = V31.DELIVERY.SENDING;
    cycle[fields.attemptField] = id;
    cycle[fields.startedField] = new Date();
    cycle[fields.errorField] = '';
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return id;
  });

  let pdfId = '';
  let generationError = null;
  try {
    pdfId = generateReviewPdf_(cycleId, documentType);
    maybeInjectExternalSideEffectFault_(
      'AFTER_PDF_CREATION_BEFORE_PERSISTENCE',
      cycleId
    );
  } catch (error) {
    generationError = error;
  }

  const committed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle[fields.attemptField] || '') !== String(attemptId)
    ) {
      return false;
    }
    if (generationError || !pdfId) {
      cycle[fields.statusField] = V31.DELIVERY.UNKNOWN;
      cycle[fields.errorField] = String(
        (generationError && (generationError.message || generationError)) ||
          'PDF generation result was not returned.'
      );
      cycle[fields.recoveryField] = buildPdfRecoveryDetails_(
        'created-or-generation-unknown',
        attemptId,
        [],
        generationError || cycle[fields.errorField]
      );
    } else {
      cycle[fields.idField] = pdfId;
      cycle[fields.statusField] = V31.DELIVERY.SENT;
      cycle[fields.completedField] = new Date();
      cycle[fields.attemptField] = '';
      cycle[fields.startedField] = '';
      cycle[fields.errorField] = '';
      cycle[fields.recoveryField] = '';
    }
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return true;
  });
  if (generationError || !committed) {
    throw new Error(
      fields.label +
        ' PDF generation is Delivery Unknown. Deterministic recovery must run before regeneration.'
    );
  }
  safelyAutoResolveSystemAlertByKey_(
    buildSystemAlertKey_(
      cycleId,
      'PDF',
      String(documentType) + ':ambiguous'
    ),
    function () {
      const fresh = findCycle_(cycleId).object;
      return (
        !!fresh[fields.idField] &&
        String(fresh[fields.statusField] || '') ===
          V31.DELIVERY.SENT &&
        !String(fresh[fields.errorField] || '')
      );
    }
  );
}

function isValidFinalPacketEmail_(email, domain) {
  const normalized = normalizeEmail_(email);
  const allowed = String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized) &&
    !!allowed &&
    normalized.endsWith('@' + allowed)
  );
}

function getFinalDistributionRecipients_(cycle, settings) {
  const values = [
    normalizeEmail_(cycle['Employee Email']),
    normalizeEmail_(cycle['Manager Email']),
    normalizeEmail_(cycle['HR Email']),
  ];
  const labels = ['Employee', 'Manager', 'cycle HR'];
  values.forEach(function (email, index) {
    if (!isValidFinalPacketEmail_(email, settings.ALLOWED_DOMAIN)) {
      throw new Error(
        labels[index] +
          ' final-packet recipient is blank or invalid. Distribution is blocked.'
      );
    }
  });
  return values;
}

function buildFinalDistributionRecoveryDetails_(
  resolution,
  attemptId,
  recipients,
  error,
  extra
) {
  const details = {
    schemaVersion: 1,
    resolution: String(resolution || ''),
    originalAttemptId: String(attemptId || ''),
    recipients: (recipients || []).slice(),
    error: error ? String(error.message || error) : '',
    recordedAt: new Date().toISOString(),
  };
  Object.keys(extra || {}).forEach(function (key) {
    details[key] = extra[key];
  });
  return JSON.stringify(details);
}

function recordFinalDistributionUnknownAlert_(cycleId, details) {
  try {
    upsertSystemAlert_({
      alertKey: buildSystemAlertKey_(
        cycleId,
        'Final Distribution',
        'delivery-unknown'
      ),
      cycleId: cycleId,
      severity: 'Blocking',
      component: 'Final Distribution',
      subject: 'AITHERAS final packet delivery requires reconciliation',
      details: details || {},
      lastError: String((details && details.error) || ''),
    });
  } catch (alertError) {
    Logger.log(
      'Final distribution alert persistence failed: ' +
        String(alertError.message || alertError)
    );
  }
}

function classifyFinalDistributionCommit_(sendError, committed) {
  return sendError || committed === false
    ? V31.DELIVERY.UNKNOWN
    : V31.DELIVERY.SENT;
}

function ensureFinalDistribution_(cycleId, options) {
  const opts = options || {};
  const settings = getSettings_();
  const preflight = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    return {
      managerPdfId: String(cycle['Manager Review PDF ID'] || ''),
      selfPdfId: String(cycle['Self Evaluation PDF ID'] || ''),
      status: String(
        cycle['Final Distribution Status'] || V31.DELIVERY.PENDING
      ),
    };
  });
  if (preflight.status !== V31.DELIVERY.SENT) {
    try {
      validateAuthoritativeFinalPdfId_(
        cycleId,
        PR.TYPE.MANAGER,
        preflight.managerPdfId
      );
      validateAuthoritativeFinalPdfId_(
        cycleId,
        PR.TYPE.SELF,
        preflight.selfPdfId
      );
    } catch (pdfError) {
      withLock_(function () {
        const location = findCycle_(cycleId);
        const cycle = location.object;
        if (
          String(cycle['Final Distribution Status'] || '') ===
          V31.DELIVERY.SENT
        ) {
          return;
        }
        cycle['Final Distribution Status'] = V31.DELIVERY.FAILED;
        cycle['Final Distribution Last Error'] = String(
          pdfError.message || pdfError
        );
        cycle['Final Distribution Recovery Details JSON'] =
          buildFinalDistributionRecoveryDetails_(
            'pdf-validation-failed',
            cycle['Final Distribution Attempt ID'],
            [],
            pdfError,
            {
              managerPdfId: preflight.managerPdfId,
              selfPdfId: preflight.selfPdfId,
            }
          );
        writeCycle_(location.rowNumber, cycle);
        SpreadsheetApp.flush();
      });
      recordFinalDistributionUnknownAlert_(cycleId, {
        error: String(pdfError.message || pdfError),
        managerPdfId: preflight.managerPdfId,
        selfPdfId: preflight.selfPdfId,
      });
      throw pdfError;
    }
  }
  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    let recipients;
    try {
      recipients = getFinalDistributionRecipients_(cycle, settings);
    } catch (recipientError) {
      cycle['Final Distribution Status'] = V31.DELIVERY.FAILED;
      cycle['Final Distribution Last Error'] = String(
        recipientError.message || recipientError
      );
      cycle['Final Distribution Recovery Details JSON'] =
        buildFinalDistributionRecoveryDetails_(
          'recipient-validation-failed',
          cycle['Final Distribution Attempt ID'],
          [],
          recipientError
        );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      throw recipientError;
    }
    if (
      Array.isArray(opts.expectedRecipients) &&
      JSON.stringify(opts.expectedRecipients.map(normalizeEmail_)) !==
        JSON.stringify(recipients)
    ) {
      throw new Error(
        'Final distribution recipients changed after confirmation. Refresh and confirm again.'
      );
    }
    const status = String(
      cycle['Final Distribution Status'] || V31.DELIVERY.PENDING
    );
    if (
      opts.expectedAttemptId !== undefined &&
      String(cycle['Final Distribution Attempt ID'] || '') !==
        String(opts.expectedAttemptId || '')
    ) {
      throw new Error(
        'Final distribution attempt changed after confirmation. Refresh and confirm again.'
      );
    }
    if (status === V31.DELIVERY.SENT) return { action: 'skip' };
    if (
      status === V31.DELIVERY.UNKNOWN &&
      opts.allowUnknownResend !== true
    ) {
      return { action: 'unknown', recipients: recipients };
    }
    if (status === V31.DELIVERY.SENDING) {
      if (
        !isClaimStaleMinutes_(
          cycle['Final Distribution Started At'],
          getFinalDistributionStaleMinutes_()
        )
      ) {
        return { action: 'in-progress' };
      }
      cycle['Final Distribution Status'] = V31.DELIVERY.UNKNOWN;
      cycle['Final Distribution Last Error'] =
        'Final distribution claim exceeded ' +
        getFinalDistributionStaleMinutes_() +
        ' minutes; delivery may have occurred.';
      cycle['Final Distribution Recovery Details JSON'] =
        buildFinalDistributionRecoveryDetails_(
          'stale-claim',
          cycle['Final Distribution Attempt ID'],
          recipients,
          cycle['Final Distribution Last Error']
        );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return {
        action: 'unknown',
        recipients: recipients,
        error: cycle['Final Distribution Last Error'],
      };
    }
    if (
      String(cycle['Manager Review PDF ID'] || '') !==
        String(preflight.managerPdfId) ||
      String(cycle['Self Evaluation PDF ID'] || '') !==
        String(preflight.selfPdfId) ||
      !cycle['Manager Review PDF ID'] ||
      !cycle['Self Evaluation PDF ID']
    ) {
      throw new Error(
        'Authoritative PDF IDs changed after validation. Refresh and retry final distribution.'
      );
    }
    const attemptId = Utilities.getUuid();
    cycle['Final Distribution Status'] = V31.DELIVERY.SENDING;
    cycle['Final Distribution Attempt ID'] = attemptId;
    cycle['Final Distribution Started At'] = new Date();
    cycle['Final Distribution Last Error'] = '';
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return {
      action: 'send',
      cycle: cycle,
      recipients: recipients,
      attemptId: attemptId,
      managerPdfId: String(cycle['Manager Review PDF ID']),
      selfPdfId: String(cycle['Self Evaluation PDF ID']),
    };
  });
  if (claim.action === 'skip') return;
  if (claim.action === 'in-progress') {
    throw new Error('Final distribution is already in progress.');
  }
  if (claim.action === 'unknown') {
    recordFinalDistributionUnknownAlert_(cycleId, {
      recipients: claim.recipients,
      error: claim.error || 'Delivery Unknown',
    });
    throw new Error(
      'Final distribution is Delivery Unknown. Automatic resend is prohibited.'
    );
  }

  let preSendValidationError = null;
  try {
    validateAuthoritativeFinalPdfId_(
      cycleId,
      PR.TYPE.MANAGER,
      claim.managerPdfId
    );
    validateAuthoritativeFinalPdfId_(
      cycleId,
      PR.TYPE.SELF,
      claim.selfPdfId
    );
  } catch (pdfError) {
    preSendValidationError = pdfError;
  }
  if (preSendValidationError) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      if (
        String(cycle['Final Distribution Attempt ID'] || '') !==
        String(claim.attemptId)
      ) {
        return;
      }
      cycle['Final Distribution Status'] = V31.DELIVERY.FAILED;
      cycle['Final Distribution Last Error'] = String(
        preSendValidationError.message || preSendValidationError
      );
      cycle['Final Distribution Recovery Details JSON'] =
        buildFinalDistributionRecoveryDetails_(
          'pre-send-pdf-validation-failed',
          claim.attemptId,
          claim.recipients,
          preSendValidationError,
          {
            managerPdfId: claim.managerPdfId,
            selfPdfId: claim.selfPdfId,
          }
        );
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
    recordFinalDistributionUnknownAlert_(cycleId, {
      recipients: claim.recipients,
      attemptId: claim.attemptId,
      error: String(
        preSendValidationError.message || preSendValidationError
      ),
      managerPdfId: claim.managerPdfId,
      selfPdfId: claim.selfPdfId,
    });
    throw preSendValidationError;
  }

  let sendError = null;
  try {
    sendCompletedPacket_(claim.cycle, claim.recipients);
    maybeInjectExternalSideEffectFault_(
      'AFTER_FINAL_DISTRIBUTION_BEFORE_PERSISTENCE',
      cycleId
    );
  } catch (error) {
    sendError = error;
  }
  const committed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle['Final Distribution Attempt ID'] || '') !==
      String(claim.attemptId)
    ) {
      return false;
    }
    let currentRecipients = [];
    let recipientError = null;
    try {
      currentRecipients = getFinalDistributionRecipients_(
        cycle,
        settings
      );
    } catch (error) {
      recipientError = error;
    }
    const recipientsChanged =
      recipientError ||
      JSON.stringify(currentRecipients) !==
        JSON.stringify(claim.recipients);
    const pdfIdsChanged =
      String(cycle['Manager Review PDF ID'] || '') !==
        String(claim.managerPdfId) ||
      String(cycle['Self Evaluation PDF ID'] || '') !==
        String(claim.selfPdfId);
    if (sendError) {
      cycle['Final Distribution Status'] = V31.DELIVERY.UNKNOWN;
      cycle['Final Distribution Last Error'] = String(
        sendError.message || sendError
      );
      cycle['Final Distribution Recovery Details JSON'] =
        buildFinalDistributionRecoveryDetails_(
          'send-or-commit-unknown',
          claim.attemptId,
          claim.recipients,
          sendError
        );
    } else if (recipientsChanged || pdfIdsChanged) {
      cycle['Final Distribution Status'] = V31.DELIVERY.UNKNOWN;
      cycle['Final Distribution Last Error'] = pdfIdsChanged
        ? 'Final packet may have been sent, but authoritative PDF IDs changed before commit.'
        : 'Final packet was sent to the claimed recipients, but the authoritative cycle recipients changed before commit.';
      cycle['Final Distribution Recovery Details JSON'] =
        buildFinalDistributionRecoveryDetails_(
          pdfIdsChanged
            ? 'pdf-id-change-after-send'
            : 'recipient-change-after-send',
          claim.attemptId,
          claim.recipients,
          recipientError || cycle['Final Distribution Last Error'],
          {
            currentRecipients: currentRecipients,
            claimedManagerPdfId: claim.managerPdfId,
            claimedSelfPdfId: claim.selfPdfId,
            currentManagerPdfId: String(
              cycle['Manager Review PDF ID'] || ''
            ),
            currentSelfPdfId: String(
              cycle['Self Evaluation PDF ID'] || ''
            ),
          }
        );
    } else {
      cycle['Final Distribution Status'] = V31.DELIVERY.SENT;
      cycle['Final Distribution Sent At'] = new Date();
      cycle['Final Distribution Last Error'] = '';
      cycle['Final Distribution Recovery Details JSON'] = '';
    }
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return true;
  });
  const authoritative = findCycle_(cycleId).object;
  if (
    classifyFinalDistributionCommit_(sendError, committed) !==
      V31.DELIVERY.SENT ||
    String(authoritative['Final Distribution Status'] || '') !==
      V31.DELIVERY.SENT
  ) {
    recordFinalDistributionUnknownAlert_(cycleId, {
      recipients: claim.recipients,
      attemptId: claim.attemptId,
      error: sendError
        ? String(sendError.message || sendError)
        : 'Attempt changed before commit.',
    });
    throw new Error(
      'Final distribution is Delivery Unknown. Automatic resend is prohibited.'
    );
  }
  safelyAutoResolveSystemAlertByKey_(
    buildSystemAlertKey_(
      cycleId,
      'Final Distribution',
      'delivery-unknown'
    ),
    function () {
      const fresh = findCycle_(cycleId).object;
      return (
        String(fresh['Final Distribution Status'] || '') ===
          V31.DELIVERY.SENT && !!fresh['Final Distribution Sent At']
      );
    }
  );
}

function getFinalDistributionRecoveryPlan(cycleId) {
  assertActiveHrDomain_();
  const cycle = findCycle_(String(cycleId || '')).object;
  return {
    cycleId: String(cycleId || ''),
    status: String(cycle['Final Distribution Status'] || ''),
    attemptId: String(cycle['Final Distribution Attempt ID'] || ''),
    recipients: getFinalDistributionRecipients_(cycle, getSettings_()),
  };
}

function resendFinalDistributionUnknown(cycleId, payload) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  if (
    input.confirmed !== true ||
    String(input.confirmationToken || '') !==
      V31_FINALIZATION.FINAL_DISTRIBUTION_RESEND_TOKEN
  ) {
    throw new Error('Exact final-distribution resend confirmation is required.');
  }
  const before = findCycle_(cycleId).object;
  const recipients = getFinalDistributionRecipients_(before, getSettings_());
  if (
    String(before['Final Distribution Status'] || '') !==
      V31.DELIVERY.UNKNOWN ||
    String(input.originalAttemptId || '') !==
      String(before['Final Distribution Attempt ID'] || '') ||
    JSON.stringify(input.recipients || []) !== JSON.stringify(recipients)
  ) {
    throw new Error(
      'Final distribution status or recipients changed. Refresh and confirm again.'
    );
  }
  const resendAuthorizationEventId =
    'FINAL_DISTRIBUTION_RESEND_AUTHORIZED:' +
    String(cycleId) +
    ':' +
    String(input.originalAttemptId || '');
  auditIdempotent_(
    cycleId,
    'Final distribution resend authorized',
    actor,
    V31.DELIVERY.UNKNOWN,
    'Resend Authorized',
    JSON.stringify({ schemaVersion: 1, recipients: recipients }),
    resendAuthorizationEventId
  );
  ensureFinalDistribution_(cycleId, {
    allowUnknownResend: true,
    expectedRecipients: recipients,
    expectedAttemptId: String(input.originalAttemptId || ''),
  });
  const completion = attemptFinalizationCompletionAfterRecovery_(
    cycleId
  );
  return {
    ok: true,
    recipients: recipients,
    finalizationComplete: completion.finalizationComplete,
    partial: completion.partial,
    message: completion.message,
  };
}

function markFinalDistributionConfirmed(cycleId, payload) {
  const actor = assertActiveHrDomain_();
  const input = payload || {};
  const evidenceNote = String(input.evidenceNote || '').trim();
  if (
    input.confirmed !== true ||
    String(input.confirmationToken || '') !==
      V31_FINALIZATION.FINAL_DISTRIBUTION_CONFIRM_TOKEN ||
    !evidenceNote
  ) {
    throw new Error(
      'Confirmation, exact token, and an evidence note are required.'
    );
  }
  const eventId =
    V31_FINALIZATION.DISTRIBUTION_CONFIRM_EVENT_PREFIX + String(cycleId);
  const before = findCycle_(cycleId).object;
  const beforeRecipients = getFinalDistributionRecipients_(
    before,
    getSettings_()
  );
  if (
    String(before['Final Distribution Status'] || '') !==
      V31.DELIVERY.UNKNOWN ||
    String(input.originalAttemptId || '') !==
      String(before['Final Distribution Attempt ID'] || '') ||
    JSON.stringify(input.recipients || []) !==
      JSON.stringify(beforeRecipients)
  ) {
    throw new Error(
      'Final distribution status, attempt, or recipients changed. Refresh and confirm again.'
    );
  }
  const result = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle['Final Distribution Status'] || '') !==
        V31.DELIVERY.UNKNOWN ||
      String(cycle['Final Distribution Attempt ID'] || '') !==
        String(input.originalAttemptId || '')
    ) {
      throw new Error(
        'Only the confirmed Delivery Unknown attempt may be marked Sent.'
      );
    }
    const priorAttempt = String(
      cycle['Final Distribution Attempt ID'] || ''
    );
    const recipients = getFinalDistributionRecipients_(cycle, getSettings_());
    if (
      JSON.stringify(recipients) !==
      JSON.stringify(beforeRecipients)
    ) {
      throw new Error(
        'Final distribution recipients changed before confirmation commit.'
      );
    }
    auditIdempotentUnlocked_(
      cycleId,
      'Final distribution manually confirmed',
      actor,
      V31.DELIVERY.UNKNOWN,
      V31.DELIVERY.SENT,
      evidenceNote,
      eventId
    );
    const confirmedAt = new Date();
    cycle['Final Distribution Status'] = V31.DELIVERY.SENT;
    cycle['Final Distribution Sent At'] =
      cycle['Final Distribution Sent At'] || confirmedAt;
    cycle['Final Distribution Last Error'] = '';
    cycle['Final Distribution Recovery Details JSON'] = JSON.stringify(
      buildManualFinalDistributionConfirmationDetails_(
        actor,
        confirmedAt,
        evidenceNote,
        priorAttempt,
        recipients
      )
    );
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return { recipients: recipients, attemptId: priorAttempt };
  });
  safelyAutoResolveSystemAlertByKey_(
    buildSystemAlertKey_(
      cycleId,
      'Final Distribution',
      'delivery-unknown'
    ),
    function () {
      const fresh = findCycle_(cycleId).object;
      const details = parseJson_(
        fresh['Final Distribution Recovery Details JSON'],
        {}
      );
      return (
        String(fresh['Final Distribution Status'] || '') ===
          V31.DELIVERY.SENT &&
        details.resolution === 'manual-confirmation'
      );
    }
  );
  const completion = attemptFinalizationCompletionAfterRecovery_(
    cycleId
  );
  return {
    ok: true,
    eventId: eventId,
    recipients: result.recipients,
    finalizationComplete: completion.finalizationComplete,
    partial: completion.partial,
    message: completion.message,
  };
}

function buildManualFinalDistributionConfirmationDetails_(
  confirmedBy,
  confirmedAt,
  evidenceNote,
  originalAttemptId,
  recipients
) {
  return {
    schemaVersion: 1,
    resolution: 'manual-confirmation',
    confirmedBy: String(confirmedBy || ''),
    confirmedAt: new Date(confirmedAt).toISOString(),
    priorStatus: V31.DELIVERY.UNKNOWN,
    evidenceNote: String(evidenceNote || ''),
    originalAttemptId: String(originalAttemptId || ''),
    recipients: (recipients || []).slice(),
  };
}

function attemptFinalizationCompletionAfterRecovery_(cycleId) {
  try {
    const result = finalizeReviewCycle_(cycleId);
    return {
      finalizationComplete: !!(result && result.ok),
      partial: false,
      message:
        (result && result.message) ||
        'Finalization completion gate passed.',
    };
  } catch (error) {
    return {
      finalizationComplete: false,
      partial: true,
      message:
        'Recovery was persisted, but finalization still needs attention: ' +
        String(error.message || error),
    };
  }
}

/**
 * Inserts Event ID after Timestamp without shifting historical row meaning.
 * Existing rows receive a blank cell; no synthetic event IDs are backfilled.
 */
function ensureReviewAuditEventIdHeader_(sheet) {
  if (
    sheet &&
    JSON.stringify(
      getHeaders_(sheet).slice(0, PR.AUDIT_HEADERS.length)
    ) === JSON.stringify(PR.AUDIT_HEADERS)
  ) {
    return;
  }
  return withLock_(function () {
    return ensureReviewAuditEventIdHeaderUnlocked_(sheet);
  });
}

function ensureReviewAuditEventIdHeaderUnlocked_(sheet) {
  if (!sheet) {
    throw new Error('ReviewAuditLog sheet is required.');
  }
  const headers = getHeaders_(sheet);
  if (!headers.length || headers.every(function (value) { return !value; })) {
    sheet
      .getRange(1, 1, 1, PR.AUDIT_HEADERS.length)
      .setValues([PR.AUDIT_HEADERS]);
    return;
  }
  const plan = planReviewAuditHeaderMigration_(headers);
  if (plan.action === 'insert') {
    const insertAfter = plan.insertAfterColumn;
    sheet.insertColumnAfter(insertAfter);
    sheet.getRange(1, insertAfter + 1).setValue('Event ID');
  } else if (plan.action === 'move') {
    const oldValues = sheet
      .getRange(
        1,
        plan.sourceColumn,
        Math.max(sheet.getLastRow(), 1),
        1
      )
      .getValues();
    const insertAfter = plan.insertAfterColumn;
    sheet.insertColumnAfter(insertAfter);
    sheet
      .getRange(1, insertAfter + 1, oldValues.length, 1)
      .setValues(oldValues);
    const shiftedOldColumn =
      plan.sourceColumn > insertAfter
        ? plan.sourceColumn + 1
        : plan.sourceColumn;
    sheet.deleteColumn(shiftedOldColumn);
  }
  ensureHeaders_(sheet, PR.AUDIT_HEADERS);
}

function assertReviewAuditSchema_() {
  const sheet = getSpreadsheet_().getSheetByName(PR.SHEETS.AUDIT);
  if (!sheet) {
    throw new Error('ReviewAuditLog sheet is missing.');
  }
  const actual = getHeaders_(sheet).slice(
    0,
    PR.AUDIT_HEADERS.length
  );
  if (JSON.stringify(actual) !== JSON.stringify(PR.AUDIT_HEADERS)) {
    throw new Error(
      'ReviewAuditLog schema is not migrated. Run upgradeToV31_ before writing audit events.'
    );
  }
  return sheet;
}

function planReviewAuditHeaderMigration_(headers) {
  const values = headers || [];
  const timestampIndex = values.indexOf('Timestamp');
  const eventIndex = values.indexOf('Event ID');
  const insertAfterColumn = timestampIndex >= 0 ? timestampIndex + 1 : 1;
  if (eventIndex < 0) {
    return {
      action: 'insert',
      insertAfterColumn: insertAfterColumn,
      historicalEventIds: 'blank',
    };
  }
  if (timestampIndex >= 0 && eventIndex !== timestampIndex + 1) {
    return {
      action: 'move',
      insertAfterColumn: insertAfterColumn,
      sourceColumn: eventIndex + 1,
      historicalEventIds: 'preserve',
    };
  }
  return {
    action: 'none',
    insertAfterColumn: insertAfterColumn,
    historicalEventIds: 'preserve',
  };
}

function findAuditByEventId_(eventId) {
  const wanted = String(eventId || '').trim();
  if (!wanted) return null;
  const rows = getAllObjects_(PR.SHEETS.AUDIT);
  for (let index = rows.length - 1; index >= 0; index--) {
    if (String(rows[index]['Event ID'] || '') === wanted) return rows[index];
  }
  return null;
}

function auditIdempotent_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details,
  eventId
) {
  const wanted = String(eventId || '').trim();
  if (!wanted) {
    throw new Error('Deterministic audit Event ID is required.');
  }
  return withLock_(function () {
    return auditIdempotentUnlocked_(
      cycleId,
      action,
      actorEmail,
      previousStatus,
      newStatus,
      details,
      wanted
    );
  });
}

function auditIdempotentUnlocked_(
  cycleId,
  action,
  actorEmail,
  previousStatus,
  newStatus,
  details,
  eventId
) {
  const wanted = String(eventId || '').trim();
  const existing = findAuditByEventId_(wanted);
  if (existing) return existing;
  audit_(
    cycleId,
    action,
    actorEmail,
    previousStatus,
    newStatus,
    details,
    wanted
  );
  SpreadsheetApp.flush();
  const committed = findAuditByEventId_(wanted);
  if (!committed) {
    throw new Error(
      'Deterministic audit event could not be verified: ' + wanted
    );
  }
  return committed;
}

function getFinalizationAuditEventId_(cycleId) {
  return V31_FINALIZATION.FINALIZATION_EVENT_PREFIX + String(cycleId);
}

function ensureFinalizationAudit_(cycleId) {
  const eventId = getFinalizationAuditEventId_(cycleId);
  const claim = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    const existingAudit = findAuditByEventId_(eventId);
    const consistency = classifyFinalizationAuditConsistency_(
      cycle['Finalization Audit Status'],
      !!existingAudit
    );
    if (consistency === 'complete') {
      cycle['Finalization Audit Status'] = 'Complete';
      cycle['Finalization Audit Completed At'] =
        cycle['Finalization Audit Completed At'] || new Date();
      cycle['Finalization Audit Event ID'] = eventId;
      cycle['Finalization Audit Attempt ID'] = '';
      cycle['Finalization Audit Started At'] = '';
      cycle['Finalization Audit Last Error'] = '';
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      return { action: 'complete' };
    }
    const status = String(
      cycle['Finalization Audit Status'] || 'Pending'
    );
    if (consistency === 'missing-event') {
      cycle['Finalization Audit Status'] = 'Delivery Unknown';
      cycle['Finalization Audit Last Error'] =
        'Cycle reported a complete audit, but the deterministic audit event is missing.';
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    } else if (status === 'Writing') {
      if (
        !isClaimStaleMinutes_(
          cycle['Finalization Audit Started At'],
          getFinalizationAuditStaleMinutes_()
        )
      ) {
        return { action: 'in-progress' };
      }
      cycle['Finalization Audit Status'] = 'Delivery Unknown';
      cycle['Finalization Audit Last Error'] =
        'Finalization audit claim went stale.';
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    }
    const attemptId = Utilities.getUuid();
    cycle['Finalization Audit Status'] = 'Writing';
    cycle['Finalization Audit Attempt ID'] = attemptId;
    cycle['Finalization Audit Started At'] = new Date();
    cycle['Finalization Audit Event ID'] = eventId;
    cycle['Finalization Audit Last Error'] = '';
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return { action: 'write', attemptId: attemptId };
  });
  if (claim.action === 'complete') return;
  if (claim.action === 'in-progress') {
    throw new Error('Finalization audit is already being written.');
  }
  let auditError = null;
  try {
    auditIdempotent_(
      cycleId,
      'Review finalization complete',
      getEffectiveAutomationUserEmail_(),
      PR.CYCLE.FINALIZING,
      PR.CYCLE.COMPLETE,
      JSON.stringify({ schemaVersion: 1 }),
      eventId
    );
  } catch (error) {
    auditError = error;
  }
  const eventExists = !!findAuditByEventId_(eventId);
  withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = location.object;
    if (
      String(cycle['Finalization Audit Attempt ID'] || '') !==
      String(claim.attemptId)
    ) {
      return;
    }
    if (eventExists) {
      cycle['Finalization Audit Status'] = 'Complete';
      cycle['Finalization Audit Completed At'] = new Date();
      cycle['Finalization Audit Attempt ID'] = '';
      cycle['Finalization Audit Started At'] = '';
      cycle['Finalization Audit Last Error'] = '';
    } else {
      cycle['Finalization Audit Status'] = 'Delivery Unknown';
      cycle['Finalization Audit Last Error'] = String(
        (auditError && (auditError.message || auditError)) ||
          'Audit event could not be verified.'
      );
    }
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
  });
  if (!eventExists) {
    throw new Error('Finalization audit is Delivery Unknown.');
  }
}

function finalizationCompletionGate_(cycle) {
  return (
    !!cycle['Manager Review PDF ID'] &&
    String(cycle['Manager PDF Status'] || '') === V31.DELIVERY.SENT &&
    !!cycle['Self Evaluation PDF ID'] &&
    String(cycle['Self PDF Status'] || '') === V31.DELIVERY.SENT &&
    String(cycle['Final Distribution Status'] || '') ===
      V31.DELIVERY.SENT &&
    String(cycle['Finalization Audit Status'] || '') === 'Complete' &&
    String(cycle['Finalization Audit Event ID'] || '') ===
      getFinalizationAuditEventId_(cycle['Cycle ID'])
  );
}

function finalizeReviewCycle_(cycleId) {
  const claimed = withLock_(function () {
    const location = findCycle_(cycleId);
    const cycle = applyV31DefaultsToCycle_(
      location.object,
      location.object['Cycle Source'] || 'Manual'
    );
    const signatures = getCombinedSignatureState_(cycle);
    if (
      !signatures.managerSigned ||
      !signatures.employeeSigned ||
      !signatures.hrSigned
    ) {
      throw new Error(
        'Finalization requires manager, employee, and HR signatures.'
      );
    }
    if (String(cycle.Status || '') === PR.CYCLE.COMPLETE) {
      return { alreadyComplete: true, cycle: cycle };
    }
    if (
      String(cycle.Status || '') !== PR.CYCLE.FINALIZING &&
      String(cycle.Status || '') !== PR.CYCLE.SIGNATURES
    ) {
      throw new Error(
        'This review cycle is not ready for finalization.'
      );
    }
    cycle.Status = PR.CYCLE.FINALIZING;
    cycle['Finalization Attempt Count'] =
      Number(cycle['Finalization Attempt Count'] || 0) + 1;
    cycle['Updated At'] = new Date();
    writeCycle_(location.rowNumber, cycle);
    SpreadsheetApp.flush();
    return { alreadyComplete: false, cycle: cycle };
  });
  if (claimed.alreadyComplete) {
    return {
      ok: true,
      alreadyComplete: true,
      message: 'This review is already complete.',
      components: getFinalizationSummary_(claimed.cycle),
    };
  }
  try {
    ensureFinalPdfComponent_(
      cycleId,
      'Manager',
      'Manager Review PDF ID',
      'Manager PDF Status',
      PR.TYPE.MANAGER
    );
    ensureFinalPdfComponent_(
      cycleId,
      'Self',
      'Self Evaluation PDF ID',
      'Self PDF Status',
      PR.TYPE.SELF
    );
    ensureFinalDistribution_(cycleId);
    ensureFinalizationAudit_(cycleId);
    const completed = withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      const eventId = getFinalizationAuditEventId_(cycleId);
      if (
        !finalizationCompletionGate_(cycle) ||
        !findAuditByEventId_(eventId)
      ) {
        throw new Error(
          'Complete is blocked until PDFs, distribution, and finalization audit are durably complete.'
        );
      }
      cycle.Status = PR.CYCLE.COMPLETE;
      cycle['Completed At'] = cycle['Completed At'] || new Date();
      cycle['Manager Review Status'] = PR.DOC.COMPLETE;
      cycle['Self Evaluation Status'] = PR.DOC.COMPLETE;
      cycle['Finalization Last Error'] = '';
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
      invalidatePreviousReviewCachesForEmployee_(cycle);
      return cycle;
    });
    return {
      ok: true,
      message:
        'Final PDFs, packet distribution, and finalization audit are complete.',
      components: getFinalizationSummary_(completed),
    };
  } catch (error) {
    withLock_(function () {
      const location = findCycle_(cycleId);
      const cycle = location.object;
      if (String(cycle.Status || '') !== PR.CYCLE.COMPLETE) {
        cycle.Status = PR.CYCLE.FINALIZING;
      }
      cycle['Finalization Last Error'] = String(error.message || error);
      cycle['Updated At'] = new Date();
      writeCycle_(location.rowNumber, cycle);
      SpreadsheetApp.flush();
    });
    throw error;
  }
}

function maybeInjectExternalSideEffectFault_(point, cycleId) {
  const settings = getSettings_();
  if (!v31Boolean_(settings.ENABLE_FAULT_INJECTION, false)) return;
  if (String(settings.ENVIRONMENT || '') !== 'Sandbox') {
    throw new Error('Fault injection is prohibited outside Sandbox.');
  }
  if (
    String(settings.FAULT_POINT || '') !== String(point) ||
    (settings.FAULT_CYCLE_ID &&
      String(settings.FAULT_CYCLE_ID) !== String(cycleId))
  ) {
    return;
  }
  if (v31Boolean_(settings.FAULT_ONCE, true)) {
    persistAutomationSettings_({
      ENABLE_FAULT_INJECTION: 'false',
      FAULT_POINT: '',
    });
  }
  throw new Error('Sandbox fault injected at ' + String(point) + '.');
}
