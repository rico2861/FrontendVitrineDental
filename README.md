# DENTAL LIGHT — Site vitrine (FrontendVitrineDental)

Site public : présentation, fonctionnalités, tarifs, **inscription d'essai (15 jours)**, paiement MonCash et téléchargement du logiciel. Statique, aucun build.

## Configuration
Éditez `js/config.js` :
```js
window.DL_API = 'https://votre-backend-saas'   // backend (vide = même origine)
window.DL_DOWNLOAD = 'https://github.com/rico2861/Dental/releases/latest'
```
Côté backend, ajoutez l'URL de ce site dans `CORS_ORIGINS`.

## Local
```bash
npx serve .    # ou: python3 -m http.server 8080
```
Tarifs via `GET /api/prices`, essai via `POST /api/signup`, paiement via `POST /api/pay/moncash`.

## Déploiement
Hébergement statique (Netlify, Vercel, Railway, Cloudflare Pages…) ou servi par le backend.
