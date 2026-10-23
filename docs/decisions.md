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

---

## ADR-007 — Visibilidade de clientes por carteira (responsável)

**Data:** 2026-10-23

**Contexto.** Vendedores devem gerenciar apenas os clientes "autorizados"; gestores distribuem
clientes e administradores veem tudo.

**Decisão.** Cada cliente tem um responsável opcional (`owner_id`). Um único filtro de escopo
(`customerScope`) é aplicado a todo acesso: perfis com `customers:read-all` veem a organização
inteira; vendedores, apenas onde são responsáveis. Registros fora do escopo respondem **404**, igual
a um ID inexistente. Atribuir outro responsável (ou nenhum) exige `customers:assign`.

**Consequências.** Redistribuir um cliente remove imediatamente o acesso do vendedor anterior. Um
compartilhamento mais granular (equipes, colaboradores) pode ser adicionado depois ampliando o
mesmo filtro, sem espalhar regras pelos endpoints.

---

## ADR-008 — Chaves estrangeiras compostas e CHECK constraints

**Data:** 2026-10-23

**Contexto.** A validação na API impede referências entre organizações, mas um bug futuro poderia
gravar, por exemplo, um contato apontando para o cliente de outra organização.

**Decisão.** Referências entre registros de negócio usam FKs compostas com `organization_id`
(responsável → `organization_members(organization_id, user_id)`; empresa vinculada e contatos →
`customers(organization_id, id)`). Regras que o Prisma não modela ficam em uma migration de
_CHECK constraints_ (tipo × documento, empresa vinculada só para pessoa física, formatos de UF e
telefone). As FKs compostas usam `ON DELETE NO ACTION`, e o service desvincula pessoas antes de
excluir uma empresa.

**Consequências.** O banco rejeita dados cruzados mesmo fora da API (scripts, seeds, bugs). O
`prisma migrate diff` ignora as CHECK constraints, então elas não geram divergência de schema.

---

## ADR-009 — CNPJ alfanumérico

**Data:** 2026-10-23

**Contexto.** Desde julho de 2026 a Receita Federal emite CNPJs alfanuméricos (IN RFB 2.229/2024):
as 12 primeiras posições aceitam letras; os dígitos verificadores continuam numéricos.

**Decisão.** Documentos são normalizados para maiúsculas sem pontuação (`VARCHAR(14)`). O cálculo
dos dígitos verificadores usa o valor ASCII − 48 de cada caractere, o que mantém compatibilidade com
os CNPJs numéricos. A implementação é testada com o exemplo oficial (`12.ABC.345/01DE-35`).

**Consequências.** Busca, unicidade por organização e formatação funcionam igualmente para os dois
formatos.

---

## ADR-010 — Filtros na URL e paginação por deslocamento

**Data:** 2026-10-23

**Contexto.** A listagem de clientes combina busca, quatro filtros, ordenação e paginação.

**Decisão.** Os filtros vivem nos parâmetros da URL, validados ao ler (valores desconhecidos são
descartados). A API pagina com `page`/`pageSize` (máximo de 100) e devolve `total` e `totalPages`;
a ordenação inclui o `id` como desempate para páginas estáveis. A busca usa `ILIKE` em nome, nome
fantasia e e-mail, e `contains` em documento e telefone normalizados.

**Consequências.** Links compartilháveis e "voltar" funcionam naturalmente. Para carteiras muito
grandes, a busca pode evoluir para índices trigram (`pg_trgm`) e paginação por cursor sem mudar o
contrato do frontend.
