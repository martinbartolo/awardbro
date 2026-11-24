import { execSync } from "node:child_process";

import { testDatabaseUrl } from "./database-url";

/** Brings the test database up to date with the migrations, once per run */
export default function setup() {
  const url = testDatabaseUrl();
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    // prisma.config.ts reads DATABASE_DIRECT_URL. Values set here win over .env.local.
    env: { ...process.env, DATABASE_URL: url, DATABASE_DIRECT_URL: url },
  });
}
