-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('NORMAL', 'IMAGE', 'AGGREGATE');

-- AlterTable: Add type column with default NORMAL
ALTER TABLE "Category" ADD COLUMN "type" "CategoryType" NOT NULL DEFAULT 'NORMAL';

-- Migrate data: Set type to AGGREGATE where isAggregate is true
UPDATE "Category" SET "type" = 'AGGREGATE' WHERE "isAggregate" = true;

-- AlterTable: Drop the isAggregate column
ALTER TABLE "Category" DROP COLUMN "isAggregate";

