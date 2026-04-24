# 🔁 RALPH LOOP 08 — Supply Chain & Dependencies

> **Objetivo:** Limpar vulnerabilidades em dependências e verificar configurações de produção.
> **Findings:** M5, L1
> **Esforço:** ~15-30 min
> **Pré-requisitos:** Loops 01-03 concluídos

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.

---

## ✅ Checklist

### Task 8.1 — Corrigir vulnerabilidades npm (M5)
**O que fazer:**
```bash
cd packages/backend
npm audit
npm audit fix
```
- Se `audit fix` não resolver: avaliar `--force` ou atualizar dependências manualmente
- Documentar vulnerabilidades que não podem ser corrigidas (transitive deps)

- [ ] Concluído

### Task 8.2 — Verificar NODE_ENV no Vercel (L1)
**Problema:** Swagger docs protegidos com `process.env.NODE_ENV !== 'production'`.

**O que fazer:**
1. Verificar no Vercel Dashboard que `NODE_ENV=production` está configurado
2. Acessar `https://99pai-api.vercel.app/api/docs` — deve retornar 404 em produção
3. Se Swagger estiver acessível: corrigir a variável

- [ ] Concluído

### Task 8.3 — Auditar dependências do mobile
```bash
cd packages/mobile
npx expo install --check
npm audit
```
- Verificar se há dependências com CVEs conhecidos

- [ ] Concluído

---

## 🔄 Pós-Loop
1. [ ] `npm audit` retorna 0 vulnerabilidades high/critical
2. [ ] Swagger inacessível em produção
3. [ ] Atualizar `RALPH_MEMORY.md` → Loop 08 → ✅ CONCLUÍDO
4. [ ] Commit: `fix(security): loop-08 dependency audit, env verification`
