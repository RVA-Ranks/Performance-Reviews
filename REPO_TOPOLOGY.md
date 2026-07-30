# Repository topology correction

## Problem

GitHub’s default branch is `main`, but that branch only contains a one-line README with an unrelated history. The full application lives on `master`. A fresh clone therefore does not get a deployable tree.

## Already done locally / on remote

- Backup tags:
  - `backup/master-af91f3c-pre-topology`
  - `backup/fix-launch-hardening-recovery-af91f3c`
  - `v3.1-handoff-baseline`
- Archive branch pushed: `archive/initial-readme` (copy of the one-line `main`)
- Application remains on `master` and hardening on `fix/launch-hardening-recovery`
- Crash-safe work continues on `fix/crash-safe-side-effects`

## Manual GitHub steps (requires repo admin)

`gh` is not authenticated in this environment. Complete these in the GitHub UI or after `gh auth login`:

1. **Settings → General → Default branch** → switch default to **`master`**.
2. Optionally rename `master` → `main` only after the old one-line `main` is deleted or already archived as `archive/initial-readme`.
3. Delete or unpublish the orphaned one-line `main` if it still exists after archiving.
4. Open / merge PRs into the canonical application branch (`master` or renamed `main`):
   - `fix/launch-hardening-recovery`
   - `fix/crash-safe-side-effects`
5. Enable branch protection: require PR + `Repository checks` workflow.
6. Do **not** merge the unrelated histories of old `main` and `master`.

## Verify

```bash
git clone https://github.com/RVA-Ranks/Performance-Reviews.git
ls Code.gs V31_Automation.gs Index.html
```

Expected: application files present without checking out another branch.
