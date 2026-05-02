# Verificacao Pos-Migracao — NestJS para Supabase Nativo

**Data:** 2026-04-25  
**Escopo:** Verificacao completa dos 9 loops de migracao  
**Metodo:** Auditoria de codigo (migrations SQL, Edge Functions, mobile e infraestrutura)  
**Resultado:** **PARCIAL (NAO APROVADO PARA PRODUCAO)** com 3 bloqueadores criticos

---

## 1. Resumo Executivo

A migracao foi executada em termos de estrutura (migrations, funcoes e remocao do backend), mas **nao esta funcionalmente conforme** para liberar em producao devido a inconsistencias de identidade entre `auth.id` e `legacy_id`, com impacto direto em autorizacao e fluxo de dados.

| Area | Classificacao | Observacao |
|------|---------------|------------|
| Migrations SQL (0002-0020) | PASS estrutural / PARCIAL funcional | 19 ficheiros presentes, mas o modelo depende de `get_legacy_id()` |
| Edge Functions | FAIL (bloqueador) | Problemas de autorizacao e mapeamento de ID |
| Mobile (auth + CRUD + edge calls) | FAIL (bloqueador) | Filtros usando `auth.id` em colunas legacy |
| Backend decommission | PASS | `packages/backend/` removido |
| Limpeza documental/infra | PARCIAL | Variaveis e docs legadas ainda presentes |

**Decisao de release:** **NO-GO** ate concluir o plano da secao 8 (Fase 1 completa).

---

## 2. Migrations SQL — PASS estrutural, PARCIAL funcional

### 2.1 Inventario

Foram encontrados os 19 ficheiros esperados (0002-0020). O inventario esta consistente com o plano.

### 2.2 Pontos corretos

1. `0007_migrate_users_to_auth.sql` migra para `auth.users` e cria `auth.identities`.
2. `0008_user_id_mapping.sql` cria ponte `legacy_id <-> auth_id`.
3. `0009_rls_access_helpers.sql` cria `has_access_to_elderly_profile()` e `get_legacy_id()`.
4. Policies 0010-0020 estao idempotentes com `DROP POLICY IF EXISTS`.

### 2.3 Reclassificacao tecnica

1. O documento anterior afirmava "cuidador vinculado ativo", mas `has_access_to_elderly_profile()` nao aplica filtro de status ativo no SQL.
2. O modelo de seguranca depende de `get_legacy_id()`; portanto, qualquer uso de `auth.id` direto em colunas legacy quebra o controle de acesso.

---

## 3. Edge Functions — FAIL (bloqueador)

### 3.1 Verificacao estrutural (PASS)

As 5 funcoes existem e possuem CORS, tratamento de `OPTIONS`, `getUser()` e respostas JSON.

### 3.2 Achados criticos

1. **CRITICO — `caregiver-link` mistura Auth ID com schema legacy**  
  Evidencias: busca em `public.user` por `user.id` autenticado e grava `caregiverUserId: user.id`.  
  Impacto: vinculo pode falhar ou gravar relacao inconsistente.

2. **CRITICO — `service-request-validate` cria request sem validar envolvimento do caller**  
  Evidencias: fluxo `handleCreate` com client admin e insert sem check explicito de permissao sobre `elderlyProfileId`.  
  Impacto: risco de criacao indevida de requests.

3. **ALTO — `service-request-validate` compara IDs potencialmente incompatveis**  
  Evidencias: comparacoes `elderlyProfile.userId === user.id` e `offering.userId === user.id`.  
  Impacto: negacao indevida de acesso legitimo ou comportamento inconsistente.

4. **ALTO — `weather-get` busca perfil via `public.user.id = auth.id`**  
  Impacto: fallback frequente para local padrao e perda de contexto real.

5. **MEDIO — `notification-register` grava `pushtoken.userId` com `auth.id`**  
  Impacto: divergencia com policies baseadas em `get_legacy_id()`.

---

## 4. Codigo Mobile — FAIL (bloqueador)

### 4.1 Pontos corretos

1. Auth via Supabase foi implementado (`signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`).
2. Limpeza de legado principal ocorreu: sem `services/api.ts`, sem `authStorage.ts`, sem chamadas `api.get/post/...` no codigo fonte TS/TSX.

### 4.2 Achados criticos

1. **CRITICO — App usa `auth.id` como identidade unica sem traducao para legacy**  
  Evidencia: `AuthContext` mapeia `id: supabaseUser.id`.

2. **CRITICO — Telas filtram `elderlyprofile.userId` com `auth.id`**  
  Evidencias: telas de `home`, `medications`, `contacts`, `agenda`, `settings`.

3. **ALTO — Dashboard do cuidador filtra `caregiverUserId` com `auth.id`**  
  Impacto: listas vazias ou inconsistentes dependendo dos dados existentes.

