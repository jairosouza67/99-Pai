# Documentacao Mestre do Codebase - 99-Pai

> Fonte base de conhecimento do projeto para consultas futuras.
> Ultima atualizacao: 2026-04-02

## 1. Objetivo e Escopo

Este documento consolida a visao tecnica do monorepo 99-Pai em um unico lugar:

- arquitetura backend/mobile/shared/supabase;
- rotas (API e navegacao mobile);
- regras de negocio e autorizacao;
- padroes visuais de interface;
- operacao local, seguranca, testes e troubleshooting;
- guia de manutencao continua com log de mudancas.

Use esta documentacao como ponto de partida antes de alterar codigo, contratos de API, regras de role, fluxo mobile ou schema de banco.

## 2. Visao Rapida do Sistema

### 2.1 Stack principal

- Monorepo: npm workspaces
- Backend: NestJS + Supabase JS + JWT + Swagger + Throttler + Helmet
- Mobile: Expo + React Native + Expo Router + React Native Paper + Axios
- Shared: pacote de tipos do banco gerados pelo Supabase
- Banco: PostgreSQL gerenciado no Supabase com RLS habilitado

### 2.2 Estrutura de pastas (alto nivel)

- packages/backend: API NestJS
- packages/mobile: app Expo (rotas em app/ e implementacao em src/)
- packages/shared: tipos e utilitarios compartilhados
- supabase/migrations: migrations SQL de seguranca/permissoes
- Docs: ADRs, planos e documentacao consolidada

## 3. Arquitetura do Monorepo

### 3.1 Workspace e scripts raiz

Arquivo de referencia: package.json (raiz)

