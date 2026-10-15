# Monde 3B — routes des habitants et ressources de chargement

## Corrections

- Les changements d'horaire et de météo du Hub lançaient `findPath` pour chaque habitant directement sur le fil d'animation. Les calculs passent désormais par un worker dédié, en série, indépendant du trajet du joueur. Un résident attend le résultat sans se téléporter ; les mêmes collisions et le même algorithme de navigation sont conservés.
- Un nouvel horaire annule la route précédente. Reconstruire ou fermer la scène annule les requêtes et libère les attentes. Un worker sans réponse est arrêté après 10 secondes. En cas d'indisponibilité du worker, la routine physique locale reprend sans relancer un A* bloquant sur le fil d'animation.
- Les routines au sol ne sont plus recalculées avec les collisions temporaires d'un étage de la Tour. Le retour au sol actualise les horaires ; les requêtes déjà en attente conservent les indicateurs de collision du sol.
- Un échec partiel du chargement des modèles libère les géométries, matériaux et textures déjà reçus, ainsi que les ressources qui terminent leur téléchargement après cet échec. La destruction du lot est idempotente et les ressources partagées ne sont libérées qu'une fois.

## Vérifications

Tests Node : file de requêtes, remplacement, annulation, destruction, erreur du worker, expiration, worker indisponible, conservation d'un chemin autour d'un mur, nettoyage immédiat et tardif des modèles, ressources partagées. Les suites existantes de navigation, interactions du Hub, diagnostics et qualité mobile restent incluses dans la vérification ciblée.

Vérification Chromium locale avec de vrais workers de modules :

- six trajets successifs d'habitants, un seul worker réutilisé ;
- activité du fil principal maintenue pendant les calculs ;
- annulation en cours, redémarrage, puis fermeture de tous les workers ;
- worker indisponible : aucune recherche A* synchrone de secours ;
- aucune erreur JavaScript observée.

La vérification native existante a également confirmé la parité des routes pour les solides tournés, les collisions désactivées, la distance de conversation, l'eau et les terrasses du Hub, un étage sélectionné et la destination du gardien en France.

Le worker compilé pour la production (`dist/assets/route-planner.worker-*.js`) a aussi été exécuté dans Chromium : six trajets, un worker réutilisé, 259 battements du fil principal pendant environ 1 020 ms, annulation et redémarrage corrects, deux workers créés puis terminés, aucune erreur JavaScript. Ce contrôle vérifie le bundle de production sans prétendre mesurer la fluidité du monde complet.

## Limites

Ces contrôles établissent le fonctionnement du code et des workers dans Chromium local. Ils ne mesurent pas le GPU d'un Samsung S21 ou d'un Xiaomi et ne prouvent pas que toutes les causes des gels rapportés sont supprimées. Les protections de netteté et de qualité automatique de #534 sont conservées sans modification. Aucun format de sauvegarde, aucune règle serveur ni aucun élément du canon n'a été changé.
