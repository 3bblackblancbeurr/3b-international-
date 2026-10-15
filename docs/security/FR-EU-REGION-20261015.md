# 3B International — exécution France sans abonnement additionnel
**Chantier du 15 octobre 2026 · statut : changement de configuration proposé, vérification du déploiement requise**

## Résultat attendu

- Vercel Functions en **une seule région Paris, France (`cdg1`)** : configuration versionnée `vercel.json`, en complément du réglage de région du projet Vercel.
- Aucun multi-région ni failover payant demandé. Le plan Hobby prévoit une région pour les fonctions ; conserver les quotas et surveiller toute évolution tarifaire. L'application statique reste distribuée par le CDN mondial de Vercel.
- Supabase **3b discuter** demeure en **Irlande (`eu-west-1`)**. Ce chantier **ne migre pas** la base, le Passeport, les fichiers, les sauvegardes, ni les données des prestataires. Paris pour le calcul **ne prouve pas** une infrastructure intégralement française.
- Aucun achat, abonnement, add-on, migration vers un second projet, transfert d'identité ou option Pro n'est autorisé par ce changement.

## Preuves de départ

1. Déploiement Vercel de production `dpl_CnQdiTwjzyq6W9eq2UggmAhjQXah` : `READY`, `regions: ["iad1"]` à la lecture le 15/10/2026.
2. Projet Supabase actif `ttvhcezucsbbmnafrotq` : `eu-west-1`, pas Paris.
3. 185 tables `public` avec RLS activée ; 192 politiques et aucune table publique sans RLS lors de la lecture ; les rôles `anon` et `authenticated` ne détiennent aucun privilège `TRUNCATE`, `TRIGGER`, `REFERENCES` ni `DELETE` sur ces 185 tables.
4. Six vues publiques déclarées `security_invoker=true`.
5. **Six** tables ont RLS sans politique (accès refusé par défaut). Trois RPC `SECURITY DEFINER` sont exécutables par `anon`; `app_install_ping` et `app_presence_ping` implémentent des limites de débit et collectent de la télémétrie, `secret3b_daily_status` sert l'état du jeu. **Ne pas révoquer sans recette et décision métier.**
6. Le contrôle des mots de passe compromis Supabase nécessite Pro : **attente stricte, aucun abonnement**.

## Livraison logicielle

- Verrouiller le déploiement sur `["cdg1"]` dans `vercel.json`.
- Vérification automatisée `tests/vercel-france-region.test.js` : une région unique, absence de failover et maintien de HSTS/CSP existants.
- Ne pas élargir les autorisations des utilisateurs ni déployer des données de santé médicales.
- Les informations Santé restent dans le coffre local chiffré facultatif ; les métadonnées du Passeport restent sur le backend actuel.

## Recette indispensable après mise en production

1. Vérifier que **le nouveau** déploiement ciblant `production` est `READY`, que `regions` contient `cdg1` et pas `iad1`.
2. Vérifier que les pages `/`, `/install`, Santé, Passeport, et les API continuent de fonctionner ; ne pas se contenter d'un HTTP 200 pour conclure au fonctionnement de l'authentification.
3. Vérifier les actions sensibles (connexion, consultation de son Passeport, télémétrie strictement nécessaire) avec **des comptes de test**, sans consulter ni exposer l'identité d'un membre.
4. Vérifier CI, tests et en-têtes CSP/HSTS ; surveiller latence et exceptions sans données personnelles.
5. Si échec : revenir au déploiement stable antérieur et documenter l'incident. Ne pas passer à un forfait payant comme solution implicite.

## Ce qui n'est pas résolu

- Une véritable résidence des données personnelles **en France** nécessiterait une migration distincte de Supabase avec restauration, données Auth, Storage, Edge Functions, droits RLS, sauvegardes, consentements, contrats et validation RGPD. **Aucune migration automatique** ne doit être tentée sans fenêtre de coupure et plan de retour arrière testé.
- Les éventuels traitements hors UE (CDN, logs, support ou prestataires externes) doivent être recensés, même si les fonctions s'exécutent à Paris.
- Ni certification HDS, ni pentest externe, ni reconnaissance officielle du Passeport ne découlent de ce changement.

Sources : [Vercel — régions des fonctions](https://vercel.com/docs/functions/configuring-functions/region), [Vercel — Hobby](https://vercel.com/docs/plans/hobby), [Supabase — migration interne](https://supabase.com/docs/guides/platform/migrating-within-supabase), [Supabase — protection des mots de passe](https://supabase.com/docs/guides/auth/password-security).
