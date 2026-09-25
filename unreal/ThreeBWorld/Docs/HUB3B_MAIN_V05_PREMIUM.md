# Hub3B_Main_V05 — Cité des Huit Héritages Premium

## Référence maîtresse

La référence visuelle canonique est **La Cité des Huit Héritages** validée par l’utilisateur.

Cette référence impose une vraie métropole dense, verticale et fonctionnelle. Le Cercle Brisé est seulement le monument central de la ville. Le Hub n’est plus interprété comme un petit anneau avec huit Portes équidistantes.

## Map canonique

`/Game/3binternational/Maps/Hub3B_Main_V05`

Constructeur Unreal :

`Scripts/build_hub3b_main_v5.py`

Manifest :

`Data/Production/hub3b-main-v5-premium.json`

## Échelle

- largeur perçue : 1,8 km ;
- profondeur perçue : 1,4 km ;
- rayon jouable de référence : 650 m ;
- 10 grands pôles urbains ;
- 19 bâtiments canoniques utiles ;
- au moins 80 façades de Cité Origine dans le blockout premium ;
- 8 Portes dispersées à leurs coordonnées métropolitaines ;
- 10 landmarks principaux ;
- réseau d’eau, routes, 3B Express, téléphériques, tyroliennes et passerelles hautes.

## Quartiers

1. Place de l’Héritage — arrivée, orientation et événements.
2. Tour du Cercle Brisé — histoire, fragments et progression.
3. Archives de la Mémoire — lore, souvenirs et secrets.
4. Arène 3B — combat, mobilité et défis.
5. Quartier Commerce — boutique, craft, garage et contrats.
6. Quartier Communauté — groupes, coopération et événements.
7. Innovation & IA — IA Textile, Mode 3 IA, prototypes et puzzles Matrix.
8. Docks & Transports — bateaux, train, fret et exploration.
9. Portail Ville 3B — construction et accès à la ville personnelle.
10. Jardins de l’Unité — mémorial, refuge, nature et contemplation.

## Huit Portes dispersées

- France / Justice / Céliane — Tribunal 3B.
- Algérie / Loyauté / Yliane — Maison des Alliances.
- Espagne / Passion / Diego — Scène de la Passion.
- Maroc / Noblesse / Naël — Atelier des Savoir-Faire.
- Italie / Espoir / Alessio — Maison de la Reconstruction.
- Tunisie / Courage / Soraya — Poste de Sauvetage Maritime.
- Turquie / Foi / Émir — Observatoire des Liens.
- Estonie / Sagesse / Eira — Tour des Données.

Les Portes ne sont pas placées à intervalles réguliers de 45°. Elles vivent dans leurs quartiers et sont reliées à la ville par les rues, les transports et les passerelles.

## Verticalité

La V05 possède plusieurs niveaux lisibles :

- niveau bas : docks, canaux, rues et quais ;
- niveau ville : places, commerces, logements et bâtiments utiles ;
- niveau haut : passerelles, terrasses, stations et accès intermédiaires ;
- skyline : Tour du Cercle Brisé, flèches, tours, téléphériques et grands repères.

Les hauteurs de quartier sont codées dans le manifest V05 afin d’éviter une ville plate.

## Eau

Le réseau d’eau est structurel :

- Bassin de l’Héritage ;
- Cascade du Cercle ;
- Canal des Docks ;
- Chutes de l’Unité ;
- Canal des Horizons.

L’eau sert la lecture spatiale, la verticalité et les transports. Elle n’est pas seulement décorative.

## Cité Origine

Le tissu de remplissage est fonctionnel. Les façades correspondent à :

- logements ;
- restauration ;
- ateliers ;
- école ;
- clinique ;
- petits commerces ;
- salles de guilde ;
- services publics.

Aucun grand bâtiment visible n’est censé exister sans raison de gameplay, de narration, de service, de transport ou de progression.

## Évolution 0 → 8 fragments

0. Cité blessée.
1. Le cœur se rallume.
2. Premier axe restauré.
3. Quartiers bas restaurés.
4. La Tour se transforme.
5. Nouveaux services et compagnons.
6. La Cité réagit.
7. Au-delà des Gardiens.
8. Cercle restauré et ouverture de l’acte final lié au Monstre de l’Oubli.

## Boucle de jeu

Connexion → Hub → préparation → quartier utile → Porte → royaume → mission → Gardien → fragment → retour → transformation visible de la métropole → nouveaux accès/services → prochaine Porte.

## Lois non négociables

- Hub = seule grande zone totalement sûre.
- Aucun monstre hostile, dégât, mort normale ou PvP sauvage dans le Hub.
- Les huit Portes restent dispersées dans la métropole.
- Le Cercle Brisé est un monument central, pas la ville entière.
- Aucun grand vide décoratif inutile.
- Chaque grand bâtiment a une fonction réelle.
- Les PNJ importants conservent leur mémoire.
- Le joueur incarne son propre personnage ; Kaïs reste le héros central.
- L’arsenal reste limité aux 16 armes canoniques.
- Mobile et desktop montrent la même ville ; seuls densité, LOD, ombres, trafic et effets s’adaptent.

## Ancienne V4

`Hub3B_Main_V04` reste un prototype historique de plateforme radiale. Son anneau, ses spokes, ses pétales et ses Portes à 45° ne représentent plus le Hub canonique.

## Construction

Fermer Unreal Engine puis lancer :

`LANCER_HUB_3B.bat`

Le lanceur utilise le flag :

`-3BHubV5AutoBuild`

Le script construit uniquement `Hub3B_Main_V05`, valide les comptes structurels puis cadre la caméra de présentation sur la métropole.
