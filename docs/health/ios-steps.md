# Apple Santé et rappels locaux iOS

Implémentation native Capacitor 8, lecture seule et à la demande. Une mise à jour
du site ou l’installation de la PWA n’ajoute pas HealthKit : il faut distribuer
une nouvelle application iOS compilée et signée avec cette intégration.

## Contrat `ThreeBHealth`

| Méthode | Réponse / comportement |
| --- | --- |
| `getStatus()` | `{platform:'ios', available, status:'available'\|'unavailable', permission:'unknown', source:'apple-health', reason?}`. Ne demande aucune permission. |
| `requestStepsPermission()` | Action explicite, application au premier plan. Demande uniquement la lecture de `stepCount`, aucun droit d’écriture. Retour `{permission:'unknown'}`. |
| `readSteps({days})` | Entier de 1 à 30. Retour `{source:'apple-health', syncedAt:ISO, days:[{date:'YYYY-MM-DD',steps:number\|null}]}`. Refus tant que la connexion n’a pas été choisie. |
| `disconnect()` | Arrête les requêtes en cours et désactive les lectures suivantes. `{disconnected:true, revoked:false}`. Les données déjà présentes dans le journal sont gérées/effacées par le journal web. |
| `openSettings()` | Ouvre seulement l’URL publique `UIApplication.openSettingsURLString`. `{opened, destination:'app-settings'}`. Pas de lien privé vers une page HealthKit. |

Apple ne révèle pas à une application si la personne a accordé ou refusé la
**lecture**. La réussite de la demande signifie seulement que la procédure s’est
terminée. Une journée sans données, un refus et un historique non accessible
peuvent être indiscernables : `null` reste une absence de mesure, jamais zéro.
Les réglages d’Apple Santé permettent à la personne de retirer l’accès ; 3B ne
peut pas le révoquer lui-même. Aucune API d’écriture, de suppression dans Santé,
de fréquence cardiaque, de localisation ou d’accès clinique n’est utilisée.

La requête `HKStatisticsCollectionQuery` avec `cumulativeSum` laisse HealthKit
agréger ses sources (iPhone / Apple Watch), sans additionner des échantillons
bruts qui se chevauchent. Les jours utilisent le calendrier grégorien et le
fuseau local du téléphone, avec des intervalles calendaires d’un jour. La journée
en cours reste partielle. Le système collecte indépendamment de 3B ; 3B relit
au premier plan lorsque la personne a activé la connexion. Pas de collecte
HealthKit en arrière-plan, pas de notification distante, pas d’envoi réseau.

Seule la préférence booléenne `threeb_health_read_enabled` est conservée côté
natif. Aucun total ni échantillon n’est persisté par le plugin. Une déconnexion
invalide les lectures/demandes en cours pour empêcher une réponse tardive de
réactiver la connexion. Les erreurs ne contiennent pas de mesures.

## Contrat `ThreeBHealthReminders`

- `getStatus()` → `{platform:'ios',available:true,permission:'granted'|'denied'|'prompt'|'unknown',pendingCount,reminders:[{id,time}]}` ; ne retourne que les rappels Santé.
- `requestPermission()` → `{permission}` ; seule cette action demande la permission de notification (`alert` et `sound`).
- `schedule({reminders:[{id,time,title?,body?}]})` remplace l’ensemble des rappels Santé ; 8 au maximum, identifiants uniques alphanumériques/`_`/`-`, heure `HH:mm`. Retour `{scheduled:true,count}`.
- `cancelAll()` supprime les rappels en attente **et** les notifications déjà affichées du préfixe `threeb.health.reminder.` seulement. Retour `{cancelled:true}`.

Le titre et le corps fournis sont volontairement ignorés : les notifications
affichent uniquement « Ton moment 3B » et un texte générique, sans valeur de
santé. `UNCalendarNotificationTrigger` répète à l’heure locale, sans fuseau fixé
ni intervalle de 86 400 secondes. La livraison dépend des réglages iOS (mode
Concentration, notifications autorisées, etc.). Les opérations sont sérialisées
pour qu’une annulation rapide ne soit pas suivie d’une programmation tardive.
La programmation ne demande jamais automatiquement de permission.

## Configuration et contrôle avant distribution

Le projet enregistre les deux plugins dans `ThreeBBridgeViewController`, inclut
leurs fichiers dans la cible App, lie HealthKit, active la capability et signe
avec `App/App.entitlements` contenant `com.apple.developer.healthkit = true`.
`NSHealthShareUsageDescription` décrit uniquement la lecture des pas. Aucun
`NSHealthUpdateUsageDescription` ni entitlement de collecte en arrière-plan
n’est ajouté, puisque 3B n’écrit aucune donnée de santé.

Le simulateur renvoie `unavailable` volontairement. Sur appareil, le plugin
vérifie la disponibilité de HealthKit et la présence de la description avant
toute demande, puis laisse `getRequestStatusForAuthorization` signaler une
configuration/capability inaccessible par son erreur. Ce contrôle ne représente
pas une autorisation de lecture. Pas d’introspection privée des entitlements.

Pour distribuer : activer HealthKit pour l’App ID dans Apple Developer, régénérer
le profil si nécessaire, compiler/archiver sous Xcode et valider la signature.
Le code du dépôt ne peut pas modifier le compte Apple ni le profil existant.
Les déclarations App Store et la politique de confidentialité doivent refléter
la lecture locale des pas. Désactiver les logs Capacitor (`loggingBehavior:
'none'`) afin qu’aucune réponse du bridge ne soit journalisée en mode debug.

Contrôles restant à faire sur un iPhone réel avant annonce de disponibilité :
autoriser/refuser/retirer l’accès, fermer et rouvrir l’application, comparer
les jours passés avec Apple Santé, iPhone + Watch, changement de date/fuseau,
jour sans échantillons, données limitées, connexion annulée pendant une lecture,
rappels autorisés/refusés puis arrêtés, et présence de notifications d’autres
modules inchangée. Les contrôles contractuels du dépôt ne remplacent pas une
compilation Xcode ni ces essais. Aucun essai matériel n’est revendiqué ici.

## Sources officielles consultées le 15 octobre 2026

- [Apple — Setting up HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)
- [Apple — Authorizing access to health data](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data)
- [Apple — HKStatisticsCollectionQuery](https://developer.apple.com/documentation/healthkit/hkstatisticscollectionquery)
- [Apple WWDC — Getting started with HealthKit, agrégation des sources](https://developer.apple.com/videos/play/wwdc2020/10664/)
- [Apple — UNCalendarNotificationTrigger](https://developer.apple.com/documentation/usernotifications/uncalendarnotificationtrigger)
- [Apple — removePendingNotificationRequests](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/removependingnotificationrequests(withidentifiers:))
- [Apple — openSettingsURLString](https://developer.apple.com/documentation/uikit/uiapplication/opensettingsurlstring)
- [Capacitor 8 — Plugins iOS](https://capacitorjs.com/docs/plugins/ios)
- [Capacitor — Custom native iOS code](https://capacitorjs.com/docs/ios/custom-code)
