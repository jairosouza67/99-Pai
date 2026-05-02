-- =============================================================
-- Migration: 0014_rls_policies_agendaevent
-- Objetivo: RLS policies para public.agendaevent
-- Contexto: Loop 03 — modelo cuidador/idoso
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "AgendaEvent owner or caregiver can read" ON public.agendaevent;
CREATE POLICY "AgendaEvent owner or caregiver can read"
  ON public.agendaevent
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "AgendaEvent owner or caregiver can insert" ON public.agendaevent;
CREATE POLICY "AgendaEvent owner or caregiver can insert"
  ON public.agendaevent
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE: owner or linked caregiver
DROP POLICY IF EXISTS "AgendaEvent owner or caregiver can update" ON public.agendaevent;
CREATE POLICY "AgendaEvent owner or caregiver can update"
  ON public.agendaevent
  FOR UPDATE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"))
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- DELETE: owner or linked caregiver
DROP POLICY IF EXISTS "AgendaEvent owner or caregiver can delete" ON public.agendaevent;
CREATE POLICY "AgendaEvent owner or caregiver can delete"
  ON public.agendaevent
  FOR DELETE
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));
