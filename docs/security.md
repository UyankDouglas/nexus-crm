# Revisão de segurança — NEXUS CRM

Revisão feita na Fase 6 sobre todo o código das Fases 1 a 5, com o objetivo de confirmar os
controles exigidos para um SaaS multi-tenant e transformar os mais importantes em testes
automatizados que impedem regressões.

## Controles

| Área                  | Como é garantido                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Senhas                | Argon2id (parâmetros OWASP); verificação em tempo constante para e-mails inexistentes                                                                                                    |
| Sessão                | Token aleatório de 256 bits em cookie `HttpOnly`, `SameSite=Lax`, `Secure` e prefixo `__Host-` em produção; o banco guarda só o hash SHA-256; logout, suspensão e troca de senha revogam |
| CSRF                  | _Signed double-submit cookie_ (HMAC) em toda escrita, inclusive login, mais verificação de `Origin`                                                                                      |
| Autorização           | `PermissionsGuard` com a matriz compartilhada; escopo por carteira em cada serviço; registros fora do escopo respondem 404                                                               |
| Multi-tenant          | A organização vem da sessão (nunca do cliente) e o vínculo é revalidado a cada requisição; FKs compostas com `organization_id` no banco                                                  |
| Entrada               | DTOs com `whitelist` + `forbidNonWhitelisted`; IDs de rota validados como UUID; consultas pelo Prisma (o único SQL manual é parametrizado)                                               |
| Abuso                 | Rate limit geral e restrito (por IP) nas rotas de autenticação e convite; `TRUST_PROXY` para obter o IP real atrás do proxy                                                              |
| Tokens de e-mail      | Redefinição de senha e convites com token de uso único; só o hash é gravado; validade limitada                                                                                           |
| Exportações           | Limite de 10.000 linhas; células neutralizadas contra _CSV injection_; cada exportação é auditada                                                                                        |
| Auditoria             | Gravada na transação da ação; tabela somente de inclusão (trigger no PostgreSQL)                                                                                                         |
| Cabeçalhos (produção) | API com Helmet e `Cache-Control: no-store`; o Caddy aplica CSP sem scripts inline, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` e `Permissions-Policy`       |
| Erros e logs          | Corpo de erro padronizado sem detalhes internos; logs com `requestId`, sem corpos, cookies, tokens ou credenciais SMTP                                                                   |
| Segredos              | Somente em variáveis de ambiente validadas na inicialização; o segredo CSRF de exemplo é recusado em produção                                                                            |
| Dependências          | `pnpm audit` sem vulnerabilidades conhecidas (veja abaixo)                                                                                                                               |

## Verificações automatizadas

- **Proteção das rotas** (`apps/api/src/common/auth/route-protection.spec.ts`): lê todas as rotas
  dos controllers e falha se alguma não declarar permissão, se uma rota nova ficar pública sem
  revisão ou se uma rota pública de escrita não tiver o rate limit restrito.
- **Varredura de isolamento** (`apps/api/test/tenant-isolation.int-spec.ts`): com uma sessão de
  administrador de outra organização, chama cada rota que recebe um ID (28 combinações de método e
  rota) e envia referências cruzadas em corpos de requisição (14 casos). Tudo deve responder 404
  ou ser recusado no campo da referência, e uma fotografia dos dados da organização vítima precisa
  continuar idêntica.
- **Testes E2E** (`e2e/`): permissões por perfil, isolamento entre organizações e sessão revogada
  verificados pelo navegador, também contra os contêineres de produção no CI.

## Achados desta revisão

| #   | Achado                                                                                                                                       | Correção                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Com SMTP real, a recuperação de senha esperaria o envio só para e-mails cadastrados (tempo e falhas diferentes revelariam contas existentes) | O envio acontece em segundo plano; resposta idêntica em status, mensagem e tempo. Teste de integração cobre a falha do SMTP             |
| 2   | Falha de e-mail no convite gerava erro 500 genérico, com o convite já gravado                                                                | Resposta `502 EMAIL_DELIVERY_FAILED` com orientação para reenviar; a lista é recarregada                                                |
| 3   | Sem envio real de e-mails em produção                                                                                                        | Transporte SMTP opcional (`SMTP_URL`); a URL, com credenciais, nunca é registrada                                                       |
| 4   | Swagger ligado por padrão em qualquer ambiente                                                                                               | Desligado por padrão em produção (`SWAGGER_ENABLED` explícito para ligar)                                                               |
| 5   | `pnpm audit`: `multer` (alta, via `@nestjs/platform-express`) e `js-yaml` (moderada, via `@nestjs/swagger`)                                  | `overrides` para as versões corrigidas. A API não aceita uploads, então o `multer` não era alcançável, mas a dependência foi atualizada |
| 6   | Script de tema inline no `index.html` impediria uma CSP sem `unsafe-inline`                                                                  | Script movido para `/theme-init.js`; CSP com `script-src 'self'`                                                                        |
| 7   | Erro de uma tela substituía o layout inteiro; após um deploy, telas antigas falhavam sem explicação                                          | Erro exibido dentro do layout, com mensagem específica para versão nova e sem detalhes internos                                         |
| 8   | Acessibilidade: no quadro, a primeira seta lateral do arraste pelo teclado não trocava de etapa                                              | Movimento lateral leva direto à etapa vizinha (com rolagem do quadro); coberto por teste E2E                                            |

## Riscos residuais e próximos passos

- **Autenticação em dois fatores** não existe; recomendada para administradores.
- **Bloqueio por conta**: o rate limit é por IP; tentativas distribuídas contra uma mesma conta não
  são bloqueadas além dele. Um limite por e-mail (com backoff) é um próximo passo.
- **Sessões após troca de perfil**: a permissão é recalculada a cada requisição, mas as sessões
  abertas não são encerradas; isso é intencional e não dá acesso além do novo perfil.
- **Mapas de código-fonte** são publicados junto com o frontend (o projeto é aberto); em um
  produto fechado, desative `build.sourcemap` ou restrinja o acesso aos `.map`.
- **Retenção** da auditoria e de sessões expiradas não é automatizada; defina uma rotina conforme a
  política de dados da empresa (LGPD).
