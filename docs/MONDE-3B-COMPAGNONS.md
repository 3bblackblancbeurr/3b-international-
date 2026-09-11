# Monde 3B — personnages, compagnons et lieux vivants

Direction retenue le 11 septembre 2026 : les illustrations sont les références
des personnages, monstres, gardiens, objets et pouvoirs. L’aventure abandonne la
présentation et les règles du jeu de cartes. Les 368 identités sources et leurs
acquisitions restent conservées dans les sauvegardes ; 172 sont des personnages
ou créatures. Les identifiants techniques historiques restent stables.

## Livraison jouable

- Registre de personnages avec portraits, filtre par pays, recherche, liens acquis
  et aperçu 3D orientable. Les objets et pouvoirs ont leur propre onglet.
- Un compagnon choisi parmi les personnages connus suit réellement l’avatar avec
  ses animations. Sa sélection est enregistrée sur le compte. Il suit la trace du
  joueur et évite les obstacles ; le groupe de combat conserve ses quatre places.
- Quêtes et arène parlent des personnages et de leurs aptitudes. Les cartes de
  fidélité commerciales de l’application ne sont pas concernées.
- Chaque jardin reconstruit prépare +16 de vitalité pour la prochaine rencontre ;
  chaque atelier prépare +4 de puissance. Une préparation remplace la précédente,
  se consomme à l’entrée de la prochaine rencontre régionale, ne verse aucun gain
  économique et n’affecte pas les statistiques de l’arène.
- Les trois étapes de reconstruction déclenchent un plan de 4,2 secondes dans
  le monde, avec bouton Passer. La préférence de réduction des animations est respectée.
- Nouveau riad ouvert au souk de Marrakech, aqueduc et terrasses dont les couleurs
  retrouvent vie après reconstruction ; pavillon d’artisans au Nexus.

## Production artistique

`scripts/build-living-places.py` s’exécute réellement dans Blender 4.5 local.
Il génère quatre objets modulaires originaux, leurs fichiers FBX pour Unreal et
un fichier Blender modifiable dans le projet natif voisin. Le kit GLB optimisé
pèse environ 1,1 Mo. Les arcs, pavages et ornements constituent une interprétation
stylisée ; ils ne prétendent pas reproduire un bâtiment réel mesuré.

Le même kit est importé dans Unreal dans `/Game/Art/Living*`. La version native
conserve son système de progression et ses sauvegardes locaux. Les compagnons
suiveurs et les préparations de jardins décrits ci-dessus concernent le jeu web ;
les bâtiments natifs disposent déjà de leurs services de refuge et d’atelier.

Blender et Unreal ont été exécutés pour cette livraison. Aucun scan RealityScan
ou contenu Twinmotion/Houdini n’est revendiqué : il faut des sources adaptées et
un usage concret pour ces outils. Les 172 représentations utilisent encore les
bases stylisées existantes, pas 172 personnages nouvellement sculptés à la main.

## Vérification

- 126 tests Node : compatibilité des sauvegardes, propriété des compagnons,
  préparation consommée une fois, toutes les quêtes, passages du riad et navigation
  vers les objectifs des huit pays avec les nouveaux modèles chargés.
- Navigateur : porte Nexus–Maroc, pouvoirs, énigme, trois souvenirs, reconstruction,
  préparation du groupe, entrée du riad, personnalisation, compagnon sauvegardé,
  format 390 × 844, aucune erreur JavaScript/chargement de modèle.
- Compte temporaire : restauration du Maroc jusqu’au gardien et à l’inauguration,
  synchronisation du compagnon sur un second appareil, rejets des identifiants
  invalides, absence de récompenses doublées, arène Internet authentifiée.
- Unreal Editor compilé : 634 contrôles natifs réussis, avec profil de test séparé.

L’exploration coopérative partagée dans le monde ouvert reste à développer.
L’arène Internet existante est conservée. Cette livraison est une étape jouable
de la refonte, elle ne constitue pas l’achèvement de toute la production des huit pays.
