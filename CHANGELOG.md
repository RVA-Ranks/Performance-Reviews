# V3.1 Changelog

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
