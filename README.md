# L’Oracle — Tarot de Niko 2.0

![Bannière historique](banner.svg)

**Un espace de réflexion symbolique.** Application française mobile-first avec 78 arcanes, tirages contemplatifs, lecture locale sans connexion IA, analyse facultative par Mistral et grimoire chiffré sur l'appareil.

## Fonctionnalités

- 78 cartes générées en illustrations vectorielles locales. Elles constituent une **interprétation graphique originale** ; il ne s'agit pas d'une reproduction fidèle du Tarot de Marseille historique.
- Tirages à 3, 4, 5 et 6 positions, sans cartes répétées, mélange Fisher–Yates avec aléa Web Crypto.
- Relations entre arcanes majeurs, direction des regards, répétitions numériques, thématiques dominantes.
- Lecture symbolique locale, disponible sans clé, compte, backend ou accès à Mistral.
- Analyse IA par streaming SSE et questions de suivi, avec clé personnelle en mémoire ou backend Vercel configuré.
- Journal facultatif chiffré AES-GCM et PBKDF2, notes et sauvegarde/restauration chiffrées.
- Voix française (synthèse), dictée si le navigateur la prend en charge, ambiance sonore désactivée par défaut.
- PWA installable, navigation clavier, mise en page mobile, animations réduites si configurées.

## Démo et développement

La version publiée se trouve sur [GitHub Pages](https://nikoju1977.github.io/tarot-de-niko/). Une Pull Request V2 peut être consultée avant fusion dans le dépôt.

Lancer un serveur statique local :

`python3 -m http.server 8000`

Puis ouvrir http://localhost:8000/ (ouvrir directement `file://` est déconseillé : modules ES et service worker exigent un serveur HTTP/HTTPS).

Tests : Node.js 22+ puis `npm test` (aucune dépendance npm requise). Vérification syntaxique : `npm run check`.

## Dossiers

- `index.html` — structure accessible.
- `styles.css` — identité visuelle responsive.
- `js/tarot-data.js` — jeu complet, jeux de tirages.
- `js/tarot-engine.js` — mélange, tirage, lecture symbolique.
- `js/card-art.js` — illustrations SVG générées localement.
- `js/oracle.js` — client de streaming Mistral.
- `js/vault.js` — chiffrement local opt-in du grimoire.
- `js/app.js` — contrôleur d'interface et interactions.
- `api/oracle.js` — fonction Node/Vercel sécurisée, inactive sans configuration.
- `sw.js` — cache PWA limité aux ressources publiques.
- `tests.js` — tests unitaires et garde-fous.

## IA et confidentialité

**GitHub Pages ne peut pas exécuter le backend `api/oracle.js`.** La lecture locale fonctionne sur GitHub Pages. Pour l'IA, un utilisateur peut fournir une clé Mistral personnelle ; elle est envoyée directement à Mistral depuis son navigateur, n'est pas enregistrée et est effacée à la fermeture de la page. En présence d'un backend Vercel configuré, le site peut utiliser la clé serveur sans demander la clé au visiteur.

Pour un déploiement Vercel avec IA serveur, configurer en environnement **privé** les trois variables :
- `MISTRAL_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Sans les trois valeurs, l'endpoint retourne 503. La clé n'est jamais ajoutée au dépôt. Le limiter Redis impose au plus 12 demandes par heure et par adresse IP hachée ; prévoir des restrictions budgétaires et des protections complémentaires avant commercialisation. Une valeur facultative `RATE_LIMIT_SECRET` permet de décorréler le hachage du secret Mistral.

Les tirages et notes ne sont conservés que lorsque le grimoire est déverrouillé et qu'un enregistrement est demandé. **Perdre la phrase secrète signifie perdre l'accès aux archives chiffrées.** Les requêtes vers Mistral transmettent l'intention, les cartes et les questions de suivi ; ne saisis pas de données sensibles dans la conversation.

## Limites

La qualité de la dictée dépend du navigateur. Les appels IA nécessitent réseau et crédits Mistral. Les animations et illustrations sont des créations stylisées, pas des fac-similés. Aucun test d'accessibilité manuel ou test complet sur appareils réels n'est revendiqué à ce stade.

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design.