**Conclusao da area mobile:** arquitetura migrada, mas regra de identidade ainda incoerente com o banco/policies.

---

## 5. Descomissionamento do Backend — PASS com pendencias de configuracao

| Verificacao | Status |
|-------------|--------|
| `packages/backend/` removido | PASS |
| Scripts backend removidos do root | PASS |
| `vercel.json` focado em SPA | PASS |
| `EXPO_PUBLIC_API_URL` legado em `packages/mobile/app.json` | FAIL |
| Referencias legadas em docs mobile | FAIL |

---

## 6. Matriz de Problemas Reclassificada

| ID | Severidade | Area | Problema | Status |
|----|------------|------|----------|--------|
| C1 | CRITICO | Modelo de dados | Mismatch `auth.id` x `legacy_id` | Aberto |
| C2 | CRITICO | Edge Function | `caregiver-link` com ID incorreto | Aberto |
| C3 | CRITICO | Edge Function | `service-request-validate` sem check forte no create | Aberto |
| A1 | ALTO | Edge Function | `update-status` compara IDs potencialmente divergentes | Aberto |
| A2 | ALTO | Edge Function | `weather-get` consulta `public.user` com Auth ID | Aberto |
| A3 | MEDIO | Edge Function | `notification-register` grava `userId` inconsistente | Aberto |
| M1 | MEDIO | Config mobile | `EXPO_PUBLIC_API_URL` legado no `app.json` | Aberto |
| M2 | MEDIO | Documentacao | `README.md` e `README_FRONTEND.md` desatualizados | Aberto |
| L1 | BAIXO | Dependencias | `iterare` orfa e lockfile com residuos | Aberto |

---

## 7. Critico para Conformidade

Para considerar conformidade com a analise tecnica:

1. Nenhuma Edge Function pode depender de `auth.id` direto onde o schema/policies exigem `legacy_id`.
2. Nenhuma query mobile pode filtrar colunas legacy (`userId`, `caregiverUserId`) com `auth.id` sem traducao.
3. Fluxos com client admin devem validar autorizacao de negocio antes de `insert/update`.

---

## 8. Plano de Correcao (com classificacao e aceite)

### Fase 0 — Bloqueio de release (imediato)

1. Marcar status de deploy como bloqueado ate fechar C1-C3.
2. Comunicar risco para equipe: migracao estrutural concluida, conformidade funcional pendente.

**Criterio de aceite:** release gate ativo e aprovado por responsavel tecnico.

### Fase 1 — Correcao de identidade/autorizacao (24-48h)

1. Criar utilitario unico de resolucao de identidade (`auth.id -> legacy_id`) para Edge Functions.
2. Corrigir `caregiver-link` para sempre usar `legacy_id` nas tabelas legacy.
3. Corrigir `service-request-validate`:
  - validar envolvimento do caller no `create` antes de inserir;
  - alinhar comparacoes de IDs no `update-status`.
4. Corrigir `weather-get` para buscar perfil via mapeamento correto.
5. Corrigir `notification-register` para gravar/consultar `userId` coerente com policies.
6. Corrigir queries mobile que filtram `userId`/`caregiverUserId` com `auth.id`.

**Criterios de aceite:**

1. Fluxos idoso/cuidador retornam dados esperados em teste manual.
2. Tentativa cross-user sem permissao retorna bloqueio.
3. `tsc --noEmit` sem erros no mobile.

### Fase 2 — Validacao de regressao (48-72h)

1. Executar smoke tests funcionais para:
  - auth (signup/login/logout/session refresh);
  - CRUD idoso;
  - vinculo cuidador;
  - edge functions (voice/weather/caregiver/service-request/notification).
2. Registrar evidencias (entrada, resultado esperado, resultado obtido).

**Criterio de aceite:** 100% dos cenarios criticos aprovados com evidencias.

### Fase 3 — Limpeza e padronizacao (ate proximo deploy)

1. Remover `EXPO_PUBLIC_API_URL` legado de `packages/mobile/app.json`.
2. Atualizar `README.md` e `packages/mobile/README_FRONTEND.md` para arquitetura Supabase nativa.
3. Remover `iterare` e regenerar `package-lock.json`.
4. Revisar variaveis de workflow para eliminar referencias legadas de API backend.

**Criterio de aceite:** grep sem referencias legadas e docs alinhadas com arquitetura atual.

---

## 9. Conclusao

A migracao **nao deve ser classificada como "Aprovada" neste estado**. A classificacao correta e:

**PARCIAL / NAO APROVADO PARA PRODUCAO (NO-GO)**

A base estrutural esta pronta, mas existem bloqueadores criticos de identidade e autorizacao. O sistema passa para **GO** somente apos conclusao da Fase 1 e validacao da Fase 2.
