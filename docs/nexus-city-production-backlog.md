# Nexus City — Production backlog prêt à exécuter

## P0 — Vertical slice jouable
- Entrée physique Nexus depuis Cité Origine.
- Splash « Crée ta ville 3B » + COMMENCER.
- Parcelle 128x128 de départ.
- Caméra orbitale/tactile.
- Placement fantôme vert/rouge selon collision.
- Rotation 15°, déplacer, supprimer, annuler/rétablir.
- Route droite + virage + maison + atelier + parc + marché.
- Sauvegarde locale immédiate puis synchronisation serveur.
- Rechargement identique de la ville.

## P1 — Ville vivante
- Routes connectées et accès bâtiment.
- Habitants simulés seulement près de la caméra.
- Besoins simples : logement, travail, eau, énergie, loisirs.
- Niveau de ville 1–50.
- Déblocages par niveau et progression Monde 3B.
- Événements : marché, entraînement, festival, panne, mission communautaire.

## P2 — Huit styles
Pour chaque pays : 14 bâtiments de base du catalogue, matériaux spécifiques, végétation, mobilier, éclairage et 3 monuments premium gagnables en jeu. Les kits partagent collisions et dimensions afin de garder la simulation stable.

## P3 — Transport
- marche, vélo, moto/voiture de jeu, navette Matrix ;
- garages et stations ;
- véhicules cosmétiques par pays ;
- pas de simulation physique lourde hors zone active.

## P4 — Récompenses
- inventaire commun Monde/Nexus ;
- plans de construction, skins, compagnons, véhicules ;
- attribution serveur ;
- caps mondiaux Ultime/Unique ;
- aucune augmentation de chance via abonnement.

## Contrat de sauvegarde
CitySave v1 : `{version, cityId, revision, level, xp, currency, placements[], roads[], unlocked[], theme, updatedAt}`. Chaque placement : `{id, building, x, z, rotation, level}`. Limites : 5000 placements max, coordonnées ±500, rotation multiple de 15°, ids serveur. Optimistic concurrency par `revision` ; conflit => récupérer serveur, réappliquer les opérations locales non confirmées, puis renvoyer.

## Commandes UI mobile
Un doigt : sélectionner/placer. Glisser sur terrain vide : déplacer caméra. Deux doigts : rotation/zoom caméra. Boutons bas : Construire, Routes, Déplacer, Rotation, Supprimer. Barre haute : niveau, ressources, sauvegarde, mode photo. Aucun contrôle critique dans un coin inaccessible au pouce.

## Budget vertical slice
<= 90 draw calls, <= 120 Mo textures visibles, <= 350 objets rendus individuellement ; au-delà utiliser instancing/batching. Sauvegarde < 250 Ko pour 1000 placements. Interaction < 100 ms hors requête réseau. Autosave local < 500 ms après changement ; serveur regroupé toutes les 2–5 s.

## Critères de sortie
Le vertical slice n'est « fini » que si : création → 20 placements → rotation/déplacement/suppression → fermeture app → réouverture → ville identique ; test Android tactile ; aucune perte après conflit de révision ; build web et mobile verts.