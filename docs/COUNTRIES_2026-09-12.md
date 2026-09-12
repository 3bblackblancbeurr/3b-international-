# Huit pays et dialogues — 12 septembre 2026

Travail dans l’aventure Origins existante, version locale non publiée.

## Livraison
France et sa quête de Justice conservées. Sept portes supplémentaires ouvrent maintenant des quartiers explorables, avec retour au Sanctuaire et position sauvegardée. Chaque nouveau quartier possède 24 bâtiments utilisant ses GLB régionaux existants, des voies praticables, une place, un portail, une fontaine, du mobilier et une promenade végétale. Les ciels procéduraux reçoivent leur atmosphère régionale ; les sols réutilisent le mélange naturel propre au pays.

| Pays | Quartier | Végétation dominante |
|---|---|---|
| Algérie | Terrasses des Liens | Palmiers |
| Maroc | Cour des Jardins | Palmiers |
| Tunisie | Place des Voiles | Oliviers |
| Espagne | Plaza des Rencontres | Oliviers |
| Italie | Piazza des Ateliers | Cyprès |
| Turquie | Passage des Artisans | Cyprès |
| Estonie | Quartier des Pins | Pins |

Noms de quartiers et dialogues : créations de jeu, pas des lieux historiques authentifiés ni de nouvelles identités officielles de gardiens. Les bâtiments restent stylisés et proviennent des familles régionales déjà présentes ; ce travail ne revendique pas une reconstruction fidèle des villes réelles.

## PNJ
Cinq interlocuteurs dans chaque nouveau quartier : guide, artisan, hôte et deux habitants. Parler nécessite la proximité. Les conversations proposent des renseignements, le Cercle Brisé, le quartier et un trajet vers les jardins. Ce dernier déclenche la navigation réelle, que le joueur peut interrompre. Les deux promeneurs de France répondent également ; les autres dialogues de quêtes français sont conservés.
Dialogues écrits avec animation de conversation, sans doublage audio. Pas de nouveaux achats, récompenses ou monnaies. Les ateliers des nouveaux quartiers ne proposent pas encore de système de fabrication ; les hôtes accueillent et renseignent, sans nouvelle mécanique de soin.

## Vérification
Tests ajoutés dans `tests/origins-countries.test.js` : proximité des portes, entrée/sortie, sauvegarde, accessibilité des habitants et jardins, dialogues et présence des modèles.
`scripts/verify-countries.mjs` ouvre les huit pays dans Edge, contrôle le rendu, parle aux PNJ et change de sujet. Captures dans `artifacts/countries/` ; résultats dans `browser.json`.
`scripts/verify-country-travel.mjs` contrôle les voyages par les sept nouvelles portes et les retours en émulation mobile ; résultats dans `travel.json`.
Suite complète : **350 tests réussis, zéro échec**, compilation réussie. Avertissement sur les bundles supérieurs à 500 kB conservé. Journal `artifacts/countries/verify.log` (exécution directe avec Node car npm absent du PATH).

## Fichiers
Nouveaux : `origins/countries.js`, `origins/country-environment.js`, tests et scripts ci-dessus. Adaptations : `origins/{data,state,space,scene,environment,actors}.js`, `OriginsPage.jsx`, `origins.css`, `world/sky.js`.
GLB existants `public/world/districts/*-lod.glb` réutilisés. Texture de mur existante Poly Haven CC0, provenance conservée dans `public/world/paris/textures/sources.json`. Aucune nouvelle ressource tierce téléchargée.

## Limites
Cette extension ouvre des quartiers de visite et de dialogue, pas sept nouvelles campagnes de quêtes. Les modèles de bâtiments restent répétitifs et les espaces périphériques demandent davantage de composition artistique. Les nouveaux habitants sont installés à des points fixes ; la France conserve ses promeneurs. Pas de photoréalisme revendiqué.
Contrôle tactile en émulation ; performances sur Samsung physique non vérifiées. Aucune publication effectuée.
