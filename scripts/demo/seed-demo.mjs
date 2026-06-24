// Phase 9B — Demo Institution seeder (showcase-grade).
//
//   node scripts/demo/seed-demo.mjs   (or: npm run seed:demo)
//
// Builds "Aura Demo College" — a thriving, accreditation-focused autonomous college
// actively using Aura Campus. Every module presents its strongest believable state.
// Idempotent: re-running wipes the demo tenant's data and rebuilds it. Demo-only
// (slug `aura-demo`, `@demo.aura.test`) — never touches real or e2e tenants.

import fs from "fs";
import path from "path";
import {
  makeAdmin, chunkInsert, ensureUser, getDemoInstitution, cleanupDemoData,
  DEMO_INSTITUTION, DEMO_DOMAIN, DEMO_PASSWORD, DEMO_SLUG, DEPARTMENTS, PERSONAS,
} from "./demo-lib.mjs";

// ── helpers ───────────────────────────────────────────────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const chance = (p) => Math.random() < p;
const pad = (n, w = 3) => String(n).padStart(w, "0");
const FIRST_M = ["Arjun", "Vivek", "Rahul", "Karthik", "Aditya", "Suresh", "Ramesh", "Vijay", "Anand", "Manoj", "Praveen", "Sanjay", "Deepak", "Naveen", "Hari", "Gopal", "Ravi", "Sathish", "Bharath", "Kishore"];
const FIRST_F = ["Meena", "Priya", "Lakshmi", "Divya", "Anjali", "Sneha", "Kavya", "Pooja", "Geetha", "Revathi", "Nithya", "Swathi", "Deepa", "Ananya", "Shruti", "Aishwarya", "Vidya", "Sangeetha", "Bhavana", "Indira"];
const LAST = ["Nair", "Menon", "Iyer", "Pillai", "Krishnan", "Subramaniam", "Raman", "Babu", "Kumar", "Reddy", "Sharma", "Varma", "Rao", "Naidu", "Chandran", "Gopinath", "Mohan", "Prasad", "Venkatesh", "Sundaram"];
const fullName = (g) => `${g === "female" ? pick(FIRST_F) : pick(FIRST_M)} ${pick(LAST)}`;
const today = new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(today.getTime() - n * 864e5);

