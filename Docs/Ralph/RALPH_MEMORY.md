# 🧠 RALPH MEMORY — 99-Pai Security Hardening

> **Este arquivo é a memória persistente do Ralph Loop.**
> Cada loop deve ler este arquivo ao iniciar e atualizá-lo ao finalizar.
> Nunca delete informações anteriores — apenas adicione ou atualize status.

---

## 📊 Visão Geral do Projeto

| Campo | Valor |
|-------|-------|
| **Projeto** | 99-Pai |
| **Tipo** | Monorepo (NestJS backend + Expo mobile + Supabase) |
| **Deploy** | Vercel (backend: `99pai-api.vercel.app`, web: `99pai-web.vercel.app`) |
| **Origem** | Auditoria de Segurança — 2026-04-24 |
| **Total Findings** | 21 (3 Critical, 6 High, 7 Medium, 5 Low) |
| **Relatório Completo** | `Docs/Ralph/00_AUDIT_REPORT.md` |

---

## 🗺️ Mapa de Tasks

| Loop | Task | Severidade | Status | Data Início | Data Fim |
|------|------|-----------|--------|-------------|----------|
| 01 | Quick Wins Críticos (C3, M4, M7) | 🔴🟡 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 02 | Hardening de Autenticação (H1, H5, H6) | 🟠 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 03 | Secrets & Env Security (C1, C2, L2) | 🔴 | ✅ CONCLUÍDO (parcial — tasks automatizáveis) | 2026-04-24 | 2026-04-24 |
| 04 | JWT & Refresh Token (H2) | 🟠 | ⬜ PENDENTE | — | — |
| 05 | CORS & Headers Hardening (M1, M2, M3) | 🟡 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 06 | Logging, Observability & Type Safety (M6, L3, L4) | 🟡🟢 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 07 | Endpoint Security (H3, H4, L5) | 🟠🟡🟢 | ⬜ PENDENTE | — | — |
| 08 | Supply Chain & Dependencies (M5, M7, L1) | 🟡🟢 | ⬜ PENDENTE | — | — |
| 09 | Validação Final & Reauditoria | — | ⬜ PENDENTE | — | — |

---

## 📝 Log de Execução

### Loop 01 — Quick Wins Críticos
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 1.1: Adicionado @UseGuards(JwtAuthGuard) ao endpoint TTS em voice.controller.ts
  - Task 1.2: Adicionado .env.production e .env.production.local ao .gitignore
  - Task 1.3: Removido nestjs-core-11.0.1.tgz da raiz e adicionado *.tgz ao .gitignore

### Loop 02 — Hardening de Autenticação
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 2.1: bcrypt cost factor aumentado de 10 para 12 em auth.service.ts (OWASP 2025)
  - Task 2.2: Password policy fortalecida em signup.dto.ts — @MinLength(8) + regex (maiúscula, minúscula, número)
  - Task 2.3: Brute force protection no login via @Throttle(5 req/min) em auth.controller.ts

### Loop 03 — Secrets & Env Security
- **Status:** ⚠️ PARCIAL
- **Notas:**
  - Task 3.1: `.env` raiz nunca foi commitado. Arquivo `.env.production` foi commitado no histórico (commit 86129a2) com VERCEL_OIDC_TOKEN — requer rotação.
  - Task 3.3: Todos os endpoints sensíveis possuem `@UseGuards(JwtAuthGuard)`. Comentário de segurança adicionado ao `supabase.service.ts`.
  - Task 3.4: `envFilePath` em `app.module.ts` corrigido para não carregar `.env` em produção.
  - Task 3.2 (rotação manual de chaves Supabase/API keys) pendente — requer ação manual no dashboard

### Loop 04 — JWT & Refresh Token
- **Status:** ⬜ PENDENTE
- **Notas:** —

### Loop 05 — CORS & Headers Hardening
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 5.1: Bloqueados requests sem origin em produção — `if (!origin && NODE_ENV==='production')` retorna erro CORS
  - Task 5.2: Regex de preview deployments restrita de `[a-z0-9-]+` para `[a-z0-9-]{1,30}` (limite de comprimento)
  - Task 5.3: `crossOriginResourcePolicy` alterado de `cross-origin` para `same-origin` globalmente; override `cross-origin` adicionado no VoiceController (rota TTS)

### Loop 06 — Logging, Observability & Type Safety
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 6.1: Criado `maskEmail()` em `common/utils/mask.util.ts`; emails mascarados nos logs de signup e login em `auth.service.ts`
  - Task 6.2: Criadas interfaces `JwtPayload` e `RequestUser` em `auth/interfaces/jwt-payload.interface.ts`; `@User()` decorator tipado com `RequestUser`; todos os controllers atualizados de `any`/`{ userId: string }` para `RequestUser`; JWT signing alterado de `userId` para `sub` (padrão JWT); `JwtStrategy.validate()` tipado com `JwtPayload`
  - Task 6.3: Validação UUID v4 adicionada no `request-id.interceptor.ts` — header `x-request-id` malicioso é ignorado e novo UUID é gerado

### Loop 07 — Endpoint Security
- **Status:** ⬜ PENDENTE
- **Notas:** —

### Loop 08 — Supply Chain & Dependencies
- **Status:** ⬜ PENDENTE
- **Notas:** —

### Loop 09 — Validação Final & Reauditoria
- **Status:** ⬜ PENDENTE
- **Notas:** —

---

## ⚠️ Decisões Importantes

> Registre aqui qualquer decisão tomada durante os loops que afete loops futuros.

| Data | Loop | Decisão | Motivo |
|------|------|---------|--------|
| 2026-04-24 | 03 | Task 3.2 adiada | Rotação de chaves requer acesso manual ao Supabase Dashboard e Vercel. Será feita separadamente. |
| 2026-04-24 | 04 | Adiado pós-MVP | Complexidade alta (~4-6h), requer mudanças no mobile. Não bloqueia outros loops. |

---

## 🔗 Referências Rápidas

| Recurso | Caminho |
|---------|---------|
| Backend src | `packages/backend/src/` |
| Auth module | `packages/backend/src/auth/` |
| Voice module | `packages/backend/src/voice/` |
| Categories module | `packages/backend/src/categories/` |
| Health module | `packages/backend/src/health/` |
| Bootstrap config | `packages/backend/src/bootstrap-config.ts` |
| App module | `packages/backend/src/app.module.ts` |
| Supabase service | `packages/backend/src/supabase/supabase.service.ts` |
| Request ID interceptor | `packages/backend/src/common/interceptors/request-id.interceptor.ts` |
| Supabase migrations | `supabase/migrations/` |
| Root .env | `.env` |
| Backend .env.production | `packages/backend/.env.production` |
| Mobile .env.local | `packages/mobile/.env.local` |
| Vercel config (backend) | `packages/backend/vercel.json` |
| Root .gitignore | `.gitignore` |
