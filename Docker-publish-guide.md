# 🐳 Guide de Publication Docker sur GitHub Container Registry (ghcr.io)

Ce guide explique comment utiliser le workflow GitHub Actions existant pour construire et publier automatiquement votre image Docker Outscale S3 Explorer sur ghcr.io.

## 📋 Table des Matières

- [Pré-requis](#pré-requis)
- [Configuration du Repository](#configuration-du-repository)
- [Comment Déclencher une Publication](#comment-déclencher-une-publication)
- [Tags Générés Automatiquement](#tags-générés-automatiquement)
- [Utilisation de l'Image Publiée](#utilisation-de-limage-publiée)
- [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requis

Aucune configuration spéciale n'est requise ! Le workflow utilise `GITHUB_TOKEN` qui est automatiquement disponible dans les GitHub Actions.

### Vérifications à Faire

1. **Le workflow existe** : `.github/workflows/docker-publish.yml` ✅
2. **Permissions du repository** : Les packages sont activés par défaut
3. **Dockerfile présent** : `Dockerfile` à la racine du projet ✅

---

## ⚙️ Configuration du Repository

### 1. Rendre l'Image Publique (Optionnel)

Par défaut, les images publiées sur ghcr.io sont **privées**. Pour les rendre publiques :

1. Allez sur `https://github.com/users/VOTRE_USERNAME/packages`
2. Cliquez sur votre package (nums3-console)
3. **Package Settings** → **Change visibility** → **Public**

### 2. Vérifier les Permissions (Déjà Configurées)

Le workflow dispose déjà des permissions nécessaires :

```yaml
permissions:
  contents: read      # Lire le code
  packages: write     # Écrire sur ghcr.io
  id-token: write     # Attestations de provenance
```

---

## 🚀 Comment Déclencher une Publication

Le workflow se déclenche automatiquement dans plusieurs cas :

### 1. Push sur `main` ou `develop`

```bash
git add .
git commit -m "feat: ajout de nouvelle fonctionnalité"
git push origin main
```

**Résultat** :
- Image publiée avec tag `main` ou `develop`
- Tag `latest` si push sur la branche par défaut (main)
- Tag `main-abc1234` (avec le SHA du commit)

### 2. Création d'un Tag de Version

```bash
# Créer un tag de version sémantique
git tag v1.0.0
git push origin v1.0.0
```

**Résultat** :
- Image publiée avec tags : `v1.0.0`, `1.0`, `1`, `latest`

### 3. Pull Request

```bash
git checkout -b feature/nouvelle-fonctionnalite
git push origin feature/nouvelle-fonctionnalite
# Créer une PR sur GitHub
```

**Résultat** :
- Image **construite** mais **non publiée** (test uniquement)
- Tag : `pr-123`

### 4. Déclenchement Manuel

1. Allez dans **Actions** sur GitHub
2. Sélectionnez **Build and Push Docker Image to GHCR**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche et cliquez **Run workflow**

---

## 🏷️ Tags Générés Automatiquement

Le workflow génère automatiquement plusieurs tags selon le contexte :

| Événement | Tags Générés | Exemple |
|-----------|--------------|---------|
| Push `main` | `main`, `main-abc1234`, `latest` | `ghcr.io/user/repo:main` |
| Push `develop` | `develop`, `develop-abc1234` | `ghcr.io/user/repo:develop` |
| Tag `v1.2.3` | `v1.2.3`, `1.2`, `1`, `latest` | `ghcr.io/user/repo:v1.2.3` |
| Pull Request #45 | `pr-45` | `ghcr.io/user/repo:pr-45` |

### Stratégie de Versioning

```yaml
tags: |
  type=ref,event=branch              # → main, develop
  type=ref,event=pr                  # → pr-123
  type=semver,pattern={{version}}    # → 1.2.3
  type=semver,pattern={{major}}.{{minor}} # → 1.2
  type=semver,pattern={{major}}      # → 1
  type=sha,prefix={{branch}}-        # → main-abc1234
  type=raw,value=latest,enable={{is_default_branch}} # → latest
```

---

## 📦 Utilisation de l'Image Publiée

### 1. Récupérer l'Image

**Image Publique** (si vous l'avez rendue publique) :

```bash
docker pull ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
```

**Image Privée** (authentification requise) :

```bash
# Créer un Personal Access Token (PAT) sur GitHub :
# Settings → Developer settings → Personal access tokens → Generate new token
# Permissions : read:packages

echo $GITHUB_TOKEN | docker login ghcr.io -u VOTRE_USERNAME --password-stdin
docker pull ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
```

### 2. Lancer le Container

```bash
docker run -d \
  --name nums3-console \
  -p 80:80 \
  -e VITE_PROXY_URL=/api \
  -e VITE_LOG_LEVEL=info \
  ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  nums3-console:
    image: ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
    container_name: nums3-console
    ports:
      - "80:80"
    environment:
      - VITE_PROXY_URL=/api
      - VITE_LOG_LEVEL=info
      - VITE_CACHE_ENABLED=true
    restart: unless-stopped
```

### 4. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nums3-console
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nums3-console
  template:
    metadata:
      labels:
        app: nums3-console
    spec:
      containers:
      - name: nums3-console
        image: ghcr.io/VOTRE_USERNAME/VOTRE_REPO:v1.0.0
        ports:
        - containerPort: 80
        env:
        - name: VITE_PROXY_URL
          value: "/api"
        - name: VITE_LOG_LEVEL
          value: "info"
      imagePullSecrets:
      - name: ghcr-secret
```

**Créer le secret pour l'authentification** :

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=VOTRE_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=votre@email.com
```

---

## 🔍 Suivre l'Exécution du Workflow

### Via l'Interface GitHub

1. Allez dans l'onglet **Actions** de votre repository
2. Cliquez sur le workflow **Build and Push Docker Image to GHCR**
3. Sélectionnez l'exécution que vous voulez suivre
4. Consultez les logs de chaque étape

### Via GitHub CLI

```bash
# Installer gh CLI : https://cli.github.com/

# Lister les exécutions récentes
gh run list --workflow=docker-publish.yml

# Voir les détails d'une exécution
gh run view 1234567890

# Voir les logs
gh run view 1234567890 --log
```

---

## 🐛 Troubleshooting

### Problème : Permission denied lors du push

**Erreur** :
```
Error: failed to push image: failed to push to ghcr.io: denied
```

**Solution** :
1. Vérifiez que le workflow a les bonnes permissions (déjà configuré ✅)
2. Vérifiez que l'Action peut écrire sur les packages :
   - **Settings** → **Actions** → **General**
   - **Workflow permissions** → **Read and write permissions** ✅

### Problème : Image non trouvée après publication

**Erreur** :
```
Error: manifest unknown: manifest unknown
```

**Solution** :
1. Attendez 1-2 minutes après la publication
2. Vérifiez que le workflow s'est terminé avec succès
3. Vérifiez l'URL : `ghcr.io/USERNAME/REPO:TAG` (tout en minuscules)

### Problème : Build échoue avec "No space left on device"

**Solution** :
Le cache GitHub Actions est limité. Le workflow utilise déjà le cache optimal :

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

Si le problème persiste, réduisez les plateformes :

```yaml
platforms: linux/amd64  # Au lieu de linux/amd64,linux/arm64
```

### Problème : Authentification Docker échouée en local

**Solution** :
```bash
# Créer un Personal Access Token (classic) avec scope read:packages
# https://github.com/settings/tokens

# Se connecter
echo $GITHUB_TOKEN | docker login ghcr.io -u VOTRE_USERNAME --password-stdin

# Vérifier
docker pull ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
```

---

## 🎯 Bonnes Pratiques

### 1. Versioning Sémantique

Utilisez des tags de version pour les releases :

```bash
# Version majeure (breaking changes)
git tag v2.0.0

# Version mineure (nouvelles fonctionnalités)
git tag v1.1.0

# Version patch (corrections de bugs)
git tag v1.0.1

git push origin --tags
```

### 2. Protection des Branches

Protégez la branche `main` pour éviter les publications accidentelles :

1. **Settings** → **Branches** → **Add rule**
2. Branch name pattern : `main`
3. ✅ Require pull request reviews
4. ✅ Require status checks to pass (build)

### 3. Nettoyage des Anciennes Images

GitHub conserve toutes les versions. Pour nettoyer :

1. Allez sur votre package sur GitHub
2. **Package settings** → **Manage versions**
3. Supprimez les anciennes versions inutiles

Ou automatiquement avec GitHub CLI :

```bash
# Supprimer les versions de plus de 30 jours
gh api -X DELETE /user/packages/container/VOTRE_REPO/versions/VERSION_ID
```

---

## 📊 Monitoring

### Voir les Images Publiées

```bash
# Via l'API GitHub
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/users/VOTRE_USERNAME/packages/container/VOTRE_REPO/versions

# Via GitHub CLI
gh api /user/packages/container/VOTRE_REPO/versions
```

### Statistiques de Téléchargement

1. Allez sur `https://github.com/users/VOTRE_USERNAME/packages`
2. Cliquez sur votre package
3. Consultez les statistiques de téléchargement

---

## 🔐 Sécurité

### Attestations de Provenance

Le workflow génère automatiquement des attestations de provenance :

```yaml
- name: Generate artifact attestation
  uses: actions/attest-build-provenance@v1
```

Cela permet de :
- Vérifier l'origine de l'image
- Garantir qu'elle n'a pas été modifiée
- Tracer le commit source

### Scan de Vulnérabilités

Ajoutez un scan de sécurité (optionnel) :

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## 📚 Ressources

- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Docker Documentation](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
- [Docker Build Push Action](https://github.com/docker/build-push-action)

---

## 🎉 Récapitulatif

Votre workflow est **prêt à l'emploi** ! Pour publier une nouvelle version :

```bash
# 1. Développer et tester localement
npm run dev

# 2. Commiter et pousser
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 3. (Optionnel) Créer un tag de version
git tag v1.0.0
git push origin v1.0.0

# 4. ✨ L'image est automatiquement construite et publiée !
# Disponible sur : ghcr.io/VOTRE_USERNAME/VOTRE_REPO:latest
```

**C'est tout !** 🚀 Votre image Docker est maintenant disponible sur ghcr.io.