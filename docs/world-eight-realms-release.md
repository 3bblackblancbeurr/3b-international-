# Monde 3B — huit royaumes jouables

Les portes conduisent maintenant à des territoires continus, avec de vraies routes, provinces, villages et cours des Gardiens. Chaque campagne poursuit un récit propre jusqu’au retour physique à la Cité, à une activité après la libération et à la réunion finale des huit héritages.

## Territoires et exploration

La surface de la Cité physique sert de référence : France 50×, Algérie 100×, Maroc 200×, Tunisie 100×, Espagne 150×, Italie 150×, Turquie 200×, Estonie 100×. Ce sont des territoires de fiction ; ces dimensions ne représentent pas la géographie réelle des pays. Un rayon élevé ne remplace pas le contenu : chaque territoire contient trois provinces, douze hameaux, un terminal et une cour éloignée, avec 96 maisons et des monuments aux silhouettes distinctes.

Le terrain, les arbres, les maisons et les routes sont chargés par secteurs. Les profils mobiles bornent les secteurs et les instances ; les habitants utilisent un pool local de personnages humains. Les relais permettent de traverser les grandes distances : provinces accessibles, villages découverts sur place. L’Atlas possède une vue locale, une vue complète, une recherche et des filtres.

La pierre utilise des surfaces couleur, relief et rugosité avec mipmaps, partagées entre les bâtiments. La recherche des trajets demandés par le joueur travaille dans un Web Worker et s’annule lors d’un changement de commande. Elle conserve les collisions d’eau, de belvédères et d’étages. Les 168 itinéraires de la Cité restent identiques après réduction de 42 % des vérifications de collision ; le calcul ne bloque plus les commandes lorsqu’un module worker est disponible.

## Récits et combat

Les campagnes comprennent des décisions, des traces, des escortes, des réparations, des parcours, des fenêtres de danger et des épreuves de rythme ou de protection selon le pays. Ordre, proximité, ressources, intégrité, reprises et récompenses sont conservés dans la sauvegarde. Une reprise ne distribue pas deux fois une récompense.

Chaque Gardien est placé dans sa cour réelle et possède trois phases. Les présentations visuelles suivent les états du combat : lien, protection du lieu, intensité, bouclier, ancrage fiable ou leurres. Les vies affichées reprennent la référence fournie ; l’équilibrage conserve ses propres valeurs internes. Kaïs demeure le Porteur du Lien, sans neuvième Gardien ni invocation animale inventée.

Les armes suivent les poignets des modèles humains et leurs animations. Les actions du haut du corps restent possibles pendant un saut. Les huit apparences sont des adaptations stylisées pour le rendu web ; les visages, cheveux et armures ne sont pas des sculptures finales de qualité cinématographique.

## Présentation, commandes et audio

Les événements de progression déclenchent la caméra et les animations de la scène existante. Les dialogues et sous-titres laissent voir le monde. Les widgets peuvent se fermer et se rouvrir ; sur un écran horizontal court, l’épreuve est réduite par défaut et son contenu défile sans couvrir le joystick.

Neuf thèmes synthétisés originaux accompagnent la Cité et les huit royaumes, avec variations d’exploration, de combat et de cinématique. Les sons d’impact correspondent à la famille de l’arme. WebAudio attend le geste requis par le navigateur ; volume zéro, masquage et fermeture nettoient les voix actives.

## Validation et limites

La validation de cette version comprend la suite complète de tests et la compilation Vite. Les essais WorldPage couvrent l’ordinateur et l’émulation tactile 844×390 : commandes simultanées, attaque pendant saut, fermeture/persistance du HUD, relais, décisions et reprise après échec, chargement volontaire de la référence, journal et Atlas. Les trajets du worker sont comparés au moteur existant et leur annulation est exercée dans le navigateur. WebAudio réel vérifie le geste initial, les huit thèmes, le silence à volume zéro et la reprise. Le HUD d’épreuve est également mesuré à 640×360 et 740×320.

Les scripts de vérification utilisent le vrai moteur et le vrai WorldPage dans des serveurs privés. Les positions de test et diagnostics sont injectés uniquement dans ces serveurs. Les déplacements sont ensuite effectués par clavier ou toucher ; les sols sont contrôlés par raycast sur les meshes rendus.

Le moteur Supabase utilise le même graphe de réducteurs que le client, avec validation de l’ordre, des positions déclarées et des reprises CAS. La position et le temps des cycles restent des déclarations du client ; il ne s’agit pas d’une simulation continue de déplacement sur le serveur.

La compilation et les tests navigateur ne mesurent pas la chauffe, les FPS ni le mixage à l’écoute sur un téléphone physique. Aucun rendu Unreal ni essai Android physique n’est annoncé. L’objectif artistique AAA demande encore des assets finaux et une validation prolongée sur appareils.
