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
4. Review cycle is created.
5. Shared calendar event is created.
6. Manager launch email is sent.
7. Employee launch email is sent.
8. HR confirmation email is sent.
9. Manager and employee independently prepare evaluations.
10. Manager records compensation decision.
11. Both evaluations are submitted.
12. Manager or HR opens the meeting.
13. Meeting outcomes are recorded.
14. Review packet is released for signature.
15. Manager and employee each sign once.
16. HR signs last.
17. Final PDFs are created and distributed.

## Failure behavior

- Failed actions are recorded in `ReviewAutomationLog`.
- An automated cycle whose launch was not marked complete appears in the preview as `Launch needs retry`.
- Running Live automation again retries the launch rather than creating another cycle.
- Calendar event creation is skipped when the cycle already contains a Calendar Event ID.
- HR may resend the three launch emails without creating another event.
