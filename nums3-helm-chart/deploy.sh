#!/bin/bash

# Script de déploiement automatisé pour NumS3 Console
# Usage: ./deploy.sh [dev|staging|prod] [build|deploy|upgrade]

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHART_NAME="nums3-console"
CHART_PATH="./nums3-helm-chart"
REGISTRY="${DOCKER_REGISTRY:-your-registry}"
IMAGE_NAME="${REGISTRY}/${CHART_NAME}"

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    command -v docker >/dev/null 2>&1 || log_error "Docker n'est pas installé"
    command -v helm >/dev/null 2>&1 || log_error "Helm n'est pas installé"
    command -v kubectl >/dev/null 2>&1 || log_error "kubectl n'est pas installé"
    
    log_success "Prérequis OK"
}

# Construire l'image Docker
build_image() {
    local env=$1
    local tag="${env}-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Construction de l'image Docker: ${IMAGE_NAME}:${tag}"
    
    docker build \
        -t "${IMAGE_NAME}:${tag}" \
        -t "${IMAGE_NAME}:${env}" \
        -f ${CHART_PATH}/Dockerfile \
        .
    
    log_success "Image construite: ${IMAGE_NAME}:${tag}"
    
    log_info "Push de l'image vers le registry..."
    docker push "${IMAGE_NAME}:${tag}"
    docker push "${IMAGE_NAME}:${env}"
    
    log_success "Image poussée vers le registry"
    
    echo "${tag}"
}

# Déployer avec Helm
deploy_helm() {
    local env=$1
    local namespace="nums3-${env}"
    local values_file="${CHART_PATH}/values-${env}.yaml"
    local release_name="nums3-${env}"
    
    log_info "Déploiement de ${release_name} dans le namespace ${namespace}"
    
    # Vérifier que le fichier values existe
    if [ ! -f "${values_file}" ]; then
        log_error "Fichier de valeurs non trouvé: ${values_file}"
    fi
    
    # Lint du chart
    log_info "Validation du chart..."
    helm lint ${CHART_PATH}
    
    # Créer le namespace s'il n'existe pas
    kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -
    
    # Installer ou upgrader
    log_info "Installation/Upgrade du release..."
    helm upgrade --install ${release_name} ${CHART_PATH} \
        --namespace ${namespace} \
        --values ${values_file} \
        --set image.repository=${REGISTRY}/${CHART_NAME} \
        --set image.tag=${env} \
        --wait \
        --timeout 10m
    
    log_success "Déploiement réussi!"
    
    # Afficher le status
    log_info "Status du release:"
    helm status ${release_name} -n ${namespace}
    
    # Afficher les pods
    log_info "Pods déployés:"
    kubectl get pods -n ${namespace} -l app.kubernetes.io/name=${CHART_NAME}
}

# Rollback
rollback() {
    local env=$1
    local namespace="nums3-${env}"
    local release_name="nums3-${env}"
    local revision=${2:-0}
    
    log_warning "Rollback du release ${release_name} dans ${namespace}..."
    
    if [ ${revision} -eq 0 ]; then
        # Rollback à la version précédente
        helm rollback ${release_name} -n ${namespace}
    else
        # Rollback à une revision spécifique
        helm rollback ${release_name} ${revision} -n ${namespace}
    fi
    
    log_success "Rollback effectué"
}

# Status
show_status() {
    local env=$1
    local namespace="nums3-${env}"
    local release_name="nums3-${env}"
    
    log_info "Status du déploiement ${env}:"
    
    helm status ${release_name} -n ${namespace}
    
    log_info "\nPods:"
    kubectl get pods -n ${namespace} -l app.kubernetes.io/name=${CHART_NAME}
    
    log_info "\nServices:"
    kubectl get svc -n ${namespace} -l app.kubernetes.io/name=${CHART_NAME}
    
    log_info "\nIngress:"
    kubectl get ingress -n ${namespace}
}

# Logs
show_logs() {
    local env=$1
    local component=${2:-all}
    local namespace="nums3-${env}"
    
    log_info "Logs du composant ${component} (${env}):"
    
    if [ "${component}" = "all" ]; then
        kubectl logs -f -l app.kubernetes.io/name=${CHART_NAME} -n ${namespace} --all-containers=true
    else
        kubectl logs -f -l app.kubernetes.io/name=${CHART_NAME},app.kubernetes.io/component=${component} -n ${namespace}
    fi
}

# Cleanup
cleanup() {
    local env=$1
    local namespace="nums3-${env}"
    local release_name="nums3-${env}"
    
    log_warning "Suppression du déploiement ${release_name}..."
    
    helm uninstall ${release_name} -n ${namespace}
    
    log_info "Voulez-vous aussi supprimer le namespace? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        kubectl delete namespace ${namespace}
        log_success "Namespace supprimé"
    fi
    
    log_success "Cleanup terminé"
}

# Menu principal
show_usage() {
    cat << EOF
Usage: $0 [ENVIRONMENT] [ACTION]

ENVIRONMENTS:
    dev         Environnement de développement
    staging     Environnement de staging
    prod        Environnement de production

ACTIONS:
    build       Construire l'image Docker
    deploy      Déployer l'application
    upgrade     Mettre à jour le déploiement
    rollback    Rollback à la version précédente
    status      Afficher le status du déploiement
    logs        Afficher les logs
    cleanup     Supprimer le déploiement

EXAMPLES:
    $0 dev build
    $0 prod deploy
    $0 staging upgrade
    $0 prod rollback
    $0 dev status
    $0 prod logs frontend
    $0 dev cleanup

EOF
}

# Parse des arguments
ENV=${1:-}
ACTION=${2:-}

if [ -z "$ENV" ] || [ -z "$ACTION" ]; then
    show_usage
    exit 1
fi

# Validation de l'environnement
case $ENV in
    dev|staging|prod)
        ;;
    *)
        log_error "Environnement invalide: $ENV"
        show_usage
        exit 1
        ;;
esac

# Vérification des prérequis
check_prerequisites

# Exécution de l'action
case $ACTION in
    build)
        TAG=$(build_image $ENV)
        log_success "Build terminé! Tag: ${TAG}"
        ;;
    deploy)
        TAG=$(build_image $ENV)
        deploy_helm $ENV
        ;;
    upgrade)
        deploy_helm $ENV
        ;;
    rollback)
        rollback $ENV ${3:-0}
        ;;
    status)
        show_status $ENV
        ;;
    logs)
        show_logs $ENV ${3:-all}
        ;;
    cleanup)
        cleanup $ENV
        ;;
    *)
        log_error "Action invalide: $ACTION"
        show_usage
        exit 1
        ;;
esac

log_success "Opération ${ACTION} terminée avec succès!"
