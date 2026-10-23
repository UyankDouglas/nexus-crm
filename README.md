# NEXUS CRM

SaaS de gestão comercial **multi-tenant** para pequenas e médias empresas: clientes, oportunidades,
funil de vendas, tarefas, equipe e resultados em uma única plataforma.

Projeto de portfólio Full Stack desenvolvido de forma incremental, com frontend, API, banco de
dados, autenticação segura, controle de acesso por perfil e testes automatizados.

> **Status:** Fase 1 — Fundação ✅ concluída. Veja o [roadmap](#roadmap).

---

## Sumário

- [Funcionalidades da Fase 1](#funcionalidades-da-fase-1)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Como executar](#como-executar)
- [Contas de demonstração](#contas-de-demonstração)
- [Scripts](#scripts)
- [Testes](#testes)
- [Segurança](#segurança)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Roadmap](#roadmap)

## Funcionalidades da Fase 1

- **Cadastro inicial** de organização + administrador (transação única).
- **Login, logout e sessão** server-side em cookie `HttpOnly` com expiração e revogação.
- **Recuperação e redefinição de senha** com token de uso único (em desenvolvimento, o e-mail é
  gravado em arquivo — veja [E-mails em desenvolvimento](#e-mails-em-desenvolvimento)).
- **Múltiplas organizações por usuário**, com tela de seleção e troca de organização ativa.
- **RBAC** com três perfis — Administrador, Gestor Comercial e Vendedor — validado na API.
- **Isolamento multi-tenant**: toda operação usa a organização ativa da sessão e exige vínculo
  ativo do usuário com ela.
- **Layout definitivo**: sidebar recolhível, topbar com busca (`Ctrl+K`), notificações, menu do
  usuário, tema claro/escuro, layout responsivo, skeletons, toasts e estados vazios.
- **Dashboard** com dados reais do PostgreSQL (equipe por perfil, organização, membros) e a grade
  de indicadores comerciais que será alimentada pelos próximos módulos — sem números fictícios.
- **Configurações**: edição do nome da organização (somente administradores), lista de membros
  (administradores e gestores) e descrição dos perfis.
- Módulos futuros (Clientes, Funil, Tarefas, Relatórios) exibem o escopo planejado, sem simular
  operações.
- **Swagger** em `/api/docs`, **health check** em `/api/health`.

## Stack

| Camada         | Tecnologias                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn/ui (Radix), React Router 8, TanStack Query 5, React Hook Form, Zod 4, Recharts 3, Lucide |
| Backend        | Node.js 24, NestJS 11, Prisma 7 (driver adapter `pg`), PostgreSQL 17, Swagger, class-validator, Argon2, Helmet, Throttler                       |
| Compartilhado  | `@nexus/shared`: perfis, matriz de permissões, schemas Zod e tipos da API                                                                       |
| Qualidade      | pnpm workspaces, ESLint 10, Prettier, Jest + Supertest (API), Vitest + Testing Library (web), GitHub Actions                                    |
| Infraestrutura | Docker Compose (PostgreSQL)                                                                                                                     |

As versões foram escolhidas após checagem de compatibilidade — o motivo de cada escolha está em
[docs/decisions.md](docs/decisions.md).

## Arquitetura

```
┌──────────────────────┐   /api (proxy Vite em dev)   ┌───────────────────────────┐      ┌──────────────┐
│  apps/web (React)    │ ───────────────────────────▶ │  apps/api (NestJS)        │ ───▶ │  PostgreSQL  │
│  TanStack Query      │   cookie HttpOnly + CSRF     │  Guards: Throttle → CSRF  │      │  (Prisma 7)  │
│  React Router        │ ◀─────────────────────────── │  → Auth → Permissões      │      └──────────────┘
└──────────────────────┘                              └───────────────────────────┘
            ▲                                                       ▲
            └──────────────── packages/shared (tipos, RBAC, Zod) ───┘
```

- **Monorepositório** com pnpm workspaces: `apps/web`, `apps/api` e `packages/shared`.
- **API modular** (`auth`, `organizations`, `mail`, `health`), com regras de negócio nos services
  e controllers finos. Guards globais aplicam, nesta ordem: limite de requisições, CSRF,
  autenticação e permissões.
- **Frontend** separado em `services` (camada de acesso à API), `features` (hooks e componentes
  por domínio), `pages`, `layouts` e `routes`.

Detalhes em [docs/architecture.md](docs/architecture.md).

## Como executar

### Pré-requisitos

- **Node.js 24** (mínimo 22.12) — veja `.nvmrc`
- **pnpm 10** — `corepack enable` ou `npm install -g pnpm@10`
- **Docker** (recomendado) _ou_ um PostgreSQL 17 local

### Passo a passo

```bash
# 1. Dependências (gera também o Prisma Client)
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env
cp apps/api/.env.example apps/api/.env
#   Em apps/api/.env, defina um CSRF_SECRET aleatório:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Banco de dados (PostgreSQL em Docker; cria também o banco de testes)
pnpm db:up

# 4. Migrations e dados de demonstração
pnpm db:deploy
pnpm db:seed

# 5. API (http://localhost:3333/api) + Web (http://localhost:5173)
pnpm dev
```

Acesse **http://localhost:5173** e entre com uma das [contas de demonstração](#contas-de-demonstração).
A documentação da API fica em **http://localhost:3333/api/docs**.

### Sem Docker

Instale o PostgreSQL 17, crie os bancos `nexus_crm` e `nexus_crm_test` e ajuste `DATABASE_URL` e
`DATABASE_URL_TEST` em `apps/api/.env`. Os demais passos são iguais (pule o `pnpm db:up`).

### E-mails em desenvolvimento

Ainda não há provedor SMTP (previsto para uma fase futura). Em desenvolvimento, os e-mails — como
o de redefinição de senha — são gravados como arquivos `.eml` em `apps/api/.mail-outbox/` (fora do
Git). Abra o arquivo mais recente para copiar o link de redefinição. O conteúdo nunca é escrito nos
logs.

## Contas de demonstração

Criadas por `pnpm db:seed` — **dados fictícios, para uso exclusivamente local** (domínio reservado
`.example`). A senha de todas as contas é o valor de `SEED_DEMO_PASSWORD` em `apps/api/.env`.

| E-mail                            | Perfil                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `ana.ribeiro@horizonte.example`   | Administrador — Horizonte Tecnologia (Demo)                                  |
| `carlos.mendes@horizonte.example` | Gestor (Horizonte) **e** Vendedor (Vértice) — escolhe a organização no login |
| `juliana.costa@horizonte.example` | Vendedor — Horizonte Tecnologia (Demo)                                       |
| `rafael.lima@horizonte.example`   | Vendedor — Horizonte Tecnologia (Demo)                                       |
| `beatriz.alves@vertice.example`   | Administrador — Vértice Consultoria (Demo)                                   |

A seed é idempotente e se recusa a rodar com `NODE_ENV=production` (exceto com `DEMO_MODE=true`,
para um ambiente público isolado de demonstração).

## Scripts

Executados na raiz do repositório:

| Comando                        | Descrição                                                           |
| ------------------------------ | ------------------------------------------------------------------- |
| `pnpm dev`                     | Sobe pacote compartilhado (watch), API e Web                        |
| `pnpm build`                   | Build de produção de todos os pacotes                               |
| `pnpm typecheck`               | Verificação de tipos em todo o monorepositório                      |
| `pnpm lint` / `lint:fix`       | ESLint                                                              |
| `pnpm format` / `format:check` | Prettier                                                            |
| `pnpm test`                    | Testes unitários (shared, API e web)                                |
| `pnpm test:integration`        | Testes de integração da API contra PostgreSQL (`DATABASE_URL_TEST`) |
| `pnpm db:up` / `db:down`       | Sobe/derruba o PostgreSQL no Docker                                 |
| `pnpm db:migrate`              | Cria/aplica migrations em desenvolvimento (`prisma migrate dev`)    |
| `pnpm db:deploy`               | Aplica migrations existentes (`prisma migrate deploy`)              |
| `pnpm db:seed`                 | Popula os dados de demonstração                                     |
| `pnpm db:reset`                | Recria o banco de desenvolvimento do zero                           |

## Testes

| Suíte                   | Ferramentas                   | Cobertura principal                                                            |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `packages/shared`       | Vitest                        | Matriz RBAC e schemas de validação                                             |
| `apps/api` (unitários)  | Jest                          | CSRF, guard de permissões, regras de login, validação, slug                    |
| `apps/api` (integração) | Jest + Supertest + PostgreSQL | Critérios de aceite da Fase 1 (abaixo)                                         |
| `apps/web`              | Vitest + Testing Library      | Proteção de rotas, formulário de login, cliente HTTP (CSRF/erros), utilitários |

Critérios de aceite verificados pelos testes de integração:

- ✅ Um usuário consegue se cadastrar e entrar; os dados são persistidos no PostgreSQL.
- ✅ Usuário não autenticado não acessa rotas protegidas (401).
- ✅ Vendedor não acessa endpoints administrativos (403) e nada é alterado no banco.
- ✅ Usuários de organizações distintas não consultam nem alteram dados uns dos outros.
- ✅ O logout revoga a sessão: o mesmo cookie deixa de funcionar.
- ✅ Vínculo suspenso perde o acesso imediatamente; CSRF, rate limit e redefinição de senha.

Os testes de integração usam um banco separado (`nexus_crm_test`), limpo antes de cada teste. O
Docker Compose cria esse banco automaticamente. O pipeline de CI
([.github/workflows/ci.yml](.github/workflows/ci.yml)) executa lint, formatação, typecheck,
testes unitários, testes de integração com PostgreSQL e build.

## Segurança

- Senhas com **Argon2id** (parâmetros OWASP) e verificação em tempo constante para e-mails
  inexistentes, evitando enumeração.
- **Sessão server-side**: o cookie carrega só um token aleatório de 256 bits; o banco guarda apenas
  o hash SHA-256. Cookies `HttpOnly`, `SameSite=Lax`, `Secure` e prefixo `__Host-` em produção.
- **CSRF** no padrão _signed double-submit cookie_ (HMAC) em todas as requisições de escrita,
  inclusive login, além de verificação de `Origin`.
- **Rate limiting** geral e restrito nos endpoints de autenticação.
- **Multi-tenant**: o `organizationId` nunca vem do cliente — rotas operam sobre a organização
  ativa da sessão, cujo vínculo é revalidado a cada requisição.
- Validação estrita de DTOs (`whitelist` + `forbidNonWhitelisted`), Helmet, CORS restrito,
  `Cache-Control: no-store`, erros padronizados sem detalhes internos e logs sem corpo, cookies
  ou tokens.
- Segredos apenas em variáveis de ambiente, validadas na inicialização.

## Variáveis de ambiente

| Arquivo         | Uso                                                         |
| --------------- | ----------------------------------------------------------- |
| `.env`          | Docker Compose (usuário, senha, banco e porta do Postgres)  |
| `apps/api/.env` | API: banco, segredo CSRF, sessão, rate limit, Swagger, seed |
| `apps/web/.env` | Opcional: destino do proxy e URL da API                     |

Todos possuem um `.env.example` documentado. Arquivos `.env` nunca são versionados.

## Estrutura de pastas

```
nexus-crm/
├── apps/
│   ├── api/                      # NestJS
│   │   ├── prisma/               # schema, migrations e seed de demonstração
│   │   ├── src/
│   │   │   ├── common/           # guards, decorators, filtros, segurança, utilitários
│   │   │   ├── config/           # validação e acesso tipado ao ambiente
│   │   │   ├── modules/          # auth, organizations, mail, health
│   │   │   └── prisma/           # PrismaService
│   │   └── test/                 # testes de integração
│   └── web/                      # React + Vite
│       └── src/
│           ├── app/              # providers e tema
│           ├── components/       # componentes compartilhados e ui/ (shadcn)
│           ├── features/         # auth, dashboard, organization (hooks + componentes)
│           ├── layouts/          # AuthLayout, AppLayout (sidebar, topbar)
│           ├── lib/              # query client, navegação, formatação
│           ├── pages/            # páginas por rota
│           ├── routes/           # router e guards de rota
│           ├── services/         # camada de acesso à API
│           └── types/
├── packages/shared/              # tipos, RBAC e schemas compartilhados
├── docker/                       # scripts de inicialização do Postgres
├── docs/                         # arquitetura e decisões
└── docker-compose.yml
```

## Roadmap

| Fase | Escopo                                                                 | Status       |
| ---- | ---------------------------------------------------------------------- | ------------ |
| 1    | Fundação: monorepo, auth, organizações, RBAC, layout, seed, testes, CI | ✅ Concluída |
| 2    | Clientes e contatos: CRUD, busca, filtros, paginação, permissões       | ⏳ Próxima   |
| 3    | Negociações: pipeline, etapas, Kanban com drag-and-drop, histórico     | Planejada    |
| 4    | Dashboard com indicadores reais, tarefas e atividades                  | Planejada    |
| 5    | Administração (convites, permissões, pipelines), relatórios, auditoria | Planejada    |
| 6    | Testes E2E (Playwright), revisão de segurança, deploy e documentação   | Planejada    |

## Licença

Projeto de portfólio. Todos os dados de demonstração são fictícios.
