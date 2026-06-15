import { defineConfig, devices } from "@playwright/test";

// Playwright — e2e + route-crawl smoke tests.
// Reuses an already-running `npm run dev` on :3000 if present, otherwise starts
// one. Authenticated route-crawl + flows use a saved storageState (see
// docs/testing-guide.md) — the committed smoke suite only covers public routes
// so it runs without seeded credentials in CI.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
