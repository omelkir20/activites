FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
# URL interne de l'API pour les rewrites Next.js (réseau Docker Compose)
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["npm", "start"]
