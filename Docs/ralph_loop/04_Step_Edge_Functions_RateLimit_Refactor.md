# Etapa 04: Edge Functions (Rate-Limiting e Refatoração)

## 🎯 Objetivos
Prevenir abusos e consumo financeiro indevido (H2) e melhorar a manutenção do código (L4).

## 🛠️ Tarefas a Executar

1. **Criação do Banco para Rate-Limiting:**
   - [ ] Criar uma migration SQL (ex: `0009_create_rate_limits.sql`) com a tabela `rate_limits` para monitorar chamadas por usuário e endpoint.
   - [ ] Habilitar RLS e permitir que a Service Role tenha acesso total.

2. **Refatoração com Módulo Shared (L4):**
   - [ ] Criar a pasta `supabase/functions/_shared/`.
   - [ ] Extrair métodos duplicados como `jsonResponse()`, `resolveLegacyId()`, e a lógica do rate limit para este módulo.

3. **Implementação do Rate Limiting (H2):**
   - [ ] Adicionar checagem de rate limit na função `voice-tts` (Proteção financeira - OpenAI/OpenRouter). Exemplo: 10 chamadas por minuto.
   - [ ] Adicionar checagem em `weather-get`.
   - [ ] Expandir proteção no `caregiver-link` para a geração de código (`generate-link-code`).
   - [ ] Adicionar limite na `service-request-validate` e `notification-register`.

4. **Testes Locais:**
   - [ ] Fazer chamadas simuladas locais (com Supabase CLI) para confirmar que o erro 429 (Too Many Requests) é retornado ao ultrapassar limites.

## 🏁 Encerramento da Etapa (Ralph Loop)
Ao concluir todas as tarefas desta etapa:
1. Atualize o status da Etapa 04 para `[X]` no arquivo `00_Master_Security_Plan.md`.
2. Adicione os limites definidos no "Histórico de Contexto" para referência.
3. Instrua o encerramento do chat para reset do contexto e avanço para `05_Step_Frontend_Hardening.md`.
