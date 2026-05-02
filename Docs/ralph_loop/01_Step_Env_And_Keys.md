# Etapa 01: Segredos e Ambiente

## 🎯 Objetivos
Resolver as vulnerabilidades críticas e de alta severidade relacionadas a segredos expostos (C1, H3, H4 do Relatório de Auditoria).

## 🛠️ Tarefas a Executar

1. **Revisão e Limpeza do `.env` Raiz:**
   - [ ] Abrir o arquivo `.env` na raiz do projeto.
   - [ ] Remover as variáveis `DATABASE_URL` e `DIRECT_URL` (senhas em plaintext não são necessárias no client).
   - [ ] Verificar quais variáveis podem ser movidas apenas para o ambiente de produção/Vercel.

2. **Rotacionar Segredos (Instruções Manuais para o Usuário):**
   - [ ] Gerar instruções no chat para o usuário rotacionar:
     - Senha do Banco de Dados no painel do Supabase.
     - `JWT_SECRET` (se alterável sem quebrar sessões).
     - `SUPABASE_ACCESS_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY`.
     - `OPENAI_API_KEY` e `OPENROUTER_API_KEY`.

3. **Prevenção de Vazamentos (Pre-commit hook):**
   - [ ] Criar um script para usar `git-secrets` ou adicionar configuração do `gitleaks` (ex: criar arquivo `.gitleaks.toml`).
   - [ ] Adicionar script no `package.json` ou instruir o setup de hooks do Husky para verificar segredos antes dos commits.

## 🏁 Encerramento da Etapa (Ralph Loop)
Ao concluir todas as tarefas desta etapa:
1. Atualize o status da Etapa 01 para `[X]` no arquivo `00_Master_Security_Plan.md`.
2. Adicione qualquer informação relevante no "Histórico de Contexto".
3. Instrua o modelo a **encerrar a resposta e solicitar que você inicie uma nova janela de chat** (novo contexto) anexando o `00_Master_Security_Plan.md` e o próximo passo `02_Step_RLS_Policies.md`.
