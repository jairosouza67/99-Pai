-- =============================================================
-- Migration: 0002_enable_rls
-- Objetivo: Habilitar RLS em todas as tabelas de negócio
-- Contexto: Backend NestJS usa SERVICE_ROLE_KEY via supabase-js
--           → bypassa RLS automaticamente (seguro)
--           Acesso anon direto ao DB = bloqueado por padrão
-- =============================================================

-- Tabelas com dados pessoais/sensíveis
ALTER TABLE public."user"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderlyprofile     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiverlink      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicationhistory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callhistory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendaevent        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pushtoken          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactionlog     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicerequest     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offeringcontact    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offering           ENABLE ROW LEVEL SECURITY;

-- Categoria: semi-pública (leitura permitida para todos, escrita restrita)
ALTER TABLE public.category           ENABLE ROW LEVEL SECURITY;

-- Policy de leitura pública para categorias
-- A tabela category já pode ter essa policy, se tentar criar de novo pode dar erro. Vamos checar se já existe antes, ou apenas ignorar se falhar.
-- Usaremos DO block para evitar erro se já existir policy com esse nome.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Categorias são públicas para leitura' AND tablename = 'category'
  ) THEN
    CREATE POLICY "Categorias são públicas para leitura" ON public.category FOR SELECT USING (true);
  END IF;
END $$;
