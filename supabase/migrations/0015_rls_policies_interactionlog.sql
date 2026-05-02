-- =============================================================
-- Migration: 0015_rls_policies_interactionlog
-- Objetivo: RLS policies para public.interactionlog
-- Contexto: Loop 03 — logs devem ser imutáveis (apenas SELECT/INSERT)
-- =============================================================

-- SELECT: owner or linked caregiver
DROP POLICY IF EXISTS "InteractionLog owner or caregiver can read" ON public.interactionlog;
CREATE POLICY "InteractionLog owner or caregiver can read"
  ON public.interactionlog
  FOR SELECT
  USING (public.has_access_to_elderly_profile("elderlyProfileId"));

-- INSERT: owner or linked caregiver
DROP POLICY IF EXISTS "InteractionLog owner or caregiver can insert" ON public.interactionlog;
CREATE POLICY "InteractionLog owner or caregiver can insert"
  ON public.interactionlog
  FOR INSERT
  WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

-- UPDATE/DELETE: implicitly blocked (logs are immutable)
