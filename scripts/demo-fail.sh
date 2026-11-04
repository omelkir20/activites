#!/usr/bin/env bash
# Provoque VOLONTAIREMENT un échec du pipeline Jenkins (tâche 69), puis permet de revenir à l'état sain.
#   ./scripts/demo-fail.sh secret   -> ajoute un faux token GitHub (Gitleaks doit échouer)
#   ./scripts/demo-fail.sh vuln     -> ajoute lodash@4.17.11 (npm audit / Dependency-Check : CRITIQUE)
#   ./scripts/demo-fail.sh restore  -> annule les modifications de démonstration
# Ensuite : git add -A && git commit -m "demo: pipeline en echec" && git push   (puis lancer le job Jenkins)
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-}" in
  secret)
    echo "GITHUB_TOKEN=ghp_$(openssl rand -hex 18)" > demo-secret.env
    echo "Faux secret créé dans demo-secret.env" ;;
  vuln)
    (cd api && npm install lodash@4.17.11 --save --no-audit --no-fund)
    echo "Dépendance vulnérable ajoutée à api/package.json" ;;
  restore)
    rm -f demo-secret.env
    (cd api && npm uninstall lodash --no-audit --no-fund 2>/dev/null || true)
    echo "État sain restauré" ;;
  *) echo "Usage: $0 {secret|vuln|restore}"; exit 1 ;;
esac
