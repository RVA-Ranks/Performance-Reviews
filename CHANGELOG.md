# V3.1 Changelog

## Finalization recovery closure

- Manager/Self PDF generation failures now use the CAF classification model:
  0 artifacts → `Failed` (safe ordinary retry); 1 → adopt/`Sent`; >1 or scan
  failure → `Delivery Unknown` (HR reconciliation).
- Fresh `Sending` claims run an immediate deterministic/provenance candidate
  scan before telling HR to wait for the stale window.
- Review PDFs store immutable Drive description provenance
  (`AITHERAS_REVIEW_PDF`); recovery accepts filename **or** provenance.
- `retryReviewFinalization` returns structured `{ ok, partial, blocker,
  components }` on later-stage failure instead of an opaque throw; retries are
  audited either way.
- Cycle + System Health Retry Finalization always refresh authoritative state
  in `finally`.
- System Health Recovery Center surfaces CAF / history / rate-update blockers
  with Recheck Rate Update / Recover CAF / Compensation Queue actions — not
  only generic Retry Finalization.

## Performance diagnostics closure

- Sheet/Drive PERF events now record **actual** `getValues` / `getFolderById`
  latency (not zero-ms counters).
- Bootstrap attribution: `auth › …` and `v31Bootstrap › …` child timers;
  `cycles › review summaries` marked as child of `cycles` (do not sum).
- HR automation admin (Drive signature-recovery folder probe) deferred off Home
  bootstrap; loaded when Administration opens (`automationDeferred`).
- `runPerformanceProfile` prints one Logger report; Home Drive-call target is 0.
- Editor HR evidence captured in `PERFORMANCE_PROFILE.md` (~3.6s cold / ~2.9s
  warm). Deployed manager web-app ×5 still required for 100%.

## Performance & responsiveness (interactive paths)

- Added `V31_Performance.gs` with optional PERF logging
  (`ENABLE_PERFORMANCE_DIAGNOSTICS`, default off) and request-scoped Sheet /
  CompensationRecords caches.
- Manager/Employee Home no longer runs `ensureV31DataModel_` on every
  bootstrap; schema ensure remains on upgrade/setup/mutations.
- Cycle lists load CompensationRecords once per request (not once per cycle).
- Home cycle summaries use a lighter `summaryOnly` V31 DTO; full compensation /
  guidance / HR recovery blocks load when a cycle is opened.
- HR System Health and Compensation Queue load only when Administration is
  opened, not on every app paint.
- Loading overlay: staged slow-path messaging, stale-response protection on
  bootstrap/open-cycle, keep shell visible on refresh when already booted.
- Profile template: `PERFORMANCE_PROFILE.md`. Tests:
  `runPerformanceProfile` (editor Run menu) and `runV31PerformanceTests_()`.

## Meeting compensation placement + scoring regressions

- Compensation Decision details now render on the **Meeting** tab immediately
  below Review Comparison (collapsed, Manager/HR only, hidden from employees).
  Overview card remains.
- Derived-average UI copy standardized to **Overall Score**.
- HR Recommendation Email Delivery Unknown now has Mark Confirmed / Confirmed
  Resend (never auto-resend), matching manager outcome recovery.
- Scoring regressions: `[5,4,4,3]→4.00`, `[5,N/A,3]→4.00`, client overall `7`
  with factor average `3.80` stores `3.80`, Manager−Employee `+1` / `-2`.

## Live-test polish — loading, scoring, CAF names, roster, HR notify

- Global indeterminate loading overlay (`showAppLoading_` /
  `updateAppLoading_` / `hideAppLoading_`) for navigation, signing stages,
  compensation submits, and bootstrap. Success and failure always clear it.
- Side-by-side difference is now **Manager − Employee** with explicit `+`
  signs and an explanatory tooltip.
- Overall Score is derived as the average of scored competency ratings
  (2 decimals). Editable overall controls removed; server ignores client
  `overallRating` and recomputes on save/submit. Historical sealed values are
  left untouched.
- Durable HR recommendation email
  (`COMP_RECOMMENDATION_READY:<CompensationRecordId>`) sends when a manager
  recommendation is submitted (self-evaluation not required), with queue link
  and derived pay details.
- CAF Drive files and email attachments use the shared
  `buildHumanReadableDocumentFileName_` helper
  (`… - Compensation Adjustment Form.pdf`). Legacy UUID names are renamed on
  reuse; provenance remains the crash-safe identity.
