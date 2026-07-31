# AITHERAS Performance Review Portal

The governing engineering standard is
[`docs/AITHERAS_ENGINEERING_PLAYBOOK.md`](docs/AITHERAS_ENGINEERING_PLAYBOOK.md).
Read it before every delivery. Daniel's explicit business decisions remain the
highest-priority source of truth.

## Delivery B signature recovery

`upgradeToV31_()` provisions or reuses the direct-child
`AITHERAS Signature Recovery` folder and blocks on invalid configured IDs or
multiple valid exact-name matches. Role-level signature fields are authoritative;
document-specific fields remain compatibility mirrors. Signature attempts create
provenance-marked staging files, commit one winner under the review-data lock,
then disposition losers after releasing that lock. Cleanup failure never rolls
back a `Signed` winner. Operational-alert delivery remains Delivery C work.

The Delivery B correction distinguishes `COMMITTED`, `SUPERSEDED`, and
`COMMIT_UNKNOWN`. Only confirmed superseded attempts may enter automatic loser
cleanup. Ambiguous artifacts are preserved in dedicated recovery metadata.
Active claims are cleared after resolution, winning attempts are retained
separately, and per-role reconciliation uses a durable selected-file claim.
Artifact and audit warnings are separate. Recovered reconciliation candidates
are never automatically trashed. Automatic legacy normalization trusts only the
exact historical filename or exact structured provenance.

## Complete Product and Engineering Handoff for Cursor and Coder Coach GPT

**Current working package:** V3.1  
**Prepared for:** Daniel Friend / AITHERAS HR  
**Technology:** Google Apps Script, Google Sheets, Google Docs, Google Drive, Gmail/MailApp, Google Calendar, HTML/CSS/JavaScript  
**Production domain:** `aitheras.com`  
**Current development status:** Functionally substantial, syntax-checked, but V3.1 automation has not yet been fully validated in the live AITHERAS Google Workspace environment.

---

# 1. Purpose of This Handoff

This document is intended to let a new coding assistant or developer take over the AITHERAS Performance Review Portal without reconstructing the business rules from scattered conversations.

It covers:

- The business problem being solved
- The product vision
- The system’s evolution from V1 through V3.1
- Current architecture and source files
- Roles and permissions
- Review scheduling rules
- Workflow state transitions
- Google Sheet data model
- Email and calendar automation
- Compensation Adjustment integration
- UI and UX requirements
- Security requirements
- Known limitations and risks
- Immediate engineering priorities
- Long-term roadmap
- Testing requirements
- A ready-to-paste prompt for a coding coach or Cursor agent

The current V3.1 source files are included in the same folder as this document.

---

# 2. Business Context

AITHERAS is a federal contractor with a lean back office. Daniel Friend manages HR and recruiting and does not want routine review administration to require repeated manual intervention.

The core business process is:

1. Employees receive a six-month review based on hire date.
2. Employees receive a one-year review based on hire date.
3. Employees then receive annual reviews based on later hire anniversaries.
4. The process should begin four weeks before the review date.
5. The manager and employee prepare independently.
6. A single calendar event places the review meeting on the calendars of:
   - Employee
   - Manager
   - HR
7. The manager completes:
   - Manager Performance Review
   - Compensation Adjustment workflow or records that no adjustment is recommended
8. The employee completes:
   - Employee Self-Evaluation
9. Both evaluations remain private from the other participant until both are submitted and the actual review meeting is opened.
10. During the meeting, both evaluations are compared and meeting outcomes are recorded.
11. Manager and employee each sign once.
12. HR signs last.
13. The same three signatures appear on both final documents.
14. Final signed PDFs are emailed and retained in restricted Google Drive storage.

The larger goal is for the system to feel as close as reasonably possible to a commercial off-the-shelf performance-management product, while remaining affordable and under AITHERAS control.

---

# 3. Product Vision

The portal should consistently answer three questions for every user:

1. **What needs my attention?**
2. **What should I do next?**
3. **What happens after I complete it?**

The system should feel like a product, not a spreadsheet form.

Important UX principles:

- Users should land on a personalized dashboard.
- The highest-priority action should be obvious.
- Emails should deep-link directly to the required task.
- Drafts should autosave.
- The system should explain what is private, what is locked, and what happens next.
- Routine success messages should use small toast notifications.
- Destructive or irreversible actions should use confirmation modals.
- Long reviews should be divided into guided stages rather than one endless page.
- HR should be able to oversee the system without needing to explain the process manually.
- Managers and employees should never need direct access to the underlying Sheets, Docs, or Drive folders.
- All meaningful actions should be auditable.

---

# 4. Current Source Package

The current V3.1 package contains:

| File | Purpose |
|---|---|
| `Code.gs` | Main server-side review workflow, data access, permissions, PDFs, signatures, autosave, and general email logic |
| `V31_Automation.gs` | Hire-date automation, Calendar events, automation settings, compensation task, guidance, and automation logging |
| `Index.html` | Entire client application: HTML, CSS, navigation, dashboards, editors, notifications, autosave UX, meeting UX, signatures, help center, and administration |
| `appsscript.json` | Apps Script manifest and OAuth scopes |
| `README.md` | V3.1 installation and operational overview |
| `V31_TEST_PLAN.md` | Test checklist for automation and workflow |
| `CHANGELOG.md` | Version history |
| `AUTOMATION_WORKFLOW.md` | Summary of scheduling and automation behavior |
| `RATING_SCALE.txt` | Approved 1–7 rating definitions |

Approximate source size at handoff:

- `Code.gs`: about 3,183 lines
- `V31_Automation.gs`: about 2,182 lines
- `Index.html`: about 3,050 lines

The client and server JavaScript passed syntax checks before packaging. Syntax checks do not prove that Google Workspace permissions, Calendar invitations, triggers, and runtime behavior are correct in production.

---

# 5. Version History and Major Decisions

## V1: Core review workflow

V1 introduced:

- HR-created review cycles
- Manager Performance Review
- Employee Self-Evaluation
- Independent drafts
- Submit-and-seal behavior
- Review meeting opening
- Side-by-side rating comparison
- Post-meeting comments
- Two document-specific signature workflows
- Final PDFs and email distribution
- Role-based record visibility
- Audit logging

## V2: Combined signatures

V2 fixed the unintuitive duplicate signature experience.

Current signature model:

- Manager signs once.
- Employee signs once.
- Manager and employee may sign in either order.
- HR signs once after both participants.
- Each signature is applied to both:
  - Manager Performance Review
  - Employee Self-Evaluation

