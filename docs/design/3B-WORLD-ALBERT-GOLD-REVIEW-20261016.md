# 3B WORLD × ALBERT — Revue Gold Master des matériaux visuels

## Objectif de la refonte
Les concepts 13 et 14 deviennent un accueil géographique et un concierge d'orientation mobile. Une photographie marketing n'est jamais utilisée comme une fausse interface fonctionnelle.

## Décisions de design (16/10/2026)
- Palette obsidienne/champagne/Matrix; scène et avatar utilisent la source de couleurs `src/styles/gold-master.css`, sous variables `--3b-world-tone-*`.
- Les variantes de verres, de reflets et de lumières sont des **matériaux scéniques** d'exception; les boutons et autres composants ordinaires passent par le composant commun `Button`.
- Rayon et ombre ont des tokens centralisés `--3b-world-radius-*` et `--3b-world-shadow-*`. Valeurs historiques conservées pour éviter la dérive visuelle.
- Le globe est une projection orthographique Canvas avec palette JS canonique `worldLivingCanvasPalette`, depuis `src/design-system/tokens.js`; le canvas évite une lecture CSS coûteuse chaque frame.
- Le fond est en mouvement discret; le contenu demeure lisible. Motion réduite et performance mobile prévues.
- Un accès direct à `#accueil` et `#albert-3b` saute le splash cinématique. L'animation de marque reste disponible dans l'introduction.
- L'ancien compagnon mobile n'obstrue plus ces deux espaces. Albert possède sa navigation intégrée.
- Favoris locaux, pas de faux membres/partenaires/hubs, pas d'exposition d'Albert local.
- Aucun changement de dépendance, de secrets, de coffre Passeport ou de moteur de jeu.

## Critères d'acceptation avant toute fusion
CI Gold Master, 2607+ tests, QA Chromium 320/390/768, screenshots non masqués, saisie voix volontaire, routage des 22 univers, zéro débordement, temps de chargement et mémoire mobile. Revue humaine Samsung S21 et Xiaomi et consentement sur la publication nécessaires.

## Limite
Rendu AAA cible artistique, pas une certification ni une garantie de perfection. Albert local reste hors ligne tant qu'une passerelle autorisée et auditée n'est pas installée.
