# Paris — quartier des Verrières

Le quartier central de France reçoit huit bâtiments placés et dimensionnés à la main, une Tour Eiffel à charpente ajourée, une fontaine, un kiosque et une pergola. Les dix modèles originaux ont été générés dans Blender local, puis exportés à deux niveaux de détail et compressés avec Meshopt. Le source éditable est conservé dans `work/3b-unreal/ArtSource/Paris/ParisReference.blend`, hors des fichiers web.

La direction visuelle reprend les références 3B : pierre claire, zinc, métal champagne, vitrines vert pétrole, terrasses et patrimoine. Il s'agit d'une interprétation stylisée, pas d'une reproduction photogrammétrique de Paris. Les autres quartiers et pays conservent leurs modèles antérieurs.

## Parcours jouable

- Le journal « La vie du quartier » propose une activité adaptée à la progression : rencontrer Léa, récolter, protéger les environs, aménager le refuge, recommencer.
- Les rues courbes, les trajets des habitants et la mini-carte partagent un plan dessiné autour des façades. Un contrôle échantillonne aussi les segments entre les points des rues, sur toute leur largeur.
- L'atelier et le refuge possèdent une véritable ouverture et un intérieur meublé. Le toit se découpe lorsque le joueur entre ; la distance de caméra choisie reste constante. Les plaques de façade montrent les rangs construits.
- Le café échange exactement six éclats du monde contre trois provisions. Aucun XP ni point de fidélité n'est créé par cet achat. Le refuge conserve le dépannage gratuit lorsque les provisions sont épuisées.
- À Paris, les rencontres laissent marcher, tourner la caméra et esquiver latéralement. L'adversaire approche et prépare une attaque visible. La pause et l'arrière-plan suspendent cette pression. Les conséquences des frappes et ripostes utilisent toujours le moteur déterministe partagé avec le serveur : ce n'est pas encore une simulation de combat continue multijoueur.
- Les animations des jambes des humanoïdes sont séparées des actions du haut du corps. Les pas distinguent extérieur et intérieur ; sons synthétisés de garde, pouvoir et impact, oiseaux extérieurs lorsque le son est activé.
- Le monde reste ouvert après les reconstructions. Aucun écran de fin obligatoire n'a été ajouté.

## Production et performances

`scripts/build-paris-district.py` s'exécute avec Blender 4.5. Les modèles sont regroupés par matériau. La version distante conserve les vitrages et panneaux minces pour éviter leur déformation par décimation. La compression utilise `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions` et `meshoptimizer` (`dedup`, `weld`, `prune`, `meshopt`). Exécuter ensuite `node scripts/paris-asset-manifest.mjs` pour recalculer tailles et empreintes des fichiers livrés.

Chargement : deux modèles simultanés au maximum ; géométrie distante d'abord, détails à proximité. La Tour Eiffel conserve son modèle détaillé plus loin pour rester lisible depuis le quartier. Matériaux, textures et géométries sont libérés à la sortie du pays. Les sauvegardes existantes et les huit pays restent compatibles.

Textures photographiques 1K CC0 de Poly Haven : [pavage](https://polyhaven.com/a/cobblestone_floor_08), [enduit](https://polyhaven.com/a/plastered_wall_02), [licence](https://polyhaven.com/license). Les URL exactes, auteurs et empreintes de téléchargement sont conservés dans `public/world/paris/textures/sources.json`. Le monument s'inspire de la [Tour Eiffel](https://www.toureiffel.paris/fr/le-monument).

## Vérification

- 188 tests automatisés passent et le build Vite réussit, après intégration des mises à jour du Labyrinthe déjà présentes sur main.
- Navigation dans les huit pays, retour au Nexus, construction, portes du refuge et de l'atelier, sauvegarde et absence de récompense au repli.
- Essais réels du rendu WebGL dans Edge : entrée dans les deux pièces, caméra à distance 24 maintenue, déplacement pendant le combat, aucun message d'erreur JavaScript observé.
- Essais React : avertissement ennemi, pause/reprise, garde, esquive, pouvoir, repli, rechargement et trajet depuis le journal jusqu'à l'achat au café.
- Émulation tactile 390 × 844 : mouvement au doigt à gauche, rotation à droite ; contrôle de l'affichage portrait et paysage. Ce contrôle n'est pas un essai sur un Samsung physique.
- Moteur serveur `world-engine` v9 actif : seul le reducer change par rapport à v8, pour les commandes `wait` et `provisions`. Le code relu après déploiement correspond au code local. Une requête non authentifiée reçoit 401. Aucun compte personnel n'a été utilisé pour ces essais.

La capture locale a atteint 60 images/seconde sur plusieurs vues ; cette mesure ne prédit pas les performances de tous les téléphones. Les corps et créatures proviennent de la bibliothèque existante, la végétation demeure stylisée et le quartier n'atteint pas le photoréalisme des images de référence. L'essai sur le Samsung de l'utilisateur et l'évaluation artistique en jeu restent nécessaires avant d'étendre cette qualité aux autres pays. La coopération Internet du monde ouvert et un nouveau catalogue complet de personnages sculptés ne font pas partie de ce quartier.


## Mise à jour du 12 septembre 2026
La tour et ses deux GLB ont été remplacés via Blender puis Meshopt. Voir [le bilan graphique mobile](MOBILE_GRAPHICS_2026-09-12.md) pour les sources, mesures, captures et limites actuelles.