async function seedDemo() {
  const admin = makeAdmin();
  console.log("🌱 Seeding Aura Demo College …");

  // 1) Institution (upsert by slug) + clean prior demo data
  let inst = await getDemoInstitution(admin);
  if (inst) {
    await admin.from("institutions").update({ name: DEMO_INSTITUTION.name, subdomain: DEMO_INSTITUTION.subdomain, is_onboarded: true }).eq("id", inst.id);
  } else {
    const { data, error } = await admin.from("institutions").insert({ ...DEMO_INSTITUTION, is_onboarded: true }).select("id, slug").single();
    if (error) throw new Error(`institution: ${error.message}`);
    inst = data;
  }
  const I = inst.id;
  await cleanupDemoData(admin, I);
  console.log("• institution", DEMO_SLUG, I);

  // 2) Academic year + departments
  const { data: ay } = await admin.from("academic_years").insert({ institution_id: I, label: "2025–26", start_date: "2025-06-01", end_date: "2026-05-31", is_current: true }).select("id").single();
  const AY = ay.id;
  const deptId = {};
  // Distinct palette key per department so each card renders a unique colour
  // (keys mirror src/lib/deptColors.ts DEPT_COLOR_PALETTE; default is 'violet').
  const DEPT_COLORS = ["violet", "sky", "emerald", "amber", "rose", "teal", "indigo", "orange", "pink", "cyan", "lime", "fuchsia"];
  for (let di = 0; di < DEPARTMENTS.length; di++) {
    const d = DEPARTMENTS[di];
    const { data } = await admin.from("departments").insert({ institution_id: I, name: d.name, color: DEPT_COLORS[di % DEPT_COLORS.length] }).select("id").single();
    deptId[d.key] = data.id;
  }
  console.log("• academic year + 6 departments");

  // 3) Executive personas (auth logins) + their records
  const personaUid = {};
  const personaStudentId = {};
  for (const p of PERSONAS) {
    const uid = await ensureUser(admin, p.email, p.name);
    personaUid[p.key] = uid;
    const did = p.dept ? deptId[p.dept] : null;
    if (p.profileRole) {
      await admin.from("profiles").upsert({ id: uid, full_name: p.name, email: p.email, role: p.profileRole, tenant_id: I, department_id: did }, { onConflict: "id" });
    }
    if (p.memberRole) {
      await admin.from("institution_members").insert({ profile_id: uid, institution_id: I, role: p.memberRole, department_id: did });
    }
    if (p.kind === "staff") {
      await admin.from("staff").insert({
        institution_id: I, department_id: did, full_name: p.name, email: p.email, profile_id: uid,
        employee_id: `EMP-${p.key.toUpperCase()}`, designation: p.designation, employment_type: "full_time",
        qualification: "Ph.D", joining_date: "2010-06-01", is_active: true, title: "Dr", gender: "male", staff_type: "teaching",
      });
    }
    if (p.kind === "student") {
      await admin.from("profiles").upsert({ id: uid, full_name: p.name, email: p.email, role: "STUDENT", tenant_id: I, department_id: did }, { onConflict: "id" });
      const { data } = await admin.from("students").insert({
        id: uid, institution_id: I, department_id: did, full_name: p.name, email: p.email, profile_id: uid,
        roll_number: "CSC25001", roll_no: "CSC25001", programme: "UG", student_program: "UG",
        student_year: 1, semester: 1, section: "A", batch_year: 2025, gender: "male", category: "general", is_active: true,
      }).select("id").single();
      personaStudentId[p.key] = data.id;
    }
    if (p.kind === "parent") {
      const sid = personaStudentId[p.linkStudent];
      const { data } = await admin.from("parents").insert({ institution_id: I, name: p.name, email: p.email, user_id: uid, phone: "9000000001" }).select("id").single();
      if (sid) await admin.from("parent_student_links").insert({ parent_id: data.id, student_id: sid });
    }
    if (p.kind === "alumni") {
      await admin.from("profiles").upsert({ id: uid, full_name: p.name, email: p.email, role: "STUDENT", tenant_id: I, department_id: did }, { onConflict: "id" });
      await admin.from("alumni").insert({
        institution_id: I, profile_id: uid, full_name: p.name, email: p.email, graduation_year: 2018, program: "B.Sc Computer Science",
        department_id: did, batch: "2015–2018", current_employer: "Infosys", current_designation: "Senior Engineer", city: "Bengaluru", is_active: true,
      });
    }
    // DPDP consents so the first-login banner never blocks a walkthrough
    await admin.from("data_consent_logs").insert(["platform_terms", "data_processing"].map((t) => ({ institution_id: I, user_id: uid, consent_type: t, consented: true })));
  }
  console.log("• 9 executive personas");

  // 4) Faculty — 142 total (personas already created 6 teaching staff); add 136 more
  const DESIGS = ["Professor", "Associate Professor", "Assistant Professor"];
  const QUALS = ["Ph.D", "M.Phil", "M.Sc", "M.Tech", "M.Com", "M.A"];
  const staffRows = [];
  let empN = 100;
  for (const d of DEPARTMENTS) {
    const isCS = d.key === "CS";
    const count = isCS ? 22 : 24; // CS already has persona HOD+faculty
    for (let i = 0; i < count; i++) {
      const g = chance(0.45) ? "female" : "male";
      const isHod = i === 0 && !isCS; // one extra HOD per non-CS dept
      staffRows.push({
        institution_id: I, department_id: deptId[d.key], full_name: `Dr. ${fullName(g)}`,
        email: `${d.code.toLowerCase()}.fac${++empN}${DEMO_DOMAIN}`, employee_id: `EMP-${d.code}-${pad(empN)}`,
        designation: isHod ? "Head of Department" : pick(DESIGS), employment_type: "full_time",
        qualification: pick(QUALS), specialization: `${d.name} studies`, joining_date: iso(daysAgo(randInt(400, 4500))).slice(0, 10),
        is_active: true, title: pick(["Dr", "Prof"]), gender: g, staff_type: "teaching",
      });
    }
  }
  const staffOut = await chunkInsert(admin, "staff", staffRows, { select: "id, department_id" });
  // pool of all staff ids (personas + faculty) by department for FK use
  const { data: allStaff } = await admin.from("staff").select("id, department_id").eq("institution_id", I);
  const staffByDept = {};
  for (const s of allStaff) (staffByDept[s.department_id] ??= []).push(s.id);
  console.log(`• faculty seeded — ${allStaff.length} total staff`);

  // 5) Students — data-only across departments × batches × sections.
  // SCALE GUARD (Phase 9B): the default is the full showcase (~2,850 students), which
  // we verified is safe on the current Nano tier — a ~30 MB dataset on a Healthy DB
  // (the earlier Disk-I/O incident was *recurring* CI load + Realtime, not one-time
  // seed volume). For a constrained tier or a snappier reset, override the count:
  //   DEMO_STUDENTS=400 npm run seed:demo
  // Students count toward the "Total Students" KPI (dashboards count rows), so this is
  // the honest lever — there is no institutions config field to inflate the count, and
  // building a KPI override would be out of scope (Phase 9B rule: no new components).
  const PROGRAMS = { CS: "B.Sc Computer Science", COM: "B.Com", ENG: "B.A English", PHY: "B.Sc Physics", MAT: "B.Sc Mathematics", MGT: "BBA" };
  const BATCHES = [{ y: 2023, yr: 3 }, { y: 2024, yr: 2 }, { y: 2025, yr: 1 }];
  const PG_BATCHES = [{ y: 2024, yr: 2 }, { y: 2025, yr: 1 }];
  const studentRows = [];
  const STUDENT_TARGET = Math.max(60, Number(process.env.DEMO_STUDENTS) || 2850);
  const perDept = Math.round(STUDENT_TARGET / DEPARTMENTS.length);
  for (const d of DEPARTMENTS) {
    let n = 0;
    for (const b of BATCHES) {
      const cohort = Math.round(perDept / BATCHES.length) + (b.y === 2025 ? 8 : 0);
      for (let i = 0; i < cohort; i++) {
        const g = chance(0.48) ? "female" : "male";
        n++;
        const roll = `${d.code}${String(b.y).slice(2)}${pad(n)}`;
        studentRows.push({
          institution_id: I, department_id: deptId[d.key], full_name: fullName(g),
          email: `${roll.toLowerCase()}${DEMO_DOMAIN}`, roll_number: roll, roll_no: roll, register_number: `REG${b.y}${pad(n, 4)}`,
          programme: "UG", student_program: "UG", student_year: b.yr, semester: b.yr * 2 - 1,
          section: pick(["A", "B", "C", "D"]), batch_year: b.y, admission_date: `${b.y}-06-15`,
          gender: g, category: pick(["general", "general", "obc", "obc", "sc", "st", "ews"]), is_active: true,
        });
      }
    }
  }
  // PG cohorts — smaller than UG (realistic ratio), so the PG pills populate too.
  const pgPerYear = Math.max(8, Math.round(perDept * 0.06));
  for (const d of DEPARTMENTS) {
    let pn = 0;
    for (const b of PG_BATCHES) {
      for (let i = 0; i < pgPerYear; i++) {
        const g = chance(0.5) ? "female" : "male";
        pn++;
        const roll = `${d.code}PG${String(b.y).slice(2)}${pad(pn)}`;
        studentRows.push({
          institution_id: I, department_id: deptId[d.key], full_name: fullName(g),
          email: `${roll.toLowerCase()}${DEMO_DOMAIN}`, roll_number: roll, roll_no: roll, register_number: `REGPG${b.y}${pad(pn, 4)}`,
          programme: "PG", student_program: "PG", student_year: b.yr, semester: b.yr * 2 - 1,
          section: pick(["A", "B"]), batch_year: b.y, admission_date: `${b.y}-06-15`,
          gender: g, category: pick(["general", "general", "obc", "obc", "sc", "st", "ews"]), is_active: true,
        });
      }
    }
  }
  const studentOut = await chunkInsert(admin, "students", studentRows, { select: "id, department_id" });
  const studentIds = studentOut.map((s) => s.id);
  console.log(`• students seeded — ${studentIds.length}`);

  // 6) Subjects + teaching assignments + a few class schedules (for attendance)
  const SUBJECTS = { CS: ["Data Structures", "Operating Systems", "DBMS", "Computer Networks", "Algorithms"], COM: ["Financial Accounting", "Business Law", "Cost Accounting", "Auditing", "Taxation"], ENG: ["British Literature", "Linguistics", "Indian Writing", "Phonetics", "Drama"], PHY: ["Mechanics", "Quantum Physics", "Electronics", "Optics", "Thermodynamics"], MAT: ["Real Analysis", "Linear Algebra", "Topology", "Statistics", "Calculus"], MGT: ["Principles of Management", "Marketing", "HR Management", "Operations", "Finance"] };
  const subjectRows = [];
  for (const d of DEPARTMENTS) SUBJECTS[d.key].forEach((nm, i) => subjectRows.push({ institution_id: I, department_id: deptId[d.key], name: nm, code: `${d.code}${300 + i}`, subject_type: "theory", semester: randInt(1, 6), credits: 4, hours_per_week: 4, is_active: true }));
  const subjectOut = await chunkInsert(admin, "subjects", subjectRows, { select: "id, department_id" });
  const taRows = [];
  for (const s of subjectOut) { const pool = staffByDept[s.department_id] ?? []; if (pool.length) taRows.push({ institution_id: I, staff_id: pick(pool), subject_id: s.id, semester: randInt(1, 6) }); }
  await chunkInsert(admin, "teaching_assignments", taRows);
  // class schedules for CS (cohort attendance)
  const csSubjects = subjectOut.filter((s) => s.department_id === deptId.CS);
  const schedRows = csSubjects.map((s, i) => ({ institution_id: I, department_id: deptId.CS, subject_id: s.id, subject_name: csSubjects[i] ? SUBJECTS.CS[i] : "Class", day_of_week: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][i % 5], start_time: "09:00", end_time: "10:00", shift: "morning", staff_id: pick(staffByDept[deptId.CS]), status: "active" }));
  const schedOut = await chunkInsert(admin, "class_schedules", schedRows, { select: "id" });
  console.log(`• ${subjectOut.length} subjects, ${schedOut.length} class schedules`);

  // 7) Attendance — CS first-year cohort × schedules, ~85% present
  const cohort = studentOut.filter((s) => s.department_id === deptId.CS).slice(0, 90).map((s) => s.id);
  const attRows = [];
  const capturer = pick(staffByDept[deptId.CS]);
  for (const sch of schedOut) for (const sid of cohort) attRows.push({ schedule_id: sch.id, student_id: sid, status: chance(0.85) ? "present" : "absent", captured_by: capturer });
  await chunkInsert(admin, "attendance", attRows);
  console.log(`• attendance — ${attRows.length} records (~85% present)`);

  // 8) Finance — fee structures, demands (~88% paid), payments, salaries, expenses, budgets
  const feeStructs = await chunkInsert(admin, "fee_structures", [
    { institution_id: I, name: "UG Tuition Fee 2025–26", fee_type: "tuition", amount: 42000, is_active: true, academic_year_id: AY },
    { institution_id: I, name: "Lab & Library Fee", fee_type: "lab", amount: 6500, is_active: true, academic_year_id: AY },
    { institution_id: I, name: "Examination Fee", fee_type: "exam", amount: 3500, is_active: true, academic_year_id: AY },
  ], { select: "id" });
  const tuition = feeStructs[0].id;
  const demandRows = studentIds.map((sid) => {
    const status = chance(0.88) ? "paid" : pick(["pending", "partial", "pending"]);
    return { institution_id: I, student_id: sid, fee_structure_id: tuition, academic_year_id: AY, title: "Tuition Fee 2025–26", amount_due: 42000, concession_amount: 0, due_date: "2025-08-31", status, source: "fee_structure", created_by: personaUid.admin };
  });
  const demandOut = await chunkInsert(admin, "fee_demands", demandRows, { select: "id, student_id, status" });
  const payRows = demandOut.filter((d) => d.status === "paid").map((d) => ({ institution_id: I, student_id: d.student_id, fee_structure_id: tuition, demand_id: d.id, amount_paid: 42000, payment_mode: pick(["upi", "razorpay", "bank_transfer", "cash"]), payment_status: "completed", receipt_number: `RC-${d.id.slice(0, 8)}`, paid_at: iso(daysAgo(randInt(5, 120))), recorded_by: personaUid.admin }));
  await chunkInsert(admin, "fee_payments", payRows);
  const collectionPct = Math.round((demandOut.filter((d) => d.status === "paid").length / demandOut.length) * 100);
  // salaries for all staff
  const salStructRows = allStaff.map((s) => ({ institution_id: I, staff_id: s.id, basic_salary: randInt(45000, 95000), hra: 12000, ta: 3000, da: 8000, effective_from: "2025-04-01", is_active: true }));
  await chunkInsert(admin, "salary_structures", salStructRows);
  const salDisbRows = allStaff.map((s) => ({ institution_id: I, staff_id: s.id, month: "2026-05-01", amount_disbursed: randInt(58000, 110000), payment_mode: "bank_transfer", status: "processed", disbursed_at: iso(daysAgo(15)), processed_by: personaUid.admin }));
  await chunkInsert(admin, "salary_disbursements", salDisbRows);
  const EXP_CATS = ["utilities", "maintenance", "vendor", "events", "stationery", "infrastructure", "it"];
  const EXP_DESC = { utilities: "Electricity & water charges", maintenance: "Campus maintenance", vendor: "Vendor payment", events: "Event organisation", stationery: "Office stationery", infrastructure: "Infrastructure upgrade", it: "Software licenses & IT" };
  const expRows = Array.from({ length: 36 }, () => { const c = pick(EXP_CATS); return { institution_id: I, department_id: pick(Object.values(deptId)), category: c, description: EXP_DESC[c], amount: randInt(8000, 250000), payment_mode: pick(["bank_transfer", "cheque", "upi"]), expense_date: iso(daysAgo(randInt(5, 180))).slice(0, 10), recorded_by: personaUid.admin }; });
  await chunkInsert(admin, "expenses", expRows);
  for (const d of DEPARTMENTS) {
    const { data: b, error: bErr } = await admin.from("department_budgets").insert({ institution_id: I, department_id: deptId[d.key], academic_year_id: AY, total_allocated: randInt(800000, 2500000), status: "approved", approved_at: iso(daysAgo(90)) }).select("id").single();
    if (bErr) throw new Error(`department_budgets: ${bErr.message}`);
    await chunkInsert(admin, "budget_line_items", ["lab_equipment", "software", "travel", "events"].map((c) => ({ budget_id: b.id, category: c, description: `${c.replace(/_/g, " ")} allocation`, planned_amt: randInt(80000, 600000) })));
  }
  console.log(`• finance — fee collection ${collectionPct}%, salaries, expenses, 6 dept budgets`);

  // 9) Academics — CO/PO + CIA components/marks/results for the CS cohort
  const pos = await chunkInsert(admin, "program_outcomes", Array.from({ length: 5 }, (_, i) => ({ institution_id: I, code: `PO${i + 1}`, description: `Programme Outcome ${i + 1}` })), { select: "id" });
  const cos = await chunkInsert(admin, "course_outcomes", csSubjects.flatMap((s, si) => [1, 2, 3].map((n) => ({ institution_id: I, subject_id: s.id, code: `CO${n}`, description: `Course Outcome ${n} for ${SUBJECTS.CS[si]}` }))), { select: "id" });
  await chunkInsert(admin, "co_po_map", cos.slice(0, 12).map((c) => ({ institution_id: I, course_outcome_id: c.id, program_outcome_id: pick(pos).id, correlation: randInt(1, 3) })));
  const ciaComps = await chunkInsert(admin, "cia_components", csSubjects.flatMap((s) => [{ institution_id: I, department_id: deptId.CS, subject_id: s.id, academic_year_id: AY, name: "CIA-1", component_type: "unit_test", max_marks: 50, semester: 1, weightage: 50 }, { institution_id: I, department_id: deptId.CS, subject_id: s.id, academic_year_id: AY, name: "CIA-2", component_type: "unit_test", max_marks: 50, semester: 1, weightage: 50 }]), { select: "id" });
  const markRows = [];
  for (const sid of cohort.slice(0, 60)) for (const c of ciaComps) markRows.push({ institution_id: I, student_id: sid, cia_component_id: c.id, marks_scored: randInt(28, 49) });
  await chunkInsert(admin, "cia_marks", markRows);
  await chunkInsert(admin, "cia_results", cohort.slice(0, 60).map((sid) => ({ institution_id: I, student_id: sid, department_id: deptId.CS, academic_year_id: AY, semester: 1, final_percentage: randInt(62, 94), computation_mode: "weighted", components_snapshot: [], status: "published", published_at: iso(daysAgo(30)) })));
  console.log("• academics — CO/PO, CIA marks & published results");

  // 10) Admissions funnel + enquiries
  const admStatuses = [["applied", 60], ["shortlisted", 35], ["interview", 22], ["admitted", 30], ["enrolled", 48], ["rejected", 12]];
  const admRows = [];
  let an = 0;
  for (const [st, ct] of admStatuses) for (let i = 0; i < ct; i++) { const g = chance(0.5) ? "female" : "male"; an++; admRows.push({ institution_id: I, applicant_name: fullName(g), applicant_email: `applicant${an}${DEMO_DOMAIN}`, applicant_phone: `9${randInt(100000000, 999999999)}`, program_applied: "UG", department_id: pick(Object.values(deptId)), marks_percentage: randInt(62, 96), status: st }); }
  await chunkInsert(admin, "admissions", admRows);
  await chunkInsert(admin, "admission_enquiries", Array.from({ length: 40 }, () => ({ institution_id: I, name: fullName(pick(["male", "female"])), phone: `9${randInt(100000000, 999999999)}`, program_interest: pick(["UG", "UG", "PG", "Diploma"]) })));
  console.log(`• admissions — ${admRows.length} applicants across the funnel`);

  // 11) Exams
  await chunkInsert(admin, "exam_schedules", csSubjects.map((s, i) => ({ institution_id: I, department_id: deptId.CS, subject_name: SUBJECTS.CS[i], exam_type: "semester", exam_date: iso(daysAgo(-randInt(10, 40))).slice(0, 10), start_time: "10:00", end_time: "13:00", hall_name: `Hall ${i + 1}`, max_marks: 100, pass_marks: 40, academic_year_id: AY, semester: 1 })));
  console.log("• exam schedules");

  // 12) Placements — companies, drives, registrations (~92% placed)
  const COMPANIES = ["Infosys", "TCS", "Wipro", "Cognizant", "Accenture", "Zoho", "Freshworks", "HCL", "Capgemini", "Deloitte", "KPMG", "Amazon", "Flipkart", "Mindtree", "Mphasis", "Tech Mahindra", "IBM", "Oracle", "SAP Labs", "PayPal"];
  const compOut = await chunkInsert(admin, "companies", COMPANIES.map((c) => ({ institution_id: I, name: c, industry: "IT Services", hr_contact_email: `hr@${c.toLowerCase().replace(/\s/g, "")}.com` })), { select: "id" });
  const driveRows = [];
  for (let i = 0; i < 16; i++) driveRows.push({ institution_id: I, company_id: pick(compOut).id, academic_year_id: AY, drive_date: iso(daysAgo(randInt(20, 200))).slice(0, 10), job_role: pick(["Software Engineer", "Analyst", "Associate Consultant", "Data Engineer", "QA Engineer"]), ctc_offered: randInt(4, 14) * 100000, status: "completed" });
  const driveOut = await chunkInsert(admin, "placement_drives", driveRows, { select: "id, ctc_offered" });
  const finalYears = studentOut.filter((s) => s.department_id === deptId.CS || s.department_id === deptId.COM).slice(0, 300).map((s) => s.id);
  const regRows = [];
  for (const sid of finalYears) { const placed = chance(0.92); const d = pick(driveOut); regRows.push({ drive_id: d.id, student_id: sid, stage_status: placed ? "placed" : pick(["interviewed", "shortlisted", "registered"]), offer_ctc: placed ? d.ctc_offered : null, placed_at: placed ? iso(daysAgo(randInt(10, 150))) : null }); }
  await chunkInsert(admin, "placement_registrations", regRows);
  const placedPct = Math.round((regRows.filter((r) => r.stage_status === "placed").length / regRows.length) * 100);
  console.log(`• placements — ${compOut.length} companies, ${driveOut.length} drives, ${placedPct}% placed`);

  // 13) Scholarships — schemes + 320 applications
  const schemes = await chunkInsert(admin, "scholarship_schemes", [
    { institution_id: I, name: "Merit Scholarship", scheme_type: "merit", amount_per_student: 25000, is_active: true },
    { institution_id: I, name: "Means-cum-Merit", scheme_type: "institutional", amount_per_student: 18000, is_active: true },
    { institution_id: I, name: "Sports Excellence", scheme_type: "sports", amount_per_student: 15000, is_active: true },
  ], { select: "id, amount_per_student" });
  const scholarStudents = [...studentIds].sort(() => Math.random() - 0.5).slice(0, 320); // distinct (unique scheme+student+AY)
  const schRows = scholarStudents.map((sid) => { const sc = pick(schemes); const st = pick(["approved", "approved", "disbursed", "disbursed", "verified", "applied"]); return { institution_id: I, scheme_id: sc.id, student_id: sid, academic_year_id: AY, status: st, disbursed_amount: st === "disbursed" ? sc.amount_per_student : null, disbursed_at: st === "disbursed" ? iso(daysAgo(randInt(20, 160))) : null }; });
  await chunkInsert(admin, "scholarship_applications", schRows);
  console.log(`• scholarships — 3 schemes, ${schRows.length} applications`);

  // 14) Research — projects + publications
  await chunkInsert(admin, "research_projects", Array.from({ length: 22 }, (_, i) => ({ institution_id: I, title: `${pick(["AI-driven", "Sustainable", "Quantum", "Data-centric", "Applied"])} ${pick(["analysis", "framework", "study", "platform"])} ${i + 1}`, principal_investigator: pick(allStaff).id, funding_agency: pick(["UGC", "DST", "AICTE", "CSIR", "ICSSR"]), funding_amount: randInt(200000, 4000000), funding_spent: randInt(100000, 2000000), status: pick(["ongoing", "completed"]), department_id: pick(Object.values(deptId)) })));
  await chunkInsert(admin, "publications", Array.from({ length: 48 }, () => ({ institution_id: I, staff_id: pick(allStaff).id, title: `On the ${pick(["efficacy", "applications", "modelling", "analysis"])} of ${pick(["neural networks", "market dynamics", "linguistic patterns", "quantum states", "statistical methods"])}`, pub_type: pick(["journal", "conference", "book_chapter"]), journal_name: pick(["IEEE Access", "Springer LNCS", "Elsevier", "Nature India", "JETIR"]), pub_year: pick([2023, 2024, 2025]), scopus_indexed: chance(0.6), ugc_listed: chance(0.8), impact_factor: (Math.random() * 5 + 1).toFixed(2) })));
  console.log("• research — 22 projects, 48 publications");

  // 15) Alumni — records + announcements
  await chunkInsert(admin, "alumni", Array.from({ length: 80 }, () => { const g = chance(0.45) ? "female" : "male"; const gy = pick([2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022]); return { institution_id: I, full_name: fullName(g), email: `alum${randInt(1000, 9999)}${DEMO_DOMAIN}`, graduation_year: gy, program: pick(Object.values(PROGRAMS)), department_id: pick(Object.values(deptId)), batch: `${gy - 3}–${gy}`, current_employer: pick(COMPANIES), current_designation: pick(["Engineer", "Manager", "Consultant", "Analyst", "Lead"]), city: pick(["Chennai", "Bengaluru", "Hyderabad", "Mumbai", "Kochi", "Pune"]), is_active: true }; }));
  await chunkInsert(admin, "alumni_announcements", [
    { institution_id: I, title: "Alumni Meet 2026 — Save the Date", body: "Join us for the annual alumni reunion on 15 February 2026 at the main campus auditorium." },
    { institution_id: I, title: "Alumni Mentorship Programme", body: "Sign up to mentor final-year students for placements and higher studies." },
  ]);
  console.log("• alumni — 80 records + announcements");

  // 16) Knowledge Hub — 55 showcase resources (the hero feature)
  const KH = [];
  const khUploader = pick(staffByDept[deptId.CS]);
  const khAdd = (n, category, content_type, naac, titles) => titles.slice(0, n).forEach((t) => KH.push({ institution_id: I, department_id: pick(Object.values(deptId)), title: t, description: `${t} — curated institutional resource.`, category, content_type, naac_criterion: naac, visibility: "institution", status: "published", uploaded_by: khUploader, uploader_name: "Dr. Meena Iyer", download_count: randInt(12, 480), tags: ["aura-demo"], academic_year: "2025–26" }));
  khAdd(12, "academic", "lecture_notes", "1", ["Data Structures — Complete Notes", "Operating Systems Lab Manual", "DBMS Normalization Guide", "Computer Networks Handbook", "Algorithms Cheat Sheet", "Financial Accounting Workbook", "Business Law Casebook", "British Literature Reader", "Quantum Physics Primer", "Linear Algebra Workbook", "Marketing Strategy Notes", "Operations Management Guide"]);
  khAdd(8, "research", "research_paper", "3", ["AI in Drug Discovery — Survey", "Sustainable Finance Models", "NLP for Indian Languages", "Quantum Computing Roadmap", "Market Microstructure Study", "Renewable Energy Systems", "Applied Statistics in Genomics", "Blockchain for Land Records"]);
  khAdd(10, "accreditation", "evidence_document", "5", ["NAAC SSR — Criterion 1 Evidence", "NAAC Criterion 2 — Teaching Learning", "NAAC Criterion 3 — Research Output", "NAAC Criterion 4 — Infrastructure", "NAAC Criterion 5 — Student Support", "NIRF Data Submission 2025", "AISHE Annual Return 2024-25", "IQAC Annual Report 2024-25", "Best Practices Document", "Institutional Distinctiveness Report"]);
  khAdd(6, "administration", "policy_document", "6", ["Faculty Handbook 2025-26", "Student Code of Conduct", "Academic Calendar 2025-26", "Examination Manual", "Anti-Ragging Policy", "Grievance Redressal Policy"]);
  khAdd(9, "library", "ebook", "4", ["Introduction to Algorithms (Reference)", "Indian Economy — Reference", "English Grammar in Use", "University Physics Vol. 1", "Higher Engineering Mathematics", "Principles of Management", "Database System Concepts", "Computer Networking Top-Down", "Operating System Concepts"]);
  khAdd(10, "events", "presentation", null, ["Annual Day 2025 — Highlights", "Tech Symposium Deck", "Industry Connect Seminar", "FDP on Outcome-Based Education", "Workshop: Machine Learning", "Cultural Fest Brochure", "Placement Drive Orientation", "Research Methodology Workshop", "Entrepreneurship Bootcamp", "Alumni Talk Series"]);
  await chunkInsert(admin, "knowledge_resources", KH);
  console.log(`• Knowledge Hub — ${KH.length} resources (hero feature)`);

  // 17) IQAC / NAAC — meetings + action items
  const iqacStaff = pick(staffByDept[deptId.CS]);
  const meetings = await chunkInsert(admin, "iqac_meetings", [1, 2, 3, 4].map((n) => ({ institution_id: I, academic_year_id: AY, meeting_date: iso(daysAgo(n * 75)).slice(0, 10), meeting_number: n, agenda: `IQAC Meeting ${n} — review of accreditation readiness, NAAC criteria progress, and quality initiatives.`, minutes: `Minutes of IQAC meeting ${n}: criteria reviewed, action items assigned, AQAR progress noted.`, chaired_by: iqacStaff, status: "completed" })), { select: "id" });
  const actionRows = [];
  for (const m of meetings) for (let i = 0; i < 4; i++) actionRows.push({ meeting_id: m.id, description: pick(["Update Criterion 3 research evidence", "Collect feedback analysis reports", "Finalize AQAR draft", "Upload NIRF data", "Conduct departmental audit", "Review Best Practices document"]), assigned_to: iqacStaff, due_date: iso(daysAgo(-randInt(5, 60))).slice(0, 10), status: pick(["completed", "completed", "in_progress", "open"]) });
  await chunkInsert(admin, "iqac_action_items", actionRows);
  console.log(`• IQAC — ${meetings.length} meetings, ${actionRows.length} action items`);

  // 18) Notifications (per persona) + notices
  const notifRows = [];
  for (const p of PERSONAS) for (const [type, title, body] of [["announcement", "Welcome to Aura Demo College", "Explore the curated demo across every module."], ["academic", "CIA results published", "Internal assessment results are now live."], ["fee", `Fee collection at ${collectionPct}%`, "Term fee collection is on track."], ["placement", `Placements at ${placedPct}%`, "Latest recruitment drive results are published."], ["exam", "Semester exams scheduled", "Hall tickets are now available in the portal."], ["announcement", "NAAC peer-team visit window", "Accreditation readiness review in progress."]]) notifRows.push({ institution_id: I, recipient_id: personaUid[p.key], type, title, body, is_read: chance(0.4) });
  await chunkInsert(admin, "notifications", notifRows);
  await chunkInsert(admin, "notices", [
    { institution_id: I, title: "Semester Examinations — Timetable Released", body: "The end-semester examination timetable has been published. Check your portal.", notice_type: "exam", target_audience: "all" },
    { institution_id: I, title: "Annual Day 2026", body: "Aura Demo College Annual Day will be held on 28 February 2026.", notice_type: "event", target_audience: "all" },
    { institution_id: I, title: "NAAC Peer Team Visit", body: "The NAAC peer team visit is scheduled. Departments to keep evidence ready.", notice_type: "academic", target_audience: "staff" },
    { institution_id: I, title: "Placement Drive — Top IT Companies", body: "Mega placement drive next week. Eligible final-year students register now.", notice_type: "placement", target_audience: "students" },
    { institution_id: I, title: "Fee Payment Reminder", body: "Last date for term fee payment is 31 August 2025.", notice_type: "general", target_audience: "students" },
  ]);
  console.log(`• notifications (${notifRows.length}) + notices`);

  // 19) Credentials + institution brief
  const lines = [
    "AURA DEMO COLLEGE — Demo Credentials & Brief",
    "=".repeat(46),
    "",
    "INSTITUTION PROFILE (narrative for the walkthrough):",
    "  Aura Demo College · Autonomous Arts & Science College · Established 1998",
    "  NAAC A+ · 6 departments · ~142 faculty · 92% placement · NAAC/IQAC active",
    "",
    "SEEDED THIS RUN (what the live dashboards show — they count rows):",
    `  Students ${studentIds.length} · Staff ${allStaff.length} · Departments ${DEPARTMENTS.length}`,
    `  Fee collection ${collectionPct}% · Placements ${placedPct}% · Scholarships ${schRows.length} · Knowledge Hub ${KH.length}`,
    `  (full-scale ~2,850 students is the default; set DEMO_STUDENTS=N for a lighter tier)`,
    "",
    `URL slug: /institutions/${DEMO_SLUG}      Login at: /login`,
    `Password (all personas): ${DEMO_PASSWORD}`,
    "",
    ...PERSONAS.map((p) => `  ${p.label.padEnd(24)} ${p.email}`),
    "",
    "Re-seed: npm run seed:demo   ·   Reset: npm run reset:demo",
    `Generated: ${new Date().toISOString()}`,
  ];
  const demoDir = path.join(process.cwd(), ".demo");
  fs.mkdirSync(demoDir, { recursive: true });
  fs.writeFileSync(path.join(demoDir, "credentials.txt"), lines.join("\n") + "\n");

  console.log("\n" + lines.join("\n"));
  console.log(`\n✅ Aura Demo College seeded — ${studentIds.length} students · ${allStaff.length} staff · ${KH.length} KH resources · fee ${collectionPct}% · placements ${placedPct}%`);
  return { institutionId: I, students: studentIds.length, staff: allStaff.length };
}

// run when invoked directly
const isMain = process.argv[1] && process.argv[1].endsWith("seed-demo.mjs");
if (isMain) seedDemo().catch((e) => { console.error("✗ DEMO SEED FAILED:", e?.message || e); process.exit(1); });

export { seedDemo };
