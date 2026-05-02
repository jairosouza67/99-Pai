# 🔁 RALPH LOOP 09 — Validação Final & Smoke Tests

> **Objetivo:** Teste completo de todos os fluxos do app pós-migração. Verificar que nenhuma regressão foi introduzida e que a nova arquitetura é estável.
> **Risco:** 🟢 BAIXO — Apenas verificação
> **Esforço estimado:** 3-4 horas
> **Pré-requisitos:** Todos os loops anteriores (01-08) concluídos

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status FINAL e matriz completa.

---

## ✅ Checklist de Tarefas

### Task 9.1 — Smoke Test: Autenticação

| Teste | Esperado | Passou? |
|-------|----------|---------|
| Signup com email novo | Criar conta em `auth.users` | [ ] |
| Signup com email existente | Erro de conflito | [ ] |
| Signup com senha fraca (123456) | Erro de validação | [ ] |
| Login com credenciais corretas | Sessão ativa | [ ] |
| Login com senha errada | Erro 401 | [ ] |
| Logout | Sessão removida | [ ] |
| Reabrir app | Sessão persistida (auto-login) | [ ] |
| Token expirado | Auto-refresh transparente | [ ] |

- [ ] Concluído

---

### Task 9.2 — Smoke Test: CRUD de Dados (como Idoso)

| Teste | Esperado | Passou? |
|-------|----------|---------|
| Listar medicamentos | Retorna apenas os do idoso | [ ] |
| Criar medicamento | Sucesso, visível na lista | [ ] |
| Editar medicamento | Dados atualizados | [ ] |
| Deletar medicamento | Removido da lista | [ ] |
| Listar contatos | Retorna apenas os do idoso | [ ] |
| Criar/editar/deletar contato | Funciona corretamente | [ ] |
| Listar agenda | Retorna eventos do período | [ ] |
| Criar/editar/deletar evento | Funciona corretamente | [ ] |
| Ver perfil idoso | Dados corretos | [ ] |
| Editar perfil idoso | Dados atualizados | [ ] |

- [ ] Concluído

---

### Task 9.3 — Smoke Test: CRUD de Dados (como Cuidador)

| Teste | Esperado | Passou? |
|-------|----------|---------|
| Gerar linkCode (como idoso) | Código de 6 dígitos gerado | [ ] |
| Usar linkCode (como cuidador) | Vínculo criado | [ ] |
| Listar medicamentos do idoso vinculado | Retorna dados | [ ] |
| Listar contatos do idoso vinculado | Retorna dados | [ ] |
| Acessar dados de idoso NÃO vinculado | Bloqueado (vazio ou erro) | [ ] |
| Rate-limit: 6 tentativas de linkCode | Bloqueado temporariamente | [ ] |
| LinkCode expirado | Rejeitado | [ ] |

- [ ] Concluído

---

### Task 9.4 — Smoke Test: Edge Functions

| Teste | Esperado | Passou? |
|-------|----------|---------|
| TTS: gerar áudio com texto curto | URL de áudio retornada | [ ] |
| TTS: mesmo texto novamente | Cache hit (resposta rápida) | [ ] |
| TTS: sem autenticação | 401 Unauthorized | [ ] |
| TTS: texto > 600 chars | Erro 400 | [ ] |
| Weather: buscar clima por cidade | Dados retornados | [ ] |
| Weather: sem autenticação | 401 Unauthorized | [ ] |

- [ ] Concluído

---

### Task 9.5 — Smoke Test: Marketplace (Offerings & Service Requests)

| Teste | Esperado | Passou? |
|-------|----------|---------|
| Listar categorias | Lista pública retornada | [ ] |
| Listar offerings | Offerings disponíveis | [ ] |
| Criar offering | Sucesso | [ ] |
| Editar offering próprio | Sucesso | [ ] |
| Editar offering de outro | Bloqueado | [ ] |
| Criar service request | Sucesso com validação | [ ] |
| Confirmar service request | Status atualizado | [ ] |

- [ ] Concluído

---

### Task 9.6 — Verificação de Segurança

| Verificação | Esperado | Passou? |
|------------|----------|---------|
| `SERVICE_ROLE_KEY` NÃO aparece no mobile | Nenhuma ocorrência | [ ] |
| Todas as queries usam `ANON_KEY` + RLS | Verificar via grep | [ ] |
| Nenhum `api.ts` ou `axios` restante | Zero imports | [ ] |
| Nenhum `authStorage.ts` restante | Ficheiro removido | [ ] |
| Edge Functions requerem auth | 401 sem token | [ ] |
| RLS bloqueia acesso cross-user | Dados isolados | [ ] |

```bash
# Verificações automáticas
grep -rn "SERVICE_ROLE_KEY" packages/mobile/ --include="*.ts" --include="*.tsx"
grep -rn "axios" packages/mobile/ --include="*.ts" --include="*.tsx"
grep -rn "authStorage" packages/mobile/ --include="*.ts" --include="*.tsx"
grep -rn "api\.get\|api\.post\|api\.put\|api\.delete" packages/mobile/ --include="*.ts" --include="*.tsx"
```

- [ ] Concluído

---

### Task 9.7 — Verificação de Infraestrutura

| Verificação | Esperado | Passou? |
|------------|----------|---------|
| `packages/backend/` não existe | Confirmado | [ ] |
| Backend Vercel removido/desativado | 404 ou removido | [ ] |
| Edge Functions deployed | Todas respondendo | [ ] |
| CI/CD atualizado | Sem referências ao backend | [ ] |
| `.env.example` atualizado | Apenas variáveis necessárias | [ ] |

- [ ] Concluído

---

### Task 9.8 — Atualizar documentação

**Atualizar `Docs/Supabase_Migration_Plan.md`:**
- Marcar como CONCLUÍDO
- Adicionar referência aos loops executados

**Atualizar `RALPH_MEMORY.md`:**
- Preencher TODOS os logs de execução
- Preencher decisões importantes
- Criar matriz de status final

- [ ] Concluído

---

## 📊 Matriz de Status Final

| Loop | Task | Status Final |
|------|------|-------------|
| 01 | Migração de Utilizadores para Supabase Auth | |
| 02 | Supabase Client & Auth Nativa no Mobile | |
| 03 | RLS Policies Completas | |
| 04 | Edge Functions: TTS & Weather | |
| 05 | Edge Functions: Lógica de Negócio | |
| 06 | Refatoração Mobile: CRUD Direto | |
| 07 | Refatoração Mobile: Edge Functions & Limpeza | |
| 08 | Descomissionamento do Backend NestJS | |
| 09 | Validação Final & Smoke Tests | |

---

## 🔄 Pós-Loop

1. [ ] Todos os smoke tests passaram
2. [ ] Verificação de segurança completa
3. [ ] Infraestrutura limpa
4. [ ] Documentação atualizada
5. [ ] `RALPH_MEMORY.md` com status FINAL
6. [ ] Commit final: `feat(migration): loop-09 final validation — migration complete`
7. [ ] 🎉 **MIGRAÇÃO CONCLUÍDA**
