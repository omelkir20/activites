// Pipeline DevSecOps : tests -> sécurité (secrets, SAST, dépendances) -> images Docker (tag = Git SHA)
//                      -> scan Trivy -> test d'intégration frontend -> API -> PostgreSQL
//
// Prérequis sur l'agent Jenkins : Docker installé, utilisateur "jenkins" dans le groupe "docker".
// Tous les outils (Node, Gitleaks, Semgrep, Dependency-Check, Trivy) tournent dans des conteneurs :
// rien d'autre à installer sur la machine Jenkins.
//
// Le projet doit être à la racine du dépôt (docker-compose.yml, api/, portfolio-next/).

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 60, unit: 'MINUTES')
  }


  environment {
    NODE_IMAGE      = 'node:22-bookworm-slim'
    FRONTEND_IMAGE  = 'devsecops-portfolio'
    API_IMAGE       = 'devsecops-api'
    CI_PROJECT      = "ci-${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
          env.UID_GID = sh(returnStdout: true, script: 'echo "$(id -u):$(id -g)"').trim()
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.GIT_SHA}"
        }
        sh 'mkdir -p reports'
        echo "Git SHA = ${env.GIT_SHA}"
      }
    }

    // ---------------------------------------------------------------- Secrets
    stage('Scan des secrets (Gitleaks)') {
      steps {
        // exit code 1 si un secret est détecté => le pipeline échoue
        sh '''
          docker run --rm --user "$UID_GID" -v "$PWD:/repo" zricethezav/gitleaks:latest \
            detect --source /repo --no-git --config /repo/.gitleaks.toml --redact \
            --report-format json --report-path /repo/reports/gitleaks.json --exit-code 1 --verbose
        '''
      }
    }

    // ---------------------------------------------------------------- Tests
    stage('Tests unitaires') {
      parallel {
        stage('Tests frontend (Next.js)') {
          steps {
            sh '''
              docker run --rm --user "$UID_GID" -e HOME=/tmp -e CI=true -v "$PWD/portfolio-next:/app" -w /app $NODE_IMAGE \
                sh -c "npm ci --no-audit --no-fund && npm test"
            '''
          }
        }
        stage('Tests API (Express)') {
          steps {
            sh '''
              docker run --rm --user "$UID_GID" -e HOME=/tmp -e CI=true -v "$PWD/api:/app" -w /app $NODE_IMAGE \
                sh -c "npm ci --no-audit --no-fund && npx prisma generate && npm test"
            '''
          }
        }
      }
    }

    // ---------------------------------------------------------------- SAST
    stage('SAST (Semgrep)') {
      steps {
        // --severity ERROR + --error : échec sur les findings de sévérité ERROR
        sh '''
          docker run --rm --user "$UID_GID" -e HOME=/tmp -v "$PWD:/src" -w /src semgrep/semgrep:latest \
            semgrep scan --config p/javascript --config p/nodejs --config p/typescript --config p/owasp-top-ten \
            --severity ERROR --error --metrics=off \
            --json-output=reports/semgrep.json --exclude node_modules --exclude .next --exclude tests \
            portfolio-next/app api/src api/server.js
        '''
      }
    }

    // ---------------------------------------------------------------- Dépendances
    stage('Dépendances') {
      parallel {
        stage('npm audit') {
          steps {
            // le build échoue si une vulnérabilité CRITIQUE est présente (les autres niveaux sont seulement affichés)
            sh '''
              for d in api portfolio-next; do
                echo "=== npm audit : $d"
                docker run --rm --user "$UID_GID" -e HOME=/tmp -v "$PWD/$d:/app" -w /app $NODE_IMAGE \
                  npm audit --json > reports/npm-audit-$d.json || true
                docker run --rm --user "$UID_GID" -e HOME=/tmp -v "$PWD/$d:/app" -w /app $NODE_IMAGE \
                  npm audit --audit-level=critical
              done
            '''
          }
        }
       stage('OWASP Dependency-Check') {
    steps {
        sh '''
            mkdir -p "$HOME/.dependency-check-data"

            docker run --rm --user "$UID_GID" \
                -v "$PWD:/src" \
                -v "$PWD/reports:/report" \
                -v "$HOME/.dependency-check-data:/usr/share/dependency-check/data" \
                owasp/dependency-check:latest \
                --scan /src/api/package-lock.json \
                --scan /src/portfolio-next/package-lock.json \
                --project devsecops-portfolio \
                --format HTML \
                --format JSON \
                --out /report \
                --failOnCVSS 9
        '''
    }
}
      }
    }

    // ---------------------------------------------------------------- Images Docker
    stage('Build des images Docker') {
      steps {
        sh '''
          docker build -t $API_IMAGE:$GIT_SHA      -t $API_IMAGE:latest      ./api
          docker build -t $FRONTEND_IMAGE:$GIT_SHA -t $FRONTEND_IMAGE:latest ./portfolio-next
          echo "--- Images générées"
          docker images --filter "reference=$API_IMAGE" --filter "reference=$FRONTEND_IMAGE"
        '''
      }
    }

    stage('Scan des images (Trivy)') {
      steps {
        sh '''
          mkdir -p "$HOME/.cache/trivy"
          for img in $API_IMAGE:$GIT_SHA $FRONTEND_IMAGE:$GIT_SHA; do
            echo "=== Trivy : $img (rapport HIGH + CRITICAL)"
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$HOME/.cache/trivy:/root/.cache/" \
              aquasec/trivy:latest image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 0 "$img"
            echo "=== Trivy : $img (échec si CRITICAL)"
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$HOME/.cache/trivy:/root/.cache/" \
              aquasec/trivy:latest image --severity CRITICAL --ignore-unfixed --exit-code 1 "$img"
          done
        '''
      }
    }

    // ---------------------------------------------------------------- Intégration
    stage('Tests d\'intégration (frontend -> API -> PostgreSQL)') {
      steps {
        sh '''
          cp .env.example .env.ci
          export IMAGE_TAG=$GIT_SHA
          COMPOSE="docker compose -p $CI_PROJECT --env-file .env.ci -f docker-compose.yml -f docker-compose.ci.yml"
          $COMPOSE up -d --wait --no-build
          docker run --rm --user "$UID_GID" -e HOME=/tmp --network ${CI_PROJECT}_devsecops-net \
            -e FRONTEND_URL=http://frontend:3000 \
            -e DATABASE_URL="postgresql://portfolio:change_me@db:5432/portfolio?schema=public" \
            -v "$PWD/api:/app" -w /app $NODE_IMAGE \
            sh -c "npm ci --no-audit --no-fund && npx prisma generate && npm run test:integration"
        '''
      }
    }
  }

  post {
    always {
      sh '''
        [ -f .env.ci ] || cp .env.example .env.ci
        docker compose -p $CI_PROJECT --env-file .env.ci -f docker-compose.yml -f docker-compose.ci.yml down -v --remove-orphans || true
        rm -f .env.ci
      '''
      archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
    }
    success { echo "Pipeline OK - images : ${env.API_IMAGE}:${env.GIT_SHA} / ${env.FRONTEND_IMAGE}:${env.GIT_SHA}" }
    failure { echo 'Pipeline en échec : secret, vulnérabilité critique ou test en erreur (voir le stage rouge).' }
  }
}
