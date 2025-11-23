#!/bin/bash

# Script d'installation du Helm Chart NumS3-Console

set -e

CHART_NAME="nums3-console"
RELEASE_NAME="nums3-console"
NAMESPACE="default"
VALUES_FILE="values.yaml"

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Affichage de l'aide
show_help() {
    cat << EOF
Usage: ./install.sh [OPTIONS]

Script d'installation pour NumS3-Console Helm Chart

Options:
    -n, --namespace NAMESPACE    Namespace Kubernetes (défaut: default)
    -r, --release RELEASE        Nom de la release Helm (défaut: nums3-console)
    -f, --values FILE            Fichier de valeurs (défaut: values.yaml)
    -e, --environment ENV        Environnement (dev/staging/production)
    -u, --upgrade                Mettre à jour une installation existante
    -d, --dry-run                Simuler l'installation sans l'exécuter
    -h, --help                   Afficher cette aide

Exemples:
    ./install.sh
    ./install.sh -n production -e production
    ./install.sh -u -f values-production.yaml
    ./install.sh -d -e production

EOF
}

# Paramètres par défaut
UPGRADE=false
DRY_RUN=false
ENVIRONMENT=""

# Parse des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -f|--values)
            VALUES_FILE="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            VALUES_FILE="values-${ENVIRONMENT}.yaml"
            shift 2
            ;;
        -u|--upgrade)
            UPGRADE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

log_header "Installation NumS3-Console"

# Vérification des prérequis
log_info "Vérification des prérequis..."

if ! command -v helm &> /dev/null; then
    log_error "Helm n'est pas installé. Veuillez installer Helm 3.0+"
    exit 1
fi
log_info "✓ Helm est installé ($(helm version --short))"

if ! command -v kubectl &> /dev/null; then
    log_error "kubectl n'est pas installé"
    exit 1
fi
log_info "✓ kubectl est installé"

# Vérification de la connexion au cluster
log_info "Vérification de la connexion au cluster Kubernetes..."
if ! kubectl cluster-info &> /dev/null; then
    log_error "Impossible de se connecter au cluster Kubernetes"
    exit 1
fi
log_info "✓ Connexion au cluster établie"

# Vérification du fichier de valeurs
if [ ! -f "$VALUES_FILE" ]; then
    log_error "Le fichier de valeurs '$VALUES_FILE' n'existe pas"
    exit 1
fi
log_info "✓ Fichier de valeurs trouvé: $VALUES_FILE"

echo ""
log_info "Configuration:"
log_info "  Application: NumS3-Console"
log_info "  Release: $RELEASE_NAME"
log_info "  Namespace: $NAMESPACE"
log_info "  Values file: $VALUES_FILE"
log_info "  Upgrade: $UPGRADE"
log_info "  Dry-run: $DRY_RUN"

# Validation du chart
echo ""
log_info "Validation du chart Helm..."
if ! helm lint . --values "$VALUES_FILE" &> /dev/null; then
    log_error "La validation du chart a échoué"
    helm lint . --values "$VALUES_FILE"
    exit 1
fi
log_info "✓ Le chart est valide"

# Dry-run si demandé
if [ "$DRY_RUN" = true ]; then
    log_warn "Mode dry-run activé - aucune modification ne sera effectuée"
    echo ""
    helm template "$RELEASE_NAME" . \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE"
    exit 0
fi

# Installation ou mise à jour
echo ""
if [ "$UPGRADE" = true ]; then
    log_info "Mise à jour de la release $RELEASE_NAME..."
    helm upgrade "$RELEASE_NAME" . \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout 5m
    
    log_info "✓ Release mise à jour avec succès!"
else
    log_info "Installation de la release $RELEASE_NAME..."
    
    # Créer le namespace s'il n'existe pas
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Création du namespace $NAMESPACE..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    helm install "$RELEASE_NAME" . \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout 5m
    
    log_info "✓ Release installée avec succès!"
fi

# Affichage du statut
echo ""
log_header "Statut du déploiement"
helm status "$RELEASE_NAME" --namespace "$NAMESPACE"

echo ""
log_info "Commandes utiles:"
echo "  - Voir les pods:"
echo "    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME"
echo ""
echo "  - Voir les logs:"
echo "    kubectl logs -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME -f"
echo ""
echo "  - Vérifier le service:"
echo "    kubectl get svc -n $NAMESPACE $RELEASE_NAME"
echo ""
echo "  - Mettre à jour:"
echo "    ./install.sh -u -n $NAMESPACE -f $VALUES_FILE"
echo ""

log_info "🎉 NumS3-Console est maintenant déployé!"
