# Nosbloc — synchronisation serveur staging

## Statut réel

L’environnement isolé est actif dans un projet Supabase séparé :

```text
Nom : 3B Nosbloc Staging
Project ref : zykdfgahzqqanlyxjtbe
URL : https://zykdfgahzqqanlyxjtbe.supabase.co
Edge Function : nosbloc-staging · ACTIVE · verify_jwt=true
```

Le projet de production `ttvhcezucsbbmnafrotq` n’a reçu aucune table, fonction ni donnée Nosbloc staging. Les fichiers restent dans `supabase/staging/` et ne sont pas ajoutés au manifeste des migrations de production.

## Architecture active

- Auth Supabase propre au staging, avec stockage de session navigateur séparé de la production.
- Passeport de test créé automatiquement à partir des métadonnées Auth : identifiant, nom et pays.
- Client refusant toute URL autre que le projet `zykdfgahzqqanlyxjtbe`.
- Edge Function protégée par JWT et épinglée au même project ref.
- Aucun `service_role` embarqué dans le navigateur ou dans le code de la fonction.
- Accès aux données uniquement par des RPC authentifiés qui dérivent l’identité de `auth.uid()`.
- Tables directement interdites à `anon` et `authenticated` par droits SQL, RLS et politiques restrictives.
- Invitations résolues par identifiant staging puis acceptées uniquement par le véritable `user_id` invité.
- Versions serveur immuables et empreintes SHA-256.
- File de modération humaine privée.
- Journal d’audit immuable et clés d’idempotence.
- Publication, Discover, paiements et retraits verrouillés dans la configuration et dans chaque projet.

## Migrations appliquées dans le staging uniquement

```text
nosbloc_staging_prerequisites
nosbloc_server_staging_v1
nosbloc_staging_authenticated_api
nosbloc_staging_advisor_hardening
nosbloc_staging_fk_indexes
```

Les sources reproductibles sont :

```text
supabase/staging/20260926030000_nosbloc_server_staging_v1.sql
supabase/staging/20260926031000_nosbloc_staging_prerequisites.sql
supabase/staging/20260926032000_nosbloc_staging_authenticated_api.sql
supabase/staging/20260926033000_nosbloc_staging_advisor_hardening.sql
supabase/staging/20260926034000_nosbloc_staging_fk_indexes.sql
supabase/staging/DEPLOYED_NOSBLOC_STAGING.json
```

## Configuration de la prévisualisation

Ces variables doivent exister uniquement dans une prévisualisation ou un `.env.local` staging :

```env
VITE_NOSBLOC_STAGING_SYNC=true
VITE_SUPABASE_URL=https://zykdfgahzqqanlyxjtbe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publiable du projet staging>
VITE_NOSBLOC_STAGING_URL=https://zykdfgahzqqanlyxjtbe.supabase.co/functions/v1/nosbloc-staging
```

En production, `VITE_NOSBLOC_STAGING_SYNC` reste `false` et les trois autres variables restent absentes.

## Parcours de test

1. Ouvrir Nosbloc dans la prévisualisation staging.
2. Créer un Passeport de test ou se connecter.
3. Créer un projet Nosbloc et confirmer droits, public et modération.
4. Synchroniser le projet vers le serveur.
5. Créer un second compte staging avec un autre identifiant.
6. Inviter ce compte depuis le premier projet.
7. Se connecter avec le second compte et accepter l’invitation.
8. Revenir au propriétaire, créer un point serveur puis envoyer une version en modération.
9. Attribuer le badge `director_founder` à un compte staging autorisé avant de tester la décision humaine.
10. Vérifier que toute décision reste privée et ne déverrouille aucune fonction publique ou financière.

## Vérifications de sécurité

Le contrôle Supabase de sécurité ne remonte plus aucune alerte. Le contrôle de performance confirme que toutes les clés étrangères possèdent un index ; les seuls avis restants signalent normalement que ces nouveaux index n’ont pas encore servi dans une base vide.

Tests obligatoires :

- Un compte ne lit pas le brouillon d’un autre compte.
- Une invitation ne peut être acceptée que par le compte ciblé.
- Une équipe dont le total n’est pas 100 % ne passe pas en révision.
- Un membre invité mais non accepté bloque la révision.
- Une version créée ne peut être modifiée ni supprimée.
- Un modérateur peut approuver ou refuser sans publier.
- Les actions `publish`, `discover`, `payment` et `payout` n’existent pas dans l’API staging.
- Modifier l’URL Supabase ou l’URL de fonction provoque un blocage côté client.
- Désactiver `server_enabled` dans `nosbloc_stg_runtime_config` coupe immédiatement les opérations.
