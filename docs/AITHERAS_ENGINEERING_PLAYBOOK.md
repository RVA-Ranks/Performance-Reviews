# AITHERAS Performance Reviews — Engineering Playbook

> Repository operating standard for Daniel, Carl (Cursor AI), and Code Coach  
> Scope: Google Apps Script + Google Sheets + Drive + Docs + Mail + Calendar  
> Default production posture: `AUTOMATION_MODE = Preview` until all release gates pass

---

## 1. Purpose

This playbook is the permanent engineering contract for the AITHERAS Performance Reviews project.

Carl must read this file before making architectural changes, production-hardening changes, migrations, trigger changes, recovery changes, or release changes.

This playbook exists to reduce repeated design conversations and to keep implementation, review, testing, and deployment decisions consistent across commits.

---

## 2. Roles

### Daniel
Daniel is the product owner and operational liaison.

Daniel decides:
- Business rules
- Production timing
- Approved admin accounts
- Sandbox resources
- Final release approval
- Whether non-blocking warnings are acceptable

### Carl
Carl is the implementation engineer.

Carl must:
- Follow this playbook
- Work in reviewable stages
- Preserve existing business behavior unless explicitly approved
- Provide complete updated files, not tiny snippets
- Push reviewable commits
- Report exact commit SHAs
- Stop at stage gates
- Never claim live tests passed without evidence

### Code Coach
Code Coach is the reviewer and architecture gatekeeper.

Code Coach will:
- Review commits against this playbook
- Grade each delivery
- Identify Blocking, Major, and Minor findings
- Approve or reject stage progression
- Maintain the production-quality bar
- Recommend rollback when required

---

## 3. Current product baseline

The application is a role-based Google Apps Script web app for:

- Employee self-evaluations
- Manager evaluations
- Independent preparation
- Review meetings
- Compensation decisions
- Combined signature workflow
- Final PDF generation
- Final packet distribution
- Calendar scheduling
- Automated cycle launches
- Workflow notifications
- HR administration
- Crash-safe recovery

### Roles
- Employee
- Manager
- HR

### Core workflow states

```text
Open for Input
→ Ready for Review Meeting
→ Review Meeting Open
→ Awaiting Signatures
→ Finalizing
→ Complete
```

Alternate terminal state:

```text
Cancelled
```

---

## 4. Production accounts and ownership

Approved super-admin and automation-owner account:

```text
AUTOMATION_OWNER_EMAIL = aitheras-hr@aitheras.com
SYSTEM_ADMIN_EMAIL = aitheras-hr@aitheras.com
```

Rules:
- No owner fallback behavior
- Do not use the first HR row as the owner
- Do not use current user as the owner
- Do not hard-code the owner in workflow logic
- Store owner/admin values in `ReviewSettings`
- Preserve existing nonblank values during migration
- Populate blank values with the approved AITHERAS address

This account is the single automation authority for:
- Trigger installation
- Trigger replacement
- Live activation
- Production migrations
- Readiness checks
- System recovery
- Calendar ownership or access
- Production health verification

---

## 5. Global engineering principles

### 5.1 Preserve business behavior

Do not combine production hardening with:
- New review factors
- Rating-scale changes
- New workflow states
- Major visual redesign
- Compensation redesign
- New role types
- Broad refactors unrelated to the stage

### 5.2 Prefer complete files

Daniel does not want tiny patches.

Deliver full updated files for every changed file.

Use labels in handoff text such as:

```text
DROP-IN REPLACEMENT — Code.gs
```

Do not add that phrase inside JSON or source files unless it is genuinely useful.

### 5.3 External side effects are never assumed atomic

Mail, Calendar, Drive, Docs, Sheets, and triggers do not participate in one transaction.

Every external side effect must use durable state:

```text
Pending
→ Sending
→ Sent
```

Possible failure states:

```text
Failed
Delivery Unknown
Superseded
```

### 5.4 Never auto-repeat ambiguous side effects

When an external action may have succeeded but persistence did not:

