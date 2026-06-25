# 🚦 AURA CAMPUS™ v1.0 — Release Checklist (Phase 9I)

> The **final go/no-go gate** for the Aura Campus v1.0 commercial release. Every
> 🔴 **blocker** must be ✅ before cutover; 🟡 items are launch-window-acceptable
> with a documented owner and fallback. This is a **living gate** — re-run the
> verifiable checks (build, tests, advisors) immediately before cutover.
>
> **Status legend:** ✅ Done · 🟡 Acceptable with fallback · 🔲 Open · ⛔ Blocker-open
> **Gate legend:** 🔴 Blocker (must be ✅) · 🟠 Strongly recommended · 🟢 Nice-to-have
>
> **Last verified:** 2026-06-25 · **Verdict: 🟡 CONDITIONAL GO** — code/security/test
> gates green; remaining items are **ops toggles** (monitoring, backup secrets) and
> **Pro-plan** security upgrades, all with documented fallbacks.

---

## 0. Release Verdict Summary

| Domain | Gate | Status | Blocking? |
|--------|------|--------|-----------|
| 1. Security | 🔴 | ✅ Baseline clean (2 fixable WARNs tracked) | No |
| 2. Testing (Arch A2) | 🔴 | ✅ Complete (CI gate paused vs prod — runs locally) | No |
| 3. Backups & DR | 🔴 | 🟡 Runbook ready; secrets + PITR pending | **Partial** |
| 4. Billing | 🔴 | ✅ 7E live; recurring deferred (manual invoicing) | No |
| 5. Legal & Compliance | 🔴 | ✅ Privacy policy + DPDP consent/erasure live | No |
| 6. Monitoring | 🟠 | 🔲 UptimeRobot not configured | No (recommended) |
| 7. Rollback | 🔴 | ✅ CI migration-replay + git revert + Vercel rollback | No |
| 8. Performance & Infra | 🟠 | ✅ Supabase Healthy (Nano — capacity-watch under real load) | No |
| 9. Sign-off | 🔴 | 🔲 Awaiting owner sign-off | **Yes** |

**Bottom line:** no engineering blockers remain. The two true pre-cutover actions
are **(a)** set the backup secrets + decide PITR (§3) and **(b)** owner sign-off (§9).
Everything else has a working fallback.

---

## 1. 🔒 Security  ·  Gate 🔴

