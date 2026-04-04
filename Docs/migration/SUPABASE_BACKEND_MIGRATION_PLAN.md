# Plano de Migração para Supabase (Backend NestJS + Prisma)

Data: 2026-03-31 (atualizado)
Status atual: backend já usa PostgreSQL via Prisma, conectado a Supabase. Credenciais e configuração precisam de hardening antes de formalizar produção.

---

## Resumo Executivo

O backend já está no caminho certo para Supabase, porque:

- Usa PostgreSQL no Prisma (`schema.prisma` com `provider = "postgresql"`).
- `DATABASE_URL` já aponta para instância Supabase (`db.xxx.supabase.co`).
- API mobile conversa com o backend Nest (não direto com banco), o que reduz impacto.
- `directUrl` já declarado no schema Prisma para separar runtime de migrations.

**Recomendação principal:**

- **Fase 0 (urgente):** Corrigir vulnerabilidades de segurança — credenciais expostas, SSL ausente, CORS aberto.
- **Fase 1:** Manter arquitetura atual (Nest + Prisma + JWT próprio) e consolidar Supabase como banco gerenciado com operação madura.
- **Fase 2 (opcional):** Migrar autenticação para Supabase Auth se fizer sentido para produto/equipe.

---

## Diagnóstico do Projeto

### Arquitetura confirmada por auditoria de código

| Componente | Arquivo | Status |
|---|---|---|
| Prisma com PostgreSQL | `prisma/schema.prisma` (linha 9) | ✅ Confirmado |
| PrismaService connect/disconnect | `src/prisma/prisma.service.ts` | ✅ Confirmado |
| Auth próprio bcrypt + JWT | `src/auth/auth.service.ts` + `jwt.strategy.ts` | ✅ Confirmado |
| `directUrl` no schema | `prisma/schema.prisma` (linha 11) | ✅ Declarado, mas **não configurado no `.env`** |
| Migrations versionadas | `prisma/migrations/` | ❌ Pasta não existe |
| Swagger configurado | `src/main.ts` (linha 28-35) | ✅ Exposto em `/docs` sem proteção |

### Módulos do backend (todos via NestJS)

`auth` · `elderly` · `caregiver` · `medications` · `contacts` · `agenda` · `notifications` · `interactions` · `weather` · `categories` · `offerings` · `service-requests`

### Conclusão

O maior ganho imediato **não** é trocar stack: é formalizar operação de produção no Supabase (URLs corretas, SSL, pooling, migrações versionadas, backup, observabilidade) **e resolver as vulnerabilidades de segurança identificadas**.

---

## ⚠️ Fase 0: Correções de Segurança (URGENTE — antes de tudo)

### 0.1 Credenciais expostas no repositório

**Problema:** O arquivo `.env` está no repositório com senha real do banco e `JWT_SECRET` em texto plano. A senha do banco e o secret JWT **já foram comprometidos** se o repo tiver histórico público ou compartilhado.

**Ações imediatas:**

```bash
# 1. Adicionar .env ao .gitignore
echo ".env" >> .gitignore

# 2. Remover .env do tracking do git (sem deletar o arquivo local)
git rm --cached .env

# 3. Commitar a remoção
git commit -m "security: remove .env from tracking, add to gitignore"

# 4. Limpar histórico do git (se repo compartilhado)
# Opção A - BFG Repo Cleaner (mais simples):
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Opção B - git filter-repo:
git filter-repo --path .env --invert-paths
```

**Após limpar o histórico:**

1. Rotacionar a senha do banco no Dashboard Supabase → Settings → Database → Database password.
2. Gerar novo `JWT_SECRET` com: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`.
3. Atualizar `.env` local com novas credenciais.

### 0.2 SSL ausente na connection string

**Problema:** A `DATABASE_URL` atual não inclui `?sslmode=require`. Dados trafegam potencialmente em texto plano.

**Correção:** Todas as URLs devem terminar com `?sslmode=require`.

### 0.3 CORS totalmente aberto

**Problema em `src/main.ts`:**

```typescript
// ANTES (inseguro):
app.enableCors({
  origin: true,     // ← aceita QUALQUER origem
  credentials: true,
});

// DEPOIS (produção):
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

Adicionar `CORS_ORIGINS` ao `.env` com os domínios permitidos.

### 0.4 Swagger exposto sem proteção

