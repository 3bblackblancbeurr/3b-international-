# 3B Command OS V4 — intégrations réelles

Date : 27 septembre 2026

## Objectif

Remplacer les anciens états externes statiques par un véritable gateway propriétaire, sans transférer les jetons OAuth de ChatGPT vers l’application et sans exposer de secret au navigateur.

## Architecture

Le frontend appelle uniquement :

- `GET /api/command-integrations` pour les états et résumés ;
- `POST /api/command-integrations` avec `action=ai` pour 3B IA Command.

Le gateway vérifie avant tout appel fournisseur :

1. la session Supabase du compte 3B ;
2. le `session_id` actif ;
3. la configuration `control_center_settings` ;
4. l’identité du propriétaire ;
5. l’origine autorisée.

Les jetons fournisseurs restent uniquement côté serveur.

## Google Workspace

Variables requises :

- `COMMAND_GOOGLE_CLIENT_ID`
- `COMMAND_GOOGLE_CLIENT_SECRET`
- `COMMAND_GOOGLE_REFRESH_TOKEN`

Le gateway renouvelle un access token Google côté serveur puis lit :

- Gmail `INBOX.messagesUnread` ;
- jusqu’aux 5 prochains événements du calendrier principal.

Le navigateur ne reçoit jamais le refresh token ou l’access token.

L’autorisation Google doit être accordée explicitement une fois avec les scopes lecture Gmail et Calendar. Les connexions Google disponibles dans ChatGPT ne sont pas exportées dans l’application 3B.

## Réseaux sociaux — Metricool

Variables requises :

- `COMMAND_METRICOOL_TOKEN`
- `COMMAND_METRICOOL_USER_ID`
- `COMMAND_METRICOOL_BLOG_ID`

Le gateway appelle l’API Metricool côté serveur et renvoie uniquement le nom de la marque et les réseaux connectés détectés.

Un compte Metricool connecté dans ChatGPT ne rend pas son jeton disponible au frontend 3B. L’application exige son propre accès API serveur.

## Finances — Stripe

La V4 réutilise `STRIPE_SECRET_KEY`, déjà prévue par la boutique 3B.

Le gateway lit uniquement le solde Stripe :

- disponible ;
- en attente ;
- devise ;
- mode TEST ou LIVE.

Une clé `sk_test_` reste clairement affichée **TEST**. Aucun solde Stripe TEST n’est présenté comme argent réel.

La V4 ne prétend pas fournir un compte bancaire général. Une banque ou un agrégateur Open Banking nécessite une intégration séparée et un consentement propre.

## Vercel

Variables requises :

- `COMMAND_VERCEL_TOKEN`
- `COMMAND_VERCEL_PROJECT_ID`
- `COMMAND_VERCEL_TEAM_ID` optionnel

La V4 charge les derniers déploiements du projet et expose uniquement leur état, cible et horodatage.

## 3B IA Command

Variables requises :

- `OPENAI_API_KEY`
- `COMMAND_AI_MODEL`

Le backend utilise la Responses API avec :

- `store:false` ;
- limite de requêtes propriétaire ;
- prompt utilisateur limité à 4 000 caractères ;
- sortie limitée ;
- aucun secret dans le contexte modèle.

Le contexte transmis à l’IA ne contient que des résumés autorisés : nombre Gmail non lu, nombre d’événements chargés, réseaux connectés, état Stripe TEST/LIVE et état Vercel. Les montants Stripe ne sont pas transmis à l’IA.

## Privacy Mode

Le frontend masque :

- prochain événement ;
- montants Stripe ;
- données PC déjà protégées par le Privacy Mode V3.

Les secrets ne sont pas présents dans le frontend, même lorsque Privacy Mode est désactivé.

## États

Chaque source externe renvoie un état explicite :

- `live` : fournisseur réel joignable ;
- `test` : fournisseur réel en sandbox/test ;
- `configured` : configuration serveur présente, action disponible ;
- `setup_required` : secret/autorisation applicative manquante ;
- `error` : fournisseur configuré mais en échec.

Aucune absence de configuration n’est convertie en fausse donnée.

## Validation attendue

Avant fusion :

- tests de contrat owner/CORS ;
- tests de non-fuite des secrets ;
- tests fournisseur simulé ;
- tests 3B IA Command ;
- suite globale ;
- Fortress Security ;
- build Android ;
- build iOS.
