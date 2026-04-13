# Santé SN API - Backend Node.js

API RESTful pour la plateforme de santé Santé SN, développée avec Node.js, Express et Prisma (PostgreSQL).

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ et npm
- PostgreSQL (local ou cloud comme [Neon](https://neon.tech))
- Docker (optionnel, pour le déploiement)

### Installation locale

1. **Cloner le repository**
```bash
git clone https://github.com/fatoumatbinetousylla/SantSN.git
cd SantSN/sante-sn-api-node
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditez .env avec vos paramètres (base de données, JWT, etc.)
```

4. **Configurer la base de données**

**Option A : PostgreSQL local**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sante_sn?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/sante_sn?schema=public"
```

**Option B : Neon (PostgreSQL cloud gratuit)**
```env
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/sante_sn?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/sante_sn?sslmode=require&channel_binding=require"
```
`DATABASE_URL` sert a l'application avec le pooler Neon. `DIRECT_URL` sert a Prisma pour les migrations.
👉 Voir le [guide complet Neon](NEON_SETUP_GUIDE.md) pour créer un compte et obtenir les deux URLs.

5. **Exécuter les migrations**
```bash
npm run prisma:generate
npx prisma migrate deploy
```

6. **Seeder la base de données (optionnel)**
```bash
npm run db:seed
```

7. **Démarrer le serveur de développement**
```bash
npm run dev
```

L'API est disponible sur `http://localhost:5000`

## 📚 Documentation

- **[Guide de configuration Neon](NEON_SETUP_GUIDE.md)** - Utiliser Neon comme base de données cloud
- **[Guide CI/CD](CICD_GUIDE.md)** - Déploiement Docker et automatisation
- **[Schémas UML](../UML_DIAGRAMS/)** - Architecture et diagrammes

## 🔧 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement avec hot-reload |
| `npm run build` | Compile le TypeScript pour la production |
| `npm start` | Démarre le serveur en production |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run db:migrate` | Crée une nouvelle migration |
| `npm run db:deploy` | Applique les migrations en production |
| `npm run db:seed` | Remplit la base avec des données de test |
| `npm run docker:build` | Construit l'image Docker |
| `npm run docker:publish` | Publie l'image sur Docker Hub |

## 🗄️ Structure de la base de données

L'application gère :
- **Utilisateurs** (patients, médecins, secrétaires, admins)
- **Rendez-vous** avec workflow de validation
- **Consultations** médicales
- **Paiements** (intégration PayDunya)
- **Ordonnances** et médicaments
- **Notifications**
- **Chat** entre utilisateurs
- **Triage IA** des patients
- **Paramètres** de l'application

Voir `prisma/schema.prisma` pour le schéma complet.

## 🐳 Déploiement Docker

### Développement local avec Docker
```bash
docker compose up -d --build
```

### Production
1. Configurez les secrets GitHub (voir [CICD_GUIDE.md](CICD_GUIDE.md))
2. Le pipeline CI/CD déploie automatiquement sur push vers `main`
3. Ou déployez manuellement avec `docker-compose.prod.yml`

## 🔐 Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL de connexion PostgreSQL | ✅ |
| `DIRECT_URL` | URL PostgreSQL directe pour Prisma migrations/introspection | ✅ si `DATABASE_URL` utilise un pooler |
| `JWT_SECRET` | Secret pour les tokens d'accès | ✅ |
| `JWT_REFRESH_SECRET` | Secret pour les tokens de rafraîchissement | ✅ |
| `FRONTEND_URL` | URL du frontend (CORS) | ✅ |
| `SMTP_*` | Configuration email (optionnel) | ❌ |
| `OPENAI_API_KEY` | Clé pour le triage IA (optionnel) | ❌ |
| `PAYDUNYA_*` | Configuration des paiements (optionnel) | ❌ |

Voir `.env.example` pour la liste complète.

## 🛡️ Sécurité

- Authentification JWT avec refresh tokens
- Hachage des mots de passe avec bcrypt
- Validation des données avec des schemas dédiés
- CORS configuré
- Soft delete pour la préservation des données
- HTTPS requis en production (SSL via Neon)

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amélioration`)
3. Committez vos changements (`git commit -m 'Ajouter fonctionnalité'`)
4. Push (`git push origin feature/amélioration`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 🙏 Remerciements

- [Neon](https://neon.tech) pour la base de données PostgreSQL serverless
- [Prisma](https://prisma.io) pour l'ORM
- L'équipe de Santé SN pour leur vision

---

**Santé SN** - Platforme de santé numérique pour le Sénégal 🇸🇳
