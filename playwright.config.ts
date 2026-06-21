import { defineConfig, devices } from "@playwright/test";

// Playwright — e2e + route-crawl tests, split into three projects:
//   • public  — credential-free smoke (public routes). Safe to run in CI today.
//   • setup   — drives /login per seeded role, writes storageState (Arch A2 §1).
//   • authed  — authenticated specs; depend on `setup` for the saved sessions.
// The authed/setup projects need `npm run seed:e2e` (credentials) + a dev server.
// Run everything: `playwright test`; public only: `playwright test --project=public`.
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
    { name: "public", testMatch: /smoke\.spec\.ts$/, use: { ...devices["Desktop Chrome"] } },
    { name: "setup", testMatch: /auth\.setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "authed",
      testMatch: /authed[\\/].*\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