This combined signature model is a firm requirement and should not be reverted.

V2 also changed HR permissions:

- HR can view both original evaluations.
- HR does not normally edit the manager’s original evaluation.
- HR does not normally edit the employee’s original self-evaluation.

## V3: Commercial-style UX

V3 added:

- Role-aware navigation
- Personalized dashboards
- Action Center
- Lifecycle timeline
- Tabbed cycle workspace
- Guided review editor stages
- Autosave
- Browser draft recovery
- Offline warnings
- Completion percentages
- Inline validation
- Deep links
- Notification drawer
- Toast messages
- Confirmation modals
- Improved meeting comparison
- Finalization checklist
- Responsive layouts
- Better loading and error states

## V3.1: Automation and guided help

V3.1 added:

- Hire-date-based six-month, one-year, and annual review detection
- Four-week launch window
- Daily installable trigger
- Preview, Live, and Paused automation modes
- One shared Google Calendar event
- Three launch emails
- Manager Compensation Adjustment task
- Compensation decision gate before signatures
- First-login walkthrough
- Permanent role-specific How-To Guide
- Contextual guidance and warnings
- HR automation administration screen
- Automation log and retry support

---

# 6. Original Review Content and Rating Model

The original manager form included these factors:

1. Quality of Work
2. Volume of Work
3. Dependability for Getting Work Completed
4. Cooperation / Working with Others
5. Planning Work Setup
6. Skills Proficiency
7. Safety on the Job
8. Attendance
9. Initiative
10. Versatility

The original employee self-evaluation used substantially the same factors but omitted Safety on the Job and added Overall Performance.

The portal standardized both documents onto the same ten core factors:

1. Quality of Work
2. Productivity / Volume of Work
3. Dependability and Follow-Through
4. Collaboration / Working With Others
5. Planning and Organization
6. Job Knowledge / Skills Proficiency
7. Safety, Security, and Compliance
8. Attendance and Availability
9. Initiative
10. Adaptability / Versatility

## Approved 1–7 scale

| Score | Label | Meaning |
|---:|---|---|
| 7 | Exceptional | Sustained extraordinary performance with impact beyond normal role expectations; rare and supported by specific examples |
| 6 | Consistently Exceeds Expectations | Regularly performs above expectations across most responsibilities with strong independence and impact |
| 5 | Frequently Exceeds Expectations | Fully meets expectations and often performs above the expected level |
| 4 | Fully Meets Expectations | Consistently performs the job at the expected level with reliable quality, productivity, and conduct |
| 3 | Partially Meets Expectations | Meets some expectations, but recurring gaps or inconsistencies require improvement |
| 2 | Significantly Below Expectations | Frequently falls below important expectations and requires significant support or corrective action |
| 1 | Unsatisfactory | Does not meet essential expectations; immediate and substantial improvement is required |
| N/A | Not Applicable / Not Observed | Factor does not apply or there was insufficient opportunity to evaluate |

Firm guidance:

- A 4 is successful and fully acceptable performance.
- Comments are required for ratings of 1, 2, 6, or 7.
- Ratings of 6 or 7 should include concrete evidence.
- The system may warn about weak comments, but it should not automatically assign ratings.

---

# 7. User Roles and Permissions

## HR

HR can:

- View all review cycles
- Create manual cycles
- View manager and employee evaluations
- View automation preview
- Configure automation
- Enable, pause, or return automation to Preview mode
- Start a review meeting when permitted
- View and record compensation decisions
- Resend launch instructions
- Sign last
- View final PDFs
- View audit and automation status

HR should not casually edit the manager’s or employee’s original submitted evaluation. Any future override or reopen function must:

- Be explicitly labeled
- Require confirmation
- Record the reason
- Write an audit-log entry
- Preserve the original submitted content where practical

## Manager

A manager can:

- View cycles assigned to the manager
- Complete the Manager Performance Review
- Save drafts
- Submit and seal the manager review
- See the employee self-evaluation only after the meeting opens
- Open the Compensation Adjustment workflow
- Record:
  - `Adjustment Submitted`
  - `No Adjustment Recommended`
- Start the review meeting after both evaluations are submitted
- Record manager-side meeting outcomes
- Release the packet for signature after all required conditions are met
- Sign once for both documents
- View final documents for assigned employees
- View history only for employees they are authorized to manage

## Employee

An employee can:

- View only their own review cycles
- Complete the Employee Self-Evaluation
- Save drafts
- Submit and seal the self-evaluation
- See the manager evaluation only after the meeting opens
- Add employee post-meeting comments
- Sign once for both documents
- View their final documents

The employee must never receive:

- Compensation Adjustment URL
- Compensation recommendation status
- Compensation decision notes
- Other employees’ review information

## Underlying files

Managers and employees must not receive direct access to:

- Review spreadsheet
- Review record folder
- Manager template
- Self-evaluation template
- Audit log
- Automation log

The production web app should execute as the deployment owner so file operations use the owner’s permissions.

---

# 8. Production Deployment and Security Model

Required production deployment:

- **Execute as:** Me
- **Who has access:** Anyone within AITHERAS

The app uses the signed-in AITHERAS user’s email to determine role and record access, while file operations run through the deployment owner.

Do not switch production to **Execute as user accessing the web app**. That would require each employee and manager to have direct access to the underlying private Google files.

## Personal Gmail testing

A personal Gmail account is not a clean production test path because:

- Production access is limited to the AITHERAS Workspace.
- User identity and file permissions behave differently outside the Workspace domain.
- Executing as the visitor would require direct file sharing, which violates the security design.

Use separate AITHERAS test accounts for:

- HR
- Manager
- Employee

## Server-side authorization

Never rely on hidden buttons or client-side checks as security.

Every server function that reads or changes a cycle must independently verify:

- Current signed-in email
- HR status
- Assigned manager relationship
- Employee ownership
- Current workflow status
- Whether the requested transition is allowed

## Sensitive data rules

- Do not expose file IDs or restricted Drive links to unauthorized users.
- Do not expose compensation data to employees.
- Do not place sensitive review content in Calendar event titles.
- Avoid placing detailed performance comments in email subjects.
- Keep audit and automation logs restricted.
- All significant changes should be auditable.

---

# 9. End-to-End Workflow

## Stage 1: Employee assignment

HR maintains `EmployeeAssignments` with:

- Employee email
- Employee name
- Manager email
- Manager name
- Job title
- Department / project
- Hire date
- Active
- Review Automation

