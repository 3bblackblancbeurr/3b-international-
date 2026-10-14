# Revue Claude — mobile et référence France, 14 octobre 2026

Trois réponses ont été obtenues dans une conversation Claude connectée, avant
la finalisation de cette seconde passe. Les extraits précis du contrôleur et du
rendu, les modifications proposées et la description du village ont été transmis.
Claude a explicitement indiqué ne pas avoir ouvert le dépôt, la PR ou les images.
Ses propositions ont été confrontées au code et aux tests ; elles ne constituent
pas une validation indépendante du jeu complet.

## Constats retenus et vérifiés

- Le seuil ancien de 45 FPS dégradait un mobile stable à 30 FPS ; reproduit avec
  le contrôleur, puis couvert par dix minutes de fenêtres stables simulées.
- Un gel isolé pouvait faire baisser brutalement la qualité. Le mobile sépare
  désormais les événements longs et la surcharge persistante.
- La multiplication de la résolution par le facteur automatique après le passage
  fluide provoquait une marche excessive. Les paliers mobiles sont absolus.
- Les changements de profil/terrain/résolution peuvent eux-mêmes créer du travail.
  Reprise sans mouvement, délais, garde-fous et redimensionnement conditionnel.
- Les temps du moteur sont CPU ; les compteurs de réflexion doivent être inclus.
  Le diagnostic borné exporte le contexte sans télémétrie ni données du compte.

## Choix différés

Pas de compilation anticipée du monde complet, de refonte globale de React ou
 de changement de moteur sans trace du téléphone reliant une cause au gel.
Pas de plafonnement artificiel à 30 FPS. Pas de nouveaux effets pour masquer
un terrain répétitif. Pas de déplacement arbitraire des bâtiments : le partage
client/serveur des collisions, les identifiants et les sauvegardes restent des
contraintes de toute future amélioration de l'implantation.

## Direction de la référence artistique

Quatre vues fixes du même hameau alpin, à la même heure et même résolution,
avec streaming terminé et budgets visibles. D'abord améliorer la cohérence du
sol et des matériaux, puis les parcelles et la circulation avec collisions
partagées, puis la végétation sous budget constant. Comparer à hauteur du joueur
avant d'étendre cette direction aux autres secteurs. Les captures présentes
sont une base de comparaison ; le téléphone et l'approbation visuelle restent
à valider avant Hub, France et extension.
