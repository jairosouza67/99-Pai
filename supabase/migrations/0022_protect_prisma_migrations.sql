-- =============================================================
-- Migration: 0022_protect_prisma_migrations
-- Objetivo: Proteger tabela legada _prisma_migrations contra
--           acesso direto via API REST (M2)
-- Contexto: Ralph Loop — Etapa 02
-- =============================================================

-- A tabela _prisma_migrations é legada do Prisma ORM.
-- Se existir, habilitamos RLS e não criamos nenhuma policy,
-- efetivamente bloqueando todo acesso via anon/authenticated.
-- A Service Role continua com acesso total (bypass RLS).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
