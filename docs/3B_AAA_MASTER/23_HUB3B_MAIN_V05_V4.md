# Hub3B_Main_V05 — V4 · Cité des Huit Héritages jouable

## Référence maîtresse

La ville doit suivre la logique visuelle de la **Cité des Huit Héritages** validée par l’utilisateur : une métropole dense, verticale, fonctionnelle, traversée par l’eau et les transports, avec huit Portes réellement dispersées dans différents quartiers.

Le petit Nexus circulaire à huit cases n’est pas une représentation canonique du Hub. Le Cercle Brisé est un monument du centre de la ville, pas la ville entière.

## Structure jouable

Le Hub est la seule grande zone totalement sûre. La ville est organisée en cinq couches lisibles :

1. **Cœur central** — Place de l’Héritage + Tour du Cercle Brisé.
2. **Cité Origine** — logements, restauration, ateliers, écoles, cliniques, petits commerces, services publics et salles de guilde.
3. **Quartiers fonctionnels** — Archives, Arène, Commerce, Communauté, Innovation & IA, Docks, Ville 3B et Jardins.
4. **Huit esplanades dispersées** — chaque pays possède une architecture, un service local utile et une Porte.
5. **Horizon métropolitain** — skyline, ponts, voies d’eau, téléphériques, tyroliennes, trains et repères visibles de loin.

## Huit esplanades fonctionnelles

- France / Justice — **Tribunal 3B** : enquêtes, arbitrages, archives et entraînement tactique.
- Algérie / Loyauté — **Maison des Alliances** : serments, protection et confiance.
- Espagne / Passion — **Scène de la Passion** : sport, défis, spectacles et événements.
- Maroc / Noblesse — **Atelier des Savoir-Faire** : forge, textile, craft et équipement.
- Italie / Espoir — **Maison de la Reconstruction** : ingénierie, soins et restauration.
- Tunisie / Courage — **Poste de Sauvetage Maritime** : sauvetage, navigation et missions côtières.
- Turquie / Foi — **Observatoire des Liens** : histoire, énigmes, passages anciens et constellations.
- Estonie / Sagesse — **Tour des Données** : cartographie, données, IA et exploration.

## Repères de skyline

Chaque quartier possède un landmark visible et atteignable. La **Flèche du Cercle Brisé** domine la ville. Les autres repères permettent au joueur de s’orienter sans ouvrir constamment la carte.

## Eau

La V4 matérialise un vrai réseau d’eau :
- Bassin de l’Héritage ;
- Cascade du Cercle ;
- Canal des Docks ;
- Chutes de l’Unité ;
- Canal des Horizons.

L’eau doit structurer les niveaux et les vues, pas devenir une barrière artificielle.

## Transports visibles

Les transports ne sont plus uniquement des arrêts : leurs liaisons ont une présence physique dans la ville.

- rail du **3B Express** ;
- lignes de téléphérique ;
- tyroliennes ;
- bateaux et canaux ;
- passerelles hautes.

Toute grande distance doit posséder une alternative à la marche.

## Évolution exacte 0 → 8 fragments

- 0 — **Cité blessée**.
- 1 — **Le cœur se rallume**.
- 2 — **Premier axe restauré**.
- 3 — **Quartiers bas restaurés**.
- 4 — **La Tour se transforme**.
- 5 — **Nouveaux services et compagnons**.
- 6 — **La Cité réagit**.
- 7 — **Au-delà des Gardiens**.
- 8 — **Cercle restauré** et ouverture de l’acte final lié au Monstre de l’Oubli.

Chaque progression doit modifier visiblement la métropole au retour du joueur.

## Boucle de jeu

Connexion → Hub → préparation → quartier utile → Porte → royaume → mission → Gardien → fragment → retour au Hub → transformation visible → nouveaux accès/services → prochaine Porte.

## Règles non négociables

- Le Hub est sûr : pas de monstres hostiles, dégâts, mort ou PvP sauvage.
- Aucun grand bâtiment visible sans fonction réelle.
- Aucun grand vide décoratif sans usage.
- Les huit Portes restent dispersées dans la métropole.
- Le joueur incarne son propre personnage ; Kaïs reste le héros central de l’histoire.
- Les PNJ importants conservent une mémoire persistante.
- L’arsenal canonique reste limité aux 16 armes validées.
- Mobile et desktop montrent la même ville ; seuls densité, LOD, trafic et effets s’adaptent.
- Les Portes ne donnent jamais directement de récompense : l’autorité reste dans le moteur de jeu et la sauvegarde.

## Implémentation V4

Sources principales :
- `src/world/hub/data/hub-master-plan-v2.json`
- `src/world/hub/metropolis.js`
- `src/world/premium-hub-visuals.js`
- `src/world/scene.js`

La V4 ajoute notamment :
- 10 places civiques ;
- 10 landmarks de quartier ;
- 5 éléments du réseau d’eau ;
- rails/câbles physiques des transports ;
- usages réels pour le tissu urbain de la Cité Origine ;
- signatures architecturales distinctes pour les huit esplanades ;
- paliers narratifs exacts de 0 à 8 fragments ;
- panorama automatique de la Cité quand une progression d’héritage transforme le Hub.

Cette V4 constitue la base de **Hub3B_Main_V05**.