- Roster update path hardened: currency parsing, Failed persistence when the
  assignment row/column is missing, immediate `ensureCompensationRateUpdate_`
  after CAF/history, clearer
  `Scheduled Pay Rate Update · Effective: YYYY-MM-DD` queue label.

## Final distribution binds approved CAF (`feat/compensation-integration`)

- `ensureFinalDistribution_()` now binds `managerPdfId`, `selfPdfId`,
  `cafRequired`, and `cafPdfId` in the durable claim. Approved adjustments
  validate the sealed CAF before claim, immediately before send, and again
  before Sent commit. CAF disappearance/change becomes Delivery Unknown —
  never a silent 2-PDF send.
- `sendCompletedPacket_()` takes an authoritative `packetSpec`; opportunistic
  CAF attach/skip is removed from the claim path.
- `compensationFinalizationDisposition_()` always requires a sealed CAF when
  the decision is Adjustment Recommended, even if
  `COMPENSATION_DECISION_REQUIRED` is later turned off.
- Manager outcome email Delivery Unknown retains its attempt ID and exposes
  HR Mark Confirmed / Confirmed Resend (never auto-resend) in the
  Compensation Queue.
- Future-dated rate updates display as `Scheduled for <date>` in the queue.

## Compensation UX polish — percentage-only, deny, privacy, roster (`feat/compensation-integration`)

- Manager recommendation is **percentage-only**. Recommended rate/salary are
  read-only derived values. The server ignores any client-supplied rate and
  recalculates from `EmployeeAssignments.Current Pay Rate`.
- HR owner decisions are now: Approve Recommendation, Approve Different Amount
  (percentage-only), or Decline Adjustment. Denied recommendations preserve the
  manager recommendation for audit but create no CAF, history, or rate update.
- Durable manager outcome emails (approved / modified / denied) with claim →
  send → confirm on `CompensationRecords`.
- Hard employee privacy for denials: no acknowledgement, no CAF, no compensation
  wording in the final packet, no recommendation disclosure.
- Approved final distribution attaches the sealed CAF; denied/no-adjustment
  packets attach only the two review PDFs.
- Human-readable PDF filenames:
  `[Employee] - [YYYY-MM-DD] - [Review Type] - [Document].pdf`
  Legacy `AITHERAS_<cycleId>_…` names remain recoverable via provenance/legacy
  name lists.
- After CAF seal → history write, due roster updates apply to
  `EmployeeAssignments.Current Pay Rate` before Complete; conflict-aware
  optimistic concurrency unchanged. Future effective dates stay
  `Pending Effective Date`.
- Manager/HR collapsed Compensation Details section on the cycle overview.

## Compensation edges — signature provenance & finalization gate (`feat/compensation-integration`)

- CAF signatures now validate authoritative **role + cycle provenance**, not
  just image MIME. `validateAuthoritativeRoleSignature_` proves the artifact is
  the winning signature for that role (same File ID across the Manager Review
  and Self-Evaluation columns), is signed, lives in an approved signature
  folder, uses the deterministic canonical/legacy name, and (when present)
  carries a matching signature provenance marker. A mislinked File ID pointing
  to another role's or another cycle's PNG can no longer seal a CAF.
- Finalization compensation gate now fails closed via a pure
  `compensationFinalizationDisposition_`: only explicit **No Adjustment** (or
  compensation not required) passes without a sealed CAF; **Pending**, blank,
  or unexpected legacy values block completion.
- `listCompensationCafCandidates_` no longer aborts on the first invalid
  same-named file. `collectCompensationCafArtifacts_` returns valid + rejected;
  a single valid candidate still reconciles, rejected artifacts are retained as
  evidence (never trashed) and reported in alerts / last-error.
- Compensation Queue Conflict action renamed to **Recheck Rate Update** and now
  shows the expected predecessor, approved new rate, and the conflict reason;
  no force-overwrite is offered.

## Compensation hardening — CAF recovery, history, rate integrity (`feat/compensation-integration`)

- CAF signature embedding now fails closed: all three PR signature artifacts
  are validated as readable images before the PDF is built. A missing or
  unreadable signature blocks sealing instead of writing placeholder text.
- CAF PDFs carry a deterministic provenance marker (cycle + record + approved
  amount) on the file description. Candidate reuse/recovery validates folder,
  MIME, name, and provenance — a stale or manually uploaded same-named file is
  rejected.
