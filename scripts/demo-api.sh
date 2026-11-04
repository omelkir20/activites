#!/usr/bin/env bash
# Génère les sorties à coller dans le README (succès, refus Zod, erreur JSON, Helmet, 429, contenu de la table).
# Usage : ./scripts/demo-api.sh [URL_API]      (défaut http://localhost:4000)
API="${1:-http://localhost:4000}"
H='Content-Type: application/json'

echo -e "\n### 1) Envoi valide (201)"
curl -si -X POST "$API/api/contact" -H "$H" \
  -d '{"name":"Ahmed Ben Ali","email":"ahmed@example.com","message":"Bonjour, je souhaite échanger sur un projet DevSecOps."}'

echo -e "\n\n### 2) Requête refusée par Zod (400)"
curl -si -X POST "$API/api/contact" -H "$H" \
  -d '{"name":"<script>alert(1)</script>","email":"pas-un-email","message":"court","role":"admin"}'

echo -e "\n\n### 3) Erreur centralisée : JSON malformé (400)"
curl -si -X POST "$API/api/contact" -H "$H" -d '{"name": '

echo -e "\n\n### 4) Erreur centralisée : route inconnue (404)"
curl -si "$API/api/inconnue"

echo -e "\n\n### 5) Headers Helmet : curl -I"
curl -sI "$API/api/health"

echo -e "\n### 6) Rate limiting : 8 envois rapides (429 attendu après la limite)"
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "requête $i -> HTTP %{http_code}\n" -X POST "$API/api/contact" -H "$H" \
    -d '{"name":"Test Limite","email":"limite@example.com","message":"Message de test du rate limiting."}'
done
echo "--- Réponse 429 complète :"
curl -si -X POST "$API/api/contact" -H "$H" \
  -d '{"name":"Test Limite","email":"limite@example.com","message":"Message de test du rate limiting."}'
echo
