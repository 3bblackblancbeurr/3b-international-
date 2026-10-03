# Crée ma Ville 3B — caméra tactile et lisibilité

## Décision du 4 octobre 2026

La caméra se contrôle sur le terrain, sans boutons de vue ni joystick superposé.
Un doigt déplace la ville en exploration et positionne les constructions dans les outils.
Pendant la construction, maintenir un doigt 350 ms puis glisser déplace la caméra sans poser de bâtiment. Pincer zoome, tourner deux doigts pivote, faire glisser deux doigts ensemble verticalement incline la vue jusqu'au ciel.
Deux doigts prennent toujours la priorité sur la construction. Après un geste multiple, aucun placement ne se termine avant de lever tous les doigts et de commencer un nouveau geste.

## Références consultées et adaptation

| Référence officielle | Principe documenté | Adaptation 3B |
| --- | --- | --- |
| [Google Earth Android](https://support.google.com/earth/answer/7364447?co=GENIE.Platform%3DAndroid&hl=en-GB) | Déplacement à un doigt ; pincement ; rotation ; inclinaison verticale à deux doigts | Commandes tactiles sur le terrain, disponibles dans tous les outils |
| [Apple Plans](https://support.apple.com/en-mide/guide/iphone/ipha937272d1/ios) | Déplacement direct, pincement et rotation à deux doigts | Gestes usuels plutôt qu'une rangée permanente de boutons |
| [Farthest Frontier](https://www.farthestfrontier.com/guide/about/basics/) | Outils contextuels, raccourcis, caméra souris et masquage de l'interface | Catalogue fermé lors du placement ; panneaux temporairement invisibles pendant la navigation |
| [Cities: Skylines II](https://www.paradoxinteractive.com/zh-CN/games/cities-skylines-ii/features/cinematic-camera-photo-mode) | Caméra libre, collision de caméra et interface masquée pendant les cinématiques | Protection contre le passage sous le terrain ; accès au ciel sans écran de réglages |
| [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) | Rotation, zoom, déplacement, limites et amortissement | Contrôles souris conservés ; gestes tactiles gérés séparément pour éviter les conflits |
| [Three.js Responsive Design](https://threejs.org/manual/pages/responsive.html) | Rapport d'aspect adapté ; maîtrise de la résolution interne sur mobile | Cadrage qui tient compte du portrait et du paysage ; budget de rendu adaptatif existant conservé |

Les seuils et le comportement des panneaux sont des choix de conception 3B, pas des performances démontrées par ces références.

## Réalisation

- Suppression de toute la barre de caméra, des boutons Incliner/Ciel/Recentrer/Vue dégagée et des modes qu'elle imposait.
- Reconnaissance de l'inclinaison à deux doigts : mouvement parallèle vertical, seuil de décision et verrouillage du geste pour éviter les rotations involontaires entre les deux événements de doigts.
- Pincement et rotation conservent leur ancrage sous les doigts. Le passage de deux doigts à un seul ne déclenche aucune construction.
- Le pivot se soulève pour regarder le ciel, puis redescend lorsque le joueur revient à une vue plongeante.
- Les panneaux, le conseiller et les notifications de chantier s'effacent pendant la navigation, puis reviennent lorsque les doigts sont levés. Les ressources deviennent discrètes.
- Cadrage automatique d'un bâtiment choisi à partir des limites réelles de sa géométrie, avec marge centrale et correction selon le rapport d'aspect.
- Mairie : hauteur de référence minimale de 11,5 unités ; 17 unités sur la parcelle de 12 × 10, contre 11,5 précédemment. Maisons et bâtiments publics rehaussés selon leur rôle. Catalogue et jeu utilisent le même calcul.
- Herbe plus verte, eau plus turquoise et ciel plus bleu dans les matériaux existants.

Les anciennes parcelles enregistrées conservent leur largeur et leur profondeur pour respecter les routes et les collisions. Cette modification renforce leur hauteur et leur cadrage ; elle ne migre pas leur surface au sol. Les grandes parcelles du catalogue dépendent de la migration architecturale déjà présente dans le dépôt et de son application sur le serveur.

## Vérification

140 tests du module ville passent, dont les gestes tactiles, l'absence de placement accidentel, le retour du ciel, le cadrage en portrait/paysage et les dimensions des bâtiments. La compilation de production passe.

Reste à mesurer sur un Samsung réel : régularité des images, reconnaissance des gestes, chauffe et confort en session prolongée. Le terme AAA exprime une ambition visuelle ; ces tests ne certifient pas une qualité AAA ni 60 images/s sur chaque appareil.
