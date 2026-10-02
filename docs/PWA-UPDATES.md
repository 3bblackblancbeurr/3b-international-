# Mises à jour de l'application 3B

Le site/PWA 3B possède un système de mise à jour intégré.

## Fonctionnement

- chaque build Vercel génère `/version.json` avec l'identifiant du commit ;
- chaque build génère `/sw.js`, sans cache applicatif agressif ;
- l'application vérifie la version au démarrage, au retour au premier plan, au retour du réseau et toutes les 30 minutes ;
- une nouvelle version affiche **NOUVELLE VERSION 3B DISPONIBLE** avec **METTRE À JOUR** ;
- le bouton active le service worker en attente puis recharge l'application ;
- le système ne supprime jamais le stockage local, le Passeport, les XP, les Coins ou les données Supabase.

## Mise à jour obligatoire

Pour une release qui doit bloquer les anciennes versions, définir l'environnement Vercel :

`THREEB_FORCE_UPDATE=true`

puis déployer la nouvelle version.

Seuls les clients dont le build est plus ancien voient l'écran bloquant **MISE À JOUR REQUISE**. Le build courant n'est pas bloqué.

Pour les releases normales, laisser la variable absente ou à `false`.

## Numéro de version affiché

La valeur par défaut est `1.0.0`. Elle peut être remplacée dans Vercel avec :

`THREEB_APP_VERSION=1.1.0`

Le commit court reste affiché afin que deux déploiements portant le même numéro soient toujours distinguables.

## Applications natives

Ce mécanisme vise la version Web/PWA. Les builds Capacitor Android/iOS n'enregistrent pas ce service worker ; leurs mises à jour doivent passer par le store natif.
