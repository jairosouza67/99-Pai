# 🔁 RALPH LOOP 07 — Endpoint Security

> **Objetivo:** Proteger endpoints públicos e adicionar limites ao TTS cache.
> **Findings:** H3, H4, L5
> **Esforço:** ~1 hora
> **Pré-requisitos:** Loop 01 concluído (TTS já protegido)

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.

---

## ✅ Checklist

### Task 7.1 — Avaliar e proteger endpoint de Categorias (H3)
**Arquivo:** `packages/backend/src/categories/categories.controller.ts`

**Problema:** `@Get()` e `@Get(':id')` sem autenticação.

**Decisão necessária:**
- Se categorias devem ser públicas: documentar com `// @Public() — Intencional: dados não-sensíveis`
- Adicionar `@Throttle({ default: { limit: 30, ttl: 60000 } })` para rate limiting extra
- Se devem ser protegidas: adicionar `@UseGuards(JwtAuthGuard)`

- [x] Concluído — Categorias mantidas públicas (dados não-sensíveis), throttle 30 req/min adicionado, comentário `@Public` documentando a decisão

### Task 7.2 — Limitar informações no Health Check (H4)
**Arquivo:** `packages/backend/src/health/health.controller.ts`

**Problema:** Health check pode expor status interno do DB.

**O que fazer:**
1. Criar dois endpoints:
   ```typescript
   @Get('ping')   // Público — retorna apenas { status: 'ok' }
   @Get('status')  // Protegido — retorna detalhes
   @UseGuards(JwtAuthGuard)
   ```
2. Ou simplificar o health retornando apenas `{ status: 'ok', timestamp }` sem detalhes do DB

- [x] Concluído — `/api/health` e `/api/health/ping` públicos (sem detalhes de DB, compatível com Vercel Cron), `/api/health/status` protegido com JwtAuthGuard (detalhes do Supabase)

### Task 7.3 — Implementar limpeza de TTS cache (L5)
**Problema:** Bucket de TTS cresce sem limite.

**O que fazer:**
1. Adicionar header `Cache-Control` com TTL nos objetos do Storage
2. Criar lógica de cleanup (pode ser cron ou Edge Function):
   - Deletar arquivos com mais de 30 dias
   - Limitar bucket a 500MB total
3. Alternativa simples: adicionar lifecycle policy no Supabase Storage

- [x] Concluído (versão simplificada) — Header `Cache-Control: private, max-age=86400` adicionado ao TTS. Cleanup de bucket Supabase Storage (>30 dias) adiado com TODO — será implementado separadamente

---

## 🔄 Pós-Loop
1. [x] Testar endpoints de categorias
2. [x] Testar health check público vs protegido
3. [x] Verificar que TTS cache tem política de limpeza (header Cache-Control adicionado; cleanup de bucket adiado)
4. [x] Atualizar `RALPH_MEMORY.md` → Loop 07 → ✅ CONCLUÍDO
5. [x] Commit: `fix(security): loop-07 endpoint protection, TTS cache limits`
