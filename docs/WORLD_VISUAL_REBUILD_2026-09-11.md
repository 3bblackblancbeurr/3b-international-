# Monde 3B — Refonte du cadrage et des quartiers

## Diagnostic vérifié dans l’application publique

Les monuments existaient, mais le sommet de la Tour Eiffel était hors du cadre à l’arrivée. Le terrain jouable avait un rayon de 132 unités et les pays comportaient environ 20 à 26 maisons. Les façades reposaient sur une masse pleine avec des fenêtres posées en surface. Le ciel procédural, souvent peu visible, avait des nuages très simplifiés.

## Modifications

- Rayon explorable de 260 unités : environ 3,88 fois la surface précédente. Le terrain visible se prolonge au-delà, jusqu’aux reliefs lointains.
- Trois prolongements reliés aux rues existantes : quartier ancien, faubourg artisanal et village. Ils disposent de repères dans l’Atlas, sans récompenses fictives.
- Effectifs des maisons générées : France 122, Italie 125, Estonie 120, Turquie 126, Algérie 124, Tunisie 121, Maroc 122, Espagne 123. Les services et le refuge s’ajoutent à cet inventaire.
- Façades reconstruites par travées : piédroits, allèges, vitrages en retrait, encadrements, corniches en saillie, garde-corps, volets, gouttières et toitures régionales. La taille des textures de maçonnerie dépend des dimensions physiques, au lieu d’étirer une texture sur toute une façade.
- Nouvelle perspective d’exploration : champ de vision de 60°, regard plus horizontal, distance choisie conservée. Migration de l’ancien angle par défaut, sans écraser les angles personnalisés.
- Monuments déplacés au bout d’une perspective dégagée. Leurs hauteurs complètes sont vérifiées dans le cadrage d’arrivée des huit pays.
- Maison des mondes au Nexus : volumes contemporains, verrières, brise-soleil et signature 3B. Extérieur uniquement à ce stade.
- Ciel HDR Kloppenheim 06 de Greg Zaal / Poly Haven, CC0, 1,49 Mo. Reflets issus du même environnement, éclairage direct plus lisible et secours procédural en cas de chargement indisponible.
- Occlusion ambiante GTAO à demi-résolution, calculée depuis la profondeur réellement rendue, avec débruitage. Activée en Détail et en Automatique sur les écrans larges tant que la résolution le permet. Le mode Fluide et l’automatique sur téléphone conservent le rendu direct.
- La qualité automatique ignore les trois premières secondes de préparation d’un pays : la compilation des matériaux ne doit pas provoquer une réduction permanente de résolution.

## Limites artistiques et fonctionnelles

Le résultat est un jeu stylisé plus étendu, avec des constructions procédurales. Il n’atteint pas le réalisme des images de référence. Les monuments restent des interprétations simplifiées, pas des scans photogrammétriques. Les nouveaux quartiers étendent l’exploration ; ils ne contiennent pas encore un ensemble complet de commerces visitables ou de métiers simulés.

Les combats, récompenses, sauvegardes et règles de progression sont conservés. Le combat continu en déplacement libre, les intérieurs complets, les animations de haute fidélité et le monde coopératif Internet restent des chantiers séparés. Cette livraison ne les déclare pas terminés.

## Sources

- Matériaux PBR Three.js : https://threejs.org/docs/pages/MeshStandardMaterial.html
- Ciel : https://polyhaven.com/a/kloppenheim_06
- Licence du ciel : https://polyhaven.com/license
- Références propres aux monuments : src/world/heritage.js.

Les mesures de fluidité de cette livraison proviennent d’Edge local. Les dimensions 390 × 844 et les gestes tactiles sont émulés ; elles ne constituent pas un benchmark de téléphone physique.

## Validation de cette refonte

- Suite d’intégration : 174 tests réussis, dont conservation de la progression et des autres jeux de l’application.
- Tests du cadrage : hauteur complète des huit monuments à l’arrivée ; conservation du zoom et des angles personnalisés ; terrain aplani dans leur perspective.
- Essai des neuf régions dans Edge : 60 images/seconde observées sur l’ordinateur de test, résolution à 100 % après correction de la mesure pendant le chargement. Le résultat dépend du matériel.
- Marche réelle jusqu’à un quartier ajouté au-delà de l’ancienne limite, mode Détail avec occlusion ambiante et mode automatique sur écran étroit sans ce traitement.
- Interface : frappe, esquive, contre-attaque, repli, sauvegarde après rechargement, commandes à l’écran dans un format 390 × 844.
- Caméra : changement de direction au clavier et au doigt, regard manuel, mode libre, reprise du suivi, conservation d’un zoom choisi à 36 unités.
- Compilation de production réussie. Les avertissements existants sur les bundles principaux de plus de 500 Ko restent présents.
