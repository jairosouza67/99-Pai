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
| 04 | JWT & Refresh Token (H2) | 🟠 | ⏭️ ADIADO (pós-MVP) | — | — |
| 05 | CORS & Headers Hardening (M1, M2, M3) | 🟡 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 06 | Logging, Observability & Type Safety (M6, L3, L4) | 🟡🟢 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 07 | Endpoint Security (H3, H4, L5) | 🟠🟡🟢 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 08 | Supply Chain & Dependencies (M5, M7, L1) | 🟡🟢 | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |
| 09 | Validação Final & Reauditoria | — | ✅ CONCLUÍDO | 2026-04-24 | 2026-04-24 |

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
- **Status:** ⏭️ ADIADO
- **Notas:** Adiado pós-MVP por decisão do time. JWT mantém expiresIn: 7d até implementação do refresh token.

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
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 7.1: Categories controller mantido público (dados não-sensíveis) com throttle de 30 req/min e comentário `@Public` documentando a decisão
  - Task 7.2: Health check separado em `/api/health` e `/api/health/ping` (público, sem detalhes de DB — compatível com Vercel Cron) e `/api/health/status` (protegido com JwtAuthGuard, retorna detalhes do Supabase)
  - Task 7.3 (simplificada): Header `Cache-Control: private, max-age=86400` adicionado ao TTS. Cleanup de bucket Supabase Storage adiado com TODO

### Loop 08 — Supply Chain & Dependencies
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Task 8.1 (Backend audit): 14 vulnerabilidades → 6 restantes após `npm audit fix`. 8 resolvidas (lodash, path-to-regexp, js-yaml, protobufjs, @xmldom/xmldom, axios, follow-redirects). 6 pendentes são transitivas via `@nestjs/cli` → `@angular-devkit` (ajv GHSA-2g4f-4pwh-qvx6, picomatch GHSA-3v7f-55p6-f55p/GHSA-c2c7-rcm5-vvqj) — requer upgrade do @nestjs/cli para resolver.
  - Task 8.2 (Swagger/production): Confirmado que `bootstrap-config.ts` já protege Swagger com `if (process.env.NODE_ENV !== 'production')` (linha 72). Nenhuma alteração necessária.
  - Task 8.3 (Mobile audit): 29 vulnerabilidades → 26 restantes após `npm audit fix`. 3 resolvidas (axios, follow-redirects, @xmldom/xmldom). 26 pendentes são transitivas via Expo ecosystem (xmldom, uuid, xml2js, @tootallnate/once, picomatch) — exigiriam `--force` com breaking changes.

### Loop 09 — Validação Final & Reauditoria
- **Status:** ✅ CONCLUÍDO
- **Notas:**
  - Build do backend compilou sem erros.
  - Todos os findings verificados via grep:
    - ✅ C3: TTS protegido com JwtAuthGuard em voice.controller.ts
    - ✅ M4: .env.production no .gitignore
    - ✅ M7: *.tgz no .gitignore, arquivo removido
    - ✅ H1: bcrypt cost 12 em auth.service.ts
    - ✅ H5: MinLength(8) + regex de complexidade em signup.dto.ts
    - ✅ H6: Throttle 5/min no login em auth.controller.ts
    - ✅ M6: maskEmail() usado em auth.service.ts
    - ✅ L3: @User() tipado com RequestUser (sem any)
    - ✅ L4: UUID_REGEX validação no request-id.interceptor.ts
    - ✅ M1/M2: CORS hardened — origin required em produção, regex limitada a 30 chars
    - ✅ M3: crossOriginResourcePolicy: same-origin globalmente, cross-origin override no TTS
    - ✅ H3: Categories com throttle 30/min e @Public documentado
    - ✅ H4: Health separado — ping público (sem DB), status protegido com JwtAuthGuard
    - ✅ L2: envFilePath condicional em app.module.ts
    - ✅ L1: Swagger protegido em produção (NODE_ENV check em bootstrap-config.ts)
  - Pendências restantes: C1 requer rotação manual de secrets; H2 adiado pós-MVP; L5 parcial (Cache-Control ok, cleanup pendente).

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

---

## 📊 Matriz de Status Final (Loop 09)

| Finding | Severidade | Descrição | Status Final | Loop |
|---------|-----------|-----------|--------------|------|
| C1 | 🔴 CRITICAL | Secrets expostos no histórico git | ⚠️ PENDENTE (rotação manual) | 03 |
| C2 | 🔴 CRITICAL | SERVICE_ROLE_KEY bypass RLS | ✅ DOCUMENTADO (trust boundary) | 03 |
| C3 | 🔴 CRITICAL | TTS sem autenticação | ✅ CORRIGIDO | 01 |
| H1 | 🟠 HIGH | bcrypt cost baixo (10) | ✅ CORRIGIDO (cost 12) | 02 |
| H2 | 🟠 HIGH | JWT 7 dias sem refresh | ⏭️ ADIADO pós-MVP | 04 |
| H3 | 🟠 HIGH | Categories sem proteção | ✅ CORRIGIDO (throttle 30/min) | 07 |
| H4 | 🟠 HIGH | Health expõe detalhes | ✅ CORRIGIDO (ping/status) | 07 |
| H5 | 🟠 HIGH | Password policy fraca | ✅ CORRIGIDO (8+ chars, complexidade) | 02 |
| H6 | 🟠 HIGH | Sem brute force protection | ✅ CORRIGIDO (throttle 5/min login) | 02 |
| M1 | 🟡 MEDIUM | CORS aceita sem origin | ✅ CORRIGIDO | 05 |
| M2 | 🟡 MEDIUM | Regex CORS ampla | ✅ CORRIGIDO (limite 30 chars) | 05 |
| M3 | 🟡 MEDIUM | crossOriginResourcePolicy global | ✅ CORRIGIDO (apenas TTS) | 05 |
| M4 | 🟡 MEDIUM | .env.production no git | ✅ CORRIGIDO (.gitignore) | 01 |
| M5 | 🟡 MEDIUM | npm vulnerabilities | ✅ PARCIAL (transitivas restantes) | 08 |
| M6 | 🟡 MEDIUM | Email nos logs (PII) | ✅ CORRIGIDO (maskEmail) | 06 |
| M7 | 🟡 MEDIUM | .tgz suspeito na raiz | ✅ CORRIGIDO (removido) | 01 |
| L1 | 🟢 LOW | Swagger acessível em prod | ✅ JÁ PROTEGIDO | 08 |
| L2 | 🟢 LOW | envFilePath sem fallback | ✅ CORRIGIDO | 03 |
| L3 | 🟢 LOW | @User() tipado como any | ✅ CORRIGIDO (JwtPayload) | 06 |
| L4 | 🟢 LOW | Request ID sem validação | ✅ CORRIGIDO (UUID regex) | 06 |
| L5 | 🟢 LOW | TTS cache sem limite | ⚠️ PARCIAL (Cache-Control, cleanup pendente) | 07 |