```text
Delivery Unknown
```

Do not automatically resend or recreate.

Require explicit HR reconciliation.

### 5.5 Short lock sections only

Do not hold the global review-data lock during:
- Mail send
- Calendar calls
- Drive file creation
- Drive file movement
- PDF generation
- Trigger creation
- Trigger deletion

Preferred pattern:

```text
Lock
→ validate and claim
→ persist claim
→ unlock
→ perform external action
→ lock
→ verify attempt ID
→ persist result
→ unlock
```

### 5.6 Fresh-row writes only

Never write a stale batch snapshot back to `ReviewCycles`.

Before every write:
- Reload the authoritative cycle row
- Validate current status
- Validate attempt ID
- Apply only the intended change
- Preserve newer user edits

### 5.7 Idempotent migrations

Migrations must:
- Add missing headers only
- Preserve existing data
- Preserve nonblank settings
- Be safe to rerun
- Avoid duplicate folders
- Avoid duplicate triggers
- Avoid invented historical attempt IDs
- Fail clearly on ambiguity

---

## 6. Apps Script standards

### Runtime

```text
Runtime: V8
Time zone: America/New_York
```

### Required services
- SpreadsheetApp
- DriveApp
- DocumentApp
- MailApp
- CalendarApp
- ScriptApp
- PropertiesService
- LockService
- Session
- HtmlService
- Utilities

### Range-shape rule

For a 4×14 write:

```javascript
sheet.getRange(row, col, 4, 14).setValues(grid);
```

Always verify:

```javascript
rows.length === expectedRows
rows[0].length === expectedColumns
```

### Border signature

```javascript
range.setBorder(
  true,
  true,
  true,
  true,
  false,
  false,
  '#e5e7eb',
  SpreadsheetApp.BorderStyle.SOLID
);
```

### Public vs private server functions

Functions intended only for editor execution must end with `_`.

Examples:

```javascript
setupReviewSystem_()
upgradeToV31_()
runV31TriggerTests_()
runProductionReadinessChecks_()
```

Do not expose editor-only functions to `google.script.run`.

---

## 7. Review authorization rules

Every state-changing server function must validate:
- Signed-in user
- AITHERAS domain
- Role authorization
- Cycle visibility
- Current workflow state
- Attempt ownership where applicable

### Employee
May:
- View own cycles
- Edit own self-evaluation before submission
- View manager review only after meeting opens
- Sign own packet when eligible

Must not:
- See compensation details
- See other employees
- Trigger HR recovery operations
- Run migrations
- Drain outbox
- Administer triggers

### Manager
May:
- View assigned employees
- Edit assigned manager reviews before submission
- Open eligible review meetings
- Record compensation decisions where authorized
- Sign own packet when eligible

Must not:
- See unassigned cycles
- Run HR recovery operations
- Administer triggers
- Run migrations

### HR
May:
- View all cycles
- Create cycles
- Manage automation
- Reconcile Delivery Unknown states
- Rebuild Calendar events
- Retry finalization
- Sign last
- Run manual recovery actions

### Automation owner
Only the configured automation owner may:
- Enable Live
- Install trigger
- Replace trigger
- Migrate trigger handler
- Change trigger hour while Live

---

## 8. Transactional trigger architecture

### Required sequence

```text
1. Validate owner, mode, hour, and time zone.
2. Acquire user-scoped trigger administration lock.
3. Enumerate owner-visible current triggers.
4. Create replacement trigger.
5. Verify replacement ID and handler.
6. Persist replacement trigger metadata.
7. Persist AUTOMATION_MODE = Live.
8. Re-read and verify mode plus trigger ID.
9. Delete old owner-visible triggers.
10. Return full or partial success.
```

### Failure behavior

Creation failure:
- Preserve old trigger
- Preserve previous mode
- Preserve previous metadata
- Return failure

Metadata persistence failure:
- Delete uncommitted replacement
- Restore old metadata
- Preserve old trigger
- Return failure

