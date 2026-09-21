# Setup Unreal Engine 5.8 — 3B World

## Première ouverture

1. Installer/ouvrir Unreal Engine 5.8.
2. Ouvrir `unreal/ThreeBWorld/ThreeBWorld.uproject`.
3. Laisser Unreal générer les fichiers projet si demandé.
4. Compiler le module `ThreeBWorld`.
5. Activer Python Editor Script Plugin.
6. Vérifier les plugins PCG / Niagara / Control Rig / Mass nécessaires.
7. Créer une carte Open World World Partition.
8. Sauvegarder la carte.
9. Pour le hub général, exécuter `Scripts/build_metropolis_blockout.py`. Pour France, ouvrir/créer `L_France_OpenWorld` puis exécuter `Scripts/build_france_blockout.py`.
10. Vérifier l'échelle avec une capsule personnage et des mesures réelles.

## À ne pas faire

- ne pas supprimer la version Three.js ;
- ne pas connecter une clé service_role dans Unreal ;
- ne pas construire les 19 landmarks finaux avant validation de la vertical slice ;
- ne pas activer tous les systèmes lourds en même temps sans profiling.

## Première build

Objectif : blockout navigable uniquement.

La première preuve de réussite n'est pas une belle capture : c'est ouvrir le projet canonique, compiler le module, générer le blockout prévu, marcher dans la carte, charger les cellules nécessaires et revenir sans blocage ni hitch majeur.
