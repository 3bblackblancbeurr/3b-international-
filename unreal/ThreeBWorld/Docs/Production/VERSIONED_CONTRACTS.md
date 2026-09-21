# Contrats versionnés

## Objectif

Permettre à Three.js, Unreal et Supabase de coexister sans migration destructrice.

## Versions initiales

- World save : `version = 1`
- Cité canonical plan : `2.0.0`
- Unreal layout export : `1.0.0`
- Bootstrap contract : `1.0.0`

## Règles

1. Ajouter des champs optionnels est compatible.
2. Renommer/supprimer un champ exige une nouvelle version.
3. Le serveur normalise les anciennes sauvegardes.
4. Unreal ne réécrit pas un état qu'il ne comprend pas.
5. Une migration de sauvegarde est testée avec copie avant publication.
6. Aucun reset silencieux.

## Contrôle

Chaque build Unreal doit enregistrer dans ses logs :
- version client ;
- version contrat bootstrap ;
- version world save ;
- révision serveur reçue.

Aucune donnée personnelle complète dans les logs de production.
