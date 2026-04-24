# 🔁 RALPH LOOP 02 — Hardening de Autenticação

> **Objetivo:** Fortalecer o mecanismo de autenticação contra ataques de força bruta e senhas fracas.
> **Findings:** H1, H5, H6
> **Esforço estimado:** ~1-2 horas
> **Pré-requisitos:** Loop 01 concluído

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Ralph/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## ✅ Checklist de Tarefas

### Task 2.1 — Aumentar bcrypt cost factor para 12 (H1 — HIGH)

**Arquivo:** `packages/backend/src/auth/auth.service.ts`

**Problema:** bcrypt está com cost factor 10 (linha ~79). OWASP 2025 recomenda mínimo 12.

**O que fazer:**
1. Abrir `packages/backend/src/auth/auth.service.ts`
2. Localizar a linha com `bcrypt.hash(password, 10)`
3. Alterar para:
   ```typescript
   const BCRYPT_COST = 12;
   const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
   ```
4. Considerar extrair o cost como constante de configuração

**Impacto:** Usuários existentes NÃO são afetados — bcrypt armazena o cost no hash. Novos signups e mudanças de senha usarão cost 12.

**Verificação:**
- Testar signup com uma senha e verificar nos logs que o tempo aumentou ligeiramente
- Confirmar que login com senhas antigas (cost 10) ainda funciona

- [ ] Concluído

---

### Task 2.2 — Fortalecer política de senha (H5 — HIGH)

**Arquivo:** `packages/backend/src/auth/dto/signup.dto.ts`

**Problema:** Política atual aceita `@MinLength(6)` apenas. Senhas como `123456` ou `aaaaaa` são aceitas.

**O que fazer:**
1. Abrir `packages/backend/src/auth/dto/signup.dto.ts`
2. Atualizar validação da senha:
   ```typescript
   @IsString()
   @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
   @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres' })
   @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
     message: 'A senha deve conter ao menos uma letra maiúscula, uma minúscula e um número',
   })
   password!: string;
   ```
3. Importar `MaxLength` e `Matches` de `class-validator`

**Impacto no Frontend:**
- O mobile/web precisa mostrar os requisitos de senha no formulário de signup
- Registrar decisão no `RALPH_MEMORY.md` sobre isso

**Verificação:**
- Testar signup com `123456` → deve falhar
- Testar signup com `Abc12345` → deve funcionar
- Testar signup com senha de 129 caracteres → deve falhar

- [ ] Concluído

---

### Task 2.3 — Implementar proteção contra brute force no login (H6 — HIGH)

**Arquivo:** `packages/backend/src/auth/auth.service.ts` e `packages/backend/src/auth/auth.controller.ts`

**Problema:** Apenas ThrottlerGuard global (60 req/min por IP). Sem lockout por conta.

**O que fazer:**

**Opção A — Simples (recomendada para MVP):**
1. Adicionar throttle específico no endpoint de login:
   ```typescript
   @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 tentativas por minuto
   @Post('login')
   ```

**Opção B — Completa (pós-MVP):**
1. Criar tabela `login_attempts` no Supabase:
   ```sql
   CREATE TABLE login_attempts (
     email TEXT NOT NULL,
     ip_address INET,
     attempted_at TIMESTAMPTZ DEFAULT now(),
     success BOOLEAN DEFAULT false
   );
   CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at);
   ```
2. No `AuthService.login()`:
   - Antes de verificar senha, contar tentativas falhas nos últimos 15 min
   - Se > 5: retornar `429 Too Many Requests` com mensagem "Conta bloqueada temporariamente"
   - Após login com sucesso: limpar tentativas
3. Adicionar delay exponencial nas respostas de erro

**Decisão necessária:** Qual opção implementar? Registrar no `RALPH_MEMORY.md`.

**Verificação:**
- Testar 6 logins falsos seguidos → deve bloquear
- Testar login correto após desbloqueio → deve funcionar

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] Rodar `npm run build` no backend
2. [ ] Testar signup com senha fraca — deve ser rejeitado
3. [ ] Testar login brute force — deve ser bloqueado
4. [ ] Verificar que logins antigos (senhas com bcrypt cost 10) ainda funcionam
5. [ ] Atualizar `RALPH_MEMORY.md` → Loop 02 → Status: ✅ CONCLUÍDO
6. [ ] Commit: `fix(security): loop-02 auth hardening — bcrypt cost, password policy, brute force`