- workspaces: packages/*
- start:backend -> npm run start:dev --workspace=@99-pai/backend
- start:mobile -> npm run start --workspace=@99-pai/mobile
- build:backend -> npm run build --workspace=@99-pai/backend

### 3.2 Decisoes arquiteturais vigentes

Baseado em ADRs:

- ADR-001: consolidacao em monorepo com backend + mobile + shared.
- ADR-002: remocao de Prisma e uso direto de @supabase/supabase-js.

Consequencia pratica:

- backend conversa com Supabase via SERVICE_ROLE_KEY;
- tipos de banco devem ser gerados e sincronizados para o shared;
- RLS deve permanecer habilitado no banco.

## 4. Backend (NestJS) - Arquitetura e Regras Globais

### 4.1 Bootstrap global

Arquivos-chave: packages/backend/src/main.ts, packages/backend/src/app.module.ts

- Prefixo global: /api
- CORS por allowlist em CORS_ORIGINS
- ValidationPipe global:
  - transform: true
  - whitelist: true
  - forbidNonWhitelisted: true
- Helmet habilitado
- Swagger habilitado fora de producao em /docs
- Throttler global: 60 requisicoes por 60s
- Interceptor global RequestId:
  - recebe/gera x-request-id
  - devolve x-request-id no response
  - loga latencia e falhas por request

### 4.2 Modulos principais

- auth: cadastro, login, perfil autenticado, JWT, roles
- elderly: perfil do idoso
- caregiver: vinculo cuidador-idoso e visao consolidada
- medications: CRUD + confirmacao + historico
- contacts: CRUD + atraso de ligacoes + historico
- agenda: CRUD + agenda do dia
- interactions: log de interacoes (voz/botao)
- notifications: registro de push token
- weather: clima + recomendacao de roupa
- categories: taxonomia de marketplace
- offerings: ofertas de servico
- service-requests: pedidos de servico com validacao de conflitos
- health: health check do banco
- supabase: cliente singleton de acesso ao banco

### 4.3 Auth e autorizacao

- JwtAuthGuard valida token Bearer
- RolesGuard valida role exigida por decorator @Roles
- Roles existentes:
  - elderly
  - caregiver
  - provider
  - admin

Regra transversal de acesso a dados de idosos:

- caregiverService.verifyAccess(userId, elderlyProfileId):
  - elderly: so pode acessar o proprio elderlyProfile
  - caregiver: so acessa idosos vinculados em caregiverlink
  - outros roles: sem acesso

## 5. Referencia Completa de API (Backend)

Base local:

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs

### 5.1 Auth

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /signup | Publica | - | Cria usuario e retorna token + user |
| POST | /auth/login | Publica | - | Login por email/senha |
| GET | /auth/me | JWT | qualquer autenticado | Retorna user atual |

Campos relevantes:

- SignupDto: email, password (min 6), name, role, cellphone?, nickname?, document?, birthday?
- LoginDto: email, password

Regras importantes:

- email e cellphone unicos
- senha com hash bcrypt
- role elderly cria elderlyprofile com linkCode
- erro de Supabase (nao PGRST116) em auth vira ServiceUnavailableException

### 5.2 Elderly Profile

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /elderly/profile | JWT | elderly | Retorna perfil do idoso autenticado |
| PATCH | /elderly/profile | JWT | elderly | Atualiza dados de perfil |

Campos de perfil usados no app:

- preferredName
- autonomyScore
- interactionTimes
- location
- onboardingComplete
- linkCode

### 5.3 Caregiver

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /caregiver/link | JWT | caregiver | Vincula via linkCode |
| GET | /caregiver/elderly | JWT | caregiver | Lista idosos vinculados com estatisticas |
| GET | /caregiver/elderly/:elderlyProfileId | JWT | caregiver | Detalhes de idoso especifico |

Regras de negocio:

- linkCode invalido -> 404
- vinculo repetido -> 409
- getLinkedElderly calcula todayMedicationStats e hasAlert
- hasAlert = true quando missed >= 2 no dia

### 5.4 Medications

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /elderly/:elderlyProfileId/medications | JWT | elderly/caregiver (via verifyAccess) | Lista medicamentos |
| POST | /elderly/:elderlyProfileId/medications | JWT | elderly/caregiver (via verifyAccess) | Cria medicamento |
| PATCH | /elderly/:elderlyProfileId/medications/:id | JWT | elderly/caregiver (via verifyAccess) | Atualiza medicamento |
| DELETE | /elderly/:elderlyProfileId/medications/:id | JWT | elderly/caregiver (via verifyAccess) | Remove medicamento |
| GET | /medications/today | JWT | elderly | Lista do dia com status |
| POST | /medications/:id/confirm | JWT | elderly | Confirma ou marca como missed |
| GET | /elderly/:elderlyProfileId/medication-history | JWT | elderly/caregiver (via verifyAccess) | Historico paginado |

Regras de negocio:

- status diario por item: pending, confirmed, missed
- confirmacao faz upsert no medicationhistory do dia
- historico aceita filtros from/to e paginacao

### 5.5 Contacts

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /elderly/:elderlyProfileId/contacts | JWT | elderly/caregiver (via verifyAccess) | Lista contatos |
| POST | /elderly/:elderlyProfileId/contacts | JWT | elderly/caregiver (via verifyAccess) | Cria contato |
| PATCH | /elderly/:elderlyProfileId/contacts/:id | JWT | elderly/caregiver (via verifyAccess) | Atualiza contato |
| DELETE | /elderly/:elderlyProfileId/contacts/:id | JWT | elderly/caregiver (via verifyAccess) | Remove contato |
| GET | /contacts | JWT | elderly | Lista contatos com atraso |
| POST | /contacts/:id/called | JWT | elderly | Marca ligacao e cria callhistory |
| GET | /elderly/:elderlyProfileId/call-history | JWT | elderly/caregiver (via verifyAccess) | Historico paginado |

Regra de atraso de ligacao:

- daysOverdue = differenceInDays(agora, lastCallAt) - thresholdDays
- se nunca ligou: daysOverdue inicial alto (999) e isOverdue verdadeiro

### 5.6 Agenda

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /elderly/:elderlyProfileId/agenda | JWT | elderly/caregiver (via verifyAccess) | Lista agenda (from/to opcionais) |
| POST | /elderly/:elderlyProfileId/agenda | JWT | elderly/caregiver (via verifyAccess) | Cria evento |
| PATCH | /elderly/:elderlyProfileId/agenda/:id | JWT | elderly/caregiver (via verifyAccess) | Atualiza evento |
| DELETE | /elderly/:elderlyProfileId/agenda/:id | JWT | elderly/caregiver (via verifyAccess) | Remove evento |
| GET | /agenda/today | JWT | elderly | Agenda do dia |

Regras:

- createAgenda usa reminder true por padrao
- agenda do dia considera inicio/fim do dia

### 5.7 Weather

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /weather | JWT | qualquer autenticado | Clima + clothingAdvice |

Regras:

- location query opcional
- se ausente, tenta usar elderlyprofile.location
- fallback para Sao Paulo
- cidades mapeadas manualmente (lista no service)
- provider externo: Open-Meteo

### 5.8 Notifications

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /notifications/register | JWT | qualquer autenticado | Registra push token (platform: ios/android/web) |

### 5.9 Interactions

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /interactions/log | JWT | elderly | Registra interacao voice/button |

### 5.10 Categories

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /categories | Publica | - | Lista categorias raiz com subcategorias |
| GET | /categories/:id | Publica | - | Detalhe por UUID |
| POST | /categories | JWT | admin | Cria categoria |
| PATCH | /categories/:id | JWT | admin | Atualiza categoria |
| DELETE | /categories/:id | JWT | admin | Remove categoria |

Observacao:

- controller usa ParseUUIDPipe para id; seed com IDs nao UUID pode gerar inconsistencias em testes.

### 5.11 Offerings

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /offerings | JWT | provider/admin | Cria oferta |
| GET | /offerings | Publica | - | Lista ofertas ativas |
| GET | /offerings/category/:categoryId | Publica | - | Lista por categoria |
| GET | /offerings/subcategory/:subcategoryId | Publica | - | Lista por subcategoria |
| GET | /offerings/:id | Publica | - | Detalhe da oferta |
| PATCH | /offerings/:id | JWT | dono da oferta | Atualiza oferta |
| DELETE | /offerings/:id | JWT | dono da oferta | Desativa oferta |
| POST | /offerings/:id/contact-data | JWT | autenticado | Solicita dados de contato da oferta |

### 5.12 Service Requests

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| POST | /services/request | JWT | elderly | Cria solicitacao de servico |
| GET | /services/my-requests | JWT | elderly | Lista solicitacoes do proprio idoso |
| PATCH | /services/requests/:id/cancel | JWT | elderly | Cancela solicitacao pendente |

Regras de negocio criticas:

- detecta conflitos por horario ao criar pedido:
  - medicamentos ativos: janela de 30 min
  - agenda: janela de 1h
- se houver conflito, retorno vem com success=false e conflicts[]
- status internos: pending, confirmed, completed, cancelled
- cancelamento so permitido para requisicao pending e do proprio idoso

### 5.13 Health

| Metodo | Rota | Auth | Role | Descricao |
|---|---|---|---|---|
| GET | /health | Publica | - | Health check via Nest Terminus + consulta leve no Supabase |

## 6. Mobile (Expo) - Rotas, Fluxos e Padroes Visuais

### 6.1 Arquitetura mobile

Arquivos-chave:

- app/_layout.tsx: providers globais + guard de navegacao por role
- app/index.tsx: redirect inicial por estado de sessao
- src/contexts/AuthContext.tsx: bootstrap de sessao, login/signup/logout
- src/services/api.ts: axios com baseURL normalizada e Bearer automatico

Fluxo de sessao:

1. Carrega token/user do storage.
2. Se token existir, valida com GET /auth/me.
3. Se token invalido, limpa storage e volta para /auth/role-select.
4. Se valido, redireciona conforme role.

### 6.2 Mapa de rotas (Expo Router)

#### Rotas de autenticacao

- /auth/role-select
- /auth/elderly-login
- /auth/elderly-signup
- /auth/caregiver-login
- /auth/caregiver-signup
- /auth/provider-login
- /auth/provider-signup
- /auth/admin-login
- /auth/admin-signup

#### Rotas elderly

- /elderly/home
- /elderly/medications
- /elderly/contacts
- /elderly/agenda
- /elderly/settings
- /elderly/onboarding

#### Rotas caregiver

- /caregiver/dashboard
- /caregiver/elderly/[id]

#### Rotas provider (stubs)

- /provider/dashboard

#### Rotas admin (stubs)

- /admin/dashboard

Protecao de navegacao:

- user nulo -> /auth/role-select
- elderly -> /elderly/home
- caregiver -> /caregiver/dashboard
- provider -> /provider/dashboard
- admin -> /admin/dashboard

### 6.3 Padroes visuais e UX

Fonte de verdade: packages/mobile/src/constants/theme.ts e components/shared

Tokens de cor principais:

- primary: #E53935
- accent: #FF9800
- secondary: #E91E63
- success: #43A047
- info: #1E88E5
- warning: #FDD835
- background: #FAFAF5
- surface: #FFFFFF
- textPrimary: #1A1A1A

Tipografia (escala grande, focada em legibilidade):

- titulos entre 24-36
- texto de corpo entre 18-20
- labels de acao com peso alto

Componentes compartilhados e padroes:

- LargeButton:
  - minHeight padrao 56
  - feedback haptico (nativo)
  - escala de pressao (0.97)
- LargeInput:
  - label flutuante
  - borda com estados foco/erro
  - fonte maior para publico idoso
- Card:
  - superficie branca com canto arredondado
  - sombra/elevation por padrao
- VoiceButton:
  - animacao de pulso em estado de escuta
  - troca de cor quando listening
- DateTimePicker:
  - modal com calendario customizado
  - localizacao pt-BR para formatacao

Padrao de experiencia por perfil:

- Elderly: experiencia voice-first, cards grandes, botoes grandes e menos densidade de informacao.
- Caregiver: foco em gestao e CRUD de dados do idoso vinculado.
- Provider/Admin: rotas prontas, dashboards ainda em modo placeholder.

## 7. Regras de Negocio Consolidadas

### 7.1 Vinculacao idoso-cuidador

- linkCode gerado no signup do elderly
- caregiver faz POST /caregiver/link com codigo
- sistema bloqueia duplicidade de vinculo

### 7.2 Controle de acesso a dados clinicos e de rotina

- verifyAccess e usado em agenda, medicamentos, contatos e historicos
- elderly acessa somente seus dados
- caregiver acessa somente idosos vinculados

### 7.3 Monitoramento diario

- caregiver dashboard agrega todayMedicationStats
- hasAlert sobe quando ha 2 ou mais missed no dia

### 7.4 Medicacao

- status diario derivado de medicationhistory
- confirmacao cria/atualiza registro do dia

### 7.5 Contatos e sociabilidade

- registro de ligacao atualiza lastCallAt e cria callhistory
- atraso de contato calculado por thresholdDays

### 7.6 Servicos/Marketplace

- idoso pede servico em offerings
- validacao preventiva de conflito de horario
- cancelamento apenas de pedido pendente e proprio

## 8. Supabase, Seguranca e Infra

### 8.1 Cliente de banco no backend

- SupabaseService exige:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
- auth.persistSession = false no backend

### 8.2 Migrations relevantes

- 0002_enable_rls.sql:
  - habilita RLS em tabelas sensiveis
  - category com policy de leitura publica
- 0003_fix_service_role_schema_permissions.sql:
  - corrige permissoes de service_role no schema public
  - resolve erro permission denied for schema public

### 8.3 Hardening em runtime

- JWT + RolesGuard
- ValidationPipe whitelist + forbidNonWhitelisted
- Helmet
- Throttler global
- RequestIdInterceptor para rastreabilidade

## 9. Operacao Local

### 9.1 Pre-requisitos

- Node.js 18+
- npm 9+
- Projeto Supabase com chaves validas

### 9.2 Arquivos de ambiente

Backend (packages/backend/.env):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY (opcional/compatibilidade)
- PORT=3000
- NODE_ENV=development
- CORS_ORIGINS=http://localhost:3000,http://localhost:19006,http://localhost:8081

Mobile (packages/mobile/.env):

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY
- EXPO_PUBLIC_API_URL=http://localhost:3000/api

### 9.3 Comandos principais

- npm install
- npm run start:backend
- npm run start:mobile
- npm run build:backend

Tipos compartilhados do banco:

- @99-pai/shared -> script generate:types
- gera src/types/database.ts a partir do schema Supabase

## 10. Testes e Qualidade Atual

Backend:

- E2E em packages/backend/test
  - auth-health.e2e-spec.ts
  - elderly-caregiver.e2e-spec.ts
  - app.e2e-spec.ts
- Unit/integration via jest configurado no package backend

Mobile:

- __tests__/auth.test.tsx (cobertura inicial)

Achados relevantes em testes:

- comentarios em auth-health.e2e-spec.ts indicam observacoes historicas:
  - possivel retorno 201 no login em alguns cenarios de teste
  - inconsistencia potencial entre ParseUUIDPipe e seed de categorias

## 11. Troubleshooting Rapido

### 11.1 401 no login com backend aparentemente online

Possivel causa estrutural:

- erro de permissao no Supabase mascarado como Unauthorized em fluxos antigos.

Verifique:

1. GET /api/health
2. erro permission denied for schema public
3. migration 0003 aplicada

### 11.2 Erros de CORS

- incluir origem do Expo/Web em CORS_ORIGINS

### 11.3 Sessao invalida no mobile apos reinicio

- AuthContext invalida token quando GET /auth/me falha e limpa storage

### 11.4 Push notifications nao registram

- web nao registra push via hook (comportamento esperado)
- validar permissao no dispositivo fisico

## 12. Fonte de Verdade por Assunto

- Contratos de API em execucao: /docs (Swagger)
- Rotas backend: controllers em packages/backend/src/*/*.controller.ts
- Regras de negocio: services em packages/backend/src/*/*.service.ts
- Guards/roles: packages/backend/src/auth
- Navegacao mobile: packages/mobile/app
- Design tokens/componentes: packages/mobile/src/constants e src/components/shared
- Infra SQL: supabase/migrations

## 13. Gaps e Pendencias Conhecidas

- provider/admin no mobile ainda com dashboards stubs
- arquivo legado packages/mobile/src/lib/firebase.ts ainda presente
- cobertura de testes mobile baixa (apenas teste inicial)
- validacao continua de seeds versus parse de UUID em categorias

## 14. Como Manter Este Documento Vivo

Atualize este arquivo sempre que ocorrer qualquer uma das mudancas abaixo:

- endpoint novo/removido/alterado
- mudanca em DTO, validacao ou payload
- mudanca em guard/role/permissao
- regra de negocio alterada em service
- mudanca em fluxo de navegacao mobile
- mudanca em tema/componentes compartilhados
- migration SQL nova ou alteracao de RLS/permissoes

Checklist rapido por PR:

1. Rotas alteradas foram refletidas na secao 5?
2. Regras alteradas foram refletidas na secao 7?
3. Fluxo mobile alterado foi refletido na secao 6?
4. Seguranca/infra alterada foi refletida na secao 8?
5. Nova pendencia/gap foi refletida na secao 13?
6. Entrou registro no log de mudancas (secao 15)?

## 15. Log de Mudancas da Documentacao

### Template

- Data:
- Autor:
- Escopo alterado:
- Arquivos consultados:
- Resumo tecnico:
- Impacto em API/fluxo/regra:
- Pendencias abertas:

### Entradas

- Data: 2026-04-02
- Autor: Copilot
- Escopo alterado: reestruturacao completa para documentacao mestre do codebase
- Arquivos consultados:
  - backend: main, app.module, controllers e services principais
  - mobile: layout raiz, rotas, AuthContext, api client, tema, componentes compartilhados
  - infra/docs: ADR-001, ADR-002, LOCAL_DEPLOYMENT, migrations 0002 e 0003
- Resumo tecnico:
  - consolidou arquitetura full-stack, mapa de rotas, regras de negocio, padroes visuais e operacao local
  - adicionou governanca de atualizacao e template de log para continuidade
- Impacto em API/fluxo/regra:
  - sem alteracao de codigo de execucao, apenas melhoria documental
- Pendencias abertas:
  - concluir features provider/admin
  - remover legado firebase quando migracao estiver finalizada
