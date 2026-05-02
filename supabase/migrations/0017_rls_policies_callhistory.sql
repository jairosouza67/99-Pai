-- =============================================================
-- Migration: 0017_rls_policies_callhistory
-- Objetivo: RLS policies para public.callhistory
-- Contexto: Loop 03 — histórico imutável (apenas SELECT/INSERT)
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "CallHistory owner or caregiver can read" ON public.callhistory;
CREATE POLICY "CallHistory owner or caregiver can read"
  ON public.callhistory
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "CallHistory owner or caregiver can insert" ON public.callhistory;
CREATE POLICY "CallHistory owner or caregiver can insert"
  ON public.callhistory
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE/DELETE: implicitly blocked (history is immutable)
