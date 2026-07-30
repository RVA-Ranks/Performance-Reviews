# AITHERAS Performance Review Portal V3.1 Test Plan

Use fake employee names and AITHERAS test accounts.

## Delivery B gate — signature recovery

Run `runV31SignatureTests_()` and retain its structured report. The suite covers
attempt/canonical names, provenance, every safe-trash predicate, recovered-file
preservation, folder-selection decisions, legacy matching, missing/conflicting
fields, normalized winner preservation, and explicit superseded responses.

**Requires Daniel Sandbox:** real Drive zero/one/multiple folder provisioning,
crash after folder creation before settings persistence, concurrent
provisioning, inaccessible and wrong-parent configured folders, concurrent
signature submissions, trash/movement permission failures, both final PDFs,
mobile signing, and confirmation that the recovery folder has no public/link,
manager, or employee access. Do not mark these passed without recorded evidence.

### Delivery B correction boundary tests

Use private `runV31SignatureSandboxHarness_()` only with
`ENVIRONMENT=Sandbox`, token `DANIEL_SIGNATURE_SANDBOX`, a fake cycle, and one
of the documented fault points. Capture account, cycle ID, attempt ID, expected
and actual result, file IDs, logs/screenshots, and cleanup status.

Blocking cases:

1. `SIGNATURE_AUDIT_APPEND`: winner stays `Signed`, remains in the review
   folder, and only Signature Audit Warning is populated.
2. `BEFORE_SIGNATURE_WINNER_WRITE`: artifact remains preserved with
   `COMMIT_UNKNOWN` recovery metadata and no authoritative file ID.
3. `AFTER_SIGNATURE_WINNER_WRITE_BEFORE_FLUSH`: authoritative reread classifies
   the matching file as `COMMITTED`.
4. Controlled different-winner attempt: only the confirmed loser may be
   dispositioned.
5. Reconciliation interruption after claim, validation, write, and before
   flush: one claim wins and unselected recovered candidates remain preserved.
6. Exact historical legacy name is accepted; near matches and incidental
   cycle/role text remain `Delivery Unknown`.

All real Drive, Sheet, concurrency, PDF, and permission results remain
**Requires Daniel Sandbox** until the evidence record is attached.

## Delivery A gate — production candidate and triggers

Run from the Apps Script editor:

1. `runV31TriggerTests_()`
2. `runV31ProductionReadinessTests_()`
3. `runProductionReadinessChecks_({liveProbes:false})`

Expected before Daniel supplies the owner:

- Trigger pure tests: zero failures; true concurrency is skipped as
  `Requires Daniel Sandbox`
- Readiness pure tests: zero failures; live evidence is skipped
- Current-environment readiness: blocked by blank
  `AUTOMATION_OWNER_EMAIL`
- `AUTOMATION_MODE` remains `Preview`

Transactional trigger cases:

- [ ] Preview → Live creates and verifies a replacement before deleting old
- [ ] Trigger creation failure preserves prior trigger and mode
- [ ] Metadata persistence failure deletes the replacement and restores metadata
- [ ] Live persistence failure restores prior mode and trigger metadata
- [ ] Old-trigger cleanup failure keeps the replacement and returns partial success
- [ ] Stored trigger ID matches the surviving owner-visible handler
- [ ] Non-owner Live activation is rejected
- [ ] Live with no verified trigger is unhealthy
- [ ] Preview with an owner-visible trigger is unhealthy
- [ ] Expected hour/time zone are not labeled as independently verified
- [ ] Production fault injection is rejected

Requires Daniel Sandbox:

- [ ] True concurrent Live-enable attempts
- [ ] Real replacement-trigger creation and ID evidence
- [ ] Forced ScriptApp creation failure with prior trigger evidence
- [ ] Partial owner-visible cleanup failure
- [ ] Scheduled execution and last-run timestamp

## A. Upgrade and data model

- [ ] Back up the current V3 code.
- [ ] Add `V31_Automation.gs`.
- [ ] Replace `Code.gs`, `Index.html`, and `appsscript.json`.
- [ ] Run `upgradeToV31_()` while Preview is confirmed.
- [ ] Explicitly set the Daniel-approved `AUTOMATION_OWNER_EMAIL`; no fallback is permitted.
- [ ] Confirm `ENVIRONMENT=Production` and `ENABLE_FAULT_INJECTION=false`.
- [ ] Approve Calendar and trigger permissions.
- [ ] Confirm `ReviewAutomationLog` was created.
- [ ] Confirm `EmployeeAssignments` has `Review Automation`.
- [ ] Confirm `ReviewCycles` has the new V3.1 columns.
- [ ] Confirm automation starts in Preview mode.

