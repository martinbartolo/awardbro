import { defineConfig, devices } from "@playwright/test";

import { testDatabaseUrl } from "./src/test/integration/database-url";

/**
 * End-to-end tests: whole shows in a real browser, against a production build of the app that
 * uses the database given by TEST_DATABASE_URL (a name ending in `_test`, as for the integration
 * tests). See "End-to-end tests" in docs/development.md.
 */
const databaseUrl = testDatabaseUrl();
const port = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "e2e",
  // Applies the migrations to the test database, as for the integration tests
  globalSetup: "./src/test/integration/global-setup.ts",
  // Every test creates its own show, so they can run side by side
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // `pnpm exec playwright show-report` opens the HTML report
  reporter: [[process.env.CI ? "github" : "list"], ["html", { open: "never" }]],
  timeout: 120_000,
  // Voters' and the big screen's pages poll every 5 seconds
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    // Never test against a server that's already running: it may use another database
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      // These win over .env.local, so the app never touches the dev database
      DATABASE_URL: databaseUrl,
      DATABASE_DIRECT_URL: databaseUrl,
      DATABASE_DRIVER: "pg",
      AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters",
    },
  },
});
