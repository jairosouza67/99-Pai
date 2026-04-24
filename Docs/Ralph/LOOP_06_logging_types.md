# 🔁 RALPH LOOP 06 — Logging, Observability & Type Safety

> **Objetivo:** Proteger PII nos logs, melhorar type safety e prevenir log injection.
> **Findings:** M6, L3, L4
> **Esforço:** ~30 min
> **Pré-requisitos:** Loops 01-03 concluídos

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.

---

## ✅ Checklist

### Task 6.1 — Mascarar emails nos logs (M6)
**Arquivo:** `packages/backend/src/auth/auth.service.ts` (~L120, ~L163)

**Problema:** Emails em texto plano nos logs violam LGPD.

**O que fazer:**
1. Criar utility de mascaramento:
   ```typescript
   // packages/backend/src/common/utils/mask.ts
   export function maskEmail(email: string): string {
     const [local, domain] = email.split('@');
     const masked = local.length <= 2
       ? '*'.repeat(local.length)
       : local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 5));
     return `${masked}@${domain}`;
   }
   ```
2. Usar em todos os logs do AuthService:
   ```typescript
   this.logger.log(`User signed up: ${maskEmail(email)} (${role})`);
   this.logger.log(`User logged in: ${maskEmail(email)}`);
   ```

- [ ] Concluído

### Task 6.2 — Tipar `@User()` decorator (L3)
**Arquivo:** `packages/backend/src/auth/auth.controller.ts` (~L40)

**Problema:** `@User() user: any` bypassa TypeScript.

**O que fazer:**
1. Criar interface:
   ```typescript
   // packages/backend/src/auth/interfaces/jwt-payload.interface.ts
   export interface JwtPayload {
     sub: string;       // user ID
     email: string;
     role: string;
     iat?: number;
     exp?: number;
   }
   ```
2. Substituir `any` por `JwtPayload` em todos os controllers

- [ ] Concluído

### Task 6.3 — Validar formato do Request ID (L4)
**Arquivo:** `packages/backend/src/common/interceptors/request-id.interceptor.ts`

**Problema:** `x-request-id` aceito do cliente sem validação → log injection.

**O que fazer:**
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const requestId = (typeof incomingId === 'string' && UUID_REGEX.test(incomingId))
  ? incomingId
  : randomUUID();
```

- [ ] Concluído

---

## 🔄 Pós-Loop
1. [ ] Verificar logs — emails devem aparecer mascarados
2. [ ] TypeScript compila sem `any` nos controllers
3. [ ] Testar request com `x-request-id` malicioso → deve ser ignorado
4. [ ] Atualizar `RALPH_MEMORY.md` → Loop 06 → ✅ CONCLUÍDO
5. [ ] Commit: `fix(security): loop-06 PII masking, type safety, log injection`
