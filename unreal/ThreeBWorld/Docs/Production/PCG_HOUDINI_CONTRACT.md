# Contrat PCG / Houdini — Cité des Huit Héritages

## Unités
- Unreal : centimètres.
- Source urbaine : mètres.
- Conversion unique : 1 m = 100 uu/cm Unreal.

## Attributs stables

Tout point/parcelle/asset généré doit pouvoir porter :

- `threeb_id` : ID canonique stable ;
- `district_id` : quartier canonique ;
- `asset_role` : building / road / prop / vegetation / traffic / gate ;
- `priority` : P0 / P1 / P2 ;
- `data_layer` : Data Layer cible ;
- `hlod_group` : groupe HLOD ;
- `gameplay_function` : fonction principale éventuelle ;
- `seed` : génération déterministe ;
- `variant` : variante artistique ;
- `interactive` : booléen.

## Règle

PCG/Houdini peut générer la forme, la densité et les variantes, mais ne doit jamais renommer les IDs canoniques du gameplay.

## Routes
Source : `Data/Production/world-layout-unreal.json`.

Les axes principaux sont stables. Les rues secondaires peuvent être procédurales à condition de :
- ne pas couper les entrées des 19 landmarks ;
- conserver les voies de transport ;
- respecter les zones réservées aux missions/secrets ;
- rester déterministes à seed identique.

## Data Layers

Le générateur doit exposer le Data Layer comme attribut plutôt que le coder en dur dans chaque asset.

## HLOD

Chaque quartier possède son groupe HLOD. Les landmarks P0 peuvent avoir une stratégie HLOD distincte des immeubles de remplissage.

## Sortie Houdini

Préférer :
- splines routes ;
- points de parcelles ;
- volumes de bâtiments ;
- attributs nommés ci-dessus ;
- géométrie finale seulement pour les éléments où Houdini apporte un vrai gain.

Ne pas rendre Houdini propriétaire des missions, de la progression ou de l'identité joueur.
