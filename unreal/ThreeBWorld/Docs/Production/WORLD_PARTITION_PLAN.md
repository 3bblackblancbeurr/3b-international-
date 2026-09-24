# World Partition — Cité des Huit Héritages

## Référence

Cible artistique : 1 800 m × 1 400 m. Rayon jouable Gold Master : 820 m, afin d’inclure les huit Portes périphériques de la carte canonique.

Cellule initiale : 150 m. Elle doit rester configurable entre 120 et 160 m après profiling.

## Découpage logique

### Data Layer — Core
- Place de l'Héritage
- Tour du Cercle Brisé
- signalétique principale
- réseau routier structurant
- portes extérieures lointaines en HLOD

### Data Layers par quartier
- DL_HeritageSquare
- DL_BrokenCircleTower
- DL_Archives
- DL_Arena
- DL_Commerce
- DL_Community
- DL_Innovation
- DL_Docks
- DL_City3BPortal
- DL_Gardens

### Data Layers systémiques
- DL_Traffic
- DL_Crowd
- DL_Weather
- DL_Events
- DL_Secrets
- DL_Cinematics

## Intérieurs lourds

Créer en cellule/niveau séparé lorsque nécessaire :
- Tour du Cercle Brisé ;
- Archives ;
- Garage 3B ;
- Laboratoire IA Textile ;
- Gare importante ;
- espaces Ville 3B.

## Règle streaming

Le joueur ne doit jamais payer le coût complet des dix quartiers.

Profil initial :
- mobile moyen : 4 cellules utiles ;
- mobile haut : 5 ;
- PC : jusqu'à 7.

À remplacer par des mesures réelles après première build.
