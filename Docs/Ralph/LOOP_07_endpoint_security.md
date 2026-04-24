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

- [ ] Concluído

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

- [ ] Concluído

### Task 7.3 — Implementar limpeza de TTS cache (L5)
**Problema:** Bucket de TTS cresce sem limite.

**O que fazer:**
1. Adicionar header `Cache-Control` com TTL nos objetos do Storage
2. Criar lógica de cleanup (pode ser cron ou Edge Function):
   - Deletar arquivos com mais de 30 dias
   - Limitar bucket a 500MB total
3. Alternativa simples: adicionar lifecycle policy no Supabase Storage

- [ ] Concluído

---

## 🔄 Pós-Loop
1. [ ] Testar endpoints de categorias
2. [ ] Testar health check público vs protegido
3. [ ] Verificar que TTS cache tem política de limpeza
4. [ ] Atualizar `RALPH_MEMORY.md` → Loop 07 → ✅ CONCLUÍDO
5. [ ] Commit: `fix(security): loop-07 endpoint protection, TTS cache limits`
