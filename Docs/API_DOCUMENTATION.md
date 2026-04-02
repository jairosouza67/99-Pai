# API Documentation - 99-Pai

Documentacao unificada da API NestJS para uso local.

## 1. Base URL e Prefixo

- Servidor local: `http://localhost:3000`
- Prefixo global: `/api`
- Base final da API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/docs`

## 2. Autenticacao

A API usa JWT Bearer token.

- Header obrigatorio para rotas protegidas:
  - `Authorization: Bearer <token>`

Fluxo:
1. Fazer login em `POST /api/auth/login`
2. Guardar o campo `token` retornado
3. Enviar o token nas chamadas autenticadas

## 3. Roles

Roles existentes no sistema:
- `elderly`
- `caregiver`
- `provider`
- `admin`

## 4. Logins de Teste (Seed atual)

Todos usam a mesma senha: `123456`

- Elderly: `elderly@test.com`
- Caregiver: `caregiver@test.com`
- Provider: `provider@test.com`
- Admin: `admin@test.com`

## 5. Endpoints

Todos os caminhos abaixo ja incluem o prefixo `/api`.

### 5.1 Auth

- `POST /signup`
  - Cria usuario
  - Body (SignupDto):
    - `email` (string, email, obrigatorio)
    - `password` (string, min 6, obrigatorio)
    - `name` (string, obrigatorio)
    - `role` (`elderly|caregiver|provider|admin`, obrigatorio)
    - `cellphone` (string, opcional)
    - `nickname` (string, opcional)
    - `document` (string, opcional)
    - `birthday` (date string ISO, opcional)

- `POST /auth/login`
  - Login
  - Body (LoginDto):
    - `email` (string, email)
    - `password` (string)
  - Resposta:
    - `token`
    - `user` `{ id, email, name, role }`

- `GET /auth/me`
  - Usuario autenticado
  - Protegido por JWT

### 5.2 Elderly Profile

- `GET /elderly/profile`
  - Perfil do proprio elderly
  - Role: `elderly`

- `PATCH /elderly/profile`
  - Atualiza perfil do proprio elderly
  - Role: `elderly`
  - Body (UpdateElderlyProfileDto):
    - `preferredName` (string, opcional)
    - `autonomyScore` (int 0..100, opcional)
    - `interactionTimes` (string[], opcional)
    - `location` (string, opcional)
    - `onboardingComplete` (boolean, opcional)

### 5.3 Caregiver

- `POST /caregiver/link`
  - Vincula caregiver via codigo de 6 caracteres
  - Role: `caregiver`
  - Body (LinkDto):
    - `linkCode` (string, tamanho 6)

- `GET /caregiver/elderly`
  - Lista idosos vinculados
  - Role: `caregiver`

- `GET /caregiver/elderly/:elderlyProfileId`
  - Detalhes de idoso vinculado
  - Role: `caregiver`

### 5.4 Medications

- `GET /elderly/:elderlyProfileId/medications`
  - Lista medicacoes do idoso
  - Requer JWT

- `POST /elderly/:elderlyProfileId/medications`
  - Cria medicacao
  - Requer JWT
  - Body (CreateMedicationDto):
    - `name` (string)
    - `time` (string)
    - `dosage` (string)

- `PATCH /elderly/:elderlyProfileId/medications/:id`
  - Atualiza medicacao
  - Requer JWT
  - Body (UpdateMedicationDto):
    - `name` (string, opcional)
    - `time` (string, opcional)
    - `dosage` (string, opcional)
    - `active` (boolean, opcional)

- `DELETE /elderly/:elderlyProfileId/medications/:id`
  - Remove medicacao
  - Requer JWT

- `GET /medications/today`
  - Medicacoes do dia
  - Role: `elderly`

- `POST /medications/:id/confirm`
  - Confirma ou marca como nao tomado
  - Role: `elderly`
  - Body (ConfirmMedicationDto):
    - `confirmed` (boolean)

- `GET /elderly/:elderlyProfileId/medication-history`
  - Historico de medicacao
  - Requer JWT
  - Query params opcionais:
    - `from` (string)
    - `to` (string)
    - `page` (number)
    - `limit` (number)

### 5.5 Contacts

- `GET /elderly/:elderlyProfileId/contacts`
  - Lista contatos do idoso
  - Requer JWT

- `POST /elderly/:elderlyProfileId/contacts`
  - Cria contato
  - Requer JWT
  - Body (CreateContactDto):
    - `name` (string)
    - `phone` (string)
    - `thresholdDays` (int >= 1, opcional)

- `PATCH /elderly/:elderlyProfileId/contacts/:id`
  - Atualiza contato
  - Requer JWT
  - Body (UpdateContactDto):
    - `name` (string, opcional)
    - `phone` (string, opcional)
    - `thresholdDays` (int >= 1, opcional)

- `DELETE /elderly/:elderlyProfileId/contacts/:id`
  - Remove contato
  - Requer JWT

- `GET /contacts`
  - Lista contatos com status de atraso
  - Role: `elderly`

- `POST /contacts/:id/called`
  - Registra ligacao feita
  - Role: `elderly`

- `GET /elderly/:elderlyProfileId/call-history`
  - Historico de ligacoes
  - Requer JWT
  - Query params opcionais:
    - `page` (number)
    - `limit` (number)

### 5.6 Agenda

- `GET /elderly/:elderlyProfileId/agenda`
  - Lista agenda
  - Requer JWT
  - Query params opcionais:
    - `from` (string)
    - `to` (string)

- `POST /elderly/:elderlyProfileId/agenda`
  - Cria evento de agenda
  - Requer JWT
  - Body (CreateAgendaDto):
    - `description` (string)
    - `dateTime` (date string ISO)
    - `reminder` (boolean, opcional)

- `PATCH /elderly/:elderlyProfileId/agenda/:id`
  - Atualiza evento
  - Requer JWT
  - Body (UpdateAgendaDto):
    - `description` (string, opcional)
    - `dateTime` (date string ISO, opcional)
    - `reminder` (boolean, opcional)

- `DELETE /elderly/:elderlyProfileId/agenda/:id`
  - Remove evento
  - Requer JWT

- `GET /agenda/today`
  - Agenda do dia
  - Role: `elderly`

### 5.7 Weather

- `GET /weather`
  - Clima + recomendacao de roupa
  - Requer JWT
  - Query params opcionais:
    - `location` (string)

### 5.8 Notifications

- `POST /notifications/register`
  - Registra push token
  - Requer JWT
  - Body (RegisterTokenDto):
    - `pushToken` (string)
    - `platform` (`ios|android|web`)

### 5.9 Interactions

- `POST /interactions/log`
  - Log de interacao (voz/botao)
  - Role: `elderly`
  - Body (LogInteractionDto):
    - `type` (`voice|button`)

### 5.10 Categories

- `GET /categories`
  - Lista categorias raiz com subcategorias
  - Publico

- `GET /categories/:id`
  - Busca categoria por UUID
  - Publico

- `POST /categories`
  - Cria categoria
  - Role: `admin`
  - Body (CreateCategoryDto):
    - `name` (string)
    - `parentId` (UUID, opcional)

- `PATCH /categories/:id`
  - Atualiza categoria
  - Role: `admin`
  - Body (UpdateCategoryDto):
    - `name` (string, opcional)
    - `parentId` (UUID|null, opcional)

- `DELETE /categories/:id`
  - Remove categoria
  - Role: `admin`

### 5.11 Offerings

- `POST /offerings`
  - Cria oferta
  - Role: `provider` ou `admin`
  - Body (CreateOfferingDto):
    - `title` (string)
    - `description` (string)
    - `imageUrl` (string, opcional)
    - `price` (number >= 0)
    - `categoryId` (UUID)
    - `subcategoryId` (UUID, opcional)

- `GET /offerings`
  - Lista ofertas ativas
  - Publico

- `GET /offerings/category/:categoryId`
  - Lista por categoria
  - Publico

- `GET /offerings/subcategory/:subcategoryId`
  - Lista por subcategoria
  - Publico

- `GET /offerings/:id`
  - Detalhe da oferta
  - Publico

- `PATCH /offerings/:id`
  - Atualiza oferta
  - JWT (dono da oferta)
  - Body (UpdateOfferingDto): parcial de CreateOfferingDto

- `DELETE /offerings/:id`
  - Desativa oferta
  - JWT (dono da oferta)

- `POST /offerings/:id/contact-data`
  - Solicita contato da oferta
  - JWT

### 5.12 Service Requests

- `POST /services/request`
  - Cria solicitacao de servico
  - Role: `elderly`
  - Body (CreateServiceRequestDto):
    - `offeringId` (UUID)
    - `requestedDateTime` (date string ISO, opcional)
    - `notes` (string, opcional)

- `GET /services/my-requests`
  - Lista solicitacoes do proprio usuario
  - Role: `elderly`

- `PATCH /services/requests/:id/cancel`
  - Cancela solicitacao pendente
  - Role: `elderly`

## 6. Erros comuns

- `401 Unauthorized`
  - Token ausente/invalido, ou credenciais incorretas no login
- `403 Forbidden`
  - Usuario autenticado, mas sem role necessaria
- `404 Not Found`
  - Recurso inexistente
- `409 Conflict`
  - Ex.: email/celular ja cadastrados em signup

## 7. Dicas para ambiente local

1. Subir backend na raiz do projeto:
   - `npm run start:dev`
2. Subir frontend web em `mobile-app`:
   - `yarn web`
3. Variavel no frontend (`mobile-app/.env.local`):
   - `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

## 8. Fonte da verdade de contratos

Para schema completo de request/response por endpoint, usar Swagger em tempo de execucao:
- `http://localhost:3000/docs`

Este arquivo foi gerado com base nos controllers e DTOs atuais do backend.
