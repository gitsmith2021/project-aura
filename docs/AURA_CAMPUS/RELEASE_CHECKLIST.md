# 🚦 AURA CAMPUS™ v1.0 — Release Checklist (Phase 9I)

> The **final go/no-go gate** for the Aura Campus v1.0 commercial release. Every
> 🔴 **blocker** must be ✅ before cutover; 🟡 items are launch-window-acceptable
> with a documented owner and fallback. This is a **living gate** — re-run the
> verifiable checks (build, tests, advisors) immediately before cutover.
>
> **Status legend:** ✅ Done · 🟡 Acceptable with fallback · 🔲 Open · ⛔ Blocker-open
> **Gate legend:** 🔴 Blocker (must be ✅) · 🟠 Strongly recommended · 🟢 Nice-to-have
>
> **Last verified:** 2026-06-25 · **Verdict: ✅ GO — ENGINEERING RELEASE READY.** All
> 🔴 blockers green and signed off; ops toggles (Vercel env, repo secrets, UptimeRobot)
> configured. Supabase Pro (PITR + leaked-password) **consciously deferred** — accepted
> launch risk with documented fallbacks (weekly encrypted backup as RPO floor;
> strong-password policy at signup).

---

## 0. Release Verdict Summary

| Domain | Gate | Status | Blocking? |
|--------|------|--------|-----------|
| 1. Security | 🔴 | ✅ Baseline clean (search_path WARNs fixed) | No |
| 2. Testing (Arch A2) | 🔴 | ✅ Complete (CI gate paused vs prod — runs locally) | No |
| 3. Backups & DR | 🔴 | ✅ Runbook + secrets set; PITR deferred (accepted) | No |
| 4. Billing | 🔴 | ✅ 7E live; recurring deferred (manual invoicing) | No |
| 5. Legal & Compliance | 🔴 | ✅ Privacy policy + DPDP consent/erasure live | No |
| 6. Monitoring | 🟠 | ✅ UptimeRobot live (web + scheduler, 5-min) | No |
| 7. Rollback | 🔴 | ✅ CI migration-replay + git revert + Vercel rollback | No |
| 8. Performance & Infra | 🟠 | ✅ Supabase Healthy (Nano — capacity-watch under real load) | No |
| 9. Sign-off | 🔴 | ✅ Signed off 2026-06-25 | No |

**Bottom line:** ✅ **Engineering Release Ready** — every 🔴 blocker is green and the
owner has signed off. Ops toggles (Vercel env, repo secrets, UptimeRobot) are configured.
The only consciously-deferred item is Supabase Pro (PITR + leaked-password), accepted as a
documented launch risk with fallbacks.

---

## 1. 🔒 Security  ·  Gate 🔴

