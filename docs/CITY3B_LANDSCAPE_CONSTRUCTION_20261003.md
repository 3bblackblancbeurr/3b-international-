# Créer ma ville — jeu 3D horizontal et grand territoire

Cette livraison remplace la page d’édition verticale par une scène 3D plein écran. La carte reste visible en permanence ; quatre outils principaux ouvrent construction, routes, objectifs et gestion. La sélection d’un bâtiment affiche ses commandes et les informations utiles. Les coordonnées X/Z, aperçu privé, recalcul manuel, choix de météo sans rendu et basculement 2D sont retirés de l’interface du jeu.

Le téléphone se joue en paysage. En portrait, une invitation à tourner le téléphone remplace l’interface. Le plein écran demande le verrouillage paysage lorsque le navigateur le permet ; l’application entière conserve son orientation habituelle à la sortie. Le verrouillage réel dépend du navigateur et doit encore être contrôlé sur un Samsung physique.

## Terrain et caméra

Le terrain a maintenant une emprise fixe de 1 000 × 1 000 unités : environ 27,7 fois la surface initiale de niveau 1, hors zones réservées. Le lac et les quartiers réservés gardent leurs contraintes. Le maximum est de 500 bâtiments placés et 256 segments de route. Ce sont des limites réelles côté serveur, pas seulement un zoom plus éloigné.

La migration conserve les coordonnées et dimensions des constructions déjà achetées. La géométrie du réseau central est figée à l’échelle de l’ancienne ville au moment de la migration ; elle ne se déplace plus lorsque le niveau augmente. Les villes nouvelles démarrent autour d’un cœur compact sur un grand terrain libre. La caméra ouvre sur les constructions et propose retour à la ville, vue du territoire, rotation et zoom qui conserve le point observé.

## Chantiers et récompense

Chaque nouvelle construction reçoit son début et sa fin sur le serveur. Le chantier dure de 18 à 60 secondes selon le coût. Fondations, ossature avec grue, bâtiment en élévation puis finitions sont rendus en 3D. L’avancement reprend après fermeture ; aucun délai n’est fourni par le client. Les bâtiments existants restent terminés.

Les logements, emplois, besoins et objectifs ne comptent le nouveau bâtiment qu’à la fin des travaux. L’inauguration donne une seule fois 25 XP Ville, plus 5 % du prix en Coins, arrondis vers le bas et plafonnés à 15. Les bâtiments gratuits ne donnent pas de Coins. Le bonus utilise le verrou utilisateur, le registre unique et la transaction du portefeuille. Déplacement, rangement/restauration et répétition de la requête ne le recréent pas. Un échec du portefeuille annule toute l’opération.

Les modèles de départ ont désormais de vraies parcelles, sans changer les dimensions achetées précédemment. L’architecture est procédurale et stylisée ; les ombres sont calculées en 3D, avec une carte d’ombres réduite sur les appareils tactiles. Les actualisations de l’horloge ne reconstruisent pas à elles seules les maillages.

## Références de conception

- EA, guide officiel SimCity BuildIt : placement près des routes, logements, services, développement et récompenses. https://help.ea.com/fr/articles/simcity/simcity-buildit/beginner-guide/
- Paradox, Cities: Skylines II, services : lire les besoins des habitants et construire des équipements utiles. https://www.paradoxinteractive.com/games/cities-skylines-ii/features/city-services-districts-policies

Ces principes sont adaptés au jeu 3B. Aucun graphisme, modèle, nom ou interface des jeux de référence n’est copié.

## Vérification et limites

Tests SQL isolés : terrain éloigné, limites et collisions, conservation des anciennes villes, exclusion des chantiers de la simulation et des missions, attribution unique, rollback du portefeuille, droits et suspension. La campagne complète est rejouée avec la migration de chantier et une horloge de test accélérée exclusivement dans la fixture.

Recette Chromium sur données fictives : 1 440 × 900 et 844 × 390 ; construction, délai réel, rechargement, inauguration, rangement, annulation, jour/nuit, orientation et absence de débordement. Les étapes intermédiaires sont contrôlées par les tests de progression. Ce contrôle logiciel ne certifie pas la performance d’un téléphone réel ou une partie connectée en production.

Cette version demeure un jeu de construction stylisé. Elle ne reproduit pas tous les concepts visuels, ne comporte pas plusieurs cartes sélectionnables ni un trafic physique complet. Les objets et le passe premium conservent leur état TEST : aucun paiement réel n’est activé par cette livraison.
