# 99-Pai Mobile Frontend

Guia rapido do frontend mobile em Expo, integrado ao backend NestJS.

## Objetivo

- registrar setup minimo para rodar o app;
- apontar para as duas fontes oficiais de contrato e arquitetura;
- evitar duplicacao de documentacao historica.

## Setup rapido

Prerequisitos:

- Node.js 18+
- npm 9+

Instalacao e execucao:

```bash
cd packages/mobile
npm install
npm start
```

Variavel de ambiente minima:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Documentacao ativa

- Guia mobile principal: [README.md](./README.md)
- Contratos de API consumidos pelo app: [API_CONTRACTS.md](./API_CONTRACTS.md)
- Documentacao mestre do projeto: [../../Docs/API_DOCUMENTATION.md](../../Docs/API_DOCUMENTATION.md)

## Escopo funcional atual

- Autenticacao JWT com papeis: elderly, caregiver, provider, admin
- Fluxos completos para elderly e caregiver
- provider e admin com dashboards base

## Troubleshooting rapido

- Falha de conexao com API:
	- confirmar backend em execucao na porta 3000;
	- validar EXPO_PUBLIC_API_URL no ambiente mobile.
- Sessao invalida:
	- limpar storage local do app e autenticar novamente.

## Status

- Estado: ativo
- Ultima revisao: 2026-04-02
