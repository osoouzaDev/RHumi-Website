# RHumi

<div align="center">

<img src="public/rhumi-cube.png" width="160" alt="Logo RHumi">

### Gestão de pessoas, recrutamento e desenvolvimento em um só lugar

Interface web construída com Angular para centralizar os processos de RH: colaboradores, empresa, jornada de admissão, calendário, recrutamento, treinamentos e avaliações.

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

</div>

---

## Visão geral

O **RHumi** é um sistema web voltado à experiência de RH e às equipes da organização. Ele oferece uma área administrativa para a gestão interna e uma experiência pública e personalizada para candidatos e colaboradores.

A aplicação conversa com uma API REST configurada em `http://localhost:8000` e utiliza sessões autenticadas por cookies, com renovação automática da sessão e armazenamento do perfil do usuário no navegador.

## Principais recursos

| Área | O que o sistema permite |
|---|---|
| **Dashboard** | Visão geral da equipe, distribuição por setor e perfil, ranking de desempenho e respostas recentes |
| **Colaboradores** | Consulta, cadastro, edição, classificação, contratação e redefinição de senha dos usuários |
| **Empresa** | Gestão dos dados institucionais, setores, missão, visão, valores e informações da página de carreiras |
| **Jornada** | Acompanhamento das etapas de integração dos colaboradores e conclusão das tarefas de admissão |
| **Calendário** | Visualização mensal e cadastro de eventos organizados por setor |
| **Recrutamento** | Criação de vagas, alteração de status e acompanhamento das candidaturas |
| **Candidatos** | Página pública de vagas, cadastro de candidato e acompanhamento do progresso das candidaturas |
| **Treinamentos** | Conteúdos em YouTube, artigo externo ou PDF, com anexos e provas configuráveis |
| **Avaliações** | Criação de questões, importação em JSON ou texto, respostas e resultados |
| **Área do colaborador** | Tarefas pessoais, conteúdos disponíveis, PDFs, vídeos e realização de provas |
| **Configurações** | Atualização do perfil e seleção dos temas claro, escuro ou automático |

## Perfis de acesso

Os acessos são controlados por guardas de rota no Angular:

- **Administrativo** — acesso às áreas de gestão do sistema.
- **Colaborador** — acesso restrito à área do colaborador, calendário e configurações.
- **Candidato** — acesso às vagas públicas e às próprias candidaturas.
- **Gestor de aprendizagem** — perfis `sakai`, `admin`, `hr_admin` ou `supervisor` podem administrar treinamentos e avaliações.

## Interface

- Visual moderno em tema escuro com suporte a tema claro.
- Navegação por menu orbital persistente nas páginas do sistema.
- Layout responsivo para desktop, tablet e celular.
- Estados claros de carregamento, erro, sucesso e conteúdo vazio.
- Rotas protegidas e redirecionamento conforme o perfil autenticado.
- Componentes reativos com Angular Signals.

## Tecnologias

| Tecnologia | Uso no projeto |
|---|---|
| Angular 22 | Estrutura da aplicação, rotas, guardas e componentes standalone |
| TypeScript 6 | Tipagem e regras de integração com a API |
| Angular Signals | Estado reativo dos componentes e dados calculados |
| Tailwind CSS 4 | Estilização e responsividade |
| RxJS 7 | Suporte a operações reativas |
| Native Fetch API | Comunicação HTTP com a API REST |
| Vitest | Testes unitários |
| Angular CLI | Servidor de desenvolvimento, build e testes |

## Estrutura do projeto

```text
src/
├── app/
│   ├── calendar/              # Calendário mensal e eventos
│   ├── candidate-applications/ # Candidaturas do candidato
│   ├── candidates/            # Gestão administrativa de candidatos
│   ├── company/               # Dados e setores da empresa
│   ├── dashboard/             # Indicadores e desempenho
│   ├── employee-area/         # Área exclusiva do colaborador
│   ├── employees/             # Cadastro e gestão de colaboradores
│   ├── journey/               # Jornada e integração
│   ├── learning-management/   # Treinamentos e avaliações
│   ├── login/                 # Autenticação
│   ├── public-vacancies/      # Vagas públicas e candidatura
│   ├── recruitment/           # Gestão de vagas
│   ├── settings/              # Perfil e tema
│   ├── shared/                # Navegação compartilhada
│   ├── services/              # Autenticação, calendário e aprendizagem
│   ├── auth.guard.ts          # Regras de acesso por perfil
│   └── app.routes.ts          # Mapa de rotas
├── environments/              # Configuração da API
├── index.html
├── main.ts
└── styles.css                 # Tema global e estilos Tailwind
```

