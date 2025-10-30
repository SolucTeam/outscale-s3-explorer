# 📦 Helm Chart NumS3 Console - Documentation Complète

## ✅ Contenu Livré

Votre Helm chart complet pour déployer NumS3 Console dans Kubernetes est prêt !

### 📂 Structure du Chart

```
nums3-helm-chart/
├── Chart.yaml                      # Métadonnées du chart
├── values.yaml                     # Configuration par défaut
├── values-dev.yaml                 # Configuration développement
├── values-production.yaml          # Configuration production
├── Dockerfile                      # Image Docker multi-stage
├── .dockerignore                   # Fichiers à exclure du build
├── README.md                       # Documentation complète
├── QUICKSTART.md                   # Guide de démarrage rapide
├── deploy.sh                       # Script de déploiement automatisé
└── templates/                      # Templates Kubernetes
    ├── _helpers.tpl                # Fonctions helper
    ├── NOTES.txt                   # Notes post-installation
    ├── configmap.yaml              # Configuration
    ├── secret.yaml                 # Secrets (credentials)
    ├── serviceaccount.yaml         # Service Account
    ├── frontend-deployment.yaml    # Déploiement frontend
    ├── proxy-deployment.yaml       # Déploiement proxy/backend
    ├── service.yaml                # Services Kubernetes
    ├── ingress.yaml                # Ingress Controller
    ├── hpa.yaml                    # Autoscaling horizontal
    ├── pdb.yaml                    # Pod Disruption Budget
    └── networkpolicy.yaml          # Politiques réseau

```

## 🚀 Déploiement en 3 Étapes

### 1️⃣ Construire l'Image Docker

```bash
# Remplacez votre-registry par votre Docker registry
export DOCKER_REGISTRY="your-registry"

# Build de l'image
docker build -t ${DOCKER_REGISTRY}/nums3-console:1.0.0 \
  -f nums3-helm-chart/Dockerfile .

# Push vers le registry
docker push ${DOCKER_REGISTRY}/nums3-console:1.0.0
```

### 2️⃣ Personnaliser la Configuration

Créez `my-values.yaml` :

```yaml
# Votre image Docker
image:
  repository: your-registry/nums3-console
  tag: "1.0.0"

# Nombre de pods
replicaCount: 2

# Exposition publique (optionnel)
ingress:
  enabled: true
  hosts:
    - host: nums3.example.com
      paths:
        - path: /
          pathType: Prefix
          backend: frontend
        - path: /api
          pathType: Prefix
          backend: proxy
```

### 3️⃣ Installer avec Helm

```bash
# Créer le namespace
kubectl create namespace nums3

# Installer le chart
helm install nums3 ./nums3-helm-chart \
  --namespace nums3 \
  --values my-values.yaml

# Vérifier le déploiement
kubectl get pods -n nums3
```

## 🎯 Accès à l'Application

### Development (Port-forward)
```bash
kubectl port-forward svc/nums3-console-frontend 8080:80 -n nums3
# Ouvrez http://localhost:8080
```

### Production (Ingress)
```bash
# Configurez votre DNS pour pointer vers l'Ingress
# Puis accédez via votre domaine (ex: https://nums3.example.com)
```

## 📋 Caractéristiques du Chart

### ✨ Fonctionnalités Incluses

- ✅ **Déploiements séparés** : Frontend (React) et Proxy (Node.js)
- ✅ **Health Checks** : Liveness et Readiness probes
- ✅ **Autoscaling** : HPA basé sur CPU/RAM
- ✅ **Haute Disponibilité** : Pod Disruption Budget
- ✅ **Sécurité** : Network Policies, Security Contexts
- ✅ **ConfigMaps** : Configuration des endpoints Outscale
- ✅ **Secrets** : Gestion sécurisée des credentials (optionnel)
- ✅ **Ingress** : Exposition avec TLS/SSL
- ✅ **Multi-environnement** : values-dev.yaml et values-production.yaml

### 🔧 Configuration Avancée

#### Autoscaling
```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

#### Ressources
```yaml
frontend:
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

proxy:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
```

#### Network Policies
```yaml
networkPolicy:
  enabled: true
  ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            name: ingress-nginx
```

## 🛠️ Script de Déploiement Automatisé

Le script `deploy.sh` simplifie toutes les opérations :

```bash
# Rendre exécutable
chmod +x nums3-helm-chart/deploy.sh

# Build et déploiement complet
./nums3-helm-chart/deploy.sh dev deploy

# Commandes disponibles
./nums3-helm-chart/deploy.sh [ENVIRONMENT] [ACTION]

# Environnements: dev | staging | prod
# Actions: build | deploy | upgrade | rollback | status | logs | cleanup
```

### Exemples d'utilisation
```bash
# Développement
./deploy.sh dev build              # Construire l'image
./deploy.sh dev deploy             # Build + déploiement
./deploy.sh dev status             # Voir le status
./deploy.sh dev logs frontend      # Voir les logs du frontend
./deploy.sh dev logs proxy         # Voir les logs du proxy