Live persistence failure:
- Delete replacement when enabling from Preview/Paused
- Restore prior mode
- Preserve old trigger
- Return failure

Old-trigger cleanup failure:
- Keep new verified trigger
- Keep Live
- Return partial success
- Show amber warning
- Log failed trigger IDs

### Trigger health

Verified facts:
- Effective user
- Configured owner
- Owner match
- Visible trigger IDs
- Visible handler
- Visible trigger count
- Stored trigger ID
- Installed timestamp

Expected values:
- Trigger hour
- Time zone
- Daily schedule

Always display:

```text
Triggers installed by other accounts cannot be inspected here.
```

Treat that as an operational limitation, not a health failure.

---

## 9. Signature architecture

### Per-role authoritative fields

For Manager, Employee, and HR:

```text
<ROLE> Signature Status
<ROLE> Signature Attempt ID
<ROLE> Signature Started At
<ROLE> Signature Last Error
<ROLE> Signature Artifact Warning
<ROLE> Signature Audit Warning
<ROLE> Signature File ID
<ROLE> Signed At
<ROLE> Signature Winning Attempt ID
<ROLE> Signature Recovery File ID
<ROLE> Signature Recovery Attempt ID
<ROLE> Signature Recovery Details JSON
<ROLE> Signature Recovery Recorded At
```

### Reconciliation fields

```text
<ROLE> Signature Reconciliation Status
<ROLE> Signature Reconciliation Attempt ID
<ROLE> Signature Reconciliation Selected File ID
<ROLE> Signature Reconciliation Started At
<ROLE> Signature Reconciliation Last Error
```

### Signature states

```text
Pending
Signing
Signed
Delivery Unknown
Failed
```

Reconciliation states:

```text
Pending
Reconciling
Resolved
Delivery Unknown
Failed
```

### Attempt naming

```text
AITHERAS_<cycleId>_<ROLE>_SIGNATURE_ATTEMPT_<attemptId>.png
```

Canonical winner:

```text
AITHERAS_<cycleId>_<ROLE>_SIGNATURE.png
```

### Provenance

```text
AITHERAS_SIGNATURE
cycleId=<cycleId>
role=<ROLE>
attemptId=<attemptId>
origin=created
```

### Commit outcomes

```text
COMMITTED
SUPERSEDED
COMMIT_UNKNOWN
```

COMMITTED:
- Keep Signed
- Keep authoritative file
- Mirror same file into both document fields
- Set winning attempt ID
- Clear active attempt ID
- Clear started time

SUPERSEDED:
- Preserve winning signature
- Do not overwrite winner
- Return `signatureRecorded: false`
- Apply loser artifact policy

COMMIT_UNKNOWN:
- Preserve artifact
- Do not trash
- Keep authoritative file field blank
- Set Delivery Unknown when possible
- Persist recovery metadata
- Surface to HR

### Post-failure classification

```text
Current authoritative file matches this artifact
and status is Signed
→ COMMITTED

Different winner exists
→ SUPERSEDED

Otherwise
→ COMMIT_UNKNOWN
```

### Audit separation

Move audit outside the authoritative commit block.

If audit fails after commit:
- Keep Signed
- Keep winner file
- Set Signature Audit Warning
- Return partial success

Never treat audit failure as a loser.

---

## 10. Signature artifact cleanup policy

### Safe trash conditions

Trash only when every condition is explicitly true:

```text
created by current losing attempt
not referenced by cycle
not winning file
not recovered candidate
inside expected restricted folder
deterministic attempt name matches
provenance marker matches
```

If any condition is false or unknown:

```text
Do not trash automatically.
```

### Recovery folder

Setting:

```text
SIGNATURE_RECOVERY_FOLDER_ID
```

Folder name:

```text
AITHERAS Signature Recovery
```

Location:

```text
Direct child of REVIEW_FOLDER_ID
```

Provisioning:

```text
0 matching direct children → create and persist
1 valid match → reuse and persist
multiple valid matches → block and require HR
```

