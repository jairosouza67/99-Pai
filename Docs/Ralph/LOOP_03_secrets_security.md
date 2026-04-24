# 🔁 RALPH LOOP 03 — Secrets & Env Security

> **Objetivo:** Garantir que nenhum segredo esteja exposto e que o backend use credenciais de forma segura.
> **Findings:** C1, C2, L2
> **Esforço estimado:** ~1-2 horas
> **Pré-requisitos:** Loop 01 e 02 concluídos

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Ralph/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.
> ⚠️ Este loop envolve ações MANUAIS do usuário (rotacionar chaves no Supabase Dashboard). O agente deve GUIAR, não executar.

---

## ✅ Checklist de Tarefas

### Task 3.1 — Verificar histórico git do `.env` (C1 — CRITICAL)

**Problema:** O `.env` raiz contém todas as chaves sensíveis. Precisamos verificar se alguma vez foi commitado.

**O que fazer:**
1. Rodar:
   ```bash
   git log --all -p -- .env
   git log --all -p -- "*.env*"
   ```
2. Se retornar resultados (foi commitado):
   - **TODAS as chaves devem ser rotacionadas imediatamente**
   - Considerar usar `git filter-branch` ou `BFG Repo-Cleaner` para remover do histórico
3. Se não retornar resultados: as chaves estão seguras (mas devem ser rotacionadas por precaução)

**Ação manual do usuário:**
- [ ] Verificar se `.env` aparece no histórico git
- [ ] Se sim: rotacionar TODAS as chaves

- [ ] Concluído

---

### Task 3.2 — Rotacionar chaves do Supabase (C1 — CRITICAL)

**⚠️ AÇÃO MANUAL — O agente NÃO pode fazer isso.**

**O que fazer no Supabase Dashboard (https://supabase.com/dashboard):**
1. Ir em **Settings → API**
2. Gerar novas `anon key` e `service_role key`
3. Copiar as novas chaves
4. Atualizar no **Vercel Dashboard** (Settings → Environment Variables):
   - `SUPABASE_URL` — manter (não muda)
   - `SUPABASE_ANON_KEY` — colar nova chave
   - `SUPABASE_SERVICE_ROLE_KEY` — colar nova chave
5. Atualizar `.env` local com as novas chaves
6. Rotacionar `JWT_SECRET` — gerar novo com:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
7. Atualizar `JWT_SECRET` no Vercel e `.env` local
8. Rotacionar `OPENAI_API_KEY` no painel da OpenAI
9. Rotacionar `OPENROUTER_API_KEY` no painel do OpenRouter

**Verificação após rotação:**
```bash
npm run start:backend
# Testar que o backend conecta com as novas chaves
curl https://99pai-api.vercel.app/api/health
# Deve retornar 200
```

- [ ] Concluído

---

### Task 3.3 — Separar uso de SERVICE_ROLE_KEY vs ANON_KEY (C2 — CRITICAL)

**Arquivo:** `packages/backend/src/supabase/supabase.service.ts`

**Problema:** O backend usa `SERVICE_ROLE_KEY` para TUDO, bypassando RLS completamente.

**O que fazer:**
1. Abrir `packages/backend/src/supabase/supabase.service.ts`
2. Criar DOIS clientes Supabase:
   ```typescript
   // Cliente público — respeita RLS
   private readonly publicClient: SupabaseClient<Database>;
   
   // Cliente admin — bypassa RLS (APENAS para operações admin)
   private readonly adminClient: SupabaseClient<Database>;
   ```
3. O `publicClient` usa `SUPABASE_ANON_KEY`
4. O `adminClient` usa `SUPABASE_SERVICE_ROLE_KEY`
5. Expor métodos separados:
   ```typescript
   getPublicClient(): SupabaseClient<Database> { return this.publicClient; }
   getAdminClient(): SupabaseClient<Database> { return this.adminClient; }
   ```
6. Auditar TODOS os usos do `SupabaseService` no codebase:
   - Operações de leitura de dados do usuário → `publicClient`
   - Signup/operações admin → `adminClient`
   - TTS cache/storage → `adminClient` (aceitável para operações de storage)

**⚠️ Decisão importante:** Para que o `publicClient` respeite RLS, precisamos passar o JWT do usuário via `supabase.auth.setSession()`. Isso requer refatoração mais profunda. Registrar decisão no `RALPH_MEMORY.md`.

**Alternativa simples (recomendada para agora):**
- Manter o `SERVICE_ROLE_KEY` mas documentar que o backend é o "trust boundary"
- Garantir que TODOS os endpoints tenham `@UseGuards(JwtAuthGuard)` antes de acessar dados
- A separação de clientes fica para uma fase posterior

**Verificação:**
- Build sem erros
- Todos os endpoints protegidos funcionam normalmente

- [ ] Concluído

---

### Task 3.4 — Corrigir ConfigModule envFilePath (L2 — LOW)

**Arquivo:** `packages/backend/src/app.module.ts`

**Problema:** `envFilePath` aponta para path relativo `join(__dirname, '../../../.env')` que pode não funcionar em serverless (Vercel).

**O que fazer:**
1. Abrir `packages/backend/src/app.module.ts`
2. Alterar para usar fallback:
   ```typescript
   ConfigModule.forRoot({
     isGlobal: true,
     envFilePath: process.env.NODE_ENV === 'production'
       ? undefined  // Em produção, usa env vars do runtime
       : join(__dirname, '../../../.env'),
   }),
   ```

**Verificação:**
- Servidor local funciona normalmente
- Deploy no Vercel funciona normalmente

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] Verificar que NENHUMA chave antiga funciona
2. [ ] Testar todos os fluxos (signup, login, TTS) com as novas chaves
3. [ ] Deploy no Vercel com as novas env vars
4. [ ] Atualizar `RALPH_MEMORY.md` → Loop 03 → Status: ✅ CONCLUÍDO
5. [ ] Commit: `fix(security): loop-03 secrets rotation, env hardening`
