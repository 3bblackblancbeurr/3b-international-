# Audit P0 3B — 26 septembre 2026

## État
Le socle est en phase de verrouillage. Le Passeport vNext reste isolé dans la PR #303 et Nosbloc staging dans #300.

## Base de données production
- 85 tables sont signalées RLS sans policy.
- Vérification directe : aucune de ces 85 tables n'accorde de DML à `anon` ou `authenticated`.
- Elles sont donc actuellement fail-closed ; aucune policy permissive ne doit être ajoutée juste pour faire disparaître un avertissement.
- Les fonctions SECURITY DEFINER doivent être classées individuellement avant toute révocation :
  - télémétrie publique bornée/rate-limitée ;
  - opérations membre avec `auth.uid()` + validation de session ;
  - fonctions directeur avec badge fondateur vérifié ;
  - fonctions serveur/service uniquement.

## Passeport
- `member_profiles.passport_public_id` est l'identifiant public canonique.
- L'UUID Auth n'est plus le numéro affiché du Passeport.
- états : active / suspended / revoked.
- QR : ticket aléatoire court, hash seulement en base, expiration 5 minutes, usage unique.
- le QR ne contient ni UUID Auth, ni mot de passe, ni Wallet.
- les Edge Functions de preuve sont actives uniquement sur staging pour la validation.
- l'ancienne table staging séparée `passport_identities` a été supprimée afin d'éviter une double autorité.

## Auth
- passkeys préparées derrière `VITE_3B_PASSKEYS_ENABLED=false`.
- elles restent désactivées jusqu'au choix du domaine WebAuthn permanent.
- la protection Supabase contre les mots de passe compromis est signalée désactivée et reste une action de configuration à effectuer.

## Performance
Budgets de release :
- cœur application <= 300 kB minifié ;
- WorldPage <= 450 kB ;
- GamesHub <= 275 kB ;
- PenaltyRushArena3D <= 650 kB ;
- Three.js vendor <= 700 kB ;
- aucun chunk JS > 700 kB.

## Mobile
La CI Android/iOS compile. La validation physique Samsung reste obligatoire et ne peut pas être remplacée par CI.

## Nosbloc
#300 est vert mais diverge de main : 5 commits devant, 15 derrière. Ne pas fusionner tel quel. Rebase/reconstruction sur main obligatoire avant promotion.

## Conditions de sortie P0
- PR #303 entièrement verte ;
- release gate verte ;
- revue SECURITY DEFINER terminée ;
- leaked-password protection activée ;
- A/B comptes réels staging ;
- Samsung réel ;
- sauvegarde/restauration et réseau faible validés ;
- rollback de release documenté.
