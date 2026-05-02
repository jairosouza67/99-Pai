-- =============================================================
-- Migration: 0023_create_rate_limits
-- Objetivo: Criar tabela para rate-limiting nas Edge Functions
-- Contexto: Ralph Loop — Etapa 04
-- =============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  count         INTEGER NOT NULL DEFAULT 1,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS: a Service Role bypassa; anon/authenticated
-- não precisam de acesso direto (as Edge Functions usam service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total apenas para service_role
CREATE POLICY "Service role full access on rate_limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
