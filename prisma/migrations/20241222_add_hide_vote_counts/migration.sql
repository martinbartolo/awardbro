-- AlterTable: Add hideVoteCounts column with default false
ALTER TABLE "Category" ADD COLUMN "hideVoteCounts" BOOLEAN NOT NULL DEFAULT false;