Use a short script-level provisioning lock.

### Invalid configured folder

If setting is nonblank but invalid:
- Preserve value
- Block readiness
- Do not auto-replace
- Require HR correction or clearing

### Unsafe artifacts

- Move to recovery folder
- If move fails, leave in place
- Persist artifact warning
- Surface in HR UI
- Do not email until durable alerts exist

### Recovered candidates

Never automatically trash a recovered candidate.

---

## 11. Legacy signature migration

Trusted legacy filename:

```text
<cycleId> - Combined_Review_Packet_-_<ROLE>.png
```

Only accept:
- Exact confirmed legacy name
- Exact structured provenance marker
- Existing authoritative normalized metadata

Do not accept:
- Partial filename match
- Incidental cycle/role text
- Similar-looking names
- Unconfirmed historical formats

Migration rules:

Matching valid mirror IDs:
- Role status = Signed
- Role file ID = matching ID
- Role signed time = best valid existing timestamp
- No attempt ID invented

Missing one mirror ID:
- Delivery Unknown
- Authoritative file blank
- HR reconciliation required

Conflicting mirror IDs:
- Delivery Unknown
- Authoritative file blank
- Both IDs preserved in recovery details

Existing authoritative role-level data:
- Preserve it
- Validate mirrors
- Do not overwrite
- Surface inconsistency if needed

---

## 12. Workflow notification outbox

Components:

```text
Ready-for-meeting email
Meeting-opened manager/HR email
Meeting-opened employee email
Manager signature request
Employee signature request
HR signature request
```

Each needs:

```text
Status
Attempt ID
Started At
Sent At
Last Error
```

States:

```text
Pending
Sending
Sent
Failed
Delivery Unknown
Superseded
```

Disposition model:

```text
Future
Eligible
Past
```

Lifecycle:

| Cycle state | Ready | Meeting emails | Participant signature emails | HR signature email |
|---|---|---|---|---|
| Open | Future | Future | Future | Future |
| Ready | Eligible | Future | Future | Future |
| Meeting | Past | Eligible | Future | Future |
| Awaiting Signatures | Past | Past | Eligible until signed | Future until both sign |
| Finalizing | Past | Past | Past | Past |
| Complete | Past | Past | Past | Past |

Eligible stale Sending:
- Delivery Unknown
- No automatic resend
- HR attention

Past stale Sending:
- Superseded
- Prior delivery unconfirmed
- No late resend

Preview and Paused send nothing automatically.

---

## 13. Launch and Calendar recovery

Independent launch components:

```text
Calendar creation
Calendar configuration
Manager launch email
Employee launch email
HR launch email
```

Calendar marker:

```text
[AITHERAS_REVIEW_CYCLE_ID:<cycleId>]
```

Recovery order:

```text
stored event ID
→ tag
→ description marker
```

Calendar creation and configuration must be tracked separately.

Allowed HR actions:
- Retry Calendar Configuration
- Rebuild Calendar Event
- Retry Launch
- Reconcile Delivery Unknown

Never resend unrelated successful components.

---

## 14. PDF and final distribution recovery

Per-PDF fields:

```text
Status
Attempt ID
Started At
File ID
Last Error
```

Names:

```text
AITHERAS_<cycleId>_Manager_Review_FINAL.pdf
AITHERAS_<cycleId>_Self_Evaluation_FINAL.pdf
```

Recovery:
- Validate stored ID
- Search deterministic candidates
- Reuse one exact valid candidate
- Require HR selection for multiple
- Regenerate only when no valid candidate exists
- Reject arbitrary Drive IDs
- Validate folder, MIME, cycle, and document type

Final distribution fields:

```text
Final Distribution Status
Final Distribution Attempt ID
Final Distribution Started At
Final Distribution Sent At
Final Distribution Last Error
```

Only mark Complete after:
- Both PDFs are valid
- Distribution is resolved
- Finalization audit state is complete

---

## 15. Finalization audit

Fields:

