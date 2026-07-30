# Phase 2 — Crash-safe launch & resumable finalization

## Status

- Branch: `fix/crash-safe-side-effects`
- Keep `AUTOMATION_MODE` = **Preview**
- Preview and Paused send **nothing** automatically
- HR may deliberately drain eligible pending workflow emails via `drainWorkflowOutboxNow({ confirmed: true })`

## DROP-IN files

| File | Action |
|---|---|
| `V31_Automation.gs` | Full replace |
| `Code.gs` | Full replace |
| `Index.html` | Full replace |
| `V31_Idempotency_Tests.gs` | Full replace |
| `V31_Finalization_Tests.gs` | Full replace |
| `V31_Workflow_Notification_Tests.gs` | Full replace |

Then run `upgradeToV31_()` from the intended automation-owner account.

## Authorization / Preview

- Private: `dispatchPendingWorkflowNotifications_`, `dispatchPendingWorkflowNotificationsForAllCycles_`, `runReviewAutomationCore_`, `runReviewAutomationTrigger_`
- Public HR drain: `drainWorkflowOutboxNow({ confirmed, cycleId? })` — domain + HR + confirmation + audit
- Live trigger drains outbox only after mode === Live

## Tests

```text
runV31IdempotencyTests_()
runV31FinalizationTests_()
runV31WorkflowNotificationTests_()
```
