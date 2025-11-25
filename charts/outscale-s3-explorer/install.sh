#!/bin/bash

# ============================================
# Script d'installation du Helm Chart NumS3-Console
# ============================================

set -e  # Arrêter en cas d'erreur
set -u  # Erreur si variable non définie

CHART_NAME="outscale-s3-explorer"
RELEASE_NAME="outscale-s3-explorer"
NAMESPACE="default"
VALUES_FILE="values.yaml"
CHART_PATH="./helm"  # ✅ AJOUT: Chemin vers le chart

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

log_step() {
    echo -e "${CYAN}➜${NC} $1"
}

# Affichage de l'aide
show_help() {
    cat << EOF
${BLUE}╔════════════════════════════════════════════════════════════╗
║  NumS3-Console Helm Chart - Script d'installation         ║
╚════════════════════════════════════════════════════════════╝${NC}

${GREEN}Usage:${NC}
    ./install.sh [OPTIONS]

${GREEN}Options:${NC}
    ${YELLOW}-n, --namespace NAMESPACE${NC}    Namespace Kubernetes (défaut: default)
    ${YELLOW}-r, --release RELEASE${NC}        Nom de la release Helm (défaut: outscale-s3-explorer)
    ${YELLOW}-f, --values FILE${NC}            Fichier de valeurs (défaut: values.yaml)
    ${YELLOW}-e, --environment ENV${NC}        Environnement (dev/staging/production)
    ${YELLOW}-c, --chart-path PATH${NC}        Chemin vers le chart (défaut: ./helm)
    ${YELLOW}-u, --upgrade${NC}                Mettre à jour une installation existante
    ${YELLOW}-d, --dry-run${NC}                Simuler l'installation sans l'exécuter
    ${YELLOW}--debug${NC}                      Activer le mode debug Helm
    ${YELLOW}--create-namespace${NC}           Créer le namespace automatiquement
    ${YELLOW}-h, --help${NC}                   Afficher cette aide

${GREEN}Exemples:${NC}
    ${CYAN}# Installation simple${NC}
    ./install.sh

    ${CYAN}# Installation en production${NC}
    ./install.sh -n production -e production --create-namespace

    ${CYAN}# Mise à jour existante${NC}
    ./install.sh -u -f values-production.yaml

    ${CYAN}# Dry-run pour tester${NC}
    ./install.sh -d -e production --debug

    ${CYAN}# Installation custom${NC}
    ./install.sh -n my-namespace -r my-release -c ./custom-chart

EOF
}

# Paramètres par défaut
UPGRADE=false
DRY_RUN=false
DEBUG=false
CREATE_NAMESPACE=false
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
        -c|--chart-path)
            CHART_PATH="$2"
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
        --debug)
            DEBUG=true
            shift
            ;;
        --create-namespace)
            CREATE_NAMESPACE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# ============================================
# Début de l'installation
# ============================================

log_header "🚀 Installation NumS3-Console"

# Vérification des prérequis
log_step "Vérification des prérequis..."

if ! command -v helm &> /dev/null; then
    log_error "Helm n'est pas installé. Veuillez installer Helm 3.0+"
    echo "  Installation: https://helm.sh/docs/intro/install/"
    exit 1
fi
HELM_VERSION=$(helm version --short | cut -d: -f2 | tr -d ' ')
log_info "Helm installé: $HELM_VERSION"

if ! command -v kubectl &> /dev/null; then
    log_error "kubectl n'est pas installé"
    echo "  Installation: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi
KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null | cut -d: -f2 | tr -d ' ')
log_info "kubectl installé: $KUBECTL_VERSION"

# Vérification de la connexion au cluster
log_step "Vérification de la connexion au cluster Kubernetes..."
if ! kubectl cluster-info &> /dev/null; then
    log_error "Impossible de se connecter au cluster Kubernetes"
    echo "  Vérifiez votre fichier kubeconfig (~/.kube/config)"
    exit 1
fi
CLUSTER_INFO=$(kubectl config current-context)
log_info "Connexion établie au cluster: $CLUSTER_INFO"

# Vérification du chart
if [ ! -d "$CHART_PATH" ]; then
    log_error "Le répertoire du chart '$CHART_PATH' n'existe pas"
    exit 1
fi
log_info "Chart trouvé: $CHART_PATH"

# Vérification du fichier Chart.yaml
if [ ! -f "$CHART_PATH/Chart.yaml" ]; then
    log_error "Fichier Chart.yaml manquant dans $CHART_PATH"
    exit 1
fi

# Vérification du fichier de valeurs
if [ ! -f "$VALUES_FILE" ]; then
    log_error "Le fichier de valeurs '$VALUES_FILE' n'existe pas"
    exit 1
fi
log_info "Fichier de valeurs: $VALUES_FILE"

