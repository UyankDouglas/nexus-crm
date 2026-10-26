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

---

## ADR-011 — dnd-kit para o Kanban

**Data:** 2026-10-23

**Contexto.** O funil precisa de arrastar e soltar entre colunas e dentro delas, com React 19,
acessível por teclado e leitor de tela.

**Decisão.** `@dnd-kit/core` + `@dnd-kit/sortable`. O ponteiro arrasta o card inteiro (com
distância mínima de 6 px, para não confundir com cliques); pelo teclado, uma alça focável inicia o
arraste e as setas usam `sortableKeyboardCoordinates`. Os anúncios e instruções de acessibilidade
foram traduzidos para o português, e cada card tem um menu "Mover para…" como alternativa ao
arraste.

**Consequências.** Bibliotecas baseadas em HTML5 drag-and-drop não oferecem teclado nem toque de
forma consistente; o dnd-kit cobre os dois sem dependências nativas. O custo é controlar o estado
intermediário do arraste no componente do quadro.

---

## ADR-012 — Posição dos cards por índice fracionário

**Data:** 2026-10-23

**Contexto.** Reordenar com posições inteiras exige atualizar todos os cards abaixo do ponto de
inserção a cada movimento.

**Decisão.** `deals.position` é `DOUBLE PRECISION`. O cliente informa apenas o negócio que fica
acima (`afterDealId`, ou nada para o topo); a API calcula a média entre os vizinhos dentro de uma
transação. Quando o intervalo fica menor que `1e-6`, a coluna é renumerada (0, 1, 2…) e o cálculo é
refeito.

**Consequências.** Um movimento comum altera uma linha. O cliente nunca envia posições numéricas,
então não consegue corromper a ordenação; um `afterDealId` de outra etapa responde 400.

---

## ADR-013 — Encerramento, reabertura e histórico de negócios

**Data:** 2026-10-23

**Contexto.** Ganhos e perdas alimentam indicadores e relatórios; um vendedor não deveria alterar
um resultado já registrado, e o histórico precisa sobreviver a mudanças nas etapas.

**Decisão.** O status deriva do tipo da etapa de destino (`OPEN`, `WON`, `LOST`). Perder exige
motivo; encerrados ficam bloqueados para edição e só voltam a andar com `deals:reopen` (gestores e
administradores), que limpa `closed_at` e o motivo. Cada mudança de etapa grava os nomes das etapas
e os status de origem e destino em `deal_stage_history`. CHECK constraints garantem a coerência
entre status, `closed_at` e motivo da perda.

**Consequências.** Indicadores de ganho e perda não mudam por engano; a reabertura fica registrada
com autor e data. Renomear ou remover etapas (Fase 5) não apaga o passado.

---

## ADR-014 — Quadro com janela de encerrados e totais calculados no banco

**Data:** 2026-10-23

**Contexto.** As colunas Ganho e Perdido crescem indefinidamente e tornariam o quadro lento e
poluído.

**Decisão.** O quadro devolve os negócios em andamento e os encerrados nos últimos 30 dias
(`BOARD_CLOSED_WINDOW_DAYS`), com contagem e soma por coluna calculadas sobre o que é exibido. A
listagem paginada (`GET /deals`) e os indicadores (`GET /deals/stats`, agregados no PostgreSQL)
consideram todos os negócios do escopo do usuário.

**Consequências.** O quadro continua leve; o histórico completo segue acessível pela listagem e
pelos indicadores do Dashboard. Funis com milhares de negócios abertos poderão exigir paginação por
coluna.

---

## ADR-015 — Cliente com negócios não pode ser excluído

**Data:** 2026-10-23

**Contexto.** Excluir um cliente em cascata apagaria negócios e seu histórico, distorcendo receita
e conversão.

**Decisão.** A FK de `deals` para `customers` usa `NO ACTION`, e a API responde 409 informando
quantos negócios o cliente tem. Os negócios precisam ser excluídos ou transferidos antes.

