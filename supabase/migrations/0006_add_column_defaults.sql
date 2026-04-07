-- Migration: Add DEFAULT values for id, createdAt, updatedAt columns
-- This allows Supabase inserts to omit these fields (previously handled by Prisma ORM).

-- ============================================================
-- "user" table
-- ============================================================
ALTER TABLE "user"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- elderlyprofile
-- ============================================================
ALTER TABLE "elderlyprofile"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- caregiverlink
-- ============================================================
ALTER TABLE "caregiverlink"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- contact
-- ============================================================
ALTER TABLE "contact"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- callhistory
-- ============================================================
ALTER TABLE "callhistory"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- interactionlog
-- ============================================================
ALTER TABLE "interactionlog"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- medication
-- ============================================================
ALTER TABLE "medication"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- medicationhistory
-- ============================================================
ALTER TABLE "medicationhistory"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- pushtoken
-- ============================================================
ALTER TABLE "pushtoken"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- category
-- ============================================================
ALTER TABLE "category"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- offering
-- ============================================================
ALTER TABLE "offering"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- offeringcontact
-- ============================================================
ALTER TABLE "offeringcontact"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- ============================================================
-- servicerequest
-- ============================================================
ALTER TABLE "servicerequest"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- ============================================================
-- agendaevent
-- ============================================================
ALTER TABLE "agendaevent"
  ALTER COLUMN "id"        SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();
