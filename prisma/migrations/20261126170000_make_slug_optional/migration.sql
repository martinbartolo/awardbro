-- Shows are found by their room code. The slug is only kept for shows from before room codes,
-- so their old links still redirect; new shows don't get one (BAR-67).
ALTER TABLE "Session" ALTER COLUMN "slug" DROP NOT NULL;

-- Shows created since room codes stored their code as their slug, only so that a rollback could
-- still open them. There won't be one, so that copy goes.
UPDATE "Session" SET "slug" = NULL WHERE "slug" = "code";
