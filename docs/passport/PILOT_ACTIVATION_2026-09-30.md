# Activation contrôlée du pilote Passeport

Préparé le 30 septembre 2026. Aucune instruction de ce document n’a été appliquée à la production dans ce travail.

## Paquet et ordre de livraison

Le code repose sur main `4f121e0efee8487c1e9a46760db9f3860030761f` et les fondations Passeport existantes. Deux migrations nouvelles doivent rester PENDING tant qu’un opérateur n’a pas constaté leur application :

1. `20260930180000_passport_identity_atomic_lifecycle_v4.sql` : réservation/finalisation IDnow et provenance live des preuves.
2. `20260930181000_passport_partner_passkeys_pilot_v1.sql` : registre, demandes, consentement atomique, passkeys, challenges, preuves courtes et révocation après récupération.

Le staging existant ne possède pas nécessairement les mêmes fondations que la production. Ne pas copier le ledger de migration production vers staging. Examiner les migrations nécessaires, les appliquer sur un staging dédié et vide, puis qualifier avec comptes synthétiques. Appliquer les fondations et les deux migrations avant de déployer les fonctions qui les appellent. Le raccord récupération de `member-auth` appelle obligatoirement `passport_recovery_revoke` : le déployer avant la migration ferait échouer la récupération de compte.

Fonctions à livrer ensemble : `passport-idv`, `passport-passkeys`, `passport-partner`, leurs imports `_shared/passport-security.js` et `_shared/passport-server.ts`, puis le raccord `member-auth`. Les imports sont relatifs et le déploiement doit inclure leur graphe. `passport-passkeys/deno.json` fixe `npm:@simplewebauthn/server@14.0.3` et son `deno.lock` fixe les dépendances. `passport-idv` conserve `jose@6.1.0` et son verrou.

Pour ces nouveaux endpoints, configurer le gateway Edge en cohérence avec les publishable/secret keys Supabase : l’authentification effective est faite dans la fonction (`getUser` puis contrôle `auth.sessions`). Le partenaire et le webhook ne possèdent pas un JWT utilisateur Supabase. Si `verify_jwt=false` / `--no-verify-jwt` est nécessaire à cette plateforme, cela ne dispense pas de ces contrôles internes. Aucune fonction ne doit devenir une API de mutation libre. Les endpoints partenaires `create/redeem` vérifient le secret serveur enregistré ; les autres actions exigent une session membre.

## Configuration exacte

| Variable | Règle |
|---|---|
| `SUPABASE_URL` | Projet cible explicite |
| `SUPABASE_SECRET_KEYS` ou `SUPABASE_SERVICE_ROLE_KEY` | Secret serveur avec accès service-only |
| `SUPABASE_PUBLISHABLE_KEYS` ou `SUPABASE_ANON_KEY` | Authentification du bearer auprès de Supabase |
| `APP_URL` | Origine HTTPS exacte, sans chemin ni slash final |
| `PASSPORT_PASSKEY_STEPUP_ENABLED` | `false` par défaut ; `true` après recette |
| `PASSPORT_WEBAUTHN_RP_ID` | Hostname de cette origine, par exemple `3b-international.vercel.app` |
| `PASSPORT_PARTNER_PILOT_ENABLED` | `false` par défaut ; `true` après revue du protocole et du partenaire |
| `PASSPORT_PARTNER_SUBJECT_SECRET` | Secret de pseudonymisation distinct, aléatoire, au moins 32 caractères ; ne pas changer sans plan de rotation des sujets |
| Variables IDnow existantes | Produit/credentials/flow/audience/référence validés ; production + live + `IDNOW_PVID_FLOW_APPROVED=true` uniquement après approbation réelle |

