# DevSecOps Portfolio — Activité 4

Projet : **Portfolio Next.js + API Express + PostgreSQL**, déployé automatiquement sur une VM
(Vagrant + Ansible + Docker Compose) et construit/contrôlé par un pipeline **Jenkins DevSecOps**.

> **Légende** — les blocs « *Sortie réelle* » ont été obtenus en exécutant le code de ce dépôt.
> Les emplacements `📸 À COMPLÉTER` sont des captures d'écran à prendre sur **votre** VM / Jenkins
> (à enregistrer dans `docs/screenshots/`, voir la liste en fin de document).

## Sommaire

- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [11. Infrastructure automatisée (Vagrant + Ansible)](#11-infrastructure-automatisée-vagrant--ansible) — tâches 43-45
- [12. Évolution et sécurisation de l'API](#12-évolution-et-sécurisation-de-lapi) — tâches 46-52
- [13. Base de données PostgreSQL](#13-base-de-données-postgresql) — tâches 53-56
- [14. Tests applicatifs](#14-tests-applicatifs) — tâches 57-60
- [15. Jenkins : tests et images Docker](#15-jenkins--tests-et-images-docker) — tâches 61-63
- [16. Pipeline DevSecOps Jenkins](#16-pipeline-devsecops-jenkins) — tâches 64-69
- [Captures à fournir](#captures-à-fournir)

## Architecture

```
Navigateur ──► frontend (Next.js :3000) ──/api/* (rewrite)──► api (Express :4000) ──Prisma──► db (PostgreSQL :5432)
                                   └── réseau Docker "devsecops-net" ──┘
```

| Dossier / fichier        | Rôle                                                                 |
|--------------------------|----------------------------------------------------------------------|
| `portfolio-next/`        | Frontend Next.js (formulaire de contact, tests Vitest)                |
| `api/`                   | API Express (Zod, Helmet, rate limiting, Prisma, tests Vitest)        |
| `api/prisma/`            | Schéma + migrations Prisma                                            |
| `docker-compose.yml`     | Stack : `frontend` + `api` + `db` (PostgreSQL)                        |
| `Vagrantfile`            | VM VMware + provisioning Ansible automatique                          |
| `deploy_portfolio.yml`   | Playbook de déploiement (Docker + Compose)                            |
| `install_docker.yml`     | Installation de Docker (activité 3, réutilisé)                        |
| `Jenkinsfile`            | Pipeline CI/CD DevSecOps                                              |
| `scripts/`               | `test-all.sh`, `demo-api.sh`, `demo-fail.sh`                          |

## Démarrage rapide

```bash
cp .env.example .env            # puis changer POSTGRES_PASSWORD
docker compose up -d --build    # frontend + api + db
docker compose ps
# Portfolio : http://localhost:3000     API : http://localhost:4000/api/health
```

---

## 11. Infrastructure automatisée (Vagrant + Ansible)

### 43 — Playbook de déploiement

Le playbook [`deploy_portfolio.yml`](deploy_portfolio.yml) : (1) installe Docker (`install_docker.yml`),
(2) archive et copie le projet dans `/opt/devsecops-portfolio`, (3) génère le `.env` (mot de passe PostgreSQL
aléatoire, jamais commité), (4) lance `docker compose up -d --build`, (5) vérifie que l'API (`/api/health`)
et le Portfolio (HTTP 200) répondent.

Commande utilisée (VM `ubuntu-server` de l'inventaire) :

```bash
ansible-playbook -i inventory.ini deploy_portfolio.yml --ask-become-pass
```

📸 À COMPLÉTER : `docs/screenshots/43-portfolio.png` — Portfolio accessible sur `http://<IP_VM>:3000`.

![Portfolio accessible](docs/screenshots/43-portfolio.png)

### 44 — Vagrant lance Ansible automatiquement

Le [`Vagrantfile`](Vagrantfile) crée la VM (provider `vmware_desktop`, box `bento/ubuntu-24.04`) puis déclenche
le provisioner Ansible : si `ansible-playbook` est présent sur l'hôte il est utilisé, sinon `ansible_local`
(Ansible installé dans la VM) prend le relais.

```
vagrant up  ->  création VM  ->  configuration Ansible  ->  installation Docker  ->  déploiement Portfolio
```

```bash
vagrant up --provider vmware_desktop
```

Le Portfolio est ensuite joignable depuis l'hôte sur `http://localhost:3000` (ports redirigés 3000 et 4000).

📸 À COMPLÉTER : `docs/screenshots/44-vagrant-up.png` — sortie de `vagrant up` (RECAP Ansible `failed=0`).

![Automatisation complète](docs/screenshots/44-vagrant-up.png)

### 45 — Test de reconstruction complète

```bash
vagrant destroy -f      # destruction complète de la VM
vagrant up              # recréation + redéploiement automatique
curl -I http://localhost:3000     # HTTP/1.1 200 OK
```

Résultat attendu : après `vagrant up`, le Portfolio est redéployé **sans aucune action manuelle**.

📸 À COMPLÉTER : `docs/screenshots/45-destroy-up.png` (destroy, up, puis Portfolio de nouveau accessible).
Notez ici la durée observée : `……` min.

---

## 12. Évolution et sécurisation de l'API

### 46 — `POST /api/contact`

Requête :

```bash
curl -i -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahmed Ben Ali","email":"ahmed@example.com","message":"Bonjour, je souhaite échanger sur un projet DevSecOps."}'
```

*Sortie réelle* :

```
HTTP/1.1 201 Created
{
  "status": "success",
  "message": "Message enregistré, merci !",
  "data": {
    "id": 5,
    "createdAt": "2026-11-04T11:06:12.026Z"
  }
}
```

### 47 — Formulaire Next.js connecté à l'API

Le composant client [`ContactForm.js`](portfolio-next/app/components/ContactForm.js) envoie un `POST /api/contact`
sur **la même origine** ; Next.js relaie la requête vers l'API grâce aux `rewrites` de
[`next.config.ts`](portfolio-next/next.config.ts) (`API_INTERNAL_URL`, par défaut `http://api:4000` dans Docker).
Aucune IP ni URL en dur côté navigateur, donc rien à modifier quand l'IP de la VM change.

📸 À COMPLÉTER : `docs/screenshots/47-contact-ok.png` — envoi réussi (message vert « Message enregistré, merci ! »).

![Envoi réussi](docs/screenshots/47-contact-ok.png)

### 48 — Validation stricte avec Zod

Schéma : [`api/src/schemas/contact.js`](api/src/schemas/contact.js) — types stricts, longueurs min/max, email valide,
caractères du nom restreints, **aucune balise HTML**, et `.strict()` qui refuse tout champ inconnu.

Exemple de requête refusée :

```bash
curl -i -X POST http://localhost:4000/api/contact -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"pas-un-email","message":"court","role":"admin"}'
```

*Sortie réelle* :

```
HTTP/1.1 400 Bad Request
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Données invalides",
  "details": [
    {
      "field": "name",
      "message": "Le nom contient des caractères non autorisés"
    },
    {
      "field": "email",
      "message": "L'email est invalide"
    },
    {
      "field": "message",
      "message": "Le message doit contenir au moins 10 caractères"
    },
    {
      "field": "(body)",
      "message": "Unrecognized key: \"role\""
    }
  ]
}
```

### 49 — Gestion centralisée des erreurs

Tout passe par [`errorHandler.js`](api/src/middleware/errorHandler.js) : un seul format
`{ status, code, message, details? }`, aucune stack trace dans la réponse (les détails techniques restent dans les logs).
Express 5 transmet automatiquement les erreurs des handlers `async`.

JSON malformé :

```bash
curl -i -X POST http://localhost:4000/api/contact -H "Content-Type: application/json" -d '{"name": '
```

*Sortie réelle* :

```
HTTP/1.1 400 Bad Request
{
  "status": "error",
  "code": "INVALID_JSON",
  "message": "Corps de requête JSON malformé"
}
```

### 50 — Headers de sécurité avec Helmet

`app.use(helmet())` dans [`api/src/app.js`](api/src/app.js).

```bash
curl -I http://localhost:4000/api/health
```

*Sortie réelle* :

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
Vary: Origin
RateLimit-Policy: 100;w=60
RateLimit: limit=100, remaining=97, reset=60
Content-Type: application/json; charset=utf-8
Content-Length: 36
ETag: W/"24-nnOqyObFfEH2yk9uF8NASS7hwOY"
Date: Wed, 04 Nov 2026 11:06:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

Headers ajoutés par Helmet : `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-*-Policy`… ; `X-Powered-By` est supprimé.

### 51 — Rate limiting

[`rateLimit.js`](api/src/middleware/rateLimit.js) (`express-rate-limit`) :
**5 requêtes / minute / IP** sur `POST /api/contact` (`CONTACT_RATE_LIMIT_MAX`) et 100 / minute sur le reste de `/api`.
L'API est derrière le proxy Next.js : `trust proxy = 1` permet de limiter par IP réelle (`X-Forwarded-For`).

*Sortie réelle* (au-delà de la limite) :

```
HTTP/1.1 429 Too Many Requests
RateLimit-Policy: 5;w=60
RateLimit: limit=5, remaining=0, reset=60
Retry-After: 60

{
  "status": "error",
  "code": "TOO_MANY_REQUESTS",
  "message": "Trop de requêtes, veuillez réessayer plus tard."
}
```

### 52 — OWASP API Security Top 10 (2023)

| Risque | Concerne notre API ? | Mesure en place / prévue |
|--------|----------------------|--------------------------|
| **API1** Broken Object Level Authorization | Faible : aucune ressource par utilisateur exposée, la lecture des messages n'est pas publique | Aucune route `GET /api/contact` ; si une consultation est ajoutée → authentification + contrôle d'accès par objet *(prévu)* |
| **API2** Broken Authentication | Faible aujourd'hui (routes publiques en lecture + formulaire) | Pas de session/token à protéger ; JWT + rate limit strict sur le login si une partie admin est ajoutée *(prévu)* |
| **API3** Broken Object Property Level Authorization | **Oui** (mass assignment) | Zod `.strict()` : champ inconnu refusé ; `select: { id, createdAt }` Prisma → seuls les champs nécessaires sont renvoyés |
| **API4** Unrestricted Resource Consumption | **Oui** | `express-rate-limit` (5/min sur `/api/contact`, 100/min global), `express.json({ limit: '10kb' })`, longueurs max Zod |
| **API5** Broken Function Level Authorization | Faible | Méthodes limitées (`GET`, `POST`) par CORS ; pas de route d'administration |
| **API6** Unrestricted Access to Sensitive Business Flows | **Oui** (spam du formulaire) | Rate limiting sur `POST /api/contact` ; CAPTCHA / honeypot *(prévu)* |
| **API7** Server Side Request Forgery | Non | L'API n'effectue aucune requête sortante basée sur des entrées utilisateur |
| **API8** Security Misconfiguration | **Oui** | Helmet, CORS restreint (`CORS_ORIGIN`), `X-Powered-By` masqué, erreurs sans stack trace, conteneurs non-root, secrets hors Git (`.env`), scans Semgrep/Trivy |
| **API9** Improper Inventory Management | Partiel | Routes listées dans ce README ; une seule version `/api` ; images taguées par Git SHA |
| **API10** Unsafe Consumption of APIs | Faible | Pas d'API tierce consommée ; si ajoutée → validation Zod des réponses *(prévu)* |

Mesures transverses : requêtes Prisma **paramétrées** (pas d'injection SQL), `npm audit` + OWASP Dependency-Check,
Gitleaks, TLS (reverse proxy HTTPS) *(prévu en production)*.

---

## 13. Base de données PostgreSQL

### 53 — Service PostgreSQL dans Docker Compose

Extrait de [`docker-compose.yml`](docker-compose.yml) :

```yaml
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-portfolio}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Définir POSTGRES_PASSWORD dans .env}
      POSTGRES_DB: ${POSTGRES_DB:-portfolio}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
```

L'API attend que la base soit `healthy` (`depends_on: condition: service_healthy`).

```bash
docker compose ps
```

📸 À COMPLÉTER : `docs/screenshots/53-compose-ps.png` — `docker compose ps` avec `db`, `api`, `frontend` en `running/healthy`.

### 54 — L'API enregistre les messages dans PostgreSQL

[`api/src/lib/prisma.js`](api/src/lib/prisma.js) : `prisma.contactMessage.create(...)` appelé par la route
`POST /api/contact` après validation Zod.

Vérification dans la table :

```bash
docker compose exec db psql -U portfolio -d portfolio -c "SELECT id, name, email, left(message, 35) AS message, created_at FROM contact_messages ORDER BY id DESC LIMIT 5;"
```

*Sortie réelle (base de test)* :

```
id |     name      |       email       |               message               |       created_at        
----+---------------+-------------------+-------------------------------------+-------------------------
  8 | Ahmed         | a@b.co            | message de test rate limit          | 2026-11-04 11:06:12.101
  7 | Ahmed         | a@b.co            | message de test rate limit          | 2026-11-04 11:06:12.09
  6 | Ahmed         | a@b.co            | message de test rate limit          | 2026-11-04 11:06:12.08
  5 | Ahmed Ben Ali | ahmed@example.com | Bonjour, je souhaite échanger sur u | 2026-11-04 11:06:12.026
(4 rows)
```

📸 À COMPLÉTER : `docs/screenshots/54-table.png` — même requête sur votre VM.

### 55 — Migrations Prisma

Schéma : [`api/prisma/schema.prisma`](api/prisma/schema.prisma) — migration initiale :
[`api/prisma/migrations/20261104120000_init/`](api/prisma/migrations/20261104120000_init/migration.sql).

Commande d'exécution des migrations :

```bash
# en production / dans le conteneur (exécuté automatiquement au démarrage de l'API)
npx prisma migrate deploy
# depuis la VM, dans le conteneur déjà lancé :
docker compose exec api npx prisma migrate deploy
# en développement (création d'une nouvelle migration après modification du schéma)
cd api && npx prisma migrate dev --name nom_de_la_migration
```

### 56 — Variables de connexion dans `.env.example`

Voir [`.env.example`](.env.example) : `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`,
`POSTGRES_PORT`, `DATABASE_URL`. Le vrai `.env` est ignoré par Git (`.gitignore`) et généré par Ansible sur la VM.

---

## 14. Tests applicatifs

| Cible | Outil | Fichier |
|-------|-------|---------|
| Frontend (composant `ContactForm`) | Vitest + Testing Library | `portfolio-next/tests/ContactForm.test.js` |
| API (routes, validation, sécurité) | Vitest + Supertest | `api/tests/unit/contact.test.js` |
| Intégration frontend → API → PostgreSQL | Vitest + Prisma (vraie base) | `api/tests/integration/contact.db.test.js` |

### 57 & 58 — Tests frontend et API

```bash
cd portfolio-next && npm ci && npm test        # frontend
cd api && npm ci && npx prisma generate && npm test   # API
```

*Sortie réelle (frontend)* :

```
✓ tests/ContactForm.test.js > <ContactForm /> > affiche les trois champs et le bouton Envoyer 219ms
 ✓ tests/ContactForm.test.js > <ContactForm /> > envoie les données en POST vers /api/contact et affiche le succès 318ms
 ✓ tests/ContactForm.test.js > <ContactForm /> > affiche les erreurs de validation renvoyées par l'API 237ms
 ✓ tests/ContactForm.test.js > <ContactForm /> > affiche un message dédié en cas de 429 231ms
 ✓ tests/ContactForm.test.js > <ContactForm /> > gère une API injoignable 283ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  12:09:12
   Duration  2.55s (tests 54%, environment 35%, setup 7%, import 2%, transform 1%)
```

📸 À COMPLÉTER : `docs/screenshots/58-tests.png` — tests réussis sur votre machine.

### 59 — Entrées invalides, injections, requêtes malformées

Inclus dans `api/tests/unit/contact.test.js` (22 tests) : email/nom/message invalides, types non-string (objet
NoSQL, tableau), champ inconnu, XSS (`<script>`, `<img onerror>`), injections SQL (`'); DROP TABLE …`), JSON malformé,
corps trop volumineux (413), mauvais `Content-Type`, erreur interne sans fuite d'information, headers Helmet, 429.

*Sortie réelle (API)* :

```
✓ tests/unit/contact.test.js > GET /api/health > répond 200 { status: ok } 41ms
 ✓ tests/unit/contact.test.js > POST /api/contact > crée un message valide (201) et normalise les données 18ms
 ✓ tests/unit/contact.test.js > POST /api/contact > refuse un corps vide (400 VALIDATION_ERROR) 6ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : email invalide 9ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : nom trop court 6ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : message trop court 4ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : message trop long 4ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : nom non-string (objet NoSQL) 4ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : email non-string (tableau) 6ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : champ inconnu (mass assignment) 5ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : XSS dans le nom 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : balise HTML dans le message 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : injection SQL dans le nom 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse : injection SQL dans l'email 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > une injection SQL dans le message est traitée comme du texte (jamais exécutée) 7ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse un JSON malformé (400 INVALID_JSON) 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse un corps trop volumineux (413) 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > refuse un Content-Type non JSON (400) 3ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > ne divulgue pas de stack trace en cas d'erreur interne (500) 4ms
 ✓ tests/unit/contact.test.js > Sécurité : entrées invalides, injections, requêtes malformées > renvoie 404 JSON pour une route inconnue 3ms
 ✓ tests/unit/contact.test.js > Headers de sécurité (Helmet) et rate limiting > ajoute les headers Helmet et masque X-Powered-By 3ms
 ✓ tests/unit/contact.test.js > Headers de sécurité (Helmet) et rate limiting > renvoie 429 après dépassement de la limite sur POST /api/contact 9ms

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  12:09:09
   Duration  536ms (import 45%, tests 39%, transform 15%, worker 1%)
```

### 60 — Tests d'intégration frontend → API → PostgreSQL

Les requêtes passent par le **frontend** (`FRONTEND_URL`, proxy Next.js) jusqu'à l'API puis PostgreSQL ; le test relit
ensuite la ligne en base avec Prisma (et vérifie qu'une injection SQL est stockée littéralement, la table survivant).

```bash
docker compose up -d --build
set -a; source .env; set +a
cd api
FRONTEND_URL=http://localhost:3000 \
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB?schema=public" \
npm run test:integration
# ou tout d'un coup : ./scripts/test-all.sh
```

*Sortie réelle* :

```
✓ tests/integration/contact.db.test.js > Intégration frontend -> API -> PostgreSQL > POST /api/contact enregistre le message en base 80ms
 ✓ tests/integration/contact.db.test.js > Intégration frontend -> API -> PostgreSQL > une injection SQL dans le message est stockée littéralement et la table survit 22ms
 ✓ tests/integration/contact.db.test.js > Intégration frontend -> API -> PostgreSQL > un message invalide est refusé et rien n'est écrit en base 9ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:09:10
   Duration  628ms (import 49%, tests 39%, transform 11%, worker 1%)
```

📸 À COMPLÉTER : `docs/screenshots/60-integration.png` — même test sur votre VM.

---

## 15. Jenkins : tests et images Docker

Le [`Jenkinsfile`](Jenkinsfile) (à la racine du dépôt) s'exécute entièrement avec des conteneurs Docker (aucun outil à
installer sur Jenkins hormis Docker). Prérequis une seule fois :

```bash
sudo usermod -aG docker jenkins && sudo systemctl restart jenkins
```

Job Jenkins : *Pipeline script from SCM* → URL du dépôt → *Script Path* : `Jenkinsfile`.

### 61 — Tests automatiques

Stage `Tests unitaires` (en parallèle) : `Tests frontend (Next.js)` et `Tests API (Express)`, puis
`Tests d'intégration (frontend -> API -> PostgreSQL)` avec la stack lancée par `docker compose` (projet `ci-<build>`).

📸 À COMPLÉTER : `docs/screenshots/61-jenkins-tests.png`.

### 62 — Construction des images

Stage `Build des images Docker` : `devsecops-api` (`./api`) et `devsecops-portfolio` (`./portfolio-next`).

📸 À COMPLÉTER : `docs/screenshots/62-jenkins-build.png`.

### 63 — Tag = Git SHA

```groovy
env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
docker build -t devsecops-api:$GIT_SHA -t devsecops-api:latest ./api
docker build -t devsecops-portfolio:$GIT_SHA -t devsecops-portfolio:latest ./portfolio-next
```

Exemple d'images générées (`docker images | grep devsecops`) :

```
devsecops-portfolio   a1b2c3d   ...
devsecops-api         a1b2c3d   ...
```

📸 À COMPLÉTER : remplacer `a1b2c3d` par votre vrai SHA (`docs/screenshots/63-images-sha.png`).

---

## 16. Pipeline DevSecOps Jenkins

| Tâche | Stage Jenkins | Outil | Condition d'échec |
|-------|---------------|-------|-------------------|
| 64 | Scan des secrets | **Gitleaks** (`.gitleaks.toml`) | tout secret détecté (`--exit-code 1`) |
| 65 | SAST | **Semgrep** (`p/javascript`, `p/nodejs`, `p/typescript`, `p/owasp-top-ten`) sur `portfolio-next/app` et `api/` | finding de sévérité ERROR |
| 66 | npm audit | `npm audit --audit-level=critical` (front + API) | vulnérabilité **critique** |
| 67 | OWASP Dependency-Check | `owasp/dependency-check` sur les `package-lock.json` | CVSS ≥ 9 (`--failOnCVSS 9`) |
| 68 | Scan des images | **Trivy** sur `devsecops-api:<sha>` et `devsecops-portfolio:<sha>` | vulnérabilité **CRITICAL** (corrigeable) |
| 69 | Échec automatique | combinaison des codes retour ci-dessus | secret ou vulnérabilité critique |

Les rapports (`reports/*.json|html`) sont archivés comme artefacts Jenkins.

### 67 — Exemple de dépendance vulnérable détectée

Ajout volontaire de `lodash@4.17.11` (`./scripts/demo-fail.sh vuln`), puis `npm audit` — *sortie réelle* :

```
# npm audit report

lodash  <=4.17.23
Severity: critical
Command Injection in lodash - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
Prototype Pollution in lodash - https://github.com/advisories/GHSA-jf85-cpcp-j695
Prototype Pollution in lodash - https://github.com/advisories/GHSA-p6mc-m468-83gw
Regular Expression Denial of Service (ReDoS) in lodash - https://github.com/advisories/GHSA-29mw-wpgm-hmr9
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions - https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix`
node_modules/lodash

1 critical severity vulnerability

To address all issues, run:
  npm audit fix
```

Avec `--audit-level=critical`, la commande retourne le code **1** : le stage `npm audit` (et donc le pipeline) échoue.
OWASP Dependency-Check détecte la même dépendance (CVE-2019-10744, CVSS 9.1).

### 69 — Pipeline réussi et pipeline volontairement échoué

```bash
# 1) Pipeline sain
git add -A && git commit -m "pipeline devsecops" && git push      # lancer le job -> SUCCESS (vert)

# 2) Échec volontaire n°1 : secret
./scripts/demo-fail.sh secret
git add -A && git commit -m "demo: faux secret" && git push        # Gitleaks -> FAILURE (rouge)
./scripts/demo-fail.sh restore

# 3) Échec volontaire n°2 : dépendance critique
./scripts/demo-fail.sh vuln
git add -A && git commit -m "demo: dependance vulnerable" && git push   # npm audit / Dependency-Check -> FAILURE
./scripts/demo-fail.sh restore && git add -A && git commit -m "restore" && git push
```

📸 À COMPLÉTER : `docs/screenshots/69-pipeline-ok.png` et `docs/screenshots/69-pipeline-fail.png`.

---

## Captures à fournir

| Fichier (`docs/screenshots/`) | Tâche | Contenu |
|-------------------------------|-------|---------|
| `43-portfolio.png` | 43 | Portfolio accessible après `ansible-playbook` |
| `44-vagrant-up.png` | 44 | `vagrant up` complet (création → Ansible → Docker → Portfolio) |
| `45-destroy-up.png` | 45 | `vagrant destroy` puis `vagrant up` puis Portfolio OK |
| `47-contact-ok.png` | 47 | Formulaire : envoi réussi |
| `53-compose-ps.png` | 53 | `docker compose ps` |
| `54-table.png` | 54 | Contenu de `contact_messages` |
| `58-tests.png` | 58 | Tests frontend + API réussis |
| `60-integration.png` | 60 | Tests d'intégration réussis |
| `61-jenkins-tests.png` | 61 | Stages de tests Jenkins |
| `62-jenkins-build.png` | 62 | Stage de build des images |
| `63-images-sha.png` | 63 | `docker images` avec tag = Git SHA |
| `69-pipeline-ok.png` / `69-pipeline-fail.png` | 69 | Pipeline vert / pipeline rouge |
