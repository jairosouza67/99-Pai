# 99-Pai

Plataforma de cuidado para pais idosos (Micro-SaaS).

## Estrutura do Projeto

Este repositório está configurado como um monorepo (npm workspaces) com a seguinte estrutura:

- `packages/backend/`: API em NestJS integrada com Supabase (PostgreSQL, Auth, Edge Functions).
- `packages/mobile/`: Aplicativo mobile desenvolvido usando Expo, React Native e Expo Router.
- `packages/shared/`: Código, tipos e configurações compartilhadas entre backend e frontend (como os tipos gerados pelo Supabase).
- `Docs/`: Toda a documentação técnica e de negócio.

## Tecnologias Principais

- **Backend**: NestJS, Supabase (Banco de dados, Auth, Storage, Edge Functions)
- **Mobile**: React Native, Expo, React Navigation, TailwindCSS v4
- **State Management**: Zustand, TanStack React Query v5
- **Monorepo**: npm workspaces
- **Tipagem**: TypeScript

## Instalação

Na raiz do projeto, instale todas as dependências do monorepo:

```bash
npm install
```

## Como executar

Para rodar os projetos, utilize os seguintes comandos da raiz:

**Backend:**
```bash
npm run start:backend
```

**Mobile:**
```bash
npm run start:mobile
```

## Documentação

Toda a documentação detalhada (arquitetura, API, design, testes) se encontra na pasta `Docs/`.
Leia o [API_DOCUMENTATION.md](Docs/API_DOCUMENTATION.md) ou explore os ADRs.
