# Arquitetura — NEXUS CRM

Este documento descreve como as peças do sistema se encaixam. As decisões e seus motivos estão em
[decisions.md](decisions.md).

## Visão geral

```
apps/web  ──HTTP /api──▶  apps/api  ──Prisma (adapter pg)──▶  PostgreSQL
    │                         │
    └──── packages/shared ────┘   (perfis, permissões, schemas Zod, tipos de resposta)
```

Em desenvolvimento o Vite repassa `/api` para a API (porta 3333); em produção, o Caddy faz o
mesmo papel. O navegador conversa apenas com a própria origem, então os cookies de sessão são
_first-party_ e não há CORS envolvido.

## Backend (apps/api)

### Módulos

| Módulo          | Responsabilidade                                                                      |
| --------------- | ------------------------------------------------------------------------------------- |
| `config`        | Valida variáveis de ambiente com Zod na inicialização; acesso tipado                  |
| `prisma`        | `PrismaService` (Prisma 7 com driver adapter `@prisma/adapter-pg`)                    |
| `auth`          | Cadastro, login, logout, sessão, troca de organização, CSRF, redefinição de senha     |
| `organizations` | Resumo e atualização da organização ativa; membros, perfis e suspensão                |
| `invitations`   | Convites por e-mail: envio, reenvio, cancelamento, pré-visualização e aceite          |
| `customers`     | Clientes e contatos: listagem filtrada, CRUD, distribuição, tags e totais             |
| `deals`         | Funis, etapas e negócios: quadro Kanban, histórico, totais e configuração de funis    |
| `tasks`         | Tarefas com responsável, prazo, prioridade e status, ligadas a clientes/negócios      |
| `activities`    | Histórico de interações: ligações, reuniões, e-mails e observações                    |
| `dashboard`     | Indicadores, séries por período e rankings calculados no banco                        |
| `reports`       | Relatórios comerciais e exportação em CSV e Excel                                     |
| `audit`         | Trilha de auditoria (global: os demais módulos registram ações nela)                  |
| `mail`          | E-mails por SMTP (`SMTP_URL`); sem SMTP, caixa de saída em arquivo no desenvolvimento |
| `health`        | Verificação de disponibilidade da API e do banco                                      |

Todos os domínios seguem o mesmo formato: `controller` fino, `service` com as regras, DTOs
validados e acesso a dados sempre filtrado pelo escopo do contexto autenticado. IDs de rota são validados como UUID — malformados respondem 404 sem consultar
o banco.

### Pipeline de uma requisição

```
requestContextMiddleware   → requestId + log (método, rota, status, duração)
helmet, cookie-parser, Cache-Control: no-store
ThrottlerGuard             → limite geral; limite restrito em rotas @AuthRateLimit()
CsrfGuard                  → métodos de escrita: Origin autorizada + token CSRF válido
AuthGuard                  → resolve a sessão do cookie; exige organização ativa
                             (exceto @Public() e @AllowWithoutOrganization())
PermissionsGuard           → @RequirePermissions(...) conforme o perfil na organização
ValidationPipe             → whitelist + forbidNonWhitelisted + mensagens em pt-BR
Controller → Service → Prisma
AllExceptionsFilter        → erro padronizado { statusCode, code, message, fieldErrors?, requestId }
```

### Autenticação e sessão

1. O frontend obtém um token CSRF (`GET /api/auth/csrf`) e o envia em `X-CSRF-Token`.
2. `POST /api/auth/login` valida as credenciais (Argon2id) e cria uma linha em `sessions` com o
   **hash SHA-256** de um token aleatório. O token puro vai apenas no cookie `HttpOnly`.
3. Se o usuário tem uma única organização ativa, ela já fica ativa na sessão; com várias, o
   frontend mostra a tela de seleção (`POST /api/auth/switch-organization`).
4. A cada requisição, o `AuthGuard` busca a sessão pelo hash, confere expiração/revogação e
   **revalida o vínculo** do usuário com a organização ativa (`organization_members.status`).
5. `POST /api/auth/logout` marca `revoked_at`; a redefinição de senha revoga todas as sessões.

### Multi-tenancy

- Toda entidade de negócio pertence a uma organização (`organization_id`).
- O `organizationId` **nunca** é aceito do cliente para definir escopo: as rotas operam sobre
  `/organizations/current`, isto é, a organização ativa da sessão.
