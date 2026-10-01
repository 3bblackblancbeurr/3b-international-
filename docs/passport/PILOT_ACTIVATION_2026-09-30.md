# Activation contrôlée du pilote Passeport

Préparé le 30 septembre 2026. Aucune instruction de ce document n’a été appliquée à la production dans ce travail.

## Paquet et ordre de livraison

Le code repose sur main `4f121e0efee8487c1e9a46760db9f3860030761f`, PR392 et les fondations Passeport existantes. Trois migrations nouvelles doivent rester PENDING tant qu’un opérateur n’a pas constaté leur application :

1. `20260930180000_passport_identity_atomic_lifecycle_v4.sql` : réservation/finalisation IDnow et provenance live des preuves.
2. `20260930181000_passport_partner_passkeys_pilot_v1.sql` : registre, demandes, consentement atomique, passkeys, challenges, preuves courtes et révocation après récupération.
3. `20260930203000_passport_cards_v1.sql` : cartes QR/NFC révocables liées au titulaire, qualification de la connexion Auth officielle et extension de la récupération.

Le staging existant ne possède pas nécessairement les mêmes fondations que la production. Ne pas copier le ledger de migration production vers staging. Examiner les migrations nécessaires, les appliquer sur un staging dédié et vide, puis qualifier avec comptes synthétiques. Appliquer les fondations et les trois migrations avant de déployer les fonctions qui les appellent. Le raccord récupération de `member-auth` appelle obligatoirement `passport_auth_capability` et `passport_recovery_revoke` : le déployer avant la migration ferait échouer la récupération de compte.

Fonctions à livrer ensemble après les trois migrations : `passport-idv`, `passport-passkeys`, `passport-partner`, `passport-card`, `passport-auth`, `passport-identity`, `passport-verify`, leurs imports `_shared/passport-security.js`, `_shared/passport-server.ts`, `_shared/passport-auth-recovery.js`, puis le raccord `member-auth`. Les imports sont relatifs et le déploiement doit inclure leur graphe. `passport-passkeys/deno.json` fixe `npm:@simplewebauthn/server@13.3.3` et son `deno.lock` format4 fixe les dépendances. `passport-idv` conserve `jose@6.1.0` et son verrou.

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
| `PASSPORT_CARDS_ENABLED` | `false` par défaut ; émission/activation après recette ; liste et révocation restent possibles si désactivé ensuite |
| `PASSPORT_INITIAL_PASSKEY_ENABLED` | `false` par défaut ; ouverture serveur après qualification Auth et récupération |
| `VITE_PASSPORT_INITIAL_PASSKEY_ENABLED` | `false` par défaut ; porte UI indépendante, jamais un secret |
| `PASSPORT_PARTNER_SUBJECT_SECRET` | Secret de pseudonymisation distinct, aléatoire, au moins 32 caractères ; ne pas changer sans plan de rotation des sujets |
| Variables IDnow existantes | Produit/credentials/flow/audience/référence validés ; production + live + `IDNOW_PVID_FLOW_APPROVED=true` uniquement après approbation réelle |

La dépendance de confirmation est désormais **13.3.3**, dont le [README officiel épinglé](https://github.com/MasterKale/SimpleWebAuthn/blob/v13.3.3/packages/server/README.md) prévoit Deno1.43+. Le [changelog officiel](https://github.com/MasterKale/SimpleWebAuthn/blob/v13.3.3/CHANGELOG.md) inclut le correctif13.3.2 de GHSA-6hxq-p678-4hr2. Vérification des types et tests cryptographiques passent sous Deno2.1.13 avec verrou format4 et `--frozen`, sans désactiver la vérification des types.

Cette baseline correspond à l’[annonce officielle Supabase Deno2.1](https://github.com/orgs/supabase/discussions/37941). Elle lève le conflit de minimum fournisseur de la version14, tout en laissant la recette hébergée et sur appareils réels obligatoire. L’activation reste fermée par défaut ; aucun test local ne prouve le déploiement ou l’acceptation externe. La CI utilise Deno2.1.13 pour les confirmations et Deno2.9.6 pour l’adaptateur IDnow verrouillé.

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
node --test tests/passport-*.test.js
deno check --frozen --config supabase/functions/passport-idv/deno.json supabase/functions/passport-idv/index.ts
deno check --frozen --config supabase/functions/passport-passkeys/deno.json supabase/functions/passport-passkeys/index.ts
deno check --frozen --config supabase/functions/passport-passkeys/deno.json supabase/functions/passport-card/index.ts supabase/functions/passport-auth/index.ts supabase/functions/member-auth/index.ts
deno check --config supabase/functions/passport-partner/deno.json supabase/functions/passport-partner/index.ts
deno test --frozen --config supabase/functions/passport-passkeys/deno.json supabase/functions/passport-passkeys/
npm run build
```

Les tests Deno ne demandent aucune permission ; les appels HTTP sont simulés et aucun compte réel n’est interrogé. Les tests PGlite exécutent les migrations nouvelles et fonctions, et utilisent la même définition de `loyalty_session_valid` que la migration main. Ils ne constituent pas un test de charge multiprocessus PostgreSQL ni une recette de production.
Utiliser Deno2.1.13 pour les confirmations, cartes et tests cryptographiques gelés, et Deno2.9.6 pour le verrou IDnow format5. La [recette cartes et connexion](CARDS_AUTH_READINESS_2026-09-30.md) précise l’état de production, le QR effectivement décodé, les exceptions de récupération et les essais physiques encore nécessaires.

Sur staging : terminer un flux IDnow sandbox et confirmer qu’il ne donne jamais une preuve civile live ; tester la reprise webhook et la révocation pendant traitement. Qualifier ensuite un flux production/live avec le prestataire dans son périmètre autorisé. Tester les passkeys sur appareils iOS/Android, navigateur bureau et clé physique avec UV ; refus sans clé, annulation, délai, mauvais compte, compte suspendu, récupération par clé de secours et échec de déconnexion. Valider le parcours du lien partenaire après connexion, disparition du jeton à la sortie, aucun consentement automatique, révocation et expiration. Puis réaliser une revue indépendante avant toute annonce d’acceptation externe.

## Arrêt, rétention et risques résiduels

Fermer les flags et désactiver les lignes partenaires bloque les nouveaux échanges et redemptions. La révocation du consentement et la récupération de compte ferment les demandes approuvées en attente. Les réponses déjà reçues par un partenaire ne sont pas récupérables ; sa politique doit prévoir leur suppression et leur fin de validité.

Définir et qualifier une purge pour les challenges et preuves expirées, les tentatives et l’audit des consentements selon la politique de traitement. Aucune purge automatique n’est livrée : elle ne doit pas supprimer prématurément la trace d’une nonce et rendre son rejeu possible. Prévoir un registre de nonces hachées si les demandes sont purgées. La durée de 365 jours de fraîcheur d’identité est une politique technique du pilote, à confirmer selon le cas d’usage, pas un délai réglementaire universel.

La première clé dépend de la sécurité de la connexion au compte. La récupération de toutes les clés perdues repose sur une clé de secours rotative ; un parcours de support doit être établi si elle est aussi perdue. La récupération e-mail actuelle déconnecte les autres sessions sans auto-révoquer les passkeys. Aucune certification, interopérabilité OpenID complète ni reconnaissance officielle n’est déduite de ces tests.
