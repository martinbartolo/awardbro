import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/** Settings shared with the integration tests (`vitest.integration.config.ts`) */
export const shared = {
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  env: {
    SKIP_ENV_VALIDATION: "1",
    AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
  },
};

export default defineConfig({
  resolve: shared.resolve,
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests need a database: `pnpm test:integration`
    exclude: ["src/**/*.integration.test.ts"],
    env: shared.env,
  },
});
