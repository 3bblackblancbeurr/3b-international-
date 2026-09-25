# 3B AAA MASTER — Hub V3 · Métropole évolutive

## Référence maîtresse

Le Hub du Monde du 3B doit reproduire la logique spatiale de la **Cité des Huit Héritages** validée par l’utilisateur : une métropole dense, verticale, traversée par l’eau et les transports, organisée autour de la Tour du Cercle Brisé mais **sans réduire la ville à un petit cercle de huit portes**.

Les huit portes sont dispersées dans la métropole et possèdent chacune une **esplanade d’héritage** reliée au quartier qui l’accueille. Les quartiers ont des fonctions réelles et les bâtiments ont des usages réels.

## Structure canonique

### Cœur
- Place de l’Héritage : arrivée, orientation, événements.
- Tour du Cercle Brisé : histoire, fragments, progression globale.

### Quartiers fonctionnels
- Archives de la Mémoire.
- Arène 3B.
- Quartier Commerce.
- Quartier Communauté.
- Innovation & IA.
- Docks & Transports.
- Portail Ville 3B.
- Jardins de l’Unité.

### Huit esplanades
- France / Justice.
- Algérie / Loyauté.
- Espagne / Passion.
- Maroc / Noblesse.
- Italie / Espoir.
- Tunisie / Courage.
- Turquie / Foi.
- Estonie / Sagesse.

Chaque esplanade est une vraie sous-zone architecturale, reliée au réseau urbain et au portail du pays. Elle indique visuellement si le Gardien est encore scellé, libéré ou si l’héritage du pays a été restauré.

## Verticalité

Le Hub possède trois niveaux de lecture :
1. sol : places, quais, rues, parcs et services ;
2. niveau haut : passerelles, ponts, gares, terrasses et liaisons entre quartiers ;
3. skyline : Tour, bâtiments repères, téléphériques, tyroliennes et silhouettes lointaines.

Les huit passerelles principales de V3 complètent le train, les bateaux, les téléphériques et les tyroliennes. Elles ne remplacent pas les déplacements au sol.

## Évolution visible de la Cité

La ville ne reste pas identique pendant toute l’aventure.

### Stade 0 — Fondations vivantes
Services essentiels ouverts. Les futurs grands services existent déjà dans le décor sous forme de bâtiments en veille ou en chantier.

### Stade 1 — Premiers liens
Après le premier héritage libéré, les quartiers Tier 1 s’activent, l’éclairage augmente et les flux de circulation progressent.

### Stade 2 — Réseau vivant
À trois héritages, davantage de passerelles hautes et de structures urbaines deviennent actives.

### Stade 3 — Cité des Héritages
À cinq héritages, les fonctions Tier 2 s’ouvrent et la métropole atteint sa densité principale.

### Stade 4 — Héritage uni
Avec les huit héritages restaurés, les huit esplanades sont pleinement illuminées, toutes les passerelles sont actives et la Tour devient le phare visuel de la ville.

## Règles non négociables

1. Le Hub est la seule grande zone totalement sûre.
2. Pas de monstres hostiles, dégâts, mort ou PvP sauvage dans le Hub.
3. Chaque grand bâtiment doit avoir une utilité réelle.
4. Les huit pays sont dispersés dans la ville, pas alignés autour d’un petit podium.
5. Aucune grande zone vide sans fonction.
6. Toute grande distance a une alternative à la marche.
7. La progression du joueur doit modifier visiblement la métropole.
8. Les Portes n’accordent jamais elles-mêmes une récompense : l’autorité gameplay reste dans le moteur et la sauvegarde.
9. Les PNJ importants conservent leur mémoire persistante.
10. Le rendu mobile doit préserver la composition de la ville en adaptant densité, LOD, trafic et effets, pas en remplaçant la ville par une version simplifiée différente.

## Implémentation V3

Source principale : `src/world/hub/data/hub-master-plan-v2.json`.

Ajouts V3 :
- `heritagePlatforms` : huit esplanades dispersées ;
- `verticalLinks` : huit passerelles structurantes ;
- `evolution.stages` : cinq états visibles de la ville ;
- `hubEvolutionState()` : état dérivé des héritages libérés/restaurés ;
- bâtiments en construction/actifs/prestige sans disparition brutale ;
- densité et trafic progressifs ;
- esplanades visuelles par pays ;
- arrivée panoramique sur la métropole ;
- HUD discret indiquant l’évolution de la Cité.

## Boucle de jeu

Connexion → Hub → préparation → quartier utile → Porte → royaume → mission/Gardien → fragment → retour Hub → **ville visiblement transformée** → nouveaux services/liaisons → prochaine Porte.

Cette boucle est la base du Monde du 3B.