## Pré-requisitos

- Node.js compatível com Angular 22
- npm
- API RHumi ativa em `http://localhost:8000`

> Este repositório contém o frontend. Os dados e operações exigem o backend e banco de dados correspondentes.

## Executando localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Verificar o endereço da API

Os ambientes estão configurados em:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
};
```

Para apontar o frontend para outra API, altere `apiUrl` nos dois arquivos de ambiente.

### 3. Iniciar a aplicação

```bash
npm start
```

Acesse `http://localhost:4200/`.

O servidor de desenvolvimento atualiza a aplicação automaticamente após alterações nos arquivos.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run watch` | Gera o build de desenvolvimento continuamente |
| `npm test` | Executa os testes unitários com Vitest |
| `npm run ng -- <comando>` | Encaminha comandos para o Angular CLI |

## Testes

Execute a suíte:

```bash
npm test
```

Os testes cobrem autenticação, guardas de rota, fluxos de colaboradores, empresa, recrutamento, jornada, calendário, aprendizado, área do colaborador e componentes compartilhados.

## Rotas principais

| Rota | Finalidade | Acesso |
|---|---|---|
| `/` | Login por e-mail/senha ou código de colaborador | Público |
| `/vagas` | Vagas públicas e cadastro de candidatos | Público |
| `/candidato/minhas-candidaturas` | Candidaturas do candidato | Candidato |
| `/dashboard` | Indicadores e desempenho | Administrativo |
| `/empresa` | Dados e setores da empresa | Administrativo |
| `/funcionarios` | Gestão de colaboradores | Administrativo |
| `/jornada` | Jornada de integração | Administrativo |
| `/calendario` | Calendário organizacional | Todos autenticados |
| `/recrutamento` | Gestão de vagas | Administrativo |
| `/recrutamento/candidatos` | Candidaturas recebidas | Administrativo |
| `/treinamentos-avaliacoes` | Gestão de conteúdos e avaliações | Gestores de aprendizagem |
| `/area-colaborador` | Treinamentos e tarefas pessoais | Colaborador |
| `/configuracoes` | Perfil e tema | Todos autenticados |

## Integração com a API

A comunicação é centralizada nos serviços:

- `AuthService` — autenticação, sessão, usuários, empresa, recrutamento e jornadas.
- `LearningService` — treinamentos, avaliações, provas, respostas e PDFs.
- `CalendarService` — eventos e setores do calendário.

O frontend utiliza endpoints REST prefixados por `/api`, incluindo operações de login, renovação, perfil, colaboradores, empresa, jornadas, recrutamento, calendário e aprendizagem.

As requisições utilizam cookies de sessão com `credentials: 'include'`. Uma resposta `401` pode disparar automaticamente o endpoint de renovação antes de encerrar a sessão.

## Build de produção

Gere a versão otimizada:

```bash
npm run build
```

Os artefatos serão armazenados em `dist/rhumi-website/browser/`.

Antes do deploy, confirme o valor de `apiUrl` e as configurações de CORS e cookies da API para o domínio publicado.

## Organização visual

O sistema utiliza uma identidade visual própria baseada em:

- Fundo azul-escuro quase preto.
- Destaques em azul, violeta e ciano.
- Cards translúcidos e bordas discretas.
- Tipografia Inter e Jaldi.
- Estados visuais verdes, âmbar e vermelhos para feedback.
- Tema claro adaptável por preferência do dispositivo.

## Contribuição

1. Crie uma branch a partir da branch principal.
2. Faça alterações pequenas e relacionadas.
3. Execute os testes afetados.
4. Execute o build antes de abrir o pull request.
5. Preserve os padrões de design, acessibilidade e tipagem existentes.

```bash
git checkout -b feature/minha-melhoria
npm test
npm run build
```

---

<div align="center">

**RHumi** · Pessoas no centro de cada jornada.

</div>
