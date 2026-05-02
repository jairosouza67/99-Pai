# 🔁 RALPH LOOP 03 — RLS Policies Completas (Modelo Cuidador/Idoso)

> **Objetivo:** Criar todas as RLS policies necessárias para que o mobile acesse dados diretamente via Supabase SDK com `ANON_KEY`, respeitando o modelo de acesso cuidador/idoso.
> **Risco:** 🔴 CRÍTICO — Policies mal configuradas = dados expostos ou acesso negado
> **Esforço estimado:** 6-8 horas
> **Pré-requisitos:** Loop 01 concluído (utilizadores em auth.users)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

**Estado atual:**
- RLS está **habilitado** em 13 tabelas (migration 0002)
- Apenas 1 policy existe: categorias leitura pública
- Backend usa `SERVICE_ROLE_KEY` (bypassa RLS) — quando o mobile acessar direto com `ANON_KEY`, TODAS as queries serão bloqueadas sem policies

**Modelo de acesso do app:**
- **Idoso** (`role = 'elderly'`): Acessa seus próprios dados via `elderlyprofile`
- **Cuidador** (`role = 'caregiver'`): Acessa dados dos idosos vinculados via `caregiverlink`
- A maioria dos services verifica: "Esse userId é dono OU é cuidador vinculado?"

**Relação entre tabelas:**
```
auth.users → user (1:1 via email ou user_id_mapping)
user → elderlyprofile (1:1, user.id = elderlyprofile.userId)
user → caregiverlink (1:N, caregiverlink.caregiverId = user.id)
caregiverlink → elderlyprofile (N:1, caregiverlink.elderlyProfileId = elderlyprofile.id)
elderlyprofile → medication, contact, agendaevent, interactionlog, etc.
```

---

## ✅ Checklist de Tarefas

### Task 3.1 — Criar função SQL helper para verificar acesso

**O que fazer:** Criar uma função reutilizável que verifica se o `auth.uid()` tem acesso a um `elderlyProfileId`:

```sql
-- Migration: 0007_rls_access_helpers
CREATE OR REPLACE FUNCTION public.has_access_to_elderly_profile(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se é o próprio idoso
  IF EXISTS (
    SELECT 1 FROM public.elderlyprofile ep
    JOIN public."user" u ON u.id = ep."userId"
    JOIN public.user_id_mapping m ON m.legacy_id = u.id
    WHERE ep.id = profile_id AND m.auth_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Verifica se é cuidador vinculado
  IF EXISTS (
    SELECT 1 FROM public.caregiverlink cl
    JOIN public.user_id_mapping m ON m.legacy_id = cl."caregiverId"
    WHERE cl."elderlyProfileId" = profile_id
      AND m.auth_id = auth.uid()
      AND cl.status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**NOTA:** Após a migração de FKs (quando `user.id` = `auth.uid()` diretamente), simplificar esta função.

- [ ] Concluído

---

### Task 3.2 — Policies para tabela `user`

```sql
-- Utilizador pode ler seus próprios dados
CREATE POLICY "Users can read own data"
ON public."user" FOR SELECT
TO authenticated
USING (
  id IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);

-- Utilizador pode atualizar seus próprios dados
CREATE POLICY "Users can update own data"
ON public."user" FOR UPDATE
TO authenticated
USING (
  id IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
)
WITH CHECK (
  id IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);
```

- [ ] Concluído

---

### Task 3.3 — Policies para tabela `elderlyprofile`

```sql
-- Idoso ou cuidador vinculado pode ler
CREATE POLICY "Owner or caregiver can read elderly profile"
ON public.elderlyprofile FOR SELECT
TO authenticated
USING (public.has_access_to_elderly_profile(id));

