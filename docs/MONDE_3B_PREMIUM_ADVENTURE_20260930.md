# Monde 3B — Cité et aventure, 30 septembre 2026

Ce lot est préparé et vérifié localement. Ce document ne confirme aucune publication ou qualification Unreal, mobile physique, artistique ou musicale.

## Changements utilisables

- Les dix-neuf bâtiments du Hub proposent une entrée dans une petite salle visitable. Le joueur marche jusqu’aux postes de service ou à la sortie. Ces postes ouvrent uniquement les panneaux et routes déjà disponibles ; ils ne créent aucun droit de compte ni récompense. Les Archives, le Garage, la Galerie, les ateliers et les autres bâtiments ont des meubles adaptés à leur fonction.
- Une seule salle est montée à la fois dans la scène et le moteur de rendu existants. La Cité extérieure est masquée ; les simulations extérieures, le rendu de ses reflets et ses habitants sont suspendus pendant la visite. La sortie restitue exactement la position, l’orientation et la caméra d’entrée. Un changement de progression dans le même lieu conserve également la salle. Le titre de salle remplace les repères extérieurs ; le bouton fixe « La vie de la Cité » est masqué pour éviter son chevauchement.
- Le Cercle Brisé conserve son monument canonique et reçoit une couronne monumentale composée de huit secteurs. Les secteurs restaurés dérivent exclusivement des héritages déjà restaurés. Les quais des canaux reçoivent des promenades, des bordures et des pontons. Les dix monuments de quartier restent visibles à distance pour conserver une silhouette de Cité.
- La caméra d’arrivée choisit une position libre à proximité de la Place des Héritages. Une vérification des volumes réduit le recul de la caméra devant un obstacle ; les façades générées participent également à la transparence d’occultation. « Contempler la Cité » dans le répertoire ouvre une vue panoramique du monument réel et des quartiers, sans déplacer leurs emplacements.
- Le ciel utilise une courbe perceptuelle jour/nuit et exclut l’image HDR du fond nocturne. L’atmosphère commence directement à l’heure courante. Son actualisation utilise le temps réel des images même lorsque les animations sont réduites : ce réglage ne bloque plus le ciel au jour. Les lumières gardent le personnage lisible la nuit.
- Les préférences d’animations du compte et du système sont reconnues, y compris après un changement en direct. Elles figent les trajectoires cinématiques, le vent, l’eau, la plateforme et les ornements concernés, sans arrêter les règles de déplacement et de combat.
- Les huit récits affichent le conflit canonique de chaque Gardien, sa valeur et l’action attendue dans son combat. Le Journal et la rencontre du pays utilisent les histoires et règles existantes ; Kaïs reste le Porteur du Lien et l’Oubli conserve sa place dans le canon.

## Preuves de jeu et de reprise

Le test France prépare la quête de Céliane, les pouvoirs, l’énigme et les choix de Justice par les commandes réelles. Le Gardien commence avec tous ses points de vie. Le test utilise le combat sur le terrain : garde, récupération, mouvement et attaques validées. Il recharge la sauvegarde au milieu du duel, compare cette reprise à une exécution ininterrompue, obtient le sceau, restaure le pays puis retourne dans la Cité. Il vérifie Céliane, Justice, le premier secteur du Cercle, les changements de plateforme et l’absence de seconde récompense.

Le second parcours résout les huit énigmes différentes, leurs choix de valeur et les huit combats réels. Il recharge après chaque pays, conserve les huit héritages et n’accorde aucune victoire automatique contre l’Oubli. Aucun de ces parcours ne soumet des points de vie, dégâts ou résultats de victoire fabriqués.

Vérification ciblée finale : **102 tests réussis**, couvrant les nouveaux parcours, les salles, leurs chemins et collisions, la caméra, le ciel, les préférences de mouvement, les graphismes, la mobilité, le canon, les services persistants, le replay HTTP et l’évolution des huit héritages. Le test de navigation des neuf paysages réels a également réussi. La compilation des sources Monde a réussi. Le lot d’intégration a ensuite confirmé la compilation complète et **1483 tests réussis sur 1484, aucun échec, un test Swift ignoré sur Windows**.

Les dix-neuf salles restent chacune sous 80 maillages, sans lumière ni animation supplémentaire. La couronne utilise au plus trois appels de dessin : 32 éléments de cercle sur profil compact, 48 sur profil complet, plus huit accents de jonction. Ces limites sont vérifiées dans les tests ; elles ne sont pas des mesures de fluidité sur téléphone.

## Contrôle visuel local

Le dossier de travail `work/visual-world`, hors application livrée, expose le vrai `WorldPage` et sa scène au port 5181. Son scénario par défaut est construit avec le moteur réel après restauration de la France. Il offre Archives, Garage, Cité et Panorama, ainsi que les scénarios combat France et huit héritages. Une configuration Vite locale isole ses appels de compte et de récompenses ; l’authentification de l’application livrée est inchangée. Le contrôle navigateur a confirmé les textures, le ciel nocturne, les Archives, la rotation de caméra et le retour extérieur.

## Limites conservées

Les salles sont des volumes générés à partir de primitives réutilisées ; elles ne sont pas des intérieurs artistiques définitifs ni l’intégralité de l’immeuble. La position dans une salle reste transitoire, tandis que ses services enregistrent leurs créations dans la sauvegarde Monde habituelle. Un rechargement complet revient au lieu extérieur.

Les voies et quais gardent leurs simulations actuelles. Les trajets de transport restent des segments entre arrêts ; la navigation des navires et les collisions de l’eau ne sont pas une simulation hydrologique complète. La caméra vérifie des volumes approximatifs, pas tous les triangles de tous les ornements.

La composition, les monuments, les services et les huit identités canoniques sont conservés. Les nouveaux volumes n’attestent pas une reproduction définitive de toutes les références artistiques validées. Aucun nouvel asset artistique final, jeu musical final, appareil physique ou livrable Unreal n’est certifié par cette passe. La victoire obtenue par un pilote de test déterministe démontre le branchement du parcours ; elle ne remplace pas un essai humain de difficulté et de confort.
