# 🚀 Guide de Démarrage Rapide - NumS3-Console

## Installation en 3 étapes

### 1. Extraire l'archive

```bash
tar -xzf nums3-console-chart.tar.gz
cd nums3-console-chart
```

### 2. Personnaliser la configuration

Éditez `values.yaml` et modifiez au minimum :

```yaml
image:
  repository: votre-registry/nums3-console  # Votre image Docker
  tag: "v1.0.0"                             # Version de votre image

env:
  - name: S3_ENDPOINT
    value: "https://s3.amazonaws.com"       # Votre endpoint S3
  - name: S3_REGION
    value: "us-east-1"                      # Votre région
```

### 3. Installer

```bash
# Installation simple
helm install nums3-console .

# OU avec le script
./install.sh
```

## Accéder à l'application

```bash
# Port-forward pour tester localement
kubectl port-forward svc/nums3-console 8080:80

# Puis ouvrez http://localhost:8080
```

## Configurations courantes

### Avec Ingress (domaine public)

```yaml
ingress:
  enabled: true
  hosts:
    - host: nums3.votredomaine.com
      paths:
        - path: /
          pathType: Prefix
```

### Avec LoadBalancer

```yaml
service:
  type: LoadBalancer
  port: 80
```

### Avec Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Avec Secrets S3

```bash
# Créer le secret
kubectl create secret generic nums3-console-secrets \
  --from-literal=S3_ACCESS_KEY=your-key \
  --from-literal=S3_SECRET_KEY=your-secret

# Dans values.yaml
envFrom:
  - secretRef:
      name: nums3-console-secrets
```

## Commandes utiles

```bash
# Voir les pods
kubectl get pods -l app.kubernetes.io/name=nums3-console

# Voir les logs
kubectl logs -f deployment/nums3-console

# Mettre à jour
helm upgrade nums3-console . -f values.yaml

# Désinstaller
helm uninstall nums3-console
```

## Production

Pour la production, utilisez `values-production.yaml` :

```bash
helm install nums3-console . -f values-production.yaml --namespace production --create-namespace
```

## Besoin d'aide ?

Consultez le README.md complet pour plus de détails !
