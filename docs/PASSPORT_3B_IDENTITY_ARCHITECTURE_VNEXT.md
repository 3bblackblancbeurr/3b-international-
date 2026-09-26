# Passeport 3B vNext — architecture d'identité

## Positionnement
Le Passeport 3B devient la pièce maîtresse de l'écosystème 3B : une identité de membre privée, portable et vérifiable.
Il ne doit jamais être présenté comme un passeport d'État, une carte nationale d'identité ou un titre officiel de voyage.

## Trois niveaux
### Niveau A — Compte 3B
Supabase Auth, session, profil membre, récupération de compte et journal de sécurité.

### Niveau B — Passeport 3B
Identifiant public opaque distinct de l'UUID Auth, statut, pays 3B, progression, badges, rôles d'affichage et historique.
Les autorisations restent serveur : un badge visuel n'accorde jamais un privilège.

### Niveau C — Interopérabilité
Préparer :
- OpenID Connect/OAuth pour "Se connecter avec 3B" ;
- WebAuthn/passkeys pour authentification forte ;
- W3C Verifiable Credentials 2.0 pour attestations vérifiables ;
- OpenID4VCI pour émission et OpenID4VP pour présentation ;
- révocation/suspension et divulgation minimale ;
- chemin de conformité EUDI/eIDAS si un jour 3B veut travailler avec des prestataires qualifiés.

## Identifiants
- user_id : interne Supabase, jamais affiché comme numéro de Passeport.
- passport_public_id : UUID aléatoire public.
- passport_number : dérivé stable, non secret, sans données personnelles.
- credential_id : identifiant d'une attestation signée.
- relying_party_id : application/site tiers enregistré.

## Sécurité
- passkeys recommandées ; mot de passe conservé uniquement comme méthode de repli si nécessaire ;
- aucune clé privée de signature dans le navigateur ;
- signature exclusivement côté service d'émission sécurisé ;
- rotation de clés ;
- statut actif/suspendu/révoqué ;
- anti-rejeu par nonce/challenge ;
- scopes et consentement explicites ;
- données minimales par défaut ;
- audit immuable des émissions, présentations sensibles et révocations.

## Données
Le Passeport ne doit pas devenir une base contenant toutes les informations du membre.
Il référence des domaines : identité, progression, économie, inventaire, ville, monde, communauté.
Chaque domaine garde son autorité propre.

## Carte
La carte doit afficher :
- nom/handle choisi ;
- photo/avatar facultatif ;
- numéro public de Passeport ;
- pays 3B + valeur ;
- statut de vérification ;
- QR dynamique de vérification, jamais un JSON complet de données personnelles ;
- date d'émission ;
- version du credential ;
- marque visuelle 3B.
Le QR doit pointer vers un flux de vérification avec challenge ou un identifiant court à durée limitée.

## Externe
Un site tiers ne "reconnaît" pas automatiquement le Passeport.
Il doit devenir relying party 3B ou accepter un credential standard vérifiable.
La reconnaissance légale officielle exige un cadre réglementaire et, selon le cas, un fournisseur ou émetteur qualifié.

## Migration
1. créer le registre Passport vNext sans supprimer l'identité actuelle ;
2. backfill un public_id pour les membres existants ;
3. afficher le nouveau numéro ;
4. migrer les consommateurs un par un ;
5. activer passkeys ;
6. ajouter l'émetteur VC ;
7. pilote relying party externe ;
8. seulement ensuite déprécier les anciens identifiants dérivés de user_id.
