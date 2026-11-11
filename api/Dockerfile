FROM node:25-bookworm-slim AS base
# openssl : requis par le moteur de migration Prisma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Stage 1 : dependances de production + client Prisma
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.js ./
RUN npx prisma generate

# ---- Stage 2 : image finale (utilisateur non-root)
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json prisma.config.js server.js ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
USER node
EXPOSE 4000

# Applique les migrations puis demarre l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]

