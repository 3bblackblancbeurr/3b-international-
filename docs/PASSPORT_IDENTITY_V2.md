# Passeport 3B V2 — Identité racine de l'écosystème

## Positionnement

Le Passeport 3B est une **identité privée de membre et d'écosystème**. Il peut devenir un justificatif vérifiable accepté par des services 3B et par des partenaires qui choisissent de l'intégrer.

Il ne doit jamais être présenté comme :
- un passeport d'État ;
- une carte nationale d'identité ;
- une identité légale universellement reconnue ;
- une preuve KYC sans vérification réalisée par un prestataire habilité.

## Modèle d'identité

### Sujet interne
`auth.users.id` reste la clé interne de sécurité et de relations en base.

### Sujet public
`member_profiles.passport_public_id` est un UUID aléatoire distinct, créé côté serveur.

Le numéro affiché est dérivé uniquement de cet identifiant public :

`3B-PASS-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`

Le compte interne n'est donc plus lisible dans la carte.

### État
Le serveur contrôle :
- `active` ;
- `suspended` ;
- `revoked`.

Un Passeport incomplet, suspendu ou révoqué échoue en mode fermé pour les zones protégées.

## Données présentes dans la carte

La carte peut afficher :
- numéro Passeport public ;
- nom/pseudonyme du titulaire ;
- pays 3B et valeur ;
- date d'émission ;
- progression réelle ;
- badge officiel 3B seulement quand le backend l'atteste.

Elle ne doit pas afficher des slogans techniques non vérifiés comme « biométrie active », « chiffrement AES-256 » ou « intégrité 100 % ».

## Scopes

Le consentement doit rester minimal.

Exemples :
- `identity.basic` : numéro public, état, version, émission ;
- `identity.profile` : nom public/pseudonyme ;
- `identity.origin` : pays/valeur 3B ;
- `progress.read` ;
- `wallet.read` ;
- `inventory.read` ;
- `world.play` ;
- `city.manage` ;
- `games.play` ;
- `nosbloc.create` ;
- `shop.member` ;
- `community.member` ;
- `sport.member`.

Une intégration externe reçoit par défaut uniquement `identity.basic`.

## QR de vérification

Le QR cible ne doit pas contenir directement :
- nom ;
- e-mail ;
- UUID Auth ;
- wallet ;
- Coins ;
- inventaire ;
- données de récupération.

Architecture :
1. le membre demande un ticket ;
2. le serveur génère un secret haute entropie ;
3. la base conserve uniquement son hash ;
4. le QR contient le secret/ticket temporaire et sa version de protocole ;
5. le ticket expire en quelques minutes ;
6. la vérification le consomme une seule fois ;
7. le serveur retourne uniquement les scopes autorisés ;
8. chaque émission/consommation importante est auditable.

La table `passport_verification_tickets` constitue la fondation de ce flux. Les tickets bruts ne sont jamais persistés en base.

## Carte physique

Le carnet/carte physique peut porter :
- numéro public ;
- motif 3B ;
- pays/valeur ;
- QR/NFC d'ouverture de l'application ou de demande de vérification.

Un QR imprimé statique ne doit pas, à lui seul, prouver l'identité. La preuve forte doit passer par une session ou un ticket dynamique émis dans l'application.

## Authentification

Ordre de préférence :
1. session Supabase actuelle ;
2. e-mail confirmé et récupération sécurisée ;
3. MFA selon le risque ;
4. passkeys/WebAuthn lorsque la fonction choisie est considérée assez stable pour la production ;
5. réauthentification pour les opérations sensibles.

Le Passeport n'est jamais lui-même un mot de passe.

## Intégrations externes

### Niveau 1 — services 3B
Ils utilisent directement le contrat `src/passport/contract.js`.

### Niveau 2 — partenaires web/mobile
Prévoir un flux d'autorisation explicite inspiré d'OAuth 2/OIDC :
- application partenaire enregistrée ;
- scopes demandés ;
- consentement affiché ;
- jeton court ;
- révocation ;
- journalisation.

### Niveau 3 — credential portable
Pour des partenaires qui ont besoin d'un justificatif portable, le projet peut évoluer vers des **W3C Verifiable Credentials 2.0** avec signature et politique de vérification dédiées.

Cela ne rend pas automatiquement le Passeport 3B officiel : la reconnaissance dépend toujours de l'organisation qui l'accepte et du niveau de vérification demandé.

## Confidentialité

Principes obligatoires :
- minimisation des données ;
- consentement par portée ;
- révocation ;
- expiration ;
- aucune autorisation fondée sur `user_metadata` ou sur un badge visuel ;
- service role jamais exposé au navigateur ;
- cache local non autoritatif ;
- aucune donnée personnelle dans les QR temporaires ;
- aucune copie inutile du profil dans chaque module.

## Source de vérité

- schéma : Supabase `member_profiles` ;
- contrat client : `src/passport/contract.js` ;
- registre modules/scopes : `config/passport-ecosystem-v2.json` ;
- identité UI : `src/passport/identity.js` ;
- gate : `src/passport/access.js` ;
- tests : `tests/passport-*.test.js` ;
- migrations : `supabase/migrations`.

Toute nouvelle idée 3B doit d'abord se brancher sur ce contrat plutôt que créer sa propre identité.
