# Outscale S3 Explorer Proxy Server

Serveur proxy CORS minimal pour contourner les restrictions navigateur avec l'API Outscale S3.

## Installation

```bash
cd proxy-server
npm install
npm start
```

## Configuration Frontend

Modifiez `src/services/directS3Service.ts` pour utiliser le proxy au lieu de l'API directe.

## Pourquoi ce proxy ?

Les navigateurs bloquent les requêtes CORS vers les APIs S3 pour des raisons de sécurité. Ce proxy minimal :

1. Reçoit les requêtes depuis le frontend
2. Les transfère vers l'API Outscale
3. Retourne les réponses avec les headers CORS appropriés

## Sécurité

- Les credentials ne sont jamais stockés côté serveur
- Ils transitent uniquement via les headers HTTP
- Le proxy ne fait que transférer les requêtes

## Déploiement

Déployez ce serveur sur :
- Heroku
- Vercel
- Netlify Functions
- AWS Lambda
- Votre propre serveur