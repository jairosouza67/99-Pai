# 🔁 RALPH LOOP 05 — Edge Functions: Lógica de Negócio Complexa

> **Objetivo:** Criar Edge Functions para serviços com lógica de negócio que não pode ir diretamente para o cliente (rate-limiting, validações server-side, push notifications).
> **Risco:** 🟠 ALTO — Lógica complexa com múltiplas dependências
> **Esforço estimado:** 4-6 horas
> **Pré-requisitos:** Loop 03 concluído (RLS policies existem)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

**Serviços que precisam de Edge Functions (não podem ir para o cliente):**

| Serviço | Razão | Linhas |
|---------|-------|--------|
| `caregiver.service.ts` | Rate-limiting de linkCode, expiração, lock de conta | 381 |
| `service-requests.service.ts` | Validação de conflitos de agenda entre partes | 259 |
| `notifications.service.ts` | Gestão de push tokens (validação server-side) | 70 |

---

## ✅ Checklist de Tarefas

### Task 5.1 — Edge Function `caregiver-link`

**Criar:** `supabase functions new caregiver-link`

**Lógica a migrar do `caregiver.service.ts`:**

**Endpoints necessários (via body param `action`):**
1. **`generate-link-code`** — Gera linkCode para o idoso
   - Verificar se é idoso autenticado
   - Gerar código aleatório de 6 dígitos
   - Salvar em `elderlyprofile.linkCode` com expiração (`linkCodeCreatedAt`)
   - Resetar `linkCodeFailedAttempts`

2. **`link-caregiver`** — Cuidador usa linkCode para se vincular
   - Rate-limiting: máx 5 tentativas por 15 min (usar `linkCodeFailedAttempts` + `linkCodeLockedUntil`)
   - Verificar expiração do linkCode (TTL configurável, default 24h)
   - Verificar se já não está vinculado
   - Criar registro em `caregiverlink`
   - Limpar linkCode após sucesso

3. **`unlink-caregiver`** — Desvinculação
   - Verificar que o solicitante é o idoso ou o cuidador
   - Atualizar status do `caregiverlink`

4. **`verify-access`** — Verificar se cuidador tem acesso
   - Verificar `caregiverlink` ativo entre o cuidador e o elderlyProfileId

```typescript
Deno.serve(async (req) => {
  const { action, ...params } = await req.json();

  switch (action) {
    case 'generate-link-code':
      return handleGenerateLinkCode(supabase, user, params);
    case 'link-caregiver':
      return handleLinkCaregiver(supabase, user, params);
    case 'unlink-caregiver':
      return handleUnlinkCaregiver(supabase, user, params);
    default:
      return new Response('Invalid action', { status: 400 });
  }
});
```

**ATENÇÃO:** O rate-limiting do linkCode está atualmente em memória (`Map<string, LinkAttemptState>`). Na Edge Function, usar a coluna `linkCodeFailedAttempts` e `linkCodeLockedUntil` do banco (já existem via migration 0004).

- [ ] Concluído

---

### Task 5.2 — Edge Function `service-request-validate`

**Criar:** `supabase functions new service-request-validate`

**Lógica a migrar do `service-requests.service.ts`:**

**Endpoints (via `action`):**
1. **`create`** — Criar service request
   - Validar que o offering existe
   - Verificar conflitos de agenda (datas sobrepostas)
   - Criar registro em `servicerequest`

2. **`update-status`** — Atualizar status (confirm, cancel, complete)
   - Verificar que o solicitante é parte envolvida (requester ou provider)
   - Validar transições de status (pending → confirmed → completed)
   - Atualizar registro

**Por que Edge Function:** A validação de conflitos de agenda requer queries complexas que combinam múltiplas tabelas e lógica temporal que não pode ser expressa apenas em RLS.

- [ ] Concluído

---

### Task 5.3 — Edge Function `notification-register`

**Criar:** `supabase functions new notification-register`

**Lógica a migrar do `notifications.service.ts`:**

**Endpoints (via `action`):**
1. **`register-token`** — Registrar push token
   - Verificar se token já existe para o utilizador
   - Se existe: atualizar platform
   - Se não: inserir novo registro em `pushtoken`

2. **`unregister-token`** — Remover push token
   - Deletar token do utilizador

**Nota:** Este serviço é simples (70 linhas), mas push tokens precisam de validação server-side para evitar que um utilizador registre tokens de outro.

**Alternativa:** Se a lógica for simples o suficiente, considerar usar apenas RLS policies (Task 3.7 do Loop 03) e fazer o CRUD direto do mobile. Registrar decisão no `RALPH_MEMORY.md`.

- [ ] Concluído

---

### Task 5.4 — Configurar secrets para Edge Functions

```bash
supabase secrets set LINK_CODE_TTL_HOURS=24
```

- [ ] Concluído

---

### Task 5.5 — Testar Edge Functions localmente

```bash
supabase functions serve caregiver-link --env-file .env
supabase functions serve service-request-validate --env-file .env
supabase functions serve notification-register --env-file .env
```

**Testes:**
```bash
# Gerar linkCode
curl -X POST http://localhost:54321/functions/v1/caregiver-link \
  -H "Authorization: Bearer <elderly-jwt>" \
  -d '{"action": "generate-link-code"}'

# Usar linkCode (como cuidador)
curl -X POST http://localhost:54321/functions/v1/caregiver-link \
  -H "Authorization: Bearer <caregiver-jwt>" \
  -d '{"action": "link-caregiver", "linkCode": "123456"}'

# Criar service request
curl -X POST http://localhost:54321/functions/v1/service-request-validate \
  -H "Authorization: Bearer <user-jwt>" \
  -d '{"action": "create", "offeringId": "...", "scheduledDate": "..."}'
```

- [ ] Concluído

---

### Task 5.6 — Deploy das Edge Functions

```bash
supabase functions deploy caregiver-link
supabase functions deploy service-request-validate
supabase functions deploy notification-register
```

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] LinkCode: gerar, usar, e desbloquear funciona
2. [ ] Rate-limiting do linkCode funciona (bloqueia após 5 tentativas)
3. [ ] Service requests: criação com validação de conflitos
4. [ ] Notifications: registro de push tokens
5. [ ] Todas requerem autenticação (401 sem JWT)
6. [ ] Atualizar `RALPH_MEMORY.md` → Loop 05 → Status
7. [ ] Commit: `feat(migration): loop-05 edge functions caregiver-link, service-requests, notifications`
