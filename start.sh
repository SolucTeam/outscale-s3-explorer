#!/bin/bash

echo "🚀 Démarrage de NumS3 Console"
echo "================================"

# Vérifier si node_modules existe dans proxy-server
if [ ! -d "proxy-server/node_modules" ]; then
    echo "📦 Installation des dépendances du proxy..."
    cd proxy-server && npm install && cd ..
fi

# Démarrer le proxy et le frontend
echo "🔥 Lancement du proxy et du frontend..."
npm run full