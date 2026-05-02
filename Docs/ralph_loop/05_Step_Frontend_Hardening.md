# Etapa 05: Frontend e Vercel Hardening

## 🎯 Objetivos
Aumentar a segurança da aplicação no lado do cliente e do servidor (Vercel) e manter dependências atualizadas (M1, M5, L5).

## 🛠️ Tarefas a Executar

1. **Adicionar Security Headers ao `vercel.json` (M5):**
   - [ ] Abrir (ou criar) `vercel.json` na raiz do projeto web/mobile (depende de como está o deploy web).
   - [ ] Configurar cabeçalhos HTTP estritos: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`.

2. **Remover Logs de Produção (M1):**
   - [ ] Fazer uma busca por `console.log` no código cliente (especialmente em `packages/mobile/src/hooks/usePushNotifications.ts`).
   - [ ] Remover os logs ou encapsulá-los com uma checagem de ambiente (`if (__DEV__)`).

3. **Plano de Atualização de Dependências (L5):**
   - [ ] Levantar se é possível atualizar a versão do SDK do Expo e outras dependências críticas apontadas pelo `npm audit`.
   - [ ] Se a atualização for simples, rodar `npm update` para pacotes com vulnerabilidades moderadas/altas ou agendar a tarefa na issue tracker do projeto.

## 🏁 Encerramento da Etapa (Ralph Loop)
Ao concluir todas as tarefas desta etapa:
1. Atualize o status da Etapa 05 para `[X]` no arquivo `00_Master_Security_Plan.md`.
2. Adicione as dependências que não puderam ser atualizadas no "Histórico de Contexto".
3. **Loop Completo:** O plano de segurança do projeto foi concluído. Informe o usuário de que as mitigações prioritárias estão aplicadas!
