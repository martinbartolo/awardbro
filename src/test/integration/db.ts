import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "~/generated/prisma/client";

import { testDatabaseUrl } from "./database-url";

/**
 * The database client the API uses during integration tests, passed in through the tRPC context
 * (see visitor.ts). The app's own client uses Neon's serverless driver, which can't reach a plain
 * Postgres server such as the one in CI, so the tests connect with the standard `pg` driver. The
 * queries are the same.
 */
export const testDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  // The same log levels as the app's client, so the two have the same type
  log: ["error", "warn"],
});
