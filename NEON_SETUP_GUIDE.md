# Configuration de Neon PostgreSQL pour SantSN

Ce guide explique comment configurer et utiliser [Neon](https://neon.tech) comme base de données PostgreSQL hébergée pour déployer l'API SantSN.

## Pourquoi Neon ?

Neon est une base de données PostgreSQL serverless qui offre :
- **Hébergement gratuit** généreux (0.5 GB de stockage, 10 heures de calcul/jour)
- **Scaling automatique** (scale to zero quand inutilisé)
- **Branching instantané** des bases de données (comme Git pour les données)
- **Connexion pooling** intégré (important pour les applications serverless)
- **Compatibilité totale** avec PostgreSQL et Prisma

## Étape 1 : Créer un projet Neon

1. Rendez-vous sur [neon.tech](https://neon.tech) et créez un compte
2. Cliquez sur **"Create a new project"**
3. Donnez un nom à votre projet (ex: `sante-sn-production`)
4. Choisissez la région la plus proche de vos utilisateurs (ex: `aws-eu-west-3` pour l'Europe/Ouest)
5. Cliquez sur **"Create project"**

## Étape 2 : Récupérer l'URL de connexion

Après la création du projet, Neon génère automatiquement une URL de connexion :

1. Dans le tableau de bord Neon, allez dans **"Connection Details"**
2. Copiez les deux URLs de connexion :
   ```
   DATABASE_URL=postgresql://username:password@ep-cool-darkness-123456-pooler.eu-west-3.aws.neon.tech/santedb?sslmode=require&channel_binding=require
   DIRECT_URL=postgresql://username:password@ep-cool-darkness-123456.eu-west-3.aws.neon.tech/santedb?sslmode=require&channel_binding=require
   ```

**Important** : utilisez l'endpoint `-pooler` pour `DATABASE_URL` et l'endpoint direct pour `DIRECT_URL`. Les deux URLs doivent garder `sslmode=require`.

## Étape 3 : Configurer l'application

### 3.1 Fichier `.env` (développement local)

Modifiez votre fichier `.env` local pour utiliser Neon :

```env
# Server
NODE_ENV=development
PORT=5000

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-cool-darkness-123456-pooler.eu-west-3.aws.neon.tech/santedb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://username:password@ep-cool-darkness-123456.eu-west-3.aws.neon.tech/santedb?sslmode=require&channel_binding=require"

# Prisma query logs (set true only for SQL debugging)
PRISMA_LOG_QUERIES=false

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d

# ... autres configurations
```

`DATABASE_URL` sert au trafic applicatif avec le connection pooler Neon. `DIRECT_URL` sert aux migrations Prisma.

### 3.2 Fichier `.env.production.example`

Le fichier est déjà configuré avec les deux variables. Remplacez `DATABASE_URL` par l'URL poolée Neon et `DIRECT_URL` par l'URL directe.

### 3.3 Secrets GitHub (pour CI/CD)

Dans les paramètres de votre repository GitHub, ajoutez/modifiez ces secrets :

- `DATABASE_URL`: L'URL poolée Neon complète
- `DIRECT_URL`: L'URL directe Neon complète
- `POSTGRES_URL`: (optionnel) Même URL pour compatibilité avec certains déploiements

## Étape 4 : Exécuter les migrations

### En local :

```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations
npx prisma migrate deploy

# (Optionnel) Seeder la base de données
npm run db:seed
```

### En production (via Docker) :

Le pipeline CI/CD exécute automatiquement `npx prisma migrate deploy` lors du déploiement.

## Étape 5 : Fonctionnalités avancées de Neon

### 5.1 Branching (créer des environnements isolés)

Neon permet de créer des branches de base de données instantanées :

```bash
# Via Neon CLI (npm install -g neonctl)
neon project branch create my-feature-branch

# Récupérer l'URL de la branche
neon project branch get my-feature-branch --output connection-uri
```

Utilisez cette URL pour les environnements de prévisualisation Vercel ou les tests.

### 5.2 Connection Pooling

Pour les applications avec beaucoup de connexions simultanées, utilisez le connection string avec pooling pour `DATABASE_URL` :

```
postgresql://username:password@ep-cool-darkness-123456-pooler.eu-west-3.aws.neon.tech/santedb?sslmode=require&channel_binding=require
```

Dans l'application SantSN, le client Prisma ajoute automatiquement `pgbouncer=true` si `DATABASE_URL` pointe deja vers un host Neon `-pooler`.

### 5.3 Reset de la base de données

Pour réinitialiser complètement la base (attention, données supprimées !) :

```bash
# Via Neon dashboard ou CLI
neon project database reset
```

## Étape 6 : Surveillance et sauvegarde

### Dashboard Neon

Le tableau de bord Neon fournit :
- Métriques de performance
- Historique des requêtes
- Gestion des branches
- Points de restauration (PITR)

### Sauvegardes automatiques

Neon conserve automatiquement les données pendant 30 jours (plan gratuit) et permet la restauration à n'importe quel point dans le temps.

## Dépannage

### Erreur : "SSL connection required"

Assurez-vous que l'URL contient `?sslmode=require`.

### Erreur : "Too many connections"

Utilisez le connection pooling avec `&pgbouncer=true` dans l'URL.

### Erreur : "Database does not exist"

Vérifiez que le nom de la base de données dans l'URL correspond à celle créée dans Neon.

### Migrations Prisma qui échouent

1. Vérifiez que le client Prisma est généré : `npm run prisma:generate`
2. Vérifiez que `DIRECT_URL` pointe bien vers l'endpoint Neon direct, sans `-pooler`
3. Exécutez les migrations manuellement : `npx prisma migrate deploy`
4. Consultez les logs Neon pour les erreurs SQL

## Ressources

- [Documentation Neon](https://neon.tech/docs)
- [Neon CLI](https://neon.tech/docs/reference/cli-install)
- [Prisma avec Neon](https://neon.tech/docs/guides/prisma)
- [Connection pooling avec pgbouncer](https://neon.tech/docs/manage/connection-pooling)

## Alternative : Autres bases de données cloud

Si vous préférez d'autres solutions :

- **Supabase** : PostgreSQL avec fonctionnalités additionnelles (auth, realtime)
- **Railway** : PostgreSQL managé avec déploiement facile
- **AWS RDS** : PostgreSQL traditionnel (payant)
- **Google Cloud SQL** : PostgreSQL managé par Google

Tous sont compatibles with Prisma en modifiant simplement l'URL `DATABASE_URL`.