An assignment must be active and automation-enabled to qualify for automatic review creation.

A blank `Review Automation` value is currently treated as enabled. The V3.1 upgrade attempts to set it to checked for active assignments.

## Stage 2: Automated candidate detection

The daily trigger examines active assignments and determines whether a review is inside the configured notice window.

Eligible review types:

- 6-Month Review
- 1-Year Review
- Annual Review

The automation checks for:

- Existing matching `Automation Key`
- Existing manually created cycle for the same employee and review-period end
- Cancelled status
- Already-sent automation notice

## Stage 3: Cycle creation and launch package

The launch package includes:

1. Review cycle row
2. One Calendar event
3. Manager email
4. Employee email
5. HR confirmation email

The manager email includes:

- Manager review deep link
- Compensation Adjustment link
- Due date
- Privacy guidance
- How-To Guide link

The employee email includes:

- Self-evaluation deep link
- Due date
- Privacy guidance
- How-To Guide link

The HR email confirms:

- Manager notification recipient
- Employee notification recipient
- Calendar event creation
- Meeting date
- Cycle deep link

## Stage 4: Independent preparation

Manager and employee prepare separately.

Before the meeting opens:

- Manager cannot see employee responses.
- Employee cannot see manager responses.
- HR can see both.
- Drafts autosave.
- Submission seals the participant’s evaluation.

## Stage 5: Ready for meeting

The cycle becomes `Ready for Review Meeting` only when:

- Manager review status is Submitted
- Self-evaluation status is Submitted

The meeting should not be opened early.

Opening the meeting makes both evaluations visible to both participants.

## Stage 6: Review meeting

The meeting workspace supports:

- Side-by-side scores
- Rating-gap highlighting
- Expandable comments
- Manager final comments
- Development goals
- Meeting action steps
- Employee comments after discussion

## Stage 7: Compensation decision

The manager or HR records:

- Adjustment Submitted
- No Adjustment Recommended

By default, the packet cannot be released for signature until a valid compensation decision is recorded.

The current system does not verify completion inside the separate Compensation Adjustment app. The manager opens the external app and then manually records the outcome in the review portal.

## Stage 8: Finalization

Before releasing signatures, the UI presents a finalization checklist confirming that:

- Both evaluations were discussed
- Employee had an opportunity to respond
- Goals and action steps were reviewed
- The packet is ready to lock

## Stage 9: Signatures

- Manager signs once.
- Employee signs once.
- Either participant may sign first.
- HR signs only after both participants.
- Each signature is stored once and applied to both PDFs.

## Stage 10: Completion

After HR signs:

- Manager Review PDF is generated
- Self-Evaluation PDF is generated
- Both PDFs are emailed to:
  - Employee
  - Manager
  - HR
- Cycle becomes Complete
- PDFs become available in the app

---

# 10. Review Scheduling Rules

## Six-month review

- Review date: hire date plus six months
- Review period start: hire date
- Review period end: six-month anniversary
- Launch date: configured notice period before the review date
- Default notice period: 28 days

## First annual review

- Review type: `1-Year Review`
- Review date: first hire anniversary
- Review period start: hire date
- Review period end: first anniversary

## Later annual reviews

- Review type: `Annual Review`
- Review date: each later hire anniversary
- Review period start: previous anniversary
- Review period end: current anniversary

### Open policy question

The current later-annual implementation uses the previous anniversary itself as the next period’s start. This can create a one-day overlap between periods.

Possible alternative:

- Start on the day after the previous anniversary
- End on the current anniversary

Daniel should explicitly choose the intended policy before this logic is considered final.

## Weekend logic

Current defaults:

- Saturday or Sunday meeting date shifts forward to Monday.
- Form due date that falls on a weekend shifts backward to Friday.

## Default event timing

- Start: 12:00 PM Eastern
- Duration: 60 minutes
- Calendar email reminder: 7 days before
- Calendar popup reminder: 24 hours before

These values are configurable.

## Launch-window behavior

The system does not create old six-month reviews whose review dates have already passed.

It creates candidates where:

- Review date is today or later
- Review date is inside the preview/notice window
- Launch date is today or earlier
- No valid duplicate exists

---

# 11. Workflow State Machine

## Cycle statuses

| Internal status | User meaning |
|---|---|
| `Open for Input` | Manager and employee are preparing evaluations |
| `Ready for Review Meeting` | Both evaluations were submitted |
| `Review Meeting Open` | Both evaluations are visible and meeting outcomes can be recorded |
| `Awaiting Signatures` | Packet is locked and signatures are in progress |
| `Complete` | HR signed and final PDFs were generated |
| `Cancelled` | Cycle is no longer active |

## Document statuses

| Status | Meaning |
|---|---|
| `Not Started` | No saved content |
| `Draft` | Saved but not submitted |
| `Submitted` | Evaluation is sealed |
| `Pending Manager and Employee Signatures` | Neither participant has signed |
| `Pending Manager Signature` | Employee signed; manager remains |
| `Pending Employee Signature` | Manager signed; employee remains |
| `Pending HR Signature` | Both participants signed |
| `Complete` | HR signed |

## Allowed transitions

### Preparation

`Open for Input`  
→ manager draft or employee draft  
→ both Submitted  
→ `Ready for Review Meeting`

### Meeting

`Ready for Review Meeting`  
→ manager or HR opens meeting  
→ `Review Meeting Open`

### Signatures

`Review Meeting Open`  
→ compensation decision complete  
→ finalization checklist confirmed  
→ `Awaiting Signatures`

Then:

- Manager and employee signatures may occur in either order.
- Once both exist, status becomes Pending HR Signature.
- HR signs.
- PDFs are generated.
- Cycle becomes Complete.

Every server-side transition must reject calls made from an invalid state.

---

# 12. Google Sheet Data Model

## `ReviewSettings`

Two columns:

- Key
- Value

Core settings:

| Setting | Default |
|---|---|
| `APP_NAME` | AITHERAS Performance Reviews |
| `ALLOWED_DOMAIN` | aitheras.com |
| `REVIEW_FOLDER_ID` | Generated during initial setup |
| `MANAGER_TEMPLATE_ID` | Generated during initial setup |
| `SELF_TEMPLATE_ID` | Generated during initial setup |
| `WEB_APP_URL` | Must contain current `/exec` URL |
| `AUTOSAVE_DELAY_SECONDS` | 5 |

V3.1 settings:

