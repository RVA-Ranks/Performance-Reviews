# Performance Profile — Interactive Responsiveness

Branch: `perf/application-responsiveness`  
Feature work frozen. This document tracks BEFORE/AFTER interactive latency.

Diagnostics default: `ENABLE_PERFORMANCE_DIAGNOSTICS = false` in
[`V31_Performance.gs`](V31_Performance.gs). Set to `true` only while gathering
deployed manager browser evidence, then restore `false`.

Rollback tip: `backup/pre-perf-responsiveness` @ `c212443`.

## How to capture live timings

### Preferred: editor Run menu

1. Paste the perf-pass Apps Script files (see delivery notes).
2. Select **`runPerformanceProfile`** in the Run dropdown → **Run**.
3. Read the popup + **Executions → Logs** (single report; no duplicate print).

That runner:

- pure acceptance checks
- Home bootstrap cold + warm for the signed-in account
- Open Review for the first visible cycle
- restores diagnostics afterward

Does not send mail, create Calendar events, or mutate review workflow.

Open Meeting server cost ≈ Open Review (`getReviewCycle`). Meeting tab switch
is client-only. Record Signature must be timed in the deployed web app.

### Required: deployed Manager web app

1. Deploy/paste this build (Preview).
2. Optionally set `ENABLE_PERFORMANCE_DIAGNOSTICS = true` for server PERF lines.
3. Log in as the **manager account that previously saw ~5-minute Home**.
4. Load Home five times; record shell / loader / usable / server total.
5. Also time Open Review, Open Meeting, Record Signature (split signature write
   vs downstream vs refresh when possible).
6. Restore `ENABLE_PERFORMANCE_DIAGNOSTICS = false`.

## Static BEFORE inventory (pre-pass)

| Step | Cost driver |
|------|-------------|
| `ensureV31DataModel_` on every boot | migrate / format / protect |
| Repeated Settings/Assignments/Cycles reads | no request cache |
| CompensationRecords × N cycles | per-cycle full scans |
| HR `getAutomationAdminData_` on bootstrap | Drive `getFolderById` |
| HR Admin System Health + Comp Queue on every paint | post-bootstrap RPCs |

## Editor server timings (HR account — structural AFTER)

Actor: `aitheras-hr@aitheras.com` (`isHr: true`)  
Method: `runPerformanceProfile` in Apps Script editor (not browser/manager).

| Metric | Result | Verdict |
|--------|--------|---------|
| Home cold | 3609 ms | PASS (&lt;5s) |
| Home warm | 2941 ms | WARN (target &lt;2s; tolerable &lt;4s) |
| Open Review | 2319 ms | PASS (&lt;3s) |
| Payload | 14983 bytes | Excellent |
| Sheet reads | 5 | Reasonable (count) |
| Drive calls | 1 | Was HR automation folder probe on Home |
| Acceptance | 5/5 PASS | |

Warm attribution (do **not** sum parent + child):

```text
auth                     ~975 ms   [parent]
  (nested: user / settings / HR role)
review summaries / cycles ~751–753 ms  [same op; child of cycles]
v31Bootstrap             ~807 ms   [parent]
userProfile              ~356 ms
assignments               ~26 ms
serialization              ~6 ms
```

Notes:

- Labels previously said `managerBootstrap` while actor was HR — renamed to
  `homeBootstrap`.
- `sheetRead`/`driveCall` previously logged `durationMs: 0` (count only). Fixed
  to wrap actual `getValues` / `getFolderById` latency.
- Nested timers use `parent › child` labels.

## Closure refinements (this diagnostics commit)

| Change | Intent |
|--------|--------|
| Timed Sheet/Drive service calls | Real durations, not zero placeholders |
| Auth + v31Bootstrap sub-timers | Attribute remaining ~3s |
| Defer HR `getAutomationAdminData_` off Home | Home Drive calls → 0 |
| Lazy-load automation when Administration opens | Keep Admin complete without Home cost |
| Single Logger report | No duplicate profile print |

## Deployed Manager browser timings (REQUIRED)

Fill with the previously slow manager account through the **web app**.

| Run | Shell visible | Loader visible | Home usable | Server bootstrap |
|-----|---------------|----------------|-------------|------------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

| Operation | Min | Median | Max | Target |
|-----------|-----|--------|-----|--------|
| Home cold | | | | &lt;5s ideal / &lt;6s tolerable |
| Home warm | | | | &lt;2s ideal / &lt;4s tolerable |
| Open Review | | | | &lt;3s ideal / &lt;5s OK |
| Open Meeting | | | | &lt;3s |
| Signature accepted | | | | immediate feedback &lt;100ms |
| Downstream finalize | | | | staged messages OK |

&gt;8s → investigate. Minutes → automatic failure.

## UX acceptance (independent of backend ms)

- [ ] Feedback &lt;100ms after click
- [ ] Shell stays visible on refresh when already booted
- [ ] Slow-path message after ~2s / ~8s
- [ ] Mutation buttons disable while pending
- [ ] Loaders always clear on success/failure
- [ ] Stale responses cannot overwrite newer screens

## Remaining known slow paths

- Cold Apps Script container startup (outside app control)
- Home still parses review JSON for progress bars
- Warm Home still ~3s for HR in editor — manager web evidence pending
- Signing still full-bootstrap refreshes after success (correctness over speed)
