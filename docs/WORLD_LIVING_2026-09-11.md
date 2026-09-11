# Monde 3B : pays, combats et coopération

Cette livraison prolonge le quartier de Paris. Elle apporte des maisons régionales aux sept autres pays, des combats qui avancent pendant les déplacements, des activités renouvelables et une première coopération Internet privée. Elle conserve les sauvegardes, les personnages, les créatures et les pouvoirs du projet.

## Jouer

- Explorer un pays, rencontrer ses habitants, récolter et livrer des provisions.
- Affronter une menace en se déplaçant : l’adversaire prépare ses attaques, marque leur trajectoire puis frappe. Quitter réellement cette zone évite l’impact. La garde réduit les dégâts ; l’esquive consomme de l’endurance.
- Utiliser les ressources pour développer refuge, atelier et jardin. Les expéditions réussies renouvellent récoltes et demandes des habitants. La reconstruction n’arrête pas le monde.
- Depuis le bouton de groupe, se connecter au compte 3B, créer un groupe ou saisir son code. Jusqu’à quatre membres peuvent se retrouver dans le même pays, se voir, se saluer et contribuer à un refuge commun. Chaque contribution utilise deux bois et une pierre du compte.

Les combats restent individuels. Cette coopération ne synchronise pas encore les ennemis, leurs dégâts ou les quêtes entre joueurs. L’arène existante reste un mode séparé.

## Décors livrés

21 modèles originaux construits avec Blender 4.5, chacun avec une version détaillée et une version distante : 42 GLB, 10,49 Mo au total avant transfert HTTP. Les modèles sont compressés avec Meshopt, chargés par pays, regroupés par matériau et affichés en instances. Les bâtiments éloignés utilisent moins de détails. Les portes font 4,8 unités pour un personnage d’environ 3,8 unités.

| Pays | Maisons régionales |
| --- | --- |
| Italie | Enduits chauds, volets, balcons et couvertures en terre cuite |
| Estonie | Façades pastel, pignons à degrés et toits fortement inclinés |
| Turquie | Bois apparent, encorbellements et fenêtres en saillie |
| Algérie | Enduits clairs, terrasses et pergolas |
| Tunisie | Façades claires, boiseries bleues et encadrements courbes |
| Maroc | Enduits ocres, claustras et terrasses à créneaux |
| Espagne | Balcons, ouvertures courbes et toitures en tuiles |

Paris conserve ses modèles de référence. Les monuments des huit pays restent présents et visibles ; cette livraison ne remodélise pas leurs silhouettes existantes. Les chaussées utilisent désormais les textures de pierre déjà documentées pour Paris. Le feuillage reçoit un atlas de branches feuillues original avec transparence découpée, éclairage et mouvement du vent. Les habitants suivent les rues, s’arrêtent, travaillent ou discutent avant de repartir.

Les bâtiments sont des interprétations destinées au jeu, pas des relevés exacts de villes réelles. La géométrie régionale et l’atlas végétal sont originaux. Les textures de pierre/enduit proviennent des ressources CC0 déjà répertoriées dans `public/world/paris/textures/sources.json`. Les illustrations du manga restent des références artistiques.

## Vérifications

- 303 tests automatisés réussis après intégration de la dernière version de l’application : déplacements, sauvegardes, progression, combats, monuments et autres jeux.
- Décodage des 42 fichiers GLB : empreintes SHA-256, dimensions, positions finies et budgets de taille vérifiés.
- Neuf essais réseau avec cinq comptes de test : limite de quatre membres, exclusion des comptes extérieurs, contribution concurrente idempotente, absence de modification directe des ressources et échanges WebSocket privés.
- Quatre contrôles du moteur publié : mission authentifiée, calcul identique d’un combat local/serveur, rechargement sans duplication des récompenses et refus d’un accès anonyme.
- Essais visuels locaux : huit pays, affichage du joueur distant connecté, livraison et récompense, caméra et boussole pendant un parcours, combat et issue d’une expédition. Vérification de l’interface en dimensions de téléphone, distincte d’un essai sur téléphone réel.

Le passage de pays laisse d’abord apparaître le chargement. Les acteurs retirés cessent leurs animations. La synchronisation vide plusieurs lots du journal lorsque le combat produit plus de cent commandes. Les sons ne sont joués que lors d’une action de combat, jamais à chaque pas de simulation.

## Service et limites

L’audit de performance a conduit à ajouter les index des propriétaires de groupe et des contributions par groupe, via `world_party_foreign_key_indexes`.

Moteur de compte `world-engine` version 10. Migration `world_private_cooperative_refuges` : tables privées, politiques Realtime propres à chaque émetteur et fonction `world_party_command`. Les écritures économiques passent par une transaction ; les positions diffusées ne donnent aucune récompense. La fonction vérifie l’identité, la session, l’appartenance au groupe, les ressources et les limites de fréquence.

L’audit Supabase signale volontairement la fonction SECURITY DEFINER accessible aux comptes authentifiés et les tables sans accès direct : c’est le point d’entrée contrôlé, avec `search_path` vide et droits directs retirés. Voir le [contrôle des fonctions privilégiées](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). L’avertissement préexistant sur la protection contre les mots de passe compromis reste indépendant de cette livraison.

Le rendu demeure stylisé, avec certains bâtiments publics et monuments encore simplifiés. Les intérieurs ne sont pas généralisés. Les animations et la végétation peuvent encore gagner en qualité artistique. Le moteur rejoue des commandes déterministes ; il ne constitue pas un serveur de simulation compétitive permanent. La coopération est privée à quatre, sans combat partagé ni monde MMO persistant. Aucun jeton blockchain n’est déployé par cette livraison.

Les observations sur ordinateur et les dimensions mobiles simulées ne prouvent pas les performances d’un Samsung physique. La qualité automatique réduit la résolution lorsque nécessaire ; le chargement initial d’un pays peut encore produire une pause. Ces limites empêchent de qualifier cette version de jeu AAA terminé.
