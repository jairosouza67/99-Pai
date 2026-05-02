-- =============================================================
-- Migration: 0009_rls_access_helpers
-- Objetivo: Criar funções auxiliares reutilizáveis para RLS
--           no modelo de acesso cuidador/idoso
-- Contexto: Loop 03 da migração NestJS → Supabase Nativo
-- =============================================================

-- ---------------------------------------------------------------
-- Function: has_access_to_elderly_profile(profile_id UUID)
-- Retorna TRUE se o auth.uid() atual é:
--   1. O próprio idoso (owner do elderlyprofile via user_id_mapping)
--   2. Um cuidador vinculado ao elderlyprofile (via caregiverlink)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_access_to_elderly_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check 1: Is the elderly owner?
  IF EXISTS (
    SELECT 1
    FROM public.elderlyprofile ep
    JOIN public.user_id_mapping m ON m.legacy_id = ep."userId"
    WHERE ep.id = profile_id
      AND m.auth_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check 2: Is a linked caregiver?
  IF EXISTS (
    SELECT 1
    FROM public.caregiverlink cl
    JOIN public.user_id_mapping m ON m.legacy_id = cl."caregiverUserId"
    WHERE cl."elderlyProfileId" = profile_id
      AND m.auth_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------
-- Function: get_legacy_id()
-- Retorna o legacy_id (UUID original em public."user")
-- correspondente ao auth.uid() atual.
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_legacy_id()
RETURNS UUID AS $$
  SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
