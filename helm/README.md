# NumS3-Console Helm Chart

Ce chart Helm déploie l'application NumS3-Console sur un cluster Kubernetes.

## Description

NumS3-Console est une console de gestion pour le stockage S3. Ce chart permet un déploiement facile et personnalisable sur Kubernetes.

## Prérequis

- Kubernetes 1.19+
- Helm 3.0+
- kubectl configuré

## Installation

### Installation standard

```bash
helm install nums3-console ./nums3-console-chart
```

### Installation avec un namespace spécifique

```bash
helm install nums3-console ./nums3-console-chart --namespace nums3 --create-namespace
```

### Installation avec des valeurs personnalisées

```bash
helm install nums3-console ./nums3-console-chart --values custom-values.yaml
```

### Utilisation du script d'installation

```bash
cd nums3-console-chart
./install.sh -n production -e production
```

## Configuration

Les paramètres suivants peuvent être configurés dans `values.yaml` :

### Image

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `image.repository` | Repository de l'image Docker | `nums3-console` |
| `image.tag` | Tag de l'image | `latest` |
| `image.pullPolicy` | Politique de pull de l'image | `IfNotPresent` |

### Déploiement

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `replicaCount` | Nombre de réplicas | `2` |
| `autoscaling.enabled` | Activer l'autoscaling | `false` |
| `autoscaling.minReplicas` | Nombre minimum de réplicas | `2` |
| `autoscaling.maxReplicas` | Nombre maximum de réplicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Seuil CPU pour scaling | `80` |

### Service

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `service.type` | Type de service | `ClusterIP` |
| `service.port` | Port du service | `80` |
| `service.targetPort` | Port du conteneur | `8080` |

### Ingress

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `ingress.enabled` | Activer l'Ingress | `false` |
| `ingress.className` | Classe de l'Ingress | `nginx` |
| `ingress.hosts` | Liste des hosts | `[nums3-console.example.com]` |
| `ingress.tls` | Configuration TLS | `[]` |

### Ressources

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `resources.limits.cpu` | Limite CPU | `500m` |
| `resources.limits.memory` | Limite mémoire | `512Mi` |
| `resources.requests.cpu` | Requête CPU | `250m` |
| `resources.requests.memory` | Requête mémoire | `256Mi` |

### Persistence

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `persistence.enabled` | Activer la persistence | `false` |
| `persistence.size` | Taille du volume | `10Gi` |
| `persistence.storageClass` | Classe de stockage | `""` |
| `persistence.mountPath` | Chemin de montage | `/data` |

## Exemples d'utilisation

### Configuration S3

Ajoutez les variables d'environnement S3 dans `values.yaml` :

```yaml
env:
  - name: S3_ENDPOINT
    value: "https://s3.amazonaws.com"
  - name: S3_REGION
    value: "us-east-1"
  - name: S3_BUCKET
    value: "my-bucket"
```

### Activer l'Ingress avec TLS

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: nums3-console.mycompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: nums3-console-tls
      hosts:
        - nums3-console.mycompany.com
```

### Activer l'autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### Utiliser des secrets pour les credentials S3

```yaml
envFrom:
  - secretRef:
      name: nums3-console-secrets
```

Créez le secret :

```bash
kubectl create secret generic nums3-console-secrets \
  --from-literal=S3_ACCESS_KEY=your-access-key \
  --from-literal=S3_SECRET_KEY=your-secret-key \
  --namespace nums3
```

### Configuration pour la production

Créez un fichier `values-production.yaml` :

```yaml
replicaCount: 3

image:
  repository: myregistry.azurecr.io/nums3-console
  tag: "v1.0.0"
  pullPolicy: Always

service:
  type: LoadBalancer

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: nums3-console.production.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: nums3-console-tls
      hosts:
        - nums3-console.production.com

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

persistence:
  enabled: true
  storageClass: "premium-ssd"
  size: 50Gi
```

Puis installez :

```bash
helm install nums3-console ./nums3-console-chart -f values-production.yaml
```

## Commandes utiles

### Vérifier le statut

```bash
helm status nums3-console
kubectl get pods -l app.kubernetes.io/name=nums3-console
```

### Voir les logs

```bash
kubectl logs -f deployment/nums3-console
```

### Mettre à jour le déploiement

```bash
helm upgrade nums3-console ./nums3-console-chart --values values.yaml
```

### Rollback

```bash
helm rollback nums3-console
```

### Désinstaller

```bash
helm uninstall nums3-console
```

### Valider le chart

```bash
helm lint ./nums3-console-chart
```

### Générer les manifests

```bash
helm template nums3-console ./nums3-console-chart --values values.yaml
```

## Dépannage

### Les pods ne démarrent pas

Vérifiez les événements :

```bash
kubectl describe pod <pod-name>
kubectl get events --sort-by='.lastTimestamp'
```

### Problèmes de connexion S3

Vérifiez les variables d'environnement :

```bash
kubectl exec -it <pod-name> -- env | grep S3
```

### Vérifier la configuration

```bash
kubectl get configmap nums3-console -o yaml
```

## Support

Pour toute question ou problème, veuillez contacter l'équipe de support.

## License

[Votre License]
