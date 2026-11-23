-- Catches the migration history up with changes that were applied with `db push`:
-- ranking categories, winner-only presentation, and aggregate source categories.
--
-- Written to be idempotent: production and other existing databases already have
-- these changes, so every statement is a no-op there.

-- AlterEnum
ALTER TYPE "CategoryType" ADD VALUE IF NOT EXISTS 'RANKING';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "rankingTop" INTEGER,
ADD COLUMN IF NOT EXISTS "winnerOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "rank" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "_AggregateToSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AggregateToSource_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_AggregateToSource_B_index" ON "_AggregateToSource"("B");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_AggregateToSource_A_fkey') THEN
    ALTER TABLE "_AggregateToSource" ADD CONSTRAINT "_AggregateToSource_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_AggregateToSource_B_fkey') THEN
    ALTER TABLE "_AggregateToSource" ADD CONSTRAINT "_AggregateToSource_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