| Setting | Default |
|---|---|
| `AUTOMATION_MODE` | Preview |
| `REVIEW_NOTICE_DAYS` | 28 |
| `FORM_DUE_DAYS_BEFORE_MEETING` | 7 |
| `AUTOMATION_TRIGGER_HOUR` | 8 |
| `REVIEW_EVENT_START_HOUR` | 12 |
| `REVIEW_EVENT_DURATION_MINUTES` | 60 |
| `SHIFT_WEEKEND_MEETINGS` | TRUE |
| `CALENDAR_ID` | primary |
| `EVENT_EMAIL_REMINDER_DAYS` | 7 |
| `EVENT_POPUP_REMINDER_HOURS` | 24 |
| `COMPENSATION_ADJUSTMENT_URL` | blank until configured |
| `COMPENSATION_DECISION_REQUIRED` | TRUE |
| `HELP_CENTER_ENABLED` | TRUE |
| `AUTOMATION_LAST_RUN` | blank until run |

Hidden optional setting supported by code:

| Setting | Purpose |
|---|---|
| `AUTOMATION_HR_EMAIL` | Selects a specific active HR user for automated cycles; otherwise the first active HR row is used |

`AUTOMATION_HR_EMAIL` is not currently exposed prominently in the Administration UI and should be formalized.

## `ReviewHRUsers`

Columns:

- Email
- Name
- Active

The automation selects an active HR user. Avoid depending on row order long-term.

## `EmployeeAssignments`

Columns:

- Employee Email
- Employee Name
- Manager Email
- Manager Name
- Job Title
- Department / Project
- Hire Date
- Active
- Review Automation

## `ReviewCycles`

Core fields:

- Cycle ID
- Created At
- Updated At
- Status
- Review Type
- Review Period Start
- Review Period End
- Review Meeting Date
- Employee Name
- Employee Email
- Employee Job Title
- Department / Project
- Hire Date
- Manager Name
- Manager Email
- HR Name
- HR Email
- Manager Review Status
- Manager Review JSON
- Self Evaluation Status
- Self Evaluation JSON
- Meeting Opened At
- Meeting Opened By
- Meeting JSON
- Signatures Released At
- Signatures Released By
- MGR Manager Signature ID
- MGR Manager Signed At
- MGR Employee Signature ID
- MGR Employee Signed At
- MGR HR Signature ID
- MGR HR Signed At
- SELF Employee Signature ID
- SELF Employee Signed At
- SELF Manager Signature ID
- SELF Manager Signed At
- SELF HR Signature ID
- SELF HR Signed At
- Manager Review PDF ID
- Self Evaluation PDF ID
- Completed At

V3.1 fields:

- Cycle Source
- Automation Key
- Automation Notice Sent At
- Manager Due Date
- Employee Due Date
- Calendar Status
- Calendar Event ID
- Calendar Created At
- Manager Email Sent At
- Employee Email Sent At
- HR Email Sent At
- Launch Completed At
- Last Launch Error
- Launch Attempt Count
- Compensation Decision
- Compensation Decision Notes
- Compensation Decision At
- Compensation Decision By

## `ReviewAuditLog`

Columns:

- Timestamp
- Cycle ID
- Action
- Actor Email
- Previous Status
- New Status
- Details

## `ReviewAutomationLog`

Columns:

- Timestamp
- Mode
- Action
- Employee Email
- Employee Name
- Review Type
- Review Date
- Cycle ID
- Result
- Details

This sheet is protected and intended for HR/system administration.

---

# 13. Server Architecture

Google Apps Script places all `.gs` files in one project namespace. Functions in `Code.gs` and `V31_Automation.gs` can call one another directly.

## `Code.gs` responsibilities

Major groups:

### Setup and deployment

- `setupReviewSystem_()`
- `doGet(e)`
- Sheet setup and formatting
- Template generation

### Bootstrap and reads

- `getReviewBootstrapData(initialCycleId)`
- `getReviewCycle(cycleId)`
- `listVisibleCycles_(email, isHr)`
- `getCycleView_(cycleId, email, isHr)`
- `determinePrimaryAction_(...)`
- Lifecycle and progress calculations

### Cycle creation

- `createReviewCycle(payload)`

Manual cycle creation in V3.1 is intended to use the same launch package as automated cycles.

### Evaluation editing

- `saveManagerReview(...)`
- `saveSelfEvaluation(...)`
- `autosaveReview(...)`
- `saveIndependentReview_(...)`

### Meeting

- `startReviewMeeting(cycleId)`
- `saveMeetingOutcomes(...)`
- `autosaveMeetingOutcomes(...)`

### Signature release and signing

- `releaseReviewSignatures(cycleId)`
- `signReviewCycle(cycleId, signatureDataUrl)`
- Combined signature status logic

### PDFs and Docs

- Template creation
- Placeholder replacement
- Signature image insertion
- PDF generation
- Final packet email

### Authorization and data helpers

- Current-user lookup
- Domain restriction
- HR lookup
- Assignment lookup
- Sheet row mapping
- Locks
- Audit writing

## `V31_Automation.gs` responsibilities

### Upgrade

- `upgradeToV31_()`
- `ensureV31DataModel_()`

The upgrade is intended to be idempotent and starts automation in Preview mode.

### V3.1 bootstrap and guidance

- `getV31BootstrapData_(...)`
- `getV31CycleData_(...)`
- `buildV31Guidance_(...)`

### Compensation

- `recordCompensationDecision(...)`
- `isV31CompensationComplete_(...)`

### Automation administration

- `getReviewAutomationAdminData()`
- `saveReviewAutomationSettings(payload)`
- `setReviewAutomationMode(mode)`
- `getReviewAutomationPreview(days)`
- `runReviewAutomationNow()`

### Trigger management

- `getOwnedReviewAutomationTriggers_()`
- `createReviewAutomationTrigger_()`
- `installReviewAutomationTriggerSafely_()`
- `removeOwnedReviewAutomationTriggers_()`
- `verifyStoredAutomationTrigger_()`
- `getAutomationTriggerHealth_()`
- `hasReviewAutomationTrigger_()`

### Daily automation

- `runReviewAutomationTrigger_()`
- `runReviewAutomationCore_()`
- `findReviewAutomationCandidates_(windowDays)`
- `createAutomatedReviewCycle_(candidate)`

### Calendar and communications (crash-safe, per-component)

