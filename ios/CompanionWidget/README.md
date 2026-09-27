# Compagnon 3B — iOS

Le même schéma Swift est compilé par l'application et l'extension WidgetKit :
`ios/App/App/CompanionActivityAttributes.swift`.

## Comportement

- Une Live Activity démarre uniquement sur demande explicite, application au premier plan et autorisation iOS active. Des demandes répétées réutilisent la même activité ; les opérations démarrage/mise à jour/arrêt sont exécutées dans leur ordre d'arrivée.
- L'état effectif est relu dans ActivityKit, y compris après une relance, un identifiant enregistré périmé ou un arrêt effectué par l'utilisateur.
- iOS 16.2 et suivants : le contenu est déclaré périmé après cinq minutes sans mise à jour. Le message devient « Ouvrez 3B pour actualiser ». iOS 16.1 conserve l'API compatible sans ce délai de péremption système.
- Aucun push distant, microphone, caméra, lecture d'une autre application ou tâche d'animation permanente en arrière-plan.
- Le système contrôle la durée et la fréquence des mises à jour ; une Live Activity n'est pas une présence permanente. Apple limite actuellement une activité standard à huit heures.
- `syncWidget({ mode, message, enabled })` ne crée jamais de Live Activity. Le paramètre `message` est volontairement ignoré : seul un mode autorisé, l'activation et la date sont stockés ; les libellés sont produits localement. Aucun montant, contenu de notification, identifiant personnel ou payload d'événement n'est partagé.
- Les réactions du widget expirent après cinq minutes ; une timeline prépare ensuite le sommeil, le réveil et les changements d'heure sur six heures. L'arrêt conserve un état « Compagnon en pause » jusqu'à la réactivation.
- Les dessins sont vectoriels et statiques sur les surfaces système ; lueur atténuée en Always-On, tailles explicites pour Dynamic Island, libellés VoiceOver et fond de conteneur WidgetKit sur iOS 17+.

## Signature et distribution

Les deux cibles déclarent le groupe `group.app.vercel.threebinternational.companion` dans leurs entitlements. Lors de la signature, ce groupe doit être créé/activé dans le compte Apple Developer et présent dans les profils de provisioning de l'app et de l'extension. Sans conteneur autorisé, `widgetSync` vaut `false` et le widget garde son comportement horaire local ; aucun faux succès de synchronisation n'est renvoyé.

Une compilation Simulator sans signature ne valide pas cette configuration de distribution.

## Vérification

`node --test tests/companion-ios.test.js` vérifie le projet et les entitlements. Avec `swiftc` disponible, il compile et exécute aussi les scénarios Swift réels : mode inconnu, confidentialité du snapshot, expiration, désactivation, sommeil/réveil, changements d'heure et transitions heure d'été/hiver.

Avant distribution signée, vérifier sur iPhone : démarrer deux fois, arrêter aussitôt, retirer l'activité par iOS, rouvrir l'app, couper l'autorisation Live Activities, synchroniser un widget sans Live Activity, désactiver le compagnon, laisser expirer une réaction, afficher chaque famille en mode teinté, VoiceOver, grandes polices et Always-On.

Documentation Apple :
- [ActivityKit : cycle de vie, contraintes et contenu périmé](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Partager des données avec App Groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)
- [Actualiser les widgets](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- [Fonds WidgetKit](https://developer.apple.com/documentation/widgetkit/displaying-the-right-widget-background)