- Real `Delivery Unknown` CAF reconciliation: exactly one valid candidate is
  reconciled/sealed, zero regenerates under a fresh claim, multiple raises a
  blocking `caf:ambiguous` system alert for HR selection. Generation failure
  now records `Delivery Unknown` (not `Failed`) so recovery can search Drive.
- `CompensationHistory` is independently repairable: durable
  `Compensation History Status` plus idempotent `ensureCompensationHistory_`
  and a daily repair sweep guarantee exactly one history row for a sealed CAF
  even after a partial failure.
- Effective-date rate update is conflict-aware: the approved rate is only
  written when the live `Current Pay Rate` still equals the expected
  predecessor. A mismatch raises a blocking `rate-update-conflict` alert and
  never overwrites payroll data. Durable lifecycle:
  `Pending → Updating → Complete`, with `Pending Effective Date`,
  `Delivery Unknown`, `Conflict`, and post-write verification.
- `Manager Business Justification` is now stored on `CompensationRecords` and
  `CompensationHistory`, and surfaced in the HR Compensation Queue and CAF PDF.
- Durable HR "owner decision required" notification via the SystemAlerts ledger
  when manager review, self-evaluation, and recommendation are all submitted;
  auto-resolved when the owner decision is recorded.
- Review completion is gated on CAF sealing when an adjustment exists
  (`ensureCompensationSealedForFinalization_`).
- HR-callable recovery: `recoverCompensationCafPdf`,
  `recoverCompensationRateUpdate` with Compensation Queue buttons.

## Compensation integration — recommendation / owner decision / CAF (`feat/compensation-integration`)

- Manager recommendation is in-app (not standalone CAF dashboard): recommend
  adjustment or confirm no adjustment with second confirmation.
- `EmployeeAssignments.Current Pay Rate` (header-based) is the sole rate source;
  annual salary is always derived as rate × 2080.
- Added `CompensationRecords` and append-only `CompensationHistory`.
- HR Compensation Queue records owner approve/override; manager recommendation
  remains immutable. HR may edit owner decision only before any PR signature.
- Meeting/signature eligibility requires owner decision when an adjustment was
  recommended; controls still require Open Meeting / Release Signatures.
- Employee sees a read-only acknowledgement panel before signing when approved
  compensation exists; manager recommendation and owner notes stay hidden.
- Final CAF PDF generates once after all three PR signatures, stored under
  `COMPENSATION_FOLDER_ID` as `AITHERAS_<cycleId>_Compensation_Adjustment_FINAL.pdf`.
- Effective-date automation updates `Current Pay Rate` exactly once; history
  appends on CAF seal, not on roster update.
- Legacy `Adjustment Submitted` migrates to `Adjustment Recommended`.
- New modules: `V31_Compensation.gs`, `V31_Compensation_Pdf.gs`,
  `V31_Compensation_Tests.gs`. Standalone CAF remains for unrelated adjustments.

## Previous Review Context — security/privacy correction

- `getPreviousReviewPdf` now validates document type and reuses
  `validateAuthoritativeFinalPdfId_` before returning bytes (MIME, trash,
  approved folder, deterministic prior-cycle filename).
- Chronology fail-closed: Complete rows without provable prior dates are
  ineligible (`PREVIOUS_REVIEW_DATE_UNVERIFIABLE`).
- Full historical view uses allow-listed DTOs; raw manager/self/meeting JSON
  is never returned to the client.
- Cache keys include fallback setting; cache hits revalidate same-type when
  fallback is disabled; Complete transitions invalidate employee caches.
- Summary distinguishes stored PDF IDs from verified downloads; factor lists
  include only historically present factors.
- Action buttons moved outside the disclosure `<summary>`.
- Employee identity remains email-based this release (optional Employee ID
  when present); no schema migration.
- No Drive sharing changes. Do not merge until Sandbox endpoint auth passes.

## Previous Review Context — post-v3.1 enhancement (`feat/previous-review-context`)

- Added authorized previous-review context for the current assigned manager and
  HR: `getPreviousReviewContext`, `getPreviousReviewCycle`, and
  `getPreviousReviewPdf` in `V31_Previous_Review.gs`.
- Resolves the employee's most recent completed prior review (same review type
  preferred; other-type fallback labeled). Matching uses Employee ID when
  present, otherwise normalized email — never name alone.
