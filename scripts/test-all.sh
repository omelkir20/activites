#!/usr/bin/env bash
# Lance TOUS les tests en local (sur la VM ou votre machine) : unitaires front + API, puis intégration
# frontend -> API -> PostgreSQL contre la stack Docker Compose en cours d'exécution.
# Prérequis : Node 22+, `docker compose up -d --build` déjà lancé, fichier .env présent.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Tests frontend (Vitest)";  (cd portfolio-next && npm ci --no-audit --no-fund && npm test)
echo "=== Tests API (unitaires, injections, requêtes malformées)"
(cd api && npm ci --no-audit --no-fund && npx prisma generate && npm test)

echo "=== Tests d'intégration frontend -> API -> PostgreSQL"
set -a; source .env; set +a
(cd api && \
  FRONTEND_URL="http://localhost:3000" \
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?schema=public" \
  npm run test:integration)
