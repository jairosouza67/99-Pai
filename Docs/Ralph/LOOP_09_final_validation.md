# 🔁 RALPH LOOP 09 — Validação Final & Reauditoria

> **Objetivo:** Executar auditoria completa final para confirmar que todos os findings foram corrigidos.
> **Findings:** Todos (validação)
> **Esforço:** ~1 hora
> **Pré-requisitos:** TODOS os loops anteriores concluídos

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.
> Este loop é de VALIDAÇÃO — não implementa nada novo.

---

## ✅ Checklist de Validação

### Fase 1 — Verificação de Código

- [ ] Rodar `npm run build` no backend sem erros
- [ ] Rodar `npm audit` — zero high/critical
- [ ] Verificar que TODOS os endpoints sensíveis têm `@UseGuards`
- [ ] Verificar que `.env.production` NÃO está no git
- [ ] Verificar que `nestjs-core-11.0.1.tgz` foi removido
- [ ] Verificar que bcrypt cost ≥ 12
- [ ] Verificar que password policy exige 8+ chars com complexidade
- [ ] Verificar que emails estão mascarados nos logs
- [ ] Verificar que request ID é validado como UUID

### Fase 2 — Testes de Penetração Básicos

```bash
# TTS sem auth — deve retornar 401
curl -s -o /dev/null -w "%{http_code}" "https://99pai-api.vercel.app/api/voice/tts?text=test"

# Signup com senha fraca — deve falhar
curl -X POST https://99pai-api.vercel.app/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'

# Health check — não deve expor detalhes do DB
curl https://99pai-api.vercel.app/api/health

# Swagger — não deve estar acessível
curl -s -o /dev/null -w "%{http_code}" "https://99pai-api.vercel.app/api/docs"

# CORS sem origin — deve falhar em produção
curl -s -o /dev/null -w "%{http_code}" "https://99pai-api.vercel.app/api/categories"

# Brute force login — deve ser bloqueado após N tentativas
for i in $(seq 1 10); do
  curl -X POST https://99pai-api.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"fake@test.com","password":"wrong"}' 2>/dev/null
done
```

### Fase 3 — Checklist Final

| Finding | Status Original | Status Final | Evidência |
|---------|----------------|-------------|-----------|
| C1 — Secrets expostos | 🔴 | ⬜ | |
| C2 — SERVICE_ROLE_KEY bypass | 🔴 | ⬜ | |
| C3 — TTS sem auth | 🔴 | ⬜ | |
| H1 — bcrypt cost baixo | 🟠 | ⬜ | |
| H2 — JWT 7 dias sem refresh | 🟠 | ⬜ | |
| H3 — Categories sem auth | 🟠 | ⬜ | |
| H4 — Health expõe status | 🟠 | ⬜ | |
| H5 — Password policy fraca | 🟠 | ⬜ | |
| H6 — Sem brute force protection | 🟠 | ⬜ | |
| M1 — CORS sem origin | 🟡 | ⬜ | |
| M2 — Regex CORS ampla | 🟡 | ⬜ | |
| M3 — Helmet cross-origin | 🟡 | ⬜ | |
| M4 — .env.production no git | 🟡 | ⬜ | |
| M5 — npm vulnerabilities | 🟡 | ⬜ | |
| M6 — Email nos logs | 🟡 | ⬜ | |
| M7 — .tgz suspeito | 🟡 | ⬜ | |
| L1 — Swagger em prod | 🟢 | ⬜ | |
| L2 — envFilePath relativo | 🟢 | ⬜ | |
| L3 — @User any | 🟢 | ⬜ | |
| L4 — Request ID sem validação | 🟢 | ⬜ | |
| L5 — TTS cache sem limite | 🟢 | ⬜ | |

---

## 🔄 Pós-Loop
1. [ ] Preencher tabela de status final com ✅ ou ⚠️ (adiado)
2. [ ] Gerar relatório final em `Docs/Ralph/FINAL_REPORT.md`
3. [ ] Atualizar `RALPH_MEMORY.md` → Loop 09 → ✅ CONCLUÍDO
4. [ ] Deploy final em produção
5. [ ] Commit: `chore(security): loop-09 final audit validation`
6. [ ] 🎉 Campanha de Security Hardening CONCLUÍDA
