# Monde 3B — collection 3D et Cercle des liens

## Version web

Le monde (`#monde-3b`) propose un avatar Homme ou Femme, six bases de tenue, une silhouette, six coiffures, couleurs de peau et de cheveux, choix de visage, origine libre et voie de pouvoir. La caméra tourne avec le bouton droit ou le doigt sur la partie droite ; la partie gauche sert au déplacement. Une pression courte permet aussi de choisir une destination. La molette et le pincement règlent la distance.

Les 368 cartes ont chacune un fichier GLB associé à leur identifiant : 131 personnages humains, 33 esprits articulés, huit gardiens et 196 représentations de lieux, objets ou pouvoirs. Les 172 personnages et créatures ont des animations de repos, marche, course, attaque, pouvoir, impact et chute. Les autres cartes sont des objets statiques consultables en 3D. Le navigateur charge les fichiers nécessaires à la scène et au codex, jamais toute la collection au démarrage.

Ces adaptations sont réalisées localement dans Blender avec des bases réutilisables, les fiches de cartes et leurs identités régionales. Elles ne reproduisent pas fidèlement chacun des dessins originaux et ne constituent pas 368 sculptures réalisées individuellement par un artiste. Les humains et gardiens s’appuient sur des assets Quaternius CC0 ; la provenance est conservée dans `public/world/living/CREDITS.txt`.

## Multijoueur Internet

L’arène (`#arene`, également accessible depuis le monde) propose des duels privés par code, une file classée et des tournois de quatre joueurs. Chaque duel utilise trois personnages et des équipements du catalogue. Des cartes d’initiation sont prêtées. La rareté, les achats, l’origine et le niveau de maîtrise ne renforcent pas les statistiques des rôles.

Le service Supabase `card-arena` authentifie les joueurs, vérifie leur collection, calcule les actions et applique chaque révision au plus une fois. Les tables ne sont accessibles directement ni au public ni aux comptes clients. Le serveur gère le délai de 45 secondes par tour et le passage des demi-finales à la finale. Le navigateur synchronise les tours par requêtes périodiques ; ce mode n’est pas un monde ouvert partagé en temps réel.

Un duel d’au moins six actions apporte de la maîtrise aux trois cartes, au maximum vingt fois par jour. Avec au moins douze actions et 90 secondes, il peut également rapporter 40 XP de compte au vainqueur, 20 à l’autre joueur et un point de fidélité chacun. Le plafond quotidien commun aux jeux reste 600 XP et vingt points (journée Europe/Paris). Seuls les trois premiers duels terminés contre le même adversaire dans la journée peuvent distribuer le bonus de compte. Les achats, les points de fidélité, les éclats du monde et la maîtrise restent des mécanismes distincts. Aucune cryptomonnaie n’est déployée ni distribuée.

## Fabrication et vérification

- `scripts/build-card-models.py` : génération Blender par identifiant ou lot.
- `scripts/export-living-web.py` : avatars modulaires et gardiens issus des sources Blender.
- `scripts/build-card-manifest.mjs` : contrôle des fichiers, animations, identifiants et empreintes.
- Compression Meshopt et textures WebP, avec conservation des matériaux sémantiques pour les couleurs de peau, cheveux et vêtements. La déduplication des matériaux ne doit pas fusionner ces rôles.
- Tests Node : règles de combat, autorisations de collection, progression, personnalisation, caméra, manifestes et fonctions existantes de l’application.
- Vérifications réelles : chargement GPU des 368 GLB, duel entre deux sessions de navigateur, tournoi avec quatre comptes, rejets des actions étrangères, hors tour et rejouées, récompenses sur temps serveur.

La version Windows Unreal reste un livrable distinct. Cette publication porte sur la version web et son service d’arène. Le réseau Unreal natif, une population massive dans le monde ouvert et une direction artistique entièrement sculptée sur mesure demandent encore leur propre développement.
