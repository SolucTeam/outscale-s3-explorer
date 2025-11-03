# Guide de Configuration NUMS3 Console

Ce document explique comment configurer l'application NUMS3 Console pour différents environnements sans avoir à rebuilder.

## 📋 Table des Matières

- [Variables d'Environnement](#variables-denvironnement)
- [Configuration Locale](#configuration-locale)
- [Configuration Production (Kubernetes)](#configuration-production-kubernetes)
- [Configuration Docker](#configuration-docker)
- [FAQ](#faq)

---

## 🔧 Variables d'Environnement

Toutes les configurations sont centralisées dans `src/config/environment.ts` et utilisent des variables d'environnement Vite.

### Liste Complète des Variables

| Variable | Description | Défaut (Dev) | Défaut (Prod) |
|----------|-------------|--------------|---------------|
| `VITE_PROXY_URL` | URL du serveur proxy | `http://localhost:3001/api` | `/api` |
| `VITE_PROXY_TIMEOUT` | Timeout des requêtes (ms) | `30000` | `30000` |
| `VITE_ENDPOINT_EU_WEST_2` | Endpoint Europe Ouest | `https://oos.eu-west-2.outscale.com` | - |
| `VITE_ENDPOINT_US_EAST_2` | Endpoint US Est | `https://oos.us-east-2.outscale.com` | - |
| `VITE_ENDPOINT_US_WEST_1` | Endpoint US Ouest | `https://oos.us-west-1.outscale.com` | - |
| `VITE_ENDPOINT_CLOUDGOUV` | Endpoint Cloud Gouv | `https://oos.cloudgouv-eu-west-1.outscale.com` | - |
| `VITE_ENDPOINT_AP_NORTHEAST_1` | Endpoint Asie Pacifique | `https://oos.ap-northeast-1.outscale.com` | - |
| `VITE_CACHE_ENABLED` | Activer le cache | `true` | `true` |
| `VITE_CACHE_TTL_BUCKETS` | TTL cache buckets (ms) | `300000` | `300000` |
| `VITE_CACHE_TTL_OBJECTS` | TTL cache objets (ms) | `180000` | `180000` |
| `VITE_CACHE_TTL_CREDENTIALS` | TTL cache credentials (ms) | `1800000` | `1800000` |
| `VITE_LOGGING_ENABLED` | Activer les logs | `true` | `true` |
| `VITE_LOG_LEVEL` | Niveau de log | `debug` | `info` |
| `VITE_UPLOAD_MAX_CONCURRENT` | Uploads simultanés max | `5` | `5` |
| `VITE_UPLOAD_CHUNK_SIZE` | Taille chunks (octets) | `5242880` | `5242880` |
| `VITE_UPLOAD_TIMEOUT` | Timeout upload (ms) | `60000` | `60000` |
| `VITE_RETRY_MAX_ATTEMPTS` | Tentatives max | `3` | `3` |
| `VITE_RETRY_BASE_DELAY` | Délai base retry (ms) | `1000` | `1000` |
| `VITE_RETRY_MAX_DELAY` | Délai max retry (ms) | `10000` | `10000` |

---

## 💻 Configuration Locale

### Option 1: Fichier `.env.local` (Recommandé)

1. Copiez le fichier exemple:
```bash
cp .env.example .env.local
```

2. Modifiez les valeurs selon vos besoins:
```bash
# .env.local
VITE_PROXY_URL=http://localhost:3001/api
VITE_LOG_LEVEL=debug
VITE_CACHE_ENABLED=true
```

3. Redémarrez les serveurs:
```bash
./start.sh  # Linux/Mac
# ou
start.bat   # Windows
```

### Option 2: Variables d'Environnement Shell

```bash
# Linux/Mac
export VITE_PROXY_URL=http://localhost:3001/api
export VITE_LOG_LEVEL=debug
npm run dev

# Windows
set VITE_PROXY_URL=http://localhost:3001/api
set VITE_LOG_LEVEL=debug
npm run dev
```

---

## ☸️ Configuration Production (Kubernetes)

### Méthode 1: ConfigMap (Recommandé)

Modifiez `nums3-helm-chart/values-production.yaml`:

```yaml
frontend:
  env:
    - name: VITE_PROXY_URL
      value: "/api"
    - name: VITE_LOG_LEVEL
      value: "info"
    - name: VITE_CACHE_ENABLED
      value: "true"
    - name: VITE_ENDPOINT_EU_WEST_2
      value: "https://custom-endpoint.example.com"
```

### Méthode 2: ConfigMap Externe

Créez un ConfigMap séparé:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nums3-config
  namespace: nums3-console
data:
  VITE_PROXY_URL: "/api"
  VITE_LOG_LEVEL: "info"
  VITE_CACHE_ENABLED: "true"
  VITE_ENDPOINT_EU_WEST_2: "https://oos.eu-west-2.outscale.com"
```

Puis référencez-le dans le deployment:

```yaml
spec:
  containers:
  - name: frontend
    envFrom:
    - configMapRef:
        name: nums3-config
```

### Déploiement

```bash
cd nums3-helm-chart

# Développement
helm upgrade --install nums3-console . \
  -f values-dev.yaml \
  --namespace nums3-console \
  --create-namespace

# Production
helm upgrade --install nums3-console . \
  -f values-production.yaml \
  --namespace nums3-console \
  --create-namespace
```

### Mise à Jour Sans Rebuild

Pour changer une configuration en production **sans rebuild**:

```bash
# 1. Modifier le ConfigMap
kubectl edit configmap nums3-config -n nums3-console

# 2. Redémarrer les pods
kubectl rollout restart deployment/nums3-console-frontend -n nums3-console

# 3. Vérifier le rollout
kubectl rollout status deployment/nums3-console-frontend -n nums3-console
```

---

## 🐳 Configuration Docker

### Avec docker-compose

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: nums3-helm-chart/Dockerfile
    environment:
      - VITE_PROXY_URL=/api
      - VITE_LOG_LEVEL=info
      - VITE_CACHE_ENABLED=true
    ports:
      - "8080:8080"
```

### Avec docker run

```bash
docker run -d \
  -e VITE_PROXY_URL=/api \
  -e VITE_LOG_LEVEL=info \
  -e VITE_CACHE_ENABLED=true \
  -p 8080:8080 \
  nums3-console:latest
```

---

## ❓ FAQ

### Comment vérifier la configuration actuelle ?

Ouvrez la console du navigateur (F12) et tapez:
```javascript
// Affiche la configuration actuelle
console.log(import.meta.env)
```

Ou consultez les logs au démarrage, la config est affichée automatiquement.

### Les changements de variables nécessitent-ils un rebuild ?

**Non !** Les variables d'environnement Vite sont:
- **Injectées au build time** pour les valeurs par défaut
- **Remplaçables au runtime** via ConfigMaps Kubernetes ou variables d'environnement Docker

### Comment désactiver le cache en production ?

```bash
# Kubernetes
kubectl set env deployment/nums3-console-frontend VITE_CACHE_ENABLED=false -n nums3-console

# Docker
docker run -e VITE_CACHE_ENABLED=false nums3-console:latest
```

### Comment changer l'endpoint S3 pour une région spécifique ?

```yaml
# values-production.yaml
frontend:
  env:
    - name: VITE_ENDPOINT_EU_WEST_2
      value: "https://custom-s3-endpoint.example.com"
```

### Les secrets doivent-ils être dans les variables d'environnement ?

**Non !** Les secrets (Access Key, Secret Key) sont **toujours saisis par l'utilisateur** via le formulaire de login et stockés de manière sécurisée (chiffrement AES-256-GCM).

Les variables d'environnement ne contiennent **que** des configurations publiques (URLs, timeouts, etc.).

### Comment activer les logs debug en production temporairement ?

```bash
# Kubernetes - change la variable
kubectl set env deployment/nums3-console-frontend VITE_LOG_LEVEL=debug -n nums3-console

# Attendre le rollout
kubectl rollout status deployment/nums3-console-frontend -n nums3-console

# Revenir à info après debug
kubectl set env deployment/nums3-console-frontend VITE_LOG_LEVEL=info -n nums3-console
```

### Comment tester les variables localement avant de déployer ?

```bash
# 1. Créer un .env.local avec les valeurs de prod
cp .env.example .env.local

# 2. Modifier les valeurs
nano .env.local

# 3. Builder en mode production
npm run build

# 4. Tester avec preview
npm run preview
```

---

## 📚 Ressources

- [Documentation Vite - Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Helm Values](https://helm.sh/docs/chart_template_guide/values_files/)

---

## 🔐 Sécurité

**⚠️ IMPORTANT:**
- Ne **jamais** committer de fichiers `.env.local` ou `.env.production`
- Ne **jamais** mettre de secrets (API keys) dans les variables d'environnement frontend
- Les secrets utilisateur sont chiffrés côté client avec AES-256-GCM
- Utilisez Kubernetes Secrets pour les configurations sensibles du backend (proxy)

### 🆕 Nouvelles fonctionnalités de sécurité

NumS3 intègre maintenant des mesures de sécurité avancées :

1. **Logging structuré** - Système de logs professionnel avec niveaux (debug/info/warn/error)
2. **Cache paramétrable** - TTL configurables sans rebuild
3. **Rate limiting** - Protection contre les abus d'API (100 req/15min par défaut)
4. **Headers de sécurité** - CSP, HSTS, X-Frame-Options automatiques
5. **Validation des credentials** - Contrôle du format avant utilisation

📖 **Guide complet:** Voir [`SECURITE.md`](SECURITE.md) pour tous les détails et la configuration.
