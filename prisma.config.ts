import { loadEnvConfig } from "@next/env";

// Load .env files the same way Next.js does
loadEnvConfig(process.cwd());

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI uses this for migrations - must be direct connection (not PgBouncer)
    // Your runtime app uses the adapter in db.ts with DATABASE_URL instead
    url: process.env.DATABASE_DIRECT_URL ?? "",
  },
});
