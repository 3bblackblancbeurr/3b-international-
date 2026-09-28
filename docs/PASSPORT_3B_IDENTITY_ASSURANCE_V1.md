# Passeport 3B — Identity Assurance V1

## Objectif
Le compte 3B, le Passeport 3B et l’identité civile sont trois niveaux distincts.

1. **Compte 3B** : authentification, e-mail, session, récupération.
2. **Passeport 3B** : identifiant public opaque et statut actif/suspendu/révoqué.
3. **Identité civile vérifiée** : résultat d’un contrôle documentaire réel réalisé par un prestataire configuré.

Un nom saisi dans un formulaire, un badge public ou un e-mail confirmé ne doit jamais produire le statut « identité civile vérifiée ».

## Règles de sécurité
- fail-closed : absence de preuve = non vérifié ;
- aucun UUID Auth affiché comme numéro public ;
- aucun document, selfie, numéro de document ou gabarit biométrique stocké dans le profil membre ;
- les données civiles vérifiées sont séparées du profil public et réservées au service serveur ;
- les références de prestataire sont pseudonymisées côté serveur ;
- toute preuve externe utilise challenge/nonce, expiration, anti-rejeu et consentement explicite ;
- chaque relying party possède des origines HTTPS et des scopes limités ;
- une révocation/suspension coupe la présentation du Passeport ;
- la passkey ne sera activée qu’après fixation du domaine WebAuthn permanent.

## Inscription cible
Compte -> e-mail confirmé -> anti-robot/rate-limit -> consentements -> passkey -> vérification d’identité -> émission du niveau de confiance.

La version actuelle garde l’accès membre existant pendant le rollout. Les futurs services sensibles utiliseront le gate d’identité civile vérifiée.

## Prestataire d’identité
Le code ne doit pas inventer une validation KYC. Avant activation il faut :
- sélectionner et contractualiser un prestataire adapté au cadre français/européen (PVID lorsque pertinent) ;
- vérifier son API, sa politique de rétention, ses sous-traitants et ses transferts ;
- définir la signature des webhooks et l’idempotence ;
- définir les motifs de rejet/revue sans exposer de données sensibles au client ;
- tester sandbox, fraude, doublons, expiration, révocation et récupération de compte.

## Passkeys
Le support client est préparé derrière `VITE_3B_PASSKEYS_ENABLED=false`.
Le RP ID doit être choisi définitivement avant l’enrôlement : changer le RP ID invaliderait les passkeys déjà créées.

## Interopérabilité
Les futurs partenaires passent par un registre de relying parties et des scopes explicites. Le scope par défaut est uniquement `passport.basic`. Les données d’identité, d’âge, d’économie, d’inventaire, de ville ou de création nécessitent un consentement explicite.

## Ce qui reste interdit
- appeler le Passeport 3B « CNI » ou « passeport d’État » ;
- marquer quelqu’un « identité vérifiée » à partir de `public_verified` ;
- utiliser le numéro public comme secret d’authentification ;
- stocker une empreinte ou un visage brut pour faire fonctionner une passkey ;
- laisser le localStorage devenir l’autorité d’identité.
