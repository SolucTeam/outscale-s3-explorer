@echo off
echo 🚀 Démarrage de NumS3 Console
echo ================================

REM Vérifier si node_modules existe dans proxy-server
if not exist "proxy-server\node_modules" (
    echo 📦 Installation des dépendances du proxy...
    cd proxy-server
    npm install
    cd ..
)

REM Démarrer le proxy et le frontend
echo 🔥 Lancement du proxy et du frontend...
npm run full