- A troca de organização só ocorre se houver vínculo `ACTIVE`; organizações inexistentes e
  alheias recebem a mesma resposta (403), sem revelar quais existem.
- O `ValidationPipe` rejeita campos não declarados — tentar enviar `organizationId` no corpo
  resulta em 400.
- Atualizações e exclusões usam a chave única composta `(organization_id, id)` no `WHERE`.
- O banco também garante o isolamento: referências entre registros usam **FKs compostas** com
  `organization_id` (veja abaixo).

### Clientes: escopo por carteira

Todo acesso a clientes — listagem, detalhe, tags, totais, contatos, edição e exclusão — passa por
`customerScope(auth)`:

```ts
{ organizationId: auth.organization.id }                      // administradores e gestores
{ organizationId: auth.organization.id, ownerId: auth.user.id } // vendedores
```

- Registro fora do escopo responde **404** (mesma resposta de um ID inexistente).
- O escopo é sempre combinado com outros filtros via `AND`, nunca por espalhamento de objeto —
  um teste de integração pegou exatamente esse vazamento durante o desenvolvimento.
- O vendedor cadastra clientes para si; distribuir (outro responsável ou "sem responsável") exige
  `customers:assign`, e o novo responsável precisa ter vínculo **ativo** na organização.
- Empresa vinculada precisa ser um cliente do tipo empresa **visível** ao usuário.

### Negócios e funil de vendas

Cada organização nasce com um **funil padrão** de sete etapas (Novo lead → Primeiro contato →
Qualificação → Proposta enviada → Negociação → Ganho → Perdido). Cada etapa tem um _tipo_ (`OPEN`,
`WON` ou `LOST`) e uma probabilidade; o tipo da etapa de destino define o status do negócio.

- **Escopo**: `dealScope(auth)` segue a mesma regra de clientes — `deals:read-all` vê a
  organização inteira; vendedores, apenas os negócios em que são responsáveis. Fora do escopo: 404.
- **Movimentação** (`POST /deals/:id/move`) recebe a etapa de destino e, opcionalmente, o negócio
  que fica logo acima (`afterDealId`). As regras ficam em uma função pura (`resolveTransition`),
  coberta por testes unitários:
  - a etapa precisa ser do mesmo funil do negócio;
  - ir para uma etapa de perda exige motivo (3–500 caracteres);
  - negócios encerrados só mudam de etapa — inclusive para reabrir — com `deals:reopen`;
  - reordenar dentro da mesma etapa não altera status, datas nem histórico.
- **Ordem dos cards**: `position` é um número fracionário. Inserir entre dois cards grava a média
  das posições vizinhas, alterando uma única linha; quando o intervalo fica menor que `1e-6`, a
  coluna é renumerada na mesma transação.
- **Histórico**: cada mudança de etapa grava uma linha em `deal_stage_history` com os **nomes** das
  etapas de origem e destino no momento da movimentação, status, motivo da perda e autor — o
  histórico continua legível mesmo se as etapas forem renomeadas.
- **Encerramento**: negócios ganhos ou perdidos ficam bloqueados para edição (409) até serem
  reabertos. O quadro mostra os em andamento e os encerrados nos últimos 30 dias; a listagem
  (`GET /deals`) e os totais consideram todos.
- **Totais** (`GET /deals/stats`): quantidade e valor em andamento, ganhos (quantidade e receita),
  perdidos e taxa de conversão (ganhos ÷ encerrados), sempre dentro do escopo do usuário.
- Um cliente com negócios não pode ser excluído (409): os negócios devem ser excluídos ou
  transferidos antes.

### Tarefas e atividades

- **Tarefas** têm título, descrição, prazo (`DATE`), prioridade (baixa, média, alta), status (a
  fazer, em andamento, concluída, cancelada) e um **responsável** obrigatório. O vendedor cria
  tarefas para si; atribuir a outro membro exige `tasks:assign`, e o responsável precisa ter
  vínculo **ativo**. Escopo (`taskScope`): gestão vê tudo; vendedor, as tarefas sob sua
  responsabilidade.
- Concluir grava `completed_at`; reabrir ou cancelar o limpa — uma _CHECK constraint_ garante a
  coerência. Os filtros de prazo (atrasadas, hoje, próximos 7 dias) usam o **"hoje" do fuso de
  negócio** e consideram apenas tarefas pendentes.
