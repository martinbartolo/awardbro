-- Restores a step that was originally applied with `db push` and never recorded.
-- 20241222_add_category_type reads and drops this column, so a fresh database
-- needs it to exist.
--
-- Only runs on databases that predate category types. On production and other
-- existing databases ("type" already exists) this is a no-op, so `migrate deploy`
-- can record it safely.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Category' AND column_name = 'type'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isAggregate" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