- Manager editor shows an async, collapsed Previous Review panel; historical
  view is read-only and hides compensation, editing, and recovery controls.
- No schema migration; no Drive sharing changes; compensation and recovery
  metadata are excluded from the summary DTO.
- Added `V31_Previous_Review_Tests.gs` plus security-surface coverage. Does not
  modify the frozen Delivery F release candidate (`v3.1-delivery-f-rc`).

## Delivery F Stage F1 — release candidate freeze

- Froze immutable release candidate
  `c46c2bd79a0dc7ab6665f3a9dc1ab2a7a67ea453` on
  `fix/crash-safe-side-effects`.
- Annotated tag `v3.1-delivery-f-rc` and backup branch
  `backup/delivery-f-rc-c46c2bd` created for sandbox validation.
- Confirmed `V31_Security_Tests.gs` and all private suites present.
- Working tree clean; no application source changes during freeze.
- Production remains Preview. Sandbox evidence continues in
  `SANDBOX_EVIDENCE.md`.

## Delivery E close — security suite and sandbox live probes

- Recorded Delivery D tip `c234d86` and prior Delivery E tip `741701c`.
- Added `V31_Security_Tests.gs` and pure `decidePublicAdminAuthorization_()`
  matrix for employee/manager/HR/owner capability gates.
- Implemented Sandbox-only `executeSandboxLiveProbes_()` for Calendar,
  manager/self templates, review folder, bounded completed-PDF Drive
  validation, and signature artifact access; Production remains blocked.
- Deep audit verification limits to Complete cycles and
  `FINALIZATION_COMPLETE:` Event IDs, and records duration.
- Added `SANDBOX_EVIDENCE.md` procedures and evidence tables.
- Detail-loading fallback now logs when a full summary rebuild is required.

## Delivery E — readiness security and live-boundary suites

- Preserved approved Delivery D tip `c234d86`.
- Sandbox live-probe readiness reports now expose
  `requested` / `allowed` / `executed` / `checksRun` / `checksSkipped` and
  never claim probes executed when `liveProbesExecuted` is false.
- Deep readiness verifies deterministic finalization audit rows for Complete
  cycles that claim a healthy Event ID; missing `ReviewAuditLog` rows block
  and expose Retry Finalization.
- System Alert association matches role/document/component identity; generic
  category fallback requires exactly one candidate.
- Added pure completed-PDF probe classification; Drive execution remains
  `Requires Daniel Sandbox`.
- Removed obsolete `isTerminalCycleStatus_()`; detail loading parses item IDs
  to avoid a full-history rebuild when possible.
- Expanded production readiness security and live-boundary test suites.

## Delivery D correction — terminal-cycle and signature recovery health

- Complete cycles are no longer skipped before PDF, distribution, finalization
  audit, and signature health inspection; Cancelled cycles are handled
  separately and never generate ordinary launch/workflow retries.
- Added `classifySignatureHealth_()` for Delivery Unknown, Failed, fresh/stale
  Signing, reconciliation Failed/Unknown, artifact/audit warnings, and recovery
  metadata without a Signed winner.
- Configuration Check and Sandbox Live Probes are separate UI controls; live
  probes appear only when `ENVIRONMENT=Sandbox` and require confirmation.
- Deep Check Results render blocking and warning readiness details in the UI.
- Matching System Alerts attach to the authoritative Recovery Center item
  instead of duplicating as a second recovery row; unmatched alerts remain
  incident records. Structured details load on demand via
  `getSystemHealthItemDetails()`.
- Pure regression coverage expanded; browser accessibility and load timing
  remain `Requires Daniel Sandbox`.

## Delivery D — HR System Health and recovery UX

- Added an HR Administration System Health dashboard with executive summary,
  component cards, Recovery Center, and System Alert viewer.
- Normal health load uses settings, trigger metadata, and Sheet counts with a
  30-second cache; Deep Health Check is manual-only and keeps live Workspace
  probes behind Sandbox confirmation.
- Recovery buttons call existing Delivery B/C endpoints with explicit
  confirmations and partial-success messaging. No employee/manager UI changes.
- Added `V31_System_Health.gs`, `V31_System_Health_Tests.gs`, and admin CSS in
  `Index.html`. Workspace Drive/Calendar/folder timing evidence remains
  `Requires Daniel Sandbox`.

