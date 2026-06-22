import { test, expect } from "@playwright/test";
import { authFile, loadManifest, runTag } from "../../fixtures/flow";

// Arch A2 / Step 3 — critical flow: Knowledge Hub publish.
// An admin uploads a resource (external-link mode, no file) → it appears in the
// hub. Exercises the create path (createResource) + the list/search render.

const m = loadManifest();

test("knowledge hub: admin uploads a resource → it appears", async ({ browser }) => {
  const title = `E2E KH Resource ${runTag()}`;

  const ctx = await browser.newContext({ storageState: authFile("admin") });
  const page = await ctx.newPage();
  await page.goto(`/institutions/${m.instA.slug}/knowledge-hub`);

  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await page.getByRole("button", { name: "External link" }).click();
  await page.locator('input[placeholder*="https"]').fill("https://example.com/e2e-resource");
  await page.getByPlaceholder(/Machine Learning/i).fill(title);
  // exact: true — an already-published resource card shows an "Unpublish" toggle,
  // whose name would otherwise match a loose "Publish".
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  // The drawer closes and the hub refreshes with the new resource.
  await expect(page.getByText(title)).toBeVisible();
  await ctx.close();
});
