# 3B — plan de rollback de release

## Principe
Une release ne remplace jamais simultanément application, schéma et services sans point de retour.

## Git / Vercel
- main reste la seule branche de production.
- chaque lot est fusionné par PR verte.
- noter le SHA main précédant la fusion.
- si régression UI/build : revenir au déploiement Vercel du SHA précédent et ouvrir une PR corrective ; ne pas réécrire l'historique main.

## Supabase
- migrations additives en priorité ;
- aucun DROP/rename destructif dans la même release que le cutover client ;
- garder compatibilité N-1 pendant le déploiement ;
- Edge Functions versionnées : redéployer la version précédente si le nouveau handler régresse ;
- ne jamais restaurer une base entière pour corriger un bug applicatif.

## Passeport
- l'ancien affichage peut continuer à lire `member_profiles` pendant le rollout vNext ;
- `passport_public_id` est stable et ne doit pas être régénéré lors d'un rollback ;
- passkeys restent OFF jusqu'au domaine définitif ;
- QR/verifier peut être désactivé sans invalider le compte 3B.

## Monde / MA VILLE / Jeux
- serveur reste autoritaire ;
- si nouveau client échoue, l'ancien client doit pouvoir relire la dernière révision valide ;
- migrations de sauvegarde doivent rester backward-readable ou fournir un migrateur explicite.

## Nosbloc
- staging reste séparé ;
- Discover, paiements et payouts restent verrouillés tant que la promotion production n'est pas validée.

## Gate rollback
Avant release :
- SHA précédent noté ;
- migrations concernées listées ;
- versions Edge concernées listées ;
- snapshot/backup disponible selon le mécanisme Supabase ;
- scénario de retour testé en staging.