## Delivery C correction — recovery race and audit gaps

- Finalization audit never treats cycle `Complete` as done unless the
  deterministic `FINALIZATION_COMPLETE:<cycleId>` row exists; missing-event
  inconsistency downgrades to Delivery Unknown and recreates the write.
- Deterministic PDF recovery commits only when expected status, attempt ID, and
  file ID still match, so newer attempts and HR reconciliations are preserved.
- Final distribution revalidates both authoritative PDFs immediately before
  claim and again before send, binds those IDs in the claim, and verifies them
  before committing Sent.
- Unresolved `Sent` system alerts keep `Sent` on recurrence (occurrence count
  and details still update) so automatic drains do not re-email the same
  incident. Fresh `Sending` cannot be manually resolved until stale.
- Added `FINALIZATION_AUDIT_STALE_MINUTES=15` and workflow
  `markWorkflowNotificationConfirmed()` with exact token, attempt, recipients,
  evidence note, deterministic audit Event ID, and no email send.
- HR UI distinguishes unresolved incidents from alert-notification delivery
  state and exposes workflow Mark Confirmed. Pure regression coverage added;
  Workspace evidence remains `Requires Daniel Sandbox`.

## Delivery C commit 2 — crash-safe Calendar and finalization

- Added independent durable Calendar configuration claims and recovery state
  while preserving event timing, guests, reminders, marker recovery, and
  successful launch-recipient skip behavior.
- Added separate `PDF_GENERATION_STALE_MINUTES=30` and
  `FINAL_DISTRIBUTION_STALE_MINUTES=15` settings plus component errors,
  completion timestamps, and recovery JSON.
- Added canonical/legacy deterministic PDF recovery, ambiguity blocking and
  alerts, exact Employee/Manager/cycle-HR packet validation, no automatic
  resend after Delivery Unknown, explicit HR resend, and no-send evidence-based
  confirmation.
- Inserted `ReviewAuditLog` Event ID in the approved column order without
  inventing historical IDs; ordinary events use UUIDs and finalization/manual
  confirmation use deterministic IDs.
- Added durable finalization-audit claims and made `Complete` depend on both
  PDFs, Sent distribution, and `FINALIZATION_COMPLETE:<cycleId>`.
- Added minimal HR controls, pure regression coverage, Sandbox fault points,
  and commit-2 documentation. Workspace-backed evidence remains
  `Requires Daniel Sandbox`.

## Delivery C commit 1 — durable workflow recovery and system alerts

- Added configurable 15-minute workflow outbox and system-alert stale thresholds while preserving nonblank deployment settings.
- Required active AITHERAS HR authorization plus the exact recovery-email token for manual outbox drains and recipient-specific retries; confirmations now bind exact recipients and component counts.
- Added the protected append-only `SystemAlerts` lifecycle with deterministic unresolved deduplication, crash-safe claim/send/commit behavior, Delivery Unknown handling, and audited manual or authoritative system resolution.
- Wired workflow Delivery Unknown and signature warnings to durable alerts, added a minimal HR alert panel, and added pure system-alert/workflow regression and 1000-row planning tests.
- Workspace-backed mail, protection, permissions, and scale evidence remains `Requires Daniel Sandbox`.

## Delivery B correction — commit classification and reconciliation claims

- Separated signature outcomes into `COMMITTED`, `SUPERSEDED`, and `COMMIT_UNKNOWN`; only a confirmed loser enters automatic disposition.
- Moved signature and reconciliation audits after authoritative commits. Audit failure now preserves the winner and writes a dedicated audit warning.
- Added distinct active/winning attempt fields, ambiguous-commit recovery metadata, artifact warnings, audit warnings, and durable per-role reconciliation claims.
- Reconciliation now claims the selected candidate before Drive validation, commits without moving the file, and organizes the authoritative winner afterward.
- Restricted automatic legacy normalization to the exact historical `<cycleId> - Combined_Review_Packet_-_<ROLE>.png` name or an exact structured provenance marker.
- Added private Sandbox fault and evidence harnesses. No operational warning email was introduced.

## Delivery B — crash-safe signatures

