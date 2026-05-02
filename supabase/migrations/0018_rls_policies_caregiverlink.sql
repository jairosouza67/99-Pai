-- =============================================================
-- Migration: 0018_rls_policies_caregiverlink
-- Objetivo: RLS policies para public.caregiverlink
-- Contexto: Loop 03 — gerenciado via Edge Function (Loop 05)
--           Apenas leitura direta; mutações via SERVICE_ROLE_KEY
-- =============================================================

-- SELECT for caregiver: can read own links
DROP POLICY IF EXISTS "Caregiver can read own links" ON public.caregiverlink;
CREATE POLICY "Caregiver can read own links"
  ON public.caregiverlink
  FOR SELECT
  USING ("caregiverUserId" = public.get_legacy_id());

-- SELECT for elderly owner: can read links for their profile
DROP POLICY IF EXISTS "Elderly owner can read profile links" ON public.caregiverlink;
CREATE POLICY "Elderly owner can read profile links"
  ON public.caregiverlink
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.elderlyprofile ep
      JOIN public.user_id_mapping m ON m.legacy_id = ep."userId"
      WHERE ep.id = "elderlyProfileId"
        AND m.auth_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: implicitly blocked (managed via Edge Function)