```text
Finalization Audit Status
Finalization Audit Attempt ID
Finalization Audit Started At
Finalization Audit Completed At
Finalization Audit Last Error
Finalization Audit Event ID
```

States:

```text
Pending
Writing
Complete
Delivery Unknown
Failed
```

Deterministic event ID:

```text
FINALIZATION_COMPLETE:<cycleId>
```

Avoid recursive audit-failure loops.

---

## 16. HR System Health

This is the only approved visual expansion during hardening.

Sections:
- Automation
- Launch Health
- Workflow Notifications
- Signature Health
- Finalization Health

Normal load:
- Lightweight settings
- Sheet-based counts
- Trigger metadata

Explicit deep check:
- Drive folders
- Templates
- Calendar access
- Artifact validation
- Candidate scans

Deep checks must:
- Inspect unresolved cycles only
- Be bounded
- Report incomplete results honestly
- Never show green if incomplete

---

## 17. Fault injection

Settings:

```text
ENVIRONMENT = Sandbox | Production
ENABLE_FAULT_INJECTION = false
FAULT_POINT =
FAULT_CYCLE_ID =
FAULT_ONCE = true
```

Approved points:
- After Calendar creation before persistence
- After email send before sent-state persistence
- After workflow email claim
- After signature file creation before commit
- After PDF creation before ID persistence
- After final distribution before persistence
- After trigger creation
- After trigger metadata persistence
- Before old-trigger cleanup
- Before Live persistence

Rules:
- Private hooks only
- Sandbox only
- Preview only
- One-shot faults clear themselves
- Readiness fails if fault injection is enabled in Production
- Never claim fault test passed without real evidence

---

## 18. Test architecture

Required files:

```text
V31_Idempotency_Tests.gs
V31_Finalization_Tests.gs
V31_Workflow_Notification_Tests.gs
V31_Signature_Tests.gs
V31_Trigger_Tests.gs
V31_Security_Tests.gs
V31_Production_Readiness_Tests.gs
V31_Previous_Review.gs
V31_Previous_Review_Tests.gs
```

### Previous Review Context

Post-v3.1 enhancement on `feat/previous-review-context`. Current assigned
managers and HR may read a limited summary of an employee's most recent
completed prior review. Authorization is based on the **current** cycle
assignment. Historical reviews remain immutable; compensation is never returned;
Drive sharing is not changed. Historical PDF downloads must pass
`validateAuthoritativeFinalPdfId_`. Chronology must be proven; unverifiable
Complete rows are ineligible. Cache keys include
`PREVIOUS_REVIEW_FALLBACK_ANY_TYPE`. Completing a review invalidates that
employee's previous-review cache. Employee identity is email-based unless both
rows carry Employee ID (no migration this release). No schema migration unless
later performance evidence justifies caching a previous-cycle ID on the row.

Common result shape:

```javascript
{
  suite: '...',
  passed: 0,
  failed: 0,
  skipped: 0,
  durationMs: 0,
  blocking: [],
  warnings: [],
  results: [
    {
      name: '...',
      passed: true,
      severity: 'Blocking',
      message: '...',
      details: {}
    }
  ]
}
```

Allowed statuses:

```text
Passed
Failed
Skipped
Requires Daniel Sandbox
```

---

## 19. Sandbox evidence

Required evidence:

```text
Test name
Commit SHA
Date/time
Environment
Account used
Cycle ID
Attempt ID
Expected result
Actual result
File/event/message IDs
Pass/fail
Cleanup completed
```

Carl must never mark live tests passed without recorded evidence.

---

## 20. Release stages

### Delivery A — Approved
- Production freeze
- App version
- Transactional triggers
- Trigger owner
- Trigger health
- Trigger tests

### Delivery B — Signature recovery
- Signature claims
- Winner/loser classification
- Recovery folder
- Artifact cleanup
- Reconciliation
- Signature tests

### Delivery C — External side-effect recovery
- Workflow outbox
- Calendar recovery
- Launch recovery
- PDF recovery
- Final distribution
- Durable system alerts

