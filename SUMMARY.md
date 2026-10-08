# Tarot de Niko — état de la V2

Version modulaire proposée dans la Pull Request V2.

## Réalisé

- Interface HTML/CSS responsive et accessible de base.
- 78 cartes et illustrations SVG originales générées à la demande.
- Mélange cryptographique et moteur de lecture introspective.
- Intégration Mistral SSE directe, plus backend Vercel optionnel.
- Grimoire opt-in chiffré (AES-GCM, PBKDF2), notes et import/export.
- Lecture vocale, dictée navigateur et ambiance sonore facultative.
- Service worker PWA mis à jour et tests GitHub Actions.

## Non effectué / à vérifier

- Activation réelle du backend : dépend de secrets Mistral et d'Upstash Redis sur Vercel.
- Vérifications manuelles multi-navigateurs et audit d'accessibilité complet.
- Reproduction historique des 78 cartes : les illustrations actuelles sont symboliques originales.
- Publication : conditionnée à la fusion de la Pull Request.

Les affirmations anciennes de backend MongoDB, d'authentification des utilisateurs et de coffre local de clé API ne correspondaient pas à ce dépôt ; cette documentation est corrigée.
