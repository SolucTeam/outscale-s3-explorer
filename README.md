# Outscale S3 Explorer 🚀

<div align="center">

Interface web moderne et intuitive pour la gestion d'objets S3 compatible **Outscale Object Storage Service (OOS)**.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js)

</div>

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Démarrage rapide](#-démarrage-rapide)
- [Configuration](#️-configuration)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Développement](#-développement)
- [Dépannage](#-dépannage)

---

## 🎯 Aperçu

Outscale S3 Explorer est une application web moderne qui facilite la gestion de vos objets stockés sur Outscale Object Storage. Elle offre une interface utilisateur intuitive inspirée des meilleures pratiques des consoles cloud modernes.

### Points forts

- ✨ Interface utilisateur moderne et responsive
- 🚀 Performance optimisée avec cache intelligent
- 🔒 Sécurité renforcée avec proxy backend
- 🎨 Design system cohérent avec shadcn/ui
- 📱 Compatible desktop et mobile

---

## ✨ Fonctionnalités

### Gestion des buckets

- 📁 Création et suppression de buckets
- 👀 Visualisation en temps réel
- 🔍 Recherche et filtrage rapides

### Gestion des objets

- 📤 **Upload de fichiers**
  - Drag & drop intuitif
  - Barre de progression en temps réel
  - Support multi-fichiers
- 📥 **Téléchargement** avec gestion des erreurs
- 🗑️ **Suppression** avec confirmation
- 📊 Affichage des métadonnées (taille, date, type MIME)

### Navigation

- 🗂️ Navigation hiérarchique dans les dossiers
- 🔙 Fil d'Ariane (breadcrumb) pour navigation rapide
- ⚡ Chargement paresseux pour performances optimales

### Fonctionnalités avancées

- 💾 **Cache intelligent** pour réduire les appels API
- 🔄 **Retry automatique** en cas d'erreur réseau
- 🔐 **Authentification sécurisée** avec gestion de session
- 🌐 **Support multi-région** Outscale

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 20+ et npm
- Identifiants Outscale (Access Key + Secret Key)

### Démarrage

**Terminal 1 - Démarrer le proxy:**

```bash
cd proxy-server
npm install
npm start
```

**Terminal 2 - Démarrer le frontend:**

```bash
npm install
npm run dev
```

### Accès aux services

Une fois démarrés, accédez aux services:

- 🌐 **Frontend**: [http://localhost:8080](http://localhost:8080)
- 🔌 **Proxy API**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Configuration

### Identifiants Outscale

Lors de votre première connexion, l'application vous demandera:

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Access Key** | Votre clé d'accès Outscale | `AKIAIOSFODNN7EXAMPLE` |
| **Secret Key** | Votre clé secrète (stockée de façon sécurisée) | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| **Région** | Région de vos buckets | `eu-west-2` |

### Endpoints supportés

| Région | Endpoint | Description |
|--------|----------|-------------|
| `eu-west-2` | `https://oos.eu-west-2.outscale.com` | Europe (Paris) |
| `cloudgouv-eu-west-1` | `https://oos.cloudgouv-eu-west-1.outscale.com` | SecNumCloud (France) |
| `us-east-2` | `https://oos.us-east-2.outscale.com` | US East (Ohio) |
| `us-west-1` | `https://oos.us-west-1.outscale.com` | US West (Californie) |

### Variables d'environnement (optionnel)

Vous pouvez créer un fichier `.env` à la racine du projet:

```env
VITE_PROXY_URL=http://localhost:3001
VITE_DEFAULT_REGION=eu-west-2
```

---

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React App     │─────▶│   Proxy Server   │─────▶│  Outscale OOS   │
│  (Frontend)     │      │    (Backend)     │      │     (S3 API)    │
│  localhost:8080 │◀─────│  localhost:3001  │◀─────│                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### Stack technique

#### Frontend

- **Framework**: React 18.3 avec hooks modernes
- **Langage**: TypeScript 5.6 pour la sûreté des types
- **Build**: Vite 6.0 pour un développement ultra-rapide
- **Styles**: Tailwind CSS 3.4 avec design system personnalisé
- **UI Components**: shadcn/ui pour des composants accessibles
- **Icons**: Lucide React pour des icônes cohérentes
- **Routing**: React Router DOM 7.1 pour navigation SPA

#### Backend (Proxy)

- **Runtime**: Node.js 20+
- **Framework**: Express 4.21 pour API REST
- **SDK**: AWS S3 SDK v3 compatible Outscale
- **Middleware**: CORS, body-parser pour sécurité

#### Pourquoi un proxy?

Le proxy backend est essentiel pour:

1. 🔒 **Sécurité**: Masquer les credentials côté client
2. 🌐 **CORS**: Contourner les restrictions de partage de ressources
3. 🎯 **Logique métier**: Centraliser la gestion des requêtes S3
4. 📊 **Monitoring**: Logger et analyser les requêtes

---

## 🛠️ Technologies

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Langage typé |
| Vite | 6.0 | Bundler & dev server |
| Tailwind CSS | 3.4 | Framework CSS utility-first |
| shadcn/ui | Latest | Composants UI accessibles |
| React Router | 7.1 | Routing SPA |
| Lucide React | Latest | Bibliothèque d'icônes |

### Backend

| Technologie | Version | Rôle |
|-------------|---------|------|
| Node.js | 20+ | Runtime JavaScript |
| Express | 4.21 | Framework web |
| AWS SDK S3 | 3.x | Client S3 |
| CORS | 2.8 | Middleware CORS |

---

## 👨‍💻 Développement

### Installation des dépendances

```bash
# Frontend
npm install

# Backend
cd proxy-server
npm install
```

### Scripts disponibles

**Frontend:**

```bash
npm run dev          # Démarrer en mode développement
npm run build        # Build de production
npm run preview      # Preview du build
npm run lint         # Linter le code
```

**Backend:**

```bash
npm start           # Démarrer le serveur proxy
npm run dev         # Mode développement avec nodemon (si configuré)
```

### Structure du projet

```
outscale-s3-explorer/
├── src/                    # Code source frontend
│   ├── components/         # Composants React
│   ├── lib/               # Utilitaires et helpers
│   ├── hooks/             # Custom React hooks
│   └── main.tsx           # Point d'entrée
├── proxy-server/          # Code source backend
│   ├── server.js          # Serveur Express
│   └── package.json       # Dépendances backend
├── public/                # Assets statiques
├── index.html             # Template HTML
├── vite.config.ts         # Configuration Vite
├── tailwind.config.js     # Configuration Tailwind
└── tsconfig.json          # Configuration TypeScript
```

---

## 🔧 Dépannage

### Le frontend ne démarre pas

**Erreur**: `Port 8080 already in use`

**Solution**:

```bash
# Trouver le processus
lsof -ti:8080 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :8080   # Windows

# Ou modifier le port dans vite.config.ts
```

### Le proxy ne se connecte pas à Outscale

**Erreur**: `Network error` ou `Unable to connect`

**Solutions**:

1. Vérifiez vos credentials (Access Key, Secret Key)
2. Vérifiez la région sélectionnée
3. Testez la connectivité: `ping oos.eu-west-2.outscale.com`
4. Vérifiez votre pare-feu/proxy d'entreprise

### Erreurs CORS

**Erreur**: `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution**: Le proxy devrait gérer CORS automatiquement. Si l'erreur persiste:

```bash
cd proxy-server
npm install cors
# Redémarrer le proxy
```

### Performance lente

**Solutions**:

1. Vider le cache du navigateur
2. Vérifier la latence réseau vers Outscale
3. Réduire le nombre d'objets affichés simultanément
4. Activer le cache applicatif (déjà implémenté)

---

## 📝 License

Ce projet est sous licence MIT.

---

## 🤝 Contribution

Les contributions sont les bienvenues! N'hésitez pas à:

- 🐛 Signaler des bugs
- 💡 Proposer des fonctionnalités
- 🔧 Soumettre des pull requests

---

<div align="center">

**Fait avec ❤️ pour la communauté Outscale**

</div>
