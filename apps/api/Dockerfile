# syntax=docker/dockerfile:1
# Imagem da API do NEXUS CRM. Construída a partir da raiz do monorepositório:
#   docker build -f apps/api/Dockerfile --target runtime .
# Alvos:
#   - runtime: API em produção (somente dependências de produção, usuário sem privilégios);
#   - migrate: aplica as migrations (e, opcionalmente, a seed de demonstração).

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# OpenSSL é usado pelo motor de migrations do Prisma.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable
WORKDIR /app

# --- Build: dependências completas, Prisma Client gerado, pacote compartilhado e API compilados.
FROM base AS build
# package.json define a versão do pnpm (corepack) usada no fetch e na instalação.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @nexus/api...
RUN pnpm --filter @nexus/shared build && pnpm --filter @nexus/api build

# --- Migrations e seed: reaproveita o build (precisa do Prisma CLI e do tsx). Os binários são
# chamados direto, sem pnpm, para não depender do corepack com o usuário sem privilégios.
FROM build AS migrate
WORKDIR /app/apps/api
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# --- Produção: somente dependências de produção e os arquivos compilados.
FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/
# Sem scripts de instalação: o Prisma Client já está compilado em dist e o argon2 usa binários
# pré-compilados para Linux.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --filter @nexus/api...
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3333
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3333/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/main.js"]
