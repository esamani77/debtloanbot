# ---- Build stage ----
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN pnpm build


# ---- Production stage ----
FROM node:22-alpine AS runner

WORKDIR /app

# Bring the full node_modules so prisma CLI and generated client are available
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
