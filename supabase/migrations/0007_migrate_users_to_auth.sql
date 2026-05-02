-- =============================================================
-- Migration: 0007_migrate_users_to_auth
-- Objetivo: Migrar utilizadores de public."user" para auth.users
--           Preserva bcrypt hashes (cost=12) — compatível com
--           Supabase Auth encrypted_password (GoTrue usa bcrypt)
-- Contexto: Loop 01 da migração NestJS → Supabase Nativo
-- =============================================================

-- -------------------------------------------------------------
-- Step 1: Inserir utilizadores em auth.users
-- -------------------------------------------------------------
-- Cada utilizador da tabela legacy public."user" recebe um novo
-- UUID em auth.users. O hash bcrypt da coluna "password" é
-- copiado diretamente para "encrypted_password" (compatível).
-- ON CONFLICT garante que emails duplicados não causam erro.
-- -------------------------------------------------------------

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  confirmation_token,
  confirmed_at
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  u.email,
  u.password,                          -- bcrypt hash (cost=12) → compatível!
  now(),                                -- marca email como confirmado
  u."createdAt",
  u."updatedAt",
  jsonb_build_object(
    'name',      u.name,
    'nickname',  u.nickname,
    'role',      u.role,
    'legacy_id', u.id::text             -- preserva o UUID original para mapeamento
  ),
  '',                                    -- confirmation_token vazio (já confirmado)
  now()                                  -- confirmed_at = agora
FROM public."user" u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.email = u.email
)
ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------------
-- Step 2: Inserir identidades em auth.identities
-- -------------------------------------------------------------
-- Supabase Auth exige uma entrada em auth.identities para cada
-- utilizador, caso contrário o login email/password NÃO funciona.
-- O provider "email" é o provider padrão para autenticação nativa.
-- -------------------------------------------------------------

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  au.id,
  jsonb_build_object(
    'sub',   au.id::text,
    'email', au.email
  ),
  'email',
  au.id::text,
  now(),
  au.created_at,
  au.updated_at
FROM auth.users au
JOIN public."user" u ON au.email = u.email
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities ai
  WHERE ai.user_id = au.id AND ai.provider = 'email'
);