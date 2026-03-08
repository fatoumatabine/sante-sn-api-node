# CI/CD + Docker (API)

Ce document décrit la mise en place opérationnelle de l'API `sante-sn-api-node` avec:
- `CI` sur Pull Request / Push
- `CD` sur `main`
- Image Docker publiée sur GHCR
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
2. Push image vers `ghcr.io/<owner>/sante-sn-api-node`
3. SSH sur serveur
4. Déploiement via `docker compose` (`docker-compose.prod.yml`)
5. Migration Prisma `npx prisma migrate deploy`
6. Healthcheck `GET /health`

## 3. Secrets GitHub requis

Configurer ces secrets dans le repo API:

- `DEPLOY_SSH_HOST`: IP ou domaine du serveur
- `DEPLOY_SSH_USER`: utilisateur SSH (ex: `ubuntu`)
- `DEPLOY_SSH_PRIVATE_KEY`: clé privée SSH (format PEM)
- `REGISTRY_USERNAME`: utilisateur registry (souvent ton user GitHub)
- `REGISTRY_TOKEN`: token registry avec accès pull sur GHCR
- `DATABASE_URL`: URL PostgreSQL production
- `JWT_SECRET`: secret JWT access token
- `JWT_REFRESH_SECRET`: secret JWT refresh token
- `FRONTEND_URL`: URL du frontend (CORS)
- `APP_PORT`: port de l'API sur le serveur (ex: `5000`)

## 4. Préparation du serveur

Pré-requis:
- Docker + Docker Compose plugin installés
- Port API ouvert (`APP_PORT`)

Dossier cible:
- `~/apps/sante-sn-api`

Le pipeline copie automatiquement `docker-compose.prod.yml` et génère `.env` sur ce dossier.

## 5. Lancement local Docker

```bash
docker compose up -d --build
```

API:
- `http://localhost:5000/health`

## 6. Rollback

Stratégie:
- Les images sont taguées `latest` et `sha-<commit>`
- Pour rollback, modifier `IMAGE=` dans `~/apps/sante-sn-api/.env` avec un tag antérieur puis:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

## 7. Notes importantes

- En production, préférer une base PostgreSQL managée ou un conteneur DB séparé avec sauvegardes.
- Le job `deploy` est ignoré tant que les secrets SSH ne sont pas configurés.
- Le endpoint `/health` doit toujours rester disponible pour vérifier le succès du déploiement.
