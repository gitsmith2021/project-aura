import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { createClient, type SupabaseClient, type PostgrestSingleResponse } from "@supabase/supabase-js";
import type { SeedManifest } from "../fixtures/route-map.mjs";

// Arch A2 / Step 7 — action-wiring coverage (the WRITE side of authorization).
//
// Steps 4–5 proved the *read* side (wrong role bounced from routes; cross-tenant
// reads return nothing). The highest-risk server actions, though, are the ones
// that MUTATE money / grades / enrollment / access. This spec is the data-layer
// backstop behind those actions: even if an action's code gate were bypassed, the
// database itself must reject the write. We exercise the underlying mutations
// directly via PostgREST as the wrong role / wrong tenant and assert each is
// denied — RLS surfaces denial two ways, both treated as "denied":
//   • INSERT against a failing policy  → error (42501)
//   • UPDATE/DELETE of an unreadable row → 0 rows affected (empty `.select()`)
// Real seeded ids are used as targets, so an empty result means RLS blocked the
// write, not "no such row".
//
// Prereq: `npm run seed:e2e` (writes .auth/seed-manifest.json).

config({ path: ".env.local" });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL && /^https?:\/\//.test(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://nsaheksysxinemtjcako.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_0QZApyONjzPE8uplpbaOlA_9gdWwQZ0";

const EMAIL = {
  adminA: "admin@e2e.aura.test",
  adminB: "admin-b@e2e.aura.test",
  student: "student@e2e.aura.test",
  staff: "staff@e2e.aura.test",
};

const manifestPath = path.join(process.cwd(), "tests", "e2e", ".auth", "seed-manifest.json");
const manifest: SeedManifest | null = fs.existsSync(manifestPath)
  ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SeedManifest)
  : null;

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

// RLS denies a write either by erroring (INSERT) or affecting 0 rows (UPDATE/
// DELETE of an unreadable row). Both count as "denied"; a returned row means the
// write went through and the gate failed.
function expectDenied(res: PostgrestSingleResponse<unknown[]> | { data: unknown[] | null; error: unknown }, msg: string) {
  const data = res.data as unknown[] | null;
  const denied = !!res.error || !data || data.length === 0;
  expect(denied, `${msg} — write was NOT denied (data=${JSON.stringify(data)})`).toBe(true);
}

test.describe("action-wiring auth · the WRITE side (RLS backstop)", () => {
  let adminA: SupabaseClient;
  let adminB: SupabaseClient;
  let student: SupabaseClient;
  let staff: SupabaseClient;
  let A = "";
  let B = "";
  let bStudentId = "";
  let bDeptId = "";
  let studentUid = "";
  let staffUid = "";

  test.beforeAll(async () => {
    test.skip(!manifest, "seed manifest missing — run npm run seed:e2e");
    A = manifest!.instA.id;
    B = manifest!.instB.id;
    [adminA, adminB, student, staff] = await Promise.all([
      signIn(EMAIL.adminA, manifest!.password),
      signIn(EMAIL.adminB, manifest!.password),
      signIn(EMAIL.student, manifest!.password),
      signIn(EMAIL.staff, manifest!.password),
    ]);
    // Real B-owned targets (fetched via B's own allowed reads).
    bStudentId = (await adminB.from("students").select("id").eq("institution_id", B).limit(1)).data?.[0]?.id ?? "";
    bDeptId = (await adminB.from("departments").select("id").eq("institution_id", B).limit(1)).data?.[0]?.id ?? "";
    studentUid = (await student.auth.getUser()).data.user?.id ?? "";
    staffUid = (await staff.auth.getUser()).data.user?.id ?? "";
    expect(bStudentId && bDeptId && studentUid && staffUid, "fixtures resolved").toBeTruthy();
  });

  // ── Cross-tenant writes: admin A must not mutate institution B ───────────────
  test("enrollment: admin A cannot INSERT a student into tenant B", async () => {
    expectDenied(
      await adminA.from("students").insert({ institution_id: B, full_name: "E2E Intruder", email: "intruder-a@e2e.aura.test" }).select(),
      "admin A inserted a student into B",
    );
  });

  test("access: admin A cannot INSERT a department into tenant B", async () => {
    expectDenied(
      await adminA.from("departments").insert({ institution_id: B, name: "E2E Intruder Dept" }).select(),
      "admin A inserted a department into B",
    );
  });

  test("enrollment: admin A cannot UPDATE a B-owned student", async () => {
    expectDenied(
      await adminA.from("students").update({ full_name: "HACKED" }).eq("id", bStudentId).select(),
      "admin A updated a B student",
    );
  });

  test("access: admin A cannot DELETE a B-owned department", async () => {
    expectDenied(
      await adminA.from("departments").delete().eq("id", bDeptId).select(),
      "admin A deleted a B department",
    );
  });

  test("access: admin A cannot change membership roles in tenant B", async () => {
    expectDenied(
      await adminA.from("institution_members").update({ role: "STUDENT" }).eq("institution_id", B).select(),
      "admin A changed B's member roles",
    );
  });

  // ── Privilege escalation: a student cannot grant itself power ────────────────
  test("access: a student cannot promote its own membership to INST_ADMIN", async () => {
    expectDenied(
      await student.from("institution_members").update({ role: "INST_ADMIN" }).eq("profile_id", studentUid).select(),
      "student self-promoted to INST_ADMIN",
    );
  });

  test("access: a student cannot create a department", async () => {
    expectDenied(
      await student.from("departments").insert({ institution_id: A, name: "E2E Student Dept" }).select(),
      "student created a department",
    );
  });

  test("money: a student cannot zero out its own fee demand", async () => {
    const ownDemand = (await student.from("fee_demands").select("id").eq("student_id", studentUid).limit(1)).data?.[0]?.id;
    test.skip(!ownDemand, "no seeded fee demand for the student");
    expectDenied(
      await student.from("fee_demands").update({ amount_due: 0 }).eq("id", ownDemand!).select(),
      "student zeroed its own fee demand",
    );
  });

  test("enrollment: a student cannot self-admit (flip an admission to admitted)", async () => {
    test.skip(!manifest!.admissionAId, "no seeded admission");
    expectDenied(
      await student.from("admissions").update({ status: "admitted" }).eq("id", manifest!.admissionAId!).select(),
      "student flipped an admission to admitted",
    );
  });

  test("grades: a student cannot create a CIA assessment component", async () => {
    test.skip(!manifest!.subjectAId || !manifest!.deptAId, "no seeded subject/department");
    expectDenied(
      await student.from("cia_components").insert({
        institution_id: A, department_id: manifest!.deptAId, subject_id: manifest!.subjectAId,
        name: "E2E Bogus Component", component_type: "unit_test", semester: 1,
      }).select(),
      "student created a CIA component",
    );
  });

  // ── Unauthorized write: staff cannot grant itself membership/access ──────────
  test("access: staff cannot grant itself an INST_ADMIN membership", async () => {
    expectDenied(
      await staff.from("institution_members").insert({ profile_id: staffUid, institution_id: A, role: "INST_ADMIN" }).select(),
      "staff granted itself INST_ADMIN",
    );
  });
});
