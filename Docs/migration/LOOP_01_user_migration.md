# 🔁 RALPH LOOP 01 — Migração de Utilizadores para Supabase Auth

> **Objetivo:** Migrar todos os utilizadores existentes da tabela `user` (auth customizado com bcrypt) para o sistema nativo `auth.users` do Supabase, preservando senhas e IDs.
> **Risco:** 🔴 CRÍTICO — Se mal executado, todos os utilizadores perdem acesso.
> **Esforço estimado:** 4-6 horas
> **Pré-requisitos:** Nenhum (primeiro loop)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

O backend atual (`auth.service.ts`) implementa auth customizado:
- Signup: `bcrypt.hash(password, 12)` → armazenado na coluna `password` da tabela `user`
- Login: `bcrypt.compare(password, user.password)` → gera JWT com `JwtService`
- Tabela `user` tem campos: `id` (UUID), `email`, `password`, `name`, `nickname`, `role`, etc.

O Supabase Auth usa a tabela interna `auth.users` com seu próprio sistema de hashing.
A API Admin do Supabase permite importar utilizadores com hashes bcrypt existentes.

---

## ✅ Checklist de Tarefas

### Task 1.1 — Inventariar utilizadores existentes

**O que fazer:**
1. Contar total de utilizadores na tabela `user`:
   ```sql
   SELECT count(*), role FROM public."user" GROUP BY role;
   ```
2. Verificar se existem emails duplicados:
   ```sql
   SELECT email, count(*) FROM public."user" GROUP BY email HAVING count(*) > 1;
   ```
3. Verificar formato dos hashes bcrypt:
   ```sql
   SELECT id, email, LEFT(password, 7) as hash_prefix FROM public."user" LIMIT 5;
   -- Esperado: $2a$12$ ou $2b$12$ (bcrypt cost 12)
   ```

**Verificação:** Nenhum email duplicado. Todos os hashes começam com `$2a$` ou `$2b$`.

- [ ] Concluído

---

### Task 1.2 — Criar Edge Function de migração de utilizadores

**Pasta:** `supabase/functions/migrate-users/`

**O que fazer:**
1. Criar a Edge Function: `supabase functions new migrate-users`
2. Implementar lógica:
   ```typescript
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   Deno.serve(async (req) => {
     // Validar header de autorização (admin-only)
     const authHeader = req.headers.get('Authorization');
     const adminSecret = Deno.env.get('MIGRATION_ADMIN_SECRET');
     if (authHeader !== `Bearer ${adminSecret}`) {
       return new Response('Unauthorized', { status: 401 });
     }

     const supabaseAdmin = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
       { auth: { persistSession: false } }
     );

     // 1. Buscar todos os utilizadores da tabela "user"
     const { data: users, error } = await supabaseAdmin
       .from('user')
       .select('id, email, password, name, nickname, role');

     if (error) return new Response(JSON.stringify({ error }), { status: 500 });

     const results = [];
     for (const user of users) {
       // 2. Criar utilizador no auth.users preservando o hash bcrypt
       const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
         email: user.email,
         password: undefined, // Não passar password plain-text
         email_confirm: true,
         user_metadata: {
           name: user.name,
           nickname: user.nickname,
           role: user.role,
           legacy_id: user.id, // Preservar ID antigo para mapeamento
         },
       });

       results.push({
         email: user.email,
         success: !createError,
         error: createError?.message,
         new_id: data?.user?.id,
         legacy_id: user.id,
       });
     }

     return new Response(JSON.stringify({ results }), {
       headers: { 'Content-Type': 'application/json' },
     });
   });
   ```

**ATENÇÃO — Hashes bcrypt:**
A API `auth.admin.createUser()` do Supabase **não aceita hashes bcrypt diretamente** na API REST.
Alternativas:
1. **Opção A (Recomendada):** Inserção direta no `auth.users` via SQL com os hashes bcrypt existentes
2. **Opção B:** Usar a API REST com `password` e forçar reset de senha para todos

**Se Opção A for escolhida**, criar migration SQL em vez de Edge Function:
```sql
-- Migration: migrate_users_to_supabase_auth
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, confirmation_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  u.email,
  u.password, -- bcrypt hash existente é compatível!
  now(),
  u."createdAt",
  u."updatedAt",
  jsonb_build_object(
    'name', u.name,
    'nickname', u.nickname,
    'role', u.role,
    'legacy_id', u.id
  ),
  ''
FROM public."user" u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.email = u.email
);
```

**Decisão necessária:** Qual opção? Registrar no `RALPH_MEMORY.md`.

- [ ] Concluído

---

### Task 1.3 — Criar tabela de mapeamento de IDs

**O que fazer:**
Após a migração, os utilizadores terão IDs novos no `auth.users`. Precisamos de um mapeamento:

```sql
-- Migration: 0007_user_id_mapping
CREATE TABLE IF NOT EXISTS public.user_id_mapping (
  legacy_id UUID NOT NULL REFERENCES public."user"(id),
  auth_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (legacy_id)
);

CREATE UNIQUE INDEX idx_user_id_mapping_auth ON public.user_id_mapping(auth_id);

-- Habilitar RLS
ALTER TABLE public.user_id_mapping ENABLE ROW LEVEL SECURITY;
```

**Por quê:** Todas as tabelas existentes (medications, contacts, etc.) referenciam o `legacy_id`. Os loops seguintes (03, 06) precisarão desse mapeamento para atualizar as foreign keys.

- [ ] Concluído

---

### Task 1.4 — Executar migração e validar

**O que fazer:**
1. Executar a migration/script em ambiente de **staging** primeiro
2. Verificar contagem:
   ```sql
   SELECT count(*) FROM auth.users;
   SELECT count(*) FROM public."user";
   -- Devem ser iguais
   ```
3. Verificar que login funciona com senha antiga:
   ```bash
   curl -X POST https://<project-ref>.supabase.co/auth/v1/token?grant_type=password \
     -H "apikey: <ANON_KEY>" \
     -d '{"email": "test@example.com", "password": "SenhaAntiga123"}'
   ```
4. Popular tabela de mapeamento:
   ```sql
   INSERT INTO public.user_id_mapping (legacy_id, auth_id)
   SELECT u.id, au.id
   FROM public."user" u
   JOIN auth.users au ON au.email = u.email;
   ```

**Verificação:**
- Todos os utilizadores existem em `auth.users`
- Login com senha antiga funciona
- Tabela `user_id_mapping` está completa

- [ ] Concluído

---

### Task 1.5 — Atualizar foreign keys (opcional — pode ser feito no Loop 03)

**Decisão:** Se o esforço for baixo, atualizar as FKs agora. Caso contrário, adiar para Loop 03/06.

As tabelas que referenciam `user.id` precisarão apontar para `auth.users.id`:
- `elderlyprofile.userId`
- `caregiverlink.caregiverId`
- `medication.userId` (via elderlyprofile)
- `contact.userId` (via elderlyprofile)
- etc.

- [ ] Concluído (ou adiado)

---

## 🔄 Pós-Loop

1. [ ] Verificar que TODOS os utilizadores existem em `auth.users`
2. [ ] Testar login com senha antiga via Supabase Auth API
3. [ ] Confirmar tabela `user_id_mapping` completa
4. [ ] Atualizar `RALPH_MEMORY.md` → Loop 01 → Status
5. [ ] Commit: `feat(migration): loop-01 migrate users to supabase auth`
