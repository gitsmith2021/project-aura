# 🗂️ Aura — Deferred Items Register

> **Purpose:** A single, consolidated view of every feature, integration, or task
> that has been **intentionally deferred** during development. Each item is still
> recorded inline at its point of deferral in the relevant `roadmap/*.md` spec
> (marked `[~]`, `*(deferred…)*`, or a `**Deferred:**` status note) — this file is
> the **rollup** so nothing has to be grep'd for, and nothing gets forgotten.
>
> **How to use this file:**
> - When you defer something, add a row here **and** keep the inline note in the spec.
> - When you complete a deferred item, mark it ✅ here, tick the inline checkbox in
>   the phase file, and note the commit hash in both places.
> - Review this register at the start of each new phase — some items are cheapest
>   to clear in batches (see **Batchable clusters** below).
>
> **Last updated:** 2026-06-15 (after Phase 4E — Asset & Inventory Management)

---

## 🔗 Batchable clusters (do these together)

Several deferrals share a single underlying dependency. Clearing them as one pass
is far cheaper than piecemeal:

| Cluster | Items | Unblocked by |
|---------|-------|--------------|
| **Central fee-ledger integration** | Library overdue fines · Hostel/mess fees · (future) lab/exam fees | One `postToFeeLedger()` seam into `fee_payments` / `fee_structures` |
| **Scheduler-driven sweeps** | Fee-due reminders · Low-attendance alerts · (any time-based job) | A Python/cron scheduler + `callScheduler()` wrapper (infra) |
| **External notification channels** | SMS (MSG91/DLT) · WhatsApp (Meta) · Notices fan-out · Fee-due/Exam email templates | Paid SMS + DLT registration · Meta business verification |
| **Academic-calendar sync** | Venue bookings → calendar · Campus events (4K) → calendar | One `syncToAcademicCalendar()` seam into Step 2A events |
| **CIA internal-marks link** | Lab session marks → CIA `lab_record` component | CIA component resolver already exists (Phase 2E) |
| **Mobile native build (EAS)** | NFC attendance · Push · CCTV RTSP · in-app pay | EAS dev client + Phase 4F (cards) + Phase 3 (push infra) |

---

## 📋 Register

Legend — **Status:** 🔲 open · 🟡 partial · ✅ done. **Priority:** 🔴 high · 🟡 medium · 🟢 low.

### Phase 2 — Foundations / Academic Operations
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 2-1 | Leave approval → forward unapproved requests to HOD | [roadmap/02](roadmap/02-foundation-migrations.md) `staffPortal.ts` | HOD approval chain not built | Phase 5 | 🟡 | 🔲 |

### Phase 2.5 — Critical Fixes (manual dashboard leftovers)
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 2.5-1 | Enable PITR (Point-in-Time Recovery) | [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) | Supabase dashboard toggle (Pro plan) | When on Pro | 🔴 | 🔲 |
| 2.5-2 | Add `SUPABASE_DB_URL` + `BACKUP_ENCRYPTION_KEY` repo secrets | [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) | Manual GitHub secrets entry | Anytime | 🔴 | 🔲 |
| 2.5-3 | Set up UptimeRobot monitoring | [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) | External account setup | Anytime | 🟡 | 🔲 |

### Phase 3 — Notifications
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 3-1 | SMS channel — real MSG91/Fast2SMS send (`sendSMS` is a stub) | [roadmap/05](roadmap/05-phase3-notifications.md) | Paid gateway + DLT registration | Phase 3C cont. | 🟡 | 🟡 |
| 3-2 | WhatsApp channel — real Meta Cloud send (`sendWhatsApp` is a stub) | [roadmap/05](roadmap/05-phase3-notifications.md) | Meta business verification + template approval | Phase 3C cont. | 🟡 | 🟡 |
| 3-3 | Fee-due reminder sweep (fee_payment 7 days overdue → student) | [roadmap/05](roadmap/05-phase3-notifications.md) | Time-based; needs scheduler | Phase 3 + infra | 🟡 | 🔲 |
| 3-4 | Low-attendance alert sweep (attendance < 75% → student) | [roadmap/05](roadmap/05-phase3-notifications.md) | Time-based; needs scheduler | Phase 3 + infra | 🟡 | 🔲 |
| 3-5 | Email template — Fee Due Reminder | [roadmap/05](roadmap/05-phase3-notifications.md) | Ships with the fee-due sweep (3-3) | Phase 3 + infra | 🟢 | 🔲 |
| 3-6 | Email template — Exam Schedule Released | [roadmap/05](roadmap/05-phase3-notifications.md) | No exam-publish trigger yet | Phase 2B follow-up | 🟢 | 🔲 |
| 3-7 | Notices → email/SMS/WhatsApp fan-out (in-app only today) | [roadmap/05](roadmap/05-phase3-notifications.md) | Depends on 3-1 / 3-2 | Phase 3C cont. | 🟢 | 🔲 |

