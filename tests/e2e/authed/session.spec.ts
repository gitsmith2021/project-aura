import { test, expect } from "@playwright/test";
import path from "path";
import { USERS, ROLE_FIXTURES } from "../fixtures/seed-data.mjs";

// Arch A2 / Step 1 verification — proves each role's saved session is valid and
// lands on the expected surface (not bounced to /login). This is the smoke test
// for the auth fixtures themselves; the full authenticated route-crawl is Step 2.

const authFile = (key: string) => path.join(process.cwd(), "tests", "e2e", ".auth", `${key}.json`);

for (const u of USERS.filter((x) => ROLE_FIXTURES.includes(x.key))) {
  test.describe(`session · ${u.key} (${u.role})`, () => {
    test.use({ storageState: authFile(u.key) });

    test(`reaches ${u.landing} without redirect to /login`, async ({ page }) => {
      const response = await page.goto(u.landing, { waitUntil: "domcontentloaded" });
      expect(response, `no response for ${u.landing}`).not.toBeNull();
      expect(response!.status(), `HTTP status at ${u.landing}`).toBeLessThan(400);
      expect(new URL(page.url()).pathname, `${u.role} should stay authenticated`).not.toMatch(/^\/login/);
    });
  });
}
