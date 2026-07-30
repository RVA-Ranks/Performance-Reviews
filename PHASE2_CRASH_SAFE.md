# Phase 2 — Crash-safe launch & resumable finalization

## Status

- Branch: `fix/crash-safe-side-effects`
- Keep `AUTOMATION_MODE` = **Preview**
- Do not enable Live until Workspace fault matrix passes

## DROP-IN files

Replace / add in the Apps Script project:

| File | Action |
|---|---|
| `V31_Automation.gs` | Full replace |
| `Code.gs` | Full replace |
| `Index.html` | Full replace |
| `V31_Idempotency_Tests.gs` | Full replace |
| `V31_Finalization_Tests.gs` | Add new file |
| `appsscript.json` | Unchanged unless scopes already match |

Then run `upgradeToV31()` (idempotent) to append new columns.

## New launch behavior

Per component (Calendar, manager/employee/HR email):

1. Persist `Sending` / `Creating` + attempt ID under a short lock
2. Perform external side effect **outside** the lock
3. Persist `Sent` / `Created` under a short lock
4. Stale in-progress claims become `Delivery Unknown` — **no automatic resend**
5. HR reconciles Unknown via `reconcileLaunchDelivery(cycleId, component, action)`

Calendar recovery uses:

- Persisted event ID
- Event tag `AITHERAS_REVIEW_CYCLE_ID`
- Description marker `[AITHERAS_REVIEW_CYCLE_ID:<cycleId>]` present at `createEvent()`

Calendar configuration (`setTag` / reminders) is best-effort after create:

- Launch may complete at `Created` (event exists)
- Config failure persists `Last Launch Error` and is **not** cleared by later email success
- HR sees “not Configured” warning + **Retry Calendar Config** until status is `Configured`

## New finalization behavior

```text
Awaiting Signatures → Finalizing → Complete
```

`Complete` is set only after:

- Manager PDF ID persisted
- Self PDF ID persisted
- Final distribution status = `Sent`

Artifact recovery:

- PDFs: `{documentType} - {cycleId}.pdf`
- Signatures: `{cycleId} - {sanitizedLabel}.png`

HR recovery: `retryReviewFinalization(cycleId, { allowUnknownResend })`

## Tests

```text
runV31IdempotencyTests()
runV31FinalizationTests()
```

## Repository topology

See `REPO_TOPOLOGY.md`. Set GitHub default branch to `master` (application tree), keep `archive/initial-readme`, add required CI from `.github/workflows/repository-checks.yml`.

## Rollback

1. Restore previous Apps Script version / git tag
2. New columns may remain empty (additive)
3. Cycles stuck in `Finalizing` can be completed with `retryReviewFinalization` after rollback/forward fix
