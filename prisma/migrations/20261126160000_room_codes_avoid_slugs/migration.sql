-- Shows are now found by their room code, and links from before room codes by their slug. So
-- that a URL always means one show, no code may read like another show's slug. New shows store
-- their code as their slug, so links keep working after a rollback to code that finds shows by
-- slug.

-- A new code must not equal an existing slug either. After 1000 tries (the codes are close to
-- running out) it gives up instead of holding the lock forever.
CREATE OR REPLACE FUNCTION generate_room_code() RETURNS TEXT
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  candidate TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('generate_room_code', 0));
  FOR attempt IN 1..1000 LOOP
    SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTVWXYZ', 1 + floor(random() * 30)::int, 1), '')
      INTO candidate
      FROM generate_series(1, 4);
    IF NOT EXISTS (
      SELECT 1 FROM "Session" WHERE "code" = candidate OR "slug" = lower(candidate)
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'No unused room code found';
END $$;

-- The codes given to existing shows didn't avoid slugs, so a code could read like another show's
-- slug (a slug of four digits reads the same in either case). Those shows get a new code.
DO $$
DECLARE
  show_id TEXT;
BEGIN
  FOR show_id IN
    SELECT a."id" FROM "Session" a
    JOIN "Session" b ON b."id" <> a."id" AND lower(b."slug") = lower(a."code")
  LOOP
    UPDATE "Session" SET "code" = generate_room_code() WHERE "id" = show_id;
  END LOOP;
END $$;
