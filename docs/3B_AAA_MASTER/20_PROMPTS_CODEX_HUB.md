# 3B AAA MASTER — Prompts Codex pour la Cité des Huit Héritages

## Règle commune

Pour chaque prompt : travailler sur une branche dédiée, ne jamais pousser directement sur `main`, mesurer avant/après, compiler, tester, documenter, créer des commits logiques et arrêter toute régression avant de poursuivre.

## A — Blockout du hub

Construis le blockout de la Cité des Huit Héritages à partir de `src/world/hub/data/hub-master-plan-v2.json`. Ne produis pas encore les modèles finaux. Crée cellules, volumes, échelle humaine, eau, ponts, quais, routes, collisions, entrées, sorties et points de repère. Conserve les dix pôles, les huit portes et la verticalité. Ajoute des tests de cohérence et vérifie la fluidité mobile.

## B — Streaming par cellules

Crée un gestionnaire de cellules Three.js. Android moyen : trois cellules actives ; Android haut de gamme : quatre ; desktop : six. Ajoute préchargement directionnel, désallocation sûre, récupération après erreur, métriques mémoire et tests d’entrées/sorties répétées. Aucun mesh géant et aucun chargement intégral de la ville.

## C — 3B Express

Implémente le train circulaire et ses dix stations. Ajoute embarquement, sortie, destination directe, tour complet, archives audio, wagon de mission et architecture permettant un wagon secret. Le train doit anticiper le chargement des cellules et ne jamais bloquer le joueur.

## D — Réseau maritime

Implémente bateau-taxi et navette maritime entre les cinq arrêts. Ajoute trajectoires déterministes, quais, embarquement accessible, météo de base, récupération si le trajet est interrompu et instrumentation CPU/GPU. Prépare l’architecture pour bateau personnel, bateau de mission et bateau panoramique.

## E — Téléphériques et tyroliennes

Implémente T1 Docks–Tour, T2 Jardins–Archives, T3 Commerce–Innovation et les six tyroliennes. Ajoute règles d’accès, animation, préchargement de destination, sortie sûre et mode accessible évitant les gestes difficiles.

## F — Population vivante

Charge `npcs-v1.json` et crée trois couches : persistante, semi-persistante et ambiance. Utilise pooling, points d’intérêt, LOD d’animation, fréquence de mise à jour variable et limites par profil graphique. Les PNJ réagissent au joueur, à la pluie, au combat et aux événements sans être simulés intégralement hors zone.

## G — Moteur de missions

Charge `missions-v1.json` et crée un moteur piloté par données. Vérifie prérequis, objectifs, variantes, récompenses, conséquences, idempotence et sauvegarde. Une récompense ne doit jamais pouvoir être obtenue deux fois par répétition d’une requête.

## H — Secrets

Charge `secrets-v1.json`. Les secrets ne possèdent pas de marqueur initial. Les conditions doivent être observables, sauvegardées, testables et cohérentes. Ajoute journal d’indices sans révéler automatiquement la solution.

## I — Événements

Charge `events-v1.json`. Crée un ordonnanceur léger tenant compte de l’heure, de la météo et de la progression. Chaque événement doit être annulable, posséder un budget PNJ/effets et laisser la scène dans un état propre.

## J — Caméra V3

Conserve Motion V2 et ajoute évitement des murs par sphere cast, profils exploration/intérieur/combat/boss/dialogue, zoom tactile et anticipation légère. Aucun tremblement, aucun mur entre caméra et Kaïs, aucune reprise brutale.

## K — Pipeline 3D

Crée un manifeste d’assets. Pour chaque modèle : source, licence, triangles, UV, textures, LOD, collision, poids et statut. Utilise GLB/GLTF, KTX2/Basis, Meshopt ou Draco uniquement après mesure, instancing et culling.

## L — Performance

Ajoute un panneau de diagnostic désactivé en production normale : FPS, frame time, mémoire estimée, cellules, PNJ, draw calls, triangles et temps de chargement. Crée un rapport avant/après et un seuil de régression CI raisonnable.

## M — E2E principal

Automatise : connexion → Passeport → Monde du 3B → paysage → Place de l’Héritage → train → Archives → mission → Docks → bateau → récompense → sauvegarde → fermeture → reconnexion → progression restaurée → Ville 3B.

## N — France et Algérie visibles depuis le hub

Crée les approches visuelles et fonctionnelles des Portes France et Algérie. Avant franchissement, chaque zone doit déjà annoncer son identité. France : patrimoine urbain, héritage ouvrier, pluie et Justice. Algérie : Casbah de Demain, oasis, Atlas, Tassili, Méditerranée et Loyauté. Ne construis pas encore les pays complets.
