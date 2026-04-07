# Deploy na Vercel (Web + API)

## Escopo

Este documento cobre o deploy técnico inicial do monorepo em dois projetos Vercel:

- API: workspace backend NestJS em serverless.
- Web: workspace mobile exportado como site estático.

## Projetos criados

- Team: jairosouza67-5313s-projects
- API: 99pai-api (projectId: prj_77Gq6uZqfbUGQ96lHLufUTpBfFbj)
- Web: 99pai-web (projectId: prj_FHC1C7ADCvKUcH0fxvSh5kUoe8Ms)
- orgId: team_WCJsbd8acPX7csHoGKmErD0j

## Pré-requisitos

- Repositório conectado ao GitHub.
- Conta Vercel com permissão para criar dois projetos.
- Secrets configurados no GitHub para CD.

## Estrutura já implementada

- Handler serverless do backend: [packages/backend/api/[...all].ts](packages/backend/api/%5B...all%5D.ts)
- Configuração compartilhada do Nest: [packages/backend/src/bootstrap-config.ts](packages/backend/src/bootstrap-config.ts)
- Configuração Vercel backend: [packages/backend/vercel.json](packages/backend/vercel.json)
- Configuração Vercel web: [packages/mobile/vercel.json](packages/mobile/vercel.json)
- Scripts web do mobile: [packages/mobile/package.json](packages/mobile/package.json)
- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- CD: [.github/workflows/deploy-vercel.yml](.github/workflows/deploy-vercel.yml)

## Projeto 1: API (backend)

1. Projeto já criado na Vercel com Root Directory em packages/backend.
2. Framework Preset: Other.
3. Build Command: npm run build.
4. Output Directory: deixar padrão para Functions (não usar pasta estática).
5. Garantir que o arquivo [packages/backend/vercel.json](packages/backend/vercel.json) está sendo usado.

### Variáveis de ambiente (API)

Configurar no painel da Vercel, para Preview e Production:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- OPENAI_API_KEY
- GOOGLE_APPLICATION_CREDENTIALS_JSON (ou equivalente adotado no projeto)
- CORS_ORIGINS
- NODE_ENV

## Projeto 2: Web (mobile export)

1. Projeto já criado na Vercel com Root Directory em packages/mobile.
2. Framework Preset: Other.
3. Build Command no projeto pode permanecer configurado, mas o pipeline oficial usa artefato prebuilt.
4. O artefato publicado em CD vem de .vercel/output gerado a partir de dist.
5. Garantir que o arquivo [packages/mobile/vercel.json](packages/mobile/vercel.json) está sendo usado.

### Variáveis de ambiente (Web)

- EXPO_PUBLIC_API_URL

Observação: EXPO_PUBLIC_API_URL deve apontar para a URL pública do projeto API, incluindo o prefixo /api quando necessário.

## CI (validação)

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) valida:

1. npm ci
2. build backend
3. typecheck mobile
4. export web

## CD (deploy automático)

O workflow [.github/workflows/deploy-vercel.yml](.github/workflows/deploy-vercel.yml) faz deploy automático:

- pull_request para main: Preview
- push para main: Production
- Web travada em fluxo prebuilt: build local do workspace mobile + geração de .vercel/output + vercel deploy --prebuilt.

### Secrets exigidos no GitHub

- VERCEL_TOKEN
- EXPO_PUBLIC_API_URL

Observação: orgId e projectIds foram definidos diretamente no workflow [.github/workflows/deploy-vercel.yml](.github/workflows/deploy-vercel.yml).

## Testes pós-deploy

1. API: smoke automático em https://99pai-api.vercel.app/api/health.
2. Web: smoke automático em https://99pai-web.vercel.app.
3. Integração: smoke automático chamando health da API após deploy web.
4. Teste funcional de login continua recomendado manualmente após release.

## Notas conhecidas

- O export web pode emitir aviso sobre android.googleServicesFile e ios.googleServicesFile quando esses arquivos não existem no ambiente de build web. Atualmente isso é warning e não bloqueia o build.
- O builder remoto da Vercel para npm run build:web falhou de forma intermitente sem log detalhado suficiente; por estabilidade o fluxo oficial ficou em prebuilt até investigação dedicada.
- Plano de investigação: [Docs/deployment/WEB_REMOTE_BUILDER_INVESTIGATION.md](Docs/deployment/WEB_REMOTE_BUILDER_INVESTIGATION.md).

## Log de modificações

- 2026-04-06: iniciado setup Vercel com handler serverless para backend, export web no mobile e workflows de CI/CD.
- 2026-04-06: criados projetos 99pai-api e 99pai-web na Vercel e credenciais (org/project IDs) atualizadas no workflow de deploy.
- 2026-04-06: deploy web estabilizado com fluxo prebuilt e smoke tests automáticos de produção adicionados ao workflow.