# Guide technique — L'Oracle V2

## Principes

Le frontend utilise ES Modules natifs et aucun bundle. `index.html` fournit les éléments sémantiques ; `js/app.js` coordonne les pages Accueil / Tirage / Grimoire. `tarot-data.js` expose 78 cartes et quatre tirages.

Les SVG sont générés par `card-art.js` : **aucun chargement d'illustration depuis des hôtes tiers**. Il s'agit d'une stylisation contemporaine, non d'un Tarot de Marseille historique certifié.

`tarot-engine.js` applique Fisher–Yates et les nombres non biaisés fournis par Web Crypto. Il extrait les motifs de lecture, non des prédictions. Les règles sont simples et auditables.

## Parcours

1. Saisir éventuellement un prénom, une intention, choisir 3/4/5/6 cartes.
2. Mélanger et révéler les cartes une par une ou toutes ensemble (boutons accessibles).
3. Lire l'analyse symbolique locale.
4. Facultatif : lancer Mistral en streaming, puis poser une question de suivi.
5. Facultatif : déverrouiller/créer le grimoire et enregistrer une lecture avec notes.

Les réponses IA sont affichées par `textContent`, jamais insérées comme HTML brut. On ne conserve pas la clé du visiteur dans localStorage ou dans le journal.

## Grimoire chiffré

`vault.js` dérive une clé AES-GCM 256 bits depuis la phrase secrète à l'aide de PBKDF2-SHA-256 (250 000 itérations). Un sel aléatoire est créé lors de l'initialisation, et chaque sauvegarde utilise un IV de 96 bits neuf. Les données chiffrées sont dans localStorage. Phrase secrète et clé dérivée restent en mémoire pendant le déverrouillage uniquement.

Pour restaurer une archive, cliquer sur **Importer une archive** dans la section Grimoire, puis fournir le JSON exporté et sa phrase secrète. L'import **remplace** le journal local (confirmation préalable).

Cette protection aide contre la lecture triviale du disque, sans remplacer la sécurité du poste ou protéger contre un script malveillant exécuté dans l'origine du site.

## Interprétation Mistral

Mode direct : l'utilisateur saisit sa clé personnelle et le navigateur appelle l'API Mistral par HTTPS. La clé est conservée pendant la visite et peut, sur choix explicite **Mémoriser sur cet appareil**, être chiffrée en AES-GCM dans IndexedDB pour les visites suivantes (`js/mistral-key.js`). La clé de chiffrement locale est non exportable, mais la même origine web peut l'utiliser pour déchiffrer le secret ; ce stockage ne protège ni contre une extension malveillante ni contre un navigateur compromis. **Effacer ma clé** supprime la copie locale. Cela peut dépendre des restrictions CORS du fournisseur.

Mode serveur : héberger le dépôt sur Vercel et définir les variables `MISTRAL_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. `api/oracle.js` applique un contrôle d'origine, reconstruit les cartes depuis le jeu autorisé, vérifie la taille des requêtes, applique un quota persistant Redis et diffuse les événements SSE. Il échoue en mode fermé (503) si configuration absente ou quota indisponible.

Les limitations par IP sont un contrôle de base ; pour un service grand public, prévoir contrôle de budget Mistral, authentification / preuve anti-robot, journalisation respectueuse de la vie privée et politique de conservation.

## Publication

### GitHub Pages

La branche `main` publie l'interface statique à `https://nikoju1977.github.io/tarot-de-niko/`. Le backend n'y fonctionne pas. Les chemins du manifest, modules et service worker sont relatifs.

### Vercel

Importer le dépôt en tant que projet « Other » / site statique ; la fonction `api/oracle.js` est disponible au chemin `/api/oracle` sur **le même domaine que l'interface**. Configurer les secrets via les variables d'environnement du projet, jamais via le frontend ni Git. Vérifier que les routes HTML, CSS et JS sont servies correctement et que l'endpoint refuse les requêtes non autorisées ou mal formées.

### Qualité

- `npm test` : jeu de cartes, tirages, moteur, SSE, chiffrement, PWA et refus du proxy non configuré.
- `npm run check` : syntaxe de tous les modules et du backend.
- Tests manuels à prévoir : Safari iOS, Chrome Android, VoiceOver, TalkBack, réseau déconnecté, dictée et compatibilité des permissions.

## Limitations assumées

Pas de compte utilisateur, ni de synchronisation entre appareils. Pas de stockage serveur des consultations. Les SVG décoratifs ne reproduisent pas les gravures Conver. L'Oracle ne prédit pas l'avenir et ne remplace pas un avis professionnel.
