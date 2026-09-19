# 3B AAA MASTER — PLAN COTÉ DU HUB V0

## Statut

Plan de blockout logique et testable. Les coordonnées sont des valeurs de départ destinées à vérifier l’échelle, les temps de trajet et les performances ; elles ne remplacent pas une validation artistique en jeu.

## Dimensions

- largeur : 1 600 m ;
- profondeur : 1 300 m ;
- cellules recommandées : 200 m ;
- centre logique : Place de l’Héritage ;
- Tour du Cercle Brisé au nord du centre ;
- Docks et Ville 3B au sud ;
- Archives au nord-ouest ;
- Innovation au nord-est ;
- Jardins au sud-ouest ;
- Commerce et Arène à l’est.

## Centres des quartiers

| Quartier | X | Z | Altitude de départ |
|---|---:|---:|---:|
| Place de l’Héritage | 0 | 80 | 0 |
| Tour du Cercle Brisé | 0 | -165 | 18 |
| Archives | -330 | -245 | 28 |
| Communauté | -255 | -20 | 8 |
| Arène | 310 | -45 | 14 |
| Commerce | 265 | 170 | 4 |
| Innovation | 330 | -285 | 42 |
| Docks | -125 | 410 | -6 |
| Jardins de l’Unité | -410 | 290 | 16 |
| Ville 3B | 235 | 410 | 2 |

## Position des huit Portes

| Porte | X | Z | Altitude |
|---|---:|---:|---:|
| France | -650 | -255 | 42 |
| Algérie | 645 | 430 | 18 |
| Maroc | -655 | 250 | 10 |
| Tunisie | 650 | 230 | 24 |
| Espagne | -650 | -30 | 20 |
| Italie | 630 | -40 | 38 |
| Turquie | 610 | -390 | 64 |
| Estonie | -165 | -545 | 58 |

Les ancrages sont volontairement dispersés ; la distance minimale entre deux portes est contrôlée automatiquement.

## Bâtiments Tier 0

- Place d’arrivée : 150 × 120 m ;
- Tour du Cercle Brisé : base 78 × 78 m, hauteur cible 280 m ;
- Archives : 145 × 110 m ;
- gare 3B Express : 120 × 48 m ;
- gare maritime : 150 × 72 m ;
- Porte France : 60 × 34 m, hauteur 88 m ;
- Porte Algérie : 68 × 38 m, hauteur 94 m ;
- Portail Ville 3B : 138 × 100 m.

## Réseau de déplacement

### Train

Boucle : Place → Tour → Archives → Communauté → Jardins → Docks → Ville 3B → Commerce → Arène → Innovation → Tour → Place.

Vitesse de blockout : 28 m/s. Le train doit offrir un avantage réel par rapport à la marche, tout en permettant un tour panoramique et des missions à bord.

### Bateau

Boucle : Docks → Ville 3B → Place → Jardins → Docks.

Vitesse de blockout : 14 m/s. L’eau devient une route de gameplay, pas un simple décor.

### Téléphériques

- Place → Innovation ;
- Docks → Tour ;
- Jardins → Archives.

### Tyroliennes

- Archives → Place ;
- Arène → Commerce ;
- Jardins → Docks.

### Véhicules

- boulevard intérieur : Place, Commerce, Arène, Communauté ;
- boulevard extérieur : Archives, Innovation, Docks, Ville 3B, Jardins.

## Vitesses de départ

- marche : 4,6 m/s ;
- course : 7,2 m/s ;
- sprint : 9,2 m/s ;
- véhicule : 18 m/s ;
- train : 28 m/s ;
- bateau : 14 m/s ;
- téléphérique : 10 m/s ;
- tyrolienne : 22 m/s.

Ces valeurs doivent être réglées après mesure réelle sur Samsung et observation du ressenti, pas seulement selon les tests automatisés.

## Règles de blockout

1. Commencer uniquement par des volumes simples.
2. Vérifier portes, trottoirs, marches, routes et véhicules à échelle humaine.
3. Mesurer tous les temps de trajet.
4. Ajouter un événement ou un point d’intérêt sur les longs parcours.
5. Valider caméra et collision avant les textures finales.
6. Charger les quartiers par cellules.
7. Ne jamais charger les huit pays complets dans le hub.
8. Ne pas densifier les PNJ avant les budgets FPS.

## Critères de validation

- carte perçue comme grande sans devenir fatigante ;
- aucune porte en cercle ou trop proche d’une autre ;
- huit bâtiments Tier 0 présents ;
- train et bateau plus rapides que la marche ;
- chaque quartier accessible à pied et par transport ;
- 30 FPS Android moyen visés ;
- build et tests verts ;
- validation mobile réelle avant fusion de l’intégration visuelle.
