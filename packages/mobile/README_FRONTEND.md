# 99-Pai Mobile Frontend

Guia rapido do frontend mobile em Expo, integrado ao Supabase.

## Objetivo

- registrar setup minimo para rodar o app;
- apontar para as fontes oficiais de contrato e arquitetura;
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

Variaveis de ambiente minimas:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

## Documentacao ativa

- Guia mobile principal: [README.md](./README.md)
- Documentacao mestre do projeto: [../../Docs/API_DOCUMENTATION.md](../../Docs/API_DOCUMENTATION.md)

## Escopo funcional atual

- Autenticacao nativa Supabase com papeis: elderly, caregiver, provider, admin
- Fluxos completos para elderly e caregiver
- Edge Functions para logica de negocio server-side (TTS, weather, caregiver-link, notifications, service-request)

## Troubleshooting rapido

- Falha de conexao com Supabase:
	- verificar variaveis EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY;
	- confirmar que o projeto Supabase esta ativo (nao pausado).
- Sessao invalida:
	- limpar storage local do app e autenticar novamente.

## Status

- Estado: ativo
- Ultima revisao: 2026-04-25
