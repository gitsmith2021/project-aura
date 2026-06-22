import { test, expect } from "@playwright/test";
import { authFile, loadManifest, runTag } from "../../fixtures/flow";

// Arch A2 / Step 3 — critical flow: Admissions intake.
// A prospective applicant submits the PUBLIC application form (unauthenticated)
// → the admin sees the new applicant in the admissions pipeline. Exercises the
// public submit path + the admin-side read across the tenant boundary.

const m = loadManifest();

test("admissions: public applicant submits → admin sees them", async ({ browser }) => {
  const tag = runTag();
  const name = `E2E Applicant ${tag}`;
  const email = `e2e-applicant-${tag}@e2e.aura.test`;

  // ── 1. Public applicant submits (no session) ────────────────────────────
  const pubCtx = await browser.newContext();
  const pub = await pubCtx.newPage();
  await pub.goto(`/admissions/${m.instA.slug}`);
  await pub.locator("input").first().fill(name);          // Full name (first field)
  await pub.locator('input[type="email"]').fill(email);   // Email
  // Program defaults to UG — enough to pass the form's validity gate.
  await pub.getByRole("button", { name: "Submit application" }).click();
  await expect(pub.getByText("Application submitted")).toBeVisible();
  await pubCtx.close();

  // ── 2. Admin sees the applicant in the pipeline ─────────────────────────
  const adminCtx = await browser.newContext({ storageState: authFile("admin") });
  const admin = await adminCtx.newPage();
  await admin.goto(`/institutions/${m.instA.slug}/admissions`);
  await expect(admin.getByText(name)).toBeVisible();
  await adminCtx.close();
});
