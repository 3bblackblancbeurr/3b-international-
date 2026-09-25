# 3B AAA MASTER — La Cité des Huit Héritages

## Statut

Conception canonique V3 en implémentation : métropole pilotée par données, huit esplanades dispersées, verticalité et évolution visible.

L’image validée de la Cité des Huit Héritages fixe la composition visuelle, l’échelle perçue, la verticalité, les ponts, l’eau, les grands quartiers, la Tour du Cercle Brisé et la dispersion des huit portes. Les textes générés visibles dans l’image sont illustratifs : le canon officiel reste celui du projet, avec Céliane/Justice, Yliane/Loyauté, Diego/Passion, Naël/Noblesse, Alessio/Espoir, Soraya/Courage, Émir/Foi et Eira/Sagesse.

## Vision

La plateforme initiale n’est plus une petite place entourée de portails. Elle devient une métropole-hub ouverte, vivante et évolutive, en noir profond, or champagne et bleu Matrix.

Promesse joueur :

> Entrer pour une mission, rester pour explorer, revenir pour découvrir ce qui a changé.

## Les dix pôles majeurs

1. Place de l’Héritage — arrivée, orientation, événements et premières missions.
2. Tour du Cercle Brisé — histoire, fragments, carte du monde et progression.
3. Archives de la Mémoire — lore, souvenirs, énigmes et Cartes Vivantes.
4. Arène 3B — combat, mobilité, défis et entraînement.
5. Quartier Commerce — boutique, craft, garage, équipements et contrats.
6. Quartier Communauté — groupes, coopération, événements et expositions.
7. Quartier Innovation et IA — IA Textile, Mode 3 IA, avatar et prototypes.
8. Docks et Transports — train, bateaux, fret, sauvetage et exploration aquatique.
9. Portail Ville 3B — construction, visites, trophées et habitants invités.
10. Jardins de l’Unité — nature, mémorial, animaux, calme et secrets.

## Échelle et streaming

- territoire perçu : environ 1,8 km × 1,4 km ;
- cellules de 120 à 160 mètres ;
- trois niveaux verticaux maximum ;
- trois cellules actives sur Android moyen ;
- quatre sur Android haut de gamme ;
- jusqu’à six sur PC ;
- horizons et silhouettes lointaines pour amplifier la profondeur ;
- intérieurs lourds chargés dans des cellules séparées.

Ces valeurs sont des budgets de départ à mesurer, pas des garanties finales.

## Règles absolues

1. Chaque quartier possède une fonction claire.
2. Chaque grand bâtiment offre un service, une mission, un secret, une progression ou une activité.
3. Chaque porte annonce déjà l’identité de son pays avant son franchissement.
4. Chaque grande distance possède une alternative à la marche.
5. Chaque zone contient au minimum une activité, une mission, un secret, une récompense et un point visuel fort.
6. La collection de personnages existe réellement dans le monde.
7. Les actions de Kaïs changent visiblement les quartiers.
8. La densité artistique ne doit jamais détruire les performances mobiles.
9. Les huit pays ne sont jamais le même décor recoloré.
10. Aucun élément n’est considéré terminé sans build, test et validation mobile réelle.

## Blockout Tier 0

À construire avant les modèles détaillés :

1. Place de l’Héritage ;
2. Tour du Cercle Brisé ;
3. Archives de la Mémoire ;
4. Gare du 3B Express ;
5. Gare maritime ;
6. Portail Ville 3B ;
7. Porte France ;
8. Porte Algérie.

## Première tranche jouable

Durée cible : 15 à 25 minutes.

Parcours :

1. arrivée sur la Place ;
2. orientation et premier PNJ ;
3. trajet en train ;
4. visite des Archives ;
5. première mission et premier Écho ;
6. trajet vers les Docks ;
7. utilisation d’un bateau ;
8. découverte des approches France et Algérie ;
9. récompense ;
10. sauvegarde ;
11. retour vers Ville 3B.

## Données versionnées

Le dossier `src/world/hub/data/` contient :

- `hub-master-plan-v2.json` ;
- `npcs-v1.json` ;
- `missions-v1.json` ;
- `events-v1.json` ;
- `secrets-v1.json`.

Ces fichiers ne signifient pas que les systèmes sont déjà implémentés. Ils constituent la source de vérité exploitable pour les prochains lots de code.


## Évolution V3

La ville possède désormais cinq stades visuels pilotés par les héritages libérés/restaurés. Les bâtiments futurs restent présents sous forme de structures en veille ou en chantier, puis s'activent, gagnent des lumières, des balises et des couronnes de prestige. Les huit esplanades de pays restent dispersées à leurs positions métropolitaines et les passerelles hautes s'ouvrent progressivement. Voir `22_HUB_EVOLUTION_V3.md`.
