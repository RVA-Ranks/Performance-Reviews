# Phase 1 — Launch Idempotency Drop-In

## Status

- Baseline tag: `v3.1-handoff-baseline`
- Phase 1 deliverable: DROP-IN `V31_Automation.gs` + DROP-IN `V31_Idempotency_Tests.gs`
- Narrow UI compatibility: `Index.html` HR **Retry Launch** vs **Resend Instructions**
- `Code.gs`: unchanged
- Live automation: **do not enable** until Workspace retry tests pass

## Migration instructions

1. Keep the existing production `/exec` deployment URL.
2. Back up current Apps Script files and the production spreadsheet.
3. In the Apps Script project bound to the review spreadsheet:
   - Replace the entire contents of `V31_Automation` with the current `V31_Automation.gs`.
   - Add or replace `V31_Idempotency_Tests` with `V31_Idempotency_Tests.gs`.
   - Replace `Index.html` if you want the HR Retry Launch control.
4. Confirm project time zone remains `America/New_York`.
5. From the deployment-owner account, run `upgradeToV31_()` (safe to re-run).
6. Confirm `ReviewCycles` gained these columns without reordering existing ones:
   - Calendar Status
   - Manager Email Sent At
   - Employee Email Sent At
   - HR Email Sent At
   - Launch Completed At
   - Last Launch Error
   - Launch Attempt Count
7. Run `runV31IdempotencyTests_()` and confirm all cases pass in Logs.
8. Keep `AUTOMATION_MODE` = **Preview**.
9. Only after Preview + partial-failure Workspace tests pass, consider Live.

## Behavior preserved

- Same Calendar guest list, reminders, and event description policy
- Same manager / employee / HR launch email content
- Same Preview / Live / Paused modes
- Same intentional HR resend control (audited; does not recreate Calendar events)
- Existing V3 / V3.1 cycle rows remain readable
- Legacy completed launches (`Automation Notice Sent At` + Calendar Event ID) are treated as complete

## Hardening after Phase 1 review

- Incomplete same-employee/period cycles (including manual) are selected for retry
- HR `retryReviewLaunch(cycleId)` resumes unfinished steps under lock
- `SpreadsheetApp.flush()` after each launch persist
- Calendar tag recovery via `AITHERAS_REVIEW_CYCLE_ID` before `createEvent`
- Tests call `orchestrateReviewLaunchSteps_` with stubbed adapters (same path as production)

## Retry evidence (local)

| Scenario | Expected | Result |
|---|---|---|
| Calendar succeeds, manager email fails | Event ID kept; retry skips Calendar; resumes at manager | `testOrchestratorCalendarThenManagerFail_` / simulation twin |
| Manager succeeds, employee fails | Manager timestamp kept; retry skips manager | Covered by simulation + orchestrator stubs |
| Employee succeeds, HR fails | Earlier timestamps kept; retry sends only HR | Covered by simulation |
| Persist after each step | Persist log shows calendar before manager, etc. | `testOrchestratorPersistsEachStep_` |
| Incomplete manual period | Automation targets that cycle for retry | `testIncompleteManualPeriodRetryTarget_` |
| Complete period | Blocks new create | `testCompletePeriodSkipsCreate_` |
| Tagged calendar recovery | Persists recovered event ID | `testCalendarTagRecoveryPreference_` |
| Preview mode | No launch activity | `testPreviewModeSkipsLiveLaunch_` |

Workspace-owned Calendar/Mail delivery still requires AITHERAS test-account verification before Live.

## Rollback

1. Redeploy / restore files from git tag `v3.1-handoff-baseline` or the prior known-good commit.
2. Remove `V31_Idempotency_Tests.gs` if desired.
3. New launch columns may remain empty; they are additive and do not break baseline readers that ignore unknown fields.
