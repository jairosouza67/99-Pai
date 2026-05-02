# 🧠 RALPH MEMORY — 99-Pai Supabase Migration

> **Este arquivo é a memória persistente do Ralph Loop de Migração.**
> Cada loop deve ler este arquivo ao iniciar e atualizá-lo ao finalizar.
> Nunca delete informações anteriores — apenas adicione ou atualize status.

---

## 📊 Visão Geral do Projeto

| Campo | Valor |
|-------|-------|
| **Projeto** | 99-Pai |
| **Tipo** | Monorepo (NestJS backend + Expo mobile + Supabase) |
| **Campanha** | Migração Total: NestJS → Supabase Nativo |
| **Deploy Atual** | Vercel (backend: `99pai-api.vercel.app`) |
| **Deploy Alvo** | Supabase (Auth, DB+RLS, Storage, Edge Functions) |
| **Origem** | Análise de Migração — 2026-04-25 |
| **Total de Loops** | 9 |
| **Relatório Completo** | `Docs/Migration/00_MIGRATION_AUDIT.md` |

---

## 🏗️ Arquitetura

**ANTES (Atual):**
```
Mobile (Expo) → axios → NestJS (Vercel) → SERVICE_ROLE_KEY → Supabase DB
```

**DEPOIS (Alvo):**
```
Mobile (Expo) → @supabase/supabase-js → Supabase Auth + DB (RLS) + Storage
Mobile (Expo) → supabase.functions.invoke() → Edge Functions (secrets protegidos)
```

---

## 🗺️ Mapa de Tasks

| Loop | Task | Risco | Status | Data Início | Data Fim |
|------|------|-------|--------|-------------|----------|
| 01 | Migração de Utilizadores para Supabase Auth | 🔴 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 02 | Supabase Client & Auth Nativa no Mobile | 🟠 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 03 | RLS Policies Completas (modelo cuidador/idoso) | 🔴 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 04 | Edge Functions: TTS & Weather | 🟠 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 05 | Edge Functions: Lógica de Negócio Complexa | 🟠 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 06 | Refatoração Mobile: CRUD Direto Supabase | 🟡 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 07 | Refatoração Mobile: Edge Functions & Limpeza | 🟡 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 08 | Descomissionamento do Backend NestJS | 🟢 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |
| 09 | Validação Final & Smoke Tests | 🟢 | ✅ CONCLUÍDO | 2026-04-25 | 2026-04-25 |

---

## 📝 Log de Execução

### Loop 01 — Migração de Utilizadores para Supabase Auth
- **Status:** ✅ CONCLUÍDO
- **Notas:** Migrations 0007 (migrate_users_to_auth) e 0008 (user_id_mapping) criadas. Opção SQL direta escolhida (Opção A) — preserva hashes bcrypt, sem reset de senha. Identidades auth.identities também inseridas para login funcionar.

### Loop 02 — Supabase Client & Auth Nativa no Mobile
- **Status:** ✅ CONCLUÍDO
- **Notas:** SDK Supabase instalado, cliente criado, AuthContext migrado para supabase.auth, authStorage.ts removido

### Loop 03 — RLS Policies Completas
- **Status:** ✅ CONCLUÍDO
- **Notas:** 12 migrations SQL criadas (0009–0020). Funções helper `has_access_to_elderly_profile()` e `get_legacy_id()` centralizam o modelo de acesso cuidador/idoso. Policies cobrem 13 tabelas: user, elderlyprofile, medication, contact, agendaevent, interactionlog, medicationhistory, callhistory, caregiverlink, offering, servicerequest, offeringcontact, pushtoken. Históricos e logs são imutáveis (apenas SELECT/INSERT). Caregiverlink gerenciado via Edge Function (Loop 05).

### Loop 04 — Edge Functions: TTS & Weather
- **Status:** ✅ CONCLUÍDO
- **Notas:** Edge Functions voice-tts e weather-get criadas. voice-tts com fallback chain (OpenRouter→OpenAI→Google TTS REST). Google TTS usa REST API com JWT (não SDK). weather-get com geocoding hardcoded e Open-Meteo API.

