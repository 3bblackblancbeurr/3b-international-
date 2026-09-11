# Labyrinthe — campagne de 100 niveaux

La campagne comporte dix chapitres de dix niveaux déterministes. Chaque victoire déverrouille le suivant. On peut rejouer les niveaux terminés ; le meilleur score, le meilleur temps et les étoiles sont conservés. Les anciennes sauvegardes sans campagne commencent au niveau 1. La validation d'import impose une progression séquentielle, des résultats bornés et un niveau sélectionné déjà accessible.

## Difficulté et avantages

Les cartes passent de 29 × 21 à 37 × 27 cases. La lumière initiale diminue de 210 à 175, sa consommation augmente, la portée de vision diminue et les patrouilles accélèrent. La période de grâce passe de dix à quatre secondes. Les boucles et lanternes deviennent plus rares. Ces paramètres sont centralisés dans `src/games/maze-campaign.js` et chaque carte garde ses trois sceaux accessibles.

Les améliorations acquises restent actives :

| Niveaux terminés | Amélioration | Lumière supplémentaire | Réduction de recharge |
| --- | --- | --- | --- |
| 10 | Lanterne renforcée | +5 | 0,25 s |
| 25 | Éclat maîtrisé | +10 | 0,5 s |
| 50 | Veilleur des ruines | +15 | 0,75 s |
| 75 | Gardien de lumière | +20 | 1 s |

Les valeurs indiquent le bonus total du palier, sans cumul. Rejouer un niveau ne compte pas comme une nouvelle victoire pour ces paliers. Une étoile récompense la fin du niveau, une deuxième au plus un contact avec l'ombre, une troisième une victoire sans contact dans le temps cible affiché dans les règles.

Le compte 3B conserve son économie existante : 20 XP et 1 point par minute active, avec plafonds quotidiens de 600 XP et 20 points. Le temps est validé côté serveur. Les niveaux importés et les scores ne créditent pas d'XP de compte. Les avantages du Labyrinthe sont disponibles en invité ; les designs, auras et avantages fidélité restent reliés au compte. Le menu et la barre de jeu affichent ces règles, les gains réels et l'accès aux avantages.

## Personnage et mouvement

`kais-maze.webp` est une planche de 2080 × 1536 pixels, de 176 348 octets, calculée à partir du modèle existant `public/world/models/kais-3d.glb`. Elle contient huit vues espacées de 45°, chacune avec une pose Idle et douze poses réparties régulièrement dans le clip Walk. Chaque cellule mesure 160 × 192 pixels. L'ordre des lignes est nord, nord-est, est, sud-est, sud, sud-ouest, ouest, nord-ouest. L'ancrage au sol est (0,5 ; 0,7970911628290045). Les vues de face et de dos proviennent du modèle animé ; aucune dépendance 3D n'est chargée par le jeu Canvas.

Le déplacement parcourt les centres des couloirs à 5,7 cases par seconde et conserve le reliquat de distance en franchissant une case. Les virages perpendiculaires attendent le centre ; les demi-tours répondent immédiatement. Relâcher la commande arrête le mouvement. La phase de marche dépend de la distance parcourue. L'orientation suit le trajet et reste conservée à l'arrêt. L'interpolation entre deux pas de simulation rend le personnage et la caméra continus sur les écrans à fréquence élevée. La visibilité est recalculée seulement lorsque la position logique, la portée ou les passages changent.

## Validation

- Tests Node du déplacement, des murs, des virages, de l'arrêt, des vues et de l'interpolation ; accessibilité et paramètres des 100 cartes ; déblocage, rejeu, paliers et sauvegardes.
- Une simulation réussit les 100 niveaux dans l'ordre avec le mouvement et les éclats ordinaires, sans modifier la vie ni téléporter le personnage. Elle connaît les chemins : ce résultat vérifie la faisabilité, pas la difficulté ressentie par un débutant.
- Vérifications navigateur en 1440 × 1000, 390 × 844 et 844 × 390 : contrôles, quatre orientations, animation et pose d'arrêt, campagne, carte, pause, cadrage et autres jeux. Tactile émulé dans Edge.
- `supabase/maze-rewards-test.sql` vérifie le crédit du temps actif, l'absence de double crédit, les interruptions, les permissions et la sauvegarde de campagne sur Supabase dans une transaction annulée. Aucun solde réel n'est modifié.
- La fonction `member-hub` autorise les aperçus locaux sur 5186 et 5187 en plus des origines existantes. L'authentification privée est conservée et vérifiée ; aucun changement de schéma n'est nécessaire.