La documentation du runtime SimpleWebAuthn prévoit Node 22+ ou Deno 2.4+ ; vérification de types et tests effectués sous Deno 2.9.6. Un test local supplémentaire sous Deno 2.1.13, sans vérification de types et sans verrou, a passé les 2 tests / 15 étapes. Ce résultat ponctuel ne change pas le minimum officiellement pris en charge par le fournisseur. [Documentation SimpleWebAuthn](https://simplewebauthn.dev/docs/packages/server).

Supabase a publié une migration de ses runtimes régionaux vers une version compatible Deno 2.1 ; cette annonce ne prouve pas que le projet 3B exécute déjà Deno 2.4 ou supérieur. Le package 14.0.3 reste donc **fermé** tant que le runtime réellement hébergé, son build et un parcours complet n’ont pas été validés ; si le fournisseur n’offre pas le runtime requis, qualifier une dépendance prise en charge ou un service de vérification adapté avant activation. Les verrous ont été générés sous Deno 2.9.6 (format 5), à vérifier avec l’outil de publication retenu. [Annonce officielle Supabase](https://github.com/orgs/supabase/discussions/37941).

L’UI web autorise cette seule origine. Les webviews natives Capacitor, preview domains et un changement de domaine nécessitent une qualification distincte de WebAuthn/RP ID ; ils ne sont pas automatiquement autorisés.

## Provisionnement d’un partenaire

Après contrat et revue, un opérateur crée une ligne service-only de `passport_partner_clients`. Générer un secret de 32 octets, le transmettre par un canal sécurisé au serveur partenaire et conserver uniquement son SHA-256 hexadécimal en base. Renseigner `client_id` conforme à `[a-z0-9._:-]{3,96}`, nom public, audience HTTPS normalisée sans credentials/paramètres/fragment, scopes minimaux et finalité. Commencer avec `enabled=false` ; fixer `reviewed_at` et `enabled=true` uniquement après recette. Aucun secret d’exemple dans ce dépôt ne doit être utilisé réellement.

Le serveur partenaire POSTe à `/functions/v1/passport-partner` un JSON :

```json
{"action":"create","clientId":"partner-one","clientSecret":"<secret hex 64>","audience":"https://partner.example/verify","nonce":"<nouvelle nonce aléatoire 32 à 128 caractères URL-safe>","scopes":["passport.basic"]}
```

Il conserve requestToken, nonce et audience dans sa transaction côté serveur, ouvre `consentUrl` au membre et ne récupère la preuve qu’après consentement :

```json
{"action":"redeem","clientId":"partner-one","clientSecret":"<secret hex 64>","requestToken":"<jeton hex 64>","audience":"https://partner.example/verify","nonce":"<la même nonce>"}
```

Comparer audience/nonce/expiration aux valeurs de la transaction avant de l’accepter, puis la clôturer. Ne pas mémoriser `identity_verified` comme un statut permanent ni accorder un accès durable au seul vu de ce signal. Le pilote n’émet pas de refresh token, session du partenaire ou credential autonome. En cas de timeout après consommation, recréer une demande avec une nouvelle nonce et recueillir à nouveau le consentement : aucune seconde émission de la même preuve.

## Validation avant ouverture

```text
node --test tests/passport-security-rules.test.js tests/passport-security-database.test.js
deno check --frozen --config supabase/functions/passport-idv/deno.json supabase/functions/passport-idv/index.ts
deno check --frozen --config supabase/functions/passport-passkeys/deno.json supabase/functions/passport-passkeys/index.ts
deno check --config supabase/functions/passport-partner/deno.json supabase/functions/passport-partner/index.ts
deno test --frozen --config supabase/functions/passport-passkeys/deno.json supabase/functions/passport-passkeys/
npm run build
```

Les tests Deno ne demandent aucune permission ; les appels HTTP sont simulés et aucun compte réel n’est interrogé. Les tests PGlite exécutent les migrations nouvelles et fonctions, et utilisent la même définition de `loyalty_session_valid` que la migration main. Ils ne constituent pas un test de charge multiprocessus PostgreSQL ni une recette de production.

Sur staging : terminer un flux IDnow sandbox et confirmer qu’il ne donne jamais une preuve civile live ; tester la reprise webhook et la révocation pendant traitement. Qualifier ensuite un flux production/live avec le prestataire dans son périmètre autorisé. Tester les passkeys sur appareils iOS/Android, navigateur bureau et clé physique avec UV ; refus sans clé, annulation, délai, mauvais compte, compte suspendu, récupération par clé de secours et échec de déconnexion. Valider le parcours du lien partenaire après connexion, disparition du jeton à la sortie, aucun consentement automatique, révocation et expiration. Puis réaliser une revue indépendante avant toute annonce d’acceptation externe.

## Arrêt, rétention et risques résiduels

Fermer les flags et désactiver les lignes partenaires bloque les nouveaux échanges et redemptions. La révocation du consentement et la récupération de compte ferment les demandes approuvées en attente. Les réponses déjà reçues par un partenaire ne sont pas récupérables ; sa politique doit prévoir leur suppression et leur fin de validité.

Définir et qualifier une purge pour les challenges et preuves expirées, les tentatives et l’audit des consentements selon la politique de traitement. Aucune purge automatique n’est livrée : elle ne doit pas supprimer prématurément la trace d’une nonce et rendre son rejeu possible. Prévoir un registre de nonces hachées si les demandes sont purgées. La durée de 365 jours de fraîcheur d’identité est une politique technique du pilote, à confirmer selon le cas d’usage, pas un délai réglementaire universel.

La première clé dépend de la sécurité de la connexion au compte. La récupération de toutes les clés perdues repose sur une clé de secours rotative ; un parcours de support doit être établi si elle est aussi perdue. La récupération e-mail actuelle déconnecte les autres sessions sans auto-révoquer les passkeys. Aucune certification, interopérabilité OpenID complète ni reconnaissance officielle n’est déduite de ces tests.
