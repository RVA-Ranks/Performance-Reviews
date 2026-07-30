# V3.1 Changelog

## Production candidate freeze

- Identified the deployed build as `3.1-production-candidate` in bootstrap data and HR Administration
- Added explicit `APP_VERSION` and `ENVIRONMENT` settings; existing deployments default to `Production`
- Added settings placeholders for automation run health and sandbox-only fault controls without enabling Live or fault injection

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
