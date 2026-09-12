# Combat : simulation, pause et contre

## Changements

Le rendu et la simulation utilisent désormais des durées distinctes. Une image peut contenir jusqu’à trois pas de simulation de 1/30 seconde maximum. Les baisses courtes jusqu’à 10 images/s ne font plus perdre du temps de déplacement ou de régénération. Une interruption supérieure à 100 ms reste plafonnée : cette protection évite les grands déplacements et attaques accumulés après un blocage. Elle n’augmente pas la puissance graphique de l’appareil.

La pause et le chargement ne font plus avancer l’horloge de jeu. La recharge du compagnon, les fenêtres de combat et les compteurs temporaires sont figés. L’onglet masqué évite également les mises à jour de rendu.

Une jauge de préparation adverse complète les marques au sol. L’indication distingue une attaque en cercle d’une attaque vers l’avant. Une esquive au moment où l’impact aurait touché ouvre une fenêtre de contre de 1,2 seconde : la prochaine attaque rapide ou puissante qui touche gagne 25 % de dégâts. La fenêtre ne se cumule pas, expire si elle n’est pas utilisée et ne bonifie pas le Cercle.

## Vérification

Tests à 15, 30 et 60 FPS : même temps simulé et mêmes valeurs de régénération sur trois secondes. Tests de plafond après interruption, pause, contre consommé une fois et expiration. Parcours navigateur : combat régional complet, victoire, refuge, sauvegarde et recharge du soutien figée dans le menu Pause.

Cette livraison modifie le fonctionnement et la lisibilité du combat. Elle ne remplace pas les modèles stylisés ni les bâtiments. Aucun engagement de 60 FPS sur un Samsung réel n’est tiré des essais de navigateur. Version locale uniquement, sans publication.