### Loop 05 — Edge Functions: Lógica de Negócio Complexa
- **Status:** ✅ CONCLUÍDO
- **Notas:** 3 Edge Functions criadas: caregiver-link (4 actions: generate-link-code, link-caregiver, unlink-caregiver, verify-access), service-request-validate (2 actions: create com validação de conflitos medicação/agenda, update-status com transições validadas), notification-register (2 actions: register-token com upsert, unregister-token). Rate-limiting de linkCode usa colunas DB (linkCodeFailedAttempts, linkCodeLockedUntil) — não in-memory Map, pois Edge Functions são stateless. Colunas camelCase quotadas conforme schema real.

### Loop 06 — Refatoração Mobile: CRUD Direto Supabase
- **Status:** ✅ CONCLUÍDO
- **Notas:** 7 arquivos migrados — todas chamadas axios api.get/post/put/patch/delete substituídas por queries Supabase diretas (exceto voice/weather/caregiver/notifications que ficam para Loop 07). Módulos migrados: contacts (GET + POST called → contact + callhistory), medications (GET today + POST confirm → medication + medicationhistory), agenda (GET today → agendaevent), elderly/profile (GET + PATCH → elderlyprofile), caregiver elderly detail (GET/POST/DELETE medications, contacts, agenda, history). Tipo Contact atualizado para incluir elderlyProfileId. api.ts e axios mantidos para Loop 07.

### Loop 07 — Refatoração Mobile: Edge Functions & Limpeza
- **Status:** ✅ CONCLUÍDO
- **Notas:** 5 arquivos modificados + 1 deletado. voice.ts: TTS remoto migrado de `api.getUri('/voice/tts')` para `supabase.functions.invoke('voice-tts')`. usePushNotifications.ts: registro de push token migrado de `api.post('/notifications/register')` para `supabase.functions.invoke('notification-register')`. AuthContext.tsx: `getApiErrorMessage` substituído por `getSupabaseErrorMessage` exportado de `lib/supabase.ts`. caregiver/dashboard.tsx: `api.get('/caregiver/elderly')` substituído por query Supabase direta em `caregiverlink` + join `elderlyprofile`; `api.post('/caregiver/link')` migrado para `supabase.functions.invoke('caregiver-link', { action: 'link-caregiver' })`. elderly/home.tsx: `api.get('/weather')` migrado para `supabase.functions.invoke('weather-get')`. `services/api.ts` deletado. axios desinstalado do workspace `@99-pai/mobile`. TypeScript check (`tsc --noEmit`) passou sem erros.

### Loop 08 — Descomissionamento do Backend NestJS
- **Status:** ✅ CONCLUÍDO
- **Notas:** packages/backend deletado, scripts limpos do root package.json, CI/CD atualizado (ci.yml e deploy-vercel.yml), .env.example limpo de variáveis backend-only (JWT_SECRET, PORT, CORS_ORIGINS removidas), vercel.json mantido apenas com config SPA web.

### Loop 09 — Validação Final & Smoke Tests
- **Status:** ✅ CONCLUÍDO
- **Notas:** Todas as verificações passaram com sucesso:
  - **Segurança (5/5 PASS):** Zero ocorrências de SERVICE_ROLE_KEY, axios, authStorage, api.get/post/put/delete/patch, services/api no código mobile.
  - **Infraestrutura (3/3 PASS):** packages/backend não existe; CI/CD sem referências a backend/99pai-api; package.json sem scripts backend.
  - **Build (1/1 PASS):** `tsc --noEmit` compilou sem erros.
  - **Edge Functions (5/5 PASS):** voice-tts, weather-get, caregiver-link, service-request-validate, notification-register — todas com CORS headers, auth check (getUser), error handling, response JSON correto.
  - **Migrations (1/1 PASS):** 19 migrations presentes (0002–0020).
  - **Auth Mobile (1/1 PASS):** AuthContext usa signUp, signInWithPassword, signOut, getSession, onAuthStateChange — sem referências a api.ts/axios.
  - **Supabase Client (1/1 PASS):** Usa ANON_KEY (EXPO_PUBLIC_SUPABASE_ANON_KEY), AsyncStorage, detectSessionInUrl: false, persistSession: true.

---

## ⚠️ Decisões Importantes

> Registre aqui qualquer decisão tomada durante os loops que afete loops futuros.

