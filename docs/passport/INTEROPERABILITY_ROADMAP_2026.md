# Passeport 3B — Interopérabilité et reconnaissance externe 2026

Date : 29 septembre 2026  
Statut : architecture cible et feuille de route. Le Passeport 3B reste une identité numérique privée ; aucune équivalence avec une CNI, un passeport d'État ou un schéma eID notifié n'est revendiquée.

## 1. Ambition

Faire du Passeport 3B une clé d'identité privée et de confiance utilisable :

- dans l'écosystème 3B ;
- chez des magasins et partenaires physiques ;
- sur des sites et applications partenaires ;
- pour se connecter avec « Continuer avec Passeport 3B » ;
- pour présenter des preuves minimales (membre, majorité, identité vérifiée, créateur, accès) ;
- avec une carte physique QR/NFC ;
- avec une trajectoire compatible avec les standards de portefeuilles d'identité numériques européens.

## 2. Trois niveaux de reconnaissance

### Niveau A — 3B privé
Réalisable directement par 3B : compte, Passeport, QR à usage unique, Passkey, statut membre, progression, accès, fidélité et consentements.

### Niveau B — partenaires
Un commerce, site ou organisme privé accepte volontairement une preuve Passeport 3B. L'intégration doit utiliser des protocoles standards, une liste de clients autorisés, des scopes minimaux, un consentement et une révocation.

### Niveau C — identité réglementée
Une CNI/passeport d'État, un moyen d'identification électronique notifié, FranceConnect/FranceConnect+ ou une attestation qualifiée relève de cadres réglementaires et d'autorités externes. 3B ne doit jamais afficher ou promettre ce niveau sans habilitation, qualification, certification ou partenariat réellement obtenu.

## 3. Standards cibles

Socle recommandé :

