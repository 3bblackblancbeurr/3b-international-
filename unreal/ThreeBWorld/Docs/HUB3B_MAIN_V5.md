# Hub principal 3B V5 — La Cité des Huit Héritages

## Statut

**Gold Master architectural canon — 24/09/2026**

La V5 remplace la V4 circulaire. Le Hub n’est plus un petit anneau avec huit Portes collées au centre : c’est une métropole ouverte de **1 800 × 1 400 m**, avec dix quartiers utiles et huit Portes physiques dispersées en périphérie.

Map dédiée :

`/Game/3binternational/Maps/Hub3B_Main_V05`

Constructeur :

`Scripts/build_hub3b_main_v5.py`

Manifest :

`Data/Production/hub3b-main-v5.json`

Topologie Unreal :

`Data/Production/world-layout-unreal.json`

Canon partagé avec le web :

`Data/Canonical/hub-master-plan-v2.json`

## Composition obligatoire

- Place de l’Héritage ;
- Tour du Cercle Brisé ;
- Archives de la Mémoire ;
- Arène 3B ;
- Quartier Commerce ;
- Quartier Communauté ;
- Quartier Innovation et IA ;
- Docks et Transports ;
- Portail Ville 3B ;
- Jardins de l’Unité ;
- 19 bâtiments canoniques utiles ;
- 37 axes de circulation dans le blockout Gold Master ;
- 8 Portes-pays monumentales et dispersées ;
- 3B Express, bateaux, téléphériques et tyroliennes ;
- eau, ponts, passerelles, verticalité et horizons urbains.

## Règle des Portes

Les Portes ne sont jamais disposées à 45° autour du Cercle central.

Positions canoniques du blockout, en mètres :

| Porte | X | Z | Quartier d’ancrage |
|---|---:|---:|---|
| France | -650 | -330 | Archives |
| Espagne | -735 | -30 | Communauté |
| Maroc | -700 | 300 | Jardins |
| Estonie | -160 | -540 | Innovation |
| Turquie | 590 | -460 | Innovation |
| Italie | 705 | -80 | Commerce |
| Tunisie | 620 | 300 | Portail Ville 3B |
| Algérie | 500 | 520 | Docks |

Chaque Porte possède un axe d’approche métropolitain. Sa restauration doit devenir visible après libération du Gardien correspondant.

## Centre

Le centre contient le **Cercle Brisé**, mais pas les huit Portes.

La Place montre seulement les huit fragments de progression sous forme de signaux/lumières. Elle relie les quartiers civiques par de grands axes et sert de point d’arrivée, de lecture et de rassemblement.

## Zone sûre

Le Hub est la seule grande zone totalement sûre du Monde du 3B :

- aucun monstre hostile libre ;
- aucun PvP sauvage ;
- pas de mort ni dégâts de monde ouvert ;
- les combats sont lancés explicitement dans l’Arène, les royaumes ou les activités prévues.

## Évolution

Chaque Gardien libéré transforme la Cité :

- activation de la Porte ;
- éclairage et signalétique du quartier ;
- évolution des bâtiments ;
- nouveaux PNJ/dialogues/horaires ;
- nouveaux services et raccourcis ;
- réaction de la Tour et des fragments centraux.

Jalons : **0 / 1 / 2 / 4 / 6 / 8 fragments**.

## Lancement automatique

Fermer Unreal puis lancer :

`LANCER_HUB_3B.bat`

Le script Windows ouvre UE 5.8 avec `-3BHubV5AutoBuild`, puis `Content/Python/init_unreal.py` appelle le constructeur V5.

## Validation

Le constructeur vérifie au minimum :

- map `Hub3B_Main_V05` ;
- 10 quartiers ;
- 19 bâtiments ;
- 8 Portes ;
- 37 axes ;
- toutes les Portes à plus de 500 m du centre.

Résultat attendu :

`VALIDATION HUB V5 OK`

## Limite de production

Le script génère un **blockout architectural Gold Master data-driven**. Les meshes, matériaux, animations, VFX, éclairages finaux et intérieurs artistiques doivent ensuite être produits/validés dans Unreal Editor. Le canon de layout, lui, ne doit plus changer sans modification explicite de la référence maître.
