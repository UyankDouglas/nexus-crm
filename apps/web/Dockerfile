# syntax=docker/dockerfile:1
# Frontend do NEXUS CRM servido pelo Caddy, que também repassa /api para a API (mesma origem,
# cookies first-party) e obtém certificados HTTPS automaticamente quando SITE_ADDRESS é um domínio.
# Construída a partir da raiz do monorepositório:
#   docker build -f apps/web/Dockerfile .

FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
# package.json define a versão do pnpm (corepack) usada no fetch e na instalação.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @nexus/web...
RUN pnpm --filter @nexus/shared build && pnpm --filter @nexus/web build

FROM caddy:2.11-alpine
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
EXPOSE 80 443
