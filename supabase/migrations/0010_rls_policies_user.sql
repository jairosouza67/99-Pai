-- =============================================================
-- Migration: 0010_rls_policies_user
-- Objetivo: RLS policies para public."user"
-- Contexto: Loop 03 — modelo cuidador/idoso
-- =============================================================

-- SELECT: user can read own data + caregiver can read linked elderly user data
DROP POLICY IF EXISTS "Users can read own data" ON public."user";
CREATE POLICY "Users can read own data"
  ON public."user"
  FOR SELECT
  USING (
    id = public.get_legacy_id()
    OR id IN (
      SELECT ep."userId"
      FROM public.caregiverlink cl
      JOIN public.elderlyprofile ep ON ep.id = cl."elderlyProfileId"
      WHERE cl."caregiverUserId" = public.get_legacy_id()
    )
  );

-- UPDATE: user can update own data only
DROP POLICY IF EXISTS "Users can update own data" ON public."user";
CREATE POLICY "Users can update own data"
  ON public."user"
  FOR UPDATE
  USING (id = public.get_legacy_id())
  WITH CHECK (id = public.get_legacy_id());

-- DELETE: implicitly blocked (no policy)
