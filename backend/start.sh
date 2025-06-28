
#!/bin/bash

# Script de démarrage pour NumS3 Backend

echo "🚀 Démarrage du backend NumS3..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier la version Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18+ requis (version actuelle: $(node -v))"
    exit 1
fi

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant, création à partir du template..."
    cp .env.example .env
    echo "✏️  Veuillez configurer les variables dans .env avant de continuer"
    exit 1
fi

# Créer le dossier logs
mkdir -p logs

echo "✅ Backend prêt à démarrer"
echo "🌍 Mode: ${NODE_ENV:-development}"
echo "🔌 Port: ${PORT:-5000}"

# Démarrer le serveur
if [ "${NODE_ENV}" = "production" ]; then
    echo "🚀 Démarrage en mode production"
    npm start
else
    echo "🔧 Démarrage en mode développement avec protection anti-redémarrage"
    # Utiliser node directement au lieu de nodemon pour éviter les redémarrages
    # pendant les opérations longues
    if [ "${DISABLE_NODEMON}" = "true" ]; then
        echo "⚠️  Nodemon désactivé - redémarrage manuel requis"
        node src/server.js
    else
        echo "🔄 Mode développement avec nodemon (utiliser DISABLE_NODEMON=true pour désactiver)"
        # Configurer nodemon pour ignorer les fichiers de logs et être moins sensible
        npx nodemon \
            --ignore logs/ \
            --ignore node_modules/ \
            --ignore *.log \
            --delay 2000ms \
            --watch src/ \
            --ext js \
            src/server.js
    fi
fi
