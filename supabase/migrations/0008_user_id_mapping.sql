-- =============================================================
-- Migration: 0008_user_id_mapping
-- Objetivo: Criar tabela de mapeamento legacy_id → auth_id
--           para permitir referência cruzada entre o UUID
--           original (public."user".id) e o novo UUID
--           (auth.users.id) durante e após a migração.
-- Contexto: Loop 01 da migração NestJS → Supabase Nativo
-- =============================================================

-- -------------------------------------------------------------
-- Step 1: Criar tabela user_id_mapping
-- -------------------------------------------------------------
-- legacy_id = UUID original da tabela public."user"
-- auth_id   = UUID novo em auth.users (gerado na migration 0007)
-- -------------------------------------------------------------

CREATE TABLE public.user_id_mapping (
  legacy_id  uuid        PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  auth_id    uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  migrated_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------------
-- Step 2: Habilitar RLS
-- -------------------------------------------------------------
-- A tabela de mapeamento contém dados de identificação
-- (relação entre IDs), portanto precisa de RLS.
-- -------------------------------------------------------------

ALTER TABLE public.user_id_mapping ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- Step 3: Criar policy — Users can read own mapping
-- -------------------------------------------------------------
-- Um utilizador autenticado pode ler apenas o seu próprio
-- mapeamento (onde auth_id = auth.uid()).
-- -------------------------------------------------------------

CREATE POLICY "Users can read own mapping"
  ON public.user_id_mapping
  FOR SELECT
  USING (auth_id = auth.uid());

-- -------------------------------------------------------------
-- Step 4: Popular tabela com mapeamento via email
-- -------------------------------------------------------------
-- O JOIN entre public."user" e auth.users por email permite
-- encontrar o par (legacy_id, auth_id) para cada utilizador
-- migrado na migration 0007.
-- -------------------------------------------------------------

INSERT INTO public.user_id_mapping (legacy_id, auth_id)
SELECT
  u.id      AS legacy_id,
  au.id     AS auth_id
FROM public."user" u
JOIN auth.users au ON au.email = u.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_id_mapping m WHERE m.legacy_id = u.id
);