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
| `mail`          | Envio de e-mails (caixa de saída em arquivo durante o desenvolvimento)            |
| `health`        | Verificação de disponibilidade da API e do banco                                  |

Novos domínios (clientes, negócios, tarefas…) seguirão o mesmo formato: `controller` fino,
`service` com as regras, DTOs validados e acesso a dados sempre filtrado por `organizationId`
vindo do contexto autenticado.

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

### RBAC

A matriz de permissões vive em `packages/shared/src/permissions.ts` e é a mesma usada pela API
(autorização) e pelo frontend (apenas para ocultar ações).

| Permissão             | Administrador | Gestor Comercial | Vendedor |
| --------------------- | :-----------: | :--------------: | :------: |
| `organization:read`   |       ✓       |        ✓         |    ✓     |
| `organization:update` |       ✓       |                  |          |
| `members:read`        |       ✓       |        ✓         |          |

### Modelo de dados (Fase 1)

```
users ─┬─< organization_members >─┬─ organizations
       │        (role, status)     │
       ├─< sessions ───────────────┘ (active_organization_id, opcional)
       └─< password_reset_tokens
```

- IDs **UUIDv7** (ordenáveis no tempo, bons para índices).
- Datas `timestamptz(3)`; tabelas e colunas em `snake_case`.
- Restrições: e-mail único, slug único, vínculo único por `(organization_id, user_id)`, hashes
  de token únicos; chaves estrangeiras com `ON DELETE CASCADE`/`SET NULL` conforme o caso.

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
- Formulários com React Hook Form + Zod; os schemas de autenticação vêm do pacote compartilhado.
- Tema claro/escuro aplicado antes da renderização (script em `index.html`) para evitar _flash_.
