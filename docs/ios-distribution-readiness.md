# Distribution iPhone — préparation 3B International

État préparé le 22 septembre 2026.

## Déjà prêt

- Installation web iPhone sans invitation : `https://3b-international.vercel.app/iphone`
- Installation universelle : `https://3b-international.vercel.app/installer`
- Projet natif Capacitor iOS présent dans `ios/App`
- Bundle ID : `app.vercel.threebinternational`
- Nom : `3B International`
- Cible minimale actuelle : iOS 15
- Version Xcode actuelle : 1.0, build 1
- Build simulateur iOS contrôlé par GitHub Actions
- Fichier public de distribution : `public/ios-distribution.json`

## Quand un lien TestFlight public est disponible

Le site est déjà capable de l'afficher. Il suffit d'exécuter :

```bash
npm run ios:distribution -- --testflight https://testflight.apple.com/join/XXXXXXXX
```

Le script refuse un lien TestFlight qui ne vient pas du domaine officiel `testflight.apple.com`.

## Quand la fiche App Store est disponible

```bash
npm run ios:distribution -- --app-store https://apps.apple.com/...
```

Le script refuse un lien App Store qui ne vient pas du domaine officiel `apps.apple.com`.

## Distribution native depuis le web

Si Apple autorise et configure cette distribution pour le compte développeur concerné :

```bash
npm run ios:distribution -- --web https://adresse-https-officielle
```

## Les trois liens peuvent être configurés ensemble

```bash
npm run ios:distribution -- \
  --testflight https://testflight.apple.com/join/XXXXXXXX \
  --app-store https://apps.apple.com/... \
  --web https://adresse-https-officielle
```

Après déploiement, la page `/iphone` détecte automatiquement les liens non vides et affiche les boutons correspondants.

## Étapes Apple qui restent externes au dépôt

La version web n'en a pas besoin. Pour la version native, Apple exige les opérations App Store Connect appropriées : signature du build, chargement dans App Store Connect, configuration TestFlight/App Store, éventuelle bêta-review pour les testeurs externes et activation d'un lien public. Ces étapes nécessitent le compte Apple Developer/App Store Connect et ne doivent pas être simulées dans le code.

## Objectif produit

Le lien `/iphone` reste toujours utilisable, même quand aucune version native n'est publiée. La distribution native vient simplement s'ajouter au-dessus du parcours Safari lorsqu'un lien Apple officiel est renseigné.
