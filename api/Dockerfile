FROM node:22-bookworm-slim

# openssl : requis par le moteur de migration Prisma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate \
 && chown -R node:node /app

USER node
EXPOSE 4000

# Applique les migrations puis démarre l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
