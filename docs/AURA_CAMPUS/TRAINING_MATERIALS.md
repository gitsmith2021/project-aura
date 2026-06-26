# 🎓 AURA CAMPUS™ — Training Materials (Phase 9G)

> Role-based quickstarts, cheat-sheets, and FAQs to get every user productive
> fast. Source these into printable one-pagers, short screen-capture videos, and
> in-app help. Audience: end users at the institution.
>
> **Pairs with:** [DEMO_PLAYBOOK.md](DEMO_PLAYBOOK.md) (click-paths) ·
> [PERSONA_STORYBOARDS.md](PERSONA_STORYBOARDS.md) (the "why") ·
> [demo_credentials.md](demo_credentials.md) (practice tenant).
> **Last updated:** 2026-06-26

---

## 0. Universal basics (everyone)

- **Login:** `/login` with your institution email + password. First login may prompt a password reset.
- **Roles & home:** you land on the surface for your role (below). Personas map to platform tiers — Chairman/Principal/IQAC/Admin = **INST_ADMIN**; HOD = **HOD**; Faculty = **STAFF**; Student/Parent/Alumni = their portals.
- **Notifications:** the 🔔 bell (top bar) shows in-app alerts across every portal.
- **Theme:** light/dark toggle persists per device.
- **Practice safely:** rehearse on the **Aura Demo College** tenant (see [demo_credentials.md](demo_credentials.md)) before touching live data.

---

## 1. Role quickstarts

> Each quickstart = *land → top 3 tasks → where to look*. Turn each into a
> one-page PDF + a 2–3 min video.

### 👔 Chairman / Management — *lands: institution dashboard*
1. **See institutional health** — KPI dashboard: students, fee collection %, placements, attendance, NAAC standing.
2. **Drill down** — click a metric to see department-level detail.
3. **Board prep** — read the live numbers instead of waiting for spreadsheets.
- *Look in:* the institution dashboard (home).

### 🏛️ Principal — *lands: admin*
1. **Generate a timetable** — `/schedules` → pick department → Generate → preview → publish.
2. **Track academics** — attendance, exams, faculty workload.
3. **Stay accreditation-ready** — IQAC/NAAC readiness at a glance.
- *Look in:* `/schedules`, IQAC section, dashboards.

### 🧭 IQAC Coordinator — *lands: admin / IQAC tooling*
1. **Maintain evidence** — IQAC meetings + action items, accreditation evidence.
2. **Track CO/PO attainment** — outcome attainment, auto-computed.
3. **Generate returns** — AQAR / NAAC SSR / NIRF / AISHE via the SSR Builder.
- *Look in:* IQAC / NAAC section.

### 🗂️ Administrator — *lands: admin / full operations*
1. **Run finance** — fee structures, payments (Razorpay), payroll incl. statutory, budgets.
2. **Manage admissions** — enquiry funnel → applications → enroll (auto-creates the student login).
3. **Manage people** — add/bulk-import staff & students ([ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) templates).
- *Look in:* Finance, Admissions, Users.

### 🧑‍🏫 HOD — *lands: department view*
1. **Department analytics** — CIA results, CO/PO attainment, faculty workload.
2. **Approve** — staff leave/requests routed to you.
3. **Publish a department timetable** — review the generated draft.
- *Look in:* department dashboard, CIA, workload.

### 👩‍🏫 Faculty — *lands: staff portal*
1. **Mark attendance** — your timetable → mark a class.
2. **Enter marks** — CIA marks for your subjects; LMS assignments + gradebook.
3. **Use Knowledge Hub** — upload/find teaching resources; apply for leave; view payslip.
- *Look in:* `/staff-portal`.

### 🎓 Student — *lands: student portal*
1. **Check standing** — attendance %, published results, CIA marks.
2. **Pay fees** — fee dues → pay online (Razorpay).
3. **Self-service** — timetable, certificates, scholarships, notices, placements.
- *Look in:* `/student-portal`.

### 👪 Parent — *lands: parent portal*
1. **Monitor your child** — attendance, results, fee dues (switch children if multiple).
2. **Stay informed** — institutional notices & updates.
- *Look in:* `/parent-portal`.

### 🎓 Alumnus — *lands: alumni portal*
1. **Stay connected** — directory, reunions/events, mentorship.
- *Look in:* `/alumni-portal`.

---

## 2. Cheat-sheets (common tasks)

| I want to… | Do this |
|------------|---------|
| Add many students/staff | Users → Bulk Upload → Download template → fill → upload ([ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) §1) |
| Generate a timetable | `/schedules` → department → Generate → preview → publish |
| Collect a fee online | Student portal → Fees → Pay (Razorpay) |
| Record fee/payroll | Admin → Finance → Fees / Salary |
| Mark class attendance | Staff portal → today's class → mark |
| Enter CIA marks | Staff portal → CIA → component → enter |
| Issue a certificate | Admin → Certificates → approve/issue → print |
| Export NAAC/NIRF/AISHE | IQAC → SSR Builder → export |
| Reset the demo tenant | `/admin` → Reset Demo Tenant (SUPER_ADMIN), or `npm run reset:demo` |

---

## 3. FAQ

**Q. I logged in but the dashboard is empty.**
New institution? The admin's first login routes into the **Onboarding Wizard** — finish departments → academic year → fees → staff, then import students.

**Q. "AI Scheduler is offline" on `/schedules`.**
The scheduler engine is unreachable; manual scheduling still works. Ops: check Railway `/health` and the recovery ladder ([../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)).

**Q. Department cards show 0 students / wrong counts.**
On import, `program` must be `UG`/`PG` and `year` in range; unknown departments are skipped. Re-check the CSV against [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) §4.

**Q. Online payment didn't reflect.**
Razorpay confirms via webhook — ensure `RAZORPAY_WEBHOOK_SECRET` + live keys are set (ops). The student's ledger updates on webhook receipt.

**Q. Are the AI features required?**
No. Knowledge Hub AI summaries / assistant are an **optional add-on**; the platform's full value works without them.

**Q. Is my institution's data isolated from others?**
Yes — every table is RLS-protected and tenant isolation is verified (Arch A2). You only ever see your institution's data.

**Q. Which browser/devices?**
Any modern browser, responsive on phone/tablet/desktop. Native mobile apps are in progress.

---

## 4. How to turn this into a training program

- **Quickstart PDFs:** one per role (§1) — Pain→task→where-to-look.
- **Short videos:** record the §1 click-paths on the demo tenant (2–3 min each).
- **Cheat-sheet card:** laminate §2 for front-office staff.
- **FAQ → in-app help:** seed §3 into the Help Center (Phase 9H).
- **Train-the-trainer:** walk admins through [DEMO_PLAYBOOK.md](DEMO_PLAYBOOK.md), then have them run their own team using these quickstarts.

*Phase 9G · Training Materials — gets every role productive fast. Grounded in the
shipping portals and the demo tenant; keep click-paths in sync with the UI.*
