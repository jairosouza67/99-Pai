# 🔁 RALPH LOOP 06 — Refatoração Mobile: CRUD Direto Supabase

> **Objetivo:** Substituir TODAS as chamadas axios (`api.get`, `api.post`, etc.) no mobile por operações diretas do Supabase SDK (`supabase.from().select()`, `.insert()`, etc.).
> **Risco:** 🟡 MÉDIO — Alto volume de alterações mas cada uma é mecânica
> **Esforço estimado:** 8-12 horas
> **Pré-requisitos:** Loops 02 (auth no mobile) e 03 (RLS policies) concluídos

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

**Estado atual:**
- Mobile usa `axios` via `api.ts` para todos os CRUDs
- Chamadas dispersas por telas/componentes (não apenas em `services/`)
- O backend faz queries via `supabase.from()` e retorna JSON — o mobile fará o mesmo diretamente

**Passos por recurso:**
1. Localizar todas as chamadas `api.get('/resource')`, `api.post('/resource')`, etc.
2. Substituir por `supabase.from('table').select()`, `.insert()`, `.update()`, `.delete()`
3. Ajustar tipagem (usar tipos gerados por `supabase gen types`)

---

## ✅ Checklist de Tarefas

### Task 6.1 — Gerar tipos TypeScript do banco

**O que fazer:**
```bash
npx supabase gen types typescript --project-id <project-ref> > packages/shared/src/types/database.ts
```

**Alternativa local:**
```bash
npx supabase gen types typescript --local > packages/shared/src/types/database.ts
```

Depois, atualizar o cliente Supabase no mobile:
```typescript
import { Database } from '@99-pai/shared/types/database';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, { ... });
```

- [ ] Concluído

---

### Task 6.2 — Auditar todas as chamadas axios no mobile

**O que fazer:**
```bash
grep -rn "api\.\(get\|post\|put\|patch\|delete\)" packages/mobile/src/ --include="*.ts" --include="*.tsx"
```

**Criar lista de todas as chamadas encontradas e agrupar por recurso.**

Resultado esperado (exemplo):
```
src/screens/MedicationsScreen.tsx:  api.get('/medications/...')
src/screens/MedicationsScreen.tsx:  api.post('/medications', ...)
src/screens/ContactsScreen.tsx:     api.get('/contacts/...')
...
```

- [ ] Concluído

---

### Task 6.3 — Migrar Medications

**Padrão de substituição:**

```typescript
// ANTES
const response = await api.get(`/medications/${elderlyProfileId}`);
const medications = response.data;

// DEPOIS
import { supabase } from '../lib/supabase';

const { data: medications, error } = await supabase
  .from('medication')
  .select('*')
  .eq('elderlyProfileId', elderlyProfileId)
  .order('createdAt', { ascending: false });

if (error) throw new Error(error.message);
```

**Operações a migrar:**
- GET medications → `.select()`
- POST medication → `.insert()`
- PUT medication → `.update().eq('id', id)`
- DELETE medication → `.delete().eq('id', id)`
- POST confirm medication → `.update({ confirmed: true }).eq('id', id)`
- GET medication history → `.from('medicationhistory').select().eq(...)`

- [ ] Concluído

---

### Task 6.4 — Migrar Contacts

Mesmo padrão da Task 6.3:
- GET contacts → `.from('contact').select()`
- POST contact → `.insert()`
- PUT contact → `.update().eq('id', id)`
- DELETE contact → `.delete().eq('id', id)`

- [ ] Concluído

---

### Task 6.5 — Migrar Agenda

- GET agenda events → `.from('agendaevent').select().gte('date', from).lte('date', to)`
- POST event → `.insert()`
- PUT event → `.update().eq('id', id)`
- DELETE event → `.delete().eq('id', id)`

- [ ] Concluído

---

### Task 6.6 — Migrar Categories

- GET all categories → `.from('category').select('*, subcategories:category(*)').is('parentId', null)`
- GET category by ID → `.from('category').select().eq('id', id).single()`

**Nota:** Categories são leitura pública — policy já existe.

- [ ] Concluído

---

### Task 6.7 — Migrar Offerings

- GET offerings → `.from('offering').select('*, user(*), category(*)')`
- GET offering by ID → `.select().eq('id', id).single()`
- POST offering → `.insert()`
- PUT offering → `.update().eq('id', id)`
- DELETE offering → `.delete().eq('id', id)`

- [ ] Concluído

---

### Task 6.8 — Migrar Elderly Profile

- GET profile → `.from('elderlyprofile').select().eq('userId', userId).single()`
- PUT profile → `.update().eq('id', id)`

- [ ] Concluído

---

### Task 6.9 — Migrar Interactions

- POST interaction → `.from('interactionlog').insert()`

- [ ] Concluído

---

### Task 6.10 — Criar services/supabase-queries.ts (opcional)

**Decisão:** Centralizar queries em ficheiro(s) de serviço ou manter inline nas telas?

**Recomendação:** Criar um ficheiro `services/supabase-queries.ts` com funções tipadas:
```typescript
export async function getMedications(elderlyProfileId: string) {
  const { data, error } = await supabase
    .from('medication')
    .select('*')
    .eq('elderlyProfileId', elderlyProfileId);
  if (error) throw error;
  return data;
}
```

Isso facilita manutenção e testing.

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] ZERO chamadas `api.get/post/put/delete` restantes (exceto voice e weather — Loop 07)
2. [ ] App compila sem erros
3. [ ] Testar cada fluxo CRUD: medications, contacts, agenda, categories, offerings, elderly profile
4. [ ] Verificar que RLS bloqueia acesso a dados de outros utilizadores
5. [ ] Atualizar `RALPH_MEMORY.md` → Loop 06 → Status
6. [ ] Commit: `feat(migration): loop-06 replace axios crud with supabase direct queries`
