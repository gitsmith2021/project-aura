import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { ROLE_FIXTURES } from "../fixtures/seed-data.mjs";
import { listRouteTemplates, classifyRoute, resolvePath } from "../fixtures/route-map.mjs";
import type { SeedManifest } from "../fixtures/route-map.mjs";

// Arch A2 / Step 2 — authenticated route-crawl. For every App-Router page, hit
// it as each role the middleware permits and assert: HTTP < 400, no bounce to
// /login (session stayed valid), and zero uncaught client `pageerror`. Detail
// routes whose params aren't seedable are reported as skipped, not failed.
//
// Prereq: `npm run seed:e2e` (writes .auth/seed-manifest.json) + the `setup`
// project (writes per-role storageState). Run: `playwright test --project=authed`.

const AUTH_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");
const authFile = (key: string) => path.join(AUTH_DIR, `${key}.json`);
const manifestPath = path.join(AUTH_DIR, "seed-manifest.json");

const manifest: SeedManifest | null = fs.existsSync(manifestPath)
  ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SeedManifest)
  : null;

const templates = listRouteTemplates();

for (const roleKey of ROLE_FIXTURES) {
  const targets = templates.filter((t) => classifyRoute(t).roles.includes(roleKey));
  if (targets.length === 0) continue;

  test.describe(`route-crawl · ${roleKey}`, () => {
    test.use({ storageState: authFile(roleKey) });

    for (const t of targets) {
      const resolved = manifest ? resolvePath(t, manifest) : { skip: "seed manifest missing — run npm run seed:e2e" };

      if ("skip" in resolved) {
        // eslint-disable-next-line no-empty-pattern
        test.skip(`${t} — ${resolved.skip}`, () => {});
        continue;
      }

      const target = resolved.path;
      test(`${t}  →  ${target}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));

        const res = await page.goto(target, { waitUntil: "domcontentloaded" });
        // Give client hydration / effects a beat to surface any runtime error.
        await page.waitForLoadState("load").catch(() => {});

        expect(res, `no response for ${target}`).not.toBeNull();
        expect(res!.status(), `HTTP status at ${target}`).toBeLessThan(400);
        expect(new URL(page.url()).pathname, `${roleKey} bounced to /login from ${target}`).not.toBe("/login");
        expect(errors, `client pageerror(s) at ${target}`).toEqual([]);
      });
    }
  });
}
