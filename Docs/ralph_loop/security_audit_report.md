# 🔒 Relatório de Auditoria de Segurança — 99-Pai

**Projeto:** 99-Pai (App de cuidados para idosos)  
**Data:** 2026-05-02  
**Auditor:** Security Auditor Agent  
**Escopo:** Código-fonte completo, Edge Functions, RLS, Segredos, Supply Chain  

---

## 📊 Resumo Executivo

| Severidade | Quantidade | Status |
|-----------|-----------|--------|
| 🔴 **CRITICAL** | 2 | ⚠️ Ação Imediata |
| 🟠 **HIGH** | 4 | ⚠️ Ação Urgente |
| 🟡 **MEDIUM** | 5 | 📋 Planejar |
| 🔵 **LOW** | 5 | 📋 Backlog |
| ℹ️ **INFO** | 3 | ✅ Informativo |

**Score de Segurança Geral: 4.5/10** — O projeto precisa de atenção urgente nos itens críticos.

---

## 🔴 CRITICAL — Ação Imediata Necessária

### C1: Segredos Reais Expostos no `.env` da Raiz

> [!CAUTION]
> O arquivo `.env` raiz contém **17+ segredos reais** incluindo chaves que, se comprometidas, permitem acesso total ao banco de dados e APIs de terceiros.

