# Nosbloc — synchronisation serveur staging

## Statut réel

L’environnement isolé est actif dans un projet Supabase séparé :

```text
Nom : 3B Nosbloc Staging
Project ref : zykdfgahzqqanlyxjtbe
URL : https://zykdfgahzqqanlyxjtbe.supabase.co
API : nosbloc-staging · ACTIVE · verify_jwt=true
Console : nosbloc-staging-console · ACTIVE · page publique sans données
```

Console de test :

```text
https://zykdfgahzqqanlyxjtbe.supabase.co/functions/v1/nosbloc-staging-console
```

Le projet de production `ttvhcezucsbbmnafrotq` n’a reçu aucune table, fonction ni donnée Nosbloc staging. Les fichiers restent dans `supabase/staging/` et ne sont pas ajoutés au manifeste des migrations de production.

## Architecture active

- Auth Supabase propre au staging, avec stockage de session navigateur séparé de la production.
- Passeport de test créé automatiquement à partir des métadonnées Auth : identifiant, nom et pays.
- Client refusant toute URL autre que le projet `zykdfgahzqqanlyxjtbe`.
- API Edge protégée par JWT et épinglée au même project ref.
- Console statique `noindex`, sans donnée privée et sans clé privilégiée.
- Les opérations de la console exigent un JWT utilisateur puis sont transmises à l’API protégée.
- Aucun `service_role` embarqué dans le navigateur ou dans le code des fonctions.
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
supabase/functions/nosbloc-staging/
supabase/functions/nosbloc-staging-console/
```

## Configuration de la prévisualisation 3B complète

Ces variables doivent exister uniquement dans une prévisualisation ou un `.env.local` staging :

```env
VITE_NOSBLOC_STAGING_SYNC=true
VITE_SUPABASE_URL=https://zykdfgahzqqanlyxjtbe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publiable du projet staging>
VITE_NOSBLOC_STAGING_URL=https://zykdfgahzqqanlyxjtbe.supabase.co/functions/v1/nosbloc-staging
```

En production, `VITE_NOSBLOC_STAGING_SYNC` reste `false` et les trois autres variables restent absentes.

## Parcours de test depuis la console

1. Ouvrir l’URL de la console.
2. Créer un Passeport de test ou se connecter.
3. Créer un projet Nosbloc et le synchroniser.
4. Créer un second compte staging avec un autre identifiant.
5. Ajouter cet identifiant comme collaborateur dans le premier projet puis envoyer l’invitation.
6. Se connecter avec le second compte et accepter l’invitation.
7. Revenir au propriétaire, créer un point serveur puis envoyer une version en modération.
8. Attribuer le badge `director_founder` à un compte staging autorisé avant de tester une décision humaine.
9. Vérifier que toute décision reste privée et ne déverrouille aucune fonction publique ou financière.

## Smoke test transactionnel exécuté

Un scénario complet a été exécuté avec quatre identités synthétiques dans une sous-transaction, puis intégralement annulé :

```text
Projet créé : OK
Invitation ciblée vers le vrai membre : OK
Tentative d’acceptation par un imposteur : BLOQUÉE
Acceptation par le membre invité : OK
Version en révision : OK
Tentative de modification de la version : BLOQUÉE
Tentative de modération non autorisée : BLOQUÉE
Approbation par le modérateur staging : PRIVÉE ET VERROUILLÉE
Événements d’audit écrits : 5
Utilisateurs synthétiques après test : 0
Projets synthétiques après test : 0
```

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
