# Vérification de l’aperçu Origins

Contrôles du 11–12 septembre 2026. Branche `codex/3b-origins-justice`, base mise à jour vers `a0e0c83` pour préserver l’autre jeu livré en parallèle. Aucun changement de cet aperçu n’a été fusionné dans main ou publié en production.

## Commandes exécutées

- `node node_modules/vite/bin/vite.js build` : compilation réussie. Un avertissement de taille reste présent pour les chunks partagés au-delà de 500 kB. Le module Origins est chargé à la demande.
- `node --test tests/*.test.js` sur la base intégrée : **336 réussites, 0 échec**, environ 119 secondes.
- `node --test tests/world-origins.test.js tests/world-origins-navigation.test.js` : **16 réussites**, couvrant prérequis, récompenses uniques, sauvegardes et onglets anciens, collisions, accès aux intérieurs, rampe, compagnon bloqué, commandes de combat, interruption limitée et contenu animé du GLB.
- Blender 4.5.9 en mode background a exécuté `scripts/build-origins-wolf.py`. Le GLB produit contient cinq clips avec de vraies pistes d’animation : Idle, Walk, Run, Sniff, Wait.

Vite preview local : `http://127.0.0.1:4173/#monde-3b` ; lancement reproductible depuis le dépôt avec `npm run preview -- --host 127.0.0.1 --port 4173` après compilation.

## Essais dans le navigateur

Le parcours principal a été joué avec les commandes visibles : Cercle → porte France → habitante → recherche du loup → lecture en Vision → gardien → loup sur le sceau gauche, joueur à droite → Archives → deux témoignages → combat → Justice → retour au Cercle. Les 220 XP et le fragment replacé ont été retrouvés après rechargement. Réinteragir avec le Cercle n’a pas dupliqué les XP.

Une défaite a été observée : reprise devant les Archives avec les deux premières quêtes conservées. La portée d’engagement ennemie a été corrigée après cet essai. Un combat a ensuite été remporté avec coups rapides, puissants et pouvoir du Cercle. La revue a ensuite limité les interruptions : le spam du coup rapide ne peut plus annuler toutes les attaques ennemies ; cette dernière règle est couverte par les tests de simulation.

Autres corrections issues des contrôles : cible de trace initialement dans la fontaine, dégagement de navigation trop faible aux angles, pièces statiques indexées incompatibles lors du regroupement, sens des triangles des routes, lampes opaques, collisions de meubles décalées, retour anticipé au Sanctuaire et récupération du loup près d’un mur.

L’atelier a été visité, les graines recueillies et rapportées : 30 XP supplémentaires et tenue renforcée. Le refuge a été visité et a soigné Kaïs. La suite de la rencontre des hauteurs et les contrôles d’affichage sont consignés dans le rapport local final.

## Performance et limites de mesure

Ordinateur disponible : AMD Ryzen 7 9800X3D, NVIDIA GeForce RTX 5080. Navigateur intégré à Codex. Dans le quartier, relevé de **60 images/s**, canvas **1920 × 1080**, environ **245 appels de rendu**, profil élevé. C’est un relevé ponctuel au repos/entre trajets, pas un benchmark de tous les cas ni un percentile mesuré.

Un relevé initial à 1 image/s provenait de l’aperçu masqué. Il a été exclu de la mesure de jeu : le navigateur a été rendu visible avant le relevé ci-dessus. Ne pas tirer de conclusion sur un téléphone à partir de cette session.

Aucun Samsung physique n’a été connecté. Le modèle exact et le navigateur du téléphone ne sont pas connus. Les gestes simultanés de plusieurs doigts et l’objectif 30 images/s sur Android réel restent à vérifier.

## Preuves et limites artistiques

Les PNG du dossier local `outputs/3B-Origins` sont des captures du moteur exécuté. Les WebP de `docs/origins/references` sont des concepts générés et ne servent pas de preuve de rendu. Le rapport visuel local les distingue.

Le Sanctuaire, seize façades parisiennes, trois intérieurs, les rampes, le loup et le combat sont des éléments 3D de jeu. Ce n’est pas une reproduction photoréaliste des illustrations fournies. Statues, silhouette du gardien, végétation, animations et activités des habitants demandent une production artistique supplémentaire. La restauration persiste mais reste limitée à une partie du décor et des dialogues. Les sept autres pays, la coopération Internet et une version native ne sont pas livrés dans cette branche.
