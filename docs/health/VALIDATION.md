# Vérification Santé 3B

- Première livraison : suite complète de 2 526 tests, 2 525 réussis, 1 ignoré (15 octobre 2026). Les résultats de la livraison des nouveaux outils sont détaillés ci-dessous.
- Tests Santé : journal 90 jours, données corrompues ou interdites, valeurs invalides, détection de mouvements stationnaires et temporisation, panier ajusté aux personnes et regroupé, nuits et repos de jour, changements d’heure Europe/Paris.
- Compilation Vite réussie ; module chargé à la demande. L’avertissement existant sur les gros chunks de l’application reste présent.
- Aucun test matériel Samsung/Xiaomi effectué. La précision du podomètre web demeure non étalonnée, explicitement expérimentale.
- Le contenu repose sur des sources publiques ; aucune validation clinique revendiquée.

## Parcours navigateur

14 contrôles de parcours réussis dans Chromium headless, zéro exception JavaScript : accès sans Passeport ; journal temporaire par défaut ; consentement, rechargement et suppression ; saisies ; fiches, favoris et Échap ; filtre végétarien, personnes et courses téléchargées ; refus du capteur sans pas inventés ; respiration et sommeil à cheval sur minuit ; guide corps ; cinq onglets sans débordement en 360/390/768/1440 px ; absence de télémétrie PostHog/présence sur la route Santé.

Commande reproductible avec Playwright installé : `CHROMIUM_PATH=/chemin/vers/chromium node scripts/verify-health-browser.mjs`. Omettre CHROMIUM_PATH pour le navigateur géré par Playwright. Le serveur de test et le navigateur sont lancés et fermés ensemble. Sorties dans `/tmp/3b-health-qa` ou `HEALTH_QA_DIR`.

## Nouveaux outils et ponts natifs

- 33 tests Santé et contrats Android/iOS réussis : anciennes données préservées, énergie bornée, priorité des sources, vrai zéro / donnée absente, remplacement des imports, séances dédupliquées, changements d’heure et rappels calendaires.
- Les 14 parcours existants restent réussis, sans exception JavaScript.
- 9 contrôles supplémentaires réussis : routines/énergie après rechargement, historique 90 jours, export calendrier réel, absence de fausse connexion dans une PWA, mobilité, quatre largeurs, permission native explicite, déconnexion pendant une permission et fermeture pendant une permission de notification.
- Les trois derniers parcours utilisent un pont natif simulé uniquement dans le serveur de test. Ils vérifient les courses asynchrones du JavaScript, pas le matériel ni la délivrance réelle des permissions.
- Compilation de production Vite réussie. Interface inspectée en 360 / 390 / 768 / 1440 px, sans débordement horizontal de la page ; graphique 90 jours défilant dans sa zone.
- Android : compilation Kotlin/Java réelle, APK debug construit et 18 tests JUnit réussis, dont cinq cas de calendrier/rappels. Les tests d’appareil restent à faire.
- iOS : les contrats de source passent ; la compilation du simulateur est effectuée par le workflow mobile macOS. Une application signée et installée avec HealthKit activé est nécessaire pour les essais réels.
- La vérification complète a identifié trois attentes obsolètes déjà présentes sur `main` après la refonte de l’accueil : espace dans l’import Button et ancien portail 3D remplacé par HomeCinematicArtwork. Ces attentes sont alignées sur l’accueil approuvé, en conservant ses contrats de navigation, de réduction des mouvements et du composant WebGL autonome. Aucun composant de l’accueil n’est modifié par cette correction.

Commande supplémentaire : `CHROMIUM_PATH=/chemin/vers/chromium node scripts/verify-health-tools-browser.mjs` (Playwright installé). Résultats dans `HEALTH_QA_DIR` ou `/tmp/3b-health-tools-qa`. Le workflow Fortress exécute à nouveau la suite complète avant fusion ; le workflow mobile compile Android et iOS.