# ============================================
# Affichage de la configuration
# ============================================

echo ""
log_header "📋 Configuration"
cat << EOF
  ${CYAN}Application:${NC}       NumS3-Console
  ${CYAN}Release:${NC}           $RELEASE_NAME
  ${CYAN}Namespace:${NC}         $NAMESPACE
  ${CYAN}Chart Path:${NC}        $CHART_PATH
  ${CYAN}Values File:${NC}       $VALUES_FILE
  ${CYAN}Environment:${NC}       ${ENVIRONMENT:-default}
  ${CYAN}Upgrade:${NC}           $UPGRADE
  ${CYAN}Dry-run:${NC}           $DRY_RUN
  ${CYAN}Debug:${NC}             $DEBUG
  ${CYAN}Create Namespace:${NC}  $CREATE_NAMESPACE
EOF

# ============================================
# Validation du chart
# ============================================

echo ""
log_step "Validation du chart Helm..."
LINT_OUTPUT=$(helm lint "$CHART_PATH" --values "$VALUES_FILE" 2>&1)
if [ $? -ne 0 ]; then
    log_error "La validation du chart a échoué"
    echo "$LINT_OUTPUT"
    exit 1
fi
log_info "Chart valide"

# ============================================
# Dry-run si demandé
# ============================================

if [ "$DRY_RUN" = true ]; then
    log_header "🧪 Mode Dry-Run (aucune modification)"
    
    HELM_CMD="helm template $RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --values $VALUES_FILE"
    
    if [ "$DEBUG" = true ]; then
        HELM_CMD="$HELM_CMD --debug"
    fi
    
    eval "$HELM_CMD"
    
    echo ""
    log_info "Dry-run terminé. Aucune modification effectuée."
    exit 0
fi

# ============================================
# Gestion du namespace
# ============================================

echo ""
log_step "Vérification du namespace..."
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    if [ "$CREATE_NAMESPACE" = true ] || [ "$UPGRADE" = false ]; then
        log_info "Création du namespace '$NAMESPACE'..."
        kubectl create namespace "$NAMESPACE"
        log_info "Namespace créé"
    else
        log_error "Le namespace '$NAMESPACE' n'existe pas"
        echo "  Utilisez --create-namespace pour le créer automatiquement"
        exit 1
    fi
else
    log_info "Namespace '$NAMESPACE' existe"
fi

# ============================================
# Installation ou mise à jour
# ============================================

echo ""
HELM_CMD_BASE="helm"
if [ "$UPGRADE" = true ]; then
    HELM_CMD="$HELM_CMD_BASE upgrade $RELEASE_NAME $CHART_PATH"
    log_header "🔄 Mise à jour de la release"
else
    HELM_CMD="$HELM_CMD_BASE install $RELEASE_NAME $CHART_PATH"
    log_header "📦 Installation de la release"
fi

HELM_CMD="$HELM_CMD \
    --namespace $NAMESPACE \
    --values $VALUES_FILE \
    --wait \
    --timeout 10m"

if [ "$CREATE_NAMESPACE" = true ] && [ "$UPGRADE" = false ]; then
    HELM_CMD="$HELM_CMD --create-namespace"
fi

if [ "$DEBUG" = true ]; then
    HELM_CMD="$HELM_CMD --debug"
fi

log_step "Exécution de: $HELM_CMD"
echo ""

if eval "$HELM_CMD"; then
    log_info "Déploiement réussi! 🎉"
else
    log_error "Le déploiement a échoué"
    exit 1
fi

# ============================================
# Affichage du statut
# ============================================

echo ""
log_header "📊 Statut du déploiement"
helm status "$RELEASE_NAME" --namespace "$NAMESPACE"

# ============================================
# Vérification des pods
# ============================================

echo ""
log_step "Vérification des pods..."
sleep 5
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME" -o wide

# ============================================
# Commandes utiles
# ============================================

echo ""
log_header "💡 Commandes utiles"
cat << EOF
  ${CYAN}# Voir les pods${NC}
  kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

  ${CYAN}# Voir les logs${NC}
  kubectl logs -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME -f --tail=100

  ${CYAN}# Voir le service${NC}
  kubectl get svc -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

  ${CYAN}# Voir l'ingress${NC}
  kubectl get ingress -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

  ${CYAN}# Port-forward local${NC}
  kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME 8080:80

  ${CYAN}# Mettre à jour${NC}
  ./install.sh -u -n $NAMESPACE -f $VALUES_FILE

  ${CYAN}# Désinstaller${NC}
  helm uninstall $RELEASE_NAME -n $NAMESPACE

  ${CYAN}# Voir l'historique des releases${NC}
  helm history $RELEASE_NAME -n $NAMESPACE

EOF

echo ""
log_info "🎉 NumS3-Console est maintenant déployé!"
echo ""