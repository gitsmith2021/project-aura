// Phase 9B — Demo Institution shared library.
//
// Standalone from tests/e2e (no shared state). Provides the demo tenant identity,
// a service-role admin client, and the idempotent cleanup used by both the seeder
// and the reset script. The demo tenant is a DISTINCT institution (slug `aura-demo`,
// `@demo.aura.test` namespace) — it is NEVER a real or e2e tenant.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

// ── Demo identity (the allowlist every destructive op validates against) ──────
export const DEMO_SLUG = "aura-demo";
export const DEMO_DOMAIN = "@demo.aura.test";
export const DEMO_PASSWORD = "AuraDemo@2026"; // simple + memorable, same for every persona
export const DEMO_INSTITUTION = {
  name: "Aura Demo College",
  slug: DEMO_SLUG,
  subdomain: DEMO_SLUG,
};

export const DEPARTMENTS = [
  { key: "CS", name: "Computer Science", code: "CSC" },
  { key: "COM", name: "Commerce", code: "COM" },
  { key: "ENG", name: "English", code: "ENG" },
  { key: "PHY", name: "Physics", code: "PHY" },
  { key: "MAT", name: "Mathematics", code: "MAT" },
  { key: "MGT", name: "Management", code: "MGT" },
];

// Executive personas — the buyers/evaluators. `email` is the login.
export const PERSONAS = [
  { key: "chairman",  email: `chairman${DEMO_DOMAIN}`,  name: "Rajagopal Menon",     role: "admin",   memberRole: "INST_ADMIN",     profileRole: "INST_ADMIN", label: "Chairman",         kind: "staff",   dept: "MGT", designation: "Chairman" },
  { key: "principal", email: `principal${DEMO_DOMAIN}`, name: "Dr. Lakshmi Narayan", role: "admin",   memberRole: "INST_ADMIN",     profileRole: "INST_ADMIN", label: "Principal",        kind: "staff",   dept: "MGT", designation: "Principal" },
  { key: "iqac",      email: `iqac${DEMO_DOMAIN}`,      name: "Dr. Anand Krishnan",  role: "admin",   memberRole: "INST_ADMIN",     profileRole: "INST_ADMIN", label: "IQAC Coordinator", kind: "staff",   dept: "CS",  designation: "IQAC Coordinator" },
  { key: "admin",     email: `admin${DEMO_DOMAIN}`,     name: "Priya Subramaniam",   role: "admin",   memberRole: "INST_ADMIN",     profileRole: "INST_ADMIN", label: "Administrator",    kind: "staff",   dept: "MGT", designation: "Administrative Officer" },
  { key: "hod",       email: `hod${DEMO_DOMAIN}`,       name: "Dr. Suresh Babu",     role: "hod",     memberRole: "HOD",            profileRole: "HOD",        label: "HOD (Computer Science)", kind: "staff", dept: "CS", designation: "Head of Department" },
  { key: "faculty",   email: `faculty${DEMO_DOMAIN}`,   name: "Dr. Meena Iyer",      role: "staff",   memberRole: "STAFF",          profileRole: "STAFF",      label: "Faculty",          kind: "staff",   dept: "CS",  designation: "Associate Professor" },
  { key: "student",   email: `student${DEMO_DOMAIN}`,   name: "Arjun Nair",          role: "student", memberRole: "STUDENT",        profileRole: "STUDENT",    label: "Student",          kind: "student", dept: "CS" },
  { key: "parent",    email: `parent${DEMO_DOMAIN}`,    name: "Geetha Nair",         role: "parent",  memberRole: null,             profileRole: null,         label: "Parent",           kind: "parent",  dept: "CS", linkStudent: "student" },
  { key: "alumni",    email: `alumni${DEMO_DOMAIN}`,    name: "Karthik Raman",       role: "alumni",  memberRole: null,             profileRole: null,         label: "Alumnus",          kind: "alumni",  dept: "CS" },
];

