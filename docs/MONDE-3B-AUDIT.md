# Monde 3B — audit joué et corrections du 11 septembre 2026

Le jeu possède une base jouable, des sauvegardes et une arène fonctionnelle. Il n’a pas encore la richesse artistique ni la variété d’un grand jeu de studio. Cette livraison corrige des défauts reproduits en jouant et améliore le décor ; elle ne constitue pas une refonte complète des 172 personnages et créatures.

## Ce qui a été réellement essayé

- Départ invité sur la version publique, personnalisation, traversée du Nexus vers la France, navigation à la mini-carte, expédition et défenses répétées.
- Parcours local après correction : personnalisation féminine, coiffure, look et sac, compagnon masqué, sauvegarde, trois récoltes, construction du jardin, combat au clavier, esquive et contre-attaque, suspension et reprise, victoire et rechargement.
- Déplacement réel du personnage jusqu’au centre urbain dans chacun des huit pays, avec le moteur du jeu et les refuges au rang 8. Comparaison du zoom pendant la marche, puis vues en portrait et modes de qualité.
- Souris, clavier et événements tactiles du navigateur : déplacement à gauche, caméra à droite, arrêt au relâchement et molette.
- Refus du GPS sur la version publique : message compréhensible et monde virtuel toujours disponible. Aucune marche dehors réelle n’a été effectuée pendant cet audit.
- Compte de test authentifié : récoltes, combat, progression, sauvegarde sur un nouvel appareil simulé et répétition du même journal. Les récompenses ne sont pas doublées.
- Quatre comptes de test dans des salons privés : actions alternées, rejet d’un tiers et des doublons, maîtrise, demi-finales et finale. Les résultats de tournoi ont été provoqués par forfait pour vérifier l’enchaînement ; cela ne remplace pas un test d’équilibrage de tous les affrontements. Aucun joueur réel n’a été sollicité.

Les formats téléphone sont émulés sur Edge avec le GPU de cet ordinateur. Ils valident la disposition et les commandes, pas la performance d’un téléphone physique. Les huit parcours mesurés atteignent 60 images/s sur cet ordinateur, avec 120 à 146 appels de rendu selon le pays au point de mesure. Ce sont des mesures ponctuelles, pas une garantie pour tous les appareils.

## Défauts et résultat de cette livraison

| Domaine | Défaut constaté | Correction ou limite |
| --- | --- | --- |
| Interface mobile | Le bouton « Protéger les environs » recouvrait l’accès à l’arène. Le clic était intercepté. | Corrigé : arène et interaction occupent deux hauteurs différentes. Essai de clic réel à proximité d’une interaction. |
| Reprise du combat | Échap fermait la rencontre et consommait le départ en expédition sans possibilité de reprendre. | Corrigé : Échap et la croix suspendent la rencontre. Reprise ou repli explicite, résultat conservé au rechargement. Un résultat déjà terminé ferme normalement. |
| Équilibrage | Après une frappe et douze gardes, l’équipe revenait à 100/100 ; la garde pouvait soigner indéfiniment. | Corrigé : deux reprises de souffle par rencontre, sauvegardées et validées par le serveur. La protection reste utilisable ensuite, sans soin. La pression augmente après 24 échanges. |
| Lisibilité des pouvoirs | La concentration n’était pas affichée clairement malgré son coût dans les actions. | Corrigé : trois indicateurs, ouverture de contre-attaque et quantité de soins restants. |
| Réactions au combat | Les adversaires recevaient une animation d’impact mais ne répondaient pas par une attaque distincte. | Amélioré : attaque, réponse animée de l’adversaire et courte avancée. Le système reste un combat par échanges, pas un combat d’action continu. |
| Compagnon suiveur | Un personnage suivait automatiquement l’avatar, sans commande pour voyager seul. | Corrigé : « Voyager en solo » / « Rappeler mon compagnon ». Le choix persiste sur le compte et ne retire pas les aptitudes de l’équipe. |
| Caméra | La vue choisie restait stable dans la ville mais était perdue au rechargement. | Corrigé : angle et distance mémorisés sur l’appareil, valeurs invalides rejetées. Zoom 36 conservé pendant les huit parcours urbains. |
| Ressources | Bois, pierre et provisions étaient trop difficiles à consulter. | Corrigé : compteur compact cliquable dans le monde, donnant accès au refuge et à ses activités. |
| Constructions | Les rangs suivants changeaient surtout les statistiques. | Amélioré : chaque rang ajoute un détail visible dans l’emprise existante : ornements du refuge, outils de l’atelier, cultures du jardin. Ce sont des enrichissements progressifs, pas huit bâtiments entièrement différents. |
| Façades | Fenêtres européennes répétées même dans les médinas. | Amélioré : arcs et grilles au Maghreb, bandeaux de mosaïque, colombage en Turquie, joints de pierre ou bois, balcons fleuris en France, Italie et Espagne. Les volumes de base restent modulaires. |
| Espaces vides | Les terre-pleins entre rues étaient nus et uniformes. | Amélioré : plantations basses en groupes dans les marges sèches, à l’écart des passages et interactions. Trois lots instanciés limitent le coût de rendu. |
| Lumière | Rendu très uniforme et couleurs des vitrages délavées. | Ajusté : équilibre entre lumière du ciel et soleil, exposition, vitrages plus profonds. Les ombres et zones lisibles sont conservées. Une direction artistique plus fine par scène reste nécessaire. |
| Coq Suprême | Un humanoïde sombre à pointes ne correspondait pas à l’oiseau bleu et or présenté. | Remodélisé dans Blender : bec, crête, ailes, pattes, queue et plumage. Sept animations vérifiées. Modèle compressé de 129 468 octets, chargé via une nouvelle URL pour éviter l’ancien cache. Il s’agit d’une interprétation stylisée, pas d’une copie exacte de l’illustration. |
| Défi de l’Union | La scène utilisait le modèle C165, alors que le combat référençait C164. | Corrigé dans le code : la scène affiche désormais le même personnage que le combat. |

