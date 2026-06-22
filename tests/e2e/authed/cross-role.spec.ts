import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import type { SeedManifest } from "../fixtures/route-map.mjs";

// Arch A2 / Step 4 — cross-role negative auth. The positive crawl (Step 2) proved
// each route renders for its OWNER role; this proves the WRONG role is denied —
// bounced out of the protected area, never served its content (a 200 inside the
// area is a failure, even if RLS would have emptied the data).
//
// Denial in this app is a middleware redirect to the offending role's own home,
// so the assertion is: after navigating, the final path is NOT inside the
// protected area's prefix.
//
// Prereq: `npm run seed:e2e` + the `setup` project. Run: `playwright test --project=authed`.

const AUTH_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");
const authFile = (key: string) => path.join(AUTH_DIR, `${key}.json`);
const manifestPath = path.join(AUTH_DIR, "seed-manifest.json");
const manifest: SeedManifest | null = fs.existsSync(manifestPath)
  ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SeedManifest)
  : null;

/** finalPath sits inside the protected area? (exact prefix or a sub-path) */
const inArea = (finalPath: string, prefix: string) =>
  finalPath === prefix || finalPath.startsWith(prefix.replace(/\/$/, "") + "/");

type Target = {
  name: string;
  prefix: string;
  path: (m: SeedManifest) => string | null;
  deny: string[]; // fixture role keys that must be bounced
};

// Representative protected route per access area + the roles middleware must deny.
// `super` is omitted as a victim (it may reach everything). `admin`=INST_ADMIN,
// `hod`=DEPARTMENT_HEAD share the admin tier; both are denied from the portals
// and the super-admin area.
const TARGETS: Target[] = [
  { name: "super-admin area (/admin)", prefix: "/admin", path: () => "/admin", deny: ["admin", "hod", "staff", "student", "parent"] },
  // The institution admin app — tested via BOTH the slug URL (what browsers use;
  // middleware rewrites slug→uuid) and the raw uuid, since the fence must hold for both.
  { name: "institution admin · slug", prefix: "/institutions", path: (m) => `/institutions/${m.instA.slug}`, deny: ["staff", "student", "parent"] },
  { name: "institution admin · uuid", prefix: "/institutions", path: (m) => `/institutions/${m.instA.id}`, deny: ["staff", "student", "parent"] },
  { name: "staff portal", prefix: "/staff-portal", path: () => "/staff-portal", deny: ["student", "parent", "admin", "hod"] },
  { name: "student portal", prefix: "/student-portal", path: () => "/student-portal", deny: ["staff", "parent", "admin", "hod"] },
  { name: "parent portal", prefix: "/parent-portal", path: () => "/parent-portal", deny: ["student", "staff", "admin", "hod"] },
  { name: "staff admin-view", prefix: "/staff-portal/view", path: (m) => (m.staffAId ? `/staff-portal/view/${m.staffAId}` : null), deny: ["student", "parent"] },
  { name: "student admin-view", prefix: "/student-portal/view", path: (m) => (m.studentAId ? `/student-portal/view/${m.studentAId}` : null), deny: ["staff", "parent"] },
];

const DENY_ROLES = ["admin", "hod", "staff", "student", "parent"];

for (const role of DENY_ROLES) {
  const targets = TARGETS.filter((t) => t.deny.includes(role));
  if (targets.length === 0) continue;

  test.describe(`cross-role · ${role} must be denied`, () => {
    test.use({ storageState: authFile(role) });

    for (const t of targets) {
      test(`${role} ✗ ${t.name}`, async ({ page }) => {
        if (!manifest) test.skip(true, "seed manifest missing — run npm run seed:e2e");
        const target = t.path(manifest!);
        test.skip(!target, `no seeded id for ${t.name}`);

        await page.goto(target!, { waitUntil: "domcontentloaded" });
        const finalPath = new URL(page.url()).pathname;

        expect(
          inArea(finalPath, t.prefix),
          `${role} reached protected ${t.prefix} (landed at ${finalPath}) — should have been bounced`,
        ).toBe(false);
        expect(finalPath, `${role} bounced all the way to /login from ${t.name}`).not.toBe("/login");
      });
    }
  });
}
