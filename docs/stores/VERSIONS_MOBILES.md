# Versions mobiles de test

Les projets `android/` et `ios/` intègrent maintenant le contenu construit dans `dist/` avec Capacitor 8.5.2. Ils utilisent le code de 3B et ses ressources locales ; le lancement ne dépend pas d'un `server.url` distant.

L'identifiant de travail est `app.vercel.threebinternational`. Il est proposé pour les tests et n'a pas été enregistré dans un store. Le confirmer avant le premier dépôt, car les identifiants de distribution sont durables.

## Préparer et ouvrir les projets

```sh
npm ci
npm run mobile:sync
npm run mobile:android
# Sur un Mac équipé de Xcode 26 ou ultérieur :
npm run mobile:ios
```

La synchronisation copie les fichiers web, met à jour les plugins et verrouille la dépendance Swift à la version exacte du paquet Capacitor iOS.

## Comportement ajouté

- Le bouton d'installation web disparaît dans l'application native.
- Le bouton Retour Android ferme d'abord une boîte de dialogue, suit ensuite l'historique ou retourne à l'accueil ; il ne ferme l'application qu'à la racine.
- La boutique de vêtements et accessoires s'ouvre dans le navigateur système intégré. Son paiement conserve son parcours web et ses protections existantes. Une connexion au compte peut être demandée dans ce navigateur.
- Les origines `https://localhost` et `capacitor://localhost` sont ajoutées aux fonctions serveur prévues pour les clients natifs. Les contrôles d'authentification restent nécessaires.
- L'icône Android reprend les PNG 3B existants, sans modification du dessin. La sauvegarde système Android des données de l'application est désactivée.

## Compilation automatisée

Le workflow « Build mobile test versions » prépare un APK Android de débogage, un AAB non signé pour la distribution et une application pour simulateur iOS. Le dernier résultat de compilation doit être vérifié dans GitHub Actions : l'existence du workflow ne prouve pas que les builds ont réussi.

Les artefacts de test sont conservés 14 jours par le workflow. L'application iOS destinée au simulateur ne s'installe pas sur un iPhone. Les builds de production et leurs signatures restent à configurer avec les comptes développeur.

## Vérifications effectuées localement

- Construction Vite réussie.
- 324 tests du code réussis, dont quatre tests du comportement Retour Android.
- Génération des deux projets et synchronisation des ressources réussies.

Ces contrôles ne remplacent pas une recette sur téléphone : clavier, commandes tactiles, performances 3D, perte de réseau, connexion et récupération du compte restent à vérifier sur les appareils ciblés. L'export de la clé de secours doit notamment être vérifié sur iPhone.

## Conditions avant envoi aux stores

Terminer les validations des comptes développeur, produire les versions signées, finaliser l'icône iOS 1024 px à partir du logo validé, réaliser les captures natives, terminer la confidentialité et la suppression du compte, puis remplir les déclarations des stores et effectuer les tests requis. Les fichiers de ce dossier ne déclarent aucune publication effective.

L'examen des relations de la base a confirmé que les messages et publications communautaires doivent être traités avant une suppression de compte, et que les images stockées ainsi que les identifiants conservés dans les parties multijoueurs demandent un traitement dédié. Aucune suppression de données utilisateur n'a été exécutée.
