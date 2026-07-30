# AITHERAS Performance Review Portal V3.1

V3.1 adds hire-date automation, Google Calendar invitations, manager compensation tasks, and a full in-app how-to system to the working V3 review portal.

## What V3.1 does

### Automatic review launches

The system checks active employee assignments every day and launches:

- A **6-Month Review** at the employee's six-month anniversary
- A **1-Year Review** at the employee's first anniversary
- An **Annual Review** on each later anniversary

The default launch window is **28 days before the review date**.

The automation uses the `Hire Date` and active manager relationship stored in `EmployeeAssignments`.

### Launch package

Each review launch creates:

1. One email to HR confirming the process was launched
2. One manager email with:
   - Manager Performance Review link
   - Compensation Adjustment workflow link
   - Form due date
   - Meeting instructions
   - Manager how-to guide
3. One employee email with:
   - Self-Evaluation link
   - Form due date
   - Privacy explanation
   - Employee how-to guide
4. One shared Google Calendar event for:
   - Employee
   - Manager
   - HR

Google Calendar also sends its normal invitation notification because the users are guests on the event.

### Default timing

- Review notice: **28 days before**
- Manager and employee forms due: **7 days before the meeting**
- Calendar event: **12:00–1:00 PM Eastern**
- Weekend anniversary: meeting shifts forward to **Monday**
- Form deadline falling on a weekend: shifts backward to **Friday**
- Calendar email reminder: **7 days before**
- Calendar pop-up reminder: **24 hours before**

All of these settings can be changed from the HR Administration page.

### Compensation task

Managers now see the Compensation Adjustment workflow:

- In the Action Center
- In the review Overview tab
- In the launch email
- In the How-To Guide

The manager records one of two outcomes:

- `Adjustment Submitted`
- `No Adjustment Recommended`

By default, the review packet cannot be released for signature until the compensation decision is recorded.

Employees do not receive the Compensation Adjustment URL or compensation-decision details.

### Guided help

V3.1 includes:

- First-login walkthrough
- Permanent How-To Guide navigation
- Role-specific manager, employee, and HR instructions
- Contextual guidance inside each review cycle
- Deadline and compensation alerts in the notification drawer
- Review-meeting instructions
- Signature instructions
- Frequently asked questions
- HR resend-instructions button

## Safe activation model

V3.1 starts in **Preview mode**.

Preview mode:

- Does not create review cycles
- Does not send email
- Does not create calendar events
- Shows HR which reviews would launch

Live mode must be enabled explicitly from Administration after HR reviews the preview.

## Install over V3

### 1. Back up the current project

Save copies of the current:

- `Code.gs`
- `Index.html`
- `appsscript.json`

### 2. Replace and add files

In the existing Apps Script project:

1. Replace `Code.gs` with the V3.1 `Code.gs`
2. Replace `Index.html` with the V3.1 `Index.html`
3. Replace `appsscript.json`
4. Add a new script file named:
   - `V31_Automation`
   - `V31_Trigger_Tests`
   - `V31_Production_Readiness_Tests`
5. Paste the contents of `V31_Automation.gs`

### 3. Run the upgrade

Run:

`upgradeToV31_()`

Approve the new permissions.

V3.1 adds Calendar access and permission to create the daily installable trigger.
The confirmed `AUTOMATION_OWNER_EMAIL` and `SYSTEM_ADMIN_EMAIL` are
`aitheras-hr@aitheras.com`. Only that effective user may install, replace, or
migrate automation triggers. Apps Script cannot see triggers owned by other
editors, so every former administrator must also remove legacy review
automation triggers from **My Triggers**.

The upgrade adds:

- `ReviewAutomationLog` sheet
- New automation settings
- `Review Automation` checkbox column in `EmployeeAssignments`
- Calendar, due-date, automation, and compensation fields in `ReviewCycles`
- Authoritative role-level signature state fields
- A restricted direct-child folder named `AITHERAS Signature Recovery`; the
  upgrade reuses one exact match and blocks if multiple matches exist

It does not send anything. It validates existing signature files outside the
review-data lock, then reloads each row before applying additive normalization.

### 4. Update the deployment

1. Deploy → Manage deployments
2. Edit the existing web-app deployment
3. Select **New version**
4. Keep:
   - Execute as: **Me**
   - Access: **Anyone within AITHERAS**
5. Deploy

Updating the existing deployment preserves the current `/exec` URL.

### 5. Configure the automation

Open the web app as HR and go to:

`Administration → Review Automation`

Then:

