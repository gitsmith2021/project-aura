# 🚀 AURA CAMPUS™ — Onboarding Toolkit (Phase 9D)

> Everything an implementation lead needs to take a new institution **from
> signup to go-live in a day**: import templates (matching the in-app importer
> exactly), a step-by-step go-live checklist, and a migration playbook from
> spreadsheets / a legacy ERP.
>
> **Pairs with:** the in-app **Onboarding Wizard** (`/onboarding/[id]`, Arch A4)
> and the **Bulk Upload** importer on the Staff/Students pages.
> **Last updated:** 2026-06-25

---

## 0. Go-live in a day — the path

```
Sign up / provision tenant
   └─► Onboarding Wizard (/onboarding/[id])
        1. Departments      ──►  2. Academic Year  ──►  3. Fee Structures
        4. Staff (CSV)      ──►  Done (is_onboarded = true)
   └─► Bulk-import Students (CSV)  ──►  Issue logins  ──►  Live
```

The wizard is gated by `is_onboarded` and redirects on first admin login. Every
step is skippable and resumable — but the order below is the fastest clean path.

---

## 1. Import Templates (copy-paste ready)

> ⚠️ **These columns are exact.** They match the in-app importer
> ([BulkUploadModal](../../src/components/users/BulkUploadModal.tsx)). The first
> row may be a header. **`department_name` must match a department in this
> institution exactly** (case-insensitive). `email` and `phone` are optional —
> if `email` is blank and the institution has an `email_domain`, a login email is
> auto-generated. Each importer also has a **Download template** button in-app.

### 1.1 Students — `students_upload_template.csv`

```csv
full_name,email,phone,department_name,program,year
Anita Kumar,,9876543210,Computer Science,UG,2
Rahul Verma,rahul.verma@college.edu,,Commerce,UG,1
Priya Nair,,,Physics,PG,1
```

| Column | Required | Rules |
|--------|----------|-------|
| `full_name` | ✅ | Any name; blank rows are skipped. |
| `email` | ➖ | Optional. Blank → auto-derived from the institution `email_domain` + roll number. |
| `phone` | ➖ | Optional. |
| `department_name` | ✅ | Must match an existing department exactly (case-insensitive). Unknown → row skipped. |
| `program` | ✅ | **`UG`** or **`PG`** only (normalised). Anything else → skipped. |
| `year` | ✅ | **UG: 1–3**, **PG: 1–2**. Out-of-range → skipped. |

> **Roll numbers are auto-generated** as `{program}-{funding}-{deptPrefix}-{NNN}`
> (e.g. `UG-A-CS-001`) from the department's funding type + name. You don't supply them.

### 1.2 Staff — `staff_upload_template.csv`

```csv
full_name,email,phone,department_name,staff_type,daily_wage_rate
Dr. Suresh Babu,suresh.babu@college.edu,,Computer Science,teaching,
Lakshmi R,,9876500000,Administration,non-teaching_office,
Murugan S,,,Hostel,non-teaching_support,450.00
```

| Column | Required | Rules |
|--------|----------|-------|
| `full_name` | ✅ | Blank rows skipped. |
| `email` | ➖ | Optional; auto-derived from `email_domain` if blank. |
| `phone` | ➖ | Optional. |
| `department_name` | ✅ | Must match exactly (case-insensitive). |
| `staff_type` | ✅ | One of: `teaching` · `non-teaching_office` · `non-teaching_warden` · `non-teaching_mess` · `non-teaching_support`. Unknown → defaults to `teaching`. |
| `daily_wage_rate` | ➖ | ₹/day. **Only** for `non-teaching_support` (daily-wage). Ignored for other types. |

### 1.3 Import order (matters)

1. **Departments first** (wizard step 1 or Departments page) — both importers
   resolve `department_name` against existing departments.
2. **Academic year** (wizard step 2) — needed before fee structures.
3. **Fee structures** (wizard step 3).
4. **Staff** (wizard step 4 or Staff page bulk upload).
5. **Students** (Students page bulk upload).

---

## 2. Go-Live Checklist

> Owner: implementation lead. Tick each before handing over to the institution admin.

