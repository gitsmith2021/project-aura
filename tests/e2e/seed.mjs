// Arch A2 / Step 1 — e2e database seeder.
//
//   node tests/e2e/seed.mjs   (or: npm run seed:e2e)
//
// Idempotent: re-running updates passwords/links rather than duplicating. Uses
// the Supabase service-role key (bypasses RLS) to create the auth users + the
// linking rows each login path needs. All data is namespaced (`@e2e.aura.test`,
// `e2e-college-*`) so it is safe alongside real data.

import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { INSTITUTIONS, USERS, PASSWORD } from "./fixtures/seed-data.mjs";

config({ path: ".env.local" });

// Public project URL — falls back to the same hardcoded value middleware.ts uses
// when NEXT_PUBLIC_SUPABASE_URL is unset or malformed (it's a public, non-secret
// value). The service-role key has no fallback and must be provided.
const DEFAULT_URL = "https://nsaheksysxinemtjcako.supabase.co";
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const url = envUrl && /^https?:\/\//i.test(envUrl) ? envUrl : DEFAULT_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("✗ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (envUrl && !/^https?:\/\//i.test(envUrl)) {
  console.warn("⚠ NEXT_PUBLIC_SUPABASE_URL is not a valid URL — using the default project URL. Fix it in .env.local (it should be https://<ref>.supabase.co, not a key).");
}
// supabase-js eagerly constructs a RealtimeClient, which on Node < 22 needs a
// WebSocket impl. The seeder only uses REST (auth.admin + from()), so we hand it
// `ws` purely to satisfy that constructor — no realtime channels are opened.
const { default: ws } = await import("ws");
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function findUserId(email) {
  for (let page = 1; page <= 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureUser(email, fullName) {
  const existing = await findUserId(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing, { password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data?.user) throw error ?? new Error("createUser failed for " + email);
  return data.user.id;
}

async function upsertInstitution(inst) {
  const { data: ex } = await admin.from("institutions").select("id").eq("slug", inst.slug).maybeSingle();
  if (ex) {
    await admin.from("institutions").update({ name: inst.name, subdomain: inst.subdomain, is_onboarded: true }).eq("id", ex.id);
    return ex.id;
  }
  const { data, error } = await admin.from("institutions").insert({ name: inst.name, slug: inst.slug, subdomain: inst.subdomain, is_onboarded: true }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertDepartment(institutionId, name) {
  const { data: ex } = await admin.from("departments").select("id").eq("institution_id", institutionId).eq("name", name).maybeSingle();
  if (ex) return ex.id;
  const { data, error } = await admin.from("departments").insert({ institution_id: institutionId, name }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function main() {
  // FK-safe pre-clean: drop any parent↔student links from a prior seed so the
  // per-user delete/insert below can't trip a foreign-key constraint.
  const seedEmails = USERS.map((u) => u.email);
  const { data: priorStudents } = await admin.from("students").select("id").in("email", seedEmails);
  if (priorStudents?.length) {
    await admin.from("parent_student_links").delete().in("student_id", priorStudents.map((s) => s.id));
  }

  const instId = {};
  const deptId = {};
  for (const inst of INSTITUTIONS) {
    instId[inst.key] = await upsertInstitution(inst);
    deptId[inst.key] = await upsertDepartment(instId[inst.key], inst.deptName);
    console.log("• institution", inst.slug, "→", instId[inst.key]);
  }

  const studentIdByEmail = {};
  const staffIdByEmail = {};
  for (const u of USERS) {
    const iid = instId[u.inst];
    const did = deptId[u.inst];
    const uid = await ensureUser(u.email, u.fullName);

    if (u.profileRole) {
      await admin.from("profiles").upsert(
        { id: uid, full_name: u.fullName, email: u.email, role: u.profileRole, tenant_id: iid, department_id: u.dept ? did : null },
        { onConflict: "id" },
      );
    }
    if (u.memberRole) {
      await admin.from("institution_members").delete().eq("profile_id", uid);
      const { error } = await admin.from("institution_members").insert({
        profile_id: uid,
        institution_id: u.memberRole === "SUPER_ADMIN" ? null : iid, // platform-level
        role: u.memberRole,
        department_id: u.dept ? did : null,
      });
      if (error) throw new Error(`institution_members(${u.email}): ${error.message}`);
    }
    if (u.kind === "staff") {
      await admin.from("staff").delete().eq("profile_id", uid);
      const { data, error } = await admin.from("staff").insert({
        institution_id: iid, full_name: u.fullName, email: u.email, profile_id: uid,
        employee_id: u.employeeId, designation: u.designation, joining_date: "2024-06-01",
        department_id: did, is_active: true,
      }).select("id").single();
      if (error) throw new Error(`staff(${u.email}): ${error.message}`);
      staffIdByEmail[u.email] = data.id;
    }
    if (u.kind === "student") {
      // The students SELECT RLS policy keys self-read on `id = auth.uid()`, so the
      // row's primary key must BE the auth user id (this schema's convention) —
      // not just profile_id, or the student can't read their own portal row.
      await admin.from("students").delete().eq("id", uid);
      await admin.from("students").delete().eq("profile_id", uid);
      const { data, error } = await admin.from("students").insert({
        id: uid, institution_id: iid, full_name: u.fullName, email: u.email, profile_id: uid,
        roll_number: u.rollNumber, department_id: did,
      }).select("id").single();
      if (error) throw new Error(`students(${u.email}): ${error.message}`);
      studentIdByEmail[u.email] = data.id;
    }
    if (u.kind === "parent") {
      await admin.from("parents").delete().eq("user_id", uid);
      const { data, error } = await admin.from("parents").insert({
        institution_id: iid, name: u.fullName, email: u.email, user_id: uid, phone: "9000000000",
      }).select("id").single();
      if (error) throw new Error(`parents(${u.email}): ${error.message}`);
      const sid = studentIdByEmail[u.linkStudentEmail];
      if (sid) {
        await admin.from("parent_student_links").delete().eq("parent_id", data.id);
        const { error: lErr } = await admin.from("parent_student_links").insert({ parent_id: data.id, student_id: sid });
        if (lErr) throw new Error(`parent_student_links(${u.email}): ${lErr.message}`);
      }
    }
    console.log("• user", u.email.padEnd(28), "→", u.role);
  }

  // ── Domain entities for the authenticated route-crawl (Step 2) ──────────────
  // One minimal row per entity-detail route in institution A, so the crawl can
  // hit `/…/[subjectId]`, `/…/[examId]`, etc. with a real id instead of skipping.
  // Idempotent: child rows are cleared first (FK-safe), then each row is
  // delete-by-marker + re-inserted. All markers use an "E2E " prefix.
  const A = instId.A, D = deptId.A;
  const studentA = studentIdByEmail["student@e2e.aura.test"];
  const staffA   = staffIdByEmail["staff@e2e.aura.test"] ?? staffIdByEmail["hod@e2e.aura.test"];

  // Clear child rows up front so parent delete-by-marker can't trip an FK.
  if (studentA) await admin.from("online_exam_sessions").delete().eq("student_id", studentA);
  await admin.from("job_applications").delete().eq("institution_id", A).like("applicant_name", "E2E%");
  await admin.from("purchase_orders").delete().eq("institution_id", A).like("po_number", "E2E%");
  await admin.from("placement_drives").delete().eq("institution_id", A).like("job_role", "E2E%");

  async function seedOne(table, delFilter, row) {
    let q = admin.from(table).delete();
    for (const [k, v] of Object.entries(delFilter)) q = q.eq(k, v);
    await q;
    const { data, error } = await admin.from(table).insert(row).select("id").single();
    if (error) throw new Error(`seed ${table}: ${error.message}`);
    return data.id;
  }

  const ent = {};
  ent.ayAId       = await seedOne("academic_years", { institution_id: A, label: "E2E 2026-27" }, { institution_id: A, label: "E2E 2026-27", start_date: "2026-06-01", end_date: "2027-05-31" });
  ent.subjectAId  = await seedOne("subjects", { institution_id: A, name: "E2E Subject" }, { institution_id: A, department_id: D, name: "E2E Subject", code: "E2E101" });
  // Link the staff fixture to the subject so the "teaching staff manage" RLS on
  // lms_assignments lets them open the assignment grade page.
  if (staffA) {
    await admin.from("teaching_assignments").delete().eq("institution_id", A).eq("staff_id", staffA).eq("subject_id", ent.subjectAId);
    const { error: taErr } = await admin.from("teaching_assignments").insert({ institution_id: A, staff_id: staffA, subject_id: ent.subjectAId, semester: 1 });
    if (taErr) throw new Error(`seed teaching_assignments: ${taErr.message}`);
  }
  ent.vendorAId   = await seedOne("vendors", { institution_id: A, name: "E2E Vendor" }, { institution_id: A, name: "E2E Vendor", category: "other" });
  ent.poAId       = await seedOne("purchase_orders", { institution_id: A, po_number: "E2E-PO-001" }, { institution_id: A, vendor_id: ent.vendorAId, po_number: "E2E-PO-001", items: [], total_amount: 0 });
  ent.companyAId  = await seedOne("companies", { institution_id: A, name: "E2E Company" }, { institution_id: A, name: "E2E Company" });
  ent.driveAId    = await seedOne("placement_drives", { institution_id: A, job_role: "E2E Engineer" }, { institution_id: A, company_id: ent.companyAId, drive_date: "2026-12-01", job_role: "E2E Engineer" });
  ent.jobAId      = await seedOne("job_postings", { institution_id: A, title: "E2E Lecturer" }, { institution_id: A, title: "E2E Lecturer", status: "open" });
  ent.jobAppAId   = await seedOne("job_applications", { institution_id: A, applicant_email: "e2e-applicant@e2e.aura.test" }, { institution_id: A, job_posting_id: ent.jobAId, applicant_name: "E2E Applicant", applicant_email: "e2e-applicant@e2e.aura.test" });
  ent.onlineExamAId = await seedOne("online_exams", { institution_id: A, title: "E2E Online Exam" }, { institution_id: A, title: "E2E Online Exam", status: "published", department_id: null, duration_minutes: 30 });
  ent.examSchedAId  = await seedOne("exam_schedules", { institution_id: A, subject_name: "E2E Exam Subject" }, { institution_id: A, department_id: D, subject_name: "E2E Exam Subject", exam_type: "internal", exam_date: "2026-12-01", start_time: "10:00", end_time: "13:00", semester: 1 });
  ent.componentAId  = await seedOne("cia_components", { institution_id: A, name: "E2E Component" }, { institution_id: A, department_id: D, subject_id: ent.subjectAId, name: "E2E Component", component_type: "unit_test", semester: 1 });
  ent.clubAId     = await seedOne("clubs", { institution_id: A, name: "E2E Club" }, { institution_id: A, name: "E2E Club", club_type: "cultural" });
  ent.hostelAId   = await seedOne("hostels", { institution_id: A, name: "E2E Hostel" }, { institution_id: A, name: "E2E Hostel", hostel_type: "boys" });
  ent.labAId      = await seedOne("laboratories", { institution_id: A, name: "E2E Lab" }, { institution_id: A, name: "E2E Lab", lab_type: "computer_science" });
  ent.incidentAId = await seedOne("disciplinary_incidents", { institution_id: A, description: "E2E incident" }, { institution_id: A, incident_type: "misconduct", incident_date: "2026-06-01", description: "E2E incident" });
  ent.grievanceAId = await seedOne("grievances", { institution_id: A, subject: "E2E grievance" }, { institution_id: A, complainant_type: "anonymous", category: "academic", subject: "E2E grievance", description: "E2E grievance details" });
  ent.formAId     = await seedOne("feedback_forms", { institution_id: A, title: "E2E Feedback Form" }, { institution_id: A, title: "E2E Feedback Form", staff_id: staffA ?? null, is_active: true });
  ent.certReqAId  = await seedOne("certificate_requests", { institution_id: A, certificate_no: "E2E/2026/0001" }, { institution_id: A, requester_type: "student", student_id: studentA, certificate_type: "bonafide", status: "issued", certificate_no: "E2E/2026/0001" });
  ent.meetingAId  = await seedOne("iqac_meetings", { institution_id: A, agenda: "E2E agenda" }, { institution_id: A, meeting_date: "2026-06-01", meeting_number: 1, agenda: "E2E agenda" });
  ent.assignmentAId = await seedOne("lms_assignments", { institution_id: A, title: "E2E Assignment" }, { institution_id: A, subject_id: ent.subjectAId, title: "E2E Assignment", due_date: "2026-12-01T10:00:00Z" });
  ent.schemeAId   = await seedOne("scholarship_schemes", { institution_id: A, name: "E2E Scheme" }, { institution_id: A, name: "E2E Scheme", scheme_type: "merit" });
  ent.routeAId    = await seedOne("bus_routes", { institution_id: A, route_name: "E2E Route" }, { institution_id: A, route_name: "E2E Route" });
  ent.admissionAId = await seedOne("admissions", { institution_id: A, applicant_email: "e2e-admission@e2e.aura.test" }, { institution_id: A, applicant_name: "E2E Applicant", applicant_email: "e2e-admission@e2e.aura.test", program_applied: "UG" });
  ent.appraisalAId = await seedOne("staff_appraisals", { institution_id: A, appraisal_period: "E2E 2026 Annual" }, { institution_id: A, staff_id: staffA, appraisal_period: "E2E 2026 Annual" });

  // A submitted online-exam attempt for the student, so the exam-review route
  // (which notFound()s without a finished session) renders.
  if (studentA) {
    const { error: sErr } = await admin.from("online_exam_sessions").insert({
      exam_id: ent.onlineExamAId, student_id: studentA, status: "submitted",
      score: 0, total_marks: 0, submitted_at: new Date().toISOString(),
    });
    if (sErr) throw new Error(`seed online_exam_sessions: ${sErr.message}`);
  }
  console.log(`• domain entities seeded: ${Object.keys(ent).length} for route-crawl`);

  // Manifest of resolved ids — the authenticated route-crawl (Step 2) reads this
  // to fill dynamic route params (`/institutions/[id]/...` slug, a student/staff/
  // department id for self-view + detail routes). Written into the gitignored
  // .auth/ dir alongside the storageState files.
  const slugOf = (k) => INSTITUTIONS.find((i) => i.key === k).slug;
  const manifest = {
    password: PASSWORD,
    instA: { id: instId.A, slug: slugOf("A") },
    instB: { id: instId.B, slug: slugOf("B") },
    deptAId:    deptId.A,
    studentAId: studentIdByEmail["student@e2e.aura.test"] ?? null,
    staffAId:   staffIdByEmail["staff@e2e.aura.test"] ?? staffIdByEmail["hod@e2e.aura.test"] ?? null,
    ...ent, // ayAId, subjectAId, examScheduAId, onlineExamAId, componentAId, clubAId, …
  };
  const authDir = path.join(process.cwd(), "tests", "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, "seed-manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n✅ Seed complete: ${USERS.length} users across ${INSTITUTIONS.length} institutions.`);
  console.log("• manifest →", path.join("tests", "e2e", ".auth", "seed-manifest.json"));
}

main().catch((e) => {
  console.error("✗ SEED FAILED:", e?.message || e);
  process.exit(1);
});
