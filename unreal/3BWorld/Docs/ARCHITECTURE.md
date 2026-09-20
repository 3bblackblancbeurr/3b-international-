# Architecture cible — 3B World

## Principe

L'application 3B actuelle reste le shell produit : compte, Passeport, boutique, communauté, fidélité, économie et services.

Unreal devient progressivement le moteur du monde 3D.

```
Application 3B
  ↕ session utilisateur
Passeport / Supabase
  ↕ JWT utilisateur + API publique
3B World Unreal
  ├─ Cité des Huit Héritages
  ├─ 8 Portes
  ├─ 8 pays
  └─ Ville 3B personnelle
```

## Autorité des données

Le client Unreal ne décide jamais :
- de l'identité du joueur ;
- des récompenses ;
- de la propriété d'une Ville 3B ;
- des Coins ;
- des objets ;
- du déblocage serveur.

Le client envoie des commandes. Les Edge Functions et la base valident l'état.

## Monde central

La Cité reste la zone commune. Cible artistique : environ 1,8 km × 1,4 km.

Découpage prévu :
- World Partition ;
- cellules de 120–160 m au départ ;
- Data Layers par quartier et systèmes ;
- HLOD par district ;
- chargement séparé des intérieurs lourds.

## Migration

1. Three.js reste stable.
2. Unreal reproduit la vertical slice.
3. Le backend est partagé.
4. Les sauvegardes restent compatibles par contrats versionnés.
5. Unreal ne remplace le moteur principal qu'après QA comparative.
