# 🐳 NumS3-Console Helm Chart

Chart Helm officiel pour déployer NumS3-Console (Frontend React + Backend Node.js + Nginx) sur Kubernetes.

[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.19+-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Helm](https://img.shields.io/badge/Helm-3.0+-0F1689?logo=helm&logoColor=white)](https://helm.sh/)

## 📋 Table des matières

- [Description](#-description)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation rapide](#-installation-rapide)
- [Configuration](#-configuration)
- [Exemples d'utilisation](#-exemples-dutilisation)
- [Commandes utiles](#-commandes-utiles)
- [Dépannage](#-dépannage)
- [Migration et mise à jour](#-migration-et-mise-à-jour)

---

## 🎯 Description

**NumS3-Console** est une application web moderne pour la gestion de stockage S3, packagée dans une image Docker unique contenant :

- ✨ **Frontend** : React + Vite + Tailwind CSS
- 🔌 **Backend** : Proxy Node.js (Express)
- 🌐 **Serveur Web** : Nginx (reverse proxy + static files)

Ce chart Helm simplifie le déploiement sur Kubernetes avec support de l'autoscaling, ingress, et haute disponibilité.

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────┐
│            Kubernetes Cluster               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Ingress (optionnel)         │   │
│  │     outscale-s3-explorer.example.com       │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────▼──────────────────────┐   │
│  │          Service (LoadBalancer      │   │
│  │          ou ClusterIP)              │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────▼──────────────────────┐   │
│  │         Deployment (3 pods)         │   │
│  │  ┌────────────────────────────┐     │   │
│  │  │  Pod: outscale-s3-explorer        │     │   │
│  │  │  ┌──────────────────────┐  │     │   │
│  │  │  │  Nginx (port 80)     │  │     │   │
│  │  │  │   ↓ proxy /api/      │  │     │   │
│  │  │  │  Node.js (port 3001) │  │     │   │
│  │  │  └──────────────────────┘  │     │   │
│  │  └────────────────────────────┘     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  HPA (Horizontal Pod Autoscaler)    │   │
│  │  Min: 3 pods | Max: 20 pods         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Points importants :**
- ✅ **Application stateless** : pas de PersistentVolume nécessaire
- ✅ **localStorage côté navigateur** : les données utilisateur sont dans le navigateur
- ✅ **Tout-en-un** : l'image Docker contient tout (pas de ConfigMap externe)

---

## ✅ Prérequis

| Outil | Version minimum | Installation |
|-------|----------------|--------------|
| **Kubernetes** | 1.19+ | [Guide](https://kubernetes.io/docs/setup/) |
| **Helm** | 3.0+ | [Guide](https://helm.sh/docs/intro/install/) |
| **kubectl** | 1.19+ | [Guide](https://kubernetes.io/docs/tasks/tools/) |

**Accès au cluster :**
```bash
# Vérifier la connexion
kubectl cluster-info
kubectl get nodes
```

---

## 🚀 Installation rapide

### Méthode 1 : Helm (recommandée)
```bash
# Clone ou extrait le chart
cd helm/

# Installation avec valeurs par défaut
helm install outscale-s3-explorer . --namespace default

# OU avec un namespace dédié
helm install outscale-s3-explorer . \
  --namespace nums3 \
  --create-namespace
```

### Méthode 2 : Script d'installation (simplifié)
```bash
cd helm/

# Installation simple
./install.sh

# Installation en production
./install.sh -n production -e production --create-namespace

# Voir toutes les options
./install.sh --help
```

### Vérifier le déploiement
```bash
# Statut Helm
helm status outscale-s3-explorer -n nums3

# Statut des pods
kubectl get pods -n nums3 -l app.kubernetes.io/name=outscale-s3-explorer

# Logs
kubectl logs -n nums3 -l app.kubernetes.io/name=outscale-s3-explorer -f --tail=50
```

---

## ⚙️ Configuration

### Paramètres principaux

#### 🐳 Image Docker

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `image.repository` | Registry de l'image | `myregistry.azurecr.io/outscale-s3-explorer` |
| `image.tag` | Tag de l'image | `v1.0.0` |
| `image.pullPolicy` | Politique de pull | `Always` |

#### 🔄 Réplication

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `replicaCount` | Nombre de pods | `3` |

#### 🌐 Service

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `service.type` | Type de service | `LoadBalancer` |
| `service.port` | Port exposé | `80` |

#### 🌍 Ingress

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `ingress.enabled` | Activer l'Ingress | `true` |
| `ingress.className` | Ingress controller | `nginx` |
| `ingress.hosts[0].host` | Nom de domaine | `outscale-s3-explorer.production.com` |
| `ingress.tls[0].secretName` | Secret TLS | `outscale-s3-explorer-tls` |

#### 💾 Ressources

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `resources.requests.cpu` | CPU demandée | `500m` |
| `resources.requests.memory` | Mémoire demandée | `512Mi` |
| `resources.limits.cpu` | CPU max | `1000m` |
| `resources.limits.memory` | Mémoire max | `1Gi` |

#### 📈 Autoscaling (HPA)

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `autoscaling.enabled` | Activer HPA | `true` |
| `autoscaling.minReplicas` | Pods minimum | `3` |
| `autoscaling.maxReplicas` | Pods maximum | `20` |
| `autoscaling.targetCPUUtilizationPercentage` | Seuil CPU | `70` |
| `autoscaling.targetMemoryUtilizationPercentage` | Seuil mémoire | `80` |

#### 🔒 Sécurité

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `podSecurityContext.runAsUser` | User ID | `101` (nginx) |
| `podSecurityContext.fsGroup` | Group ID | `101` |
| `securityContext.readOnlyRootFilesystem` | Filesystem read-only | `false` |

---

## 📚 Exemples d'utilisation

### 🏠 Environnement de développement
```yaml
# values-dev.yaml
replicaCount: 1

image:
  repository: localhost:5000/outscale-s3-explorer
  tag: dev
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi

autoscaling:
  enabled: false
```
```bash
helm install outscale-s3-explorer . -f values-dev.yaml -n dev --create-namespace
```

### 🏭 Environnement de production
```yaml
# values-production.yaml
replicaCount: 3

image:
  repository: myregistry.azurecr.io/outscale-s3-explorer
  tag: "v1.0.0"
  pullPolicy: Always

service:
  type: LoadBalancer
  port: 443  # Si TLS au niveau du LoadBalancer

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: outscale-s3-explorer.mycompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: outscale-s3-explorer-tls
      hosts:
        - outscale-s3-explorer.mycompany.com

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
                - outscale-s3-explorer
        topologyKey: kubernetes.io/hostname
```
```bash
helm install outscale-s3-explorer . \
  -f values-production.yaml \
  -n production \
  --create-namespace
```

### 🔐 Avec certificats TLS Let's Encrypt

**Prérequis** : [cert-manager](https://cert-manager.io/) installé
```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  hosts:
    - host: nums3.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: outscale-s3-explorer-tls
      hosts:
        - nums3.example.com
```

### 🌍 Multi-région avec haute disponibilité
```yaml
replicaCount: 5

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
                - outscale-s3-explorer
        topologyKey: topology.kubernetes.io/zone  # Distribution multi-zones

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: outscale-s3-explorer
```

### 📊 Monitoring avec Prometheus
```yaml
# Ajouter des annotations pour Prometheus
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "80"
  prometheus.io/path: "/metrics"
```

---

## 🛠️ Commandes utiles

### 📦 Gestion du déploiement
```bash
# Installer
helm install outscale-s3-explorer . -n nums3 --create-namespace

# Mettre à jour
helm upgrade outscale-s3-explorer . -n nums3 -f values.yaml

# Mettre à jour l'image uniquement
helm upgrade outscale-s3-explorer . -n nums3 --set image.tag=v1.0.1

# Rollback à la version précédente
helm rollback outscale-s3-explorer -n nums3

# Rollback à une version spécifique
helm history outscale-s3-explorer -n nums3
helm rollback outscale-s3-explorer 2 -n nums3

# Désinstaller
helm uninstall outscale-s3-explorer -n nums3
```

### 🔍 Debugging
```bash
# Voir les pods
kubectl get pods -n nums3 -l app.kubernetes.io/name=outscale-s3-explorer -o wide

# Voir les logs
kubectl logs -n nums3 -l app.kubernetes.io/name=outscale-s3-explorer -f --tail=100

# Logs d'un pod spécifique
kubectl logs -n nums3 <pod-name> -f

# Exécuter une commande dans le pod
kubectl exec -it -n nums3 <pod-name> -- /bin/sh

# Décrire un pod (voir les events)
kubectl describe pod -n nums3 <pod-name>

# Voir tous les événements du namespace
kubectl get events -n nums3 --sort-by='.lastTimestamp'
```

### 🌐 Accès à l'application
```bash
# Port-forward local (pour tests)
kubectl port-forward -n nums3 svc/outscale-s3-explorer 8080:80
# Accès: http://localhost:8080

# Obtenir l'IP du LoadBalancer
kubectl get svc -n nums3 outscale-s3-explorer

# Obtenir l'URL de l'Ingress
kubectl get ingress -n nums3
```

### 🧪 Validation et tests
```bash
# Valider le chart
helm lint .

# Dry-run (voir les manifests sans installer)
helm install outscale-s3-explorer . --dry-run --debug -n nums3

# Générer les manifests YAML
helm template outscale-s3-explorer . -f values.yaml > manifests.yaml

# Tester avec des valeurs custom
helm template outscale-s3-explorer . -f values-production.yaml --debug
```

### 📊 Monitoring
```bash
# Voir l'utilisation des ressources
kubectl top pods -n nums3 -l app.kubernetes.io/name=outscale-s3-explorer

# Voir le statut HPA
kubectl get hpa -n nums3

# Décrire l'HPA
kubectl describe hpa -n nums3 outscale-s3-explorer
```

---

## 🐛 Dépannage

### ❌ Les pods ne démarrent pas

**Symptômes** : Pods en `CrashLoopBackOff` ou `ImagePullBackOff`
```bash
# 1. Vérifier les événements
kubectl describe pod -n nums3 <pod-name>

# 2. Vérifier les logs
kubectl logs -n nums3 <pod-name>

# 3. Vérifier l'image
kubectl get pods -n nums3 <pod-name> -o jsonpath='{.spec.containers[*].image}'
```

**Solutions courantes** :
- ✅ Vérifier que l'image existe dans le registry
- ✅ Vérifier les credentials du registry (imagePullSecrets)
- ✅ Augmenter les ressources si OOMKilled

### ⚠️ Liveness/Readiness probes échouent
```bash
# Vérifier les probes
kubectl describe pod -n nums3 <pod-name> | grep -A 5 "Liveness\|Readiness"

# Tester manuellement
kubectl exec -n nums3 <pod-name> -- wget -qO- http://localhost:80/
```

**Solutions** :
```yaml
# Augmenter les délais dans values.yaml
livenessProbe:
  initialDelaySeconds: 60  # Au lieu de 40
  periodSeconds: 30

readinessProbe:
  initialDelaySeconds: 20  # Au lieu de 10
```

### 🌐 Problèmes d'accès Ingress
```bash
# Vérifier l'Ingress
kubectl get ingress -n nums3
kubectl describe ingress -n nums3 outscale-s3-explorer

# Vérifier le service
kubectl get svc -n nums3 outscale-s3-explorer

# Tester depuis un pod de debug
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://outscale-s3-explorer.nums3.svc.cluster.local
```

### 📈 HPA ne scale pas
```bash
# Vérifier le HPA
kubectl get hpa -n nums3
kubectl describe hpa -n nums3 outscale-s3-explorer

# Vérifier metrics-server
kubectl top nodes
kubectl top pods -n nums3
```

**Solution** : Installer metrics-server si absent
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 🔒 Erreurs de permissions
```bash
# Vérifier le SecurityContext
kubectl get pod -n nums3 <pod-name> -o jsonpath='{.spec.securityContext}'
kubectl get pod -n nums3 <pod-name> -o jsonpath='{.spec.containers[0].securityContext}'
```

---

## 🔄 Migration et mise à jour

### Mise à jour de l'image Docker
```bash
# Méthode 1 : Via values.yaml
helm upgrade outscale-s3-explorer . -n nums3 --set image.tag=v1.0.2

# Méthode 2 : Via fichier
# Modifier values.yaml, puis:
helm upgrade outscale-s3-explorer . -n nums3 -f values.yaml

# Vérifier le rollout
kubectl rollout status deployment/outscale-s3-explorer -n nums3
```

### Rollback en cas de problème
```bash
# Voir l'historique
helm history outscale-s3-explorer -n nums3

# Rollback à la version précédente
helm rollback outscale-s3-explorer -n nums3

# Rollback à une version spécifique
helm rollback outscale-s3-explorer 3 -n nums3
```

### Blue/Green Deployment (avancé)
```bash
# 1. Déployer la nouvelle version avec un nom différent
helm install outscale-s3-explorer-v2 . -n nums3 \
  --set image.tag=v2.0.0 \
  --set service.name=outscale-s3-explorer-v2

# 2. Tester la v2

# 3. Basculer l'Ingress vers la v2
kubectl patch ingress outscale-s3-explorer -n nums3 --type=json \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value":"outscale-s3-explorer-v2"}]'

# 4. Supprimer l'ancienne version
helm uninstall outscale-s3-explorer -n nums3
```

---

## 📖 Documentation supplémentaire

- 📘 [Guide utilisateur NumS3-Console](../docs/USER_GUIDE.md)
- 🔧 [Guide d'administration](../docs/ADMIN_GUIDE.md)
- 🏗️ [Architecture technique](../docs/ARCHITECTURE.md)
- 🐳 [Build de l'image Docker](../Dockerfile)

---

## 🤝 Support

Pour toute question ou problème :

- 📧 Email : support@mycompany.com
- 💬 Slack : #outscale-s3-explorer
- 🐛 Issues : [GitHub Issues](https://github.com/mycompany/outscale-s3-explorer/issues)

---

## 📄 License

Copyright © 2025 MyCompany. Tous droits réservés.