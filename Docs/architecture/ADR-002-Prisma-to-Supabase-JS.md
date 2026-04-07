# ADR 002: Substituição do Prisma pelo Supabase-JS diretamente

**Status**: Aprovado
**Data**: 2026-04-01

## Contexto
O backend inicialmente adotava o Prisma ORM para a camada de acesso a dados. O projeto também escolheu o Supabase como BaaS (Backend as a Service), usando as funcionalidades unificadas de PostgreSQL, Auth, Edge Functions, Storage, e Row Level Security (RLS). 

Com as regras de RLS do Supabase ativadas (diretriz mandatória `RULE[user_global]`), a integração via Prisma no lado do servidor limitava nossa capacidade de passar de forma limpa a autenticação do usuário (Access Token JWT do Supabase) que seria exigida nas Row Level Policies de Segurança. Em vez do Prisma lidar com a sessão, o Supabase e seus clientes provêm maneiras seguras e otimizadas para respeitar o RLS.

## Decisão
Removemos o **Prisma ORM** inteiramente (`@prisma/client` e as migrations/schematics contidas na pasta `prisma/`) da arquitetura do Backend, favorecendo o uso estrito do SDK `@supabase/supabase-js`. 
- Geração de Tipos: Usaremos `supabase gen types typescript` para gerar as definições estritas tipadas (`database.ts`) diretas do Schema do banco, a serem consumidas no backend.
- Migrações: Gerenciadas diretamente via as ferramentas do CLI ou Painel da Web do Supabase.

## Consequências
- Os controllers, modules, e services de NestJS foram reescritos para usar o cliente do Supabase passando os Bearer Tokens recebidos das requisições para o SDK. 
- O RLS é aplicado automaticamente, eliminando a dependência do Prisma passar o User Context explicitamente.
- O bundle do projeto fica imensamente menor e simplificado.
- A gestão do ORM local não existe mais, tudo em sync via tipos exportados pelo painel do Supabase!