### Phase A — Provision & configure
- [ ] Tenant created; admin login issued; first-login redirects to the wizard.
- [ ] **Institution profile** — name, slug, logo, `email_domain`, address.
- [ ] **Locale** (Arch A6) — currency `INR`, locale `en-IN`, timezone `Asia/Kolkata` (override per institution if needed).
- [ ] **Departments** created (name + funding type AIDED/SF — drives roll numbers).
- [ ] **Academic year** set (current + start/end dates).
- [ ] **Fee structures** defined per program/year.

### Phase B — Import people
- [ ] **Staff** imported (CSV §1.2) — verify counts in the import log.
- [ ] **Students** imported (CSV §1.1) — verify cohort counts per department.
- [ ] Spot-check 3–5 auto-generated roll numbers + emails.
- [ ] **HOD** designations assigned (department heads).

### Phase C — Access & money
- [ ] **Issue logins** — staff & student portal credentials (per-row in the UI).
- [ ] **Razorpay** — live keys in env; a ₹1 test payment reconciles in the fee ledger.
- [ ] **Webhook** — `RAZORPAY_WEBHOOK_SECRET` set; a webhook event lands.
- [ ] **Email** — `RESEND_API_KEY` set + sender domain verified (receipts/notices send).

### Phase D — Validate & hand over
- [ ] One login per role authenticates and lands on the correct surface.
- [ ] KPI dashboards render real (non-zero) numbers.
- [ ] **Onboarding wizard marked complete** (`is_onboarded = true`).
- [ ] Admin walkthrough delivered (use the [DEMO_PLAYBOOK.md](DEMO_PLAYBOOK.md) per-persona scripts).
- [ ] Support channel + escalation shared; backup/monitoring confirmed (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).

---

## 3. Migration Playbook (legacy ERP / spreadsheets → Aura)

### 3.1 Discovery (½ day)
- Inventory current systems (admissions, fees, exams, library, hostel, HR).
- Get exports of: students, staff, departments, fee structures, current dues.
- Confirm the academic calendar and program/year structure (UG 3-yr / PG 2-yr).

### 3.2 Map & clean (½–1 day)
- Map legacy columns → Aura template columns (§1). The common gaps:
  - **Department names** must be standardised (the importer matches exactly).
  - **program** collapses to `UG`/`PG`; **year** must fall in range.
  - **staff_type** mapped to one of the 5 enum values.
- Clean in a spreadsheet, then export as CSV (UTF-8).
- De-dupe on email/phone where possible.

### 3.3 Dry run (½ day)
- Create departments + academic year + fees in a **staging/trial tenant**.
- Import a **small sample** (20–30 rows) of staff and students.
- Read the **import log** — it reports per-row skips with reasons; fix the source CSV and re-run (imports are additive, so import the remainder after fixing).

### 3.4 Cutover
- Import full staff, then full students (chunked at 40 rows internally).
- Reconcile counts vs. the legacy export.
- Load **outstanding dues** as fee demands (or ad-hoc demands) so day-one ledgers are correct.
- Issue logins; announce go-live.

### 3.5 Post-cutover
- Run the [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) §9 items for the tenant.
- Keep the legacy system **read-only** for one cycle as a fallback.
- Schedule a 2-week check-in.

---

## 4. Common import errors → fixes

| Log message | Cause | Fix |
|-------------|-------|-----|
| `unknown department "X" — skipped` | `department_name` doesn't match | Create the department first, or correct the spelling/case. |
| `program must be UG or PG — skipped` | program is a degree name (e.g. "B.Sc") | Set it to `UG` or `PG`. |
| `year N invalid for UG/PG — skipped` | year out of range | UG → 1–3, PG → 1–2. |
| `missing full_name / department_name` | blank required cell | Fill or remove the row. |
| `Batch failed: …` | DB/RLS error mid-import | Partial rows may have saved; fix the cause and re-import the remainder (additive). |

---

*Phase 9D · Onboarding Toolkit — makes Aura Campus supportable & fast to deploy.
Templates mirror the in-app importer; keep them in sync if the CSV format changes.*