- Added authoritative role-level signature status, file ID, signed timestamp, attempt, and error fields while preserving both document mirrors.
- Added attempt-specific artifacts, provenance markers, lock-protected winner commits, and post-lock loser trash/quarantine handling.
- Added idempotent `AITHERAS Signature Recovery` provisioning under the review folder; invalid configured IDs and ambiguous matches block migration.
- Matching legacy IDs normalize to `Signed`; missing, conflicting, or invalid IDs become `Delivery Unknown` without invented attempt IDs.
- Added HR artifact provenance and cleanup warnings plus `V31_Signature_Tests.gs`.
- Confirmed automation owner and system admin as `aitheras-hr@aitheras.com`; durable operational alerts remain Delivery C work.

## Production candidate freeze

- Identified the deployed build as `3.1-production-candidate` in bootstrap data and HR Administration
- Added explicit `APP_VERSION` and `ENVIRONMENT` settings; existing deployments default to `Production`
- Added settings placeholders for automation run health and sandbox-only fault controls without enabling Live or fault injection

## Transactional trigger activation

- Replaced delete-before-create behavior with create, verify, persist metadata, persist Live, re-read, then cleanup
- Added a user-scoped trigger administration lock; ScriptApp operations no longer hold the global review-data lock
- Restored prior mode and metadata and removed uncommitted replacements on activation failure
- Preserved verified replacements on partial old-trigger cleanup and surfaced failed trigger IDs for manual recovery
- Added owner-visible trigger health with verified ID/handler facts, expected schedule labels, and the cross-account visibility limitation
- Removed automation-owner fallback behavior; blank or mismatched owners block Live
- Added Production-safe fault guards and private Delivery A readiness checks
- Added structured trigger and readiness test suites; live and concurrency cases remain `Requires Daniel Sandbox`

## Automation recovery and administrative surface

- Eligible stale workflow-notification `Sending` claims now transition to `Delivery Unknown` without automatic resend and are surfaced to HR with their attempt IDs
- Bulk outbox drains skip clean historical cycles and include Delivery Unknown-only cycles in diagnostics
- Editor-only upgrade, migration, and test runners are now private Apps Script functions
- Added designated automation-owner enforcement, persisted trigger identity metadata, and cross-account trigger cleanup warnings
- Moved one-time signature-migration notification delivery outside the global lock

## Phase 2 — Crash-safe per-component launch side effects

- Added independent Status/Attempt ID/Started At fields for Calendar, Manager email, Employee email, and HR email so each component's in-flight state survives a crash without risking a duplicate send
- Replaced the single-lock launch loop with short claim/commit locks per component (`claimLaunchEmailStep_` / `commitLaunchEmailStep_`, `claimCalendarCreateStep_` / `commitCalendarCreatedStep_`); Calendar/Mail calls never run while a lock is held
- Added a `Delivery Unknown` state: a claim that goes stale (no confirmed result within `SENDING_STALE_MS`) is marked Unknown instead of being auto-resent, requiring explicit HR reconciliation
- Added `reconcileLaunchDelivery(cycleId, component, action)` (HR-only) to mark a Delivery Unknown component as delivered or force a reconciled resend
- Replaced `resendReviewLaunchEmails(cycleId)` with `resendReviewLaunchEmails(cycleId, recipients)`, auditing a per-recipient outcome for each of manager/employee/HR independently
- Calendar events now embed an `[AITHERAS_REVIEW_CYCLE_ID:...]` marker in the description in addition to the Calendar tag, and recovery search widened to a ±7 day window and now also matches by description marker or a known event ID
- Calendar event creation returns as soon as the event exists; tag/reminder configuration happens in a separate best-effort step so a crash right after creation still leaves a discoverable, guest-invited event
- `runReviewAutomation` no longer holds the global lock for the whole candidate loop — only the row claim/create is locked; Calendar/Mail side effects for each candidate run outside any lock
- `retryReviewLaunch` and `resendReviewLaunchEmails`/`reconcileLaunchDelivery` no longer wrap the launch in an outer lock, since every external action already claims its own short lock
- `isReviewLaunchComplete_` / `isReviewLaunchComponentsComplete_` now recognize per-component Sent/Created statuses (not just legacy Sent At timestamps), so a cycle can be recognized complete without ever setting the single legacy notice timestamp
- HR-visible cycle data now exposes per-component statuses and Delivery Unknown flags (`getV31CycleData_`, `getReviewLaunchComponentSummary_`)
- Updated `V31_Idempotency_Tests.gs` for the new per-component architecture: added pure tests for the claim/skip/mark-unknown decision matrix and Calendar recovery-by-marker; removed the prior adapter-injection tests for the now-removed single-pass `orchestrateReviewLaunchSteps_(stored, persistFn, adapters)` signature

