# AITHERAS Sandbox Evidence Template

**Package:** V3.1  
**Branch:** `fix/crash-safe-side-effects`

## Delivery F Stage F1 — Release candidate freeze

```text
RELEASE_CANDIDATE_SHA = c46c2bd79a0dc7ab6665f3a9dc1ab2a7a67ea453
BRANCH = fix/crash-safe-side-effects
BACKUP_BRANCH_OR_TAG = tag v3.1-delivery-f-rc ; branch backup/delivery-f-rc-c46c2bd
WORKING_TREE = clean
V31_Security_Tests.gs = present
```

Every Delivery F test record below must cite this same SHA. Do not modify
application source during test execution unless a sandbox failure is proven.

**Prior tips:**

```text
Delivery D: c234d862e08a53510e39315e477395e287c04f26
Delivery E readiness: 741701c9b89a322910a8f4588f4beaf4b18236ed
Delivery E close: f6ad5f7acd02b3928bdc60fbd46896f2da74bbb2
```

**Environment requirements:**

```text
ENVIRONMENT = Sandbox
AUTOMATION_MODE = Preview
AUTOMATION_OWNER_EMAIL = aitheras-hr@aitheras.com
SYSTEM_ADMIN_EMAIL = aitheras-hr@aitheras.com
SYSTEM_ALERT_RECIPIENT = aitheras-hr@aitheras.com
ENABLE_FAULT_INJECTION = false
```

Do not enable production Live from this template. Use fake employee data only.
Copied/isolated Sandbox spreadsheet, folders, templates, Calendar, and web app
only — never real employee-review records.

---

## 1. Private automated suites

Run in the Apps Script editor as the automation owner against
`RELEASE_CANDIDATE_SHA`:

```javascript
runV31IdempotencyTests_();
runV31FinalizationTests_();
runV31WorkflowNotificationTests_();
runV31SystemAlertTests_();
runV31SignatureTests_();
runV31TriggerTests_();
runV31SystemHealthTests_();
runV31ProductionReadinessTests_();
runV31SecurityTests_();
```

| Suite | Passed | Failed | Skipped | Blocking | Notes |
|---|---:|---:|---:|---|---|
| Idempotency |  |  |  |  | SHA c46c2bd |
| Finalization |  |  |  |  |  |
| Workflow notifications |  |  |  |  |  |
| System alerts |  |  |  |  |  |
| Signatures |  |  |  |  |  |
| Triggers |  |  |  |  |  |
| System Health |  |  |  |  |  |
| Production readiness |  |  |  |  |  |
| Security |  |  |  |  | Required; file present |

Expected: `failed = 0` and no unexpected blocking rows.

---

## 2. Sandbox live probes (executable)

From HR Administration in Sandbox, use **Run Sandbox Live Probes** (confirmation token `SANDBOX_LIVE_PROBES`), or run privately:

```javascript
runSystemHealthSandboxLiveProbes({
  sandboxConfirmed: true,
  confirmationToken: 'SANDBOX_LIVE_PROBES'
});
```

Record `readiness.liveProbes`:

| Field | Value |
|---|---|
| requested |  |
| allowed |  |
| executed |  |
| checksRun |  |
| checksSkipped |  |
| overallLevel |  |
| blocking codes |  |
| warning codes |  |
| finalizationAuditCheck.durationMs |  |
| finalizationAuditCheck.completeCycleCount |  |

### Probe checklist

| Probe | Result | Evidence (IDs / screenshots / timestamps) |
|---|---|---|
| Calendar access | Pass / Fail / Skip |  |
| Manager template | Pass / Fail / Skip |  |
| Self template | Pass / Fail / Skip |  |
| Review folder | Pass / Fail / Skip |  |
| Completed manager PDF validation | Pass / Fail / Skip |  |
| Completed self PDF validation | Pass / Fail / Skip |  |
| Signature artifact validation | Pass / Fail / Skip |  |
| Signature recovery folder permissions | Pass / Fail / Skip | Manual verify |
| Trigger create / replace | Pass / Fail / Skip | Delivery F |
| Mail send / ambiguous persistence | Pass / Fail / Skip | Delivery F |
| Concurrent outbox drain | Pass / Fail / Skip | Delivery F |
| Concurrent signature submission | Pass / Fail / Skip | Delivery F |
| Final packet attachments | Pass / Fail / Skip | Delivery F |
| Mobile signature canvas | Pass / Fail / Skip | Delivery F |
| Keyboard / modal focus | Pass / Fail / Skip | Delivery F |
| Cold System Health timing | ms | Target: document cold load |
| Cached System Health timing | ms | Target: cached &lt; 2s |

Never mark `executed = true` unless the readiness object reports it.

---

## 3. Security matrix (separate sessions)

Accounts:

| Role | Account |
|---|---|
| Automation owner / HR | `aitheras-hr@aitheras.com` |
| Additional HR (optional) |  |
| Manager |  |
| Employee |  |

| Attempt | Actor | Expected | Observed |
|---|---|---|---|
| Open System Health | Employee | Rejected |  |
| Open System Health | Manager | Rejected |  |
| Drain system alerts | Employee | Rejected |  |
| Drain workflow outbox | Manager | Rejected |  |
| Reconcile PDF | Employee | Rejected |  |
| Reconcile signature | Manager | Rejected |  |
| Retry finalization | Employee | Rejected |  |
| Install/replace trigger | Non-owner HR | Rejected |  |
| Install/replace trigger | Owner | Allowed in Sandbox only |  |
| View compensation | Employee | Hidden |  |
| View compensation | Manager | Visible when authorized |  |
| Private `setupReviewSystem_` / tests via web client | Any | Unavailable |  |

---

## 4. Defect scenarios

| Scenario | Steps | Expected | Observed |
|---|---|---|---|
| Complete cycle Event ID present, audit row deleted | Deep readiness / Configuration Check | Blocking `FINALIZATION_AUDIT_ROW_MISSING`; Retry Finalization |  |
| Trashed completed manager PDF | Sandbox live probes | Blocking PDF code; no automatic resend |  |
| Moved self PDF outside review folder | Sandbox live probes | Blocking folder mismatch |  |
| Wrong-cycle PDF identity | Sandbox live probes | Blocking identity mismatch |  |

---

## 5. Rollback evidence

If any Sandbox probe or security check fails:

```text
Set AUTOMATION_MODE = Preview
→ remove owner-visible triggers if unsafe
→ redeploy last known-good SHA
→ preserve logs and recovery artifacts
→ document incident below
```

| Item | Value |
|---|---|
| Incident time |  |
| Failed check |  |
| Rollback SHA |  |
| Artifacts preserved |  |
| Follow-up owner |  |

---

## 6. Known limitations (pre–Delivery F)

- Concurrent drain/signature and Mail ambiguity evidence remain Delivery F.
- Browser accessibility and performance timing remain manual Sandbox evidence.
- Production Live remains prohibited until Delivery E approved, Delivery F blockers = 0, rollback verified, and readiness blockers = 0.

---

## 7. Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Daniel / HR |  |  | Approve / Reject |
| Carl (engineering) |  |  | Delivery E complete; stop before Delivery F |