**Problema:** Swagger disponível em `/docs` para qualquer pessoa em produção.

**Correção em `src/main.ts`:**

```typescript
// Swagger apenas em dev
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('99-Pai API')
    .setDescription('Unified API for elderly assistant and service marketplace')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
```

### 0.5 `console.log` em produção

**Problema:** `main.ts` usa `console.log` em vez do Logger do NestJS.

**Correção:**

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');
logger.log(`Application running on: http://localhost:${port}`);
logger.log(`Swagger docs at: http://localhost:${port}/docs`);
```

---

## Fase 1: Consolidar Supabase como Banco Gerenciado

### Arquitetura Recomendada

```
Mobile App → NestJS API → Prisma → Supabase Postgres
                                      ↓
                               (pooler porta 6543 para runtime)
                               (direta porta 5432 para migrations)
```

- Continue com regras de negócio no backend.
- Não exponha acesso anônimo direto ao banco para o app mobile.
- Use Supabase apenas como banco gerenciado nesta fase.

---

### 1. Configurar conexões corretas para Prisma + Supabase

**Objetivo:** Separar conexão de runtime (pooler) da conexão de migração (direta).

**Estado atual:** Ambas usam a mesma URL direta (porta 5432), sem pooling.

**Configuração correta no `.env`:**

```env
# Runtime: pooler com transaction mode (porta 6543)
DATABASE_URL=postgresql://postgres.<project-ref>:<nova-senha>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=5

# Migrations: conexão direta (porta 5432)
DIRECT_URL=postgresql://postgres:<nova-senha>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require

# Auth
JWT_SECRET=<novo-secret-gerado>

# App
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

**Referência do `schema.prisma` (já correto, sem alterações):**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Checklist:**

- [ ] `DATABASE_URL` aponta para pooler (porta 6543, transaction mode)
- [ ] `DIRECT_URL` aponta para conexão direta (porta 5432)
- [ ] Ambas com `?sslmode=require`
- [ ] `connection_limit` definido (5 para free tier, 10-25 para Pro)
- [ ] Usuário/senha corretos do projeto Supabase (após rotação)
- [ ] `.env` no `.gitignore`

---

### 2. Ativar fluxo de migrações versionadas

**Objetivo:** Sair de schema sem histórico para migrações controladas.

**Passos (Prisma 6.x):**

```bash
# 1. Criar diretório para a migration baseline
mkdir -p prisma/migrations/0_init

# 2. Gerar SQL baseline a partir do schema atual
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql

# 3. Marcar como já aplicada (o banco já tem esse schema)
npx prisma migrate resolve --applied 0_init

# 4. Verificar status
npx prisma migrate status
```

**A partir daqui, novas alterações seguem o fluxo normal:**

```bash
# Em desenvolvimento:
npx prisma migrate dev --name descricao_da_mudanca

# Em produção/staging:
npx prisma migrate deploy
```

**Checklist:**

- [ ] Baseline migration criada e validada
- [ ] `prisma/migrations/` versionado no git
- [ ] Política definida: **proibido** alterar schema sem migration
- [ ] CI executa `prisma generate` e `prisma migrate status`
- [ ] Deploy em produção usa apenas `prisma migrate deploy`

---

### 3. Hardening de produção

**Objetivo:** Evitar quedas por conexão e facilitar operação.

**3.1 Configuração de conexões:**

| Parâmetro | Free Tier | Pro Tier |
|---|---|---|
| `connection_limit` na URL | 5 | 10-25 |
| Conexões diretas máximas | 60 | 200-500 |
| Pool mode recomendado | `transaction` | `transaction` |

**3.2 Timeouts e retries:**

Configurar no PrismaService ou no ambiente de deploy:

