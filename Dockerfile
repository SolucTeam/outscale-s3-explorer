# ============================================
# 🐳 Dockerfile Multi-Stage pour NumS3 Console
# ============================================
# Ce Dockerfile contient Frontend + Backend dans une seule image
# Utilise Nginx pour servir le frontend et Node.js pour le proxy

# ============================================
# ÉTAPE 1: Build du Frontend (React + Vite)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (dev incluses pour le build)
RUN npm install

# Copier le code source du frontend
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY components.json ./

# Build de production
RUN npm run build

# ============================================
# ÉTAPE 2: Build du Backend (Proxy Node.js)
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copier les fichiers du proxy
COPY proxy-server/package*.json ./

# Installer les dépendances de production uniquement
RUN npm install --production

# Copier le code du proxy
COPY proxy-server/server.js ./

# ============================================
# ÉTAPE 3: Image Finale (Nginx + Node.js)
# ============================================
FROM node:20-alpine

# Installer nginx
RUN apk add --no-cache nginx

# Créer les répertoires nécessaires
RUN mkdir -p /var/www/html \
    /var/log/nginx \
    /var/lib/nginx/tmp \
    /run/nginx \
    /app/proxy-server

# Copier le frontend buildé depuis le builder
COPY --from=frontend-builder /app/dist /var/www/html

# Copier le backend depuis le builder
COPY --from=backend-builder /app /app/proxy-server

# Configuration Nginx
COPY <<'EOF' /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    server {
        listen 80;
        server_name _;

        root /var/www/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Frontend (SPA)
        location / {
            try_files $uri $uri/ /index.html;
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }

        # API Proxy Backend
        location /api/ {
            proxy_pass http://127.0.0.1:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Cache statique
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Script de démarrage
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e

echo "🚀 Démarrage de NumS3 Console..."

# Démarrer le proxy backend en arrière-plan
echo "🔧 Démarrage du proxy backend..."
cd /app/proxy-server
node server.js &
PROXY_PID=$!

# Attendre que le proxy soit prêt
echo "⏳ Attente du proxy (5s)..."
sleep 5

# Démarrer Nginx en premier plan
echo "🌐 Démarrage de Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Fonction de nettoyage
cleanup() {
    echo "🛑 Arrêt des services..."
    kill $PROXY_PID 2>/dev/null || true
    kill $NGINX_PID 2>/dev/null || true
    exit 0
}

# Capturer les signaux
trap cleanup SIGTERM SIGINT

# Attendre les processus
wait $NGINX_PID
EOF

RUN chmod +x /app/start.sh

# Exposer les ports
EXPOSE 80 3001

# Variables d'environnement
ENV NODE_ENV=production \
    VITE_PROXY_URL=/api \
    VITE_LOG_LEVEL=info

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Démarrage
CMD ["/app/start.sh"]