# Jeux 3B — amélioration du 11 septembre 2026

Cette mise à jour concerne les cinq jeux de la rubrique Jeux 3B. Le lien, la carte et le jeu externe « La course des clés » sont conservés.

## Changements jouables

- **Kaïs contre les Ombres** : esquive dans la dernière direction choisie, traînée, séries de victoires avec multiplicateur, jauge d’expérience, vie du gardien, signalement des ennemis hors champ sur téléphone. Densité et vitesse des vagues plafonnées pour conserver des possibilités d’esquive jusqu’aux huit gardiens.
- **Tour des portes interdites** : portes sélectionnables dans le décor ou avec 1/2/3, informations sur leurs risques, animation d’attaque, fenêtre de parade lisible. Parer dans les 350 ms avant l’impact ouvre une contre-attaque double, utilisable une seule fois pendant 1,5 seconde. F pour parer, Espace pour frapper.
- **Labyrinthe de l’Oubli** : caméra interpolée, relief des murs, chemin parcouru, mini-carte des zones découvertes, indicateur d’exploration, alerte de proximité de l’ombre et onde lumineuse. L’action tient compte du délai de recharge et de la proximité d’un interrupteur.
- **Dernier Refuge** : fortifications et habitants animés, éclairages, jauge du cycle, action contextuelle pour récolter, secourir ou réparer. Les postes visent les menaces proches de la porte dans leur portée ; les attaques de Kaïs ont aussi une portée définie. Les types de construction inconnus sont refusés.
- **Villes retrouvées** : rues avec embranchements et carrefours, modification de forme, rotation accessible sur téléphone, aperçu des connexions, suggestion de case, annulation conservant la sélection, tuiles et rues animées. Les nouvelles mains proposent les bâtiments nécessaires. Les quatre maisons, deux jardins et un monument peuvent effectivement être reliés dans les huit pays.

## Socle partagé

La simulation avance par pas de 1/60 seconde avec rattrapage limité. Le rendu est indépendant, utilise les images existantes et respecte la préférence de réduction des mouvements décoratifs. Chaque partie dispose d’un écran de départ, de commandes de pause et de son, d’un plein écran lorsque le navigateur le permet, de commandes tactiles et clavier. Les sons synthétisés se déclenchent seulement après activation. Aucun nouveau service ni nouvelle dépendance n’a été ajouté.

Les sauvegardes au format existant restent lisibles. La validation accepte maintenant les rues à trois ou quatre sorties ; les nouvelles sauvegardes de villes nécessitent donc cette version ou une version ultérieure.

## Vérifications

- Compilation Vite réussie.
- Tests de logique : fréquence de simulation, esquive, parade/contre-attaque, actions contextuelles, ciblage, sauvegardes, construction et restauration complète des huit villes.
- Parcours navigateur des cinq jeux à 1440 × 1000 et 390 × 844 : lancement, mouvement/action, rendu non vide, pause/reprise, retour au menu et absence d’erreur JavaScript.
- Une ville restaurée par 13 placements tactiles réels puis rouverte depuis la sauvegarde de test. Les tests du navigateur isolent les écritures de sauvegarde : aucune progression de joueur réel n’est utilisée.
- Essais simulés sur six graines : cinq victoires de Kaïs jusqu’aux huit gardiens, six tours terminées, six premiers cycles du refuge terminés. Ce sont des contrôles de jouabilité, pas une mesure du taux de victoire des joueurs.

Le rendu reste un jeu 2D sur Canvas, avec les illustrations existantes. Les performances sur un téléphone physique et l’expérience sonore réelle restent dépendantes de l’appareil ; la vérification mobile a utilisé un navigateur avec viewport et interactions tactiles simulés.
