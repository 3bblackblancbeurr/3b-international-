# Passeport 3B — intégration IDnow Trust Platform

Statut : **préparée, désactivée par défaut**.

Le serveur ne peut attribuer une identité civile vérifiée qu’en environnement
`production` / `live`, avec le flux PVID et les validations juridique, rétention,
mineurs et recette sandbox approuvés. Un résultat accepté en sandbox demeure un
résultat de test et n’est jamais repris comme preuve civile dans une attestation.

## Choix fournisseur

IDnow est le fournisseur principal retenu pour le pilote France/UE.

Raisons techniques :
- API Trust Platform ;
- OAuth 2.0 client credentials ;
- flows séparés staging/live ;
- player URL pour le parcours utilisateur ;
- webhooks JWT signés ;
- JWKS distincts sandbox/production ;
- eventId stable pour idempotence ;
- outcome final accepted/rejected ;
- capacité de fonctionner sans exposer de PII dans les webhooks.

Checkout IDV reste le fournisseur de secours.

## Sécurité de l'adaptateur 3B

La fonction `passport-idv` reste fail-closed tant que :
- `PASSPORT_IDENTITY_VERIFICATION_ENABLED=true` ;
- `PASSPORT_IDENTITY_PROVIDER=idnow` ;
- client ID + secret sont présents ;
- flow ID est présent ;
- audience webhook HTTPS est configurée ;
- secret de pseudonymisation 3B est configuré.

Un flux production/live exige aussi :
- `IDNOW_PVID_FLOW_APPROVED=true`.

Le frontend ne peut jamais définir lui-même une identité comme vérifiée.

## Démarrage d'une session

Le serveur :
1. vérifie la session Supabase et qu'elle est toujours active ;
2. exige un Passeport actif ;
3. refuse si l'identité est déjà vérifiée ;
4. charge les claims civils depuis la table service-only ;
5. crée un subjectId pseudonyme HMAC ;
6. obtient un token IDnow client_credentials ;
7. crée la session IDnow avec BasicIdentity ;
8. appelle `passport_identity_begin_attempt_v1` : revérifie la session active, verrouille le profil, stocke uniquement un HMAC du sessionId et passe le profil à `pending` dans la même transaction ;
9. renvoie seulement playerUrl + attemptId au client.

## Webhook

Le webhook :
1. exige `application/jwt` ;
2. vérifie la signature IDnow avec le JWKS officiel ;
3. vérifie issuer + audience + expiration ;
4. déduplique avec eventId ;
5. retrouve la tentative avec le hash du sessionId ;
6. récupère le résultat final directement via l'API IDnow ;
7. vérifie flowId + subjectId ;
8. applique `verified` uniquement si outcome=accepted ET le flow a été explicitement approuvé.
9. réclame chaque `eventId` via un lease atomique côté PostgreSQL ; un événement terminé reste idempotent et un traitement interrompu devient reprenable après deux minutes.

Un résultat IDnow accepté ne suffit donc pas à lui seul si le mauvais flow a été configuré.

Les résultats négatifs (`rejected`, `expired`, `cancelled`, `error`) passent par `passport_identity_finish_attempt_v1`. La mise à jour de la tentative et celle du profil utilisent le même verrou de profil que le démarrage et la confirmation positive. Le serveur refuse une tentative terminée, remplacée par une plus récente, liée à une autre référence fournisseur, sans consentement enregistré, ou dont le Passeport est suspendu ou l'identité révoquée. Deux anciennes tentatives ayant exactement la même date de démarrage sont ambiguës : aucun résultat ne peut promouvoir ou rétrograder l'identité dans cet état.

Le RPC de résultat négatif accepte seulement des couples état/code d'erreur prévus ; il ne peut jamais passer une identité à `verified`. Les trois RPC de transition sont réservés au rôle serveur, sans droit `EXECUTE` pour `PUBLIC`, `anon` ou `authenticated`.

Les webhooks sont limités à **30 000 octets pendant leur lecture**, avant la vérification cryptographique, sans chargement préalable d'un corps de taille arbitraire. Les demandes JSON du membre sont limitées à 8 192 octets et aux champs attendus. Un encodage UTF-8 invalide est refusé.

## Ordre de livraison du correctif du 15 octobre 2026

La migration `20261015120046_passport_identity_attempt_transactions_v1.sql` est **appliquée le 15 octobre 2026** sur le projet 3B. Son texte a été relu depuis l'historique réel et comparé au fichier versionné. Les droits serveur des trois fonctions ont été vérifiés. Elle ne modifie pas les preuves ni les profils existants et n'active aucun fournisseur.

`passport-idv` version 3 et `passport-recognition` version 2 ont ensuite été déployées. Les cinq fichiers de chaque fonction correspondent aux sources du dépôt. Les contrôles HTTP sans compte confirment les refus d'authentification, d'origine et de taille excessive. Cela ne remplace pas le parcours fournisseur authentifié ci-dessous ; aucune clé fournisseur ni porte d'activation n'a été changée.

1. Pour tout nouvel environnement de recette, appliquer cette migration et vérifier les privilèges des trois fonctions.
2. Déployer ensuite la version correspondante de `passport-idv` dans cet environnement. Ne pas déployer cette Edge Function avant ses RPC : les démarrages et résultats négatifs seraient refusés.
3. Exécuter les scénarios fournisseur sandbox : deux démarrages simultanés, expiration suivie d'une nouvelle tentative, ancien événement reçu après la nouvelle tentative, événement en double, révocation administrative et résultat sandbox accepté.
4. Valider les critères contractuels et techniques avant toute activation fournisseur ; conserver les portes d'activation fermées jusqu'à cette validation.

`tests/passport-idv-transactions.test.js` exécute le SQL avec PGlite : session active, transaction unique, résultats obsolètes, révocation, référence fournisseur, consentement, ambiguïté de date et droits par rôle. PGlite sérialise ses requêtes ; ce test ne remplace pas une recette de concurrence multi-connexions sur PostgreSQL ni le parcours IDnow réel.

## URLs officielles prévues

Sandbox :
- Auth : `https://auth.eu.platform.idnow.sx`
- API : `https://api.eu.platform.idnow.sx`
- JWKS : `https://auth.eu.platform.idnow.sx/oidc/.well-known/jwks.json`

Production :
- Auth : `https://auth.eu.platform.idnow.io`
- API : `https://api.eu.platform.idnow.io`
- JWKS : `https://auth.eu.platform.idnow.io/oidc/.well-known/jwks.json`

## Avant activation sandbox

Il manque encore les éléments que doit fournir IDnow :
- organisation sandbox ;
- client ID ;
- client secret ;
- flow ID publié en staging ;
- URL webhook enregistrée ;
- audience exacte ;
- confirmation du flow PVID à utiliser ;
- DPA / rétention / conditions commerciales.

Le mail commercial IDnow a été envoyé le 28 septembre 2026.
