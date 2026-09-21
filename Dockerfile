# syntax=docker/dockerfile:1
# Beer Tracker — multi-stage build (Node + Next standalone + slim sync-worker).
# Данные приложения — PostgreSQL + опционально Redis (см. docker-compose.yml).

# --- Base: Node 20 + pnpm ---
FROM node:20-slim AS base
# Pin to the same major as GitHub CI. `pnpm@latest` (12+) fails install with ERR_PNPM_IGNORED_BUILDS.
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile && pnpm store prune

# --- Sync worker bundle (BullMQ; без Next.js) ---
FROM deps AS sync-worker-build
COPY --link . .
RUN pnpm sync-worker:build

FROM node:20-slim AS sync-worker
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs syncworker
COPY --link --from=sync-worker-build --chown=1001:1001 /app/dist/sync-worker/index.js ./index.js
USER syncworker
CMD ["node", "index.js"]

# --- Build ---
FROM base AS builder
ARG NODE_OPTIONS="--max-old-space-size=4096"
ARG GIT_SHA=""
ARG APP_VERSION=""
ENV NODE_OPTIONS=$NODE_OPTIONS \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PRIVATE_STANDALONE=1 \
    NEXT_IGNORE_ESLINT=1 \
    GIT_SHA=$GIT_SHA \
    NEXT_PUBLIC_GIT_SHA=$GIT_SHA \
    APP_VERSION=$APP_VERSION \
    NEXT_PUBLIC_APP_VERSION=$APP_VERSION

COPY --link --from=deps /app/node_modules ./node_modules
COPY --link . .

RUN echo "Starting Next.js build..." && \
    pnpm build && \
    echo "Build completed successfully"

# --- Development (hot reload; use with docker-compose.dev.yml) ---
FROM base AS dev
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile && pnpm store prune
COPY docker-entrypoint-dev.sh /usr/local/bin/docker-entrypoint-dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-dev.sh
WORKDIR /app
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-dev.sh"]
CMD ["pnpm", "dev:docker"]

# --- Production runner ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --link --from=builder /app/public ./public
COPY --link --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=builder --chown=1001:1001 /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