## B. HR Administration

- [ ] Administration shows the Review Automation panel.
- [ ] Preview mode is clearly displayed.
- [ ] The Compensation Adjustment URL can be saved.
- [ ] Notice days can be saved.
- [ ] Form due days can be saved.
- [ ] Event time and duration can be saved.
- [ ] Calendar ID can be saved.
- [ ] Weekend shifting can be enabled or disabled.
- [ ] Compensation-decision requirement can be enabled or disabled.
- [ ] Preview refresh works without sending anything.

## C. Review-date calculation

Test employees with these hire-date scenarios:

- [ ] Six-month anniversary within 28 days
- [ ] First anniversary within 28 days
- [ ] Later annual anniversary within 28 days
- [ ] Anniversary more than 28 days away
- [ ] Anniversary already passed
- [ ] Saturday anniversary
- [ ] Sunday anniversary
- [ ] February 29 hire date
- [ ] Review Automation unchecked
- [ ] Assignment Active unchecked

Confirm:

- [ ] Six-month review is created only once
- [ ] First annual review is labeled `1-Year Review`
- [ ] Later reviews are labeled `Annual Review`
- [ ] Weekend meeting shifts to Monday
- [ ] Form deadline shifts to Friday when necessary
- [ ] Old six-month anniversaries are not retroactively launched
- [ ] Existing matching review cycles prevent duplicates

## D. Live automation

Before enabling:

- [ ] Preview contains only the expected test employee
- [ ] Employee and manager emails are correct
- [ ] HR user is correct
- [ ] Compensation URL is correct
- [ ] Calendar ID is correct

Then:

- [ ] Enable Live Automation
- [ ] Confirm daily trigger is shown as installed
- [ ] Run Automation Now
- [ ] Confirm one review cycle is created
- [ ] Confirm one calendar event is created
- [ ] Confirm the same event includes employee, manager, and HR
- [ ] Confirm no duplicate event is created when the automation runs again
- [ ] Confirm no duplicate cycle is created when the automation runs again
- [ ] Confirm the automation log records success

## E. Launch communications

Confirm exactly one workflow email is sent to each role:

### HR

- [ ] HR receives a process-launched email
- [ ] Employee and manager recipients are listed
- [ ] Review type and meeting date are correct
- [ ] Open Review Cycle button works

### Manager

- [ ] Manager receives Manager Review link
- [ ] Manager receives Compensation Adjustment link
- [ ] Manager sees form due date
- [ ] Manager sees privacy explanation
- [ ] Manager How-To Guide link works

### Employee

- [ ] Employee receives Self-Evaluation link
- [ ] Employee sees form due date
- [ ] Employee sees privacy explanation
- [ ] Employee How-To Guide link works

### Calendar

- [ ] Google sends the normal calendar invitation
- [ ] Event is 12:00–1:00 PM ET by default
- [ ] Event description contains the general portal link
- [ ] Event description contains the How-To Guide link
- [ ] Event description does not expose the manager-only compensation link
- [ ] Email reminder is seven days before
- [ ] Pop-up reminder is 24 hours before

## F. Manager experience

- [ ] Manager dashboard shows Manager Review task
- [ ] Manager dashboard shows Compensation Adjustment button
- [ ] Compensation Adjustment opens in a new tab
- [ ] Manager can record `Adjustment Submitted`
- [ ] Manager can record `No Adjustment Recommended`
- [ ] Compensation decision appears in the review Overview
- [ ] Manager can continue the manager review independently
- [ ] Employee self-evaluation remains hidden before the meeting
- [ ] Finalize & Release is blocked until compensation decision is recorded

## G. Employee privacy

- [ ] Employee does not see Compensation Adjustment button
- [ ] Employee does not receive Compensation Adjustment URL in bootstrap data
- [ ] Employee does not see compensation decision or notes
- [ ] Employee sees only the self-evaluation task before the meeting
- [ ] Manager review remains hidden before the meeting

## H. Guided help

