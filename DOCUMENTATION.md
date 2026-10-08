# Documentation — L'Oracle Tarot de Niko

## Architecture réelle

L'application principale est dans `index.html` (HTML/CSS/JavaScript sans compilation).
`sw.js` gère le cache hors ligne de la PWA ; `manifest.json` déclare l'installation.
Aucun fichier du dépôt n'implémente un backend Node, une base MongoDB, une authentification ou un proxy Vercel.

## Tirage

78 cartes : 22 arcanes majeurs et 56 mineurs.
Tirages proposés : phrase optique (3 cartes), psychogénéalogie (4), croix (5), hexagramme (6).
Le mélange utilise Fisher–Yates ; les inversions de cartes sont simulées aléatoirement.

## IA

Optionnelle. L'utilisateur fournit sa propre clé API Mistral.
Le navigateur envoie directement les requêtes POST HTTPS à `https://api.mistral.ai/v1/chat/completions`.
La sortie en streaming SSE est reconstruite, y compris quand une ligne est coupée entre plusieurs fragments réseau.
Une erreur affichée permet de relancer l'analyse ; les requêtes sont annulées lorsqu'un autre tirage commence.

**Attention :** il n'y a ni chiffrement local du secret ni relais serveur. La clé n'est conservée qu'en mémoire pour la consultation et n'est jamais enregistrée dans localStorage par la version corrigée ; l'ancienne valeur est purgée au chargement. Le prénom, la date de naissance facultative, l'intention et les questions font partie des données envoyées à Mistral pour l'interprétation. L'utilisateur peut tirer les cartes sans utiliser l'IA.

## Installation / hébergement

Site statique compatible GitHub Pages sous `/tarot-de-niko/`. Les chemins de `sw.js` et `manifest.json` sont relatifs au répertoire du projet.

Localement : `python3 -m http.server 8000` puis ouvrir http://localhost:8000/.

Le contenu statique peut être disponible hors ligne après une visite. Les flux de l'IA et les ressources externes ne sont pas mis en cache par le service worker.

## Tests

Installer Node.js 22+ puis exécuter `node --test tests.js`.
Les tests utilisent uniquement les bibliothèques standard de Node, sans npm install. Ils s'exécutent aussi dans GitHub Actions.
