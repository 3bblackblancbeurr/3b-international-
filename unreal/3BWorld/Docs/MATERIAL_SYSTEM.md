# Système matériaux 3B

## Masters proposés

- `M_3B_Master_Surface`
- `M_3B_Master_Glass`
- `M_3B_Master_Metal`
- `M_3B_Master_WetSurface`
- `M_3B_Master_EmissiveMatrix`
- `M_3B_Master_Fabric`
- `M_3B_Master_Decal`

## Paramètres communs

- BaseColor ;
- Normal ;
- Roughness ;
- Metallic ;
- AO ;
- DetailNormal ;
- DirtAmount ;
- Wetness ;
- EmissiveIntensity ;
- MatrixBlueAmount ;
- ChampagneGoldAmount.

## Palette centrale

- noir profond : base neutre dominante ;
- bleu Matrix : information / énergie / données ;
- or champagne : héritage / prestige / progression.

## Règle artistique

Ne pas transformer tous les assets en noir + néon bleu. La palette doit structurer les informations et l'identité, pas remplacer la matière réelle.

## Substance

Les exports Substance doivent alimenter les Material Instances, pas créer un shader unique par asset.

## Route mouillée

Prévoir wetness pilotable par météo pour éviter de dupliquer les matériaux pluie / sec.
