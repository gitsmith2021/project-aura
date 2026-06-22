import { test, expect } from "@playwright/test";
import { authFile, loadManifest } from "../../fixtures/flow";

// Arch A2 / Step 3 — critical flow: Fee visibility across roles.
// A fee demand seeded for the student must be visible to that student in their
// portal AND to the admin in the demands manager — exercising the student-side
// fee RLS (getMyDemands) and the admin-side read, the money path that gates
// every payment. (Razorpay capture itself is external and not e2e-driven.)

const m = loadManifest();
const DEMAND_TITLE = "E2E Fee Demand";

test("fees: student sees their demand → admin sees the same demand", async ({ browser }) => {
  // ── Student sees their own demand ───────────────────────────────────────
  const studentCtx = await browser.newContext({ storageState: authFile("student") });
  const student = await studentCtx.newPage();
  await student.goto("/student-portal/fees");
  await expect(student.getByText(DEMAND_TITLE)).toBeVisible();
  await studentCtx.close();

  // ── Admin sees it in the demands manager ────────────────────────────────
  const adminCtx = await browser.newContext({ storageState: authFile("admin") });
  const admin = await adminCtx.newPage();
  await admin.goto(`/institutions/${m.instA.slug}/finance/demands`);
  await expect(admin.getByText(DEMAND_TITLE)).toBeVisible();
  await adminCtx.close();
});
