import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite for droPINion. Helpers and conventions live in e2e/support/.
 *
 *   npm run test:e2e           # headless, all projects
 *   npm run test:e2e:ui        # Playwright UI mode
 *
 * Runs against a `next dev` server (reused when already running) and the
 * seeded dev database (`npm run db:seed`). The suite never reseeds: tests
 * that mutate data sign up throw-away users with unique emails, so it can be
 * run repeatedly.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Specs for screens another engineer is actively polishing (profile, admin,
 * auth). They use role/label selectors only and run after the core project.
 */
const ACCOUNT_UI_SPECS = /(auth|profile|admin)\.spec\.ts$/;
const MOBILE_SPECS = /mobile\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Dev server + one Postgres: a few workers keep app rate limits and the
  // on-demand compiler happy.
  workers: Number(process.env.E2E_WORKERS ?? 3),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-US",
    timezoneId: "Europe/Istanbul",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [ACCOUNT_UI_SPECS, MOBILE_SPECS],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testMatch: MOBILE_SPECS,
      use: { ...devices["Pixel 7"] },
    },
    {
      // Last: depends on the core project so it only starts once it finished.
      name: "account-ui",
      testMatch: ACCOUNT_UI_SPECS,
      dependencies: ["chromium"],
      // Every test here signs up and/or signs in (CPU-heavy password hashing).
      workers: 2,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
