![Tarot de Niko](banner.svg)

# L'Oracle Tarot de Niko

[![Démo](https://img.shields.io/badge/Démo-en_ligne-00ff9d?style=flat-square&labelColor=050a0d)](https://nikoju1977.github.io/tarot-de-niko/) [![PWA](https://img.shields.io/badge/PWA-installable-00d4ff?style=flat-square&labelColor=050a0d)](#) [![Licence](https://img.shields.io/badge/Licence-MIT-9fb4ba?style=flat-square&labelColor=050a0d)](LICENSE)

Application de **tirage de tarot avec interprétation par IA** — streaming des réponses en temps réel, clé API protégée par coffre chiffré.

**Démo** : [nikoju1977.github.io/tarot-de-niko](https://nikoju1977.github.io/tarot-de-niko/)

## Fonctionnalités

- 🎴 Tirages interactifs avec animations
- ✨ Interprétations générées par **Mistral AI** en streaming **SSE**
- 🔐 Coffre **AES-256-GCM** (PBKDF2) pour la clé API — jamais stockée en clair
- 🌐 Relais **Vercel Edge Function** (la clé ne transite pas côté client en production)
- 📱 Mobile-first, installable

## Stack

`HTML/CSS/JS single-file` · `Mistral AI (SSE)` · `Web Crypto API` · `Vercel Edge Functions`

## Lancer en local

Ouvrir `index.html`, saisir une clé Mistral (chiffrée localement à la volée).

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design