- [ ] First-login walkthrough appears once
- [ ] Walkthrough does not reappear after confirmation
- [ ] How-To Guide appears in navigation
- [ ] Topbar help button opens the guide
- [ ] Manager guide is accurate
- [ ] Employee guide is accurate
- [ ] HR guide is accurate
- [ ] Meeting guide is accurate
- [ ] Signature guide is accurate
- [ ] FAQ content is accurate
- [ ] Contextual guidance appears in review Overview
- [ ] Notification drawer includes process guidance
- [ ] Deadline warning appears within seven days of the meeting
- [ ] Compensation warning appears for the manager
- [ ] Help links in email open the Help page

## I. Manual review launch

- [ ] HR creates a manual review cycle
- [ ] HR receives one launch-confirmation email
- [ ] Manager receives one role-specific email
- [ ] Employee receives one role-specific email
- [ ] One shared calendar event is created
- [ ] Compensation task appears for manager
- [ ] HR can resend launch emails
- [ ] Resending emails does not duplicate the calendar event

## J. Pause and recovery

- [ ] Pausing automation removes the daily trigger
- [ ] Existing cycles and events remain unchanged
- [ ] Preview still works while paused
- [ ] Re-enabling Live mode installs one trigger
- [ ] No duplicate triggers exist
- [ ] A failed launch appears in `ReviewAutomationLog`
- [ ] An incomplete automated launch appears in preview as needing retry

## K. Launch idempotency (Phase 1)

Run `runV31IdempotencyTests_()` in the Apps Script editor first.

- [ ] `upgradeToV31_()` / `ensureV31DataModel_()` adds new launch columns without reordering existing ones
- [ ] Re-running the upgrade does not duplicate columns or lose cycle data
- [ ] Existing completed cycles (Automation Notice Sent At + Calendar Event ID) are treated as complete
- [ ] Calendar succeeds, manager email fails → event ID persisted; retry does not create another event
- [ ] Manager email succeeds, employee email fails → manager timestamp persisted; retry does not resend manager email
- [ ] Employee email succeeds, HR email fails → retry sends only HR email
- [ ] Final persistence failure after all external actions → retry skips completed components
- [ ] `Launch Completed At` is blank until Calendar + three emails succeed
- [ ] `Launch Attempt Count` increments on each attempt
- [ ] `Last Launch Error` captures actionable failure text
- [ ] Concurrent Run Now / trigger cannot launch the same candidate twice (script lock)
- [ ] Preview mode still creates no cycles, events, or emails
- [ ] HR intentional resend still sends three emails without duplicating the Calendar event
- [ ] Automation preview shows per-component pending/done state for incomplete launches
- [ ] Incomplete manual cycle for the same employee/period is retried (not skipped as a duplicate)
- [ ] HR sees **Retry Launch** when `launchComplete` is false; **Resend Instructions** when complete
- [ ] `retryReviewLaunch` finishes only pending components and does not clear completed timestamps
- [ ] Crash after Calendar create but before ID write: retry recovers tagged event instead of creating a second
- [ ] `runV31IdempotencyTests_()` passes orchestrator-stub and incomplete-manual-target cases

## Live Workspace acceptance (sandbox only)

Keep `AUTOMATION_MODE=Preview` until every probe below passes. Use separate
AITHERAS HR, manager, and employee accounts and record cycle IDs, attempt IDs,
trigger IDs, timestamps, and audit rows.

- [ ] Set an eligible Ready notification to `Sending` with a started time more
  than 15 minutes old. Drain that cycle and confirm no Mail send occurs, status
  becomes `Delivery Unknown`, the attempt ID remains, and HR sees attention.
- [ ] Repeat with a fresh `Sending` timestamp and confirm it remains untouched.
- [ ] Run two simultaneous drains against one controlled unresolved cycle;
  confirm one authoritative claim/result and no duplicate recipient email.
- [ ] Inspect **My Triggers** under every administrator account. Confirm a
  non-owner cannot install or migrate, manually clear cross-account legacy
  triggers, and retain one owner-controlled `runReviewAutomationTrigger_`.
- [ ] Interrupt Calendar handling after event creation, then recover by cycle
  marker and confirm no second Calendar event is created.
- [ ] Create duplicate deterministic PDF and signature artifacts in the sandbox
  Drive folders. Confirm HR reconciliation is required and no newest-file
  heuristic silently selects one.
- [ ] Send a controlled Mail notification, force the subsequent Sheet commit to
  fail or replace its attempt ID, and confirm the result is Delivery Unknown
  rather than Sent.
- [ ] Run the single-signature migration while a second account autosaves;
  confirm Mail delivery occurs after the migration lock is released.