| Data | Loop | Decisão | Motivo |
|------|------|---------|--------|
| 2026-04-25 | 01 | Migração via SQL direto (Opção A) | Preserva hashes bcrypt, sem reset de senha |
| 2026-04-25 | 02 | AsyncStorage como storage adapter para Supabase Auth | Compatível com Expo web + nativo |
| 2026-04-25 | 04 | Google TTS usa REST API + JWT (não SDK) | SDK @google-cloud/text-to-speech não funciona no Deno runtime |
| 2026-04-25 | 03 | Funções helper `has_access_to_elderly_profile()` e `get_legacy_id()` | Centralizam modelo de acesso cuidador/idoso em funções reutilizáveis; evitam subqueries inline nas policies |
| 2026-04-25 | 05 | notification-register usa Edge Function (não RLS direct) | Validação server-side de push tokens (platform enum, upsert logic) — garante integridade mesmo com RLS aberto para INSERT own |
| 2026-04-25 | 07 | `api.ts` e axios removidos do mobile; `getSupabaseErrorMessage` centralizado em `lib/supabase.ts` | Elimina dependência de backend NestJS no mobile; error helper genérico reutilizável para todas as chamadas Supabase/Edge Functions |

---

## 🔧 Progresso Pré-existente (Antes dos Loops)

| Item | Referência |
|------|-----------|
| RLS habilitado em 13 tabelas | `supabase/migrations/0002_enable_rls.sql` |
| Permissões service_role | `supabase/migrations/0003_fix_service_role_schema_permissions.sql` |
| LinkCode hardening | `supabase/migrations/0004_harden_link_code_security.sql` |
| TTS storage bucket | `supabase/migrations/0005_tts_storage_bucket.sql` |
| Column defaults (UUID, timestamps) | `supabase/migrations/0006_add_column_defaults.sql` |
| User migration → auth.users + identities | `supabase/migrations/0007_migrate_users_to_auth.sql` |
| User ID mapping table (legacy → auth) | `supabase/migrations/0008_user_id_mapping.sql` |
| Policy leitura pública categorias | `supabase/migrations/0002_enable_rls.sql` |
| Security hardening completo (9 loops) | `Docs/Ralph/` |

---

## 🔗 Referências Rápidas

| Recurso | Caminho |
|---------|---------|
| Backend src (a ser eliminado) | `packages/backend/src/` |
| Auth service (migrar utilizadores) | `packages/backend/src/auth/auth.service.ts` |
| Caregiver service (modelo acesso) | `packages/backend/src/caregiver/caregiver.service.ts` |
| Voice service (TTS 3 provedores) | `packages/backend/src/voice/voice.service.ts` |
| Weather service | `packages/backend/src/weather/weather.service.ts` |
| Supabase service (SERVICE_ROLE) | `packages/backend/src/supabase/supabase.service.ts` |
| Mobile api.ts (axios — remover) | `packages/mobile/src/services/api.ts` |
| Mobile voice.ts | `packages/mobile/src/services/voice.ts` |
| Mobile authStorage.ts (remover) | `packages/mobile/src/lib/authStorage.ts` |
| Supabase migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Root .env.example | `.env.example` |
| Plano de migração original | `Docs/Supabase_Migration_Plan.md` |
| Relatório de análise | `Docs/Migration/00_MIGRATION_AUDIT.md` |

---

## 📊 Mapeamento de Serviços — Destino Final

| Serviço Backend | Destino | Loop |
|-----------------|---------|------|
| auth.service.ts | Supabase Auth nativo | 01, 02 |
| caregiver.service.ts | Edge Function `caregiver-link` | 05 |
| voice.service.ts | Edge Function `voice-tts` | 04 |
| weather.service.ts | Edge Function `weather-get` | 04 |
| notifications.service.ts | Edge Function `notification-register` | 05 |
| service-requests.service.ts | Edge Function `service-request-validate` | 05 |
| medications.service.ts | Cliente direto + RLS | 03, 06 |
| offerings.service.ts | Cliente direto + RLS | 03, 06 |
| contacts.service.ts | Cliente direto + RLS | 03, 06 |
| agenda.service.ts | Cliente direto + RLS | 03, 06 |
| elderly.service.ts | Cliente direto + RLS | 03, 06 |
| categories.service.ts | Cliente direto + RLS (público) | 03, 06 |
| interactions.service.ts | Cliente direto + RLS | 03, 06 |
| supabase.service.ts | **Eliminado** | 08 |