| # | Check | Status | Evidence / Action |
|---|-------|--------|-------------------|
| 1.1 | Every table RLS-enabled, fine-grained (SUPER_ADMIN/INST_ADMIN/HOD/owner) | ✅ | Arch A1 audit; `docs/rls-policy-map.md`. 1 cross-tenant leak found & fixed. |
| 1.2 | Institution isolation verified (no cross-tenant read/write) | ✅ | Arch A2 Step 5 isolation e2e + Step 7 write-auth — 0 leaks. |
| 1.3 | Webhook signatures verified (Razorpay HMAC, NFC secret) | ✅ | Phase 2.5A; `RAZORPAY_WEBHOOK_SECRET` must be set in Vercel (see §3.5). |
| 1.4 | Secrets server-only (`SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `SCHEDULER_API_KEY`) | ✅ | No `NEXT_PUBLIC_` leakage; scheduler shared-secret enforced fail-closed. |
| 1.5 | Security advisors — only accepted baseline | 🟡 | 2 INFO (intentional deny-all `razorpay_webhook_events`, `scheduler_error_logs`) + 9 public document buckets (documented). **2 fixable WARNs:** `kr_update_search_vector` / `kr_recalc_rating` mutable `search_path` → set `search_path = ''`. 1 WARN `review_leave_request` SECURITY DEFINER callable (has internal auth; review). |
| 1.6 | Leaked-password protection (HaveIBeenPwned) | 🔲 | Deferred — requires Supabase **Pro** (register item 7-2). |
| 1.7 | Security headers / CSP | 🟡 | Headers set in `next.config.ts`; full resource-restricting CSP is report-only rollout (deferred). |
| 1.8 | Audit log append-only & immutable | ✅ | Arch A8 — no UPDATE/DELETE policy on `audit_logs`; `logAudit()` wired to all sensitive mutations (Dev Rule 13/17). |

**Pre-cutover (optional, fast):** clear 1.5's two `search_path` WARNs (trivial DDL).
**Gate result:** ✅ — baseline is the documented accepted set; no critical findings.

---

## 2. 🧪 Testing — Arch A2  ·  Gate 🔴

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 2.1 | Unit tests green | ✅ | 653 Vitest tests; `npx tsc --noEmit` clean; `npm run lint` 0 errors. |
| 2.2 | Authenticated route-crawl (all 230 routes × owner role) | ✅ | 238 passed · 0 failed. |
| 2.3 | Critical user-flow e2e (admissions, fees, leave, exams, KH) | ✅ | 5/5 pass; 2 production bugs found & fixed. |
| 2.4 | Cross-role negative auth (27 denials) + isolation (4 checks) | ✅ | All green; defense-in-depth gap found & fixed. |
| 2.5 | e2e wired into CI as a required check | 🟡 | Live & required, but **paused vs prod DB** (Infra R1 — Disk-I/O). Runs locally + in git; continuous CI restored by R1-Phase-2 (local-stack job). |
| 2.6 | Production build passes | ✅ | `npm run build` clean (re-run at cutover). |

**Gate result:** ✅ — A2 complete (7/7). Re-enable continuous CI (`RUN_E2E=true`) once the local-stack job lands; one-time validation stands.

---

## 3. 💾 Backups & Disaster Recovery  ·  Gate 🔴

| # | Check | Status | Action |
|---|-------|--------|--------|
| 3.1 | DR runbook exists (RTO/RPO, recovery ladder) | ✅ | [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) — includes scheduler (Railway) recovery. |
| 3.2 | Weekly encrypted DB backup workflow | 🟡 | GitHub Action exists (Phase 2.5C) — **needs `SUPABASE_DB_URL` + `BACKUP_ENCRYPTION_KEY` repo secrets** (register 2.5-2). |
| 3.3 | Point-in-Time Recovery (PITR) | 🔲 | Requires Supabase **Pro** (register 2.5-1). Until then: weekly backup is the RPO floor. |
| 3.4 | Scheduler resilience (timeout + graceful degrade) | ✅ | `callScheduler()` wrapper; offline → in-app banner, no crash. |
| 3.5 | `RAZORPAY_WEBHOOK_SECRET` set in Vercel | 🔲 | Verify in Vercel env (register 2.5 manual ops). Without it, webhook verification fails closed. |
| 3.6 | `RESEND_API_KEY` + `EMAIL_FROM` set (transactional + demo-request email) | 🟡 | Verify in Vercel; `sendEmail` no-ops safely if unset. Verify domain in Resend for non-sandbox delivery. |

**🔴 Pre-cutover action:** set 3.2 backup secrets and confirm 3.5 webhook secret.
PITR (3.3) and leaked-password (1.6) are the two **Pro-plan** upgrades — schedule the
Pro upgrade or accept the weekly-backup RPO as a documented launch risk.

---

## 4. 💳 Billing  ·  Gate 🔴

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 4.1 | Plan catalog matches public pricing | ✅ | Phase 9A — `subscription_plans` aligned to Essential/Professional/Enterprise; [PRICING_STRATEGY.md](PRICING_STRATEGY.md). Applied to prod 2026-06-25. |
| 4.2 | Subscriptions + invoices + MRR/ARR | ✅ | Phase 7E; `/admin/billing`. |
| 4.3 | 30-day trial provisioning | ✅ | `status='trial'` supported; pricing CTAs open trial. |
| 4.4 | Feature gating | 🟡 | `isFeatureEnabled()` (page-level, default-allow). Middleware hard-gate + Razorpay recurring auto-charge deferred — **manual invoicing for v1.0** (documented). |
| 4.5 | Razorpay live keys configured | 🟡 | Web verified; confirm **live** (not test) keys in Vercel before taking real payments. |

**Gate result:** ✅ — billing operates; recurring auto-charge is an accepted post-v1.0 add-on with a manual fallback.

---

## 5. ⚖️ Legal & Compliance  ·  Gate 🔴

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 5.1 | Privacy Policy page published | ✅ | [`/privacy-policy`](../../src/app/privacy-policy/page.tsx). |
| 5.2 | DPDP 2023 — consent capture + data erasure | ✅ | Phase 2.5B; `data_consent_logs`, erasure flow; Dev Rule 12 (consent before PII). |
| 5.3 | Data retention documented | ✅ | `src/lib/dataRetention.ts` per PII-storing table (Dev Rule 15). |
| 5.4 | Terms of Service / SLA | 🟡 | Enterprise SLA per contract (PRICING_STRATEGY §1). Public ToS page — confirm before launch if required by GTM. |
| 5.5 | Pricing disclaimers (GST, cancel-anytime) | ✅ | Pricing page footnotes; INR + GST stated. |

**Gate result:** ✅ — privacy/DPDP obligations met; ToS is a GTM decision, not an engineering blocker.

---

## 6. 📡 Monitoring  ·  Gate 🟠

| # | Check | Status | Action |
|---|-------|--------|--------|
| 6.1 | Scheduler health endpoint | ✅ | `/api/scheduler-health` + `/health` on Railway. |
| 6.2 | UptimeRobot (or equiv) on web + scheduler | 🔲 | **Not configured** (register 2.5-3). Set up monitors on the Vercel URL + Railway `/health` — steps in [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md) §4.1. |
| 6.3 | Platform health dashboard | ✅ | Phase 7D `/admin/health` (scheduler ping, payment failures, audit, DB counts). |
| 6.4 | Error visibility | 🟡 | Vercel + Railway logs + Supabase logs. No aggregated APM (acceptable for v1.0). |

**Gate result:** 🟠 — strongly recommended to set UptimeRobot before cutover (15-min task); not a hard blocker because `/admin/health` gives manual visibility.

---

## 7. ↩️ Rollback  ·  Gate 🔴

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 7.1 | Frontend rollback | ✅ | Vercel instant rollback to any prior deployment. |
| 7.2 | DB migration reproducibility | ✅ | Arch A5 — CI replays from-zero against `pg_dump` baseline; migrations forward-only & idempotent. |
| 7.3 | Code revert path | ✅ | `git revert` on `main` → auto-redeploy; branch protection enforces PR + checks. |
| 7.4 | Scheduler rollback | ✅ | Railway redeploy previous image; degraded-mode fallback if down (§3.4). |
| 7.5 | Pricing/data migration reversibility | ✅ | 9A migration is data-only + idempotent; prior values recorded in git history. |

**Gate result:** ✅ — every layer has a tested rollback path.

---

## 8. ⚙️ Performance & Infra  ·  Gate 🟠

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 8.1 | Supabase health | ✅ | Healthy (CPU 14% · Disk 17% · RAM 48%) after Infra R1+R2. |
| 8.2 | All FKs indexed | ✅ | Arch A3 — advisor 136 → 0 unindexed FKs. |
| 8.3 | RLS initplan optimized | ✅ | Infra R2 — `auth.*()` wrapped as `(select …)`; 0 bare remaining. |
| 8.4 | Capacity for real load | 🟡 | On **Nano**. R5 (disable Realtime → poll) + tier upgrade are the levers if real traffic strains it. Watch under first pilots. |

**Gate result:** 🟠 — green now; Nano capacity is a watch-item, not a blocker, for early pilots.

---

## 9. ✍️ Final Sign-off  ·  Gate 🔴

Cutover may proceed when all 🔴 blockers above are ✅ **and** the items below are checked:

- [ ] §3.2 backup secrets set · §3.5 webhook secret confirmed in Vercel
- [ ] §4.5 Razorpay **live** keys confirmed in Vercel
- [ ] §6.2 UptimeRobot monitors live (recommended)
- [ ] Pro-plan decision recorded for §1.6 (leaked-password) + §3.3 (PITR)
- [ ] `npm run build` + full local e2e re-run green at cutover
- [ ] Security advisors re-checked (no new critical findings)

**Sign-off:** _____________________  Role: __________  Date: __________

---

## Appendix — Tracked deferrals carried into v1.0 (non-blocking, with fallbacks)

| Item | Fallback | Register ref |
|------|----------|--------------|
| SMS / WhatsApp channels | In-app + email notifications live | 3-1, 3-2 |
| Razorpay recurring auto-charge | Manual invoicing (7E) | 7E |
| PITR | Weekly encrypted backup | 2.5-1 |
| Leaked-password protection | Strong-password policy at signup | 7-2 |
| Mobile native (NFC/push/CCTV/in-app-pay) | Web is fully usable; Expo-Go screens built | 8-1…8-5 |
| Semantic search (pgvector) | Full-text search powers the KH assistant | KH5-1 |

*Phase 9I · Release Checklist — the v1.0 cutover gate. Re-run the verifiable checks
immediately before launch. Cross-ref: [AURA_V1_EXECUTION_TRACKER.md](AURA_V1_EXECUTION_TRACKER.md) ·
[DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) · [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md).*
