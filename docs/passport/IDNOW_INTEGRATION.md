# Passeport 3B — intégration IDnow Trust Platform

Statut : **préparée, désactivée par défaut**.

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
8. stocke uniquement un HMAC du sessionId dans la table des tentatives ;
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
