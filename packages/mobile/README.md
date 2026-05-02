# 99por1 - Assistente para Idosos

Aplicativo React Native desenvolvido com Expo para assistir idosos em suas atividades diárias.

## Funcionalidades

### Modo Idoso
- **Interface de Voz**: Interação completa por voz em português (PT-BR)
- **Tela Inicial**: Saudação personalizada, clima e atalhos principais
- **Remédios**: Lista de medicamentos com confirmação de tomada
- **Agenda**: Visualização dos compromissos do dia
- **Contatos**: Lista de contatos com sugestão de ligações
- **Configurações**: Ajustes de som e código de vinculação
- **Onboarding**: Configuração inicial guiada por voz

### Modo Cuidador
- **Dashboard**: Visão geral de todos os idosos vinculados
- **Gerenciamento**: 
  - Adicionar/editar/excluir medicamentos
  - Adicionar/editar/excluir contatos
  - Adicionar/editar/excluir eventos da agenda
- **Histórico**: Visualização do histórico de medicamentos e ligações
- **Vinculação**: Sistema de código para vincular idosos

## Tecnologias

- **React Native** com Expo SDK 54
- **TypeScript** para type safety
- **Expo Router** para navegação
- **React Native Paper** para componentes UI
- **Expo Speech** para Text-to-Speech
- **@react-native-voice/voice** para Speech-to-Text
- **Axios** para requisições HTTP
- **date-fns** para manipulação de datas
- **Zustand** para gerenciamento de estado (se necessário)

## Instalação

```bash
# Instalar dependências
yarn install

# Iniciar em modo desenvolvimento
yarn start

# Iniciar para web
yarn web

# Iniciar para Android
yarn android

# Iniciar para iOS
yarn ios
```

## Configuração

O app se conecta diretamente ao Supabase configurado via variáveis de ambiente:
- `EXPO_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Chave anon do projeto Supabase

## Estrutura do Projeto

```
react_native_space/
├── app/                     # Rotas do Expo Router
│   ├── auth/               # Telas de autenticação
│   ├── elderly/            # Telas do modo idoso
│   ├── caregiver/          # Telas do modo cuidador
│   └── _layout.tsx         # Layout raiz
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   └── shared/        # Componentes compartilhados
│   ├── contexts/          # Contexts do React
│   ├── hooks/             # Custom hooks
│   ├── services/          # Serviços (API, Voice)
│   ├── types/             # TypeScript types
│   └── constants/         # Constantes e tema
└── assets/                # Imagens, fontes, etc.
```

## Acessibilidade

- **Contraste**: Mínimo de 4.5:1 em todos os elementos
- **Fontes**: 20px mínimo para corpo de texto no modo idoso
- **Touch Targets**: 56px mínimo de altura no modo idoso
- **Voz**: Todas as ações têm alternativa por voz
- **Feedback**: Feedback visual e sonoro em todas as interações

## Testes

```bash
# Rodar testes
yarn test

# Type checking
npx tsc --noEmit
```

## Notas

- O app requer permissões de microfone para funcionalidades de voz
- Funcionalidades de voz podem ter suporte limitado na web
- O modo offline está implementado com cache local
