# Vérification Santé 3B

- Suite complète : 2 526 tests, 2 525 réussis, 1 ignoré, aucune erreur (15 octobre 2026).
- Tests Santé : journal 90 jours, données corrompues ou interdites, valeurs invalides, détection de mouvements stationnaires et temporisation, panier ajusté aux personnes et regroupé, nuits et repos de jour, changements d’heure Europe/Paris.
- Compilation Vite réussie ; module chargé à la demande. L’avertissement existant sur les gros chunks de l’application reste présent.
- Aucun test matériel Samsung/Xiaomi effectué. La précision du podomètre web demeure non étalonnée, explicitement expérimentale.
- Le contenu repose sur des sources publiques ; aucune validation clinique revendiquée.

## Parcours navigateur

14 contrôles de parcours réussis dans Chromium headless, zéro exception JavaScript : accès sans Passeport ; journal temporaire par défaut ; consentement, rechargement et suppression ; saisies ; fiches, favoris et Échap ; filtre végétarien, personnes et courses téléchargées ; refus du capteur sans pas inventés ; respiration et sommeil à cheval sur minuit ; guide corps ; cinq onglets sans débordement en 360/390/768/1440 px ; absence de télémétrie PostHog/présence sur la route Santé.

Commande reproductible avec Playwright installé : `CHROMIUM_PATH=/chemin/vers/chromium node scripts/verify-health-browser.mjs`. Omettre CHROMIUM_PATH pour le navigateur géré par Playwright. Le serveur de test et le navigateur sont lancés et fermés ensemble. Sorties dans `/tmp/3b-health-qa` ou `HEALTH_QA_DIR`.