```typescript
// src/prisma/prisma.service.ts (opcional: log de queries lentas)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
  }

  async onModuleInit() {
    this.$on('warn' as never, (e: any) => this.logger.warn(e));
    this.$on('error' as never, (e: any) => this.logger.error(e));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**3.3 Rate limiting:**

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    // ... outros módulos
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

**3.4 Health check endpoint:**

```bash
npm install @nestjs/terminus
```

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

**Checklist:**

- [ ] `connection_limit` adequado na `DATABASE_URL`
- [ ] Timeouts e retries configurados no deploy
- [ ] `JWT_SECRET` em cofre / variável de ambiente do deploy (não em arquivo commitado)
- [ ] Backup verificado: Free tier = **sem backup automático** (considerar pg_dump manual ou upgrade Pro)
- [ ] Rate limiting ativo (`@nestjs/throttler`)
- [ ] Health check endpoint (`/api/health`)
- [ ] Swagger desabilitado ou protegido em produção
- [ ] CORS com allowlist de origens

---

### 4. Observabilidade e segurança

**Objetivo:** Saber quando algo quebra e onde.

**4.1 Logging estruturado:**

- Usar Logger do NestJS em todos os services (não `console.log`)
- Correlacionar logs por request ID (interceptor)
- Ativar log de queries lentas no Prisma (ver seção 3.2)

**4.2 Monitoramento de DB:**

- Usar o **Supabase Dashboard** → Database → Query Performance
- Usar o **Performance Advisor** nativo do Supabase para índices
- Monitorar erros: timeout, too many connections, auth fail

**4.3 Otimização de queries:**

- Rodar `EXPLAIN ANALYZE` para endpoints mais pesados
- Revisar índices — os seguintes já existem no schema:
  - `elderlyprofile`: por `userId`, `linkCode`
  - `caregiverlink`: por `caregiverUserId`, `elderlyProfileId`
  - `medication`: por `elderlyProfileId`, `elderlyProfileId + active`
  - `medicationhistory`: por `elderlyProfileId + scheduledDate`, `medicationId`
  - `offering`: por `categoryId`, `subcategoryId`, `userId`
  - `servicerequest`: por `elderlyProfileId`, `status`

**4.4 Segurança adicional:**

- Trocar `Math.random()` por `crypto.randomBytes()` no `generateLinkCode` (`auth.service.ts` linha 165)
- Adicionar `helmet` para headers de segurança: `npm install helmet`

**Checklist:**

- [ ] Zero `console.log` no código — tudo via Logger do NestJS
- [ ] Request ID nos logs (interceptor global)
- [ ] Supabase Performance Advisor revisado
- [ ] `EXPLAIN ANALYZE` nos 5 endpoints mais usados
- [ ] `linkCode` usando geração criptográfica
- [ ] `helmet` configurado

---

### 5. Testes de regressão antes do corte

**Ferramentas recomendadas:** Jest E2E (`test/jest-e2e.json` já existe) + HTTP client (Insomnia/Postman)

**Rodar seed antes de testar:**

```bash
npx prisma db seed
```

**Checklist completo por módulo:**

| Módulo | Endpoints a testar | Prioridade |
|---|---|---|
| `auth` | `POST signup`, `POST login`, `GET auth/me` | 🔴 Crítica |
| `caregiver` | Fluxo de link com elderlyProfile | 🔴 Crítica |
| `elderly` | CRUD de perfil, onboarding | 🔴 Crítica |
| `medications` | CRUD + histórico de confirmação | 🔴 Crítica |
| `contacts` | CRUD + call history | 🟡 Alta |
| `agenda` | CRUD de eventos | 🟡 Alta |
| `categories` | Listagem com hierarquia (parent/sub) | 🟡 Alta |
| `offerings` | CRUD + contato com requester | 🟡 Alta |
| `service-requests` | Fluxo de status (pending → accepted → completed) | 🟡 Alta |
| `notifications` | Push tokens CRUD | 🟢 Média |
| `interactions` | Logs de interação | 🟢 Média |
| `weather` | Consulta de clima | 🟢 Média |

**Critério de pronto:**

- [ ] 0 erro de autenticação inesperado
- [ ] 0 erro de conexão DB em teste funcional
- [ ] 0 erro de conexão DB em carga básica (10 requests/s por 60s)
- [ ] Tempo médio de resposta < 200ms para CRUD simples
- [ ] Seed executa sem erros em staging

---

## Fase 2 (Opcional): Migrar para Supabase Auth

Somente se houver ganho claro (menos código auth, SSO social, MFA nativo).

**Impacto esperado:**

- Reestruturar `src/auth/*` para validar JWT do Supabase (JWKS) em vez de assinar JWT próprio.
- Adaptar modelo `user` para mapear `id` do `auth.users` do Supabase.
- Revisar fluxo de signup/login no mobile e backend.
- Remover dependências: `bcryptjs`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/passport`.

**Recomendação:**

Não fazer junto com migração de infraestrutura. Primeiro estabilize banco no Supabase (Fase 1 completa), depois avalie se Supabase Auth traz valor real para o produto.

---

## Cronograma de Execução (9 dias)

### Dia 0 — Segurança (URGENTE)

- [ ] Adicionar `.env` ao `.gitignore`
- [ ] Remover `.env` do tracking git + limpar histórico
- [ ] Rotacionar senha do banco no Supabase Dashboard
- [ ] Gerar novo `JWT_SECRET`
- [ ] Atualizar `.env` local com novas credenciais

### Dia 1 — Configuração de conexões

- [ ] Configurar `DATABASE_URL` com pooler (porta 6543) + SSL + connection_limit
- [ ] Configurar `DIRECT_URL` com conexão direta (porta 5432) + SSL
- [ ] Adicionar `CORS_ORIGINS` e `NODE_ENV` ao `.env`
- [ ] Testar conectividade local com ambas URLs

### Dia 2 — Migrations + Git

- [ ] Criar baseline migration (`0_init`)
- [ ] Validar com `prisma migrate status`
- [ ] Subir PR com `prisma/migrations/` + `.gitignore` atualizado

### Dia 3 — Pipeline + Hardening

- [ ] Ajustar pipeline de deploy para `prisma migrate deploy`
- [ ] Aplicar CORS com allowlist
- [ ] Desabilitar Swagger em produção
- [ ] Trocar `console.log` por Logger do NestJS
- [ ] Instalar e configurar `@nestjs/throttler` + `helmet`

### Dia 4 — Health check + Observabilidade

- [ ] Criar health check endpoint (`/api/health`)
- [ ] Configurar log de queries lentas no Prisma
- [ ] Revisar Supabase Performance Advisor

### Dia 5 — Testes de regressão

- [ ] Rodar seed em staging
- [ ] Testar todos os 12 módulos (ver checklist seção 5)
- [ ] Documentar resultados

### Dia 6 — Teste de carga

- [ ] Carga leve (10 req/s × 60s) nos endpoints principais
- [ ] Verificar connection_limit vs comportamento do pooler
- [ ] Ajustar parâmetros se necessário

### Dia 7 — Corte para produção

- [ ] Janela de corte com rollback plan
- [ ] Verificar migrations aplicadas (`prisma migrate status`)
- [ ] Smoke test pós-deploy

### Dia 8-9 — Monitoramento assistido

- [ ] Monitorar logs e métricas por 48h
- [ ] Ajustes finos de performance
- [ ] Documentar lições aprendidas

---

## Riscos e Mitigações

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| 1 | Credenciais já vazaram no histórico git | 🔴 Crítico | Rotacionar + limpar history (Dia 0) |
| 2 | Usar pooler para migrate e falhar DDL | 🔴 Alto | Usar `DIRECT_URL` para migrate |
| 3 | Sem SSL na connection string | 🔴 Alto | Adicionar `?sslmode=require` em ambas URLs |
| 4 | Saturação de conexões | 🟡 Alto | Pooling + `connection_limit` + monitoramento |
| 5 | Free tier sem backup automático | 🟡 Alto | Upgrade para Pro ou `pg_dump` manual periódico |
| 6 | Quebra no auth ao trocar tudo de uma vez | 🟡 Médio | Manter JWT atual na Fase 1, separar Fase 2 |
| 7 | CORS aberto em produção | 🟡 Médio | Allowlist de origens via `CORS_ORIGINS` |
| 8 | Swagger exposto publicamente | 🟡 Médio | Desabilitar em `NODE_ENV=production` |
| 9 | `linkCode` com `Math.random()` previsível | 🟡 Médio | Trocar para `crypto.randomBytes()` |
| 10 | Sem rate limiting | 🟡 Médio | `@nestjs/throttler` |

---

## Decisão Recomendada para este projeto

**Decisão:**

1. **Resolver segurança primeiro** (Fase 0) — credenciais, SSL, CORS, Swagger.
2. **Manter NestJS + Prisma + JWT próprio** — não trocar stack agora.
3. **Formalizar Supabase como Postgres gerenciado** com operação madura (pooling, migrations, observabilidade).
4. **Reavaliar Supabase Auth** apenas após estabilização completa da Fase 1.

Essa estratégia entrega valor rápido, minimiza risco, corrige vulnerabilidades reais, e preserva o investimento no backend atual.
