# Outscale S3 Explorer - Application S3 Management pour Outscale

## Description Générale
Outscale S3 Explorer est une application web moderne de gestion complète des buckets et objets S3 Outscale. Elle offre une interface intuitive et sécurisée pour administrer vos espaces de stockage cloud avec des fonctionnalités avancées de monitoring et de journalisation.

## Architecture Technique
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + AWS SDK v3
- **État global**: Zustand avec persistance
- **Routage**: React Router v6
- **UI**: Composants shadcn/ui avec design system personnalisé
- **Authentification**: JWT avec chiffrement bcrypt

## Fonctionnalités Principales

### 🔐 Authentification & Sécurité
- Login sécurisé avec Access Key/Secret Key Outscale
- Support multi-régions (EU-West-2, EU-West-3, US-East-2, etc.)
- Tokens JWT avec expiration automatique
- Chiffrement des credentials avec bcrypt
- Headers de sécurité (Helmet.js, CORS, CSP)
- Rate limiting et validation des entrées

### 🗂️ Gestion des Buckets
- **Affichage**: Liste complète des buckets avec métadonnées (taille, nombre d'objets, date de création)
- **Création**: Nouveau bucket avec sélection de région
- **Suppression**: Suppression forcée avec vidage automatique du contenu
- **Navigation**: Interface card-based avec preview des statistiques
- **Actualisation**: Refresh manuel et automatique

### 📁 Gestion des Objets & Dossiers
- **Navigation hiérarchique**: Parcours des dossiers avec breadcrumb
- **Upload multifiles**: Glisser-déposer avec barre de progression
- **Téléchargement**: URLs signées sécurisées
- **Création de dossiers**: Organisation hiérarchique personnalisée
- **Suppression**: Objets et dossiers (récursive)
- **Métadonnées**: Taille, date de modification, type de fichier

### 📊 Interface Utilisateur Avancée
- **Design responsive**: Optimisé mobile/desktop
- **Dashboard centralisé**: Vue d'ensemble des buckets
- **Header global**: Navigation persistante avec breadcrumb
- **Console backend fixe**: Monitoring en temps réel (côté droit)
- **Historique d'actions**: Journal des opérations avec timestamps
- **Indicateurs de statut**: État des opérations en cours

### 🔍 Monitoring & Debugging
- **Journalisation complète**: 
  - Logs structurés avec Winston (frontend/backend)
  - Historique des actions utilisateur
  - Console backend avec filtrage et recherche
  - Logs de debug pour suppression de buckets
- **Gestion d'erreurs**: 
  - Error boundaries React
  - Retry automatique avec backoff exponentiel
  - Messages d'erreur contextuels
  - Indicateurs visuels d'état
- **Performance**: 
  - Lazy loading et pagination
  - Cache intelligent des requêtes
  - Progress bars pour opérations longues

### 🛠️ Fonctionnalités Techniques
- **Session management**: Persistance avec vérification automatique
- **Routing avancé**: Routes protégées avec redirections intelligentes
- **État synchronisé**: Store Zustand avec persistance localStorage
- **API robuste**: Gestion des timeouts, retry logic, validation
- **CORS sécurisé**: Configuration stricte pour sécurité

### 🎨 Design System
- **Tokens sémantiques**: Couleurs, gradients, ombres via CSS variables HSL
- **Composants réutilisables**: Bibliothèque shadcn/ui personnalisée
- **Thème cohérent**: Bleu Outscale avec variants (primary, secondary, accent)
- **Animations fluides**: Transitions CSS optimisées
- **Typographie**: Hiérarchie claire et lisible

### 🔄 Opérations Avancées
- **Upload en lot**: Gestion simultanée de multiples fichiers
- **Suppression récursive**: Dossiers complets avec confirmation
- **Retry intelligent**: Nouvelle tentative automatique sur échec réseau  
- **Cache management**: Invalidation intelligente après modifications
- **Progress tracking**: Suivi détaillé des opérations longues

### 📱 Expérience Utilisateur
- **Toasts informatifs**: Notifications contextuelles (Sonner)
- **Dialogues de confirmation**: Validation des actions critiques
- **Loading states**: Indicateurs visuels pendant les chargements
- **Error recovery**: Options de retry et messages d'aide
- **Navigation intuitive**: Breadcrumbs et boutons retour

## Cas d'Usage Principaux
1. **Administration S3**: Gestion complète des ressources Outscale
2. **Upload de masse**: Déploiement de sites web ou applications
3. **Backup management**: Sauvegarde et archivage de données
4. **Content delivery**: Gestion d'assets pour CDN
5. **Debugging S3**: Monitoring et troubleshooting des opérations

## Sécurité & Production
- Variables d'environnement pour configuration
- Logging rotatif et monitoring
- Health checks et métriques
- Configuration HTTPS et reverse proxy
- Gestion des secrets chiffrée
- Validation stricte côté client/serveur