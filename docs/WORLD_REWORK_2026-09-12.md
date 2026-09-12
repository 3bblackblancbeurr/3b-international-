# Monde 3B — reprise des régions, 12 septembre 2026

## Livraison

Origins devient l'entrée du Monde 3B. La création du personnage est conservée. Pause → Version précédente ouvre l'ancienne aventure et ses sauvegardes séparées. La publication a été explicitement demandée par le propriétaire après l'audit.

Les huit pays et le Sanctuaire sont accessibles. La France conserve son parcours de Justice. Les sept autres pays reçoivent chacun 24 bâtiments, des rues courbes, un jardin, une clairière de combat, un atelier et un refuge. Le placement des maisons et le centre urbain varient selon le pays. Les familles de bâtiments régionaux existantes sont réutilisées.

Monuments intégrés aux quartiers et accessibles depuis la carte : Mémorial du Martyr (Algérie), mosquée Hassan II (Maroc), amphithéâtre d'El Jem (Tunisie), Sagrada Família (Espagne), Colisée (Italie), tour de Galata (Turquie), cathédrale Alexandre-Nevski (Estonie). Paris conserve la tour Eiffel reconstruite dans cette branche. Ce sont des interprétations stylisées, pas des relevés photogrammétriques.

## Corrections de l'audit

- Sols : la découpe de visibilité affecte les surfaces verticales, sans effacer les plateformes horizontales de Paris et du Sanctuaire.
- Pouvoir du Cercle : énergie régénérée dans les régions et au Sanctuaire. Attaques, esquives, télégraphes au sol et effets d'impact disponibles dans les clairières.
- Jardins : navigation et interaction effectives. Une récolte fournit trois matériaux ; restaurer une section en coûte trois et donne 35 XP. Trois étapes visibles.
- Atelier : deux matériaux pour renforcer la tenue dans ce pays ; l'attaque puissante coûte alors 20 endurance au lieu de 27. Le bouton respecte ce coût.
- Refuge : santé, endurance et énergie restaurées.
- Combat régional : victoire donnant deux matériaux et 15 XP, puis nouvelle récolte disponible. Pas de récompense infinie par clic répété au jardin.
- Habitants : deux promeneurs suivent un circuit entre services, s'arrêtent et répondent à proximité. Correction du choix de destination qui pouvait interrompre le rendu après plusieurs arrêts.
- Sauvegarde : progression par pays, restauration, équipement et victoires conservés localement. L'XP reste de l'XP d'aventure, sans crédit commercial ni cryptomonnaie attribué par le navigateur.
- Lisibilité : loup plus petit et décalé, journal régional, indication de l'activité disponible, carte adaptée au quartier, horizon moins abrupt, végétation exclue des chemins, palmes retravaillées.

## Vérification

La commande `node scripts/verify-world.mjs` exécute les tests de l'application puis la compilation Vite. Première passe : 357 tests réussis. Les contrôles incluent les huit destinations, les collisions, les récompenses, la sauvegarde et la régénération de l'énergie. Une assertion supplémentaire parcourt trente arrêts de PNJ dans chacun des sept pays pour couvrir le défaut découvert en navigateur.

`scripts/verify-refonte.mjs` contrôle la récolte, la restauration et la marche jusqu'au monument dans les sept régions, les sols de France/Sanctuaire et l'atelier au format tactile. `scripts/verify-regional-combat.mjs` contrôle les commandes de combat, la régénération, le refuge et le rechargement de la sauvegarde au format 390 × 844.

Les captures et résultats locaux sont dans `artifacts/refonte`. Un contrôle tactile émulé sur ordinateur ne constitue pas une mesure sur le Samsung du propriétaire.

## Nouvelle analyse : ce qui reste à produire

Le progrès principal est fonctionnel : les régions ont maintenant une boucle de ressources, combat, amélioration et restauration. Le sol ne disparaît plus aux deux endroits contrôlés et les monuments existent dans les nouveaux quartiers.

La qualité artistique reste stylisée. Les maisons utilisent trois niveaux de modèles régionaux ; tous les bâtiments ne sont pas visitables. Les régions partagent encore les mêmes types de services et de combat. Il reste à créer des intérieurs propres aux métiers, des places composées à la main, des quartiers moins dispersés, des ennemis et comportements régionaux distincts, davantage d'animations et de véritables activités quotidiennes. Les dialogues ne sont pas doublés et leurs conséquences restent limitées aux services et restaurations.

Cette livraison ne transforme pas Origins en MMO : le multijoueur de la version précédente n'est pas migré dans ces quartiers. Elle ne constitue pas une livraison photoréaliste ni une garantie de 60 images/s sur téléphone. Les prochaines priorités sont les silhouettes et matériaux des bâtiments vus de près, la variété des ennemis et une mesure sur Samsung réel avant d'augmenter la densité du décor.
