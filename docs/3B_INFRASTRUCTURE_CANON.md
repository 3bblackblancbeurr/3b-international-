# 3B — infrastructure canonique

Ce document sert de garde-fou pour éviter de brancher l'application 3B sur un mauvais projet ou un ancien service.

## Identité canonique

- Identité principale : **stetienne86pp**
- L'adresse e-mail complète n'est volontairement **pas stockée dans ce dépôt public**.
- Le compte GitHub actuellement observé par le connecteur est `3bblackblancbeurr`. Ne pas transférer ni supprimer le dépôt automatiquement tant que l'accès du compte canonique n'a pas été vérifié manuellement.

## GitHub

- Dépôt officiel : `3bblackblancbeurr/3b-international-`
- Branche de production : `main`
- Toute modification importante passe par une branche/PR avant fusion.

## Supabase

- Organisation : `3b internanional`
- Organisation ID : `qmobfanrvjsuusdwokix`
- Projet actif canonique : `3b discuter`
- Project ref : `ttvhcezucsbbmnafrotq`
- URL : `https://ttvhcezucsbbmnafrotq.supabase.co`

Ne pas créer un second backend 3B pour contourner un problème de connexion.

## Vercel

- Production : `https://3b-international.vercel.app`
- Les déploiements Git sont activés uniquement depuis `main`.
- Workspace observé dans les statuts GitHub : `3bblackblancbeurr-7911s-projects`.
- Team ID observé : `team_pii0LCfZEGvY02L2a5LwIDER`.
- Le connecteur Vercel ChatGPT est installé mais doit être ré-authentifié explicitement sur ce workspace pour permettre le pilotage direct.
- L'adresse e-mail du compte Vercel n'est pas exposée par le connecteur ; ne pas la deviner.

## Jeux 3B

### La course des clés

Source historique canonique :
`https://troisb-course-des-cles-demo.stetienne86pp.chatgpt.site/`

Le code source exact n'est pas présent dans ce dépôt. **Ne pas recréer le jeu de mémoire et ne pas remplacer cette référence par une imitation.**

### Penalty Rush

Route interne canonique :
`/jeux/penalty-rush`

Le jeu reste intégré via le catalogue/loader 3B et le backend Supabase existant.

## Règle avant toute mise à jour

Avant une opération GitHub/Supabase/Vercel :
1. vérifier les identifiants dans `config/3b-infrastructure.json` ;
2. ne jamais créer un projet parallèle si l'accès au projet canonique est momentanément indisponible ;
3. ne jamais déplacer/supprimer un service pour « uniformiser » les comptes sans accès confirmé des deux côtés ;
4. préserver DADA 3B, Penalty Rush et La course des clés lors des migrations d'infrastructure.