1. Confirm `ENVIRONMENT=Production`
2. Confirm both owner/admin email settings are `aitheras-hr@aitheras.com`
3. Verify the signature recovery folder has no public/link sharing and no manager or employee access
4. Confirm `ENABLE_FAULT_INJECTION=false`
5. Paste the live Compensation Adjustment workflow URL
6. Confirm the 28-day notice, 7-day deadline, calendar, and event time
7. Review the upcoming-review preview
8. Run `runProductionReadinessChecks_({liveProbes:false})`
9. Do not enable Live until Daniel's sandbox evidence has zero blockers

### 6. Confirm employee assignments

In `EmployeeAssignments`, confirm each active record has:

- Employee email
- Employee name
- Manager email
- Manager name
- Job title
- Department/project
- Hire date
- Active checked
- Review Automation checked or blank

An unchecked `Review Automation` box excludes that employee from automatic launches while leaving the assignment active for manual reviews.

## Calendar ownership

The daily trigger and Calendar events run as the explicitly configured
automation-owner account. Live enablement verifies the effective user before
creating a replacement.

With `CALENDAR_ID` set to `primary`, events are created on that account's primary calendar.

A shared HR calendar may also be used by entering its Calendar ID, provided the trigger owner has permission to create events on it.

## Transactional trigger replacement

Live activation creates and verifies a replacement trigger before persisting
its metadata and Live mode. Existing owner-visible triggers are removed only
after the replacement and mode are re-read successfully. Creation or
persistence failures remove the uncommitted replacement and restore the prior
mode and metadata. A cleanup failure leaves the verified replacement active
and shows an amber manual-cleanup warning.

Trigger health verifies only triggers visible to the effective owner. Triggers
installed by other accounts cannot be inspected in code.

## Delivery A rollback

1. Set `AUTOMATION_MODE=Preview`.
2. Run `setReviewAutomationMode('Preview')` from the HR portal or remove the
   automation owner's visible review triggers in **My Triggers**.
3. Redeploy commit `ced5333` if the transactional trigger release must be
   reverted.
4. Restore the prior `AUTOMATION_TRIGGER_UNIQUE_ID`,
   `AUTOMATION_TRIGGER_INSTALLED_AT`, and trigger hour only when the prior
   trigger still exists.
5. Keep audit and automation logs; do not delete failure evidence.
6. Have every former administrator inspect their own **My Triggers** page.

Do not restore Live until the configured owner, stored trigger ID, and single
owner-visible handler all match.

## Existing review cycles

Existing V3 cycles remain compatible.

V3.1 does not retroactively create six-month reviews whose due dates have already passed.

It launches only reviews whose review date is today or within the configured notice window and that do not already have a matching review cycle.

## Manual review cycles

Manual review creation now uses the same launch package:

- HR confirmation email
- Manager email
- Employee email
- One shared calendar event
- Compensation decision task
- Guided help

## Production recommendation

Complete the included test plan using fake employee records before enabling Live mode.

### Phase 1 drop-in (launch idempotency)

After the V3.1 baseline is deployed:

1. Replace `V31_Automation.gs` with the current DROP-IN file.
2. Add or replace script file `V31_Idempotency_Tests` with `V31_Idempotency_Tests.gs`.
3. Replace `Index.html` only if deploying the HR **Retry Launch** control (narrow compatibility change).
4. Leave `Code.gs` unchanged.
5. Run `upgradeToV31_()` again (idempotent) from the intended automation-owner account so new launch columns are appended.
6. Run `runV31IdempotencyTests_()` from the Apps Script editor and confirm all cases pass.
7. Keep `AUTOMATION_MODE` in **Preview** until partial-failure Workspace tests pass.

Launch reliability rules now in effect:

- Calendar event ID is persisted immediately after creation (with spreadsheet flush).
- Before creating an event, the system looks for an existing event tagged with the cycle ID.
- Manager, employee, and HR launch emails each persist their own Sent At timestamp immediately after send.
- `Launch Completed At` is set only when all four components succeed.
- Retries skip completed components and leave their timestamps untouched.
- Incomplete manual same-period cycles are resumed rather than blocking automation.
- HR **Retry Launch** resumes unfinished steps; **Resend Instructions** remains an intentional audited override after launch is complete.
The JavaScript in all packaged files passed syntax checks. The workflow has not been executed inside the AITHERAS Google Workspace, so Calendar ownership, Workspace invitation behavior, and email delivery should be verified with test AITHERAS accounts. **Do not enable Live automation until retry tests pass in Workspace.**