- **Atividades** registram o que já aconteceu: tipo, assunto, detalhes e data/hora (no máximo
  5 minutos no futuro — compromissos são tarefas). Sempre ligadas a um cliente; o negócio é
  opcional.
- Escopo das atividades (`activityScope`): gestão vê tudo; o vendedor vê o que registrou e tudo o
  que envolve **seus clientes ou negócios** — inclusive registros feitos pela gestão. Só o autor
  edita o próprio registro; o autor ou a gestão (`activities:delete`) excluem.
- **Vínculos** (`resolveLinks`): cliente e negócio precisam estar no escopo de quem grava. Com um
  negócio, o cliente passa a ser o do negócio; informar os dois incoerentes responde 400. Em
  edições, os vínculos só são revalidados quando mudam — o vendedor atualiza uma tarefa atribuída
  pela gestão mesmo sem enxergar o cliente vinculado.
- Excluir um **negócio** desfaz o vínculo de tarefas e atividades na mesma transação (elas
  continuam no cliente). Excluir um **cliente** remove em cascata suas tarefas e atividades.

### Dashboard

`GET /dashboard?from=AAAA-MM-DD&to=AAAA-MM-DD` devolve tudo o que o painel precisa em uma
chamada, calculado sobre os **mesmos escopos** das listagens:

| Bloco                    | Origem                                                    | Período         |
| ------------------------ | --------------------------------------------------------- | --------------- |
| Clientes, pipeline       | `count`/`aggregate` sobre `customerScope` e `dealScope`   | Situação atual  |
| Tarefas pendentes        | `TasksService.stats` (pendentes e atrasadas)              | Situação atual  |
| Ganhos, perdas, taxa     | negócios encerrados no intervalo (`closed_at`)            | Intervalo       |
| Vendas por período       | ganhos agrupados por dia, semana ou mês (fuso de negócio) | Intervalo       |
| Negociações por etapa    | `groupBy` dos negócios em andamento do funil padrão       | Situação atual  |
| Performance por vendedor | `groupBy` por responsável (gestão vê toda a equipe)       | Intervalo/atual |
| Distribuição             | negócios **criados** no intervalo, pelo status atual      | Intervalo       |

- O intervalo é convertido em instantes `[início, fim)` no fuso `America/Sao_Paulo`
  (`zonedRangeBounds`); o agrupamento é diário até 31 dias, semanal até 120 e mensal acima disso,
  com grupos vazios preenchidos com zero. As funções de agregação são puras e testadas sem banco.
- Intervalos inválidos, invertidos ou maiores que 731 dias respondem 400.

### Administração

- **Membros** (`PATCH /organizations/current/members/:userId`, `members:manage`): troca de perfil
  e suspensão/reativação. Ninguém altera o próprio vínculo, e a organização nunca fica sem um
  administrador ativo. A suspensão tem efeito imediato, pois o vínculo é revalidado a cada
  requisição.
- **Convites** (`/organizations/current/invitations`): o link leva um token aleatório de 256 bits;
  o banco guarda só o hash SHA-256, com validade de 7 dias. Reenviar gera um novo token (o link
  anterior deixa de valer). Um índice único parcial garante no máximo um convite pendente por
  e-mail. As rotas públicas `POST /invitations/preview` e `POST /invitations/accept` têm rate
  limit; o aceite consome o convite com um `updateMany` condicional (sem corrida entre dois
  aceites). Sem conta, a pessoa define nome e senha e já entra com sessão; com conta, o vínculo é
  criado e ela entra com a própria senha.
- **Funis** (`/pipelines`, `pipelines:manage`): até 10 funis e 12 etapas em andamento por funil.
  Etapas em andamento podem ser criadas, renomeadas, reordenadas (a lista precisa conter todas) e
  excluídas; ganho e perda ficam sempre ao final, com probabilidade fixa. Excluir uma etapa com
  negócios exige uma etapa de destino: os negócios são movidos com registro no histórico, na mesma
  transação. Funis só são excluídos sem negócios e se não forem o padrão.

### Auditoria

