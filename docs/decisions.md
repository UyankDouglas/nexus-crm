# Registro de decisões de arquitetura

Formato curto: contexto, decisão e consequências. Datas no formato AAAA-MM-DD.

---

## ADR-001 — Sessão server-side em cookie HttpOnly (em vez de JWT)

**Data:** 2026-10-23

**Contexto.** O sistema exige cookies `HttpOnly`, expiração e **revogação** (logout deve invalidar
o acesso imediatamente), além de saber a organização ativa de cada sessão.

**Decisão.** Sessões armazenadas no PostgreSQL. O cookie contém um token aleatório de 256 bits; o
banco guarda apenas seu hash SHA-256 e a organização ativa. Validade padrão de 7 dias
(`SESSION_TTL_HOURS`).

**Consequências.** Logout, suspensão de vínculo e redefinição de senha têm efeito imediato. Custa
uma consulta indexada por requisição — aceitável nesta escala; um cache (Redis) pode ser
adicionado depois sem mudar o contrato.

---

## ADR-002 — CSRF com "signed double-submit cookie"

**Data:** 2026-10-23

**Contexto.** Autenticação por cookie exige proteção CSRF. `SameSite=Lax` ajuda, mas não cobre
todos os cenários (subdomínios, navegadores antigos, _login CSRF_).

**Decisão.** Token `nonce.HMAC(segredo, nonce)` em um cookie legível pelo frontend, reenviado no
cabeçalho `X-CSRF-Token` em toda requisição de escrita — inclusive login e cadastro. Quando o
navegador envia `Origin`, ela precisa estar na lista de origens autorizadas.

**Consequências.** O frontend obtém o token em `GET /api/auth/csrf` e o mantém em memória; o
`apiClient` renova e repete a requisição uma vez se o token for rejeitado.

---

## ADR-003 — Escopo multi-tenant pela organização ativa da sessão

**Data:** 2026-10-23

**Contexto.** Receber `organizationId` do cliente abre espaço para IDOR entre organizações.

**Decisão.** As rotas operam sobre a organização ativa da sessão (`/organizations/current`). O
vínculo `OrganizationMember` com status `ACTIVE` é revalidado a cada requisição. Serviços recebem
o `organizationId` apenas do contexto autenticado.

**Consequências.** Trocar de organização é uma ação explícita (`switch-organization`). Nas próximas
fases, consultas por ID sempre incluirão `organizationId` no filtro, e referências entre entidades
(ex.: cliente de um negócio) terão o pertencimento validado.

---

## ADR-004 — Escolha de versões das dependências

**Data:** 2026-10-23

**Contexto.** O enunciado pede versões estáveis e compatíveis. Em outubro de 2026 o registro npm
indicava, entre outras: TypeScript 7.0, NestJS 12.2, Prisma 8.0 (RC), Vite 8.3, React Router 8.5.

**Decisão.**

| Pacote                                 | Versão         | Motivo                                                                                       |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| TypeScript                             | 6.0            | `typescript-eslint` exige `< 6.1`, `ts-jest` exige `< 7` e o plugin do Swagger aceita até 6  |
| NestJS                                 | 11.2           | Linha CommonJS mantida (patch publicado na mesma semana); a 12 tornou-se ESM-only há 2 meses |
| Prisma                                 | 7.10           | Última estável; a 8 ainda é _release candidate_                                              |
| PostgreSQL                             | 17             | Imagem estável e amplamente suportada                                                        |
| pnpm                                   | 10             | Linha estável e mantida; configuração conhecida de `onlyBuiltDependencies`                   |
| Vite / React / React Router / Tailwind | 8 / 19 / 8 / 4 | Versões atuais, com _peer dependencies_ compatíveis entre si                                 |

**Consequências.** Migrar para NestJS 12 (ESM) e TypeScript 7 será uma tarefa dedicada quando o
ecossistema de lint e testes suportar essas versões.

---

## ADR-005 — Pacote compartilhado ESM consumido pela API CommonJS

**Data:** 2026-10-23

**Contexto.** `@nexus/shared` é ESM (consumido nativamente pelo Vite). A API (NestJS 11) compila
para CommonJS.

**Decisão.** O pacote é compilado para `dist/` como ESM sem _top-level await_; a API o carrega via
`require(esm)`, estável no Node 22.12+. Nos testes, o `ts-jest` transpila o fonte do pacote para
CommonJS (`tsconfig.spec.json`), evitando flags experimentais do Jest.

**Consequências.** `pnpm dev`, `pnpm build`, `pnpm typecheck` e `pnpm test` compilam o pacote
compartilhado antes dos apps.

---

## ADR-006 — E-mails gravados em arquivo durante o desenvolvimento

**Data:** 2026-10-23

**Contexto.** A recuperação de senha precisa funcionar de ponta a ponta, mas o envio real de
e-mails está planejado para uma fase posterior. Escrever o link nos logs exporia tokens.

**Decisão.** O `MailService` grava mensagens `.eml` em `MAIL_OUTBOX_DIR` (ignorado pelo Git) fora
de produção. Em produção, sem provedor configurado, a mensagem não é enviada e um aviso é
registrado — sem o conteúdo.

**Consequências.** Trocar por um provedor SMTP/API exigirá apenas uma nova implementação do
`MailService`.
