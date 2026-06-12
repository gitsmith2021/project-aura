[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** Core Finance module (Razorpay payments, already live).
> **Feeds into:** [05 — Phase 3 Notifications](05-phase3-notifications.md) (audit log + DPDP consent infrastructure underpins notification triggers), [12 — Architecture & Quality Register](12-architecture-quality-register.md) item A8 (Platform-Wide Audit Log).

---

## 🚨 Phase 2.5 — Immediate Critical Fixes (Do Before Phase 3)

> **Why this phase exists:** Three high-risk gaps were identified after Phase 2 completion that must be patched before any new feature work. These are not new features — they are security and reliability fixes to modules already live. Do not skip this phase.

### Step 2.5A — Razorpay Webhook Signature Verification 🔒

> **Risk:** The live fee payment module accepts Razorpay webhook events without verifying the `X-Razorpay-Signature` header. A malicious actor can POST a fake `payment.captured` event and mark a fee as paid without actual payment.

#### What to fix:
- [ ] `src/app/api/razorpay-webhook/route.ts` — Add HMAC-SHA256 signature verification using `RAZORPAY_WEBHOOK_SECRET`
- [ ] Verify: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex') === X-Razorpay-Signature`
- [ ] Use `req.text()` to get the raw body **before** JSON parsing — parsed body breaks HMAC
- [ ] Return `400` immediately on signature mismatch; log the attempt for audit
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` to `.env.local` and Vercel env vars
- [ ] Test with Razorpay webhook simulator in test mode

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
- [ ] `supabase/migrations/..._dpdp_compliance.sql` — consent_logs + erasure_requests tables
- [ ] `src/app/privacy-policy/page.tsx` — Public privacy policy page (required by DPDP)
- [ ] `src/components/auth/ConsentBanner.tsx` — Consent capture on first login (checkboxes for data processing, marketing, biometric if applicable)
- [ ] `src/actions/privacy.ts` — recordConsent, withdrawConsent, requestErasure, getConsentStatus
- [ ] `src/app/institutions/[id]/compliance/page.tsx` — Admin view: erasure requests queue, consent audit log
- [ ] Student/Staff portal: `src/app/[portal]/privacy/page.tsx` — View consents given, withdraw specific consent, submit erasure request
- [ ] Data retention policy: define retention periods per data type in `src/lib/dataRetention.ts` (e.g. financial records: 7 years; medical: 5 years; attendance: 3 years)
- [ ] Add privacy policy link to all portal footers and login pages

#### Key rules (DPDP 2023):
- Consent must be free, specific, informed, and unambiguous
- Users have the right to withdraw consent at any time
- Data erasure requests must be fulfilled within 72 hours (or documented reason for refusal)
- Children under 18 require verifiable parental consent for data processing

---

### Step 2.5C — Backup, Disaster Recovery & Scheduler Resilience ☁️

> **Risk:** No documented backup strategy for a live SaaS holding marks, financial, and attendance data. The Python scheduler on port 8000 has no health check or fallback — if it goes down, timetable generation is completely broken with no user-facing error.

#### Supabase Backup Configuration:
- [ ] Enable **Point-in-Time Recovery (PITR)** on the Supabase project dashboard (requires Pro plan)
- [ ] Set backup retention to minimum 7 days (30 days recommended for production)
- [ ] Document RTO (Recovery Time Objective): target < 4 hours
- [ ] Document RPO (Recovery Point Objective): target < 1 hour with PITR
- [ ] Set up weekly manual export via `supabase db dump` in a GitHub Actions cron workflow → store encrypted in a private S3 bucket or Supabase Storage private bucket

#### Scheduler Health & Fallback:
- [ ] `src/lib/scheduler.ts` — Wrap all `SCHEDULER_API_URL` calls in a `callScheduler()` helper that:
  - Sets a 30s timeout
  - Catches network errors and returns `{ success: false, error: 'Scheduler unavailable' }`
  - Logs the failure to a `scheduler_error_logs` table for admin visibility
- [ ] `src/app/api/scheduler-health/route.ts` — Health check endpoint that pings `SCHEDULER_API_URL/health` and returns status
- [ ] `src/app/institutions/[id]/timetable/page.tsx` — Show a visible banner when scheduler is unreachable: "AI Scheduler is offline — you can still publish a manually built draft"
- [ ] Add uptime monitoring for scheduler (use UptimeRobot free tier or similar) and alert admin via email if down > 5 minutes
- [ ] Document manual timetable fallback procedure in the admin guide

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
- [ ] Razorpay webhook signature verified and tested with simulator
- [ ] `RAZORPAY_WEBHOOK_SECRET` added to all environments
- [ ] Consent capture shown on first login for all new users
- [ ] Privacy policy page live at `/privacy-policy`
- [ ] Erasure request flow working end-to-end
- [ ] Supabase PITR enabled on production project
- [ ] Scheduler health check endpoint live
- [ ] Scheduler unavailability banner showing in timetable page
- [ ] `git commit -m "fix: Phase 2.5 — Security & Compliance patches"`
- [ ] `git push origin main`

---

