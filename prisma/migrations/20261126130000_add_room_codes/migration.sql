-- Room codes: a short code per show that voters type at /join (BAR-63).

-- Added nullable first, so existing shows can be given codes before it becomes required. The
-- unique index allows several NULLs, and makes the check below for a code in use quick.
ALTER TABLE "Session" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- A random 4-character code that no show uses yet. The alphabet leaves out characters that are
-- easy to confuse (0/O, 1/I/L) and U, like Crockford's base 32. The lock makes shows being
-- created at the same moment take turns until each commits, so two can't draw the same code.
CREATE FUNCTION generate_room_code() RETURNS TEXT
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  candidate TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('generate_room_code', 0));
  LOOP
    SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTVWXYZ', 1 + floor(random() * 30)::int, 1), '')
      INTO candidate
      FROM generate_series(1, 4);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "Session" WHERE "code" = candidate);
  END LOOP;
  RETURN candidate;
END $$;

-- One show at a time, so each new code sees the ones given before it
DO $$
DECLARE
  show_id TEXT;
BEGIN
  FOR show_id IN SELECT "id" FROM "Session" LOOP
    UPDATE "Session" SET "code" = generate_room_code() WHERE "id" = show_id;
  END LOOP;
END $$;

-- The default also keeps creating shows working for code that doesn't set a code (an older
-- deployment, or after a rollback)
ALTER TABLE "Session" ALTER COLUMN "code" SET DEFAULT generate_room_code(),
                      ALTER COLUMN "code" SET NOT NULL;
