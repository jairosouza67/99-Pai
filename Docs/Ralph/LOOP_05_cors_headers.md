# 🔁 RALPH LOOP 05 — CORS & Headers Hardening

> **Objetivo:** Endurecer CORS e headers HTTP para produção.
> **Findings:** M1, M2, M3
> **Esforço:** ~30-45 min
> **Pré-requisitos:** Loops 01-03 concluídos

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.

---

## ✅ Checklist

### Task 5.1 — Bloquear requests sem origin em produção (M1)
**Arquivo:** `packages/backend/src/bootstrap-config.ts` (~L33)

**Problema:** `if (!origin) callback(null, true)` permite requests server-to-server sem restrição.

**O que fazer:**
```typescript
if (!origin) {
  // Em produção, bloquear. Em dev, permitir (Postman, cURL)
  if (process.env.NODE_ENV === 'production') {
    callback(new Error('CORS: origin required'), false);
    return;
  }
  callback(null, true);
  return;
}
```

**⚠️ Cuidado:** Isso pode quebrar health checks do Vercel. Verificar se `/api/health` precisa de exceção.

- [x] Concluído

### Task 5.2 — Restringir regex de preview deployments (M2)
**Arquivo:** `packages/backend/src/bootstrap-config.ts` (~L39)

**Problema:** Regex `99pai-[a-z0-9-]+` é muito ampla.

**O que fazer:**
- Considerar manter apenas origins explícitas + flag de dev
- Ou adicionar limite de comprimento ao regex: `99pai-[a-z0-9]{1,20}-jairosouza67...`

- [x] Concluído

### Task 5.3 — Restringir `crossOriginResourcePolicy` (M3)
**Arquivo:** `packages/backend/src/bootstrap-config.ts` (~L62)

**Problema:** `crossOriginResourcePolicy: 'cross-origin'` aplicado globalmente.

**O que fazer:**
- Aplicar apenas nas rotas que precisam (TTS/voice)
- Rotas padrão usam `same-origin`
- Middleware condicional ou header override no VoiceController

- [x] Concluído

---

## 🔄 Pós-Loop
1. [x] Testar CORS do frontend em produção
2. [x] Testar que preview deployments ainda funcionam
3. [x] Testar TTS com CORS restrito
4. [x] Atualizar `RALPH_MEMORY.md` → Loop 05 → ✅ CONCLUÍDO
5. [x] Commit: `fix(security): loop-05 CORS and headers hardening`
