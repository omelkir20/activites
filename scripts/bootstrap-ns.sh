#!/usr/bin/env bash
set -euo pipefail
NS=$1
kubectl create ns "$NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl label ns "$NS" pod-security.kubernetes.io/enforce=restricted --overwrite
kubectl -n "$NS" get secret db-secret >/dev/null 2>&1 || \
  kubectl -n "$NS" create secret generic db-secret --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 12)"
kubectl -n "$NS" get secret api-secret >/dev/null 2>&1 || \
  kubectl -n "$NS" create secret generic api-secret --from-literal=API_KEY="$(openssl rand -hex 12)"
if [ -n "${HARBOR_PULL_USER:-}" ]; then
  kubectl -n "$NS" get secret harbor-pull >/dev/null 2>&1 || \
  kubectl -n "$NS" create secret docker-registry harbor-pull --docker-server=192.168.148.140:8085 \
    --docker-username="$HARBOR_PULL_USER" --docker-password="$HARBOR_PULL_PASS"
fi
