# Crée ma ville — livraison jouable du 3 octobre 2026

## Reprise et périmètre

Reprise de `codex/city-playable-20261003` après interruption, depuis les commits locaux `b8ed387` et `87eb899`, sur la base publiée `e59ee92`. La Ville reste indépendante du Monde et la carte Passeport n'est pas modifiée.

Le constructeur possède une vue 3D et un plan 2D utilisant les mêmes coordonnées sauvegardées. Il permet sélection, placement prévisualisé, contrôle du coût et du niveau, rotation, déplacement, rangement, restauration, annulation/rétablissement et tracé routier. Les bâtiments sont issus de la sauvegarde ; le lac, les montagnes et les axes fixes sont le décor et l'infrastructure de la carte.

Le catalogue est filtrable. Douze bâtiments de quartier complètent les huit services ajoutés par la campagne. La campagne contient 24 missions principales et huit demandes facultatives. La simulation propose logements, population, emplois, eau, énergie, éducation, santé, nature, culture, mobilité, quatre orientations et huit événements à progression sauvegardée. Le cycle utilise l'heure serveur et le rattrapage est limité à douze cycles.

Les recettes quotidiennes sont des Coins de jeu, calculées sur le serveur, plafonnées à 300 et réclamables une seule fois par jour UTC. Elles ne donnent aucun euro. Récompenses, budgets et écritures privées restent soumis à l'authentification, à la session de l'appareil et aux contrôles serveur.

Le Passe Architecte regroupe cinq effets cosmétiques permanents. Le tarif de catalogue proposé est 9,90 €. Le produit reste `release_state=test`, sans identifiant Stripe/Apple/Google ajouté ni activation des paiements réels. Les missions ne demandent aucun achat.

## Correctifs de reprise

- Une actualisation de population ne peut plus ignorer une construction cliquée pendant son chargement, ni remplacer une sauvegarde plus récente.
- Le budget quotidien s'actualise avec la population.
- Le mode nuit automatique inclut minuit à 7 h.
- Les objets exposés apparaissent aussi en 3D, avec une représentation générique.
- L'effet Nuit Luxe dispose d'un éclairage décoratif en 3D.

## Validation

Les tests PostgreSQL/PGlite exécutent les migrations City, la progression des 24 missions à partir du budget initial, les contraintes de parcelles, le rangement, les droits, les récompenses uniques et le rollback en cas d'échec du portefeuille. Le portefeuille commun est isolé dans cette fixture ; les contraintes du serveur de production sont vérifiées séparément.

Recette Chromium locale à 1440 × 1000 et 390 × 844 : construction → rangement → annulation → rechargement → plan 2D → ville 3D → nuit → jour ; aucun débordement horizontal et aucune erreur JavaScript. Les données sont une fixture SQL isolée, pas une partie réelle d'un membre. Le navigateur emploie un rendu logiciel et ne mesure pas les performances d'un téléphone physique.

La suite générale exécutée avec les sous-processus autorisés : **1 518 tests réussis, zéro échec, un ignoré** (test natif Swift indisponible sur cet environnement). Les tests de migration et City ont été rejoués après raccordement des quatre versions SQL effectivement appliquées.

## Serveur publié

Le serveur `city-3b` version **11** est ACTIVE avec `verify_jwt=true`. Son fichier a été relu et comparé octet pour octet au fichier source local. Les quatre migrations ont été appliquées et leurs SHA-256 vérifiés dans le journal PostgreSQL : `20261003003042`, `20261003003056`, `20261003003108` et `20261003003133`. Le manifeste contient 182 migrations appliquées, zéro en attente. Le catalogue actif confirme 24 missions principales, 8 facultatives et 8 événements ; aucune des quatre RPC de mutation City contrôlées n’est directement exécutable par anon/authenticated.

Retour applicatif : le fichier serveur v10 correspond exactement à `e59ee92:supabase/functions/city-3b/index.ts`. Ne pas supprimer les tables de progression lors d’un retour arrière.

## Limites de cette livraison

Cette version est un city builder jouable, pas un jeu AAA terminé ou certifié. Les quatre images de référence sont des concepts et ne représentent pas exactement le rendu procédural livré. Les habitants et véhicules visibles représentent la simulation ; ce n'est pas une simulation physique individuelle complète du trafic. La 3D utilise un décor lacustre unique à huit quartiers ; elle ne fournit pas plusieurs cartes géographiques sélectionnables.

Restent notamment : direction artistique finale conforme aux concepts, cartes supplémentaires, météo 3D complète, rendu spécifique de chaque objet de collection, gestion du trafic détaillée, recette authentifiée hébergée des achats et remboursements, et essais longs sur Samsung (veille, réseau dégradé, chauffe, mémoire). Les paramètres météo sont sauvegardés mais ne constituent pas une simulation météorologique 3D complète.

Le lancement public des paiements est une étape distincte, dépendante des produits et canaux réellement configurés. Aucun achat fictif ni droit premium gratuit n'est ajouté aux comptes.
