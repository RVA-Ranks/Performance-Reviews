# V3.1 Automation Workflow

## Schedule logic

### Six-month review

- Review date: Hire date + 6 months
- Review period start: Hire date
- Review period end: Six-month anniversary
- Launch date: 28 days before review date
- Meeting date: Review date, shifted to Monday if it falls on a weekend

### First annual review

- Review type: 1-Year Review
- Review date: First hire anniversary
- Review period start: Hire date
- Review period end: First anniversary
- Launch date: 28 days before review date

### Later annual reviews

- Review type: Annual Review
- Review date: Each hire anniversary after the first year
- Review period start: Previous anniversary
- Review period end: Current anniversary
- Launch date: 28 days before review date

## Workflow sequence

1. Daily trigger checks active assignments.
2. System identifies review dates inside the launch window.
3. Existing cycles are checked to prevent duplicates.
4. Review cycle is created and persisted before external actions.
5. Shared calendar event is created (only if no Calendar Event ID exists) and the event ID is persisted immediately.
6. Manager launch email is sent only when Manager Email Sent At is blank, then the timestamp is persisted immediately.
7. Employee launch email is sent only when Employee Email Sent At is blank, then the timestamp is persisted immediately.
8. HR confirmation email is sent only when HR Email Sent At is blank, then the timestamp is persisted immediately.
9. Launch Completed At is set only after Calendar + all three emails succeed.
10. Manager and employee independently prepare evaluations.
11. Manager records compensation decision.
12. Both evaluations are submitted.
13. Manager or HR opens the meeting.
14. Meeting outcomes are recorded.
15. Review packet is released for signature.
16. Manager and employee each sign once.
17. HR signs last.
18. Final PDFs are created and distributed.

## Failure behavior

- Each external launch step persists its own completion state before the next step runs.
- Failed actions are recorded in `Last Launch Error` and `ReviewAutomationLog`.
- An automated cycle whose launch is incomplete appears in the preview as `Launch needs retry` with per-component status.
- Running Live automation again retries only unfinished components rather than creating another cycle.
- Calendar event creation is skipped when the cycle already contains a Calendar Event ID.
- Completed recipient timestamps are never cleared by an automatic retry.
- `Launch Attempt Count` increments at the start of each launch attempt.
- HR may intentionally resend the three launch emails without creating another event; that resend is audited and does not clear completion timestamps.
- Preview mode creates no cycles, events, emails, or launch triggers.
- Concurrent launch mutations share the script lock held by `createReviewCycle` / `runReviewAutomation`.

## Launch completion fields

- `Calendar Status`
- `Calendar Event ID`
- `Calendar Created At`
- `Manager Email Sent At`
- `Employee Email Sent At`
- `HR Email Sent At`
- `Launch Completed At`
- `Last Launch Error`
- `Launch Attempt Count`

Legacy cycles that already have `Automation Notice Sent At` and a Calendar Event ID are treated as complete and backfilled onto the per-step fields during migration/read.
