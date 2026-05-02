-- =============================================================
-- Migration: 0021_auto_map_new_users
-- Objetivo: Criar automaticamente entradas em public.user e
--           user_id_mapping quando um novo utilizador faz signup
--           via supabase.auth.signUp().
-- Contexto: Pos-migracao — novos utilizadores nao possuem
--           legacy_id; usamos auth.uid() como ID em ambas tabelas.
-- =============================================================

-- ---------------------------------------------------------------
-- Step 1: Trigger function — cria user + mapping apos signup
-- ---------------------------------------------------------------
-- Para novos utilizadores, legacy_id = auth_id (mesmo UUID),
-- garantindo compatibilidade com RLS policies e Edge Functions
-- que dependem de get_legacy_id().
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar entrada em public.user com o mesmo ID do auth.users
  INSERT INTO public."user" (id, email, name, role, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'elderly'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar mapeamento de identidade (legacy_id = auth_id para novos users)
  INSERT INTO public.user_id_mapping (legacy_id, auth_id)
  VALUES (NEW.id, NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- Step 2: Criar trigger em auth.users
-- ---------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
