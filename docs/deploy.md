# Deploy — NEXUS CRM

O NEXUS CRM roda em qualquer servidor com Docker (VPS, máquina virtual na nuvem ou servidor
próprio). O arquivo [`docker-compose.prod.yml`](../docker-compose.prod.yml) sobe tudo o que é
necessário, com HTTPS automático.

```
Navegador ──HTTPS──▶ web (Caddy) ──/api──▶ api (NestJS) ──▶ postgres (PostgreSQL 17)
                      └─ arquivos do frontend (SPA)
```

- **web** — [Caddy](https://caddyserver.com) serve o frontend compilado, repassa `/api` para a
  API (mesma origem: cookies _first-party_, sem CORS) e obtém o certificado TLS automaticamente
  (Let's Encrypt). Aplica CSP, HSTS e demais cabeçalhos de segurança. É o único serviço que
  publica portas (80 e 443).
- **api** — imagem só com dependências de produção, executada por usuário sem privilégios, com
  _healthcheck_ em `/api/health`.
- **migrate** — aplica as migrations (`prisma migrate deploy`) antes de a API subir e encerra.
- **postgres** — dados em volume Docker; sem portas expostas.
- **seed** (perfil `demo`, opcional) — contas e dados fictícios para uma demonstração isolada.

## Pré-requisitos

- Servidor Linux com Docker Engine e o plugin Docker Compose (v2).
- Para HTTPS: um domínio apontando (registro DNS `A`/`AAAA`) para o servidor e as portas 80 e
  443 liberadas.
- Opcional: uma conta SMTP para enviar convites e links de redefinição de senha.

## Primeira instalação

```bash
git clone https://github.com/UyankDouglas/nexus-crm.git
cd nexus-crm
cp .env.production.example .env.production
```

Edite `.env.production`:

| Variável             | Descrição                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `APP_URL`            | Endereço público, ex.: `https://crm.suaempresa.com.br` (links de e-mail e origem autorizada) |
| `SITE_ADDRESS`       | Domínio servido pelo Caddy (HTTPS automático) ou `:80` atrás de outro proxy com TLS          |
| `POSTGRES_PASSWORD`  | Senha do banco (use caracteres seguros para URL, ex.: gerada em base64url)                   |
| `CSRF_SECRET`        | Segredo aleatório de pelo menos 32 caracteres                                                |
| `SMTP_URL`           | Opcional. Ex.: `smtps://usuario:senha@smtp.provedor.com:465`. Sem ele, nenhum e-mail sai     |
| `MAIL_FROM`          | Remetente dos e-mails                                                                        |
| `RATE_LIMIT_*`       | Limites por minuto e por IP (geral e autenticação)                                           |
| `SWAGGER_ENABLED`    | `false` por padrão em produção                                                               |
| `SEED_DEMO_PASSWORD` | Somente para o perfil `demo`                                                                 |

Para gerar os segredos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Suba o ambiente:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Acompanhe a inicialização com `docker compose -f docker-compose.prod.yml --env-file
.env.production ps` (todos os serviços `running`/`healthy`, e o `migrate` encerrado com código 0)
e acesse o `APP_URL`. A primeira conta é criada pela tela de cadastro (organização +
administrador).

## Demonstração pública isolada

Para um ambiente **dedicado** de demonstração, defina `SEED_DEMO_PASSWORD` e rode a seed:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile demo run --rm seed
```

A seed se recusa a rodar em produção sem `DEMO_MODE=true` (o serviço `seed` já o define) e recria
os dados das organizações de demonstração a cada execução. Nunca use o perfil `demo` no banco de
uma empresa real.

## Atualizações

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

As migrations novas são aplicadas pelo serviço `migrate` antes de a nova API subir. Abas abertas
antes da atualização pedem para recarregar a página ao abrir uma tela nova.

### Imagens publicadas

Ao marcar uma versão (`git tag v1.2.0 && git push origin v1.2.0`), o workflow
[`release.yml`](../.github/workflows/release.yml) publica as imagens no GitHub Container Registry:
`ghcr.io/uyankdouglas/nexus-crm-api`, `-migrate` e `-web`. Para usá-las em vez do build local,
troque as chaves `build:` do compose por `image:` com a versão desejada.

## Backup e restauração

```bash
# Backup (formato customizado do pg_dump)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U nexus -d nexus_crm -Fc > backup-$(date +%F).dump

# Restauração em um banco vazio
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_restore -U nexus -d nexus_crm --clean --if-exists < backup-AAAA-MM-DD.dump
```

Guarde os backups fora do servidor. O volume `caddy-data` guarda os certificados TLS.

## Operação

- **Saúde:** `GET /api/health` responde `{"status":"ok","database":"up"}`.
- **Logs:** `docker compose ... logs -f api` — cada requisição tem um `X-Request-Id`, também
  presente nas respostas de erro. Os logs não registram corpos, cookies nem tokens.
- **Atrás de outro proxy/balanceador com TLS:** use `SITE_ADDRESS=:80`, publique só a porta HTTP
  para o balanceador e mantenha `APP_URL` com `https://`. Os cookies de sessão exigem HTTPS no
  navegador (a única exceção é `http://localhost`).

## Checklist antes de abrir para usuários

- [ ] `CSRF_SECRET` e `POSTGRES_PASSWORD` aleatórios e exclusivos deste ambiente.
- [ ] `APP_URL` com `https://` e o domínio respondendo com certificado válido.
- [ ] `SMTP_URL` configurado (convites e recuperação de senha) e um e-mail de teste recebido.
- [ ] Swagger desligado (`/api/docs` responde 404).
- [ ] Backup automático do banco agendado e uma restauração testada.
- [ ] Perfil `demo` **não** usado em ambiente com dados reais.
