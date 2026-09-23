# Core 6 — durcissement du 23 septembre 2026

Branche : `chatgpt-core6-hardening-20260923` (base `main`).

## Ce qui est durci ici

- **Application 3B** : texte d’entrée réduit à « Un écosystème premium. » et phrase vocale exacte rétablie au clic sur COMMENCER.
- **Passeport 3B** : niveau 1 requis pour les sections applicatives ; niveau 2 requis pour Monde du 3B et Arène.
- **Niveau 2** : seul l’objet existant `PASSPORT_FOUNDER_GOLD` est reconnu pour l’instant. Aucun nouveau produit fictif n’est inventé.
- **Snapshot membre** : remonte uniquement les `item_code` et quantités positives appartenant au membre, afin de calculer l’accès côté UI sans exposer de secret.
- **DADA 3B** : aucun changement moteur ou visuel dans cette branche. Le correctif de capture de #233 reste l’autorité.
- **Penalty Rush** : aucun remplacement. La réintégration locale fusionnée par #240 reste l’autorité.
- **Monde du 3B** : le Hub V4 / 8 portails fusionné par #234 reste l’autorité. Le nouveau verrou exige le Passeport 2 pour y entrer.
- **Course des 8 Clés** : pas de faux portage interne. Le vrai code source historique n’étant toujours pas présent dans ce dépôt, l’état externe restauré par #238 est conservé jusqu’à récupération de la vraie source.

## Vérifications production déjà faites

- projet Supabase canonique actif et sain : `ttvhcezucsbbmnafrotq` ;
- RLS activé sur les tables membres/économie/inventaire/Nexus/DADA/Penalty examinées ;
- Edge Functions `dada3b` et `penalty-rush` actives avec JWT ;
- table `app_games_catalog` présente ;
- objet `PASSPORT_FOUNDER_GOLD` présent dans le catalogue d’inventaire.

## Blocages réels restants

1. **Course des 8 Clés** : récupérer la vraie source avant intégration interne.
2. **Unreal France** : les validations UE5.8 réelles (PIE, HLOD, navigation, profiling, packaging) restent nécessaires ; les scripts GitHub ne remplacent pas l’éditeur.
3. **Passeport 2 grand public** : définir plus tard le produit/règle officielle qui accordera le niveau 2 aux membres non-Fondateur.
4. **Sécurité Supabase** : les advisors signalent notamment deux fonctions de télémétrie `SECURITY DEFINER` exécutables par `anon`. Elles sont rate-limit et servent à l’installation/présence ; ne pas changer leurs droits sans tester les parcours PWA anonymes.

## Hors périmètre volontaire

Ne rien modifier ici sur **3B Guardians**, **La Ligne / Runner** ou **Underground**.
