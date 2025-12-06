# 🔒 Guide de Sécurité Outscale S3 Explorer

Ce document détaille les mesures de sécurité implémentées dans Outscale S3 Explorer et les bonnes pratiques à suivre.

---

## 📋 Table des matières

1. [Système de Logging Structuré](#1-système-de-logging-structuré)
2. [Cache Paramétrable](#2-cache-paramétrable)
3. [Rate Limiting](#3-rate-limiting)
4. [Protection des Credentials](#4-protection-des-credentials)
5. [Headers de Sécurité](#5-headers-de-sécurité)
6. [Checklist de Déploiement](#6-checklist-de-déploiement)

---

## 1. Système de Logging Structuré

### 🎯 Objectif
Remplacer les `console.log()` par un système de logging professionnel avec niveaux et filtrage.

### ✅ Implémentation

**Fichier:** `src/services/loggingService.ts`

```typescript
import { logger } from '@/services/loggingService';

// Logs par niveau
logger.debug('S3Service', 'Détails de debug', { bucket: 'test' });
logger.info('S3Service', 'Opération réussie', { count: 5 });
logger.warn('S3Service', 'Attention requise', { issue: 'timeout' });
logger.error('S3Service', 'Erreur critique', new Error('Failed'));
```

### 🔧 Configuration

Niveaux disponibles : `debug`, `info`, `warn`, `error`

```bash
# .env.local ou ConfigMap Kubernetes
VITE_LOGGING_ENABLED=true
VITE_LOG_LEVEL=info  # En production: info ou warn
```

**Comportement:**
- `debug`: Tous les logs (développement uniquement)
- `info`: Info, warn, error (production)
- `warn`: Warn et error uniquement
- `error`: Erreurs uniquement

---

## 2. Cache Paramétrable

### 🎯 Objectif
Rendre les durées de cache (TTL) configurables sans rebuild.

### ✅ Implémentation

**Fichier:** `src/services/cacheService.ts`

Le cache utilise maintenant les valeurs de `src/config/environment.ts` qui lit les variables d'environnement.

### 🔧 Configuration

```bash
# .env.local
VITE_CACHE_ENABLED=true
VITE_CACHE_TTL_BUCKETS=300000      # 5 minutes
VITE_CACHE_TTL_OBJECTS=180000      # 3 minutes  
VITE_CACHE_TTL_CREDENTIALS=1800000 # 30 minutes
```

**Recommandations:**
- **Dev:** TTL courts (1-2 min) pour voir les changements rapidement
- **Prod:** TTL plus longs (5-10 min) pour réduire la charge API

---

## 3. Rate Limiting

### 🎯 Objectif
Protéger le proxy contre les abus et les attaques par déni de service (DoS).

### ✅ Implémentation

**Fichier:** `proxy-server/server.js`

Deux niveaux de rate limiting:

1. **Global** (lecture + écriture): 100 req/15 min par défaut
2. **Strict** (opérations d'écriture): 20 req/5 min par défaut

### 🔧 Configuration

```bash
# proxy-server/.env
RATE_LIMIT_WINDOW_MS=900000         # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100         # Requêtes normales
RATE_LIMIT_STRICT_WINDOW_MS=300000  # 5 minutes
RATE_LIMIT_STRICT_MAX_REQUESTS=20   # Requêtes d'écriture
```

### 📊 Routes protégées

**Rate limiting strict (écriture):**
- `POST /api/buckets` - Création de bucket
- `DELETE /api/buckets/:name` - Suppression de bucket
- `POST /api/buckets/:bucket/objects` - Upload de fichier
- `DELETE /api/buckets/:bucket/objects/:key` - Suppression d'objet
- `POST /api/buckets/:bucket/folders` - Création de dossier

**Rate limiting normal (lecture):**
- `GET /api/buckets` - Liste des buckets
- `GET /api/buckets/:bucket/objects` - Liste des objets
- `GET /api/buckets/:bucket/objects/:key/download` - URL de téléchargement

---

## 4. Protection des Credentials

### ⚠️ PROBLÈME

Les credentials S3 (Access Key / Secret Key) transitent dans les headers HTTP.

**Sans HTTPS → Les credentials sont en CLAIR sur le réseau !**

### ✅ Solutions implémentées

#### A. Validation des Credentials

Le proxy valide maintenant le format des credentials avant utilisation:

```javascript
// Rejet si credentials manquants ou format invalide
if (accessKey.length < 10 || secretKey.length < 20) {
  return res.status(400).json({ error: 'Format invalide' });
}
```

#### B. Headers de Sécurité

```javascript
// Content Security Policy
res.setHeader('Content-Security-Policy', "default-src 'self'; ...");

// Protection contre clickjacking
res.setHeader('X-Frame-Options', 'DENY');

// Force HTTPS pour 1 an
res.setHeader('Strict-Transport-Security', 'max-age=31536000');
```

### 🔐 OBLIGATOIRE EN PRODUCTION

#### Option 1: Reverse Proxy HTTPS (Recommandé)

**Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name nums3.example.com;
    
    ssl_certificate /etc/ssl/certs/nums3.crt;
    ssl_certificate_key /etc/ssl/private/nums3.key;
    
    # Proxy vers NumS3
    location /api/ {
        proxy_pass http://proxy-server:3001/api/;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://frontend:80/;
    }
}
```

**HAProxy:**
```haproxy
frontend https_frontend
    bind *:443 ssl crt /etc/ssl/certs/nums3.pem
    default_backend nums3_backend
    
backend nums3_backend
    server nums3 proxy-server:3001 check
```

#### Option 2: Kubernetes Ingress avec TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nums3-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - nums3.example.com
    secretName: nums3-tls
  rules:
  - host: nums3.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nums3-frontend
            port:
              number: 80
```

---

## 5. Headers de Sécurité

Tous les headers de sécurité sont automatiquement ajoutés par le proxy:

| Header | Valeur | Protection |
|--------|--------|------------|
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS pendant 1 an |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `X-Frame-Options` | `DENY` | Anti-clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Protection XSS navigateur |
| `Content-Security-Policy` | Restrictif | Contrôle des ressources |

---

## 6. Checklist de Déploiement

### ✅ Avant de déployer en production

#### Frontend (Outscale S3 Explorer)

- [ ] Variables d'environnement configurées dans ConfigMap
- [ ] `VITE_LOG_LEVEL=info` ou `warn` (pas `debug`)
- [ ] `VITE_CACHE_ENABLED=true` avec TTL adaptés
- [ ] `VITE_PROXY_URL` pointe vers `/api` (pas localhost)

#### Proxy Server

- [ ] **HTTPS activé** via Nginx/HAProxy/Ingress
- [ ] Certificat SSL valide (Let's Encrypt recommandé)
- [ ] Rate limiting configuré selon charge attendue
- [ ] `NODE_ENV=production` défini
- [ ] `ALLOWED_ORIGINS` liste seulement les domaines autorisés
- [ ] Logs centralisés (ELK, Grafana, CloudWatch...)

#### Infrastructure

- [ ] Firewall: Port 3001 NON exposé publiquement
- [ ] Reverse proxy (Nginx/HAProxy) devant le proxy
- [ ] Network policies Kubernetes restreignent l'accès
- [ ] Monitoring activé (Prometheus, DataDog...)
- [ ] Alertes configurées (erreurs 5xx, rate limiting...)

---

## 🆘 En cas de problème

### Credentials interceptés

1. **Révoquer immédiatement** les Access Keys compromis
2. Générer de nouvelles Access Keys
3. Vérifier que HTTPS est bien activé
4. Analyser les logs pour identifier la faille

### Rate limiting trop strict

```bash
# Augmenter les limites (proxy-server/.env)
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_STRICT_MAX_REQUESTS=50
```

### Logs trop verbeux

```bash
# Réduire le niveau de log (frontend)
VITE_LOG_LEVEL=warn  # Ou error
```

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Express Rate Limit](https://express-rate-limit.mintlify.app/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**🔐 La sécurité est un processus continu, pas une destination !**
