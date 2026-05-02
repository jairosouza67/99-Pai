# Ralph Loop: 99-Pai Security Remediation Master Plan

Este é o arquivo de memória principal (Master Plan) para a auditoria de segurança e remediação do projeto 99-Pai, seguindo a metodologia **Ralph Loop**.

## 🔄 Como Funciona o Ralph Loop
1. Abra um NOVO chat (janela de contexto limpa).
2. Carregue **ESTE arquivo** (`00_Master_Security_Plan.md`) e o arquivo da etapa atual (ex: `01_Step_Env_And_Keys.md`).
3. Execute a etapa correspondente.
4. Ao finalizar, atualize o status neste arquivo (`00_Master_Security_Plan.md`) para `[X]`.
5. Encerre o chat. Volte ao Passo 1 para a próxima etapa.

---

## 📋 Status das Etapas

- [ ] **Etapa 01: Segredos e Ambiente** (`01_Step_Env_And_Keys.md`)
  - Limpeza de `.env`, setup de `gitleaks`, e rotação de chaves.
- [X] **Etapa 02: RLS Policies** (`02_Step_RLS_Policies.md`)
  - As policies para as 10 tabelas já existiam nas migrations 0010–0020. Criada migration `0022_protect_prisma_migrations.sql` para proteger a tabela legada.
- [X] **Etapa 03: Edge Functions (CORS e Inputs)** (`03_Step_Edge_Functions_CORS_Input.md`)
  - Criados `_shared/cors.ts` e `_shared/validation.ts`. Todas as 5 Edge Functions atualizadas para CORS restrito (em vez de `*`) e validação de inputs.
- [X] **Etapa 04: Edge Functions (Rate-Limiting e Refatoração)** (`04_Step_Edge_Functions_RateLimit_Refactor.md`)
  - Criados `_shared/identity.ts`, `_shared/rate-limit.ts` e migration `0023_create_rate_limits.sql`. Rate-limiting aplicado em todas as 5 Edge Functions.
- [X] **Etapa 05: Frontend e Vercel Hardening** (`05_Step_Frontend_Hardening.md`)
  - Security Headers (CSP, HSTS, X-Frame-Options, etc.) adicionados ao `vercel.json`. `console.log` removido do `usePushNotifications.ts`.

---

## 🛑 Histórico de Contexto (Context Memory)
*Adicione notas importantes aqui ao final de cada etapa para que o próximo chat herde o conhecimento essencial.*

- **Etapa 01 (Pendente):** N/A — pulada a pedido do usuário
- **Etapa 02 (Concluída):** `_prisma_migrations` protegida via RLS (sem policies = deny all). As demais tabelas já tinham policies nas migrations 0010–0020.
- **Etapa 03 (Concluída):** CORS restringe origens a `99pai-web.vercel.app`, `localhost:8081/3000` e origins mobile (`capacitor://`, `file://`, `null`). Validações: linkCode (6 chars alfanuméricos), pushToken (max 200), notes (max 1000), text TTS (max 600), location (max 100).
- **Etapa 04 (Concluída):** `resolveLegacyId()` extraído para `_shared/identity.ts`. Rate limits: voice-tts (10/min), weather-get (30/min), caregiver-link generate (5/min), service-request (20/min), notification-register (10/min). Todos retornam 429 quando excedido.
- **Etapa 05 (Concluída):** `vercel.json` configurado com X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS, CSP e Permissions-Policy. Logs de produção removidos do hook de notificações push.
