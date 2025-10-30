# 🚀 Guide de Démarrage Rapide - NumS3 Console sur Kubernetes

## Prérequis
- Docker installé
- Kubernetes cluster accessible (minikube, kind, EKS, GKE, AKS, etc.)
- kubectl configuré
- Helm 3.x installé

## Étape 1: Construire l'image Docker

```bash
# Remplacez YOUR_REGISTRY par votre registry Docker
export DOCKER_REGISTRY="your-registry"

# Construire l'image
docker build -t ${DOCKER_REGISTRY}/nums3-console:1.0.0 -f nums3-helm-chart/Dockerfile .

# Pousser l'image
docker push ${DOCKER_REGISTRY}/nums3-console:1.0.0
```

## Étape 2: Personnaliser les valeurs

Créez un fichier `my-values.yaml` :

```yaml
image:
  repository: YOUR_REGISTRY/nums3-console
  tag: "1.0.0"

replicaCount: 2

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

## Étape 3: Déployer avec Helm

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

## Étape 4: Accéder à l'application

### Option A: Port-forward (Pour test local)

```bash
kubectl port-forward svc/nums3-console-frontend 8080:80 -n nums3
```

Accédez à: http://localhost:8080

### Option B: Via Ingress (Production)

Configurez votre DNS pour pointer vers votre Ingress Controller, puis accédez à votre domaine.

## Étape 5: Tester l'application

1. Ouvrez l'interface web
2. Entrez vos credentials Outscale:
   - Access Key
   - Secret Key
   - Région (ex: eu-west-2)
3. Commencez à gérer vos buckets S3!

## Commandes utiles

```bash
# Voir les logs
kubectl logs -f -l app.kubernetes.io/name=nums3-console -n nums3

# Mettre à jour
helm upgrade nums3 ./nums3-helm-chart -n nums3 --values my-values.yaml

# Rollback
helm rollback nums3 -n nums3

# Désinstaller
helm uninstall nums3 -n nums3
```

## Déploiement avec le script automatisé

```bash
# Rendre le script exécutable
chmod +x nums3-helm-chart/deploy.sh

# Build et déploiement en dev
./nums3-helm-chart/deploy.sh dev deploy

# Voir le status
./nums3-helm-chart/deploy.sh dev status

# Voir les logs
./nums3-helm-chart/deploy.sh dev logs
```

## Troubleshooting

### Les pods ne démarrent pas
```bash
kubectl describe pod <pod-name> -n nums3
kubectl logs <pod-name> -n nums3
```

### Image non trouvée
- Vérifiez que l'image est bien dans votre registry
- Vérifiez le nom du repository dans values.yaml
- Ajoutez imagePullSecrets si registry privé

### Erreur de connexion Outscale
- Vérifiez vos credentials
- Vérifiez que les pods peuvent accéder aux endpoints Outscale
- Consultez les logs du proxy: `kubectl logs -l app.kubernetes.io/component=proxy -n nums3`

## Support

Pour plus d'informations, consultez le README.md complet dans le chart.
