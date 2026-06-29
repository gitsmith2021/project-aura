# Operations — Release Checklist

## Purpose

The per-change checklist an engineer runs for every PR/release into `main`. Keeps "green locally" equal to "green in CI" and prevents avoidable production incidents.

## Current State

Mirrors the repo's Definition of Done (Dev Rule 18) and the CI gates in [ci-cd.md](../ci-cd.md).

## Implementation — per release

### Before opening the PR
- [ ] On a feature branch (not `main`): `git checkout -b <type>/<name>`
- [ ] `npm run typecheck` passes (`tsc --noEmit`)
- [ ] `npm run lint` passes with **0 errors** (new code is error-clean)
- [ ] `npm test` (Vitest) passes
- [ ] If schema changed: a **new timestamped migration** added after the baseline; replays from zero locally (`supabase db start` + `migration up --local --include-all`)
- [ ] `.claude/settings.local.json` left **unstaged**

### On the PR
- [ ] Required CI checks green: **Type-check, lint & unit tests** + **Validate migrations**
- [ ] Vercel preview deploy reviewed (UI/visual changes verified)
- [ ] PR description explains the change; body ends with the Claude Code footer
- [ ] Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### Merge & post-merge
- [ ] Squash-merge to `main`
- [ ] If schema changed: **back up first** (run db-backup workflow), then apply via `supabase db push` / `execute_sql`
- [ ] Confirm Vercel production deploy succeeded
- [ ] Smoke-test the affected flow in production
- [ ] If scheduler changed: redeploy Railway; confirm `/api/scheduler-health` → `200 ok`

### Rollback (if needed)
- [ ] Vercel → promote previous healthy deployment
- [ ] Data issue → PITR restore (see [Disaster Recovery](Disaster Recovery.md))

## Future Roadmap

- Add the e2e suite as a required pre-merge check once a dedicated test DB exists.

## Related Documents

- [Deployment Guide](Deployment Guide.md) · [Coding Standards](../developer/Coding Standards.md) · [Migration Guidelines](../developer/Migration Guidelines.md) · [Testing](../developer/Testing.md) · [ci-cd.md](../ci-cd.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
