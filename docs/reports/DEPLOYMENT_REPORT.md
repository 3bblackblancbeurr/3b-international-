# Rapport de déploiement — Motion V2

## Référence

- Pull request : #72
- Branche : `chatgpt-improvements-world-motion-v2`
- Base : `main` au commit `486d0e4a18f1944539c05b30b69848963be78626`
- Preview Vercel : `https://3b-international-git-ch-e73260-3bblackblancbeurr-7911s-projects.vercel.app`
- État Vercel : **Ready / Deployment has completed**

## Contrôles réussis

- Verify world and application : succès
- Verify City 3B : succès
- Verify Passport Nexus : succès
- Build mobile test versions : succès
- Suite ciblée Motion V2 : succès
- Suite complète `npm test` : succès
- Build Vite production : succès
- `git diff --check` : succès

## Supabase

Deux migrations ont été appliquées avec succès et sont versionnées :

- `city3b_performance_hardening_20260918`
- `nexus_city_rpc_security_hardening_20260918`

Les advisors ont été relancés après application.

## Limites de la validation

- La preview Vercel est protégée par authentification ; l'outil de navigation externe ne peut pas l'ouvrir sans session autorisée.
- Le statut de déploiement et les contrôles de build sont verts.
- Le test tactile physique Samsung en paysage reste obligatoire avant promotion en production.

## Décision

La preview reste isolée dans la PR 72. Aucun push direct ni fusion automatique vers `main` n'a été effectué. La procédure de retour arrière consiste à fermer la PR ou revenir au commit de base ; les migrations SQL sont documentées séparément.