- `launchReviewCycleCommunications_(cycle, automated, options)`
- `orchestrateReviewLaunchSteps_(cycleId, options)`
- `decideLaunchComponentAction_(...)` — pure claim/skip/mark-unknown decision
- `claimLaunchEmailStep_(...)` / `commitLaunchEmailStep_(...)` / `runLaunchEmailStep_(...)`
- `claimCalendarCreateStep_(...)` / `commitCalendarCreatedStep_(...)` / `runCalendarLaunchStep_(...)`
- `configureCalendarLaunchStepBestEffort_(cycleId, event)`
- `maybeCompleteReviewLaunch_(cycleId)`
- `claimLaunchAttempt_(cycleId, source)`
- `resolveAutomationLaunchTarget_(...)`
- `persistLaunchCycle_(rowNumber, cycle)`
- `createReviewCalendarEvent_(cycle)` / `configureReviewCalendarEvent_(event, cycle, settings)`
- `findExistingReviewCalendarEvent_(calendar, cycleId, meetingDate, knownEventId)`
- `buildCalendarCycleMarker_(cycleId)` / `eventMatchesCycleId_(event, cycleId, knownEventId)`
- `buildReviewCalendarDescription_(cycle)`
- `retryReviewLaunch(cycleId, options)`
- `resendReviewLaunchEmails(cycleId, recipients)` / `resendReviewLaunchRecipient_(cycle, recipient)`
- `reconcileLaunchDelivery(cycleId, component, action)` — HR-only Delivery Unknown reconciliation

### Logging and dates

- `logReviewAutomation_(...)`
- HR selection
- Month and anniversary calculations
- Weekend shifting
- Boolean and integer parsing

---

# 14. Client Architecture

`Index.html` currently contains:

- HTML
- CSS
- Client-side JavaScript

This was convenient for copy/paste deployment but is now large enough that Cursor development would benefit from splitting it into logical pieces.

Current client responsibilities include:

- Navigation shell
- Dashboard rendering
- Action Center
- Review list, filters, and search
- Cycle overview
- Manager editor
- Employee editor
- Review stage navigation
- Autosave scheduling
- Local browser draft recovery
- Offline state
- Progress and validation
- Review-meeting comparison
- Finalization checklist
- Signature canvas
- Notifications
- How-To Guide
- First-login walkthrough
- HR Administration
- Automation preview and settings
- Compensation decision controls
- Toasts and modals
- Server-call wrapper

## Recommended refactor

Keep behavior unchanged initially, but split the client into:

- `Index.html` — page shell
- `Styles.html` — CSS
- `ClientCore.html` — state, navigation, server wrapper
- `Dashboard.html`
- `ReviewEditor.html`
- `Meeting.html`
- `Signatures.html`
- `HelpCenter.html`
- `AutomationAdmin.html`

Apps Script can include HTML partials through templating. Refactor in small steps and verify the deployed result after each split.

Do not combine a major architectural refactor with new business behavior in the same change unless tests cover both.

---

# 15. UI and UX Requirements

## Global application shell

Navigation should remain role-aware.

Employee:

- Home
- My Reviews
- Signatures
- How-To Guide

Manager:

- Home
- Reviews
- My Team or assigned reviews
- Signatures
- How-To Guide

HR:

- Home
- Reviews
- Signatures
- Administration
- How-To Guide

The app should display:

- User name or email
- Role
- Notification bell
- Help access
- Clear current page title

## Dashboard

The dashboard should emphasize actions, not raw records.

Useful cards:

- Action Required
- Ready for Meeting
- Awaiting Signature
- Completed

Action buttons should use clear verbs:

- Continue Manager Review
- Continue Self-Evaluation
- Review Compensation
- Start Review Meeting
- Sign Review Packet
- View Final Documents

## Review editor

Stages:

1. Ratings
2. Overall Assessment
3. Development
4. Review and Submit

Required UX:

- Completion percentage
- Ratings completed count
- Last saved time
- Autosave state
- Inline errors
- First-missing-item navigation
- Warning before submit-and-seal
- Read-only state after submission

## Notifications

Current notifications are generated client-side from visible cycle data.

Read state is stored in browser `localStorage`.

This means:

- Read state does not synchronize across browsers or devices.
- Clearing browser storage resets read status.
- Notifications are not yet a durable server-side notification system.

A later commercial-grade enhancement should add a `ReviewNotifications` sheet or another persistent store.

## Help Center

The permanent How-To Guide should remain.

It currently includes:

- Process overview
- Manager steps
- Employee steps
- HR steps
- Automation setup
- Meeting guidance
- Signature guidance
- FAQs

Guidance should be concise at the point of action, with detailed instructions available on demand.

## Toasts and modals

Use toast notifications for:

- Draft saved
- Settings saved
- Decision recorded
- Reminder sent
- Temporary error

Use confirmation modals for:

- Submit and seal
- Start meeting
- Release signatures
- Enable Live automation
- Reopen or cancel in future versions

Do not interrupt users with modal dialogs for routine autosaves.

---

# 16. Autosave and Recovery

The current V3 design includes:

- Delayed autosave after typing
- Autosave on rating change
- Visible saving state
- Local browser backup
- Restore prompt for newer unsynced content
- Offline warning
- Retry when the connection returns
- Browser-exit warning when unsaved content exists

Server-side autosaves should not create excessive audit-log noise.

Important requirements:

- Submitted evaluations must never be overwritten by autosave.
- An autosave request must re-check role and status on the server.
- Local-storage keys must include:
  - Signed-in user
  - Cycle ID
  - Review type
- Restored local content must never bypass server authorization.
- If server content is newer than local content, the UI should not silently overwrite it.

---

# 17. Calendar Automation

## Current event behavior

The event title is:

`Performance Review — Employee Name`

Guests:

- Employee
- Manager
- HR

Event description includes:

- Employee
- Manager
- Review type
- Review period
- Manager due date
- Employee due date
- Review portal link
- How-To Guide link
- Privacy and meeting-opening warning

Guest settings:

- Guests cannot invite others
- Guests cannot modify the event
- Guests can see guests

The event stores a tag containing the Review Cycle ID.

## Calendar ownership

The daily trigger and event creation run as the account that enables Live automation.

With `CALENDAR_ID = primary`, events are created on that account’s primary calendar.

Recommended production setup:

- Use one designated automation owner.
- Prefer a shared HR calendar if it is consistently administered.
- Give the trigger owner event-creation rights.
- Record the designated automation owner in operational documentation.

## Multiple-HR risk

Installable triggers are associated with the user who creates them.

