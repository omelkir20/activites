#!/usr/bin/env bash
set -euo pipefail
START=$(date +%s)
cd "$(dirname "$0")/.."

# 1. Destruction
(cd infra/automation && terraform destroy -auto-approve) || true
docker compose down -v --remove-orphans || true

# 2. Reconstruction
docker compose up -d floci
until curl -s http://localhost:4566 >/dev/null; do sleep 1; done
(cd infra/automation && terraform init -input=false && terraform apply -auto-approve)

echo "Reconstruction terminée en $(( $(date +%s) - START )) secondes"