**Localização:** [.env](file:///d:/VS%20Code/99-Pai/.env)

**Segredos encontrados:**

| Segredo | Tipo | Risco |
|---------|------|-------|
| `DATABASE_URL` | Senha do PostgreSQL em plaintext | Acesso total ao banco |
| `JWT_SECRET` | Chave de assinatura JWT | Forjar tokens de autenticação |
| `SUPABASE_ACCESS_TOKEN` | Token pessoal Supabase | Gerenciar projeto inteiro |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin do Supabase | **Bypass de todo RLS** |
| `OPENROUTER_API_KEY` | Chave de API | Consumo financeiro |
| `OPENAI_API_KEY` | Chave de API | Consumo financeiro |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável | Menor risco |

**Atenuante:** O `.gitignore` **inclui `.env`** e o `git log` confirma que o arquivo **nunca foi commitado**. No entanto:
- O arquivo está acessível localmente a qualquer processo na máquina
- Ferramentas de backup/sync podem capturar este arquivo
- Um desenvolvedor pode acidentalmente commitá-lo num fork

**Remediação:**
1. ✅ **CONFIRMAR** que `.env` nunca foi pushado para remoto: `git log --all --oneline -- .env` (confirmado vazio)
2. 🔄 **ROTACIONAR** todas as chaves por precaução (especialmente `SUPABASE_ACCESS_TOKEN` e `OPENAI_API_KEY`)
3. 📦 Considerar usar um **vault de segredos** (ex: Doppler, 1Password CLI)
4. 🔒 Adicionar pre-commit hook para detectar segredos: `git-secrets` ou `gitleaks`

---

### C2: 10 Tabelas com RLS Habilitado mas SEM Policies

> [!CAUTION]
> **10 tabelas** têm Row Level Security habilitado mas **nenhuma policy definida**. Isso significa que o acesso via token anon ou authenticated está **completamente bloqueado** — incluindo operações legítimas do app.

**Tabelas afetadas (sem nenhuma policy):**

| Tabela | Dados | Impacto |
|--------|-------|---------|
| `offering` | Serviços/ofertas | ❌ Usuários não conseguem listar serviços |
| `agendaevent` | Eventos de agenda | ❌ Agenda não funciona via client |
| `offeringcontact` | Contatos de ofertas | ❌ Não acessível |
| `pushtoken` | Tokens de push | ❌ Notificações quebradas |
| `interactionlog` | Logs de interação | ❌ Não acessível |
| `caregiverlink` | Vínculo cuidador | ❌ Verificação de acesso falha |
| `medicationhistory` | Histórico medicação | ❌ Não acessível |
| `contact` | Contatos | ❌ Lista de contatos não funciona |
| `callhistory` | Histórico chamadas | ❌ Não acessível |
| `servicerequest` | Pedidos de serviço | ❌ Não acessível |

**Tabelas com policies funcionais (apenas 5):**

| Tabela | Policy |
|--------|--------|
| `category` | ✅ Leitura pública |
| `elderlyprofile` | ✅ `elderly_self_access` (auth.uid = userId) |
| `medication` | ✅ `medication_owner_access` (via elderlyprofile) |
| `user` | ✅ `user_self_access` (auth.uid = id) |

**Nota:** As tabelas sem policies funcionam **apenas via Edge Functions** (que usam `SERVICE_ROLE_KEY`). Se o app mobile tenta acessar diretamente via `supabase-js`, as queries retornam vazio.

**Remediação:**
```sql
-- Exemplo: Policy para contact (acessível pelo dono do elderlyprofile)
CREATE POLICY "contact_owner_access" ON public.contact
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM elderlyprofile e
    WHERE e.id = contact."elderlyProfileId"
    AND e."userId" = (auth.uid())::text
  )
);

-- Policy para caregiverlink (caregiver pode ver seus próprios links)
CREATE POLICY "caregiverlink_caregiver_access" ON public.caregiverlink
FOR SELECT USING (
  "caregiverUserId" = (auth.uid())::text
);
```

---

## 🟠 HIGH — Ação Urgente

### H1: CORS Wildcard (`*`) em TODAS as Edge Functions

**Localização:** Todas as 5 Edge Functions

```typescript
// Presente em TODOS os arquivos de Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ← PERIGOSO
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Risco:** Qualquer website pode fazer requests às Edge Functions usando o token do usuário (CSRF via API). Um site malicioso poderia:
- Chamar `voice-tts` repetidamente (consumo financeiro)
- Vincular/desvincular cuidadores via `caregiver-link`
- Criar service requests falsos

**Remediação:**
```typescript
const ALLOWED_ORIGINS = [
  'https://99pai-web.vercel.app',
  'http://localhost:8081',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
```

---

### H2: Ausência de Rate-Limiting nas Edge Functions

**Localização:** Todas as 5 Edge Functions  
**Exceção parcial:** `caregiver-link` tem rate-limiting via DB (5 tentativas → lock 15min), mas apenas para `link-caregiver`.

| Edge Function | Rate Limit | Risco |
|---------------|-----------|-------|
| `voice-tts` | ❌ Nenhum | Abuso financeiro (OpenAI/OpenRouter cobram por request) |
| `weather-get` | ❌ Nenhum | Menor risco (Open-Meteo é grátis) |
| `service-request-validate` | ❌ Nenhum | Spam de pedidos de serviço |
| `notification-register` | ❌ Nenhum | Registro de tokens abusivo |
| `caregiver-link` | ⚠️ Parcial | `generate-link-code` sem limite |

**Remediação:** Implementar rate-limiting via DB ou via Supabase Edge cache:
```typescript
// Exemplo simples com DB timestamp
const { data: recent } = await adminClient
  .from('rate_limits')
  .select('count')
  .eq('user_id', legacyId)
  .eq('action', 'voice-tts')
  .gte('window_start', new Date(Date.now() - 60000).toISOString())
  .single();

if (recent && recent.count >= 10) {
  return jsonResponse({ error: 'Limite de requisições excedido' }, 429);
}
```

---

### H3: Senha do Banco de Dados em Plaintext no `.env`

**Localização:** [.env](file:///d:/VS%20Code/99-Pai/.env) linhas 1-2

```
DATABASE_URL=postgresql://postgres:92015f16389e4c6a83c367e6ee65f8d653da75844a6d47b69c345e366a314279@db.nilzzmiinztpaknxlvcu.supabase.co:5432/postgres
```

**Risco:** A senha do banco permite conexão direta via `psql`, bypass completo de RLS (como superuser).

**Remediação:**
1. 🔄 Rotacionar a senha do banco no Dashboard do Supabase
2. ❌ Remover `DATABASE_URL` e `DIRECT_URL` do `.env` raiz (não são necessários pós-migração)
3. ✅ Usar apenas `SUPABASE_URL` + `SUPABASE_ANON_KEY` no client

---

### H4: Token OIDC da Vercel em `.env.local`

**Localização:** [packages/mobile/.env.local](file:///d:/VS%20Code/99-Pai/packages/mobile/.env.local)

**Risco:** O token OIDC da Vercel (`VERCEL_OIDC_TOKEN`) está salvo localmente. Embora temporário (expira), pode ser usado para impersonar deploys.

**Atenuante:** O `.gitignore` do mobile inclui `.env*.local` ✅

**Remediação:** Token já expirou (timestamp `1775569006`). Nenhuma ação necessária, mas evitar re-gerar manualmente.

---

## 🟡 MEDIUM — Planejar Correção

### M1: `console.log` em Código de Produção

**Localização:** 
- [usePushNotifications.ts:118](file:///d:/VS%20Code/99-Pai/packages/mobile/src/hooks/usePushNotifications.ts#L118) — `console.log("Notification Response", response)`
- Múltiplos `console.log/warn/error` nas Edge Functions (aceitável para server-side logging)

**Risco:** No client-side, pode vazar dados sensíveis no browser console.

**Remediação:**
```typescript
// Remover ou substituir por logger condicional
if (__DEV__) {
  console.log("Notification Response", response);
}
```

---

### M2: Tabela `_prisma_migrations` SEM RLS

**Localização:** Banco de dados Supabase

**Risco:** A tabela `_prisma_migrations` é legado do NestJS e não tem RLS habilitado. Contém metadados de schema que podem ser lidos por tokens anon/authenticated.

**Remediação:**
```sql
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
-- Ou melhor, se não for mais necessária:
DROP TABLE IF EXISTS public._prisma_migrations;
```

---

### M3: Falta Policy para `user_id_mapping`

A tabela `user_id_mapping` não apareceu no scan de RLS — verificar se existe e se tem RLS habilitado.

---

### M4: Falta Validação de Tamanho de Input em Algumas Edge Functions

| Edge Function | Campo | Limite | Status |
|---------------|-------|--------|--------|
| `voice-tts` | `text` | 600 chars | ✅ Validado |
| `caregiver-link` | `linkCode` | Nenhum | ⚠️ Sem limite |
| `notification-register` | `pushToken` | Nenhum | ⚠️ Sem limite |
| `service-request-validate` | `notes` | Nenhum | ⚠️ Sem limite |

**Remediação:** Adicionar validação de tamanho em todos os inputs:
```typescript
if (pushToken.length > 200) {
  return jsonResponse({ error: 'Token too long' }, 400);
}
```

---

### M5: Ausência de Security Headers na Resposta Web

**Localização:** [vercel.json](file:///d:/VS%20Code/99-Pai/vercel.json) — sem headers de segurança configurados

**Headers ausentes:**

| Header | Propósito |
|--------|-----------|
| `Content-Security-Policy` | Prevenção XSS |
| `X-Frame-Options` | Anti-clickjacking |
| `X-Content-Type-Options` | Anti-MIME sniffing |
| `Strict-Transport-Security` | Forçar HTTPS |
| `Referrer-Policy` | Controle de referrer |

**Remediação:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;" }
      ]
    }
  ]
}
```

---

## 🔵 LOW — Backlog

### L1: `dangerouslySetInnerHTML` no `+html.tsx`

**Localização:** [+html.tsx:22](file:///d:/VS%20Code/99-Pai/packages/mobile/app/+html.tsx#L22)

**Risco:** Baixo — o conteúdo é uma string estática de CSS hardcoded. Não há input de usuário. Padrão comum do Expo.

---

### L2: Bucket `tts-cache` é Público (Leitura)

**Localização:** [0005_tts_storage_bucket.sql](file:///d:/VS%20Code/99-Pai/supabase/migrations/0005_tts_storage_bucket.sql)

**Risco:** Qualquer pessoa pode acessar os arquivos de áudio TTS cacheados. O conteúdo são frases genéricas, sem PII. Aceitável para cache de TTS.

---

### L3: `user_id_mapping` Pode Expor Mapeamento de IDs

Se a tabela `user_id_mapping` estiver acessível, um atacante autenticado poderia mapear `auth_id` → `legacy_id` de outros usuários.

---

### L4: Duplicação de Code em Edge Functions

Todas as 5 Edge Functions duplicam:
- `corsHeaders`
- `jsonResponse()`
- `resolveLegacyId()`

**Risco:** Manutenção inconsistente — se um fix de segurança for aplicado em uma função, pode ser esquecido nas outras.

**Remediação:** Extrair para um shared module (`_shared/`).

---

### L5: Dependências com Vulnerabilidades Conhecidas

O `npm audit` reportou vulnerabilidades **moderate** e **high** em dependências transitivas do Expo:

| Pacote | Severidade | Via |
|--------|-----------|-----|
| `@expo/config-plugins` | HIGH | `xml2js`, `xcode` |
| `@expo/config` | HIGH | `semver` |
| `@expo/cli` | MODERATE | Transitiva |

**Remediação:** Atualizar Expo SDK quando possível (fix requer major version bump).

---

## ℹ️ INFORMATIVO — Boas Práticas Observadas

### ✅ I1: Autenticação Consistente nas Edge Functions

Todas as 5 Edge Functions implementam autenticação corretamente:
```typescript
const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
if (authError || !user) {
  return jsonResponse({ error: 'Unauthorized' }, 401)
}
```

### ✅ I2: Service Role Key Isolada no Servidor

A `SERVICE_ROLE_KEY` é usada **apenas** em Edge Functions (server-side). O mobile usa apenas `ANON_KEY`. Zero ocorrências de `SERVICE_ROLE` no código mobile.

### ✅ I3: Rotação de Link Code Após Uso

O `caregiver-link` rotaciona o código de vinculação após um link bem-sucedido (linha 210-219), prevenindo reutilização.

---

## 🗺️ Mapa de Superfície de Ataque

```mermaid
graph TD
    subgraph "Client (Mobile/Web)"
        A[Expo App / PWA]
    end

    subgraph "Supabase"
        B[Auth]
        C[PostgREST + RLS]
        D[Edge Functions]
        E[Storage]
    end

    subgraph "3rd Party APIs"
        F[OpenRouter]
        G[OpenAI]
        H[Google TTS]
        I[Open-Meteo]
    end

    A -->|ANON_KEY| B
    A -->|ANON_KEY + JWT| C
    A -->|JWT via functions.invoke| D
    D -->|SERVICE_ROLE_KEY| C
    D -->|API Keys| F
    D -->|API Keys| G
    D -->|Credentials| H
    D -->|Public API| I
    D -->|SERVICE_ROLE_KEY| E

    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style C fill:#FF9800,color:#fff
    style D fill:#FF5722,color:#fff
    style E fill:#9C27B0,color:#fff
```

### Vetores de Ataque Identificados

| # | Vetor | Probabilidade | Impacto | Risco |
|---|-------|--------------|---------|-------|
| 1 | CORS wildcard + CSRF via API | Alta | Alto | 🔴 CRITICAL |
| 2 | Abuso financeiro via TTS (sem rate-limit) | Média | Alto | 🟠 HIGH |
| 3 | Acesso direto ao DB via DATABASE_URL vazada | Baixa* | Crítico | 🟠 HIGH |
| 4 | Enumeração de link codes (brute-force) | Baixa | Médio | 🟡 MEDIUM |
| 5 | Spam de service requests | Média | Baixo | 🟡 MEDIUM |

*Baixa porque `.env` não está no git, mas existem vetores de exfiltração local.

---

## 📋 Plano de Remediação Priorizado

| Prioridade | Item | Ação | Esforço |
|-----------|------|------|---------|
| **P0** | C1 | Instalar `gitleaks` pre-commit hook + rotacionar chaves | 2h |
| **P0** | C2 | Criar RLS policies para as 10 tabelas sem policies | 4-6h |
| **P1** | H1 | Restringir CORS para origins específicos | 1h |
| **P1** | H2 | Implementar rate-limiting básico | 3h |
| **P1** | H3 | Remover DATABASE_URL do .env raiz + rotacionar senha | 30min |
| **P2** | M5 | Adicionar security headers no vercel.json | 30min |
| **P2** | M4 | Adicionar validação de input size | 1h |
| **P2** | M1 | Remover console.log do client-side | 15min |
| **P2** | M2 | Habilitar RLS ou dropar _prisma_migrations | 15min |
| **P3** | L4 | Extrair shared module para Edge Functions | 2h |
| **P3** | L5 | Atualizar dependências do Expo | 4h+ |

**Tempo total estimado para P0+P1:** ~10-12h  
**Tempo total com P2:** ~12-14h

---

> [!IMPORTANT]
> **Próximos passos recomendados:**
> 1. **Imediatamente:** Executar P0 (rotacionar chaves + criar RLS policies)
> 2. **Esta semana:** Executar P1 (CORS + rate-limiting)
> 3. **Próxima sprint:** P2 (headers + validação)
> 4. **Após estabilizar:** Configurar CI/CD security scan automatizado
