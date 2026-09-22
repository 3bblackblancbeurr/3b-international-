# Hub 3B — Void Blockout V3

## But

Créer une map de travail séparée pour le hub principal du Monde du 3B, centrée uniquement sur :
- les vrais vides ;
- les plateformes ;
- les ponts ;
- les différences de hauteur ;
- les dessous des plateformes ;
- la profondeur ;
- les fragments flottants ;
- les Safe Anchors ;
- l'atmosphère de base.

Les portails et les pays ne sont pas construits par ce script.

## Sécurité

Le script ne modifie pas le terrain de démonstration actuellement ouvert.
Il crée ou recharge :

`/Game/3binternational/Maps/Hub3B_Blockout_V01`

La map est créée avec World Partition.

Tous les Actors créés automatiquement portent le tag :

`3B_HUB_VOID_V3`

Une nouvelle exécution supprime uniquement les Actors portant ce tag avant de reconstruire le hub.

## Géométrie préparée

- 1 noyau central ;
- 6 grandes masses principales ;
- 6 plateformes satellites ;
- 12 liaisons/ponts ;
- dessous en plusieurs niveaux pour chaque plateforme ;
- 12 fragments flottants ;
- 7 Safe Anchors ;
- 1 PlayerStart ;
- Kill Z de récupération préparé à -52 m ;
- ciel/atmosphère/fog/cloud actor de base lorsque les classes sont disponibles.

La première zone sous les plateformes reste réellement vide : aucun Landscape ni dalle géante n'est créé.

## Lancer le constructeur

Dans Unreal Engine 5.8 :

1. ouvrir le projet canonique `ThreeBWorld.uproject` ;
2. vérifier que Python Editor Script Plugin est actif ;
3. menu **Outils / Tools → Execute Python Script** ;
4. choisir :

`Scripts/build_hub3b_void_blockout_v3.py`

Alternative via la console Python :

```python
exec(open(unreal.Paths.project_dir() + "Scripts/build_hub3b_void_blockout_v3.py", encoding="utf-8").read())
```

## Résultat attendu

Le script doit ouvrir/créer `Hub3B_Blockout_V01`, construire le blockout puis afficher dans le journal :

`VALIDATION BLOCKOUT V3: OK`

Le script sauvegarde ensuite automatiquement la map.

## Vérifications manuelles après génération

1. vue du dessus : aucune grande dalle continue ;
2. vue depuis le centre : les satellites sont séparés ;
3. vue d'un pont : vide visible des deux côtés ;
4. vue latérale : dessous réellement volumétrique ;
5. vue sous la plateforme : aucun Landscape/faux sol ;
6. déplacement : vérifier ensuite les collisions avec le personnage réel ;
7. après intégration du personnage : recalculer les largeurs de failles face à sa distance maximale de saut ;
8. profiler nuages/fog avant la qualité finale.

## Important

Ce blockout est une structure de production mesurée, pas le rendu artistique final.
Les meshes Cube temporaires devront ensuite être remplacés par la vraie architecture Nanite, matériaux 3B, Lumen final, nuages finalisés et VFX.
