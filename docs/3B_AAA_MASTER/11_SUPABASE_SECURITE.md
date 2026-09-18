# 3B AAA MASTER — Supabase et sécurité

## État vérifié au 18 septembre 2026

Projet Supabase : `ttvhcezucsbbmnafrotq`.

Deux migrations non destructives ont été appliquées et leurs scripts sont versionnés dans `supabase/`.

## Migration City 3B performance

Migration : `city3b_performance_hardening_20260918`.

Corrections appliquées :

- ajout de sept index couvrant des clés étrangères City 3B ;
- suppression de la policy SELECT `nexus_city_select_own`, devenue redondante avec `nexus_city_select_own_or_public` ;
- réécriture de `nexus_city_insert_own`, `nexus_city_update_own` et `wallet_ledger_read_own` avec `(select auth.uid())` ;
- suppression de l'index dupliqué `nexus_city_placement_request_unique`.

## Migration RPC City 3B

Migration : `nexus_city_rpc_security_hardening_20260918`.

Corrections appliquées :

- `search_path` vide pour `nexus_remove_building` et `nexus_upgrade_building` ;
- retrait de l'exécution publique et anonyme ;
- exécution conservée pour `authenticated` et `service_role`.

## Alertes encore ouvertes

- La protection Supabase Auth contre les mots de passe compromis reste à activer dans la configuration Auth du projet. Le connecteur utilisé ici ne permet pas de modifier ce réglage.
- `app_install_ping` et `app_presence_ping` restent exécutables anonymement. Leur définition et leur `search_path` ont été contrôlés ; cette exposition semble correspondre à leur fonction de télémétrie publique, mais doit rester documentée et limitée en fréquence.
- `world_party_command` reste accessible aux membres authentifiés. Toute modification future doit vérifier que chaque action est validée côté serveur et ne fait jamais confiance aux récompenses, positions ou résultats envoyés par le client.
- Les tables RLS sans policy doivent rester classées explicitement en « serveur uniquement » ou recevoir des policies minimales avant tout accès direct par le client.

## Règles permanentes

1. Toute DDL passe par `apply_migration` et un fichier SQL versionné.
2. Aucun secret serveur dans GitHub, Vercel client ou bundle navigateur.
3. Toute fonction `SECURITY DEFINER` utilise un `search_path` sûr, des droits EXECUTE minimaux et une validation stricte des paramètres.
4. Toute table liée à un utilisateur active RLS et teste l'isolation compte A / compte B.
5. Les advisors sécurité et performance sont relancés après chaque migration.
