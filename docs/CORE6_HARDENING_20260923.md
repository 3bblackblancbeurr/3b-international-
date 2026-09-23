# Core 6 — durcissement du 23 septembre 2026

Branche : `chatgpt-core6-hardening-20260923` (base `main`).

## Règle canonique Passeport

Il existe **un seul Passeport 3B**.

- sans Passeport : accès limité à l’accueil, à l’activation du Passeport et au compte ;
- avec Passeport 3B actif : accès à l’écosystème 3B, y compris **Le Monde du 3B** et l’Arène ;
- aucun « Passeport 1 » / « Passeport 2 » ;
- aucun objet d’inventaire n’est utilisé pour créer un second niveau d’accès.

## Ce qui est durci ici

- **Application 3B** : texte d’entrée « Un écosystème premium. » et phrase vocale exacte au clic sur COMMENCER.
- **Passeport 3B** : un seul verrou d’accès basé sur l’identité Passeport du compte connecté.
- **DADA 3B** : aucun changement moteur ou visuel. Le correctif de capture de #233 reste l’autorité.
- **Penalty Rush** : la réintégration locale fusionnée par #240 reste l’autorité.
- **Monde du 3B** : Hub V4 / 8 portails #234 conservé et accessible avec le même Passeport 3B.
- **Course des 8 Clés** : aucun faux portage interne ; la vraie source historique manque toujours dans ce dépôt.

## Vérifications production déjà faites

- projet Supabase canonique actif et sain : `ttvhcezucsbbmnafrotq` ;
- RLS activé sur les tables membres/économie/inventaire/Nexus/DADA/Penalty examinées ;
- Edge Functions `dada3b` et `penalty-rush` actives avec JWT ;
- table `app_games_catalog` présente.

## Blocages réels restants

1. **Course des 8 Clés** : récupérer la vraie source avant intégration interne.
2. **Unreal France** : validations UE5.8 réelles (PIE, HLOD, navigation, profiling, packaging).
3. **Tests physiques** : Samsung + iPhone après validation de la branche.
4. **Sécurité Supabase** : deux fonctions de télémétrie `SECURITY DEFINER` sont exécutables par `anon`; ne pas modifier sans tester les parcours PWA anonymes.

## Hors périmètre volontaire

Ne rien modifier ici sur **3B Guardians**, **La Ligne / Runner** ou **Underground**.
