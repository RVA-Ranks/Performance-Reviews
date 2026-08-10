/**
 * Delivery B signature claim, migration, and artifact tests.
 * Run from Apps Script editor: runV31SignatureTests_()
 */
function runV31SignatureTests_() {
  const cases = [
    sigCase_('Attempt filename includes cycle role and attempt', function () {
      assertSig_(
        buildSignatureAttemptFileName_('c1', PR.ROLE.MANAGER, 'a1') ===
          'AITHERAS_c1_MANAGER_SIGNATURE_ATTEMPT_a1.png',
        'Unexpected attempt filename.'
      );
    }),
    sigCase_('Canonical winner filename is deterministic', function () {
      assertSig_(
        buildCanonicalSignatureFileName_('c1', PR.ROLE.HR) ===
          'AITHERAS_c1_HR_SIGNATURE.png',
        'Unexpected canonical filename.'
      );
    }),
    sigCase_('Provenance marker binds cycle role and attempt', function () {
      const marker = buildSignatureProvenanceMarker_(
        'c1',
        PR.ROLE.EMPLOYEE,
        'a1',
        'created'
      );
      assertSig_(
        marker.indexOf('cycleId=c1') >= 0 &&
          marker.indexOf('role=EMPLOYEE') >= 0 &&
          marker.indexOf('attemptId=a1') >= 0,
        'Provenance marker is incomplete.'
      );
    }),
    sigCase_('Every safe-trash condition is required', function () {
      const checks = safeSignatureChecks_();
      assertSig_(
        isSafeToTrashSignatureArtifact_(checks),
        'All-positive checks should be safe.'
      );
      Object.keys(checks).forEach(function (key) {
        const changed = Object.assign({}, checks);
        changed[key] =
          key === 'referencedByCycle' ||
          key === 'isWinningFile' ||
          key === 'recoveredCandidate'
            ? true
            : false;
        assertSig_(
          !isSafeToTrashSignatureArtifact_(changed),
          'Condition must block automatic trash: ' + key
        );
      });
    }),
    sigCase_('Recovered candidate is never auto-trashed', function () {
      const checks = safeSignatureChecks_();
      checks.recoveredCandidate = true;
      assertSig_(
        !isSafeToTrashSignatureArtifact_(checks),
        'Recovered file must not be auto-trashed.'
      );
    }),
    sigCase_('Winner is never auto-trashed', function () {
      const checks = safeSignatureChecks_();
      checks.isWinningFile = true;
      assertSig_(
        !isSafeToTrashSignatureArtifact_(checks),
        'Winning file must not be auto-trashed.'
      );
    }),
    sigCase_('Folder provisioning creates at zero matches', function () {
      assertSig_(
        decideSignatureRecoveryFolderProvisioning_([]).action ===
          'create',
        'Zero matches must create.'
      );
    }),
    sigCase_('Folder provisioning reuses one match', function () {
      const candidate = { folderId: 'f1' };
      const decision =
        decideSignatureRecoveryFolderProvisioning_([candidate]);
      assertSig_(
        decision.action === 'reuse' &&
          decision.candidate === candidate,
        'One match must be reused.'
      );
    }),
    sigCase_('Folder provisioning blocks multiple matches', function () {
      const decision =
        decideSignatureRecoveryFolderProvisioning_([
          { folderId: 'f1' },
          { folderId: 'f2' },
        ]);
      assertSig_(
        decision.action === 'block' &&
          decision.code ===
            'MULTIPLE_SIGNATURE_RECOVERY_FOLDERS',
        'Multiple matches must block.'
      );
    }),
    sigCase_('Matching legacy IDs normalize to Signed', function () {
      const cycle = legacySignatureCycle_('same', 'same');
      const plan = planLegacySignatureNormalization_(
        cycle,
        PR.ROLE.MANAGER,
        {},
        function () { return true; }
      );
      assertSig_(
        plan.status === V31.SIGNATURE.SIGNED &&
          plan.fileId === 'same' &&
          !plan.snapshotNormalizedId,
        'Matching valid legacy IDs must normalize.'
      );
    }),
    sigCase_('One missing legacy ID becomes Unknown', function () {
      const plan = planLegacySignatureNormalization_(
        legacySignatureCycle_('one', ''),
        PR.ROLE.MANAGER,
        {},
        function () { return true; }
      );
      assertSig_(
        plan.status === V31.SIGNATURE.UNKNOWN &&
          !plan.fileId,
        'Incomplete legacy IDs must remain unresolved.'
      );
    }),
    sigCase_('Conflicting legacy IDs become Unknown', function () {
      const plan = planLegacySignatureNormalization_(
        legacySignatureCycle_('one', 'two'),
        PR.ROLE.MANAGER,
        {},
        function () { return true; }
      );
      assertSig_(
        plan.status === V31.SIGNATURE.UNKNOWN &&
          !plan.fileId,
        'Conflicting legacy IDs must remain unresolved.'
      );
    }),
    sigCase_('Existing normalized winner is preserved', function () {
      const cycle = legacySignatureCycle_('winner', 'winner');
      cycle['Manager Signature File ID'] = 'winner';
      cycle['Manager Signature Status'] = V31.SIGNATURE.SIGNED;
      const plan = planLegacySignatureNormalization_(
        cycle,
        PR.ROLE.MANAGER,
        {},
        function () { return true; }
      );
      assertSig_(
        plan.fileId === 'winner' &&
          plan.event === 'normalized-role-preserved' &&
          plan.preserve === true,
        'Existing authoritative winner must be preserved.'
      );
    }),
    sigCase_('Migration does not invent attempt IDs', function () {
      const plan = planLegacySignatureNormalization_(
        legacySignatureCycle_('same', 'same'),
        PR.ROLE.MANAGER,
        {},
        function () { return true; }
      );
      assertSig_(
        !Object.prototype.hasOwnProperty.call(plan, 'attemptId'),
        'Legacy normalization must not invent an attempt.'
      );
    }),
    sigCase_('Superseded response never reports signature recorded', function () {
      const result = buildSupersededSignatureResult_({
        disposition: 'trashed',
      });
      assertSig_(
        result.ok &&
          result.superseded &&
          result.signatureRecorded === false &&
          result.message.indexOf('not attached') >= 0,
        'Superseded response shape is incorrect.'
      );
    }),
    sigCase_('Commit reread classifies matching winner as committed', function () {
      assertSig_(
        decideSignatureCommitOutcome_(
          'file-a',
          V31.SIGNATURE.SIGNED,
          'file-a'
        ) === V31.SIGNATURE_COMMIT_OUTCOME.COMMITTED,
        'Matching Signed winner must be committed.'
      );
    }),
    sigCase_('Commit reread classifies different winner as superseded', function () {
      assertSig_(
        decideSignatureCommitOutcome_(
          'file-b',
          V31.SIGNATURE.SIGNED,
          'file-a'
        ) === V31.SIGNATURE_COMMIT_OUTCOME.SUPERSEDED,
        'Different Signed winner must supersede this attempt.'
      );
    }),
    sigCase_('Commit reread preserves no-winner artifact as unknown', function () {
      assertSig_(
        decideSignatureCommitOutcome_(
          '',
          V31.SIGNATURE.UNKNOWN,
          'file-a'
        ) === V31.SIGNATURE_COMMIT_OUTCOME.UNKNOWN,
        'No-winner reread must be commit unknown.'
      );
    }),
    sigCase_('Exact legacy filename is the only trusted name', function () {
      const exact = buildLegacySignatureFileName_(
        'cycle-1',
        PR.ROLE.MANAGER
      );
      assertSig_(
        exact ===
          'cycle-1 - Combined_Review_Packet_-_Manager.png',
        'Legacy name casing or shape changed.'
      );
      assertSig_(
        exact !==
          'copy cycle-1 - Combined_Review_Packet_-_Manager.png',
        'Near-match legacy names must not be trusted.'
      );
    }),
    sigCase_('Structured provenance parser rejects free-form text', function () {
      const exact = buildSignatureProvenanceMarker_(
        'cycle-1',
        PR.ROLE.MANAGER,
        'attempt-1',
        'created'
      );
      assertSig_(
        parseSignatureProvenance_(exact).attemptId ===
          'attempt-1',
        'Exact provenance must parse.'
      );
      assertSig_(
        parseSignatureProvenance_(
          exact + '\nfree-form-extra=true'
        ) === null,
        'Extended free-form descriptions must be rejected.'
      );
    }),
    sigCase_('Role fields separate active winner recovery and warnings', function () {
      const fields = getSignatureClaimFields_(PR.ROLE.MANAGER);
      const distinct = [
        fields.attemptField,
        fields.winningAttemptField,
        fields.recoveryAttemptField,
        fields.errorField,
        fields.artifactWarningField,
        fields.auditWarningField,
        fields.reconciliationAttemptField,
      ];
      assertSig_(
        distinct.filter(function (value, index) {
          return distinct.indexOf(value) === index;
        }).length === distinct.length,
        'Signature recovery concepts must use distinct fields.'
      );
    }),
    {
      name: 'True concurrent identical and different submissions',
      severity: 'Blocking',
      skip: true,
      skipMessage:
        'Requires Daniel Sandbox live two-account evidence on fix/concurrent-signature-handoff',
    },
    sigCase_('Zero attempt artifacts classify as Failed retryable', function () {
      const classified = classifySignatureAttemptScanResult_(
        { matches: [], complete: true, error: null },
        new Error('createFile failed')
      );
      assertSig_(
        classified.status === V31.SIGNATURE.FAILED,
        'Clean zero-artifact failure must be Failed'
      );
      assertSig_(
        classified.clearClaim === true,
        'Failed must clear claim for ordinary retry'
      );
    }),
    sigCase_('Exactly one attempt artifact self-heals', function () {
      const classified = classifySignatureAttemptScanResult_(
        {
          matches: [{ fileId: 'sig-1', attemptId: 'a1' }],
          complete: true,
          error: null,
        },
        new Error('persist died')
      );
      assertSig_(
        classified.artifact && classified.artifact.fileId === 'sig-1',
        'Single candidate must be adopted'
      );
    }),
    sigCase_('Multiple attempt artifacts are Delivery Unknown', function () {
      const classified = classifySignatureAttemptScanResult_(
        {
          matches: [{ fileId: 'a' }, { fileId: 'b' }],
          complete: true,
          error: null,
        },
        new Error('ambiguous')
      );
      assertSig_(
        classified.status === V31.SIGNATURE.UNKNOWN,
        'Ambiguous artifacts must be Unknown'
      );
    }),
    sigCase_('Incomplete attempt search is Delivery Unknown not Failed', function () {
      const classified = classifySignatureAttemptScanResult_(
        { matches: [], complete: false, error: 'Drive down' },
        new Error('create failed')
      );
      assertSig_(
        classified.status === V31.SIGNATURE.UNKNOWN,
        'Incomplete search must not be Failed'
      );
    }),
    sigCase_('Failed persistence requires Signing + exact Attempt ID', function () {
      assertSig_(
        canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.SIGNING,
          'attempt-A',
          'attempt-A'
        ),
        'Matching Signing claim may persist Failed'
      );
      assertSig_(
        !canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.SIGNING,
          'attempt-B',
          'attempt-A'
        ),
        'Attempt B must block Attempt A Failed write'
      );
      assertSig_(
        !canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.SIGNING,
          '',
          'attempt-A'
        ),
        'Cleared Attempt ID must block stale Failed write'
      );
      assertSig_(
        !canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.FAILED,
          'attempt-A',
          'attempt-A'
        ),
        'Non-Signing status must block Failed write'
      );
    }),
    sigCase_('Unknown persistence uses the same exact claim ownership rule', function () {
      assertSig_(
        canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.SIGNING,
          'a1',
          'a1'
        ),
        'Matching Signing claim may persist Unknown'
      );
      assertSig_(
        !canPersistSignatureClaimOutcome_(
          V31.SIGNATURE.PENDING,
          'a1',
          'a1'
        ),
        'Pending status must not accept Unknown overwrite from stale claim'
      );
    }),
    {
      name: 'Audit failure after authoritative signature commit',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Sheet write failure preserves ambiguous artifact',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Concurrent durable HR reconciliation claims',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Recovery folder crash and concurrent provisioning',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Real Drive trash, movement, and permission rejection',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
    {
      name: 'Signature appears on both final PDFs',
      severity: 'Blocking',
      skip: true,
      skipMessage: 'Requires Daniel Sandbox',
    },
  ];
  return runStructuredV31Suite_('V31 Signature Tests', cases);
}

