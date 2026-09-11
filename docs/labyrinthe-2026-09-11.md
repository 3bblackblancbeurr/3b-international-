# Jeux 3B — Labyrinthe et catalogue

Le catalogue présente quatre cartes illustrées au même format : Kaïs contre les Ombres, la Tour, le Labyrinthe et la Course des clés. Le Dernier Refuge et les Villes retrouvées ne sont plus accessibles dans l’application. Le lien original de la Course des clés reste identique ; son jeu externe ne change pas.

La campagne, les paramètres progressifs et le nouveau personnage sont documentés dans [Labyrinthe — 100 niveaux](labyrinthe-campagne-100.md). Les valeurs ci-dessous décrivent la première version de la refonte.

## Conception du Labyrinthe

Une partie commence dans un sanctuaire sûr. Il faut retrouver les sceaux de Mémoire, Courage et Lien dans trois salles éloignées, puis revenir au portail. Les labyrinthes de 29 × 21 cases sont générés avec des boucles, quatre salles et deux raccourcis facultatifs. Tous les objectifs et les ressources restent accessibles dès le départ.

Les murs cachent réellement le joueur à l’ombre. Celle-ci patrouille, réagit à une ligne de vue dégagée ou aux déplacements proches, recherche la dernière position repérée pendant cinq secondes, puis reprend sa patrouille. Elle ne suit pas un joueur invisible et silencieux à travers toute la carte. Le sanctuaire est protégé. Un contact retire 34 points de vitalité et laisse 2,2 secondes pour s’échapper. Chaque sceau restitue 34 points de vie et 30 unités de lumière ; les cinq lanternes restituent chacune 38 unités.

L’éclat (E / Espace / bouton tactile) coûte 12 unités de lumière et se recharge en neuf secondes. Il repousse une ombre située à huit pas ou moins et révèle les sept premiers pas d’un vrai chemin vers le prochain objectif. À proximité d’un levier, la même action ouvre son passage sans consommer de lumière, même pendant la recharge.

La carte (M / bouton Carte) montre seulement les découvertes et arrête la simulation, les ennemis, l’énergie et les délais de recharge. La mini-carte reste visible pendant l’exploration. Les trois sceaux, la vitalité, l’énergie et l’état de l’ombre ont des indicateurs persistants. La fin de partie rappelle le score, les sceaux, la part explorée et les passages ouverts.

## Rendu et intégration

- Atlas de ruines original : dallages, mousse, murs et mosaïque du sanctuaire. Généré avec l’outil intégré `image_gen.imagegen`, puis encodé en WebP (595 462 octets, 1254 × 1254). Brief artistique : atlas carré 2 × 2, vue du dessus, pierre gris bleu et cuivre, sol moussu, maçonnerie sombre et mosaïque solaire en bronze, sans texte.
- Asset livré : `public/games/maze-ruins.webp`. Les personnages et le portail utilisent les illustrations existantes.
- Relief des murs, halo des lanternes, sceaux distincts, traces, impulsion lumineuse et caméra interpolée. Seules les cases du champ de la caméra sont dessinées.
- Rendu Canvas 2D séparé du moteur, simulation fixe à 60 Hz avec rattrapage limité, clavier et gestes tactiles, pavé directionnel sur mobile et cadrage adapté au paysage.
- L’ancien atlas de sol n’est plus chargé par le lecteur. L’illustration de tour partagée reste nécessaire au décor de la Tour. Aucun service ni dépendance ajouté.
- Les anciennes sauvegardes restent importables, y compris les données historiques des jeux retirés. Leurs moteurs demeurent dans les sources pour la compatibilité des tests historiques ; ils ne sont plus importés par le lecteur.

## Vérification

Tests automatisés : 200 cartes accessibles, objectifs distincts, bordures fermées, lignes de vue, poursuite/recherche, zone sûre, protection après contact, coûts/recharge, indices cohérents avec les couloirs, ouverture des raccourcis et pause de la carte. Trente parties simulées réussissent avec déplacements et éclats normaux, sans modifier la vie ni téléporter le personnage. Ces simulations connaissent les chemins ; elles vérifient la faisabilité et ne mesurent pas la difficulté pour un nouveau joueur.

Parcours navigateur : les trois jeux intégrés en 1440 × 1000 et 390 × 844, ainsi que le Labyrinthe en 844 × 390. Contrôles du catalogue à quatre cartes, du lien original, du lancement, de l’action, de la carte et de son arrêt du temps, de la pause/reprise, du retour aux jeux, du rendu et des débordements. Les écritures de sauvegarde sont isolées pendant les tests. Le tactile est émulé dans Edge ; aucun téléphone physique n’a été utilisé.
