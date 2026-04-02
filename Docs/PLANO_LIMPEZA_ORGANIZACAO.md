# Plano de Limpeza e Organização — 99-Pai Backend

> **Objetivo**: Deixar o projeto limpo, com apenas o essencial para o sistema NestJS + Supabase.
> Toda documentação vai para `Docs/`. Artefatos transitórios são removidos.
> **Criado em**: 2026-04-01

---

## Contexto

O projeto acumulou pastas e arquivos de sessões de desenvolvimento que não fazem parte do sistema em produção:
- Pasta `mobile-app/` — app Expo separado, não pertence ao backend
- Pasta `.temp_ag_kit/` — artefato temporário do agente de IA
- Pasta `.qoder/` — configuração de ferramenta externa abandonada
- Pasta `generated/` — client Prisma gerado (deve ser gerado via `npx prisma generate`)
- Pasta `dist/` — build compilado (deve ser ignorado pelo git)
- Arquivo `prisma/seed.ts` — seed de dados que usa dados hardcoded de teste
- MDs dispersos na raiz — precisam ir para `Docs/`

O banco de dados é **100% Supabase** — sem banco local, sem migrations locais necessárias para recriar o schema (já está no Supabase).

---

## Fase 1 — Criar pasta `Docs/` e mover documentação

### Arquivos da raiz → `Docs/`

| Arquivo atual | Destino | Status |
|---------------|---------|--------|
| `README.md` | `Docs/README.md` + simplificar raiz | ⬜ |
| `API_DOCUMENTATION.md` | `Docs/API_DOCUMENTATION.md` | ⬜ |
| `LOCAL_DEPLOYMENT.md` | `Docs/LOCAL_DEPLOYMENT.md` | ⬜ |
| `SUPABASE_BACKEND_MIGRATION_PLAN.md` | `Docs/SUPABASE_BACKEND_MIGRATION_PLAN.md` | ⬜ |
| `SUPABASE_EXECUTION_PLAN.md` | `Docs/SUPABASE_EXECUTION_PLAN.md` | ⬜ |

### Arquivos do `mobile-app/` → `Docs/mobile/`

| Arquivo atual | Destino | Status |
|---------------|---------|--------|
| `mobile-app/API_CONTRACTS.md` | `Docs/mobile/API_CONTRACTS.md` | ⬜ |
| `mobile-app/COMPLETION_CHECKLIST.md` | `Docs/mobile/COMPLETION_CHECKLIST.md` | ⬜ |
| `mobile-app/DOCUMENTATION_INDEX.md` | `Docs/mobile/DOCUMENTATION_INDEX.md` | ⬜ |
| `mobile-app/FINAL_SUMMARY.md` | `Docs/mobile/FINAL_SUMMARY.md` | ⬜ |
| `mobile-app/INTEGRATION_GUIDE.md` | `Docs/mobile/INTEGRATION_GUIDE.md` | ⬜ |
| `mobile-app/NAVIGATION_MAP.md` | `Docs/mobile/NAVIGATION_MAP.md` | ⬜ |
| `mobile-app/README.md` | `Docs/mobile/README.md` | ⬜ |
| `mobile-app/README_FRONTEND.md` | `Docs/mobile/README_FRONTEND.md` | ⬜ |
| `mobile-app/TYPE_DEFINITIONS.md` | `Docs/mobile/TYPE_DEFINITIONS.md` | ⬜ |

---

## Fase 2 — Remover artefatos não-essenciais

| Item | Motivo | Status |
|------|--------|--------|
| `.temp_ag_kit/` | Temporário do agente IA | ✅ |
| `.qoder/` | Ferramenta externa abandonada | ✅ |
| `dist/` | Build compilado (regenerável) | ✅ |
| `generated/` | Client Prisma (regenerável via `prisma generate`) | ✅ |
| `prisma/seed.ts` | Dados hardcoded de teste, banco está no Supabase | ✅ |
| `mobile-app/` (código) | App mobile não pertence ao backend | ✅ |

---

## Fase 3 — Atualizar configurações

| Item | Ação | Status |
|------|------|--------|
| `.gitignore` | Adicionar `dist/`, `generated/`, `.temp_ag_kit/`, `.qoder/` | ⬜ |
| `README.md` (raiz) | Simplificar — apenas intro e link para `Docs/` | ⬜ |
| `package.json` | Remover script `seed` se existir | ⬜ |

---

## Fase 4 — Commit e push

```bash
git add -A
git commit -m "chore: organize Docs/ folder and remove non-essential artifacts"
git push origin master
```

---

## Estrutura final esperada

```
99-Pai/
├── .agent/               # configuração do agente IA
├── .env                  # variáveis de ambiente (não commitado)
├── .env.example          # template seguro
├── .gitignore
├── .prettierrc
├── .vscode/
├── Docs/                 # TODA a documentação aqui
│   ├── API_DOCUMENTATION.md
│   ├── LOCAL_DEPLOYMENT.md
│   ├── PLANO_LIMPEZA_ORGANIZACAO.md
│   ├── README.md
│   ├── SUPABASE_BACKEND_MIGRATION_PLAN.md
│   ├── SUPABASE_EXECUTION_PLAN.md
│   └── mobile/
│       ├── API_CONTRACTS.md
│       ├── INTEGRATION_GUIDE.md
│       └── ...
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── package-lock.json
├── prisma/
│   ├── migrations/       # histórico SQL de referência
│   └── schema.prisma
├── prisma.config.ts
├── README.md             # mínimo — aponta para Docs/
├── src/                  # código-fonte NestJS
├── test/                 # testes E2E
├── tsconfig.json
└── tsconfig.build.json
```