`AuditService.record(tx, ator, entrada)` é chamado **dentro da transação** da própria ação: se a
ação falhar, o registro não existe; se o registro falhar, a ação é desfeita. São auditados
alterações da organização, perfis e suspensões, convites (envio, reenvio, cancelamento e aceite),
funis e etapas, exclusões de clientes e negócios, reabertura de negócios encerrados e exportações.
Cada registro guarda ator, ação, entidade, um resumo legível e metadados em JSON — nunca senhas ou
tokens. A tabela é **somente de inclusão**: uma trigger recusa `UPDATE` (a única exceção é a
anonimização do autor pela FK quando um usuário é excluído). `GET /audit` (`audit:read`) filtra
por categoria, pessoa e período.

### Relatórios e exportação

`GET /reports/overview` reúne, sobre os mesmos escopos do dashboard: totais do período (receita,
ganhos, perdas, conversão e ticket médio), desempenho por vendedor (inclui atividades registradas e
tarefas concluídas), receita por período, valor do pipeline por etapa com **previsão ponderada**
(valor × probabilidade) e principais motivos de perda. `GET /reports/closed-deals` lista os
negócios encerrados com filtro de resultado e paginação.

`GET /reports/export?type=…&format=csv|xlsx` gera o arquivo no servidor e registra a exportação na
auditoria:

- **CSV** com separador `;`, vírgula decimal, datas `DD/MM/AAAA` e BOM UTF-8 (abre corretamente no
  Excel em português). Campos que começam com `=`, `+`, `-`, `@`, tabulação ou retorno recebem um
  apóstrofo, neutralizando _CSV injection_.
- **XLSX** escrito pela própria API (SpreadsheetML compactado com `zlib`): números, moeda,
  porcentagem e datas como valores tipados, cabeçalho em negrito e congelado, larguras de coluna.
- Cada exportação é limitada a 10.000 linhas.

### RBAC

A matriz de permissões vive em `packages/shared/src/permissions.ts` e é a mesma usada pela API
(autorização) e pelo frontend (apenas para ocultar ações).

| Permissão             | Administrador | Gestor Comercial |       Vendedor       |
| --------------------- | :-----------: | :--------------: | :------------------: |
| `organization:read`   |       ✓       |        ✓         |          ✓           |
| `organization:update` |       ✓       |                  |                      |
| `members:read`        |       ✓       |        ✓         |                      |
| `members:manage`      |       ✓       |                  |                      |
| `pipelines:manage`    |       ✓       |                  |                      |
| `reports:read`        |       ✓       |        ✓         |                      |
| `reports:export`      |       ✓       |        ✓         |                      |
| `audit:read`          |       ✓       |                  |                      |
| `customers:read`      |       ✓       |        ✓         | ✓ (própria carteira) |
| `customers:read-all`  |       ✓       |        ✓         |                      |
| `customers:create`    |       ✓       |        ✓         |          ✓           |
| `customers:update`    |       ✓       |        ✓         | ✓ (própria carteira) |
| `customers:assign`    |       ✓       |        ✓         |                      |
| `customers:delete`    |       ✓       |        ✓         |                      |
| `deals:read`          |       ✓       |        ✓         | ✓ (própria carteira) |
| `deals:read-all`      |       ✓       |        ✓         |                      |
| `deals:create`        |       ✓       |        ✓         |          ✓           |
| `deals:update`        |       ✓       |        ✓         | ✓ (própria carteira) |
| `deals:assign`        |       ✓       |        ✓         |                      |
| `deals:reopen`        |       ✓       |        ✓         |                      |
| `deals:delete`        |       ✓       |        ✓         |                      |
| `tasks:read`          |       ✓       |        ✓         |  ✓ (sob sua resp.)   |
| `tasks:read-all`      |       ✓       |        ✓         |                      |
| `tasks:create`        |       ✓       |        ✓         |     ✓ (para si)      |
| `tasks:update`        |       ✓       |        ✓         |  ✓ (sob sua resp.)   |
| `tasks:assign`        |       ✓       |        ✓         |                      |
| `tasks:delete`        |       ✓       |        ✓         |                      |
| `activities:read`     |       ✓       |        ✓         | ✓ (própria carteira) |
| `activities:read-all` |       ✓       |        ✓         |                      |
| `activities:create`   |       ✓       |        ✓         |          ✓           |
| `activities:delete`   |       ✓       |        ✓         |   (só as próprias)   |

### Modelo de dados