/**
 * Executes one explicitly confirmed live-boundary test in Daniel's Sandbox.
 * This harness never sends operational alert email and always disables the
 * one-shot fault setting before returning.
 */
function runV31SignatureSandboxHarness_(payload) {
  const input = payload || {};
  const settings = getSettings_();
  if (
    String(settings.ENVIRONMENT || '') !== 'Sandbox' ||
    String(input.confirmationToken || '') !==
      'DANIEL_SIGNATURE_SANDBOX'
  ) {
    throw new Error(
      'Requires Daniel Sandbox and confirmationToken DANIEL_SIGNATURE_SANDBOX.'
    );
  }

  const operation = String(input.operation || '');
  const cycleId = String(input.cycleId || '');
  const role = String(input.role || '');
  const faultPoint = String(input.faultPoint || '');
  const allowedFaults = [
    'AFTER_SIGNATURE_ARTIFACT_CREATED',
    'BEFORE_SIGNATURE_WINNER_WRITE',
    'AFTER_SIGNATURE_WINNER_WRITE_BEFORE_FLUSH',
    'SIGNATURE_AUDIT_APPEND',
    'AFTER_SIGNATURE_RECONCILIATION_CLAIM',
    'AFTER_SIGNATURE_RECONCILIATION_VALIDATION',
    'BEFORE_SIGNATURE_RECONCILIATION_WRITE',
    'AFTER_SIGNATURE_RECONCILIATION_WRITE_BEFORE_FLUSH',
    'AFTER_SIGNATURE_RECOVERY_FOLDER_CREATION',
  ];
  if (
    faultPoint &&
    allowedFaults.indexOf(faultPoint) < 0
  ) {
    throw new Error('Unsupported signature sandbox fault point.');
  }
  if (
    cycleId &&
    [PR.ROLE.MANAGER, PR.ROLE.EMPLOYEE, PR.ROLE.HR].indexOf(
      role
    ) < 0
  ) {
    throw new Error(
      'A valid role is required for cycle-backed signature evidence.'
    );
  }

  if (faultPoint) {
    persistAutomationSettings_({
      ENABLE_FAULT_INJECTION: 'true',
      FAULT_POINT: faultPoint,
      FAULT_CYCLE_ID: cycleId,
      FAULT_ONCE: 'true',
    });
  }

  let result = null;
  let errorText = '';
  try {
    if (operation === 'sign') {
      result = signReviewCycle(
        cycleId,
        String(input.signatureDataUrl || '')
      );
    } else if (operation === 'reconcile') {
      result = reconcileSignature(
        cycleId,
        role,
        'chooseFile',
        { fileId: String(input.fileId || '') }
      );
    } else if (operation === 'provisionRecoveryFolder') {
      result = provisionSignatureRecoveryFolder_();
    } else {
      throw new Error(
        'operation must be sign, reconcile, or provisionRecoveryFolder.'
      );
    }
  } catch (error) {
    errorText = String(error.message || error);
  } finally {
    persistAutomationSettings_({
      ENABLE_FAULT_INJECTION: 'false',
      FAULT_POINT: '',
      FAULT_CYCLE_ID: '',
    });
  }

  let evidence = null;
  if (cycleId) {
    const cycle = findCycle_(cycleId).object;
    const fields = getSignatureClaimFields_(role);
    evidence = {
      account: getCurrentUserEmail_(),
      cycleId: cycleId,
      role: role,
      signatureStatus: String(cycle[fields.statusField] || ''),
      activeAttemptId: String(cycle[fields.attemptField] || ''),
      winningAttemptId: String(
        cycle[fields.winningAttemptField] || ''
      ),
      authoritativeFileId: String(
        cycle[fields.fileField] || ''
      ),
      recoveryFileId: String(
        cycle[fields.recoveryFileField] || ''
      ),
      recoveryAttemptId: String(
        cycle[fields.recoveryAttemptField] || ''
      ),
      reconciliationStatus: String(
        cycle[fields.reconciliationStatusField] || ''
      ),
      reconciliationSelectedFileId: String(
        cycle[fields.reconciliationSelectedFileField] || ''
      ),
      artifactWarning: String(
        cycle[fields.artifactWarningField] || ''
      ),
      auditWarning: String(
        cycle[fields.auditWarningField] || ''
      ),
      lastError: String(cycle[fields.errorField] || ''),
    };
  }

  const expectedStatus = String(input.expectedStatus || '');
  const actualStatus = evidence
    ? evidence.signatureStatus
    : '';
  return {
    status:
      expectedStatus && actualStatus !== expectedStatus
        ? 'Failed'
        : errorText && !input.expectError
        ? 'Failed'
        : 'Passed',
    testName: String(input.testName || operation),
    account: getCurrentUserEmail_(),
    cycleId: cycleId,
    faultPoint: faultPoint,
    expectedResult: String(input.expectedResult || ''),
    actualResult: result,
    error: errorText,
    evidence: evidence,
    cleanupCompleted: false,
    evidenceReminder:
      'Attach Apps Script logs or screenshots and record manual cleanup before approval.',
  };
}

function sigCase_(name, fn) {
  return { name: name, severity: 'Blocking', run: fn };
}

function assertSig_(condition, message) {
  if (!condition) throw new Error(message);
}

function safeSignatureChecks_() {
  return {
    createdByCurrentAttempt: true,
    referencedByCycle: false,
    isWinningFile: false,
    recoveredCandidate: false,
    expectedFolder: true,
    deterministicAttemptName: true,
    provenanceMarkerMatches: true,
  };
}

function legacySignatureCycle_(managerId, selfId) {
  return {
    'Cycle ID': 'cycle-1',
    'Manager Signature File ID': '',
    'Manager Signature Status': '',
    'Manager Signature Last Error': '',
    'Manager Signed At': '',
    'MGR Manager Signature ID': managerId,
    'SELF Manager Signature ID': selfId,
    'MGR Manager Signed At': '2026-01-01',
    'SELF Manager Signed At': '2026-01-01',
  };
}
