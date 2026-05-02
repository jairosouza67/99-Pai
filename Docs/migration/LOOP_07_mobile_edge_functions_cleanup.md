# 🔁 RALPH LOOP 07 — Refatoração Mobile: Edge Functions & Limpeza

> **Objetivo:** Conectar o mobile às Edge Functions (TTS, Weather, Caregiver, Service Requests), remover axios e limpar dependências obsoletas.
> **Risco:** 🟡 MÉDIO — Alterações mecânicas com verificação simples
> **Esforço estimado:** 3-4 horas
> **Pré-requisitos:** Loops 04, 05 e 06 concluídos

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## ✅ Checklist de Tarefas

### Task 7.1 — Migrar `voice.ts` para Edge Function

**Arquivo:** `packages/mobile/src/services/voice.ts`

**Substituir chamada TTS:**
```typescript
// ANTES (axios para NestJS)
const response = await api.get('/voice/tts', { params: { text } });

// DEPOIS (Edge Function)
import { supabase } from '../lib/supabase';

const { data, error } = await supabase.functions.invoke('voice-tts', {
  body: { text },
});

if (error) throw new Error(error.message);
const audioUrl = data.url;
```

**ATENÇÃO:** Manter toda a lógica local de reprodução (`expo-av`, `expo-speech`, `@react-native-voice/voice`). Apenas a parte de geração remota de áudio muda.

- [ ] Concluído

---

### Task 7.2 — Migrar Weather para Edge Function

**Localizar** chamadas de weather no mobile e substituir:
```typescript
// ANTES
const response = await api.get('/weather', { params: { location } });

// DEPOIS
const { data, error } = await supabase.functions.invoke('weather-get', {
  body: { location },
});
```

- [ ] Concluído

---

### Task 7.3 — Migrar Caregiver Link para Edge Function

**Substituir:**
```typescript
// ANTES
await api.post('/caregiver/generate-link-code');
await api.post('/caregiver/link', { linkCode });

// DEPOIS
await supabase.functions.invoke('caregiver-link', {
  body: { action: 'generate-link-code' },
});

await supabase.functions.invoke('caregiver-link', {
  body: { action: 'link-caregiver', linkCode },
});
```

- [ ] Concluído

---

### Task 7.4 — Migrar Service Requests para Edge Function

```typescript
// ANTES
await api.post('/service-requests', requestData);
await api.patch(`/service-requests/${id}/status`, { status });

// DEPOIS
await supabase.functions.invoke('service-request-validate', {
  body: { action: 'create', ...requestData },
});

await supabase.functions.invoke('service-request-validate', {
  body: { action: 'update-status', id, status },
});
```

**Nota:** Leituras de service requests (GET) podem ser feitas via Supabase direto (RLS do Loop 03). Apenas criação e mudança de status passam pela Edge Function.

- [ ] Concluído

---

### Task 7.5 — Migrar Notifications (Push Token)

**Decisão do Loop 05:** Verificar `RALPH_MEMORY.md` — se decidido usar RLS direto:
```typescript
// Via Supabase direto
await supabase.from('pushtoken').upsert({
  userId: user.id,
  token: pushToken,
  platform: Platform.OS,
});
```

**Se decidido usar Edge Function:**
```typescript
await supabase.functions.invoke('notification-register', {
  body: { action: 'register-token', pushToken, platform: Platform.OS },
});
```

- [ ] Concluído

---

### Task 7.6 — Remover `api.ts` e dependência axios

**O que fazer:**
1. Verificar que ZERO chamadas a `api.*` restam:
   ```bash
   grep -rn "from.*services/api\|from.*api'" packages/mobile/src/ --include="*.ts" --include="*.tsx"
   ```
2. Se zero: deletar `packages/mobile/src/services/api.ts`
3. Remover axios:
   ```bash
   cd packages/mobile
   npm uninstall axios
   ```
4. Verificar que nenhum import de `axios` resta:
   ```bash
   grep -rn "axios" packages/mobile/src/ --include="*.ts" --include="*.tsx"
   ```

- [ ] Concluído

---

### Task 7.7 — Limpar imports e dependências obsoletas

**Verificar e remover se não usados:**
- `setAuthToken` (de api.ts — já removido)
- `getApiErrorMessage` (de api.ts — substituir por handler genérico)
- Qualquer referência ao `baseURL` do NestJS

**Criar handler de erro Supabase (substituir `getApiErrorMessage`):**
```typescript
export const getSupabaseErrorMessage = (error: any, fallback: string): string => {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};
```

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] ZERO imports de `axios` ou `api.ts` no código
2. [ ] `axios` removido do `package.json` do mobile
3. [ ] TTS funciona via Edge Function
4. [ ] Weather funciona via Edge Function
5. [ ] Caregiver link funciona via Edge Function
6. [ ] Service requests funcionam via Edge Function
7. [ ] App compila e funciona end-to-end
8. [ ] Atualizar `RALPH_MEMORY.md` → Loop 07 → Status
9. [ ] Commit: `feat(migration): loop-07 connect mobile to edge functions, remove axios`
