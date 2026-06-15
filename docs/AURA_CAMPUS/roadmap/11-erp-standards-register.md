[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** N/A — cross-cutting reference register, reviewed at the start of each major phase.
> **Feeds into:** [09 — Phase 7 Super Admin](09-phase7-super-admin.md) Step 7F (IQAC & Govt Compliance Reports) consumes this register directly.

---

## 🌐 Global Academic ERP Standards — Alignment & Gap Register

> This section tracks Aura's compliance against global academic ERP standards. Review at the start of each major phase and update the status column as modules are completed.

| Status     | Standard / Framework              | Coverage in Aura                                                              | Phase         |
|:----------:|:----------------------------------|:------------------------------------------------------------------------------|:--------------|
| ✅ Strong  | NAAC Criteria 1–7 (India)         | CIA, lesson plans, syllabus, guest lectures, internships, grievances — mapped | Ongoing       |
| ✅ Strong  | NIRF (India rankings)             | Internships (5.2), sports achievements, placement cell (5F)                   | Phase 5F      |
| ✅ Strong  | Student Information System (SIS)  | Enrollment, marks, attendance, promotion pipeline — complete                  | Done          |
| ✅ Strong  | Financial Management              | Fee structures, payments, salary, expenses, reports. TDS/Form 16 via 5C-sub  | Phase 5C-sub  |
| ✅ Strong  | Parent engagement                 | Phase 6A — parent portal with multi-child sibling support                     | Phase 6A      |
| 🔲 Planned | AISHE reporting                   | Field-level schema in Phase 7F; `students.category` + `is_pwd` migration      | Phase 7F      |
| 🔲 Planned | Learning Management (LMS)         | Phase 6G expanded — SCORM, assignment submissions, gradebook                  | Phase 6G      |
| 🔲 Planned | HR / Payroll (Indian statutory)   | 5C-sub: TDS computation, PF/ESI deductions, Form 16 generator                 | Phase 5C-sub  |
| 🔲 Planned | DPDP Act 2023 (India privacy)     | Phase 2.5B — consent logs, erasure requests, privacy policy page              | Phase 2.5B    |
| 🔲 Planned | ISO 27001 (Data security)         | Phase 7D — CSP headers, RLS policy map, data retention doc, pen test plan     | Phase 7D      |
| 🔲 Planned | Audit trail / data integrity      | Arch A8 — central `audit_logs` table + `logAudit()` helper, append-only      | Arch A8       |
| 🔲 Planned | Accreditation export formats      | Phase 7F-sub — central NAAC SSR Builder + AISHE return + NIRF extract         | Phase 7F-sub  |
| 🔲 Planned | Alumni management                 | Phase 5D — alumni portal auto-populated from year promotion workflow           | Phase 5D      |
| 🔲 Planned | Admissions / CRM funnel           | 5A-sub — enquiry management, merit list, offer letter generator               | Phase 5A-sub  |
| 🔲 Planned | Budget & financial planning       | Step 5L — department budgets, line items, actuals vs planned, NAAC 6.4 export | Phase 5L      |
| 🔲 Planned | IQAC management                   | Phase 7F — IQAC Meeting & Action Tracker, agendas, minutes, action items      | Phase 7F      |
| 🔲 Planned | Vendor & procurement              | 4E-sub — vendor registry, purchase orders, PO approval workflow               | Phase 4E-sub  |
| 🔲 Planned | Central NAAC SSR builder          | 7F-sub — criterion-wise aggregation + Excel export in NAAC format             | Phase 7F-sub  |

---

