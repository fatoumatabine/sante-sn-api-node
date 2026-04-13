# CI/CD + Docker (API)

Ce document décrit la mise en place opérationnelle de l'API `sante-sn-api-node` avec:
- `CI` sur Pull Request / Push
- `CD` sur `main`
- Image Docker publiée sur Docker Hub
- Déploiement automatique sur un serveur VPS via SSH

## 1. Fichiers ajoutés

- `.github/workflows/api-ci.yml`
- `.github/workflows/api-cd.yml`
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml` (local)
- `docker-compose.prod.yml` (production)
- `.env.production.example`

## 2. Fonctionnement du pipeline

### CI (`api-ci.yml`)

Déclenché sur:
- `pull_request` vers `main` / `develop`
- `push` sur `main` / `develop`

Étapes:
1. `npm ci`
2. `npm run prisma:generate`
3. `npm run check:routes-kernel`
4. `npm run build`
5. `npm run test:rdv-transitions`
6. `docker build` (validation image)

Si une étape échoue, la PR/push est en échec.

### CD (`api-cd.yml`)

Déclenché sur:
- `push` sur `main`
- `workflow_dispatch`

Étapes:
1. Build image Docker
2. Push image vers `docker.io/<dockerhub-user>/sante-sn-api-node`
3. SSH sur serveur
4. Déploiement via `docker compose` (`docker-compose.prod.yml`)
5. Migration Prisma `npx prisma migrate deploy`
6. Healthcheck `GET /health`

Si `RUN_DB_SEED_ON_START=true`, le conteneur lance aussi un seed de demo idempotent apres les migrations.

## 3. Secrets GitHub requis

Configurer ces secrets dans le repo API:

- `DEPLOY_SSH_HOST`: IP ou domaine du serveur
- `DEPLOY_SSH_USER`: utilisateur SSH (ex: `ubuntu`)
- `DEPLOY_SSH_PRIVATE_KEY`: clé privée SSH (format PEM)
- `DOCKERHUB_USERNAME`: utilisateur Docker Hub
- `DOCKERHUB_TOKEN`: Access Token Docker Hub (lecture pull sur le serveur + push via GitHub Actions)
- `DATABASE_URL`: URL PostgreSQL poolée pour l'application (Neon `-pooler` recommandé)
- `DIRECT_URL`: URL PostgreSQL directe pour Prisma migrations/introspection
- `JWT_SECRET`: secret JWT access token
- `JWT_REFRESH_SECRET`: secret JWT refresh token
- `FRONTEND_URL`: URL du frontend (CORS)
- `RUN_DB_SEED_ON_START`: `true` pour injecter les donnees de demo idempotentes au demarrage, `false` pour ne pas lancer le seed
- `API_BASE_URL`: URL publique de l'API (utilisée pour callback provider)
- `APP_PORT`: port de l'API sur le serveur (ex: `5000`)
- `SMTP_HOST`: hôte SMTP (ex: `smtp.gmail.com`)
- `SMTP_PORT`: port SMTP (ex: `587`)
- `SMTP_SECURE`: `true` pour SSL direct (souvent port 465), sinon `false`
- `SMTP_USER`: utilisateur SMTP (adresse email d’envoi)
- `SMTP_PASS`: mot de passe / app password SMTP
- `MAIL_FROM`: expéditeur affiché (ex: `Sante SN <no-reply@domain.tld>`)
- `LOG_RESET_TOKEN`: `true` pour logger le lien de reset et exposer les infos de debug du flux forgot-password
- `OPENAI_API_KEY`: clé API OpenAI pour le triage patient, optionnelle si `OPENAI_TRIAGE_FALLBACK=true`
- `OPENAI_TRIAGE_MODEL`: optionnel, ex: `gpt-5.4`
- `OPENAI_TRIAGE_FALLBACK`: `true` pour utiliser le fallback local si OpenAI est indisponible, `false` pour échouer explicitement
- `PAYDUNYA_MASTER_KEY`: clé master PayDunya
- `PAYDUNYA_PRIVATE_KEY`: clé privée PayDunya
- `PAYDUNYA_TOKEN`: token PayDunya
- `PAYDUNYA_MODE`: `test` ou `live`
- `PAYDUNYA_BASE_URL`: ex: `https://app.paydunya.com`
- `PAYDUNYA_CALLBACK_URL`: callback webhook PayDunya vers l’API
- `PAYDUNYA_RETURN_URL`: URL de retour frontend après paiement
- `PAYDUNYA_CANCEL_URL`: URL frontend si annulation

## 4. Préparation du serveur

Pré-requis:
- Docker + Docker Compose plugin installés
- Port API ouvert (`APP_PORT`)

Dossier cible:
- `~/apps/sante-sn-api`

Le pipeline copie automatiquement `docker-compose.prod.yml` et génère `.env` sur ce dossier.

Déploiement manuel:
- Copier `.env.production.example` vers `.env`
- Renseigner `IMAGE=` avec l'image Docker à déployer
- Remplacer tous les placeholders (`change_me`, domaines, SMTP, PayDunya)
- Utiliser un `DATABASE_URL` accessible depuis le conteneur API, pas `localhost` sauf si la base tourne dans le meme namespace reseau
- Avec Neon, mettre l'endpoint `-pooler` dans `DATABASE_URL` et l'endpoint direct dans `DIRECT_URL`

## 5. Lancement local Docker

```bash
docker compose up -d --build
```

API:
- `http://localhost:5000/`clear

## 5.b Push manuel de l'image Docker

```bash
docker login
cd sante-sn-api-node
DOCKER_IMAGE=docker.io/<dockerhub-user>/sante-sn-api-node:latest npm run docker:publish
```

Optionnel:
- utiliser aussi un tag de commit ou de version en plus de `latest`
- verifier localement l'image avant le push avec `docker run --rm -p 5000:5000 ...`

## 6. Rollback

Stratégie:
- Les images sont taguées `latest` et `sha-<commit>`
- Pour rollback, modifier `IMAGE=` dans `~/apps/sante-sn-api/.env` avec un tag antérieur puis:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

## 7. Base de données cloud avec Neon

Pour une solution de base de données PostgreSQL hébergée et scalable, nous recommandons [Neon](https://neon.tech). Consultez le guide dédié `NEON_SETUP_GUIDE.md` pour :

- Créer un projet Neon gratuit
- Configurer `DATABASE_URL` et `DIRECT_URL` dans `.env` et les secrets GitHub
- Utiliser le branching pour les environnements de prévisualisation
- Activer le connection pooling pour les applications serverless

## 8. Notes importantes

- En production, préférer une base PostgreSQL managée (Neon, Supabase, AWS RDS) ou un conteneur DB séparé avec sauvegardes.
- Le job `deploy` est ignoré tant que les secrets SSH ne sont pas configurés.
- Le endpoint `/health` doit toujours rester disponible pour vérifier le succès du déploiement.
- Sur Render, une instance gratuite ou en veille peut mettre plusieurs secondes a demarrer. Pour le frontend Vercel, prevoir une URL API stable et un timeout/retry cote client.
- Sans variables SMTP valides, le endpoint `POST /api/v1/auth/forgot-password` répondra OK mais n’enverra pas d’email.
- `.env.production.example` doit rester un template sans secrets reels.
