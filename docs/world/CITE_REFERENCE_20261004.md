# Cité 3B — plateformes et armurerie, 4 octobre 2026

Référence unique choisie par Zakaria : **Monde_3B_Hub_REFERENCE_UNIQUE.png**, ancien nom **1000007204.png**, identifiant `libfile_5cfbda3927788191b219ddee118048c1`. Les anciens concepts ne guident plus cette refonte.

## Code livré dans cette proposition

- 29 îlots physiques, huit ponts radiaux et une promenade circulaire ; 571 m de diamètre pour le hub.
- Surface de marche et géométrie visibles issues du même plan. Les vides entre îlots bloquent les déplacements ; les sauvegardes dont la position est dans un vide reviennent au point d'arrivée.
- Les 19 services, huit portails, missions, secrets et transports existants gardent leurs identifiants. Aucun nouveau royaume ni modification de récompense serveur.
- Tour centrale à quatre flèches, couronnes, fondations rocheuses par îlot, éclairage bleu/or, navires de décor et détails de la place.
- Mer avec normales animées, vagues, écume, pluie et lumière jour/nuit. Réflexion plane réservée au mode détail. Bassins et fontaine animés ; cascades avec filaments et écume animés.
- Les habitants nommés conservent leurs routines. La foule ambiante, auparavant inactive faute de routes sur le nouveau hub, reçoit quatre parcours sur les axes piétons.
- Deux créatures observables utilisant les modèles animés existants : refuge et projection près de l'arène. Elles ne sont pas des combats inédits. La cité conserve sa zone sûre et les services d'arène existants.
- Armurerie : grand aperçu 3D rotatif de l'équipement réel, respect de la forme débloquée, éclairage de studio, clavier et repli illustré en cas d'échec WebGL. Les 16 armes gardent leurs statistiques ; matériaux, poignées et détails sont enrichis.
- Animation du personnage : les longues frames sont consommées en petits pas par le mélangeur pour garder l'animation en accord avec le déplacement.

## Validation et limites

Les tests de parcours vérifient l'accès aux bâtiments, portails, PNJ, objectifs et créatures. Les tests du hub, des interactions, du mouvement, des armes et de l'interface mobile sont exécutés. Build de production vérifié.

Les premières captures du moteur ont été inspectées grâce au workflow GitHub. Elles ont révélé des rochers de fondation dépassant de la chaussée et masquant le personnage. Ces rochers sont maintenant sous le sol et un test de raycast protège la correction. Les captures suivantes doivent confirmer le résultat. Ne pas confondre validation du code et validation artistique. Cette proposition ne doit pas être décrite comme une copie exacte de l'image ou une version AAA terminée.

## Reste du périmètre demandé

La reproduction détaillée de toutes les façades et intérieurs de l'image, ses niveaux réellement praticables, passerelles suspendues, escaliers et ascenseurs nécessite un système de sol en hauteur, de navigation verticale et de caméra correspondant. Les îlots et ponts principaux restent au niveau de base. Huit belvédères sont maintenant accessibles par des rampes de 23,8 m qui montent de 6 m : le sol raycasté et la hauteur des personnages utilisent le même profil. Garde-corps et accès dégagés sont vérifiés par tests de parcours. La navigation complète à plusieurs étages, les escaliers et ascenseurs restent à faire. Les petits navires sont du décor ; ils n'ajoutent pas un pilotage naval.

Les monstres combattables inédits, leurs comportements, leurs modèles et leurs missions ne sont pas produits dans cette proposition. Les fonctions de combat existantes restent en place. Il reste à concevoir et valider l'accès volontaire aux combats du hub avec le serveur, sans rendre hostiles les places familiales.

Il reste aussi à vérifier dans le navigateur les shaders, la présentation des 16 armes, le passage entre modes graphiques, les performances et les séances longues sur le Samsung réel avant fusion/publication. Les chiffres FPS ne sont pas mesurés par les tests Node.

## Contrôle du rendu sur GitHub

Le workflow `Verify playable Hub renderer` produit des captures du véritable moteur en format ordinateur (1280 × 720, détail) et téléphone (390 × 844, fluide), vérifie la réponse au déplacement et les erreurs JavaScript/shaders. Ce contrôle utilise un navigateur logiciel sur serveur : il ne mesure pas les performances d’un Samsung réel et ne remplace pas la validation artistique des captures.
