import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "~/env";
import { PrismaClient } from "~/generated/prisma/client";

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  // Neon's serverless driver can't reach a plain Postgres server, such as the one the end-to-end
  // tests run the app against, so they use the standard `pg` driver. The queries are the same.
  const adapter =
    env.DATABASE_DRIVER === "pg"
      ? new PrismaPg({ connectionString })
      : new PrismaNeon({ connectionString });

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
