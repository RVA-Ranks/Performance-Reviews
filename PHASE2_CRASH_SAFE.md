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
| `V31_Finalization_Tests.gs` | Full replace |
| `V31_Workflow_Notification_Tests.gs` | Full replace |
| `appsscript.json` | Unchanged unless scopes already match |

Then run `upgradeToV31()` (idempotent) to append new columns.

## Recovery highlights

- PDF reconciliation validates MIME, review-folder parent, deterministic name, candidate membership, `Finalizing`, and `Delivery Unknown`
- Signature reconciliation: `reconcileSignature` / `listSignatureCandidates`
- Workflow outbox: `dispatchPendingWorkflowNotifications` (+ all-cycles drain from daily trigger)
- Notification eligibility is stage-gated; HR retry lists only eligible unresolved components
- Calendar rebuild uses Creating claim + post-claim marker recovery
- Cancelled cycles do not block manual recreation

## Tests

```text
runV31IdempotencyTests()
runV31FinalizationTests()
runV31WorkflowNotificationTests()
```

Keep Live probes off until Preview fault matrix passes.

## Rollback

1. Restore previous Apps Script version / git tag
2. New columns may remain empty (additive)
