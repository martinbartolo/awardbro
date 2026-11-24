import { afterAll, beforeAll, beforeEach } from "vitest";

import { testDb } from "./db";

/** Every table the migrations create, so new models are emptied too */
let tables: string;

beforeAll(async () => {
  const rows = await testDb.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  tables = rows.map(row => `"${row.tablename}"`).join(", ");
});

beforeEach(async () => {
  // Every test starts from empty tables
  await testDb.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
});

afterAll(async () => {
  await testDb.$disconnect();
});
