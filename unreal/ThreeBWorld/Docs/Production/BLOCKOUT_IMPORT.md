# Import des blockouts dans Unreal 5.8

## Projet canonique

Utiliser uniquement :

`unreal/ThreeBWorld/ThreeBWorld.uproject`

Le dossier legacy `unreal/3BWorld` ne doit plus recevoir de nouveau travail.

## Hub principal — vides et plateformes

Le nouveau constructeur premium du hub est :

`Scripts/build_hub3b_void_blockout_v3.py`

Il lit :

`Data/Production/hub3b-void-blockout-v3.json`

Il crée/recharge automatiquement une map World Partition séparée :

`/Game/3binternational/Maps/Hub3B_Blockout_V01`

Puis il génère le noyau, les grandes masses, satellites, ponts, dessous, fragments, Safe Anchors et atmosphère de base.

### Exécution

Dans Unreal Engine 5.8 :

**Outils / Tools → Execute Python Script**

puis sélectionner :

`Scripts/build_hub3b_void_blockout_v3.py`

Ou via la console Python :

```python
exec(open(unreal.Paths.project_dir() + "Scripts/build_hub3b_void_blockout_v3.py", encoding="utf-8").read())
```

Le résultat attendu dans le journal est :

`VALIDATION BLOCKOUT V3: OK`

Voir `Docs/HUB3B_VOID_BLOCKOUT_V3.md`.

---

## Ancien blockout métropole

Le script historique reste disponible :

`Scripts/build_metropolis_blockout.py`

Il lit :

`Data/Production/world-layout-unreal.json`

Il sert au blockout urbain général (quartiers/routes/bâtiments/portes), pas à la refonte spécialisée des vides du hub.

Tous les Actors de cet ancien importeur portent le tag :

`3B_GENERATED_BLOCKOUT`

Ne pas lancer les deux scripts pour répondre au même objectif sans savoir quel niveau est actuellement ouvert.
