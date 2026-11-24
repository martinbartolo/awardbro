import { defineConfig } from "vitest/config";

import { shared } from "./vitest.config";

/**
 * Integration tests: the tRPC router against a real Postgres database, given by TEST_DATABASE_URL.
 * Every test starts from empty tables, so the files run one at a time. See docs/development.md.
 */
export default defineConfig({
  resolve: shared.resolve,
  test: {
    include: ["src/**/*.integration.test.ts"],
    env: shared.env,
    globalSetup: ["src/test/integration/global-setup.ts"],
    setupFiles: ["src/test/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
