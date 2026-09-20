# 3B World — Unreal preproduction

Ce dossier prépare la migration progressive du **Monde du 3B** vers Unreal Engine 5.8 sans supprimer la version web stable.

## Règles

- Le Monde web / Three.js reste la référence fonctionnelle tant que la vertical slice Unreal n'est pas supérieure et validée.
- Aucun secret Supabase, clé privée ou `service_role` ne doit entrer dans le client Unreal.
- Le Passeport, le Monde et Ville 3B restent liés au même `user_id`.
- Les fichiers JSON de `Data/Canonical` sont des miroirs versionnés des données canoniques du moteur web.
- Les vrais `.uasset`, cartes World Partition, matériaux, Niagara Systems et Control Rigs doivent être créés dans Unreal. Ils ne sont pas simulés ici.

## Première cible

Vertical slice :

Connexion → Passeport → Cité → Place de l'Héritage → PNJ → mission → 3B Express → Archives → Souvenir → Ville 3B → première construction → sauvegarde serveur.

Voir `Docs/VERTICAL_SLICE_GOLD_MASTER.md`.
