# Etapa 03: Edge Functions (CORS e Validação de Input)

## 🎯 Objetivos
Mitigar vulnerabilidades do tipo SSRF/CSRF nas APIs (H1) e falta de sanitização (M4).

## 🛠️ Tarefas a Executar

1. **Restringir CORS em todas as Edge Functions (H1):**
   - [ ] Localizar as 5 Edge Functions em `supabase/functions/`.
   - [ ] Criar ou editar um arquivo (ex: `supabase/functions/_shared/cors.ts`) para definir origens seguras:
     ```typescript
     export const ALLOWED_ORIGINS = [
       'https://99pai-web.vercel.app',
       'http://localhost:8081',
       'http://localhost:3000',
       // Adicionar URLs geradas pelo expo go se necessário
     ];
     // Lógica para validar origin.
     ```
   - [ ] Atualizar todas as Edge Functions para usarem essa lógica de CORS em vez de `*`.

2. **Validação de Tamanho de Input (M4):**
   - [ ] Na função `caregiver-link`: Adicionar validação para o campo `linkCode`.
   - [ ] Na função `notification-register`: Adicionar validação de tamanho máximo para `pushToken` (ex: máx 200 chars).
   - [ ] Na função `service-request-validate`: Adicionar validação/limite de caracteres para `notes`.
   - [ ] Validar e retornar erro padrão 400 (Bad Request) em caso de violação.

## 🏁 Encerramento da Etapa (Ralph Loop)
Ao concluir todas as tarefas desta etapa:
1. Atualize o status da Etapa 03 para `[X]` no arquivo `00_Master_Security_Plan.md`.
2. Adicione detalhes no "Histórico de Contexto" se novos padrões de validação foram criados.
3. Instrua o encerramento do chat para reset do contexto e avanço para `04_Step_Edge_Functions_RateLimit_Refactor.md`.
