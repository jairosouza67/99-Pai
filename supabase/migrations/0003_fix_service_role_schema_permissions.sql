-- =============================================================
-- Migration: 0003_fix_service_role_schema_permissions
-- Objetivo: Restaurar permissões do role service_role no schema public
-- Contexto: Backend NestJS usa SUPABASE_SERVICE_ROLE_KEY via supabase-js
-- Sintoma: `permission denied for schema public` em /api/health e login
-- =============================================================

BEGIN;

-- Garante acesso ao schema
GRANT USAGE ON SCHEMA public TO service_role;

-- Garante acesso total às tabelas e sequências existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Garante acesso para objetos criados no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

COMMIT;