If multiple HR users independently enable Live mode, there is a risk of trigger ownership confusion or duplicate triggers.

The system should eventually:

- Store designated trigger-owner email
- Show trigger owner in Administration
- Prevent a different HR user from silently creating a second automation trigger
- Provide a controlled transfer-ownership process

---

# 18. Email Automation

Current launch sequence:

1. Manager email
2. Employee email
3. HR confirmation email

The manager receives:

- Review type
- Employee name
- Manager-review due date
- Manager Review button
- Compensation Adjustment button when configured
- Privacy explanation
- Manager guide

The employee receives:

- Review type
- Self-evaluation due date
- Self-Evaluation button
- Privacy explanation
- Employee guide

HR receives:

- Confirmation of launch
- Manager and employee recipient addresses
- Calendar creation confirmation
- Meeting date
- Review-cycle button

## Deep-link actions

Supported URL patterns include:

- `?cycleId=...&action=manager-review`
- `?cycleId=...&action=self-evaluation`
- `?cycleId=...&action=overview`
- `?cycleId=...&action=meeting`
- `?cycleId=...&action=signature`
- `?action=help`

The server must still authorize the record after a deep link is opened.

---

# 19. Compensation Adjustment Integration

The Compensation Adjustment workflow is a separate existing Apps Script application.

Known existing production URL from the prior build:

`https://script.google.com/macros/s/AKfycbxAPXkbQ2Qyigdlh54IW5PKhkEnOeEEsOQCzbgNQZBG5utKIo1i2_BC3xM6hugYbF46/exec`

Verify this URL before production use rather than relying on this document.

The review portal stores the URL in:

`COMPENSATION_ADJUSTMENT_URL`

Do not hardcode it into the client.

## Current integration model

The review portal:

- Opens the compensation app in a new tab.
- Does not pass or verify a compensation record ID.
- Does not receive a callback from the compensation app.
- Relies on the manager or HR to record:
  - Adjustment Submitted
  - No Adjustment Recommended

## Recommended future integration

Add a structured link between the systems:

- Review Cycle ID
- Employee email
- Employee name
- Review type
- Manager email
- Compensation request ID
- Compensation workflow status
- Submitted timestamp

Best long-term behavior:

1. Manager clicks Compensation Adjustment from the review cycle.
2. The compensation app opens with employee and cycle context prefilled.
3. Submission writes the compensation request ID back to the review cycle.
4. Review portal automatically recognizes completion.
5. Employee still sees no compensation details.

Any cross-app handoff must use signed or server-validated identifiers, not trust arbitrary URL values.

---

# 20. Automation Modes

## Preview

- No cycle creation
- No emails
- No Calendar events
- Shows upcoming candidates

This is the safe default after upgrade.

## Live

- Installs daily trigger
- Creates eligible cycles
- Creates Calendar events
- Sends launch emails
- Writes logs

## Paused

- Removes the current user’s daily trigger
- Does not automatically launch cycles
- Preserves settings and data

The UI should clearly show:

- Current mode
- Trigger installed status
- Last run
- Next candidates
- Failures needing attention

---

# 21. Duplicate Prevention and Retry Logic

The automation creates an `Automation Key` using:

- Employee email
- Review date
- Review type

It also checks for a manually created cycle for:

- Same employee
- Same review-period end
- Non-cancelled status

A candidate with an existing cycle but no notice-sent timestamp is shown as:

`Launch needs retry`

The design intends to retry communications without creating another cycle.

## Critical known transactional risk

The original V3.1 `launchReviewCycleCommunications_()` function:

1. Created the Calendar event
2. Stored the event ID only in the in-memory cycle object
3. Sent the three emails
4. Wrote the updated cycle row after the emails

If Calendar creation succeeded but email sending failed before the row was written:

- The event ID was not persisted.
- A retry could create a duplicate Calendar event.

Similarly, if one or two emails sent and a later email failed:

- The cycle may not have been marked sent.
- A retry could resend emails that already went out.

This was the highest-priority engineering fix and is addressed in Phase 1.

## Phase 1 fix (implemented)

Treat each launch component as its own persisted step.

Cycle fields now include:

- Calendar Status
- Calendar Event ID
- Calendar Created At
- Manager Email Sent At
- Employee Email Sent At
- HR Email Sent At
- Launch Completed At
- Last Launch Error
- Launch Attempt Count

Safer sequence now in production code:

1. Persist cycle before external actions.
2. If Calendar Event ID is blank:
   - Create event
   - Immediately persist event ID / Calendar Status / Calendar Created At
3. If Manager Email Sent At is blank:
   - Send manager email
   - Immediately persist timestamp
4. Repeat for employee and HR email
5. Set Launch Completed At only when all components succeed
6. Leave completed timestamps untouched on retry
7. Capture actionable text in Last Launch Error
8. Increment Launch Attempt Count at the start of each attempt

Legacy cycles that already have `Automation Notice Sent At` plus a Calendar Event ID are treated as complete and backfilled onto the per-step fields.

Manual and automated launches share this orchestration. The HR resend control remains an intentional audited resend and does not clear completion timestamps.

Run `runV31IdempotencyTests_()` before trusting Live mode.

---

# 22. Known Limitations and Risks

## 1. V3.1 has not been fully live-tested

Syntax checks passed, but validate:

- Calendar access
- Guest invitations
- Reminder behavior
- Trigger execution
- Email delivery
- Workspace identity
- PDF generation
- Signature image placement
- Trigger ownership

## 2. No full reminder-escalation engine yet

V3.1 currently provides:

- Initial launch emails
- Calendar reminders
- Dashboard warnings
- In-app guidance

It does not yet provide a complete scheduled email escalation sequence such as:

- 14 days before due
- 7 days before due
- 2 days before due
- Due today
- 1 day overdue
- 3 days overdue
- 7 days overdue with HR escalation

This remains a requested feature.

## 3. Compensation completion is manual

The portal does not verify the external Compensation Adjustment app.

## 4. Calendar events are not fully lifecycle-managed

The current system creates events but does not yet provide robust functions for:

- Updating event time when meeting date changes
- Reassigning guests when manager changes
- Cancelling event when cycle is cancelled
- Recreating event if deleted
- Detecting external event edits
- Moving event to another calendar

## 5. Notifications are browser-local

Read status does not synchronize across devices.

## 6. Large monolithic client file

`Index.html` is maintainable but increasingly difficult to modify safely.

## 7. No automated test suite

There is a manual test plan but no unit or integration tests.