| # | Check | Status | Evidence / Action |
|---|-------|--------|-------------------|
| 1.1 | Every table RLS-enabled, fine-grained (SUPER_ADMIN/INST_ADMIN/HOD/owner) | ✅ | Arch A1 audit; `docs/rls-policy-map.md`. 1 cross-tenant leak found & fixed. |
| 1.2 | Institution isolation verified (no cross-tenant read/write) | ✅ | Arch A2 Step 5 isolation e2e + Step 7 write-auth — 0 leaks. |
| 1.3 | Webhook signatures verified (Razorpay HMAC, NFC secret) | ✅ | Phase 2.5A; `RAZORPAY_WEBHOOK_SECRET` must be set in Vercel (see §3.5). |
| 1.4 | Secrets server-only (`SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `SCHEDULER_API_KEY`) | ✅ | No `NEXT_PUBLIC_` leakage; scheduler shared-secret enforced fail-closed. |
| 1.5 | Security advisors — only accepted baseline | ✅ | 2 INFO (intentional deny-all `razorpay_webhook_events`, `scheduler_error_logs`) + 9 public document buckets (documented accepted baseline). The 2 `function_search_path_mutable` WARNs (`kr_update_search_vector` / `kr_recalc_rating`) were **fixed** — `search_path` pinned to `''` (migration `20260711000000`, applied & re-verified). 1 WARN `review_leave_request` SECURITY DEFINER callable remains — has internal auth checks; tracked for review. |
| 1.6 | Leaked-password protection (HaveIBeenPwned) | 🟡 | **Deferred (accepted)** — requires Supabase **Pro** (register 7-2). Fallback: strong-password policy at signup. Revisit on Pro upgrade. |
| 1.7 | Security headers / CSP | 🟡 | Headers set in `next.config.ts`; full resource-restricting CSP is report-only rollout (deferred). |
| 1.8 | Audit log append-only & immutable | ✅ | Arch A8 — no UPDATE/DELETE policy on `audit_logs`; `logAudit()` wired to all sensitive mutations (Dev Rule 13/17). |

**Gate result:** ✅ — baseline is the documented accepted set; no critical findings. The two `search_path` WARNs are cleared (2026-06-25).

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
| 3.2 | Weekly encrypted DB backup workflow | ✅ | GitHub Action (Phase 2.5C) — `SUPABASE_DB_URL` + `BACKUP_ENCRYPTION_KEY` repo secrets **set** (2026-06-25). |
| 3.3 | Point-in-Time Recovery (PITR) | 🟡 | **Deferred (accepted)** — requires Supabase **Pro** (register 2.5-1). Weekly encrypted backup is the RPO floor until upgrade. |
| 3.4 | Scheduler resilience (timeout + graceful degrade) | ✅ | `callScheduler()` wrapper; offline → in-app banner, no crash. |
| 3.5 | `RAZORPAY_WEBHOOK_SECRET` set in Vercel | ✅ | Set in Vercel env (2026-06-25); webhook verification fails closed without it. |
| 3.6 | `RESEND_API_KEY` + `EMAIL_FROM` set (transactional + demo-request email) | ✅ | Set in Vercel env (2026-06-25); verify Resend sender domain for non-sandbox delivery. |

**Gate result:** ✅ — backup secrets + webhook/email env set (2026-06-25). PITR (3.3) and
leaked-password (1.6) are the two **Pro-plan** upgrades — **consciously deferred**, with the
weekly encrypted backup as the accepted RPO floor. Revisit on the Pro upgrade.

---

## 4. 💳 Billing  ·  Gate 🔴

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 4.1 | Plan catalog matches public pricing | ✅ | Phase 9A — `subscription_plans` aligned to Essential/Professional/Enterprise; [PRICING_STRATEGY.md](PRICING_STRATEGY.md). Migration `20260710000000` **applied to prod 2026-06-26** (SQL editor). |
| 4.2 | Subscriptions + invoices + MRR/ARR | ✅ | Phase 7E; `/admin/billing`. |
| 4.3 | 30-day trial provisioning | ✅ | `status='trial'` supported; pricing CTAs open trial. |
| 4.4 | Feature gating | 🟡 | `isFeatureEnabled()` (page-level, default-allow). Middleware hard-gate + Razorpay recurring auto-charge deferred — **manual invoicing for v1.0** (documented). |
| 4.5 | Razorpay live keys configured | ✅ | Live keys set in Vercel env (2026-06-25). |

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
| 6.2 | UptimeRobot (or equiv) on web + scheduler | ✅ | **Live** — 2 monitors (Aura Campus Health + Aura Scheduler Engine), 5-min HTTP checks, both Up. Scheduler `/health` now answers HEAD (UptimeRobot's method) after the GET+HEAD fix (`c0c7c9f`). |
| 6.3 | Platform health dashboard | ✅ | Phase 7D `/admin/health` (scheduler ping, payment failures, audit, DB counts). |
| 6.4 | Error visibility | 🟡 | Vercel + Railway logs + Supabase logs. No aggregated APM (acceptable for v1.0). |

**Gate result:** ✅ — UptimeRobot live on both the web app and the scheduler (5-min checks); `/admin/health` remains the in-app fallback.

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

All 🔴 blockers above are ✅ and the sign-off items are confirmed:

- [x] §3.2 backup secrets set (repo) · §3.5 webhook secret in Vercel ✅ 2026-06-25
- [x] §4.5 Razorpay **live** keys in Vercel ✅ 2026-06-25
- [x] §6.2 UptimeRobot monitors live (web + scheduler) ✅ 2026-06-25
- [x] Pro-plan decision recorded — §1.6 (leaked-password) + §3.3 (PITR) **deferred (accepted)**, weekly-backup RPO floor + strong-password fallback; revisit on Pro
- [x] `npm run build` clean · full e2e suite green locally
- [x] Security advisors re-checked — only the documented accepted baseline

> ### ✅ ENGINEERING RELEASE READY — signed off 2026-06-25
>
> Every 🔴 release blocker is green. Remaining deferrals (Supabase Pro: PITR +
> leaked-password protection) are conscious, documented launch risks with
> fallbacks, to be revisited on the Pro upgrade. The platform is cleared for v1.0
> cutover from an engineering standpoint.

**Sign-off:** Smith Immanuel (Owner)  ·  Role: Product Owner  ·  Date: 2026-06-25

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
