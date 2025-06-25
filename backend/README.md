
# NumS3 Backend API

Backend Node.js/Express pour l'application NumS3 Console - Gestion des buckets et objets S3 Outscale.

## Fonctionnalités

### Authentification
- Login avec Access Key/Secret Key Outscale
- Tokens JWT sécurisés
- Session management avec credentials chiffrés
- Support multi-régions

### Opérations S3
- ✅ Liste des buckets
- ✅ Création/suppression de buckets
- ✅ Liste des objets avec navigation hiérarchique
- ✅ Upload de fichiers (multipart jusqu'à 100MB)
- ✅ Téléchargement via URLs signées
- ✅ Suppression d'objets
- ✅ Création de dossiers

### Sécurité
- Helmet.js pour la sécurité des headers
- Rate limiting
- CORS configuré
- Validation des entrées
- Logging centralisé
- Gestion d'erreurs robuste

## Installation

```bash
cd backend
npm install
```

## Configuration

Copiez `.env.example` vers `.env` et configurez les variables :

```bash
cp .env.example .env
```

Variables importantes :
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `FRONTEND_URL` : URL du frontend pour CORS
- `PORT` : Port du serveur (défaut: 5000)

## Démarrage

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/refresh` - Renouvellement token
- `GET /api/auth/regions` - Liste des régions

### S3 Operations
- `GET /api/s3/buckets` - Liste des buckets
- `POST /api/s3/buckets` - Créer un bucket
- `DELETE /api/s3/buckets/:name` - Supprimer un bucket
- `GET /api/s3/buckets/:name/objects` - Liste des objets
- `POST /api/s3/buckets/:name/upload` - Upload fichier
- `DELETE /api/s3/buckets/:name/objects/:key` - Supprimer objet
- `GET /api/s3/buckets/:name/objects/:key/download` - URL de téléchargement
- `POST /api/s3/buckets/:name/folders` - Créer dossier

### Health Check
- `GET /health` - Status du serveur

## Structure du Projet

```
src/
├── server.js           # Point d'entrée
├── config/
│   └── outscale.js     # Configuration régions Outscale
├── middleware/
│   ├── auth.js         # Authentification JWT
│   └── errorHandler.js # Gestion globale des erreurs
├── routes/
│   ├── auth.js         # Routes d'authentification
│   └── s3.js           # Routes S3
├── services/
│   └── s3Service.js    # Service S3 avec AWS SDK
└── utils/
    └── logger.js       # Configuration Winston
```

## Sécurité

### Credentials
- Les credentials AWS ne sont jamais stockés en plain text
- Secret keys chiffrées avec bcrypt
- Sessions temporaires avec expiration

### Headers de Sécurité
- CSP, HSTS, X-Frame-Options via Helmet
- Rate limiting par IP
- CORS strict sur l'origine du frontend

### Validation
- Validation stricte des paramètres d'entrée
- Sanitisation des noms de buckets/objets
- Vérification des permissions S3

## Monitoring

### Logs
- Logs structurés avec Winston
- Séparation error/combined logs
- Rotation automatique des logs

### Health Check
```bash
curl http://localhost:5000/health
```

## Tests

```bash
npm test
```

## Déploiement

### Variables d'environnement requises
```
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
FRONTEND_URL=https://your-domain.com
PORT=5000
```

### Recommandations Production
- Utiliser Redis pour les sessions
- Configurer un reverse proxy (Nginx)
- Activer HTTPS
- Configurer la rotation des logs
- Monitoring avec Prometheus/Grafana

## Compatibilité

- Node.js >= 18.0.0
- Compatible avec toutes les régions Outscale
- AWS SDK v3 pour performances optimales
