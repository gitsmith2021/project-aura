# Developer — Branch Strategy

## Purpose

Define how branches, PRs, and merges work so changes reach `main` safely.

## Current State

Trunk-based with short-lived feature branches and protected `main`. Verified by branch protection ([ci-cd.md](../ci-cd.md)) and the workflow used throughout the project history.

## Implementation

### Branches
- **`main`** — the single long-lived branch; always deployable; **protected** (no direct commits, no force-push, no deletion).
- **Feature branches** — short-lived, branched from `main`, named `<type>/<short-name>`:
  - `feat/…` new feature · `fix/…` bug fix · `docs/…` documentation · `chore/…` tooling/maintenance.
  - Examples from history: `fix/sidebar-nav-active-state`, `feat/landing-light-dark-rhythm`.

### Flow
```
main ──▶ git checkout -b feat/x ──▶ commit ──▶ push ──▶ PR
                                                     │  CI required checks + Vercel preview
                                                     ▼
                                          squash-merge to main ──▶ prod deploy
                                                     │
                                              delete the branch
```

### Rules (verified)
- Open a PR for every change; CI must pass (**Type-check, lint & unit tests** + **Validate migrations**); branches must be up to date (strict).
- **Squash-merge** to keep `main` history linear.
- **Never force-push `main`.** To undo a bad merge, `git revert` via a new PR (not history rewrite) — this is the established recovery (see git history `git revert` of a premature push).
- Push to remote only on explicit instruction in agent-driven sessions; `.claude/settings.local.json` stays unstaged.
- Owner may self-merge (0 required approvals) and may bypass in emergencies (`enforce_admins = false`).

## Future Roadmap

- Add required PR approvals + `enforce_admins = true` before external contributors join.
- Promote the e2e gate to required once a dedicated test DB exists.

## Related Documents

- [GitHub](../infrastructure/GitHub.md) · [Release Checklist](../operations/Release Checklist.md) · [Coding Standards](Coding Standards.md) · [ci-cd.md](../ci-cd.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
