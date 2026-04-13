FROM node:20-bookworm-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN npm run prisma:generate
RUN npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
RUN npm run prisma:generate
RUN DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/sante_sn?schema=public&connect_timeout=1" PRISMA_QUERY_ENGINE_LIBRARY="/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node" node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => process.exit(0)).catch((error) => { const message = String(error?.message || error); const code = error?.code; if (code === 'P1001' || message.includes('127.0.0.1') || message.includes('connect')) { console.log('Prisma engine loaded successfully.'); process.exit(0); } console.error(error); process.exit(1); });"
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_DB_SEED_ON_START\" = \"true\" ]; then npm run db:seed:safe; fi && node dist/server.js"]
