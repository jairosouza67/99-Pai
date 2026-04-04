# 🚀 Guia de Deploy Local - 99-Pai Monorepo

Este documento descreve como configurar e rodar o ecossistema do 99-Pai (Backend + Mobile) na sua máquina local.

---

## 📋 Pré-requisitos

- **Node.js**: v18+ (Recomendado v20 LTS)
- **NPM**: v9+ (Suporte a Workspaces)
- **Supabase**: Conta ativa com projeto criado ou Supabase CLI instalado para rodar localmente.

---

## 🛠️ Passo a Passo de Instalação

### 1. Clonar e Instalar Dependências
Na raiz do monorepo, execute:

```bash
npm install
```
*Este comando instalará as dependências da raiz e de todos os pacotes (`packages/backend` e `packages/mobile`) simultaneamente.*

### 2. Configurar Variáveis de Ambiente

#### **Backend (`packages/backend/.env`)**
Crie um arquivo `.env` dentro da pasta `packages/backend`:
```env
# Conexão com Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Configurações do NestJS
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:19006,http://localhost:8081
```

#### **Mobile (`packages/mobile/.env`)**
Crie um arquivo `.env` dentro da pasta `packages/mobile`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 🚀 Rodando o Projeto

Você pode rodar os comandos diretamente da raiz do monorepo:

### **Opção A: Rodar via Scripts da Raiz (Recomendado)**

**Iniciar Backend (NestJS):**
```bash
npm run start:backend
```
*Acessível em: [http://localhost:3000/api](http://localhost:3000/api)*  
*Swagger Docs: [http://localhost:3000/docs](http://localhost:3000/docs)*

**Iniciar Mobile (Expo Go / Web):**
```bash
npm run start:mobile
```
*Após carregar o Metro Bundler, pressione `w` para Web ou use o app Expo Go no celular.*

---

## 🗄️ Gerenciamento de Banco de Dados (Supabase)

Como não usamos mais Prisma localmente, as alterações de schema devem ser feitas:
1. Pelo painel web do Supabase.
2. Ou via migrações SQL no Supabase CLI.

### **Atualizar Tipos TypeScript (P0)**
Sempre que o schema do banco mudar, regenere os tipos para manter o backend e o mobile consistentes:

```bash
# Se tiver o Supabase CLI instalado
supabase gen types typescript --project-id {seu-project-id} > packages/shared/types/database.ts
```

---

## 🧪 Verificação de Saúde (Health Check)

Após rodar o backend, verifique se está tudo OK:
1. Abra `http://localhost:3000/docs`. Se o Swagger carregar, o NestJS está saudável.
2. Tente fazer um `GET` no endpoint de ping (se existir) ou rotas públicas.

---

## ⚠️ Solução de Problemas Comuns

- **ERRO: `Module not found`**: Certifique-se de que rodou `npm install` na RAIZ.
- **ERRO: `CORS`**: Verifique se a porta do seu Expo (ex: 8081 ou 19006) está listada em `CORS_ORIGINS` no `.env` do backend.
- **ERRO: `Supabase key missing`**: Verifique se os arquivos `.env` dentro de `packages/backend` e `packages/mobile` estão preenchidos.
