-- =============================================================
-- Migration: 0016_rls_policies_medicationhistory
-- Objetivo: RLS policies para public.medicationhistory
-- Contexto: Loop 03 — histórico imutável (apenas SELECT/INSERT)
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "MedicationHistory owner or caregiver can read" ON public.medicationhistory;
CREATE POLICY "MedicationHistory owner or caregiver can read"
  ON public.medicationhistory
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "MedicationHistory owner or caregiver can insert" ON public.medicationhistory;
CREATE POLICY "MedicationHistory owner or caregiver can insert"
  ON public.medicationhistory
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE/DELETE: implicitly blocked (history is immutable)
