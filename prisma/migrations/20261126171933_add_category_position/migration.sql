-- Each category's place in its show's running order (BAR-66)

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Existing shows keep the order they have now: creation order, numbered from 0 in each show
UPDATE "Category" AS c
SET "position" = ordered.position
FROM (
  SELECT "id",
    ROW_NUMBER() OVER (PARTITION BY "sessionId" ORDER BY "createdAt", "id") - 1 AS position
  FROM "Category"
) AS ordered
WHERE c."id" = ordered."id";

-- The new index covers lookups by show too, so it replaces the old one
-- DropIndex
DROP INDEX "Category_sessionId_idx";

-- CreateIndex
CREATE INDEX "Category_sessionId_position_idx" ON "Category"("sessionId", "position");
