-- =============================================================
-- Migration: 0012_rls_policies_medication
-- Objetivo: RLS policies para public.medication
-- Contexto: Loop 03 — modelo cuidador/idoso
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "Medication owner or caregiver can read" ON public.medication;
CREATE POLICY "Medication owner or caregiver can read"
  ON public.medication
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "Medication owner or caregiver can insert" ON public.medication;
CREATE POLICY "Medication owner or caregiver can insert"
  ON public.medication
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE: owner or linked caregiver
DROP POLICY IF EXISTS "Medication owner or caregiver can update" ON public.medication;
CREATE POLICY "Medication owner or caregiver can update"
  ON public.medication
  FOR UPDATE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"))
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- DELETE: owner or linked caregiver
DROP POLICY IF EXISTS "Medication owner or caregiver can delete" ON public.medication;
CREATE POLICY "Medication owner or caregiver can delete"
  ON public.medication
  FOR DELETE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));