```
users ─┬─< organization_members >─┬─ organizations
       │        (role, status)     │
       ├─< sessions ───────────────┤ (active_organization_id, opcional)
       └─< password_reset_tokens   │
                                   │
organization_members ─< customers ─┘ (owner_id: responsável comercial)
customers (empresa)  ─< customers    (pessoa física, company_id)
customers            ─< contacts

organizations ─< pipelines ─< pipeline_stages (kind, probability, position)
pipeline_stages ─< deals >─ customers         (value, status, position, owner_id)
deals ─< deal_stage_history                   (etapas de origem/destino, autor, motivo)

organization_members ─< tasks >─ customers?, deals?   (assignee_id, due_date, status, priority)
organization_members ─< activities >─ customers, deals? (author_id, type, occurred_at)

organizations ─< invitations   (email, role, token_hash, expires_at, accepted_at, revoked_at)
organizations ─< audit_logs    (actor_id, action, entity_type, entity_id, summary, metadata)
```

- IDs **UUIDv7** (ordenáveis no tempo, bons para índices).
- Datas `timestamptz(3)`; tabelas e colunas em `snake_case`.
- Restrições: e-mail único, slug único, vínculo único por `(organization_id, user_id)`, hashes
  de token únicos; chaves estrangeiras com `ON DELETE CASCADE`/`SET NULL` conforme o caso.
- **FKs compostas multi-tenant**: `customers(organization_id, owner_id)` →
  `organization_members(organization_id, user_id)`, `customers(organization_id, company_id)` →
  `customers(organization_id, id)` e `contacts(organization_id, customer_id)` →
  `customers(organization_id, id)`.
- **CHECK constraints** (migration própria, ignoradas pelo diff do Prisma): empresa vinculada só
  para pessoa física e nunca a si mesma; formato de CPF/CNPJ coerente com o tipo; UF e telefone.
  Em negócios: valor não negativo, `closed_at` preenchido se e somente se o negócio estiver
  encerrado, motivo da perda se e somente se perdido, probabilidade entre 0 e 100.
- Negócios referenciam funil, etapa (`(organization_id, pipeline_id, stage_id)`), cliente e
  responsável por **FKs compostas**: um negócio não aponta para a etapa de outro funil nem para o
  cliente de outra organização. Valores monetários em `NUMERIC(14,2)`; previsão de fechamento em
  `DATE` (sem fuso).
- Tarefas e atividades usam FKs compostas para responsável/autor (`organization_members`),
  cliente (`ON DELETE CASCADE`) e negócio (sem ação: a API desfaz o vínculo antes de excluir o
  negócio). Prazo em `DATE`; data da atividade em `timestamptz`. Índices por responsável, status e
  prazo (listas de pendências) e por cliente e data (linha do tempo).
- Índices por `(organization_id, …)` para nome, status, responsável, atualização e empresa; índice
  **GIN** nas tags (filtro com `@>`).
- **Convites**: e-mail sempre em minúsculas (CHECK), aceito _ou_ cancelado (nunca os dois) e
  índice único parcial por `(organization_id, email)` entre os pendentes.
- **Auditoria**: índices por data, ação e autor dentro da organização; trigger `BEFORE UPDATE`
  torna a tabela somente de inclusão.

## Frontend (apps/web)

| Pasta         | Conteúdo                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| `services/`   | `apiClient` (fetch + cookies + CSRF + erros normalizados) e serviços REST |
| `features/`   | Hooks do TanStack Query e componentes por domínio                         |
| `pages/`      | Uma página por rota, carregadas sob demanda (`lazy`)                      |
| `layouts/`    | `AuthLayout` e `AppLayout` (sidebar, topbar, busca, menus)                |
| `routes/`     | Roteador e guards `ProtectedRoute` / `GuestRoute`                         |
| `components/` | Componentes compartilhados; `ui/` contém os componentes do shadcn/ui      |

- **Estado do servidor** com TanStack Query. Ao entrar, sair ou trocar de organização, o cache é
  descartado para que nenhum dado de outra organização permaneça na tela.
- Um `401` em qualquer requisição marca o usuário como deslogado e as rotas protegidas
  redirecionam para o login, preservando o destino (com proteção contra _open redirect_).
- Formulários com React Hook Form + Zod; os schemas (autenticação, clientes, contatos e negócios) vêm do
  pacote compartilhado, com as mesmas mensagens e limites validados pela API.
