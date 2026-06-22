import { test, expect } from "@playwright/test";
import { authFile, loadManifest, runTag } from "../../fixtures/flow";

// Arch A2 / Step 3 — critical flow: Online exam authoring.
// An admin creates a new online exam → it appears in the exam manager. Exercises
// the createExam mutation + the manager list render (the answer-key-safe path
// students take is covered separately by the seeded session + route-crawl).

const m = loadManifest();

test("online exam: admin creates an exam → it appears in the manager", async ({ browser }) => {
  const title = `E2E Exam ${runTag()}`;

  const ctx = await browser.newContext({ storageState: authFile("admin") });
  const page = await ctx.newPage();
  await page.goto(`/institutions/${m.instA.slug}/online-exams`);

  await page.getByRole("button", { name: "New Exam" }).click();
  await page.getByPlaceholder(/Data Structures/i).fill(title);
  await page.getByRole("button", { name: "Create Exam" }).click();

  await expect(page.getByText(title)).toBeVisible();
  await ctx.close();
});
