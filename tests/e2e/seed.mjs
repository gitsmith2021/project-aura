// Arch A2 / Step 1 — e2e database seeder.
//
//   node tests/e2e/seed.mjs   (or: npm run seed:e2e)
//
// Idempotent: re-running updates passwords/links rather than duplicating. Uses
// the Supabase service-role key (bypasses RLS) to create the auth users + the
// linking rows each login path needs. All data is namespaced (`@e2e.aura.test`,
// `e2e-college-*`) so it is safe alongside real data.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { INSTITUTIONS, USERS, PASSWORD } from "./fixtures/seed-data.mjs";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

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
      const { error } = await admin.from("staff").insert({
        institution_id: iid, full_name: u.fullName, email: u.email, profile_id: uid,
        employee_id: u.employeeId, designation: u.designation, joining_date: "2024-06-01",
        department_id: did, is_active: true,
      });
      if (error) throw new Error(`staff(${u.email}): ${error.message}`);
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

  console.log(`\n✅ Seed complete: ${USERS.length} users across ${INSTITUTIONS.length} institutions.`);
}

main().catch((e) => {
  console.error("✗ SEED FAILED:", e?.message || e);
  process.exit(1);
});
