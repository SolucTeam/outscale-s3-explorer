# Changelog

Toutes les modifications notables de ce chart Helm seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### À venir
- Support des métriques Prometheus
- Dashboards Grafana
- Support des secrets externes (External Secrets Operator)

---

## [0.1.0] - 2025-01-24

### 🎉 Première version publique

#### Ajouté
- **Interface web complète** : Déploiement d'une interface React/TypeScript moderne
- **Authentification Outscale** : Support natif de l'authentification S3 compatible Outscale
- **Gestion des buckets** : 
  - Création et suppression de buckets
  - Navigation dans les dossiers
  - Visualisation de la structure
- **Gestion des objets** :
  - Upload de fichiers avec barre de progression
  - Téléchargement d'objets
  - Suppression d'objets
  - Cache intelligent
- **Multi-régions Outscale** :
  - eu-west-2
  - cloudgouv-eu-west-1
  - us-east-2
  - us-west-1
- **Haute disponibilité** :
  - Déploiement avec 3 replicas par défaut
  - Health checks (liveness/readiness probes)
  - Support du HorizontalPodAutoscaler (3-20 pods)
  - Anti-affinity pour distribution sur les nœuds
- **Ingress** : Configuration complète avec support TLS
- **Service** : LoadBalancer ou ClusterIP au choix
- **Security** :
  - SecurityContext configuré (non-root user)
  - NetworkPolicy (optionnel)
  - PodDisruptionBudget pour la stabilité
- **Monitoring** :
  - Annotations Prometheus prêtes
  - Ressources CPU/Mémoire configurables
- **Documentation** :
  - README complet avec exemples
  - Script d'installation automatisé
  - Exemples de configurations (dev, staging, production)

#### Caractéristiques techniques
- **Image** : Architecture tout-en-un (frontend + proxy Node.js)
- **Stack** : React + Vite + TypeScript + Tailwind CSS + Express
- **Compatibilité** : Kubernetes 1.19+ | Helm 3.0+
- **Storage** : Stateless (localStorage côté navigateur)

#### Configuration
- Variables d'environnement minimales
- Values.yaml bien documenté
- Support des surcharges pour dev/staging/prod
- Flexibilité totale de la configuration Ingress

---

## Guide de mise à jour

### De 0.1.0 vers versions futures

```bash
# 1. Mettre à jour le repository Helm
helm repo update solucteam

# 2. Vérifier les changements
helm diff upgrade outscale-s3-explorer solucteam/outscale-s3-explorer

# 3. Mettre à jour
helm upgrade outscale-s3-explorer solucteam/outscale-s3-explorer \
  -n nums3 \
  -f values.yaml

# 4. Vérifier le rollout
kubectl rollout status deployment/outscale-s3-explorer -n nums3
```

---

## Convention de versioning

- **Version du chart** (version) : Suit SemVer (ex: 0.1.0)
  - MAJOR : Changements incompatibles
  - MINOR : Nouvelles fonctionnalités compatibles
  - PATCH : Corrections de bugs
  
- **Version de l'application** (appVersion) : Version de l'image Docker

---

## Support

Pour signaler un bug ou demander une fonctionnalité :
- 🐛 [GitHub Issues](https://github.com/SolucTeam/outscale-s3-explorer/issues)
- 📧 Email : contact@solucteam.com