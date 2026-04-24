# 🔁 RALPH LOOP 01 — Quick Wins Críticos

> **Objetivo:** Corrigir as vulnerabilidades mais urgentes que levam menos de 5 minutos cada.
> **Findings:** C3, M4, M7
> **Esforço estimado:** ~15 minutos
> **Pré-requisitos:** Nenhum

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Ralph/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## ✅ Checklist de Tarefas

### Task 1.1 — Proteger endpoint `/api/voice/tts` (C3 — CRITICAL)

**Arquivo:** `packages/backend/src/voice/voice.controller.ts`

**Problema:** O endpoint TTS está totalmente aberto, sem `@UseGuards(JwtAuthGuard)`. Qualquer pessoa na internet pode gerar áudio consumindo APIs pagas (OpenRouter, OpenAI, Google Cloud TTS).

**O que fazer:**
1. Abrir `packages/backend/src/voice/voice.controller.ts`
2. Importar `JwtAuthGuard` (se não estiver importado):
   ```typescript
   import { JwtAuthGuard } from '../auth/jwt-auth.guard';
   ```
3. Adicionar `@UseGuards(JwtAuthGuard)` no controller ou no método `tts`:
   ```typescript
   @UseGuards(JwtAuthGuard)
   @Get('tts')
   async tts(@Query() query: TtsQueryDto, @Res() response: Response) {
   ```
4. Testar que o endpoint agora retorna `401 Unauthorized` sem JWT

**Verificação:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://99pai-api.vercel.app/api/voice/tts?text=test
# Esperado: 401
```

- [x] Concluído

---

### Task 1.2 — Adicionar `.env.production` ao `.gitignore` (M4 — MEDIUM)

**Arquivo:** `.gitignore` (raiz)

**Problema:** O arquivo `.env.production` contém VERCEL_OIDC_TOKEN e não está explicitamente listado no `.gitignore`.

**O que fazer:**
1. Abrir `.gitignore` na raiz do projeto
2. Localizar a seção de env files
3. Adicionar estas linhas (se não existirem):
   ```gitignore
   .env.production
   .env.production.local
   ```
4. Verificar se `packages/backend/.env.production` e `packages/mobile/.env.production` estão cobertos

**Verificação:**
```bash
git status --short | Select-String ".env.production"
# Não deve listar nenhum arquivo .env.production
```

- [x] Concluído

---

### Task 1.3 — Remover `nestjs-core-11.0.1.tgz` suspeito (M7 — MEDIUM)

**Arquivo:** `nestjs-core-11.0.1.tgz` (raiz)

**Problema:** Arquivo `.tgz` de pacote npm na raiz. Pode ser uma versão modificada do NestJS core. Não deveria existir no repositório.

**O que fazer:**
1. Verificar se algum `package.json` referencia este arquivo:
   ```bash
   grep -r "nestjs-core-11.0.1.tgz" . --include="*.json"
   ```
2. Se nenhuma referência: remover o arquivo
   ```bash
   Remove-Item "nestjs-core-11.0.1.tgz"
   ```
3. Adicionar `*.tgz` ao `.gitignore`:
   ```gitignore
   *.tgz
   ```

**Verificação:**
```bash
Test-Path "nestjs-core-11.0.1.tgz"
# Esperado: False
```

- [x] Concluído

---

## 🔄 Pós-Loop

1. [x] Rodar `npm run build` no backend para verificar compilação
2. [ ] Rodar o servidor localmente e testar os endpoints afetados
3. [x] Atualizar `RALPH_MEMORY.md` → Loop 01 → Status: ✅ CONCLUÍDO
4. [ ] Fazer commit: `fix(security): loop-01 quick wins — protect TTS, gitignore, remove tgz`
