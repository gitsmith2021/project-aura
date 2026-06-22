import { test, expect } from "@playwright/test";
import { authFile, loadManifest, runTag } from "../../fixtures/flow";

// Arch A2 / Step 3 — critical flow: Leave application & approval.
// Staff applies for leave → admin reviews and approves → staff sees it approved.
// Exercises the real form, the SECURITY DEFINER review_leave_request path, RLS
// (admin reads the institution's requests; staff reads only their own), and the
// status round-trip across two roles.

const m = loadManifest();

test("leave: staff applies → admin approves → staff sees approved", async ({ browser }) => {
  const reason = `E2E leave flow ${runTag()} — automated critical-flow check`;

  // ── 1. Staff applies for leave ──────────────────────────────────────────
  const staffCtx = await browser.newContext({ storageState: authFile("staff") });
  const staff = await staffCtx.newPage();
  await staff.goto("/staff-portal/leave");
  await staff.getByRole("button", { name: "Apply for Leave" }).click();

  await staff.locator("#leave-form select").selectOption("casual");
  const dates = staff.locator('#leave-form input[type="date"]');
  await dates.nth(0).fill("2026-09-01");
  await dates.nth(1).fill("2026-09-02");
  await staff.locator("#leave-form textarea").fill(reason);
  await staff.getByRole("button", { name: "Submit Request" }).click();

  // The new request appears in the staff's history as pending.
  await expect(staff.locator("tr", { hasText: reason })).toContainText("PENDING");
  await staffCtx.close();

  // ── 2. Admin approves it ────────────────────────────────────────────────
  const adminCtx = await browser.newContext({ storageState: authFile("admin") });
  const admin = await adminCtx.newPage();
  await admin.goto(`/institutions/${m.instA.slug}/leave`);

  const row = admin.locator("tr", { hasText: reason });
  await expect(row).toBeVisible();
  await expect(row).toContainText("PENDING");
  await row.getByRole("button", { name: "Review" }).click();
  await admin.getByRole("button", { name: "Approve" }).click();

  // Same row flips to approved in the admin view.
  await expect(admin.locator("tr", { hasText: reason })).toContainText("APPROVED");
  await adminCtx.close();

  // ── 3. Staff sees the approval ──────────────────────────────────────────
  const staffCtx2 = await browser.newContext({ storageState: authFile("staff") });
  const staff2 = await staffCtx2.newPage();
  await staff2.goto("/staff-portal/leave");
  await expect(staff2.locator("tr", { hasText: reason })).toContainText("APPROVED");
  await staffCtx2.close();
});
