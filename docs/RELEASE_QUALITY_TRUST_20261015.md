# Livraison 3B — expérience, monde et confiance

Base : `5acc27c74dbba1419ccad4890719e51b6c6ac826` (PR #534). Cette livraison améliore le produit existant ; elle ne certifie pas un jeu AAA achevé, une reconnaissance officielle du Passeport ou un partenariat signé.

## Expérience

- Accueil : trois chapitres interactifs tirés du canon existant, présentation de Kaïs et des huit héritages, navigation clavier, fermeture Échap et retour du focus. Aucun film annoncé ou simulé.
- Menu : recherche scanner/caméra vers la caméra exacte, validation Entrée pour un résultat unique, flèche bas vers les résultats, remise à zéro du défilement et respect des liens modifiés.
- Cercle 3D : cadence plafonnée à 30 images/s, rendu arrêté lorsque caché, masqué par le menu ou le récit, hors écran, ou en mode statique. Une image nette est conservée en réduction des animations. Redimensionnement, reprise et nettoyage WebGL vérifiés.
- Le script navigateur `scripts/verify-app-experience.mjs` est ajouté à la CI de navigation.

## Monde ouvert

- Les trajets horaires et météo des habitants passent dans un worker dédié en série, indépendant du joueur. Annulation, remplacement et limite de temps évitent les réponses obsolètes.
- Les collisions du sol restent stables lors d'un changement d'étage de la Tour.
- Les lots de modèles échoués libèrent aussi les textures, matériaux et géométries reçus tardivement ; la destruction est idempotente.

## Passeport déployé

- Lecture bornée des demandes et rejet d'UTF-8 invalide ; authentification avant chargement des clés pour les opérations protégées de reconnaissance.
- Démarrage et résultats de vérification d'identité atomiques, verrouillés sur le profil. Refus des événements obsolètes, doublons, mauvaises références, absence de consentement et états révoqués.
- Migration réelle `20261015120046_passport_identity_attempt_transactions_v1` appliquée. Texte relu dans l'historique et identique au dépôt ; trois RPC exécutables uniquement par le rôle serveur.
- Edge `passport-idv` v4 et `passport-recognition` v3 actives. Les cinq fichiers de chaque fonction ont été relus après déploiement et correspondent aux sources.
- Sept contrôles HTTP réels passent : authentification manquante, origine refusée, tailles excessives et métadonnées publiques précisant `official_recognition: false`.
- Aucune activation fournisseur, aucun contrat et aucune certification ne sont créés par cette livraison.

## Preuves de vérification

| Contrôle | Résultat |
|---|---|
| Suite complète Node avant seconde revue | 2 472 tests : 2 471 réussis, 0 échec, 1 ignoré |
| Compilation production | Réussie ; avertissement existant de taille de certains bundles |
| Navigation navigateur, 320/390/844/1440 px | 130 contrôles réussis, aucune erreur de rendu non gérée |
| Accueil, récit et arrêt du rendu | 18 contrôles réussis, aucune erreur JavaScript |
| Worker PNJ compilé production | Six trajets ; annulation/reprise ; deux workers créés et terminés ; aucune erreur |
| Migration après alignement sur la version réelle | 12 tests réussis ; 217 migrations appliquées, 0 en attente |
| Vérification statique des frontières SQL | 191 tables publiques, 133 fonctions privilégiées, aucune violation détectée par le vérificateur |
| Vérification de marque | Réussie ; neuf emplacements de logos officiels toujours en attente |
| Préparation Passeport | Fondations statiques valides ; activation externe non prête |

La navigation locale utilise un compte synthétique et des services simulés. Le worker a été exécuté dans Chromium, y compris son bundle compilé ; ces mesures ne sont pas des performances sur téléphone réel. Les scénarios SQL PGlite ne constituent pas une épreuve de concurrence PostgreSQL multi-connexions ni une recette IDnow authentifiée.

## Seconde revue avant publication

Une revue contradictoire avec Claude, autorisée par le propriétaire, a examiné des extraits techniques sans secret ni donnée de membre. Deux échanges ont conduit à renforcer le lecteur HTTP : échéance globale de dix secondes, interruption du client, annulation du flux sans attente et maintien du code 413 même si l’annulation échoue. La file PNJ isole désormais les erreurs des notifications, et sa destruction fonctionne aussi lorsque la méthode est détachée.

Les cinq nouveaux tests couvrent les erreurs de notifications, la suppression suivie immédiatement d’un nouveau trajet, les annulations de flux défaillantes, les corps partiels bloqués et l’interruption avant/pendant lecture. Les 31 tests ciblés associés et les 17 tests identité/transactions passent ; la compilation finale réussit. Claude n’a relevé aucun bloqueur démontrable sur les extraits corrigés. Ce verdict est limité : il n’est ni un audit complet ni une validation de performance sur téléphone.

## Conditions restant à remplir

- Mesurer une session prolongée sur Samsung S21 et Xiaomi réels, puis valider les retours accueil, changements de compte et reprises réseau. Les gels ne sont pas déclarés intégralement résolus.
- Produire et intégrer les films, voix, personnages et royaumes manquants avec leurs droits d'usage, puis tester la continuité narrative et les objectifs jouables.
- Conclure un premier accord partenaire avec un avantage précis, les données minimales, un test de révocation et une période pilote. Voir `passport/PARTNERSHIP_EXECUTION_20261015.md`.
- Contractualiser le flux d'identité exact et sa portée de qualification, réaliser sa recette sandbox, puis faire valider données, conservation, mineurs et protection des comptes avant activation.
- Vérifier la protection contre les mots de passe compromis dans l'environnement cible avant l'ouverture du contrôle d'identité.
