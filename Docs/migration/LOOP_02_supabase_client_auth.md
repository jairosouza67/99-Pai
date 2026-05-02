# 🔁 RALPH LOOP 02 — Supabase Client & Auth Nativa no Mobile

> **Objetivo:** Instalar o SDK do Supabase no mobile, configurar o cliente, e migrar o fluxo de autenticação de axios/JWT customizado para Supabase Auth nativo.
> **Risco:** 🟠 ALTO — Fluxo de auth é core do app
> **Esforço estimado:** 3-4 horas
> **Pré-requisitos:** Loop 01 concluído (utilizadores migrados para auth.users)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

**Estado atual do mobile:**
- Usa `axios` via `src/services/api.ts` para todas as chamadas HTTP
- Auth tokens geridos manualmente via `src/lib/authStorage.ts` (SecureStore/AsyncStorage)
- `@supabase/supabase-js` **NÃO está instalado** no mobile
- `@react-native-async-storage/async-storage` **já está instalado** (2.2.0)

**Estado alvo:**
- `src/lib/supabase.ts` inicializa o cliente Supabase
- Auth via `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`
- Sessão gerida automaticamente pelo SDK (AsyncStorage)
- `authStorage.ts` eliminado

---

## ✅ Checklist de Tarefas

### Task 2.1 — Instalar @supabase/supabase-js no mobile

**O que fazer:**
```bash
cd packages/mobile
npm install @supabase/supabase-js
```

**Verificação:**
```bash
grep "supabase" packages/mobile/package.json
# Esperado: "@supabase/supabase-js": "^2.x.x"
```

- [ ] Concluído

---

### Task 2.2 — Criar `src/lib/supabase.ts`

**Arquivo:** `packages/mobile/src/lib/supabase.ts`

**O que fazer:**
```typescript
import 'react-native-url-polyfill/dist/polyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para React Native
  },
});
```

**Dependência extra necessária:**
```bash
npm install react-native-url-polyfill
```

**Variáveis de ambiente a adicionar no `.env` do mobile:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**ATENÇÃO:** Usar `ANON_KEY`, **NUNCA** `SERVICE_ROLE_KEY` no mobile.

- [ ] Concluído

---

### Task 2.3 — Migrar fluxo de Signup

**Arquivos a modificar:** Tela de signup no mobile (localizar via grep `signUp\|signup\|api.post.*signup`)

**Substituir:**
```typescript
// ANTES (axios)
const response = await api.post('/signup', { email, password, name, role });
const { token } = response.data;
await authStorage.saveToken(token);
```

**Por:**
```typescript
// DEPOIS (Supabase Auth)
import { supabase } from '../lib/supabase';

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name, nickname, role }, // Vai para user_metadata
  },
});

if (error) throw new Error(error.message);
// Sessão é persistida automaticamente pelo SDK
```

- [ ] Concluído

---

### Task 2.4 — Migrar fluxo de Login

**Substituir:**
```typescript
// ANTES (axios)
const response = await api.post('/auth/login', { email, password });
const { access_token } = response.data;
await authStorage.saveToken(access_token);
setAuthToken(access_token);
```

**Por:**
```typescript
// DEPOIS (Supabase Auth)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) throw new Error(error.message);
// Sessão gerida automaticamente — access_token + refresh_token
```

- [ ] Concluído

---

### Task 2.5 — Atualizar contexto/estado de Auth

**O que fazer:**
1. Localizar o contexto de auth (provavelmente em `src/contexts/` ou store zustand)
2. Substituir lógica de verificação de sessão:

```typescript
// DEPOIS
import { supabase } from '../lib/supabase';

// Escutar mudanças de sessão
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    setUser(session.user);
    setIsAuthenticated(true);
  } else {
    setUser(null);
    setIsAuthenticated(false);
  }
});

// Obter sessão atual (ao iniciar app)
const { data: { session } } = await supabase.auth.getSession();
```

3. Substituir `authStorage.getToken()` por `supabase.auth.getSession()`
4. Substituir `authStorage.removeToken()` por `supabase.auth.signOut()`

- [ ] Concluído

---

### Task 2.6 — Remover `authStorage.ts`

**Arquivo:** `packages/mobile/src/lib/authStorage.ts`

**O que fazer:**
1. Verificar que NENHUM import referencia `authStorage`:
   ```bash
   grep -r "authStorage" packages/mobile/src/ --include="*.ts" --include="*.tsx"
   ```
2. Se nenhum import restante: deletar o ficheiro
3. Remover `setAuthToken` de `api.ts` (não será mais necessário com Supabase)

- [ ] Concluído

---

### Task 2.7 — Atualizar `.env.example` com variáveis Supabase Mobile

**Arquivo:** `.env.example` (raiz)

**Adicionar:**
```env
# Mobile — Supabase (chaves públicas, seguras para o cliente)
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>  # Chave pública — segura para mobile
```

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] App compila sem erros (`npx expo start`)
2. [ ] Signup cria utilizador em `auth.users` (verificar no Supabase Dashboard)
3. [ ] Login funciona com senha existente
4. [ ] Logout limpa sessão
5. [ ] Reabrir app mantém sessão (persistência via AsyncStorage)
6. [ ] Nenhum import de `authStorage` restante no código
7. [ ] Atualizar `RALPH_MEMORY.md` → Loop 02 → Status
8. [ ] Commit: `feat(migration): loop-02 supabase client and native auth in mobile`
