-- =============================================================
-- Migration: 0004_harden_link_code_security
-- Objetivo: Endurecer fluxo de linkCode (expiração, lock e tentativas)
-- =============================================================

BEGIN;

ALTER TABLE public.elderlyprofile
  ADD COLUMN IF NOT EXISTS "linkCodeCreatedAt" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "linkCodeFailedAttempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "linkCodeLockedUntil" timestamptz NULL;

UPDATE public.elderlyprofile
SET
  "linkCodeCreatedAt" = COALESCE("linkCodeCreatedAt", now()),
  "linkCodeFailedAttempts" = COALESCE("linkCodeFailedAttempts", 0)
WHERE
  "linkCodeCreatedAt" IS NULL
  OR "linkCodeFailedAttempts" IS NULL;

COMMIT;