# Production
./deploy.sh prod deploy            # Déploiement production
./deploy.sh prod rollback          # Rollback en cas de problème
```

## 📊 Monitoring et Debugging

### Voir les pods
```bash
kubectl get pods -n nums3 -l app.kubernetes.io/name=nums3-console
```

### Logs en temps réel
```bash
# Tous les logs
kubectl logs -f -l app.kubernetes.io/name=nums3-console -n nums3

# Frontend uniquement
kubectl logs -f -l app.kubernetes.io/component=frontend -n nums3

# Proxy uniquement
kubectl logs -f -l app.kubernetes.io/component=proxy -n nums3
```

### Débugger un pod
```bash
kubectl describe pod <pod-name> -n nums3
kubectl exec -it <pod-name> -n nums3 -- sh
```

### Status du déploiement
```bash
helm status nums3 -n nums3
helm get values nums3 -n nums3
helm history nums3 -n nums3
```

## 🔄 Opérations de Maintenance

### Mise à jour
```bash
# Modifier vos valeurs dans my-values.yaml
helm upgrade nums3 ./nums3-helm-chart -n nums3 -f my-values.yaml
```

### Rollback
```bash
# Rollback à la version précédente
helm rollback nums3 -n nums3

# Rollback à une version spécifique
helm rollback nums3 2 -n nums3
```

### Scale manuel
```bash
kubectl scale deployment nums3-console-frontend --replicas=5 -n nums3
kubectl scale deployment nums3-console-proxy --replicas=3 -n nums3
```

### Désinstallation
```bash
helm uninstall nums3 -n nums3
kubectl delete namespace nums3
```

## 🔐 Sécurité

### Credentials Outscale
Les credentials sont fournis par les utilisateurs via l'interface web. Pour un environnement de test, vous pouvez les configurer :

```yaml
outscale:
  credentials:
    enabled: true
    accessKey: "YOUR_ACCESS_KEY"
    secretKey: "YOUR_SECRET_KEY"
    region: "eu-west-2"
```

⚠️ **IMPORTANT** : Ne jamais committer les credentials en production !

### ImagePullSecrets (Registry privé)
```bash
kubectl create secret docker-registry registry-secret \
  --docker-server=your-registry.com \
  --docker-username=your-user \
  --docker-password=your-password \
  --namespace nums3
```

Puis dans values.yaml :
```yaml
imagePullSecrets:
  - name: registry-secret
```

## 🌐 Configurations Cloud

### AWS EKS
```yaml
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/nums3-role

ingress:
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
```

### Google GKE
```yaml
serviceAccount:
  annotations:
    iam.gke.io/gcp-service-account: nums3@project.iam.gserviceaccount.com

ingress:
  annotations:
    kubernetes.io/ingress.class: gce
```

### Azure AKS
```yaml
ingress:
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
```

## 🐛 Troubleshooting

### Problème: Pods en CrashLoopBackOff
```bash
kubectl logs <pod-name> -n nums3
kubectl describe pod <pod-name> -n nums3
```

### Problème: Image non trouvée
- Vérifiez que l'image existe dans votre registry
- Vérifiez les imagePullSecrets pour registry privé
- Vérifiez le nom complet de l'image

### Problème: Ingress ne fonctionne pas
```bash
kubectl get ingress -n nums3
kubectl describe ingress nums3-console -n nums3
```

### Problème: Connexion Outscale échoue
- Vérifiez les credentials fournis
- Vérifiez que les pods peuvent accéder aux endpoints Outscale
- Consultez les logs du proxy pour plus de détails

## 📚 Documentation Supplémentaire

- **README.md** : Documentation complète du chart
- **QUICKSTART.md** : Guide de démarrage rapide
- **values.yaml** : Toutes les options de configuration avec commentaires
- **values-dev.yaml** : Configuration optimisée pour développement
- **values-production.yaml** : Configuration optimisée pour production

## 🎓 Ressources

- [Documentation Helm](https://helm.sh/docs/)
- [Documentation Kubernetes](https://kubernetes.io/docs/)
- [Documentation Outscale](https://docs.outscale.com/)
- [Best Practices Kubernetes](https://kubernetes.io/docs/concepts/configuration/overview/)

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs avec `kubectl logs`
2. Vérifiez le status avec `helm status`
3. Consultez la documentation dans le README.md

---

## 🎉 Prochaines Étapes

1. ✅ Construisez votre image Docker
2. ✅ Personnalisez values.yaml selon vos besoins
3. ✅ Déployez avec Helm
4. ✅ Configurez l'Ingress pour l'exposition publique
5. ✅ Activez l'autoscaling en production
6. ✅ Configurez le monitoring (Prometheus, Grafana)
7. ✅ Mettez en place une CI/CD pour les déploiements automatiques

Votre application NumS3 Console est maintenant prête à être déployée dans Kubernetes ! 🚀
