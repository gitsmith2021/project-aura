[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** Core Finance module (Razorpay payments, already live).
> **Feeds into:** [05 — Phase 3 Notifications](05-phase3-notifications.md) (audit log + DPDP consent infrastructure underpins notification triggers), [12 — Architecture & Quality Register](12-architecture-quality-register.md) item A8 (Platform-Wide Audit Log).

---

## 🚨 Phase 2.5 — Immediate Critical Fixes (Do Before Phase 3)

> **Why this phase exists:** Three high-risk gaps were identified after Phase 2 completion that must be patched before any new feature work. These are not new features — they are security and reliability fixes to modules already live. Do not skip this phase.

### Step 2.5A — Razorpay Webhook Signature Verification 🔒

> **Risk:** The live fee payment module accepts Razorpay webhook events without verifying the `X-Razorpay-Signature` header. A malicious actor can POST a fake `payment.captured` event and mark a fee as paid without actual payment.

#### What to fix:
- [x] `src/app/api/razorpay-webhook/route.ts` — Add HMAC-SHA256 signature verification using `RAZORPAY_WEBHOOK_SECRET` ✅ `924abe9`
- [x] Verify: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex') === X-Razorpay-Signature` (timing-safe compare via `crypto.timingSafeEqual`)
- [x] Use `req.text()` to get the raw body **before** JSON parsing — parsed body breaks HMAC
- [x] Return `400` immediately on signature mismatch; log the attempt for audit (`razorpay_webhook_events` table, status `rejected_signature`)
- [x] Idempotency / replay prevention: `x-razorpay-event-id` recorded with UNIQUE constraint — duplicates acknowledged but never reprocessed; `payment.captured` cross-checks paise amount before completing
- [x] Auth middleware bypass for webhook paths — `updateSession()` was redirecting ALL unauthenticated requests (incl. `/api/*`) to `/login`, so Razorpay/NFC servers could never reach their endpoints. `/api/razorpay-webhook` + `/api/attendance/nfc` now skip the cookie-session redirect (they authenticate via HMAC / bearer secret). Found by live-testing the endpoint; this also un-breaks the existing NFC webhook
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` value to `.env.local` and Vercel env vars (placeholder added to `.env.local`; secret comes from Razorpay Dashboard → Settings → Webhooks)
- [x] Apply migration `20260612094928_phase2_5a_razorpay_webhook_events.sql` to the Supabase project ✅ Applied via MCP (June 12) — RLS on, advisors clean; E2E verified live: valid signed event → processed + logged, replayed event-id → `duplicate` (no second row), forged signature → 400 + `rejected_signature` audit row
- [ ] Test with Razorpay webhook simulator in test mode (needs deployed URL + real secret registered in Razorpay Dashboard — local signed-request E2E already passed)

#### Code pattern:
```typescript
// src/app/api/razorpay-webhook/route.ts
import crypto from 'crypto';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return new Response('Invalid signature', { status: 400 });
  }
  const event = JSON.parse(rawBody);
  // ... process event
}
```

#### Env var to add:
```env
RAZORPAY_WEBHOOK_SECRET=   # From Razorpay Dashboard → Webhooks → Secret
```

---

### Step 2.5B — Data Privacy & DPDP Act 2023 Compliance Framework 🔐

> **Risk:** India's Digital Personal Data Protection Act 2023 is enforceable. Aura stores student PII (name, DOB, medical records, financial data, biometric NFC). Operating without consent capture and data subject rights exposes every institution client to regulatory liability.

#### Database:
```sql
CREATE TABLE data_consent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  consent_type    TEXT NOT NULL CHECK (consent_type IN (
                    'platform_terms','data_processing','marketing_comms',
                    'biometric_nfc','medical_records','photo_usage')),
  consented       BOOLEAN NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at    TIMESTAMPTZ
);
ALTER TABLE data_consent_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE data_erasure_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  subject_type    TEXT NOT NULL CHECK (subject_type IN ('student','staff','parent')),
  subject_id      UUID NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_review','completed','rejected')),
  admin_notes     TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);
