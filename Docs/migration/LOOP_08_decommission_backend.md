# 🔁 RALPH LOOP 08 — Descomissionamento do Backend NestJS

> **Objetivo:** Remover completamente o backend NestJS (`packages/backend`), limpar scripts, configurações e infraestrutura associada (Vercel, CI/CD).
> **Risco:** 🟢 BAIXO — Apenas remoção após tudo funcionar sem backend
> **Esforço estimado:** 2-3 horas
> **Pré-requisitos:** Loop 07 concluído (mobile 100% funcional sem backend)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## ⚠️ VERIFICAÇÃO PRÉ-REMOÇÃO

**Antes de deletar QUALQUER coisa, confirmar:**
1. [ ] App mobile funciona end-to-end sem o backend rodando
2. [ ] Auth (signup, login, logout, persistência) funciona
3. [ ] Todos os CRUDs funcionam (medications, contacts, agenda, etc.)
4. [ ] TTS funciona via Edge Function
5. [ ] Weather funciona via Edge Function
6. [ ] Caregiver link funciona via Edge Function

**Se QUALQUER item acima falhar: NÃO prosseguir. Voltar ao loop correspondente.**

---

## ✅ Checklist de Tarefas

### Task 8.1 — Deletar `packages/backend`

**O que fazer:**
1. Verificar uma última vez que nenhum código mobile importa de `packages/backend`:
   ```bash
   grep -rn "packages/backend\|@99-pai/backend" packages/mobile/src/ --include="*.ts" --include="*.tsx"
   ```
2. Deletar a pasta inteira `packages/backend/`

- [ ] Concluído

---

### Task 8.2 — Limpar `package.json` raiz

**Arquivo:** `package.json` (raiz)

**Remover scripts relacionados ao backend:**
- `start:backend`
- `dev:backend`
- `build:backend`
- `test:backend`
- Qualquer script que referencie `packages/backend`

**Remover dependências do workspace** que referenciem backend (se houver).

- [ ] Concluído

---

### Task 8.3 — Limpar `vercel.json`

**Arquivo:** `vercel.json` (raiz)

**O que fazer:**
- Remover configurações de build/deploy do backend
- Se `vercel.json` era exclusivo para o backend: deletar ou adaptar para Edge Functions

- [ ] Concluído

---

### Task 8.4 — Atualizar CI/CD (GitHub Actions)

**Arquivos:** `.github/workflows/ci.yml`, `.github/workflows/deploy-vercel.yml`

**O que fazer:**
- Remover jobs/steps que fazem build/test do backend
- Remover deploys para `99pai-api.vercel.app`
- Considerar adicionar deploy de Edge Functions:
  ```yaml
  - name: Deploy Edge Functions
    run: npx supabase functions deploy --all
  ```

- [ ] Concluído

---

### Task 8.5 — Limpar variáveis de ambiente obsoletas

**Remover do `.env.example` e Vercel Dashboard:**
- `JWT_SECRET` (não mais necessário — Supabase Auth gerencia tokens)
- `PORT` (não mais necessário — sem servidor)
- `CORS_ORIGINS` (não mais necessário — sem servidor)

**Manter:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (para Edge Functions)
- Todas as chaves TTS (OpenRouter, OpenAI, Google)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Adicionar ao `.env.example`:**
```env
# Edge Functions (configurar via `supabase secrets set`)
# OPENROUTER_API_KEY, OPENAI_API_KEY, GOOGLE_TTS_CREDENTIALS_JSON
# LINK_CODE_TTL_HOURS=24
```

- [ ] Concluído

---

### Task 8.6 — Derrubar deploy Vercel do backend

**Ação manual no Vercel Dashboard:**
1. Ir a `99pai-api.vercel.app`
2. Settings → Delete Project (ou desativar)

**OU** via CLI:
```bash
npx vercel rm 99pai-api --yes
```

- [ ] Concluído

---

### Task 8.7 — Atualizar GitHub Actions keep-alive (se existir)

**Verificar:** O cron job do GitHub Actions que faz health check no backend precisa ser atualizado ou removido.

**Arquivo:** `.github/workflows/ci.yml` (ou similar)

**Se existe:** Remover ou redirecionar para health check do Supabase.

- [ ] Concluído

---

### Task 8.8 — Limpar `packages/shared` (se necessário)

**Verificar:** Se `packages/shared` tinha tipos/utils usados apenas pelo backend, remover.

**Manter:** Tipos gerados pelo `supabase gen types` que são usados pelo mobile.

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] `packages/backend/` não existe mais
2. [ ] `npm run` na raiz não tem scripts de backend
3. [ ] CI/CD não tenta buildar backend
4. [ ] `99pai-api.vercel.app` retorna 404 ou está removido
5. [ ] `.env.example` reflete apenas variáveis necessárias
6. [ ] App mobile continua funcionando perfeitamente
7. [ ] Atualizar `RALPH_MEMORY.md` → Loop 08 → Status
8. [ ] Commit: `feat(migration): loop-08 decommission nestjs backend`
