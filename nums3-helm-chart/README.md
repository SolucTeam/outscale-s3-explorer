# NumS3 Console - Helm Chart

Helm chart pour déployer NumS3 Console (interface S3 Outscale) dans Kubernetes.

## 📋 Prérequis

- Kubernetes 1.19+
- Helm 3.0+
- Image Docker de l'application
- (Optionnel) Ingress Controller (nginx, traefik)
- (Optionnel) Cert-Manager pour les certificats TLS

## 🚀 Installation rapide

### 1. Construire l'image Docker

```bash
# À la racine de votre projet
docker build -t your-registry/nums3-console:1.0.0 -f nums3-helm-chart/Dockerfile .

# Pousser l'image vers votre registry
docker push your-registry/nums3-console:1.0.0
```

### 2. Installer le chart

```bash
# Installation basique
helm install nums3 ./nums3-helm-chart

# Installation avec namespace
helm install nums3 ./nums3-helm-chart --namespace nums3 --create-namespace

# Installation avec valeurs personnalisées
helm install nums3 ./nums3-helm-chart -f custom-values.yaml
```

### 3. Vérifier le déploiement

```bash
# Vérifier les pods
kubectl get pods -n nums3

# Vérifier les services
kubectl get svc -n nums3

# Voir les logs
kubectl logs -f -l app.kubernetes.io/name=nums3-console -n nums3
```

## ⚙️ Configuration

### Valeurs principales à personnaliser

Créez un fichier `custom-values.yaml` :

```yaml
# Votre image Docker
image:
  repository: your-registry/nums3-console
  tag: "1.0.0"

# Nombre de réplicas
replicaCount: 2

# Configuration Ingress
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: nums3.example.com
      paths:
        - path: /
          pathType: Prefix
          backend: frontend
        - path: /api
          pathType: Prefix
          backend: proxy
  tls:
    - secretName: nums3-tls
      hosts:
        - nums3.example.com

# Ressources
frontend:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

proxy:
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Variables d'environnement

**Frontend** :
- `VITE_API_URL` : URL du proxy API
- `NODE_ENV` : Environnement (production/development)

**Proxy** :
- `PORT` : Port du serveur (3001)
- `NODE_ENV` : Environnement
- `CORS_ORIGIN` : Origins autorisées pour CORS

## 📦 Commandes utiles

### Mettre à jour le déploiement

```bash
# Mise à jour avec nouvelles valeurs
helm upgrade nums3 ./nums3-helm-chart -f custom-values.yaml

# Rollback en cas de problème
helm rollback nums3
```

### Désinstaller

```bash
helm uninstall nums3 --namespace nums3
```

### Debugger

```bash
# Voir les templates générés
helm template nums3 ./nums3-helm-chart

# Dry-run pour vérifier
helm install nums3 ./nums3-helm-chart --dry-run --debug

# Tester les valeurs
helm lint ./nums3-helm-chart
```

## 🔐 Sécurité

### Credentials Outscale

Les credentials Outscale sont fournis par les utilisateurs via l'interface web. Pour un environnement de test, vous pouvez activer les credentials par défaut :

```yaml
outscale:
  credentials:
    enabled: true
    accessKey: "YOUR_ACCESS_KEY"
    secretKey: "YOUR_SECRET_KEY"
    region: "eu-west-2"
```

⚠️ **Attention** : Ne jamais committer les credentials en production !

### Network Policies

Pour isoler le trafic réseau :

```yaml
networkPolicy:
  enabled: true
  ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            name: ingress-nginx
  egress:
    - to:
      - namespaceSelector: {}
      ports:
      - protocol: TCP
        port: 443
```

## 🌐 Exposer l'application

### Option 1: Port-forward (Dev)

```bash
kubectl port-forward svc/nums3-console-frontend 8080:80 -n nums3
# Accéder à http://localhost:8080
```

### Option 2: NodePort

```yaml
service:
  type: NodePort
  frontend:
    port: 80
    nodePort: 30080
```

### Option 3: LoadBalancer (Cloud)

```yaml
service:
  type: LoadBalancer
```

### Option 4: Ingress (Recommandé)

Voir la configuration Ingress dans les valeurs ci-dessus.

## 📊 Monitoring

### Prometheus

Les métriques sont exposées automatiquement. Ajoutez des annotations pour Prometheus :

```yaml
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3001"
  prometheus.io/path: "/metrics"
```

### Logs

```bash
# Logs du frontend
kubectl logs -f -l app.kubernetes.io/component=frontend -n nums3

# Logs du proxy
kubectl logs -f -l app.kubernetes.io/component=proxy -n nums3

# Tous les logs
kubectl logs -f -l app.kubernetes.io/name=nums3-console -n nums3
```

## 🔄 CI/CD

### Exemple avec GitLab CI

```yaml
deploy:
  stage: deploy
  image: alpine/helm:latest
  script:
    - helm upgrade --install nums3 ./nums3-helm-chart 
        --namespace nums3 
        --create-namespace
        --set image.tag=$CI_COMMIT_SHA
        --wait
```

### Exemple avec GitHub Actions

```yaml
- name: Deploy to Kubernetes
  run: |
    helm upgrade --install nums3 ./nums3-helm-chart \
      --namespace nums3 \
      --create-namespace \
      --set image.tag=${{ github.sha }} \
      --wait
```

## 🆘 Dépannage

### Les pods ne démarrent pas

```bash
# Vérifier les events
kubectl describe pod <pod-name> -n nums3

# Vérifier les logs
kubectl logs <pod-name> -n nums3
```

### Problèmes de réseau

```bash
# Tester la connectivité entre services
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
wget -O- http://nums3-console-proxy:3001/health
```

### Image non trouvée

Vérifiez que :
1. L'image est bien poussée dans votre registry
2. Les `imagePullSecrets` sont configurés si registry privé
3. Le nom de l'image est correct dans values.yaml

## 📚 Documentation

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Outscale Documentation](https://docs.outscale.com/)

## 🤝 Support

Pour toute question ou problème, ouvrez une issue sur le projet.

## 📄 Licence

Copyright © 2024 NumS3 Team