ALTER TABLE data_erasure_requests ENABLE ROW LEVEL SECURITY;
```

#### What to build:
- [x] `supabase/migrations/20260612160000_phase2_5b_dpdp_compliance.sql` — consent_logs + erasure_requests tables. Both RLS-on; consent rows are immutable except `withdrawn_at` (column-level `GRANT UPDATE`), erasure requests admin-editable only on `status`/`admin_notes`/`resolved_at`; no DELETE grants on either (audit trail)
- [x] `src/app/privacy-policy/page.tsx` — Public privacy policy page; `/privacy-policy` added to middleware `PUBLIC_PATHS` and exempted from the staff/student portal fences so every role (and anonymous visitors) can read it
- [x] `src/components/auth/ConsentBanner.tsx` — Consent modal on first login, mounted once in the root layout; blocks UI until the two required consents (`platform_terms`, `data_processing`) are recorded; optional consents (NFC, photo, marketing) recorded as given/declined; "Decline & sign out" path
- [x] `src/actions/privacy.ts` — recordConsent(s), withdrawConsent, requestErasure, getConsentStatus, getMyConsents, getMyErasureRequests + admin getErasureRequests/updateErasureRequest/getConsentLogs. IP + user-agent captured as proof of consent; rejection without documented reason is refused (DPDP)
- [x] `src/app/institutions/[id]/compliance/page.tsx` — Admin view: erasure queue with pending → in_review → completed/rejected workflow + 72h SLA breach flag, consent audit log, retention policy register; "Compliance" link added to the Institution sidebar group
- [x] Student/Staff portal: `/student-portal/privacy` + `/staff-portal/privacy` (shared `src/components/privacy/PrivacyCenter.tsx`) — view consents, withdraw/re-grant optional consents, submit + track erasure requests; "Privacy" nav item in both portal sidebars
- [x] Data retention policy: `src/lib/dataRetention.ts` — single source of truth (rendered on both /privacy-policy and the admin compliance tab); financial 7y, academic 7y, attendance 3y, medical 5y, consent logs 3y post-closure
- [x] Privacy policy link added to login page and landing footer
- [x] Apply migration `20260612160000_phase2_5b_dpdp_compliance.sql` to the Supabase project ✅ Applied via MCP (June 12) — RLS verified on both tables, security advisors clean (only pre-existing findings: razorpay_webhook_events deliberate no-policy RLS + auth leaked-password setting)
- [x] Follow-up `20260612170000_phase2_5b_tighten_grants.sql` ✅ Applied — Supabase's default `GRANT ALL` to anon/authenticated on new tables had silently widened the column-level UPDATE grants; revoked defaults so authenticated can UPDATE only `withdrawn_at` (consent) / `status, admin_notes, resolved_at` (erasure), no DELETE, anon nothing. **Lesson for future migrations: column-level grants on new tables require revoking Supabase's defaults first**

#### Key rules (DPDP 2023):
- Consent must be free, specific, informed, and unambiguous
- Users have the right to withdraw consent at any time
- Data erasure requests must be fulfilled within 72 hours (or documented reason for refusal)
- Children under 18 require verifiable parental consent for data processing

---

### Step 2.5C — Backup, Disaster Recovery & Scheduler Resilience ☁️

> **Risk:** No documented backup strategy for a live SaaS holding marks, financial, and attendance data. The Python scheduler on port 8000 has no health check or fallback — if it goes down, timetable generation is completely broken with no user-facing error.

#### Supabase Backup Configuration:
- [ ] Enable **Point-in-Time Recovery (PITR)** on the Supabase project dashboard (requires Pro plan) — **manual dashboard step**, procedure documented in `docs/DISASTER_RECOVERY.md`
- [ ] Set backup retention to minimum 7 days (30 days recommended for production) — **manual dashboard step**
- [x] Document RTO (Recovery Time Objective): target < 4 hours ✅ `docs/DISASTER_RECOVERY.md`
- [x] Document RPO (Recovery Point Objective): target < 1 hour with PITR ✅ `docs/DISASTER_RECOVERY.md`
- [x] Weekly export via `supabase db dump` in GitHub Actions ✅ `.github/workflows/db-backup.yml` — Sunday 02:00 UTC + manual `workflow_dispatch`, AES-256-encrypted (openssl, `BACKUP_ENCRYPTION_KEY` secret), stored as private artifact with 30-day retention. **Needs repo secrets `SUPABASE_DB_URL` + `BACKUP_ENCRYPTION_KEY` added on GitHub before first run**

#### Scheduler Health & Fallback:
- [x] `src/lib/scheduler.ts` — `callScheduler()` wrapper ✅ 30s AbortController timeout, returns typed `{ success: false, error }` on network/timeout/HTTP/parse failures, logs every failure to `scheduler_error_logs` via service-role client; `generateDepartmentSchedule` refactored to use it (Dev Rule 14 satisfied — it was the only direct call site)
- [x] `scheduler_error_logs` migration ✅ `20260612180000_phase2_5c_scheduler_error_logs.sql` — applied via MCP (June 12), RLS on with no policies + default grants revoked (service-role only), advisors clean
- [x] `src/app/api/scheduler-health/route.ts` ✅ pings engine `/health` (already existed in FastAPI `main.py`), returns 200 ok / 503 offline; added to middleware no-auth list so external uptime monitors can reach it
- [x] Offline banner ✅ `SchedulerStatusBanner` mounted in the AI Auto-Scheduler panel (the generation UI on /schedules — there is no `/institutions/[id]/timetable` route): "AI Scheduler is offline — you can still publish a manually built draft", with retry button
- [ ] Add uptime monitoring (UptimeRobot free tier on `https://<prod-domain>/api/scheduler-health`, 5-min interval) — **manual external setup**, steps in `docs/DISASTER_RECOVERY.md`
- [x] Manual timetable fallback procedure documented ✅ `docs/DISASTER_RECOVERY.md` (incl. engine restart command + incident quick-reference table)

#### GitHub Actions backup workflow:
```yaml
# .github/workflows/db-backup.yml
name: Weekly DB Backup
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase db dump --db-url ${{ secrets.SUPABASE_DB_URL }} > backup.sql
      - run: gzip backup.sql
      # Upload to storage of your choice
```

#### Env var to add:
```env
SUPABASE_DB_URL=   # postgres://... direct connection string (from Supabase dashboard)
```

---

### Phase 2.5 Completion Checklist
- [x] Razorpay webhook signature verified (local signed-request E2E ✅; simulator test still needs deployed URL + real secret)
- [ ] `RAZORPAY_WEBHOOK_SECRET` added to all environments (placeholder in `.env.local`; Vercel pending)
- [x] Consent capture shown on first login for all new users
- [x] Privacy policy page live at `/privacy-policy`
- [x] Erasure request flow working end-to-end
- [ ] Supabase PITR enabled on production project — **manual dashboard step** (see `docs/DISASTER_RECOVERY.md`)
- [x] Scheduler health check endpoint live (`/api/scheduler-health`)
- [x] Scheduler unavailability banner showing in the AI scheduler panel
- [x] Committed & pushed (2.5A `924abe9`, 2.5B `d75993d`+`b26d4c4`, 2.5C `8509ae6`)

---

