import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "~/generated/prisma/client";

const createPrismaClient = () => {
  const isProduction = process.env.NODE_ENV === "production";

  const connectionString = isProduction
    ? process.env.DATABASE_URL // PgBouncer for production
    : process.env.DATABASE_DIRECT_URL; // Direct for localhost

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    // Serverless-optimized settings
    max: 1, // Single connection per instance
    idleTimeoutMillis: 60000, // Keep alive for 60s (reuse across requests)
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
