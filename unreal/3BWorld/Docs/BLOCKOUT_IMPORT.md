# Import du blockout dans Unreal 5.8

## Préparation manuelle obligatoire une seule fois

1. Ouvrir `3BWorld.uproject` dans Unreal Engine 5.8.
2. Activer **Python Editor Script Plugin**.
3. Créer une carte de type **Open World / World Partition**.
4. Sauvegarder la carte sous un nom explicite, par exemple `L_Cite_Huit_Heritages_Blockout`.
5. Vérifier que l'échelle Unreal est en centimètres.

World Partition place ensuite les Actors spatiaux dans ses cellules selon leur position. L'importeur ne fabrique pas de faux Data Layers ou HLOD assets : ces assets doivent être créés dans l'éditeur.

## Lancer l'importeur

Dans Unreal Python :

```python
exec(open(unreal.Paths.project_dir() + "Scripts/build_metropolis_blockout.py", encoding="utf-8").read())
```

## Résultat

Le script place :
- 10 marqueurs de quartiers ;
- 19 axes routiers blockout ;
- 19 volumes de bâtiments principaux ;
- 8 volumes de portes.

Il lit exclusivement :
`Data/Production/world-layout-unreal.json`.

## Réexécution

Tous les Actors générés portent le tag :
`3B_GENERATED_BLOCKOUT`.

Le script supprime uniquement ces Actors avant de reconstruire le blockout. Les assets créés manuellement par l'artiste ne sont pas concernés.

## Après import

Ne pas détailler toute la ville immédiatement.

Commencer par :
Place de l'Héritage → Tour du Cercle Brisé → Archives → Gare 3B Express → Bureau d'Urbanisme → Porte France.