- OAuth 2.0 / OpenID Connect pour « Continuer avec Passeport 3B » ;
- Authorization Code + PKCE, state, nonce et redirect URI strictes ;
- W3C Verifiable Credentials Data Model 2.0 comme format de référence stable ;
- OpenID for Verifiable Credential Issuance 1.0 pour l'émission ;
- OpenID for Verifiable Presentations 1.0 pour la présentation ;
- profils à divulgation sélective (par exemple SD-JWT VC lorsque le cas d'usage le justifie) ;
- Passkeys/WebAuthn pour la preuve de possession du compte ;
- suivi de l'Architecture and Reference Framework EUDI et de son infrastructure de confiance.

Ne pas annoncer un service OpenID4VC/EUDI comme actif tant que les métadonnées, clés, tests d'interopérabilité et exigences juridiques ne sont pas réellement satisfaits.

## 4. Types de preuves 3B

### 3B Member
Prouve uniquement qu'un Passeport actif existe.

Claims minimales :
- identifiant pairwise/pseudonyme ;
- statut actif ;
- version du Passeport ;
- date d'émission si nécessaire.

### 3B Verified Identity
Prouve que le titulaire a réussi une vérification d'identité externe acceptée.

Ne transmet pas automatiquement :
- numéro de CNI/passeport ;
- scan de document ;
- selfie ;
- biométrie ;
- référence brute du fournisseur.

### 3B Age Over
Preuve booléenne :
- age_over_16 ;
- age_over_18 ;
- ou autre seuil autorisé.

Le partenaire reçoit le résultat du seuil, pas la date de naissance, sauf nécessité légitime et consentement distinct.

### 3B Creator
Pour un futur vendeur/créateur Nosbloc ou Boutique :
- identité 3B pseudonyme ;
- statut créateur ;
- statut de vérification éventuel ;
- droits/permissions du compte.

### 3B Access
Pour événement, espace privé, communauté, service ou avantage :
- droit d'accès ;
- expiration ;
- audience ;
- usage unique si nécessaire.

## 5. « Continuer avec Passeport 3B »

Le partenaire doit :

1. être enregistré côté serveur ;
2. utiliser une redirect URI exacte ;
3. utiliser Authorization Code + PKCE ;
4. envoyer state et nonce ;
5. demander seulement les scopes requis ;
6. afficher un écran de consentement 3B ;
7. recevoir un identifiant pairwise plutôt que l'identifiant interne ;
8. pouvoir révoquer le grant ;
9. ne jamais recevoir XP, Coins, inventaire, adresse ou identité civile par défaut.

Scopes cibles :
- passport.basic
- identity.verified
- age.over18
- profile.public
- creator.status
- access.entitlement

Aucun scope wildcard.

## 6. Carte physique 3B

### Phase 1 — QR sécurisé
Ne jamais imprimer un QR contenant des données civiles ou un token permanent.

La carte peut contenir :
- un identifiant opaque de carte, distinct du user_id ;
- une URL de vérification 3B ;
- un mécanisme demandant ensuite une approbation ou un challenge dynamique.

La présentation finale doit être courte, signée/validée côté serveur, limitée à une audience et expirante.

### Phase 2 — NFC
Le NFC peut ouvrir la même expérience de vérification avec un identifiant opaque. Il ne doit pas exposer les données civiles en clair.

### Phase 3 — support cryptographique
Pour des partenaires exigeants : carte/élément sécurisé permettant une preuve de possession ou une signature de challenge. Cette phase exige choix matériel, gestion des clés, révocation et analyse de sécurité dédiée.

## 7. Magasins et partenaires physiques

Flux cible :

1. le commerçant scanne la carte ou le QR dynamique ;
2. le terminal ouvre le vérificateur 3B ;
3. le serveur vérifie l'état du Passeport et la preuve ;
4. le titulaire consent si une information supplémentaire est demandée ;
5. le commerçant obtient un résultat minimal : valide/non valide, majorité, droit à une remise ou statut membre ;
6. aucune donnée inutile n'est conservée.

Cas d'usage :
- fidélité ;
- remise membre ;
- accès événement ;
- retrait de commande ;
- vérification de majorité ;
- reconnaissance créateur/vendeur ;
- accès à une expérience 3B.

## 8. Sites et applications partenaires

Deux voies :

### Login
OpenID Connect : « Continuer avec Passeport 3B ».

### Preuve numérique
OpenID4VP : le partenaire demande une preuve précise, le titulaire choisit et présente le minimum nécessaire.

À terme, OpenID4VCI peut servir à émettre des justificatifs 3B vers un portefeuille compatible lorsque l'écosystème et le cadre juridique le permettent.

## 9. EUDI / France

Trajectoire recommandée :

1. rendre 3B capable de vérifier des justificatifs standards ;
2. devenir un service demandeur/relying party lorsque le cadre et l'éligibilité le permettent ;
3. tester les composants de référence EUDI ;
4. évaluer les obligations d'enregistrement dans l'infrastructure de confiance ;
5. étudier ensuite l'émission de justificatifs 3B reconnus par des partenaires ;
6. traiter FranceConnect/FranceConnect+ comme une intégration externe soumise à éligibilité, habilitation et qualification, pas comme un label automatique du Passeport 3B.

## 10. Architecture de confiance

Séparer strictement :

- authentification du compte ;
- état du Passeport ;
- identité civile vérifiée ;
- possession d'un authenticator/Passkey ;
- credentials émis ;
- consentements ;
- relations partenaires ;
- XP/Coins/inventaire.

Un partenaire ne doit jamais pouvoir :
- écrire un statut de vérification ;
- modifier XP/Coins ;
- lire les tables privées ;
- récupérer un auth.users.id ;
- appeler un RPC service_role ;
- réutiliser une présentation destinée à une autre audience.

## 11. Révocation et statut

Chaque justificatif partenaire doit avoir :
- issuer ;
- subject pseudonyme ;
- audience ou contexte ;
- issued_at ;
- expires_at si applicable ;
- credential_id opaque ;
- statut/révocation ;
- version du schéma.

La révocation doit couvrir :
- compte compromis ;
- Passeport suspendu/révoqué ;
- identité expirée/révoquée ;
- carte physique perdue ;
- appareil perdu ;
- consentement partenaire retiré.

## 12. Feuille de route

### M0 — déjà présent
- passport_public_id ;
- états active/suspended/revoked ;
- QR de vérification court, à usage unique et stocké haché ;
- identité civile séparée ;
- ledger de consentements partenaires ;
- intégration IDnow fail-closed ;
- Passkey prévue ;
- scopes minimaux.

### M1 — partenaire web
- registre clients ;
- consentement ;
- identifiants pairwise ;
- « Continuer avec Passeport 3B » ;
- tests OAuth/OIDC et révocation.

### M2 — preuves minimales
- Member ;
- Identity Verified ;
- Age Over ;
- Creator ;
- Access ;
- vérificateur partenaire et journal d'audit.

### M3 — carte physique QR/NFC
- card_instance_id opaque ;
- activation/révocation carte ;
- challenge dynamique ;
- portail vérificateur commerçant ;
- tests anti-rejeu.

### M4 — OpenID4VC
- issuer metadata ;
- verifier metadata ;
- clés de signature rotatives ;
- OpenID4VCI ;
- OpenID4VP ;
- tests interopérabilité multi-wallet.

### M5 — EUDI / organismes
- tests avec implémentation de référence ;
- conformité ARF ;
- analyse juridique et enregistrement requis ;
- dossiers partenaires/organismes ;
- FranceConnect si le service 3B est éligible ;
- audit sécurité externe avant revendication de haut niveau de confiance.

## 13. Critères de sortie

Pas d'ouverture externe avant :

- HTTPS domaine stable ;
- politique vie privée et CGU partenaires ;
- DPA si nécessaire ;
- registre partenaires ;
- clés protégées et rotation ;
- anti-rejeu ;
- rate limiting ;
- journalisation ;
- suppression/révocation ;
- tests web/Android/iOS ;
- tests consentement ;
- tests de perte de carte/téléphone ;
- test de non-divulgation des données non demandées ;
- audit des scopes ;
- revue sécurité.

## 14. Principe produit

Le Passeport 3B doit chercher à être **utile et vérifiable avant d'être présenté comme officiel**.

La meilleure preuve de reconnaissance sera l'acceptation réelle par des partenaires et l'interopérabilité avec des standards ouverts. Toute reconnaissance réglementaire ou étatique devra être obtenue séparément et nommée exactement selon son périmètre.
