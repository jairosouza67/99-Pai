# ADR 001: Evolução para Monorepo com React Native

**Status**: Aprovado
**Data**: 2026-04-01

## Contexto
O projeto estruturou o backend independente usando NestJS e iniciou o frontend mobile separadamente em `mobile-app`. Com o desenvolvimento iterativo, houve a necessidade de compatibilizar tipos e recursos de ambos projetos e simplificar o pipeline de build/deploy e de tipagens (utilizando o Typescript ao máximo). O aplicativo foca nas plataformas iOS e Android utilizando a mesma base de código através do Expo/React Native.

## Decisão
Decidimos consolidar o repositório em um **Monorepo** usando **npm workspaces**. 
A estrutura do projeto passa a conter `packages/backend`, `packages/mobile` e futuramente `packages/shared`.

Isso nos leva às seguintes vantagens:
- Um único ambiente de dependências, permitindo consistência nas versões de bibliotecas (como ESLint, Prettier, Typescript e bibliotecas de utilitários e validação com Zod).
- Mais produtividade ao desenvolver backend e frontend mobile localmente ao mesmo tempo.
- Possibilidade de compartilhar o Typescript gerado do Supabase no backend/mobile.

## Consequências
- A configuração do Metro Bundler (React Native) foi ajustada para seguir a arquitetura do monorepo `workspaceRoot`.
- Scripts unificados de `npm install` da raiz instalarão e linkarão automaticamente todos os módulos internos.
- Maior acoplamento organizacional da infraestrutura, porém permitindo uma agilidade maior nas entregas em formato "full-stack feature".