export function makeAdmin() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = envUrl && /^https?:\/\//i.test(envUrl) ? envUrl : "https://nsaheksysxinemtjcako.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error("✗ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Insert rows in chunks (PostgREST payload-friendly). Returns inserted rows when `select`. */
export async function chunkInsert(admin, table, rows, { chunk = 500, select } = {}) {
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    let q = admin.from(table).insert(rows.slice(i, i + chunk));
    if (select) q = q.select(select);
    const { data, error } = await q;
    if (error) throw new Error(`insert ${table} [${i}..${i + chunk}]: ${error.message}`);
    if (data) out.push(...data);
  }
  return out;
}

/** Find an auth user id by email (paged), else null. */
export async function findUserId(admin, email) {
  for (let page = 1; page <= 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const f = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (f) return f.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Idempotent: reuse the persona's auth user (refresh password), else create. */
export async function ensureUser(admin, email, fullName) {
  const existing = await findUserId(admin, email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing, { password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data?.user) throw error ?? new Error(`createUser failed for ${email}`);
  return data.user.id;
}

/** The demo institution row (by slug), or null. */
export async function getDemoInstitution(admin) {
  const { data } = await admin.from("institutions").select("id, slug").eq("slug", DEMO_SLUG).maybeSingle();
  return data ?? null;
}

/**
 * Delete ALL demo-tenant DATA (not the institution row, not auth users) in FK-safe
 * order. Scoped strictly to the demo institution id. Safe to call before re-seeding.
 */
export async function cleanupDemoData(admin, instId) {
  if (!instId) return;
  const idsIn = async (table, col) => {
    const { data } = await admin.from(table).select("id").eq(col, instId);
    return (data ?? []).map((r) => r.id);
  };

  // children addressed via parent ids (no institution_id of their own)
  const schedIds = await idsIn("class_schedules", "institution_id");
  if (schedIds.length) await admin.from("attendance").delete().in("schedule_id", schedIds);
  const driveIds = await idsIn("placement_drives", "institution_id");
  if (driveIds.length) await admin.from("placement_registrations").delete().in("drive_id", driveIds);
  const budgetIds = await idsIn("department_budgets", "institution_id");
  if (budgetIds.length) await admin.from("budget_line_items").delete().in("budget_id", budgetIds);
  const meetingIds = await idsIn("iqac_meetings", "institution_id");
  if (meetingIds.length) await admin.from("iqac_action_items").delete().in("meeting_id", meetingIds);
  const parentRows = await admin.from("parents").select("id").eq("institution_id", instId);
  const parentIds = (parentRows.data ?? []).map((r) => r.id);
  if (parentIds.length) await admin.from("parent_student_links").delete().in("parent_id", parentIds);

  // straightforward institution_id-scoped tables, children before parents
  const byInst = [
    "fee_payments", "fee_demands", "fee_concessions",
    "salary_disbursements", "salary_structures", "expenses", "department_budgets",
    "cia_marks", "cia_results", "cia_components", "co_po_map", "course_outcomes", "program_outcomes",
    "class_schedules", "teaching_assignments", "subjects",
    "placement_drives", "companies",
    "scholarship_applications", "scholarship_schemes",
    "publications", "research_projects",
    "alumni_announcements", "alumni",
    "iqac_meetings", "exam_schedules", "staff_appraisals",
    "knowledge_resources",
    "admissions", "admission_enquiries",
    "notifications", "notices", "data_consent_logs",
    "parents", "students", "staff", "institution_members",
  ];
  for (const t of byInst) {
    const { error } = await admin.from(t).delete().eq("institution_id", instId);
    if (error && !/does not exist|not find|column/i.test(error.message)) {
      throw new Error(`cleanup ${t}: ${error.message}`);
    }
  }

  // persona profiles use tenant_id; departments + academic years recreated each run
  await admin.from("profiles").delete().eq("tenant_id", instId);
  await admin.from("departments").delete().eq("institution_id", instId);
  await admin.from("academic_years").delete().eq("institution_id", instId);
}

/** Delete the demo's auth users (full teardown — used by reset, not by seed). */
export async function deleteDemoAuthUsers(admin) {
  for (const p of PERSONAS) {
    const id = await findUserId(admin, p.email);
    if (id) await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}