-- Apenas o próprio idoso pode atualizar
CREATE POLICY "Owner can update elderly profile"
ON public.elderlyprofile FOR UPDATE
TO authenticated
USING (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
)
WITH CHECK (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);
```

- [ ] Concluído

---

### Task 3.4 — Policies para tabelas dependentes de elderlyprofile

Aplicar o padrão `has_access_to_elderly_profile()` nas tabelas:

**`medication`:**
```sql
CREATE POLICY "Access own or linked medications"
ON public.medication FOR SELECT TO authenticated
USING (public.has_access_to_elderly_profile("elderlyProfileId"));

CREATE POLICY "Insert own medications"
ON public.medication FOR INSERT TO authenticated
WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

CREATE POLICY "Update own medications"
ON public.medication FOR UPDATE TO authenticated
USING (public.has_access_to_elderly_profile("elderlyProfileId"))
WITH CHECK (public.has_access_to_elderly_profile("elderlyProfileId"));

CREATE POLICY "Delete own medications"
ON public.medication FOR DELETE TO authenticated
USING (public.has_access_to_elderly_profile("elderlyProfileId"));
```

**Repetir o mesmo padrão para:**
- `contact` (mesma estrutura)
- `agendaevent` (mesma estrutura)
- `interactionlog` (mesma estrutura — apenas INSERT para idosos)
- `medicationhistory` (mesma estrutura)
- `callhistory` (mesma estrutura)

- [ ] Concluído

---

### Task 3.5 — Policies para `caregiverlink`

```sql
-- Cuidador pode ver seus próprios links
CREATE POLICY "Caregiver can read own links"
ON public.caregiverlink FOR SELECT TO authenticated
USING (
  "caregiverId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);

-- Idoso pode ver quem são seus cuidadores
CREATE POLICY "Elderly can read own links"
ON public.caregiverlink FOR SELECT TO authenticated
USING (
  public.has_access_to_elderly_profile("elderlyProfileId")
);
```

- [ ] Concluído

---

### Task 3.6 — Policies para `offering`, `offeringcontact`, `servicerequest`

```sql
-- Offerings: leitura pública para todos os authenticated
CREATE POLICY "Authenticated can read offerings"
ON public.offering FOR SELECT TO authenticated
USING (true);

-- Offerings: dono pode CRUD
CREATE POLICY "Owner can manage offerings"
ON public.offering FOR ALL TO authenticated
USING (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
)
WITH CHECK (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);

-- Service requests: envolvidos podem ver
CREATE POLICY "Involved parties can read requests"
ON public.servicerequest FOR SELECT TO authenticated
USING (
  "requesterId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
  OR "providerId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);
```

- [ ] Concluído

---

### Task 3.7 — Policies para `pushtoken`

```sql
-- Utilizador pode gerenciar seus próprios tokens
CREATE POLICY "Users can manage own push tokens"
ON public.pushtoken FOR ALL TO authenticated
USING (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
)
WITH CHECK (
  "userId" IN (SELECT legacy_id FROM public.user_id_mapping WHERE auth_id = auth.uid())
);
```

- [ ] Concluído

---

### Task 3.8 — Testar policies com Supabase CLI

**O que fazer:**
```bash
# Testar como utilizador autenticado (anon key + JWT)
supabase db test
```

Alternativamente, testar via SQL no Supabase Dashboard:
```sql
-- Simular request como utilizador específico
SET request.jwt.claims = '{"sub": "<auth-user-uuid>", "role": "authenticated"}';
SELECT * FROM public.medication; -- Deve retornar apenas dados acessíveis
```

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] Todas as 13 tabelas têm policies definidas
2. [ ] Testar SELECT como idoso → vê seus dados
3. [ ] Testar SELECT como cuidador → vê dados do idoso vinculado
4. [ ] Testar SELECT como utilizador não-vinculado → não vê nada
5. [ ] Testar INSERT/UPDATE/DELETE respeitam ownership
6. [ ] `categories` mantém leitura pública (policy existente)
7. [ ] Atualizar `RALPH_MEMORY.md` → Loop 03 → Status
8. [ ] Commit: `feat(migration): loop-03 complete RLS policies for caregiver/elderly model`
