# Dockerfile pour NumS3 Console
# Build multi-stage pour optimiser la taille de l'image

# Stage 1: Build du frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src ./src
COPY public ./public
COPY index.html ./

# Build de production
RUN npm run build

# Stage 2: Setup du proxy backend
FROM node:20-alpine AS proxy-builder

WORKDIR /app/proxy

# Copier les fichiers du proxy
COPY proxy-server/package*.json ./
RUN npm ci --only=production

COPY proxy-server/server.js ./

# Stage 3: Image finale
FROM node:20-alpine

# Métadonnées
LABEL maintainer="NumS3 Team <support@nums3.com>"
LABEL description="NumS3 Console - Interface S3 pour Outscale"

# Installer nginx pour servir le frontend
RUN apk add --no-cache nginx

# Créer un utilisateur non-root
RUN addgroup -g 1000 nums3 && \
    adduser -D -u 1000 -G nums3 nums3

WORKDIR /app

# Copier le frontend build depuis le stage 1
COPY --from=frontend-builder --chown=nums3:nums3 /app/frontend/dist /app/frontend/dist

# Copier le proxy depuis le stage 2
COPY --from=proxy-builder --chown=nums3:nums3 /app/proxy /app/proxy-server

# Configuration nginx
COPY <<EOF /etc/nginx/http.d/default.conf
server {
    listen 5173;
    server_name _;
    root /app/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Créer un script de démarrage
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e

echo "🚀 Démarrage de NumS3 Console..."

# Démarrer nginx en arrière-plan
echo "📡 Démarrage du serveur frontend (nginx)..."
nginx

# Démarrer le proxy Node.js
echo "🔌 Démarrage du serveur proxy..."
cd /app/proxy-server
exec node server.js
EOF

RUN chmod +x /app/start.sh && \
    chown nums3:nums3 /app/start.sh

# Créer les répertoires nécessaires
RUN mkdir -p /var/lib/nginx /var/log/nginx && \
    chown -R nums3:nums3 /var/lib/nginx /var/log/nginx /run

# Changer d'utilisateur
USER nums3

# Exposer les ports
EXPOSE 5173 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Démarrer l'application
CMD ["/app/start.sh"]