Date logic and state transitions are particularly good candidates for automated tests.

## 8. Review history, goals, and reports are not complete

The user approved these future areas:

- Structured development goals
- Previous-review history
- Goal carry-forward
- HR reporting
- Rating calibration
- Trend analysis

They are not complete in V3.1.

## 9. Manual email templates

Email HTML is currently embedded in code rather than editable in Administration.

## 10. Primary HR selection

If `AUTOMATION_HR_EMAIL` is not configured, the first active HR row is used. Row order should not determine business ownership.

## 11. Manager changes

If an employee’s manager changes after a cycle launches, there is not yet a complete reassignment workflow that updates:

- Cycle manager
- Access
- Calendar guest
- Pending tasks
- Notifications
- Audit log

## 12. Rehires and leave scenarios

The system currently assumes one straightforward hire date. It does not explicitly model:

- Rehire date
- Adjusted service date
- Leave-related review delay
- Review exemptions
- Temporary manager
- Multiple managers

---

# 23. Immediate Engineering Priorities

## Priority 0: Put the project under source control

Before further coding:

- Create a repository.
- Add the current V3.1 files as the baseline.
- Tag or otherwise preserve the exact V3.1 handoff version.
- Never develop only inside the Apps Script browser editor.
- Keep a known-good deployment version available for rollback.

## Priority 1: Fix launch idempotency — DONE in Phase 1 drop-in

Implemented per-step persisted statuses for:

- Calendar
- Manager email
- Employee email
- HR email

Post-review hardening also landed:

- Incomplete same-period cycles (including manual) resume via automation
- HR `retryReviewLaunch` + UI **Retry Launch** for unfinished launches
- Spreadsheet flush after each launch persist
- Calendar tag recovery before creating a second event
- Tests drive `orchestrateReviewLaunchSteps_` with stubbed adapters

Keep automation in Preview until Workspace retry tests and `runV31IdempotencyTests_()` pass. Do not enable Live until those checks succeed.

## Priority 2: Add automated date tests

Test:

- End-of-month hire dates
- February 29 hire dates
- Six-month month-clamping
- First anniversary
- Later anniversary
- Weekend shifts
- Due-date weekend shifts
- Notice-window boundaries
- Duplicate prevention
- Cancelled cycles
- Manual duplicate cycles

## Priority 3: Refactor source into modules

Suggested server structure:

```text
src/
  server/
    Config.gs
    Setup.gs
    Auth.gs
    Data.gs
    ReviewCycles.gs
    Reviews.gs
    Meetings.gs
    Signatures.gs
    Documents.gs
    Communications.gs
    AutomationConfig.gs
    AutomationCandidates.gs
    AutomationLaunch.gs
    CalendarService.gs
    CompensationIntegration.gs
    Audit.gs
    DateUtils.gs
```

Suggested client structure:

```text
src/
  client/
    Index.html
    Styles.html
    AppState.html
    Api.html
    Navigation.html
    Dashboard.html
    ReviewWorkspace.html
    ReviewEditor.html
    MeetingWorkspace.html
    Signatures.html
    HelpCenter.html
    AutomationAdmin.html
    Notifications.html
    Modals.html
    Toasts.html
```

Refactor without changing behavior first.

## Priority 4: Build reminder and escalation engine

Use a separate daily process with persisted reminder history.

Do not infer reminder status only from audit text.

Recommended fields or a separate reminder table:

- Cycle ID
- Recipient
- Reminder type
- Scheduled date
- Sent at
- Result
- Error
- Escalation level

## Priority 5: Improve Calendar lifecycle

Add:

- Update event
- Cancel event
- Rebuild missing event
- Reassign guests
- Detect missing event
- Audit changes

## Priority 6: Deep integration with Compensation Adjustment

Move from manual status selection to verified cross-app workflow completion.

---

# 24. Next Product Roadmap

## V3.2: Production-hardening automation

Recommended scope:

- Transaction-safe launch steps
- Per-recipient send timestamps
- Retry without duplicates
- Trigger-owner display
- Calendar update/cancel
- Full reminder and escalation sequence
- HR exception controls
- Overdue Action Center cards
- Resend individual recipient email
- Launch health dashboard

## V4: Structured performance development

- Multiple structured goals
- Goal owner
- Target date
- Success measure
- Manager support
- Status
- Goal carry-forward
- Goal follow-up reminders
- Previous-review context
- Employee history page

## V5: Reporting and calibration

- Completion timeliness
- Overdue rates
- Ratings distribution
- Manager rating patterns
- Manager vs. employee gaps
- Training themes
- Goal completion rates
- Year-over-year trends
- Export for HR analysis

Reporting should support human calibration. It should not automatically make employment decisions.

---

# 25. Coding Rules and Non-Negotiables

1. **Do not break existing review cycles.**
2. **Do not rerun initial setup on an existing production sheet unless a migration explicitly requires it.**
3. **Every migration must be idempotent.**
4. **Use server-side authorization for every action.**
5. **Never expose compensation information to employees.**
6. **Do not require employees or managers to access the underlying Google files.**
7. **Use locks for state-changing workflows that can be triggered concurrently.**
8. **Persist external-action results immediately.**
9. **Do not rely on email sending as an atomic transaction.**
10. **Do not create duplicate Calendar events on retry.**
11. **Do not overwrite submitted or signed content.**
12. **Audit material actions and administrative overrides.**
13. **Use settings rather than hardcoded URLs, emails, dates, or calendars.**
14. **Keep the combined one-signature-per-person model.**
15. **Keep evaluations private until the meeting opens.**
16. **Keep HR read-only for original participant evaluations unless using an explicit audited override.**
17. **Use complete replacement files or clear patches when handing code to Daniel.**
18. **Maintain mobile signature support.**
19. **Preserve deep links.**
20. **Keep Preview mode as the safe default.**

---

# 26. Testing Matrix

## Access

- HR sees all cycles.
- Manager sees only assigned cycles.
- Employee sees only their own cycles.
- Unauthorized deep link is rejected server-side.
- Employee never receives compensation URL or data.

## Review preparation

- Manager draft saves.
- Employee draft saves.
- Local recovery works.
- Extreme rating requires comment.
- Submit locks content.
- Other participant cannot see submitted content before meeting.

## Meeting

- Cannot open until both are submitted.
- Opening meeting reveals both.
- Rating gaps are correct.
- Meeting notes autosave.
- Compensation gate is enforced.
- Finalization checklist is enforced.

