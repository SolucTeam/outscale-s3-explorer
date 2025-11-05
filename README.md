# NumS3 Console

Interface web moderne pour la gestion d'objets S3 compatible Outscale.

## 🚀 Démarrage rapide

### Option 1: Script automatique (recommandé)

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

### Option 2: Démarrage manuel

```bash
# Terminal 1 - Démarrer le proxy
cd proxy-server
npm install
npm start

# Terminal 2 - Démarrer le frontend
npm run dev
```

## 📡 Services

- **Frontend**: http://localhost:5173
- **Proxy API**: http://localhost:3001

## ✨ Fonctionnalités

- 🔐 Authentification Outscale S3
- 📁 Gestion des buckets et dossiers
- 📤 Upload de fichiers avec progress
- 📥 Téléchargement d'objets
- 🗑️ Suppression d'objets et buckets
- 💾 Cache intelligent
- 🔄 Retry automatique
- 🌐 Interface responsive

## 🛠️ Configuration

### Identifiants Outscale

Lors de la connexion, fournissez:
- **Access Key**: Votre clé d'accès Outscale
- **Secret Key**: Votre clé secrète
- **Région**: Région de vos buckets (eu-west-2, cloudgouv-eu-west-1, etc.)

### Endpoints supportés

- `eu-west-2`: https://oos.eu-west-2.outscale.com
- `cloudgouv-eu-west-1`: https://oos.cloudgouv-eu-west-1.outscale.com
- `us-east-2`: https://oos.us-east-2.outscale.com
- `us-west-1`: https://oos.us-west-1.outscale.com

## 🔧 Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Proxy**: Node.js + Express pour contourner les limitations CORS
- **SDK**: AWS S3 SDK v3 compatible Outscale

---

## Technologies

This project is built with:
- Vite
- TypeScript  
- React
- shadcn-ui
- Tailwind CSS
