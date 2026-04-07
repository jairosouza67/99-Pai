# Investigacao: Falha no Builder Remoto da Web

## Contexto

Os deploys remotos da Web via Vercel com `npm run build:web` falharam intermitentemente com erro genérico de exit code sem stack detalhada. Para manter releases, o fluxo de produção foi estabilizado com prebuilt.

## Sintoma observado

- Deployment remoto da Web em estado `ERROR`.
- Mensagem principal no CLI: `Command "npm run build:web" exited with 1`.
- Logs remotos incompletos para causa raiz.

## Workaround adotado

1. Rodar `npm run build:web` no workspace `packages/mobile`.
2. Gerar `.vercel/output` via `npm run prepare:vercel-prebuilt`.
3. Publicar com `vercel deploy --prebuilt`.

## Objetivo desta investigacao

Remover o workaround e voltar para build remoto confiavel no projeto Web.

## Hipoteses principais

1. Diferenca de ambiente entre runner local e builder remoto (Node, shell, PATH).
2. Dependencia transitiva com comportamento diferente no ambiente remoto.
3. Variaveis de ambiente de build ausentes ou inconsistentes.
4. Interacao do Expo export com o contexto remoto da Vercel.

## Checklist tecnico

1. Fixar Node version no projeto Web para `20.x` e re-testar build remoto.
2. Garantir lockfile consistente e sem mutacao durante build remoto.
3. Reexecutar build remoto com rastreio maximo no CLI e capturar deployment IDs.
4. Validar se `EXPO_PUBLIC_API_URL` existe em Preview e Production no projeto Web.
5. Comparar `npm ci` + `npm run build:web` em container Linux equivalente ao builder da Vercel.
6. Testar build remoto com installCommand e buildCommand explicitos no projeto.
7. Se persistir, abrir ticket de suporte Vercel com deployment IDs de erro e reproducoes.

## Criterio de saida

Considerar resolvido quando houver 3 deploys remotos consecutivos da Web em `READY` (Preview e Production) sem uso de prebuilt.

## Historico

- 2026-04-06: workaround prebuilt adotado para estabilizar producao.