- Filtros da listagem de clientes vivem na **URL** (validados ao ler): links compartilháveis,
  botão "voltar" funcional e nenhum valor inválido repassado à API. A página anterior permanece na
  tela enquanto a próxima carrega (`keepPreviousData`).
- **Kanban** com dnd-kit: o quadro mantém um estado local durante o arraste e, ao soltar, aplica a
  mudança no cache de forma **otimista** (`setQueryData`), desfazendo-a se a API recusar. Ganhos e
  perdas pedem confirmação (e motivo, no caso de perda) antes de gravar. Pelo teclado, a alça do
  card inicia o arraste (Espaço/Enter), as setas movem entre posições e etapas e o leitor de tela
  recebe anúncios em português; o menu de cada card oferece a mesma ação sem arrastar.
- Detalhes e cadastro de negócios abrem em _drawers_ controlados pela URL (`?negocio=<id>`,
  `?novo=1`): a busca global leva direto a um negócio e o "voltar" do navegador fecha o drawer.
- O **dashboard** guarda o período na URL (`?periodo=12m`) e mantém os gráficos atuais na tela
  enquanto o novo período carrega. Gráficos com Recharts (via `ChartContainer` do shadcn/ui), com
  cores do tema e descrição textual (`aria-label`) para leitores de tela.
- **Tarefas e atividades** vivem em uma página com abas (`?aba=atividades`), filtros na URL e
  versões compactas reutilizadas no cliente, no detalhe do negócio e no dashboard. O sino da
  topbar lista as tarefas do usuário atrasadas e do dia.
- **Configurações** em abas na URL (`?aba=funis`): organização, membros, convites, funis,
  permissões e auditoria. Itens de menu e abas declaram a permissão necessária (`useCanSee`); a
  API continua validando cada operação.
- **Relatórios** reutilizam o período do dashboard (`?periodo=`). A exportação baixa o arquivo
  gerado pela API (`apiClient.download` → `Blob` → link temporário), com o nome sugerido no
  `Content-Disposition`.
- **Aceite de convite** (`/convite?token=…`) funciona com ou sem sessão: sem conta, cria a conta e
  descarta o cache da sessão anterior antes de entrar.
- Drawers e diálogos retêm o último conteúdo (`useRetainedValue`) para não encolherem vazios na
  animação de fechamento.
- Tema claro/escuro aplicado antes da renderização (`public/theme-init.js`, carregado pelo
  `index.html`) para evitar _flash_ — em arquivo, e não inline, para a CSP de produção.
- **Erros de tela** aparecem dentro do layout (sidebar e topbar continuam disponíveis), sem
  detalhes internos; se uma tela não carrega por causa de um deploy novo, a mensagem pede para
  recarregar a página.

## Testes

| Camada             | Onde                         | O que cobre                                                                     |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------- |
| Unitários (shared) | `packages/shared/src`        | Schemas, RBAC, datas, períodos e regras de domínio                              |
| Unitários (API)    | `apps/api/src/**/*.spec.ts`  | Guards, proteção de todas as rotas, configuração, e-mail, exportação            |
| Integração (API)   | `apps/api/test`              | Critérios de aceite contra PostgreSQL real, incluindo a varredura de isolamento |
| Unitários (web)    | `apps/web/src/**/*.test.tsx` | Formulários, páginas, filtros, utilitários do quadro                            |
| Ponta a ponta      | `e2e/`                       | Fluxos completos no navegador (Playwright), também contra a produção em Docker  |

## Produção

```
Navegador ──HTTPS──▶ web (Caddy: SPA + cabeçalhos) ──/api──▶ api (NestJS) ──▶ PostgreSQL
                                                          migrate (prisma migrate deploy)
```

Imagens construídas a partir da raiz do monorepositório (`apps/api/Dockerfile` com os alvos
`runtime` e `migrate`, `apps/web/Dockerfile` com o Caddy) e orquestradas pelo
`docker-compose.prod.yml`. O passo a passo, as variáveis e a operação estão em
[deploy.md](deploy.md); a revisão de segurança, em [security.md](security.md).

O CI executa lint, formatação, tipos, testes unitários, integração e build; roda os testes E2E
contra o build local; e constrói as imagens, sobe o ambiente de produção e repete os testes E2E
contra ele. Tags `v*.*.*` publicam as imagens no GitHub Container Registry.
