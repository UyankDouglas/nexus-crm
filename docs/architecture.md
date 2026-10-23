# Arquitetura — NEXUS CRM

Este documento descreve como as peças do sistema se encaixam. As decisões e seus motivos estão em
[decisions.md](decisions.md).

## Visão geral

```
apps/web  ──HTTP /api──▶  apps/api  ──Prisma (adapter pg)──▶  PostgreSQL
    │                         │
    └──── packages/shared ────┘   (perfis, permissões, schemas Zod, tipos de resposta)
```

Em desenvolvimento o Vite repassa `/api` para a API (porta 3333). O navegador conversa apenas com a
própria origem, então os cookies de sessão são _first-party_ e não há CORS envolvido.

## Backend (apps/api)

### Módulos

| Módulo          | Responsabilidade                                                                  |
| --------------- | --------------------------------------------------------------------------------- |
| `config`        | Valida variáveis de ambiente com Zod na inicialização; acesso tipado              |
| `prisma`        | `PrismaService` (Prisma 7 com driver adapter `@prisma/adapter-pg`)                |
| `auth`          | Cadastro, login, logout, sessão, troca de organização, CSRF, redefinição de senha |
| `organizations` | Resumo, atualização e membros da organização ativa                                |
| `customers`     | Clientes e contatos: listagem filtrada, CRUD, distribuição, tags e totais         |
| `mail`          | Envio de e-mails (caixa de saída em arquivo durante o desenvolvimento)            |
| `health`        | Verificação de disponibilidade da API e do banco                                  |

Novos domínios (negócios, tarefas…) seguem o mesmo formato do módulo de clientes: `controller`
fino, `service` com as regras, DTOs validados e acesso a dados sempre filtrado pelo escopo do
contexto autenticado. IDs de rota são validados como UUID — malformados respondem 404 sem consultar
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

### RBAC

A matriz de permissões vive em `packages/shared/src/permissions.ts` e é a mesma usada pela API
(autorização) e pelo frontend (apenas para ocultar ações).

| Permissão             | Administrador | Gestor Comercial |       Vendedor       |
| --------------------- | :-----------: | :--------------: | :------------------: |
| `organization:read`   |       ✓       |        ✓         |          ✓           |
| `organization:update` |       ✓       |                  |                      |
| `members:read`        |       ✓       |        ✓         |                      |
| `customers:read`      |       ✓       |        ✓         | ✓ (própria carteira) |
| `customers:read-all`  |       ✓       |        ✓         |                      |
| `customers:create`    |       ✓       |        ✓         |          ✓           |
| `customers:update`    |       ✓       |        ✓         | ✓ (própria carteira) |
| `customers:assign`    |       ✓       |        ✓         |                      |
| `customers:delete`    |       ✓       |        ✓         |                      |

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
- Índices por `(organization_id, …)` para nome, status, responsável, atualização e empresa; índice
  **GIN** nas tags (filtro com `@>`).

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
- Formulários com React Hook Form + Zod; os schemas (autenticação, clientes e contatos) vêm do
  pacote compartilhado, com as mesmas mensagens e limites validados pela API.
- Filtros da listagem de clientes vivem na **URL** (validados ao ler): links compartilháveis,
  botão "voltar" funcional e nenhum valor inválido repassado à API. A página anterior permanece na
  tela enquanto a próxima carrega (`keepPreviousData`).
- Tema claro/escuro aplicado antes da renderização (script em `index.html`) para evitar _flash_.
