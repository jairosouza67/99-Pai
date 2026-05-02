-- =============================================================
-- Migration: 0011_rls_policies_elderlyprofile
-- Objetivo: RLS policies para public.elderlyprofile
-- Contexto: Loop 03 — modelo cuidador/idoso
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "ElderlyProfile owner or caregiver can read" ON public.elderlyprofile;
CREATE POLICY "ElderlyProfile owner or caregiver can read"
  ON public.elderlyprofile
  FOR SELECT
  USING (public.has_access_to_elderly_profile(id));

-- INSERT: only owner
DROP POLICY IF EXISTS "ElderlyProfile owner can insert" ON public.elderlyprofile;
CREATE POLICY "ElderlyProfile owner can insert"
  ON public.elderlyprofile
  FOR INSERT
  WITH CHECK ("userId" = public.get_legacy_id());

-- UPDATE: only owner
DROP POLICY IF EXISTS "ElderlyProfile owner can update" ON public.elderlyprofile;
CREATE POLICY "ElderlyProfile owner can update"
  ON public.elderlyprofile
  FOR UPDATE
  USING ("userId" = public.get_legacy_id())
  WITH CHECK ("userId" = public.get_legacy_id());

-- DELETE: implicitly blocked (no policy)
