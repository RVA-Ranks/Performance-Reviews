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
    {
      name: 'True concurrent identical and different submissions',
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
