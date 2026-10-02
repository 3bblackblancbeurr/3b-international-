# Reconnaissance du Passeport 3B — profil privé v1

Cet ajout prolonge le Passeport existant et son profil serveur. Il ne remplace ni sa carte Matrix, ni sa progression, ni ses réglages. Le profil `3b-private-recognition-v1` utilise une signature **JWS ES256** et une validation en ligne par un partenaire enregistré. Il ne revendique aucune certification, reconnaissance officielle, conformité W3C VC, service OIDC ou habilitation EUDI.

## Frontière de confiance

- Le membre s’authentifie avec sa session Supabase, validée via Auth **et** `loyalty_session_valid`.
- Le partenaire fournit un défi imprévisible, à usage unique, de 32 à 128 caractères `[A-Za-z0-9_-]`. Ce défi doit venir de sa transaction réelle ; le titulaire ne fabrique pas le défi à sa place.
- Le titulaire choisit les informations et confirme son accord. Une entrée du ledger `passport_partner_consents` est liée à chaque présentation.
- Le serveur dérive les attributs depuis les tables existantes. La signature ne peut pas transformer une déclaration utilisateur en identité civile vérifiée.
- Le partenaire est enregistré et activé par l’administration serveur après un accord réel. Le registre est **vide par défaut**. Sa clé API, aléatoire d’au moins 32 octets avant encodage, reste sur son serveur ; seul son SHA-256 est enregistré chez 3B.
- L’audience HTTPS appartient au partenaire enregistré ; elle n’est pas choisie dans le formulaire du membre.
- Le destinataire vérifie signature, algorithme, issuer fixe, audience exacte, durée et défi, puis doit appeler le vérificateur 3B. Celui-ci relit les droits et le profil actuels, l’accord, les états de révocation et consomme la présentation atomiquement.

Une signature valide seule n’établit pas la validité actuelle. Une copie de QR seule ne prouve pas la présence physique du titulaire. L’acceptation de 3B par un tiers nécessite son intégration et son accord.

## Quatre scopes

| Scope | Attributs autorisés | Source serveur |
|---|---|---|
| `passport.basic` | `passport_active: true`, `passport_version` | Passeport actif du profil courant |
| `identity.verified` | `identity_verified: true` | État `verified`, assurance réelle, date, prestataire et référence hachée présents |
| `profile.public` | `public_handle`, `display_name` | Profil public actuel ; consentement explicite |
| `access.entitlements` | `entitlements: [codes]` | Droits numériques actifs et abonnement actif/non expiré ; maximum 32 codes |

Le format ne contient jamais `auth.users.id`, date de naissance, adresse civile, document, selfie, référence brute du fournisseur, inventaire détaillé, points ou Coins. Le subject est un HMAC pseudonyme propre au couple membre/partenaire.

`age.over18` est exclu tant qu’aucune date de naissance attestée par le prestataire n’est disponible. `creator.status` est exclu de ce premier profil afin de ne pas assimiler une présence créateur à une certification. Un badge public/fondateur reste distinct de l’identité civile vérifiée.

## Endpoint `passport-recognition`

Base : `SUPABASE_URL/functions/v1/passport-recognition`. Les POST sont JSON. Les actions du membre prennent son `Authorization: Bearer ACCESS_TOKEN` et la clé publique Supabase habituelle. Le partenaire utilise son **propre** `Authorization: Bearer PARTNER_API_KEY`, depuis son serveur. Ne pas placer cette clé dans un navigateur, QR ou URL.

| Appel | Authentification | Résultat |
|---|---|---|
| `GET ?action=metadata` | Public | Profil privé, issuer, URI JWKS/vérification, algorithme, scopes, TTL et obligation de validation en ligne |
| `GET ?action=jwks` | Public | Clé publique uniquement ; aucun champ `d` |
| `POST {"action":"status"}` | Membre | `{readiness,partners,proofs}` ; aucun matériau secret |
| `POST {"action":"issue","partnerId":"UUID","scopes":["passport.basic"],"nonce":"CHALLENGE_PARTENAIRE","consent":true}` | Membre | `{proof,proofJWT,proofId,expiresAt,partnerName}` ; les deux propriétés `proof` désignent la même chaîne JWS |
| `POST {"action":"revoke","proofId":"UUID"}` | Propriétaire | `{ok:true,proofId}` ; possible même lorsque la signature est désactivée ou indisponible |
| `POST {"action":"verify","proof":"JWS","nonce":"CHALLENGE_PARTENAIRE"}` | Partenaire | `{valid:true,issuer,audience,subject,proofId,scopes,claims,expiresAt,oneTime:true}` ; consommation unique |

`readiness` contient `configured`, `enabled`, `ready`, `hasPartners`, `registryReady`, `algorithm`, `ttlSeconds`, `issuer` et une liste de codes de configuration manquante. `ready` exige le matériau valide et au moins un partenaire actif. Aucun partenaire n’est créé pour rendre cet indicateur positif.

`partners` contient `{id,name,website,scopes}` uniquement pour des enregistrements actifs. `proofs` contient les métadonnées des 20 présentations les plus récentes du titulaire : `{id,partnerId,partnerName,scopes,issuedAt,expiresAt,revokedAt,consumedAt,status}`. Cette liste décrit le cycle de vie ; la validité effective reste décidée par l’appel de vérification et les droits actuels.

Les erreurs sont `{error:"message"}`. HTTP 401 signifie une authentification invalide ; 403 une origine, audience, scope ou un défi refusé ; 400 une présentation invalide, expirée, déjà consommée, révoquée ou devenue incompatible avec le profil ; 429 une limite de fréquence ; 503 un service/configuration indisponible. Les erreurs n’incluent ni clé, payload fournisseur, SQL détaillé ni stack trace.

