# 🔁 RALPH LOOP 04 — JWT & Refresh Token

> **Objetivo:** Reduzir janela de exposição de tokens roubados.
> **Findings:** H2
> **Esforço:** ~4-6 horas
> **Pré-requisitos:** Loops 01-03 concluídos

---

## 📋 Instruções para o Agente

> Leia `Docs/Ralph/RALPH_MEMORY.md` ao iniciar. Atualize ao finalizar.
> ⚠️ Se decisão no MEMORY for adiar para pós-MVP, pule para Loop 05.

---

## ✅ Checklist

### Task 4.1 — Reduzir expiração do Access Token
**Arquivo:** `packages/backend/src/auth/auth.module.ts`
- Alterar `expiresIn: '7d'` → `'15m'` (ou `'1d'` como compromisso)
- ⚠️ Quebra mobile se não implementar refresh ANTES
- [ ] Concluído

### Task 4.2 — Criar tabela `refresh_tokens`
- Migration SQL com: `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`, `user_agent`, `ip_address`
- RLS habilitado, sem policies públicas
- [ ] Concluído

### Task 4.3 — Gerar Refresh Token no AuthService
- `generateRefreshToken(userId, userAgent, ip)` → token random 40 bytes, hash SHA256
- Armazenar hash na tabela, retornar token plain
- Login retorna `{ access_token, refresh_token }`
- [ ] Concluído

### Task 4.4 — Endpoint `/auth/refresh`
- DTO: `RefreshTokenDto { refresh_token: string }`
- Hashear token → buscar na tabela → verificar validade → gerar novo access_token
- [ ] Concluído

### Task 4.5 — Endpoint `/auth/logout`
- `@UseGuards(JwtAuthGuard)` + `@Post('logout')`
- Marcar refresh token como `revoked_at = now()`
- [ ] Concluído

### Task 4.6 — Atualizar mobile para usar refresh
- Armazenar refresh token em SecureStore
- Interceptor: 401 → refresh → retry original request
- [ ] Concluído

---

## 🔄 Pós-Loop
1. [ ] Testar: login → access expira → refresh → continuar
2. [ ] Testar: logout → refresh falha
3. [ ] Atualizar `RALPH_MEMORY.md` → Loop 04 → ✅ CONCLUÍDO
4. [ ] Commit: `feat(security): loop-04 JWT refresh token flow`
