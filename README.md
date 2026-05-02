# 99-Pai

Plataforma de cuidado para pais idosos (Micro-SaaS).

## Estrutura do Projeto

Este repositório está configurado como um monorepo (npm workspaces) com a seguinte estrutura:

- `packages/mobile/`: Aplicativo mobile desenvolvido usando Expo, React Native e Expo Router.
- `packages/shared/`: Código, tipos e configurações compartilhadas.
- `supabase/functions/`: Edge Functions (Deno) para lógica de negócio server-side.
- `supabase/migrations/`: Migrations SQL (RLS policies, helpers, schema).
- `Docs/`: Toda a documentação técnica e de negócio.

## Tecnologias Principais

- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Mobile**: React Native, Expo, Expo Router
- **State Management**: Zustand
- **Monorepo**: npm workspaces
- **Tipagem**: TypeScript

## Instalação

Na raiz do projeto, instale todas as dependências do monorepo:

```bash
npm install
```

## Como executar

**Mobile:**
```bash
npm run start:mobile
```

**Build web:**
```bash
npm run build:web
```

## Documentação

Toda a documentação detalhada (arquitetura, API, design, migração) se encontra na pasta `Docs/`.
