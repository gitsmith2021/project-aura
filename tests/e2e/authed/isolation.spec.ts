import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SeedManifest } from "../fixtures/route-map.mjs";

// Arch A2 / Step 5 — institution isolation (the SaaS release gate). Proves a
// tenant cannot read another tenant's data through the public API/RLS layer,
// the way a real client (PostgREST) reaches it: each admin signs in with their
// own credentials and we assert cross-tenant reads return ZERO rows — by
// institution filter AND by direct id (IDOR) — while own-tenant reads still work
// (so we know RLS isn't just blanket-denying).
//
// This is a data-layer test: it talks to Supabase directly (no browser/dev
// server), but lives in the authed suite so Step 6 runs it in CI.
//
// Prereq: `npm run seed:e2e` (writes .auth/seed-manifest.json).

config({ path: ".env.local" });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL && /^https?:\/\//.test(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://nsaheksysxinemtjcako.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_0QZApyONjzPE8uplpbaOlA_9gdWwQZ0";

const ADMIN_A = "admin@e2e.aura.test";
const ADMIN_B = "admin-b@e2e.aura.test";

const manifestPath = path.join(process.cwd(), "tests", "e2e", ".auth", "seed-manifest.json");
const manifest: SeedManifest | null = fs.existsSync(manifestPath)
  ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SeedManifest)
  : null;

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return client;
}

async function countByInstitution(client: SupabaseClient, table: string, institutionId: string): Promise<number> {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true }).eq("institution_id", institutionId);
  if (error) throw new Error(`${table}[institution_id=${institutionId}]: ${error.message}`);
  return count ?? 0;
}

test.describe("institution isolation · RLS / API layer", () => {
  let adminA: SupabaseClient;
  let adminB: SupabaseClient;
  let A = "";
  let B = "";

  test.beforeAll(async () => {
    test.skip(!manifest, "seed manifest missing — run npm run seed:e2e");
    A = manifest!.instA.id;
    B = manifest!.instB.id;
    adminA = await signIn(ADMIN_A, manifest!.password);
    adminB = await signIn(ADMIN_B, manifest!.password);
  });

  // Tables seeded in BOTH institutions, so own-tenant reads are non-empty and the
  // cross-tenant zero is meaningful (not just "no data either way").
  for (const table of ["departments", "students", "institution_members"]) {
    test(`${table}: each tenant sees only its own rows`, async () => {
      // Own-tenant reads work…
      expect(await countByInstitution(adminA, table, A), `admin A should see A's ${table}`).toBeGreaterThan(0);
      expect(await countByInstitution(adminB, table, B), `admin B should see B's ${table}`).toBeGreaterThan(0);
      // …cross-tenant reads return nothing (the isolation guarantee).
      expect(await countByInstitution(adminA, table, B), `LEAK: admin A read B's ${table}`).toBe(0);
      expect(await countByInstitution(adminB, table, A), `LEAK: admin B read A's ${table}`).toBe(0);
    });
  }

  test("direct-id (IDOR): an admin cannot fetch the other tenant's record by id", async () => {
    // A real B-owned student id, obtained via admin B's own (allowed) read…
    const { data: bStudents, error: bErr } = await adminB.from("students").select("id").eq("institution_id", B).limit(1);
    expect(bErr, bErr?.message).toBeNull();
    const bStudentId = bStudents?.[0]?.id as string | undefined;
    expect(bStudentId, "expected a seeded B student").toBeTruthy();

    // …must be invisible to admin A even addressed directly by primary key.
    const { data: leak, error } = await adminA.from("students").select("id, full_name, email").eq("id", bStudentId!);
    expect(error, error?.message).toBeNull();
    expect(leak ?? [], "ISOLATION BREACH: admin A fetched a B-owned student by id").toEqual([]);
  });
});