**Consequências.** Nenhum resultado comercial some como efeito colateral. Quando houver arquivamento
de clientes, ele será a alternativa recomendada à exclusão.

---

## ADR-016 — Fuso de negócio único para prazos e períodos

**Data:** 2026-10-26

**Contexto.** "Atrasada", "vence hoje" e "vendas de outubro" dependem de quando o dia começa. Um
negócio ganho às 22h de 31/10 em Brasília já é 1º/11 em UTC.

**Decisão.** A API usa o fuso `America/Sao_Paulo` (`BUSINESS_TIME_ZONE`) para calcular o "hoje"
das tarefas e para converter intervalos de datas em instantes `[início, fim)`. A conversão usa
`Intl.DateTimeFormat` (com segunda passada para dias com horário de verão), sem dependências
extras. Prazos e previsões de fechamento são `DATE`, sem fuso.

**Consequências.** Indicadores e filtros de prazo são consistentes para toda a equipe,
independentemente do relógio do navegador. Organizações em outros fusos exigirão uma
configuração por organização (prevista para a administração), sem mudar o contrato da API.

---

## ADR-017 — Dashboard em um único endpoint, com agregação no banco

**Data:** 2026-10-26

**Contexto.** O painel combina oito indicadores, cinco gráficos e um ranking, todos sujeitos ao
escopo do usuário e a um filtro de período.

**Decisão.** `GET /dashboard?from&to` executa as consultas em paralelo com `count`, `aggregate` e
`groupBy` do Prisma, reaproveitando `customerScope`, `dealScope` e o escopo de tarefas — o mesmo
filtro de segurança das listagens. Apenas os negócios ganhos do período são lidos (data e valor)
para montar a série temporal no fuso de negócio; o agrupamento e o ranking ficam em funções puras
testadas sem banco. O frontend oferece períodos pré-definidos (7, 30 e 90 dias, 12 meses e ano
corrente), guardados na URL.

**Consequências.** Uma chamada por troca de período, sem SQL manual nem risco de divergência de
escopo. Para volumes muito grandes, a série poderá migrar para `date_trunc` no PostgreSQL ou
tabelas de resumo, mantendo o mesmo formato de resposta.

---

## ADR-018 — Visibilidade e autoria das atividades

**Data:** 2026-10-26

**Contexto.** O histórico de interações precisa ser útil para quem atende o cliente e confiável
como registro.

**Decisão.** Toda atividade pertence a um cliente (o negócio é opcional). O vendedor vê o que
registrou e tudo o que envolve seus clientes ou negócios, inclusive o que a gestão registrou.
Somente o autor edita o próprio registro; o autor ou a gestão (`activities:delete`) excluem.
Datas no futuro são recusadas — compromissos são tarefas.

**Consequências.** O histórico acompanha a carteira: ao redistribuir um cliente, o novo
responsável vê todo o relacionamento anterior. Ninguém reescreve o registro de outra pessoa.

---

## ADR-019 — Vínculos de tarefas e atividades ao excluir negócios e clientes

**Data:** 2026-10-26

**Contexto.** Tarefas e atividades podem apontar para um cliente e um negócio. Excluir um negócio
não deveria apagar o histórico do cliente; excluir um cliente torna seus registros sem sentido.

**Decisão.** A FK para clientes usa `ON DELETE CASCADE`. A FK composta para negócios usa
`NO ACTION`, e a exclusão de um negócio desfaz o vínculo de tarefas e atividades na mesma
transação. (O PostgreSQL permite `SET NULL` em apenas uma coluna da FK, mas o Prisma não
representa essa forma; a regra explícita no serviço evita divergência entre schema e banco.)

**Consequências.** O histórico de relacionamento sobrevive à exclusão de oportunidades, e o banco
continua impedindo referências órfãs ou entre organizações.