### Delivery D — HR System Health UX
- Health dashboard
- Recovery actions
- Partial-success messages

### Delivery E — Setup, migrations, readiness, security
- Private setup functions
- Full readiness checks
- Security tests
- Structured test normalization
- Documentation

### Delivery F — Sandbox evidence
- Real Workspace execution
- Concurrency
- Fault injection
- Release recommendation

---

## 21. Mandatory stage gate

After each delivery, Carl must provide:
- Exact commit SHA
- Commit message
- Changed files
- New settings
- New headers
- Migration impact
- Test results
- Known limitations
- Rollback instructions
- Sandbox-required tests

Then stop for review.

Do not begin the next delivery without approval.

---

## 22. Production release gate

Live remains prohibited until:

```text
Delivery B approved
Delivery C approved
Delivery D approved
Delivery E approved
Delivery F sandbox blockers = 0
Rollback verified
Automation owner confirmed
Production readiness blockers = 0
```

No exceptions for schedule pressure.

---

## 23. Rollback rules

Immediately return to Preview when:
- Trigger health is red
- Duplicate cycle is created
- Duplicate Calendar event is created
- Wrong recipient receives email
- Unauthorized data is exposed
- Sheet data is overwritten
- Final PDFs are wrong
- Complete occurs before finalization is valid
- Recovery state is inaccessible

Rollback sequence:

```text
Set Preview
→ remove owner-visible triggers
→ deploy last known-good version
→ preserve logs
→ reconcile external artifacts
→ document incident
```

Do not delete recovery artifacts during rollback.

---

## 24. Commit conventions

```text
chore(release): freeze production candidate and expose version
fix(automation): make trigger activation transactional
fix(signatures): reconcile superseded signature artifacts
fix(signatures): classify ambiguous commits and harden reconciliation claims
fix(recovery): finalize outbox and external side-effect recovery
feat(admin): add production system health and recovery controls
test(production): add readiness security and live-boundary suites
docs(deploy): add sandbox rollout rollback and monitoring procedures
release: AITHERAS performance reviews v3.1 production
```

---

## 25. Code review grading rubric

Total: 100 points

- Correctness — 40
- Robustness — 15
- Readability — 10
- Performance — 10
- API usage — 5
- UX/DX polish — 10
- Security/Privacy — 5
- Maintainability — 5

Every review must report:

```text
Grade: XX% (needs +YY% to hit 100%)
```

---

## 26. Carl response template

Every delivery response should include:

### Executive summary
What changed, why, and current risk.

### Changed files
Exact list.

### New settings
Exact list and defaults.

### New headers
Exact list.

### Migration behavior
How existing data is preserved.

### Test results
Passed, failed, skipped, Requires Daniel Sandbox.

### Known limitations
Anything unresolved.

### Rollback
Exact steps.

### Commit
SHA and message.

### Stop gate
Explicit statement that Carl stopped before the next stage.

---

## 27. Daniel quick-use workflow

When Carl pushes code, Daniel should send Code Coach:

```text
Review commit <SHA>
```

Optionally include:
- Commit message
- Changed files
- Carl’s test summary
- Known limitations

---

## 28. Current operational posture

Until production release:

```text
AUTOMATION_MODE = Preview
AUTOMATION_OWNER_EMAIL = aitheras-hr@aitheras.com
SYSTEM_ADMIN_EMAIL = aitheras-hr@aitheras.com
ENABLE_FAULT_INJECTION = false
```

No production Live activation before all gates pass.

---

## 29. Source of truth

When a conflict exists:

1. Explicit Daniel business decision
2. This playbook
3. Current approved handoff
4. Current approved commit
5. Older documentation

Carl must raise conflicts before coding rather than silently choosing.

---

## 30. Final rule

When uncertain:

```text
Preserve data
Preserve the working trigger
Preserve the winning artifact
Do not repeat ambiguous external actions
Keep Preview enabled
Surface the issue to HR
Stop for review
```
