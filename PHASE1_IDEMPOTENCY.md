# Phase 1 — Launch Idempotency Drop-In

## Status

- Baseline tag: `v3.1-handoff-baseline`
- Phase 1 deliverable: DROP-IN `V31_Automation.gs` + DROP-IN `V31_Idempotency_Tests.gs`
- `Code.gs` and `Index.html`: unchanged
- Live automation: **do not enable** until Workspace retry tests pass

## Migration instructions

1. Keep the existing production `/exec` deployment URL.
2. Back up current Apps Script files and the production spreadsheet.
3. In the Apps Script project bound to the review spreadsheet:
   - Replace the entire contents of `V31_Automation` with the Phase 1 `V31_Automation.gs`.
   - Add a new script file named `V31_Idempotency_Tests` and paste `V31_Idempotency_Tests.gs`.
4. Confirm project time zone remains `America/New_York`.
5. From the deployment-owner account, run `upgradeToV31()` (safe to re-run).
6. Confirm `ReviewCycles` gained these columns without reordering existing ones:
   - Calendar Status
   - Manager Email Sent At
   - Employee Email Sent At
   - HR Email Sent At
   - Launch Completed At
   - Last Launch Error
   - Launch Attempt Count
7. Run `runV31IdempotencyTests()` and confirm all cases pass in Logs.
8. Keep `AUTOMATION_MODE` = **Preview**.
9. Only after Preview + partial-failure Workspace tests pass, consider Live.

## Behavior preserved

- Same Calendar guest list, reminders, and event description policy
- Same manager / employee / HR launch email content
- Same Preview / Live / Paused modes
- Same intentional HR resend control (audited; does not recreate Calendar events)
- Existing V3 / V3.1 cycle rows remain readable
- Legacy completed launches (`Automation Notice Sent At` + Calendar Event ID) are treated as complete

## Retry evidence (local simulation)

Local PowerShell / Apps Script harness simulations confirm:

| Scenario | Expected | Result |
|---|---|---|
| Calendar succeeds, manager email fails | Event ID kept; retry skips Calendar; resumes at manager | Covered by `testSimulatedCalendarThenManagerFail_` |
| Manager succeeds, employee fails | Manager timestamp kept; retry skips manager | Covered by `testSimulatedManagerThenEmployeeFail_` |
| Employee succeeds, HR fails | Earlier timestamps kept; retry sends only HR | Covered by `testSimulatedEmployeeThenHrFail_` |
| All components succeed | `Launch Completed At` set once | Covered by `testLaunchCompletedAtGate_` |
| Legacy complete cycle | Treated complete; backfilled | Covered by `testLegacyLaunchComplete_` / `testLegacyBackfill_` |
| Preview mode | No launch activity | Covered by `testPreviewModeSkipsLiveLaunch_` |

Workspace-owned Calendar/Mail delivery still requires AITHERAS test-account verification before Live.

## Rollback

1. Redeploy / restore `V31_Automation.gs` from git tag `v3.1-handoff-baseline`.
2. Remove `V31_Idempotency_Tests.gs` if desired.
3. New launch columns may remain empty; they are additive and do not break the baseline reader paths that ignore unknown fields.