### Phase 4 — Campus Infrastructure
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 4A-1 | Overdue library fines → auto-post into `fee_payments` ledger | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4A | Central fee-ledger seam | Fee-ledger pass | 🟡 | 🔲 |
| 4B-1 | Venue bookings → auto-appear on academic calendar | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4B | Calendar-sync seam | Calendar-sync pass | 🟢 | 🔲 |
| 4C-1 | Hostel/mess fees → auto-link to `fee_structures` | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4C | Central fee-ledger seam | Fee-ledger pass | 🟡 | 🔲 |
| 4D-1 | Explicit batch→student rosters (grid currently uses dept students) | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4D | New `laboratory_batch_students` join + UI | Phase 4D follow-up | 🟢 | 🔲 |
| 4D-2 | Lab session marks → CIA `lab_record` component | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4D | CIA internal-marks link | CIA-link pass | 🟡 | 🔲 |
| 4E-1 | Low-stock asset → notification alert | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4E | Depends on Phase 3 notifications + a sweep | Phase 3 + infra | 🟢 | 🔲 |
| 4E-2 | PO-received goods → auto-populate `assets` registry | [roadmap/06](roadmap/06-phase4-campus-infrastructure.md) §4E-sub | Vendor & PO module not built | Phase 4E-sub | 🟡 | 🔲 |

### Phase 7 — Super Admin / SaaS
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 7C-1 | Impersonate admin (stubbed disabled in UI) | [roadmap/09](roadmap/09-phase7-super-admin.md) | Needs audited `auth.admin` magic-link + `IMPERSONATE` audit action | Phase 7D | 🟡 | 🔲 |
| 7D-1 | `src/app/admin/audit/page.tsx` cross-institution audit view | [roadmap/12](roadmap/12-architecture-quality-register.md) | No super-admin host layout until 7A (now exists) | Phase 7D | 🟡 | 🔲 |
| 7E-1 | Full subscription management portal | [roadmap/12](roadmap/12-architecture-quality-register.md) | Planned scope for 7E | Phase 7E | 🟡 | 🔲 |
| 7-2 | Enable leaked-password protection (HaveIBeenPwned) | [roadmap/09](roadmap/09-phase7-super-admin.md) | Supabase **Pro plan** required | When on Pro | 🔴 | 🔲 |

### Phase 8 — Mobile Apps & CCTV
| # | Deferred item | Source | Blocker / reason | Pickup phase | Priority | Status |
|---|---------------|--------|------------------|--------------|----------|--------|
| 8-1 | NFC attendance marking on mobile | [roadmap/10](roadmap/10-phase8-mobile-apps.md) | Needs Phase 4F (card registry) + EAS dev client | Phase 8B | 🟡 | 🔲 |
| 8-2 | Push notifications (staff/student/parent) | [roadmap/10](roadmap/10-phase8-mobile-apps.md) | Needs Phase 3 push infra + EAS | Phase 8D | 🟡 | 🔲 |
| 8-3 | CCTV RTSP streaming in app | [roadmap/10](roadmap/10-phase8-mobile-apps.md) | Needs native EAS build | Phase 8E | 🟢 | 🔲 |
| 8-4 | In-app Razorpay pay (student mobile) | [roadmap/10](roadmap/10-phase8-mobile-apps.md) | Native checkout integration | Phase 8C cont. | 🟡 | 🔲 |
| 8-5 | Parent mobile app | [roadmap/10](roadmap/10-phase8-mobile-apps.md) | Depends on Phase 6A parent portal | Phase 8F | 🟢 | 🔲 |

---

## ✅ Cleared items

> Move rows here (with commit hash + date) as they are completed, so the open
> register above stays focused on outstanding work.

| # | Item | Commit | Cleared on |
|---|------|--------|-----------|
| — | _(none yet)_ | — | — |

---

*Cross-reference: [AURA_ROADMAP.md](AURA_ROADMAP.md) (master tracker) · phase specs in [roadmap/](roadmap/). This register is the rollup only — the authoritative inline notes live in each phase file.*