## Format signé

En-tête protégé fixe : `{ "alg":"ES256", "typ":"3B-Recognition+jwt", "kid":"IDENTIFIANT_CLE" }`. Aucun algorithme alternatif ni URL de clé fournie par le token n’est accepté.

Payload strict : `{v:1,iss,aud,sub,jti,iat,exp,nonce_hash,scopes,claims}`. `iat` et `exp` sont des secondes Unix ; la durée maximale est **300 secondes**. `jti` est l’identifiant opaque de la présentation. `nonce_hash` est le SHA-256 du défi ; le défi brut reste chez le partenaire. Les clés de claims doivent correspondre exactement aux scopes choisis.

Le partenaire fixe l’issuer attendu dans sa propre configuration. Il utilise le JWKS publié par l’endpoint connu et ne suit jamais un `jku`, `x5u` ou une clé embarquée dans le token. Le vérificateur 3B réimporte la clé publique connue, vérifie ES256 puis contrôle le payload stocké en PostgreSQL et son état actuel.

Le couple `(partner_id,nonce_hash)` est unique, y compris après consommation ou expiration. La révocation du consentement, du profil, de la preuve, du partenaire ou des droits bloque une signature encore cryptographiquement valide. Après une vérification réussie, le partenaire doit enregistrer `proofId` et traiter sa propre action métier de manière idempotente ; une nouvelle vérification du même token est refusée.

## Configuration et clés

Variables reconnues, valeurs privées jamais exposées :

- `PASSPORT_RECOGNITION_ISSUER` : issuer HTTPS exact, sans query, fragment, identifiant/mot de passe ni espace. À défaut, `APP_URL` est utilisé ; sa valeur de base est le domaine 3B existant. L’issuer n’est jamais déduit du Host de la requête.
- `PASSPORT_RECOGNITION_SIGNING_JWK` : JWK privée EC `P-256` avec `x`, `y`, `d` de 32 octets et un `kid` sûr.
- `PASSPORT_RECOGNITION_SIGNING_KID` : identifiant optionnel prioritaire, 1 à 64 caractères `[A-Za-z0-9._-]`.
- `PASSPORT_RECOGNITION_PAIRWISE_SECRET` : secret de pseudonymisation d’au moins 32 caractères.
- `PASSPORT_RECOGNITION_ENABLED` : `false` désactive, `true` autorise ; en l’absence de valeur explicite, le réglage privé PostgreSQL est utilisé.

Les variables d’environnement ont priorité pour le matériau. En leur absence, le runtime génère des propositions cryptographiques, valide la cohérence clé privée/publique par une vraie signature-vérification, puis appelle `passport_recognition_signing_material_v1`. Le RPC initialise uniquement les secrets manquants dans **Supabase Vault**, sous verrou transactionnel. Les démarrages concurrents récupèrent ainsi la même clé stable. Les secrets ne sont jamais journalisés, remis au client ni réécrits par un démarrage ultérieur.

Les noms Vault sont `passport_recognition_signing_jwk` et `passport_recognition_pairwise_secret`. Le RPC, les tables privées et les fonctions de reconnaissance sont refusés aux rôles `anon` et `authenticated` ; seul le service serveur les utilise. Si Vault est absent ou le matériau invalide, l’émission échoue explicitement. Le code ne dispose d’aucune route publique d’inscription d’un partenaire ou de changement des clés.

Le cache privé de configuration dure 30 secondes ; les RPC de consommation contrôlent toujours les états métier en base. Une rotation de clé invalide les présentations émises avec l’ancien `kid` dans ce profil à une seule clé active : révoquer les présentations ouvertes et attendre au plus cinq minutes avant une rotation planifiée. Le secret pairwise est indépendant et doit rester stable pour conserver le même pseudonyme chez un partenaire.

## QR du Passeport existant

`passport-identity` accepte `POST {"action":"issue"}` (ou `{}` pour compatibilité), avec une session membre toujours active. La réponse ajoute `ticketId` aux champs existants : `{ticketId,verifyUrl,qrDataUrl,expiresAt,passportNumber,state,version}`. Le token aléatoire de 32 octets est placé dans le fragment de l’URL du vérificateur existant ; seul son SHA-256 est stocké.

`POST {"action":"revoke","ticketId":"UUID"}` révoque uniquement un ticket du titulaire. `passport_ticket_issue_v1` verrouille le profil, vérifie la session et la limite, révoque l’ancien ticket et crée le nouveau dans une seule transaction. Il ne peut exister qu’un ticket non consommé/non révoqué par compte. `passport-verify` appelle `passport_ticket_consume_v1`, qui valide le profil actif et consomme le ticket atomiquement. Le composant visuel du Passeport reste inchangé.

## Validation

Les tests `passport-recognition-crypto.test.js` exécutent ES256 avec WebCrypto et une clé publique importée séparément : modification de payload/signature, mauvais issuer/audience/kid, algorithme substitué, expiration, durée, minimisation et pseudonymes. `passport-recognition-service.test.js` exerce les vrais handlers partagés avec un transport de base injecté : auth/session vivante, consentement, registre vide, défi, révocation sans signature, secrets absents des réponses, contrats QR et consommation unique. Les tests PostgreSQL/PGlite de la migration contrôlent les transactions, émission concurrente, révocation, session, consentement et rétrogradation des attributs.

Ces contrôles valident le logiciel. Un partenaire inscrit uniquement dans un test n’établit aucune acceptation réelle. L’activation IDnow, la preuve d’identité réelle et les accords partenaires restent des opérations distinctes, avec leurs propres éléments de preuve et tests.
