# 3B AAA MASTER — Transports et mobilité

## Objectif

Faire de la mobilité une partie du gameplay, et non un simple raccourci entre menus.

Chaque grand quartier doit être accessible par :

- un chemin à pied ;
- un transport structurant ;
- un raccourci ou une alternative déblocable.

## Déplacement à pied

Valeurs initiales à tester sur Samsung :

- marche : 4,2 m/s ;
- course : 6,6 m/s ;
- sprint : 8,4 m/s.

Le personnage conserve accélération, décélération et rotation progressives. Les distances longues ne doivent jamais être imposées à pied sans activité, découverte ou choix de transport.

## 3B Express

Train circulaire desservant les dix pôles majeurs.

Ordre de référence :

1. Place de l’Héritage ;
2. Archives ;
3. Communauté ;
4. Jardins ;
5. Docks ;
6. Portail Ville 3B ;
7. Commerce ;
8. Arène ;
9. Innovation ;
10. Tour du Cercle Brisé.

Options du train :

- destination directe ;
- tour panoramique complet ;
- archives audio ;
- wagon de mission ;
- wagon secret ;
- changement de wagon ;
- arrêt narratif exceptionnel.

Le train est à la fois transport, orientation, exposition du monde, narration et source de secrets.

## Bateaux

Types :

- bateau-taxi ;
- navette maritime ;
- bateau personnel léger ;
- bateau de mission ;
- bateau panoramique.

Arrêts de référence : Docks, Jardins, Portail Ville 3B, Commerce et Place de l’Héritage.

Activités : sauvetage, livraison, escorte, exploration d’îlots, recherche d’épave, course, tempête, archive immergée et quai secret.

## Téléphériques

- T1 : Docks ↔ Tour du Cercle Brisé ;
- T2 : Jardins ↔ Archives ;
- T3 : Commerce ↔ Innovation.

Ils servent au déplacement vertical, au panorama, aux dialogues et à certains événements météo.

## Tyroliennes

Six lignes initiales :

- Tour → Place ;
- Archives → Communauté ;
- Arène → Commerce ;
- Innovation → Arène ;
- Jardins → Docks ;
- Portail Ville 3B → Docks.

Elles servent de raccourcis, défis chronométrés, sorties de fuite et accès aux toits.

## Véhicules

Trois anneaux routiers structurent le hub :

- navettes publiques ;
- véhicules urbains 3B ;
- véhicules personnels déblocables ;
- missions de livraison ;
- garage, entretien et personnalisation.

## Règles d’expérience

- aucun temps d’attente artificiel ;
- trajet annulable ;
- destination lisible ;
- première mise en scène courte ;
- voyage rapide déblocable après découverte ;
- option accessible pour les joueurs ne souhaitant pas effectuer les défis de mobilité ;
- sauvegarde correcte avant et après le trajet ;
- aucun transport ne doit charger toute la ville en mémoire.

## Critères techniques

- trajectoires déterministes ;
- cellules préchargées dans la direction du déplacement ;
- collisions simplifiées ;
- passagers et foule pilotés par budget ;
- récupération sûre après interruption ;
- au moins 30 FPS sur Android moyen ;
- aucune téléportation visible non justifiée ;
- tests entrée, sortie, reconnexion et changement de zone.
