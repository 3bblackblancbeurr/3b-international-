# 3B International — préparation Google Play

Mise à jour : 12 septembre 2026

## Identité Android vérifiée

- Nom : **3B International**
- Application ID / package : **`app.vercel.threebinternational`**
- Version Android de test inspectée : Capacitor
- `minSdkVersion` : **23**
- `targetSdkVersion` : **36**
- Format de publication à utiliser : **Android App Bundle (`.aab`)**
- Bundle actuellement disponible dans le dossier projet utilisateur : `3B-Android-non-signe-20260912.aab`
- Ce bundle doit être reconstruit/signé en **release** avant envoi final sur Google Play.

> Ne pas envoyer `base.apk` sur Google Play : c'est un WebAPK généré par le navigateur. Ne pas utiliser non plus l'APK de test comme release : la version inspectée est une build de test/debug.

## Fiche Play Store — texte prêt

### Nom de l'application

**3B International**

### Description courte

**Black • Blanc • Beur : passeport, communauté, manga, jeux et univers 3B.**

### Description longue

**3B International — Black • Blanc • Beur** réunit l'univers 3B dans une seule application.

Crée ton identité 3B, retrouve ton passeport numérique, suis ta progression et tes cartes de fidélité, découvre le manga, les jeux et le Monde du 3B, échange avec la communauté et explore l'univers textile et créatif de 3B International.

Dans l'application :

- Passeport 3B et espace membre
- Cartes de fidélité, XP et progression
- Manga 3B
- Jeux 3B
- Monde du 3B et ses huit pays
- Communauté
- Espace IA et création
- Boutique 3B

**Ce n'est pas une marque, c'est un héritage.**

## URLs publiques à renseigner dans Play Console

Après déploiement de cette branche :

- Site officiel : `https://3b-international.vercel.app/`
- Politique de confidentialité : `https://3b-international.vercel.app/privacy-policy.html`
- Suppression de compte : `https://3b-international.vercel.app/delete-account.html`

L'application permet la création de comptes : le formulaire Data safety doit donc déclarer cette fonction et renseigner l'URL de suppression de compte.

## Assets déjà disponibles

Le dossier projet utilisateur contient notamment :

- icône 512 px / maskable
- captures `3b-home.png`, `3b-menu.png`, `3b-game.png`, `3b-map.png`, `3b-shop.png`

À produire ou valider avant publication :

- icône Play Store 512×512 PNG conforme
- feature graphic 1024×500
- au moins les captures d'écran téléphone demandées par Play Console
- éventuelles captures tablette si la distribution tablette est activée

## Étapes Play Console

1. Créer le compte Google Play Console si nécessaire et terminer la vérification développeur.
2. Créer l'application **3B International** avec le package `app.vercel.threebinternational`.
3. Activer Play App Signing et préparer une clé d'upload conservée en sécurité.
4. Générer un **AAB release signé**, non debug, avec `targetSdkVersion 36`.
5. Importer le bundle dans un canal de test.
6. Compléter : App access, Ads, Content rating, Target audience, Data safety, politique de confidentialité et suppression de compte.
7. Ajouter la fiche Store, l'icône, le visuel 1024×500 et les captures.
8. Effectuer les tests requis par le type/date du compte développeur.
9. Corriger les éventuels rapports pré-lancement puis demander l'accès production.
10. Publier en production lorsque Google Play autorise le passage.

## Points bloquants avant publication publique

- Le code Android natif/reproductible n'est pas actuellement versionné dans ce dépôt web ; il faut conserver ou recréer le projet Capacitor servant à générer le bundle.
- Le bundle disponible est indiqué comme non signé : il faut une vraie build release signée.
- La fonction serveur `delete-account` doit être déployée avant de déclarer l'URL de suppression de compte comme fonctionnelle.
- Les pages publiques de politique de confidentialité et de suppression doivent être déployées sur le domaine officiel.
- Le formulaire Data safety doit être rempli d'après les données réellement collectées par la version envoyée.
