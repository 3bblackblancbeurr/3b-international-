# Nosbloc — synchronisation serveur staging

## Statut

Le paquet est complet dans le code, mais non déployé. La création de branche Supabase a été refusée car le projet actuel n’a pas le forfait Pro requis. La base de production n’a donc reçu aucune table, fonction ou donnée Nosbloc staging.

## Composants préparés

- Client React fermé par défaut avec `VITE_NOSBLOC_STAGING_SYNC=false`.
- Edge Function `nosbloc-staging` protégée par JWT, validation de session 3B et secret `NOSBLOC_STAGING_ENABLED=true`.
- Projet lié à `member_profiles`, qui est la source du Passeport 3B.
- Invitations résolues par identifiant 3B puis acceptées uniquement par le `user_id` réellement invité.
- Versions serveur immuables et empreinte SHA-256 calculée par la fonction.
- Soumission en file de modération humaine.
- Modération limitée au compte vérifié `director_founder`.
- Approbation toujours privée : publication, Discover, monétisation et retraits restent verrouillés.
- Journal d’audit immuable et clés d’idempotence.

## Activation dans un environnement isolé

1. Créer une branche Supabase Pro ou un projet staging distinct.
2. Appliquer uniquement `supabase/staging/20260926030000_nosbloc_server_staging_v1.sql` sur cet environnement.
3. Déployer `supabase/functions/nosbloc-staging` avec vérification JWT activée.
4. Définir le secret Edge `NOSBLOC_STAGING_ENABLED=true` uniquement dans le staging.
5. Configurer l’application de prévisualisation :

```env
VITE_NOSBLOC_STAGING_SYNC=true
VITE_NOSBLOC_STAGING_URL=https://<staging-ref>.supabase.co/functions/v1/nosbloc-staging
```

6. Tester avec deux vrais comptes 3B et le compte modérateur avant toute ouverture.

## Tests obligatoires

- Un compte ne lit pas les brouillons d’un autre compte.
- Une invitation ne peut être acceptée que par le compte ciblé.
- Une équipe dont le total n’est pas 100 % ne passe pas en révision.
- Un membre invité mais non accepté bloque la révision.
- Une version créée ne peut être ni modifiée ni supprimée.
- Un modérateur peut approuver ou refuser, sans publier.
- Les actions `publish`, `discover`, `payment` et `payout` n’existent pas dans l’API staging.
- Désactiver le secret Edge coupe immédiatement toutes les mutations.
