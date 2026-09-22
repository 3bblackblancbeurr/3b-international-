# Hub principal 3B V4 — Sanctuaire des Huit Portes

## Objectif

La V4 remplace le simple test de vide par la vraie architecture de base du hub principal.

Map dédiée :
`/Game/3binternational/Maps/Hub3B_Main_V04`

Le V3 `Hub3B_Blockout_V01` reste un ancien prototype technique.

## Composition

- cœur central circulaire : 26 m ;
- anneau principal : rayon 32 m ;
- 8 spokes entre cœur et anneau ;
- 8 avancées/pétales ;
- 8 terrasses-portails ;
- 8 arches-portails visibles ;
- grands vides entre les avancées ;
- dessous sculpté par noyau, contreforts et nervures ;
- fragments uniquement en profondeur ;
- aucun Landscape.

## Ordre canonique des portails

- Nord : Estonie / Sagesse / Eira ;
- Nord-Ouest : France / Justice / Céliane ;
- Ouest : Espagne / Passion / Diego ;
- Sud-Ouest : Maroc / Noblesse / Naël ;
- Sud : Algérie / Loyauté / Yliane ;
- Sud-Est : Tunisie / Courage / Soraya ;
- Est : Italie / Espoir / Alessio ;
- Nord-Est : Turquie / Foi / Émir.

Les portails sont espacés de 45°.

## Style préparé

Le constructeur tente de générer trois matériaux de travail :
- noir profond métallique ;
- or champagne ;
- bleu Matrix emissif.

Les portails utilisent une architecture commune, avec énergie Matrix et noms visibles.

## Voyage

Les huit portes possèdent des `TRAVEL_ANCHOR` préparés.
La destination réelle de chaque monde n'est pas encore branchée afin de ne jamais envoyer le joueur vers une map absente.

## Lancement

Fermer Unreal puis double-cliquer à la racine :

`LANCER_HUB_3B.bat`

Le lanceur V4 ouvre le projet canonique et exécute :
`Scripts/build_hub3b_main_v4.py`

## Validation

Le script refuse de construire hors de `Hub3B_Main_V04`.
Il vérifie :
- 8 portails ;
- 24 segments d'anneau ;
- 8 spokes ;
- 24 segments de pétales ;
- aucune présence de Landscape.

Résultat attendu dans le Journal de sortie :

`VALIDATION HUB 3B V4: OK`
