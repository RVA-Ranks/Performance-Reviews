# Performance Profile — Interactive Responsiveness

Branch: `perf/application-responsiveness`  
Feature work frozen. This document tracks BEFORE/AFTER interactive latency.

Diagnostics default: `ENABLE_PERFORMANCE_DIAGNOSTICS = false` in
[`V31_Performance.gs`](V31_Performance.gs). Set to `true` only while profiling,
then return to `false`.

## How to capture live timings

1. Paste `V31_Performance.gs` plus updated `Code.gs`, `V31_Automation.gs`,
   `V31_Compensation.gs`, and `Index.html`.
2. Set `ENABLE_PERFORMANCE_DIAGNOSTICS = true`.
3. Open **Executions** in the Apps Script project.
4. As Manager / Employee / HR, run each action five times (cold + warm).
5. Copy `PERF` JSON lines into the tables below.
6. Set diagnostics back to `false`.

Client timings appear in the browser console when bootstrap returns
`perfDiagnostics: true`.

## Static BEFORE inventory (code analysis @ tip before this pass)

Manager Home was a single RPC `getReviewBootstrapData` that:

| Step | Cost driver |
|------|-------------|
| `ensureV31DataModel_` on every boot | Header ensure, checkbox writes, compensation migrate, format/protect |
| Settings / Assignments / Cycles | Repeated full-sheet `getDataRange` with no request cache |
| `getV31CycleData_` × N cycles | `findCompensationRecordByCycle_` → **full CompensationRecords scan per cycle** |
| Review JSON parse × N | Progress bars for every visible cycle |
| HR only: `getAutomationAdminData_` | Preview candidates + Drive recovery-folder validation |
| HR only after paint | `getSystemHealthSummary` + `getCompensationQueue` even when Admin hidden |

Not on manager Home path (already): Previous Review, Recovery Center, PDF/Drive
validation for finalization, signature image blobs.

### Estimated BEFORE sheet reads (manager, C visible cycles)

```text
Settings:     3–5
HR:           1
Assignments:  2
Cycles:       1 (+ migrate scan)
Compensation: C   ← dominant when C is large
```

Live multi-minute Home loads are consistent with migrate + O(C) compensation
scans + cold Apps Script container startup.

## Live BEFORE (Daniel Workspace)

Fill after profiling with diagnostics on **before** deploying optimizations, or
use the first cold run after paste as the baseline if measuring post-change.

### Manager

| Operation | Run1 | Run2 | Run3 | Run4 | Run5 | Min | Median | Max |
|-----------|------|------|------|------|------|-----|--------|-----|
| Home cold | | | | | | | | |
| Home warm | | | | | | | | |
| Open Review | | | | | | | | |
| Open Meeting | | | | | | | | |
| Previous Review | | | | | | | | |
| Compensation Details | | | | | | | | |
| Record Signature | | | | | | | | |

### Employee

| Operation | Min | Median | Max |
|-----------|-----|--------|-----|
| Home | | | |
| Open Self Evaluation | | | |
| Save / Submit | | | |
| Meeting | | | |
| Sign | | | |

### HR

| Operation | Min | Median | Max |
|-----------|-----|--------|-----|
| Home | | | |
| Administration (first open) | | | |
| Compensation Queue | | | |
| System Health | | | |
| Owner Decision | | | |

## Changes in this pass (AFTER expected shape)

| Change | Expected effect |
|--------|-----------------|
| Skip `ensureV31DataModel_` on interactive bootstrap | Removes migrate/format from Home critical path |
| Request-scoped spreadsheet + settings + sheet caches | Collapse repeated Settings/Assignments/Cycles reads to ~1 each |
| `getCompensationRecordsByCycleId_` once per request | Compensation cost O(1 sheet) not O(C sheets) |
| Home `summaryOnly` V31 DTO | Skip full compensation record views, guidance, HR recovery blocks on list |
| Defer System Health + Comp Queue until Admin opened | HR Home no longer pays for Admin RPCs |
| Staged loading + stale request tokens + keep shell on refresh | Perceived responsiveness &lt;100ms feedback |

## Live AFTER

### Manager

| Operation | Target | Min | Median | Max | Pass? |
|-----------|--------|-----|--------|-----|-------|
| Shell visible | &lt;2s | | | | |
| Home cold | &lt;5s | | | | |
| Home warm | &lt;2s | | | | |
| Open Review | &lt;3s | | | | |
| Open Meeting | &lt;3s | | | | |
| Click feedback | &lt;100ms | | | | |

### Example PERF log shape

```text
PERF managerBootstrap total                …ms
PERF auth                                  …ms
PERF cycles / review summaries             …ms
PERF v31Bootstrap                          …ms
PERF serialization                         …ms
PERF bootstrap bytes                       …
PERF sheetRead count (request)             …
```

## Remaining slow paths (known)

- HR bootstrap still loads `getAutomationAdminData_` (includes Drive folder
  probe) because Administration settings render from that payload.
- Home still parses Manager/Self review JSON for progress percentages.
- Cold Apps Script container startup is outside application control.
- Signing still refreshes full bootstrap after success (durable correctness).

## Regression guardrails

Performance changes must not weaken:

- permissions / domain checks
- denied compensation privacy
- signature provenance
- CAF / final distribution durability
- rate-update conflict protection
- Overall Score / Manager−Employee delta rules
