# Crée ma Ville : terrain et réseau créés par le joueur

La carte ne produit plus de routes, fontaine centrale ou promenade automatiquement. Seules les routes sauvegardées par le joueur sont affichées ; les bâtiments et l'économie existants sont conservés. Le premier objectif proposé par la campagne serveur devient « Le premier chemin ».

## Jouer

- Routes : glisser du départ à l'arrivée, ou toucher deux points ; choisir droite ou angle droit, largeur 2/4/8 mètres, examiner l'aperçu et valider. Les points proches d'un axe existant se raccordent à cet axe. Après validation, continuer depuis l'extrémité.
- Paysage : choisir lac, rivière, arbre Matrix, jardin, banc ou éclairage. Toucher une parcelle pour les objets ; tracer une rivière comme une route. Choisir la taille puis valider.
- Recommencer abandonne l'aperçu sans mutation. Retirer le dernier, annuler et rétablir passent par le serveur. Les anciens historiques de bâtiments restent compatibles.
- Quitter l'outil permet de déplacer la caméra avec le doigt ; les boutons de caméra restent disponibles pendant le tracé.

Les routes, lacs et rivières sont libres, sans paiement. La sauvegarde conserve au maximum 256 segments routiers et 128 éléments de paysage. Le paysage est une composition visuelle ; il ne simule pas encore une hydraulique, une excavation ou des ponts. Les petites branches d'un tracé en angle droit doivent mesurer au moins six mètres.

## Persistance et contraintes

`nexus_city_plan_terrain` verrouille la ville, contrôle le Passeport actif, les formes, dimensions, identifiants et collisions, puis ne modifie que `city.terrain`. Aucune récompense, preuve de mission ou somme cliente n'est acceptée. Une comparaison du plan attendu évite d'écraser l'édition d'une autre session. Le nouveau tracé utilise `nexus_city_plan_roads_v2` pour la même protection ; l'ancien endpoint routier reste compatible avec les applications précédentes.

Les nouveaux placements ne traversent pas les routes ou paysages. L'eau ne traverse pas les bâtiments ou routes ; les nouvelles routes ne traversent pas l'eau. Les anciens placements conservés ne sont pas déplacés. Les quartiers verrouillés gardent leurs conditions d'accès. Les formes d'eau emploient un calcul de distance qui accepte un segment de longueur nulle, contrairement au calcul de mobilité qui ignore volontairement les axes trop courts.

## Direction visuelle

Arbres géométriques bleus, anneaux Matrix, troncs sombres et branches dorées. Façades vitrées latérales, corniches, terrasses de toiture, panneaux solaires, jardinières et détails d'entrée. Les logements adoptent une toiture moderne. Les voies reçoivent des bordures bleues et des extrémités arrondies. Géométries partagées, matériaux regroupés, pas de nouvelles textures téléchargées. Les plafonds de rendu mobile existants sont conservés.

## Validation

31 tests ciblés : navigation des habitants, campagne, économie, ancien client, compte authentifié, sauvegarde, collisions, reprise et refus d'une modification concurrente. La migration a été testée sur PostgreSQL embarqué avant application ; les fonctions de production ont été vérifiées en lecture, y compris leurs droits limités au serveur. Les tests complets et builds sont exécutés par la CI. Les gestes sur un Samsung réel et la session Passeport connectée restent à vérifier ; aucun label AAA terminé n'est revendiqué.
