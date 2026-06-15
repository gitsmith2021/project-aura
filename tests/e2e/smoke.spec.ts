import { test, expect } from "@playwright/test";

// Public-route smoke test — the seed of the Arch A2 route-crawl. Asserts each
// public page loads (HTTP < 400) and throws no uncaught runtime error
// (`pageerror`), which is what catches null/undefined-data crashes cheaply.
// Authenticated routes (/institutions/[id]/..., /staff-portal, /student-portal)
// are added once a seeded storageState login fixture lands — see
// docs/testing-guide.md.
const PUBLIC_ROUTES = ["/login", "/privacy-policy"];

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} loads without an uncaught error`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });

    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.status(), `HTTP status for ${route}`).toBeLessThan(400);
    expect(pageErrors, `uncaught runtime errors on ${route}`).toEqual([]);
  });
}

test("login page renders the credentials form", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
