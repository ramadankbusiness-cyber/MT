-- Align existing PostgreSQL migration history with prisma/schema.prisma (forward-only, data-preserving).
-- Resolves schema drift: Committee fields/constraints, Event location/zone fields + FK,
-- AttendanceSession geo fields + zoneId nullability/FK behavior.
-- Does not modify historical migrations. Non-destructive.

-- -----------------------------------------------------------------------------
-- Committee: add key, nameAr, descriptionEn, descriptionAr, order + unique key
-- -----------------------------------------------------------------------------
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "nameAr" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "descriptionEn" VARCHAR(2000);
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "descriptionAr" VARCHAR(2000);
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill key for existing rows (stable, unique). Prefer a slug from name; fallback to id-based key.
WITH normalized AS (
  SELECT
    "id",
    NULLIF(regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g'), '') AS slug
  FROM "Committee"
), ranked AS (
  SELECT
    "id",
    COALESCE(slug, 'committee') AS base_key,
    row_number() OVER (PARTITION BY COALESCE(slug, 'committee') ORDER BY "id") AS rn
  FROM normalized
)
UPDATE "Committee" c
SET "key" = CASE WHEN r.rn = 1 THEN r.base_key ELSE r.base_key || '-' || r.rn::text END
FROM ranked r
WHERE c."id" = r."id" AND (c."key" IS NULL OR btrim(c."key") = '');

-- Ensure nameAr is populated for existing rows before enforcing NOT NULL.
UPDATE "Committee"
SET "nameAr" = "name"
WHERE "nameAr" IS NULL OR btrim("nameAr") = '';

ALTER TABLE "Committee" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "Committee" ALTER COLUMN "nameAr" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Committee_key_key" ON "Committee"("key");

-- -----------------------------------------------------------------------------
-- Event: add place/geo fields, zoneId, and Zone FK (ON DELETE SET NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "placeName" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "centerLat" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "centerLng" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "radiusMeters" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "locationAccuracy" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'Event_zoneId_fkey'
      AND t.relname = 'Event'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE "Event"
      ADD CONSTRAINT "Event_zoneId_fkey"
      FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- AttendanceSession: add geo fields; make zoneId nullable; FK ON DELETE SET NULL
-- -----------------------------------------------------------------------------
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "placeName" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "centerLat" DOUBLE PRECISION;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "centerLng" DOUBLE PRECISION;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "radiusMeters" INTEGER;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "locationAccuracy" DOUBLE PRECISION;

-- Align zoneId nullability and referential action with schema.prisma.
ALTER TABLE "AttendanceSession" DROP CONSTRAINT IF EXISTS "AttendanceSession_zoneId_fkey";
ALTER TABLE "AttendanceSession" ALTER COLUMN "zoneId" DROP NOT NULL;
ALTER TABLE "AttendanceSession"
  ADD CONSTRAINT "AttendanceSession_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
