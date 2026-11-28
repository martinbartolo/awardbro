-- CreateEnum
CREATE TYPE "ScreenTheme" AS ENUM ('NIGHT', 'PAPER');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "screenTheme" "ScreenTheme" NOT NULL DEFAULT 'NIGHT';
