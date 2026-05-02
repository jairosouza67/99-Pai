-- =============================================================
-- Migration: 0013_rls_policies_contact
-- Objetivo: RLS policies para public.contact
-- Contexto: Loop 03 — modelo cuidador/idoso
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "Contact owner or caregiver can read" ON public.contact;
CREATE POLICY "Contact owner or caregiver can read"
  ON public.contact
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "Contact owner or caregiver can insert" ON public.contact;
CREATE POLICY "Contact owner or caregiver can insert"
  ON public.contact
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE: owner or linked caregiver
DROP POLICY IF EXISTS "Contact owner or caregiver can update" ON public.contact;
CREATE POLICY "Contact owner or caregiver can update"
  ON public.contact
  FOR UPDATE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"))
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- DELETE: owner or linked caregiver
DROP POLICY IF EXISTS "Contact owner or caregiver can delete" ON public.contact;
CREATE POLICY "Contact owner or caregiver can delete"
  ON public.contact
  FOR DELETE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));