## Phase 2b — Resumable finalization

- Added cycle status `Finalizing` between `Awaiting Signatures` and `Complete`
- HR signature no longer marks the cycle Complete before PDFs and distribution finish
- Manager PDF, Self PDF, and final distribution each have independent Status fields and short claim/commit locks
- Ambiguous final email delivery becomes `Delivery Unknown` and requires explicit HR `allowUnknownResend`
- Added `retryReviewFinalization(cycleId)` and HR UI **Retry Finalization**
- Added plain-text `body` alongside every `htmlBody` email payload
- Removed `HtmlService.XFrameOptionsMode.ALLOWALL` (now DEFAULT)
- Added `V31_Finalization_Tests.gs`
- Added `.github/workflows/repository-checks.yml` and `REPO_TOPOLOGY.md`

## Phase 1 — Launch idempotency (post-baseline)

- Added per-step launch fields: Calendar Status, Manager/Employee/HR Email Sent At, Launch Completed At, Last Launch Error, Launch Attempt Count
- Rewrote launch orchestration so Calendar creation and each recipient email persist immediately after success
- Retries skip completed components and never recreate a Calendar event when an event ID already exists
- Automation preview now shows partial component status for incomplete launches
- Legacy cycles with Automation Notice Sent At + Calendar Event ID are treated as complete and backfilled
- Added `V31_Idempotency_Tests.gs` for partial-failure and retry simulations
- Kept intentional HR resend as an audited manual override that does not clear timestamps
- Production remains Preview-first; do not enable Live until Workspace retry tests pass

## Launch hardening (post Phase 1)

- Incomplete same-period cycles (including manual) are resumed by automation instead of blocking as duplicates
- Added HR `retryReviewLaunch` + **Retry Launch** control for unfinished launches (distinct from Resend)
- Each launch persist flushes the spreadsheet so concurrent readers see component progress
- Calendar creation recovers an existing event tagged `AITHERAS_REVIEW_CYCLE_ID` before creating a new one
- Idempotency tests now drive `orchestrateReviewLaunchSteps_` with stubbed Calendar/Mail adapters

## Automation

- Added daily hire-date review automation
- Added six-month review calculation
- Added first-year review calculation
- Added recurring annual review calculation
- Added 28-day launch window
- Added Preview, Live, and Paused modes
- Added installable daily trigger management
- Added automation preview
- Added Run Now control
- Added automation activity log
- Added duplicate-cycle prevention
- Added retry handling for incomplete launches
- Added optional employee-level automation exclusion

## Calendar

- Added one shared calendar event per review cycle
- Added employee, manager, and HR as guests
- Added normal Google Calendar invitations
- Added configurable event time and duration
- Added weekend-to-Monday shifting
- Added calendar email reminder
- Added calendar pop-up reminder
- Added review portal and help links to event description
- Prevented manager-only compensation links from appearing in the shared event

## Launch emails

- Added one HR launch-confirmation email
- Expanded manager launch email
- Expanded employee launch email
- Added role-specific deep links
- Added form due dates
- Added How-To Guide links
- Added HR resend-instructions control

## Compensation

- Added manager dashboard compensation action
- Added review Overview compensation card
- Added Compensation Adjustment app setting
- Added Adjustment Submitted outcome
- Added No Adjustment Recommended outcome
- Added optional compensation notes
- Added finalization gate until decision is recorded
- Restricted compensation URL and decision data to managers and HR

## Guided help

- Added first-login walkthrough
- Added permanent How-To Guide
- Added manager guide
- Added employee guide
- Added HR guide
- Added review-meeting guide
- Added signature guide
- Added frequently asked questions
- Added contextual cycle guidance
- Added deadline notifications
- Added compensation notifications
- Added help notification in the notification drawer

## Data model

- Added `ReviewAutomationLog`
- Added `Review Automation` to assignments
- Added automation source and key fields
- Added manager and employee due dates
- Added calendar event fields
- Added compensation-decision fields
- Added per-recipient launch email timestamps and launch completion fields

## Preserved

- V3 autosave and local recovery
- Independent evaluation privacy
- Review-meeting comparison
- Single signature per participant
- HR final signature
- Final PDF generation
- Existing V3 review cycles and templates
