-- =============================================================
-- Migration: 0020_rls_policies_pushtoken
-- Objetivo: RLS policies para public.pushtoken
-- Contexto: Loop 03 — cada user gerencia apenas seus próprios tokens
-- =============================================================

-- SELECT: own tokens only
DROP POLICY IF EXISTS "PushToken owner can read" ON public.pushtoken;
CREATE POLICY "PushToken owner can read"
  ON public.pushtoken
  FOR SELECT
  USING ("userId" = public.get_legacy_id());

-- INSERT: own tokens only
DROP POLICY IF EXISTS "PushToken owner can insert" ON public.pushtoken;
CREATE POLICY "PushToken owner can insert"
  ON public.pushtoken
  FOR INSERT
  WITH CHECK ("userId" = public.get_legacy_id());

-- UPDATE: own tokens only
DROP POLICY IF EXISTS "PushToken owner can update" ON public.pushtoken;
CREATE POLICY "PushToken owner can update"
  ON public.pushtoken
  FOR UPDATE
  USING ("userId" = public.get_legacy_id())
  WITH CHECK ("userId" = public.get_legacy_id());

-- DELETE: own tokens only
DROP POLICY IF EXISTS "PushToken owner can delete" ON public.pushtoken;
CREATE POLICY "PushToken owner can delete"
  ON public.pushtoken
  FOR DELETE
  USING ("userId" = public.get_legacy_id());