## Ce qui reste insuffisant

**Identité artistique.** Les autres gardiens et certaines créatures gardent encore des bases génériques. Les silhouettes, textures, vêtements et animations doivent être repris individuellement depuis les références du manga. Le nouveau Coq est une première correction concrète ; les 172 êtres n’ont pas tous reçu ce travail. La galerie privée ChatGPT Images complète n’est pas connectée ici. Les illustrations déjà importées dans le projet restent utilisées.

**Villes et campagne.** Les façades sont mieux différenciées mais les quartiers restent des ensembles procéduraux compacts. Il manque des rues conçues individuellement, des intérieurs accessibles, des métiers visibles, des habitants ayant des relations et des routines, et des événements qui transforment les lieux. Ajouter seulement davantage de maisons ne suffira pas.

**Rythme et interaction.** Les histoires utilisent encore une succession répétée d’aide, de trois pouvoirs, d’énigme, de souvenirs et de gardien. Les huit énigmes diffèrent, mais une grande part des actions se déroule dans des panneaux. Priorité suivante : interactions dans le décor, expéditions avec plusieurs événements, attaques clairement annoncées, choix de compagnons utiles sur le terrain.

**Monde sans fin.** Les expéditions se renouvellent et la progression ne supprime pas les constructions en cas de défaite. Cependant, la survie se limite principalement aux provisions ; les trois bâtiments culminent au rang 8. L’ouverture du monde ne signifie pas qu’il possède déjà un contenu infini. Il manque artisanat spécialisé, projets de quartier, élevage/entraînement et activités sociales durables.

**Orientation.** La mini-carte représente les rues courbes et les bâtiments. Le trait vers un repère indique une direction à vol d’oiseau ; ce n’est pas encore un itinéraire dessiné rue par rue. La marche automatique évite les obstacles mais peut traverser les espaces libres.

**Multijoueur.** Les duels Internet et le tournoi privé fonctionnent. Ils utilisent des échanges au tour par tour et une synchronisation périodique. Il n’y a pas encore de monde d’exploration partagé, de construction coopérative ni de monstres combattus en groupe dans le paysage.

**Audio et narration.** L’ambiance sonore reste synthétique et simple. Il manque voix, sons enregistrés et musique propre aux lieux. Les petites présentations de reconstruction existent ; ce ne sont pas des cinématiques de studio pour toutes les quêtes.

**Performances et accès.** La qualité adaptative, les géométries groupées et les modèles compressés sont utiles. Le paquet contenant Three.js reste important ; les connexions lentes et téléphones modestes nécessitent des tests physiques. L’importante bibliothèque 3D n’est pas téléchargée intégralement à l’ouverture, mais tous les styles et appareils ne sont pas encore validés.

**Économie et sécurité.** Les gains du compte, éclats et maîtrise sont distincts. Les tests vérifient validation serveur, droits d’accès et idempotence ; ils ne constituent pas un audit de sécurité exhaustif. Les déplacements du monde ne sont pas simulés intégralement côté serveur. Aucune nouvelle cryptomonnaie ni conversion des récompenses en actif monétaire n’est publiée par cette livraison.

## Ordre de production recommandé

1. Reprendre les sept autres gardiens et les personnages les plus rencontrés avec la même exigence d’identité que le Coq.
2. Construire un quartier de référence complet, avec intérieur utile, habitat, commerce, rencontre et événement, avant d’étendre sa qualité aux huit pays.
3. Remplacer une quête de panneaux par une activité jouée dans le monde, puis enrichir les expéditions répétables.
4. Tester cette tranche sur de vrais téléphones, avec chargement lent et sessions longues.
5. Construire ensuite la coopération dans le monde, avec simulation et contrôle serveur adaptés.

Techniques vérifiées dans les références officielles : [instanciation Three.js](https://threejs.org/docs/pages/InstancedMesh.html), [regroupement des objets](https://threejs.org/manual/en/optimize-lots-of-objects.html), [gestion des couleurs](https://threejs.org/manual/en/color-management.html). Le choix sert à conserver des détails sans multiplier inutilement les appels de rendu.

## Validation de la livraison

135 tests automatisés réussis, compilation de production réussie. Les vérifications visuelles, tactiles, de compte et de salons privés sont consignées dans le dossier local de livraison. Le moteur partagé du compte est déployé en version 8 ; les règles d’authentification existantes sont conservées.
