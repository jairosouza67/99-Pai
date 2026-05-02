# Etapa 02: RLS Policies

## 🎯 Objetivos
Resolver as vulnerabilidades críticas relacionadas ao controle de acesso do banco de dados (C2, M2, M3, L3).

## 🛠️ Tarefas a Executar

1. **Criação de Policies para as 10 Tabelas Vulneráveis (C2):**
   - [ ] Criar um arquivo de migração SQL em `supabase/migrations/` (ex: `0007_add_missing_rls_policies.sql`).
   - [ ] Implementar as policies para as seguintes tabelas (usando a lógica de negócio definida para cada uma):
     - `offering` (Leitura pública? Escrita por admins?)
     - `agendaevent` (Acesso vinculado ao `elderlyprofile` ou ao cuidador autenticado)
     - `offeringcontact`
     - `pushtoken` (Dono do token)
     - `interactionlog`
     - `caregiverlink` (Dono e Cuidador)
     - `medicationhistory`
     - `contact` (Dono do `elderlyprofile`)
     - `callhistory`
     - `servicerequest`

2. **Proteger a tabela Legado `_prisma_migrations` (M2):**
   - [ ] No mesmo arquivo de migração ou um novo (ex: `0008_protect_legacy_tables.sql`), dropar a tabela se não for usada, ou habilitar o RLS e bloquear acesso total:
     ```sql
     ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
     -- Nenhuma policy criada = Deny All
     ```

3. **Investigar e Proteger `user_id_mapping` (M3, L3):**
   - [ ] Verificar a existência da tabela `user_id_mapping`.
   - [ ] Se existir, habilitar RLS e criar policy para que um usuário veja apenas seu próprio mapeamento (se necessário pelo client) ou bloquear acesso via API (permitir apenas Service Role).

4. **Aplicação Local:**
   - [ ] Rodar `supabase db push` ou equivalente localmente para testar a aplicação das migrations.

## 🏁 Encerramento da Etapa (Ralph Loop)
Ao concluir todas as tarefas desta etapa:
1. Atualize o status da Etapa 02 para `[X]` no arquivo `00_Master_Security_Plan.md`.
2. Adicione informações ao "Histórico de Contexto" (ex: como as policies foram estruturadas).
3. Instrua o encerramento do chat para reset do contexto e avanço para `03_Step_Edge_Functions_CORS_Input.md`.