## Signatures

- Manager and employee each receive one task.
- Either order works.
- HR cannot sign early.
- Each signature appears on both documents.
- Final PDFs generate once.
- Final email includes both PDFs.

## Automation

- Preview sends nothing.
- Live creates one cycle.
- Live creates one Calendar event.
- Three correct emails are sent.
- Duplicate run creates nothing new.
- Retry does not duplicate completed steps.
- Disabled assignment is skipped.
- Missing hire date is skipped and surfaced to HR.
- Weekend shifting works.
- Calendar reminders are correct.
- Automation log records success and failure.

## Compensation

- Manager sees link.
- Employee does not.
- Manager records one of two valid decisions.
- HR can reset a mistaken decision.
- Signature release is blocked while required decision is pending.

## Security

- Sheet remains restricted.
- Templates remain restricted.
- Record folder remains restricted.
- App executes as owner.
- Domain is restricted.
- No client-only authorization bypass.

---

# 27. Business Decisions Still Needed

The coding assistant should not silently decide these.

1. Should later annual review periods begin on:
   - Previous anniversary, or
   - Day after previous anniversary?

2. Should every six-month and annual review require a compensation decision?

3. Should the calendar meeting always be placed at 12:00 PM, or should:
   - HR choose a time,
   - Manager choose a time, or
   - Calendar event initially be an all-day placeholder?

4. Should managers be able to reschedule the event through the portal?

5. What reminder cadence should be used before and after the form due date?

6. At what overdue point should HR be copied?

7. Should HR receive a daily summary rather than an email for every reminder?

8. Should the Compensation Adjustment app receive employee and cycle information automatically?

9. Should the final personnel record include:
   - Two separate PDFs only, or
   - Two PDFs plus one combined packet?

10. How should rehires and adjusted service dates be handled?

11. Can a review be postponed, and should postponement alter the anniversary schedule?

12. Who is the single designated automation owner?

13. Should notification read state synchronize across devices?

---

# 28. Recommended First Cursor Tasks

## Task 1: Establish a baseline

- Open the handoff folder as a project.
- Commit the exact V3.1 files.
- Do not change behavior.
- Add a version marker and release note.

## Task 2: Extract configuration constants

Move constants and settings definitions into a dedicated server file without changing names or values.

## Task 3: Write date-logic tests

Make the date helpers independently testable.

## Task 4: Make launch steps idempotent

Add persisted component status and test partial failures.

## Task 5: Split `Index.html`

Extract CSS and major client modules incrementally.

## Task 6: Build full reminder engine

Implement reminders only after launch reliability is fixed.

---

# 29. Ready-to-Paste Prompt for Coder Coach GPT

Copy the following prompt into the coding coach before asking it to modify anything:

---

You are taking over development of the **AITHERAS Performance Review Portal**, a Google Apps Script application used by a federal contractor’s HR department.

Read `HANDOFF.md` completely before proposing code. Treat it as the product specification and architectural context.

The current source is V3.1:

- `Code.gs`
- `V31_Automation.gs`
- `Index.html`
- `appsscript.json`

Core non-negotiables:

1. Production deploys as the owner and is restricted to AITHERAS Workspace users.
2. Managers and employees must never need direct Sheet, Docs, or Drive access.
3. Manager and employee evaluations remain private from each other until both submit and the meeting opens.
4. HR can view both but should not edit original participant responses without an explicit audited override.
5. Manager and employee each sign once; HR signs once after both. The same signatures appear on both final PDFs.
6. Employees must never see compensation URLs, decisions, or notes.
7. All server actions must authorize the signed-in user and validate the current workflow state.
8. Migrations must be idempotent and must not destroy existing cycles.
9. Live automation must never create duplicate cycles, Calendar events, or emails on retry.
10. Preview mode must send nothing.
11. Do not hardcode URLs, HR emails, or Calendar IDs.
12. Preserve deep links, autosave, mobile signature support, audit logging, and the current review state machine.

The first engineering priority is to fix V3.1 launch idempotency. The current launch sequence can create a Calendar event and then fail before persisting its ID, which can create duplicates on retry. It can also resend earlier emails if a later email fails.

Before writing code:

- Summarize the relevant current behavior.
- Identify exactly which files and functions you will change.
- State any assumptions.
- Ask for sign-off if the change alters business rules.
- Provide complete replacement files or precise patches.
- Include a test plan for success, partial failure, retry, and authorization.

Do not rewrite the entire system unless specifically asked. Prefer controlled, testable changes.

---

# 30. Guidance for Cursor Agent Rules

A short `AGENTS.md` is included beside this handoff.

Cursor should be instructed to:

- Read `HANDOFF.md` first.
- Preserve current behavior unless the task explicitly changes it.
- Avoid giant unreviewed rewrites.
- Keep server authorization independent of UI visibility.
- Add tests or test harnesses for date and state logic.
- Flag business-policy questions rather than guessing.
- Update documentation and changelog with each release.

---

# 31. Operational Checklist Before Live Use

1. Confirm all active assignments and hire dates.
2. Confirm active HR user.
3. Set explicit `AUTOMATION_HR_EMAIL`.
4. Set Compensation Adjustment URL.
5. Choose Calendar owner and Calendar ID.
6. Confirm review-period boundary policy.
7. Test end-of-month and leap-day hire dates.
8. Run Preview for at least 60 days.
9. Verify no duplicates against manual cycles.
10. Use fake HR, manager, and employee accounts.
11. Verify three emails.
12. Verify one event.
13. Verify reminders.
14. Verify privacy before meeting.
15. Verify compensation gate.
16. Verify combined signatures.
17. Verify both PDFs.
18. Verify final email.
19. Simulate email failure and retry.
20. Simulate Calendar failure and retry.
21. Confirm logs.
22. Enable Live only after all tests pass.

---

# 32. Final Product Direction

This should continue evolving into a lightweight internal performance-management product, not merely a collection of forms.

The highest-value long-term outcome is:

- Reviews launch without HR intervention.
- Each user immediately understands their next task.
- Drafts are safe.
- Privacy is clear.
- Meetings are structured.
- Compensation decisions are coordinated.
- Signatures are simple.
- Records are complete.
- HR sees exceptions rather than manually managing every routine step.
- Goals and prior reviews create continuity.
- Reporting reveals operational and development patterns without replacing human judgment.

The current V3.1 code is a strong functional foundation. The next phase should prioritize reliability, modularity, and automation safety before adding more surface-area features.
