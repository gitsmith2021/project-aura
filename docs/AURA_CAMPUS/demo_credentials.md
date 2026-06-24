# 🎬 Aura Demo College — Demo Credentials

> Login walkthrough credentials for the **showcase demo tenant** (Phase 9B).
> These are **not** production secrets — the password is intentionally simple and
> meant to be shared with prospects, principals, chairmen, IQAC committees, and
> sales/pilot walkthroughs. The tenant is fully isolated (`aura-demo` /
> `@demo.aura.test`) and contains only curated demo data.
>
> Regenerate / restore at any time with `npm run reset:demo`.

## Access

| | |
|---|---|
| **Login page** | `/login` |
| **Institution URL** | `/institutions/aura-demo` |
| **Password (all personas)** | `AuraDemo@2026` |

## Personas

| Role | Login email | Name | Lands on |
|------|-------------|------|----------|
| **Chairman** | `chairman@demo.aura.test` | Rajagopal Menon | Admin (institution dashboards) |
| **Principal** | `principal@demo.aura.test` | Dr. Lakshmi Narayan | Admin (institution dashboards) |
| **IQAC Coordinator** | `iqac@demo.aura.test` | Dr. Anand Krishnan | Admin (IQAC / NAAC tooling) |
| **Administrator** | `admin@demo.aura.test` | Priya Subramaniam | Admin (full operations) |
| **HOD (Computer Science)** | `hod@demo.aura.test` | Dr. Suresh Babu | HOD (department view) |
| **Faculty** | `faculty@demo.aura.test` | Dr. Meena Iyer | Staff Portal |
| **Student** | `student@demo.aura.test` | Arjun Nair | Student Portal |
| **Parent** | `parent@demo.aura.test` | Geetha Nair | Parent Portal |
| **Alumnus** | `alumni@demo.aura.test` | Karthik Raman | Alumni Portal |

> Personas map to the platform's **existing** roles — Chairman/Principal/IQAC/Admin
> all use the **INST_ADMIN** access tier; HOD = **HOD**; Faculty = **STAFF**;
> Student = **STUDENT**; Parent & Alumnus are served by the `parents` / `alumni`
> tables. (No custom roles were created for the demo.)

## What the demo shows (headline)

- **Aura Demo College** — Autonomous Arts & Science College · Established 1998 · NAAC **A+**
- **6 departments** · ~**142 faculty** · a large student body · **88%** fee collection ·
  active **placements** · **320+** scholarships · **Knowledge Hub** stocked with curated
  resources · live **IQAC / NAAC** accreditation activity · role-specific notifications.

> Dashboards display the **actual seeded row counts** (honest numbers). The default seed
> is the full showcase (~3,240 students — ≈2,890 UG + ~350 PG); a lighter UG tier
> can be seeded with `DEMO_STUDENTS=N npm run seed:demo`.

## Suggested walkthrough order (for sales / evaluators)

1. **Chairman / Principal** → institution-wide KPI dashboards (students, fees, placements, attendance).
2. **IQAC Coordinator** → NAAC/IQAC readiness, evidence, meetings & action items.
3. **Administrator** → finance, admissions funnel, payroll, budgets.
4. **HOD** → department analytics, CIA results, faculty workload.
5. **Faculty** → staff portal (timetable, marks entry, Knowledge Hub upload).
6. **Student / Parent** → self-service portals (attendance, results, fees, dues).
7. **Alumnus** → alumni portal & engagement.

---

*Phase 9B · regenerate with `npm run seed:demo`, reset with `npm run reset:demo` (CLI) or the
**Reset Demo Tenant** button in `/admin` (SUPER_ADMIN only). The live generated copy is written
to the gitignored `.demo/credentials.txt` on every seed run.*
