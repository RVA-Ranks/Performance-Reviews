# AGENTS.md — AITHERAS Performance Review Portal

Read `docs/AITHERAS_ENGINEERING_PLAYBOOK.md` before every delivery, then read
`HANDOFF.md` before modifying source. Daniel's explicit business decisions take
precedence over the playbook.

## Required behavior

- Preserve existing review cycles and Sheet compatibility.
- Keep production deployment owner-executed and AITHERAS-domain restricted.
- Never require manager or employee access to underlying Sheets, Docs, or Drive.
- Enforce authorization server-side.
- Keep manager and employee evaluations private until the meeting opens.
- Keep HR read-only for original participant responses unless an explicit audited override is requested.
- Keep one signature per manager, employee, and HR across both final documents.
- Never expose compensation details to employees in dashboards, review PDFs,
  previous-review context, or ordinary review emails. The only employee-facing
  compensation disclosure is the read-only acknowledgement panel shown before
  signing when an owner-approved adjustment exists, plus the sealed CAF PDF.
- Keep Preview mode non-destructive.
- Make migrations idempotent.
- Use locks around workflow transitions.
- Persist external-action results immediately.
- Prevent duplicate Calendar events and duplicate email sends on retry.
- Preserve deep links, autosave, mobile signing, PDFs, and audit logging.

## Development approach

1. Explain the current behavior relevant to the requested change.
2. Identify files and functions to modify.
3. Separate business-rule changes from refactoring.
4. Do not make business-policy decisions silently.
5. Prefer small, testable changes.
6. Provide tests for success, failure, retry, permissions, and invalid state.
7. Update `CHANGELOG.md` and relevant documentation.
8. Do not claim a Google Workspace integration is verified unless it was actually tested there.

## First priority

Fix V3.1 launch idempotency. Calendar creation and each recipient email must have a separately persisted completion state so partial failure and retry cannot create duplicates.
