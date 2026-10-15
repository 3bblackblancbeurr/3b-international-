# Santé 3B · Android natif

## Ce qui est intégré

Le plugin Capacitor `ThreeBHealth` lit les pas de **Santé Connect / Health Connect**, uniquement après accord. Les pas sont agrégés par le fournisseur (priorité des sources et doublons gérés par Health Connect). Chaque jour utilise les limites du calendrier local du téléphone, y compris les jours de 23 ou 25 heures. Une absence de données reste `null`, jamais un faux zéro. Aucune donnée n'est écrite dans Health Connect, envoyée sur le réseau, journalisée ou stockée par le plugin natif.

Le fournisseur continue son propre comptage lorsque 3B est fermé. 3B actualise l'affichage en premier plan. Le plugin ne demande aucune autorisation de lecture santé en arrière-plan ou d'historique étendu et ne crée aucun service de suivi.

Sur Android 14+ avec extension SDK 20+ et capteur de pas, Health Connect peut compter directement les pas dès qu'une application détient `READ_STEPS`. Ailleurs, Samsung Health ou une autre application doit alimenter Health Connect, avec l'accord de la personne. L'utilisateur active séparément le partage Samsung Health → Santé Connect ; 3B ne modifie pas ce réglage. Les totaux peuvent arriver avec retard et dépendre des priorités définies dans Santé Connect.

## Contrat JavaScript

| Méthode | Résultat / effet |
|---|---|
| `getStatus()` | `{platform:'android', source:'health-connect', available, status:'available'\|'needs-update'\|'unavailable', permission:'granted'\|'not-granted', onDeviceSteps}` ; aucun écran d'autorisation |
| `requestStepsPermission()` | Explication native locale, puis écran système pour **READ_STEPS seulement** ; `{permission:'granted'\|'not-granted'}` ; annulation = pas d'accord |
| `readSteps({days:7})` | Entier 1–30, défaut 7 ; `{source:'health-connect', syncedAt:ISO, days:[{date:'YYYY-MM-DD',steps:number\|null}]}` ; permission vérifiée à chaque lecture |
| `openSettings()` | `{opened:boolean}` ; réglages Santé Connect, ou sa fiche d'installation/mise à jour en cas de fournisseur manquant |
| `disconnect()` | `{permission:'not-granted'}` après révocation effective ; aucune suppression du journal web ni des pas du fournisseur |

Erreurs stables : `HEALTH_UNAVAILABLE`, `PERMISSION_DENIED`, `PERMISSION_BUSY`, `APP_NOT_VISIBLE`, `PERMISSION_UNAVAILABLE`, `INVALID_DAYS`, `HEALTH_READ_FAILED`, `HEALTH_BUSY`, `HEALTH_TIMEOUT`, `HEALTH_CANCELLED`, `REVOKE_IN_SETTINGS`. Les erreurs ne contiennent pas de messages internes du fournisseur ni de valeurs santé. Une lecture est limitée à40 secondes, annule sa boucle au retrait de la connexion et vérifie la visibilité avant chaque jour. Les réponses de permission tardives après déconnexion sont invalidées et le droit est retiré.

Le SDK stable 1.1.0 ne propose que `revokeAllPermissions()`. Comme 3B ne demande que READ_STEPS, cette méthode retire cette seule permission. Une protection vérifie l'ensemble des permissions accordées : si une future fonction obtient d'autres accès, le plugin refuse de les révoquer et demande le retrait ciblé dans les réglages.

## Rappels Android

Plugin distinct `ThreeBHealthReminders` :

| Méthode | Résultat |
|---|---|
| `getStatus()` | `{permission:'granted'\|'denied'\|'prompt',pendingCount,reminders:[{id,time:'HH:mm'}],timing:'approximate'}` |
| `requestPermission()` | Autorisation système `POST_NOTIFICATIONS` sur Android13+ uniquement après action ; retourne le statut |
| `schedule({reminders:[{id,time,title,body}]})` | Au maximum 8 identifiants uniques `[A-Za-z0-9_-]{1,48}` ; remplace uniquement les rappels Santé ; `{scheduled:true,count}` |
| `cancelAll()` | Efface uniquement les alarmes, notifications et horaires Santé ; `{cancelled:true}` |

Le titre et le corps reçus du web ne sont volontairement pas affichés ni conservés. Tous les rappels utilisent un texte générique « Votre moment 3B », visibilité privée, sans mesure santé. Seuls identifiant et horaire sont persistés dans un espace local privé, distinct du journal et exclu de la sauvegarde Android (`allowBackup=false` existant). Un appui ouvre `#sante` à chaud ou à froid. Le calendrier est recalculé au redémarrage, après mise à jour et au changement d'heure/fuseau.

Les alarmes sont **inexactes**, avec fenêtre de 10 minutes et retards possibles supplémentaires en économie d'énergie. Aucune permission d'alarme exacte, aucun service permanent, aucune lecture santé en arrière-plan. Un arrêt forcé, des notifications bloquées ou des restrictions constructeur peuvent empêcher les rappels ; l'utilisateur peut les réactiver dans l'application.

## Compatibilité et confidentialité

- Dépendances figées : Health Connect 1.1.0, Kotlin 2.3.0, coroutines Android 1.10.2. Compilation Java/Kotlin21, AGP8.13/Gradle8.14.3/API36 du projet conservés.
- L'application conserve minSdk24. Le SDK Health Connect exige26 et son fournisseur28 : l'exception de fusion de manifest est **strictement isolée**. L'objet `Api28` contient toutes les références Health Connect et `java.time`, sans initialisation ni types SDK dans l'ABI du plugin externe. Chaque entrée vérifie Android28 avant de l'appeler. Le service facultatif fourni par le SDK est désactivé par ressource sur API24–27. Sur ces anciens téléphones, le reste de 3B et les rappels restent utilisables ; les pas natifs signalent indisponible.
- Les activités Android13 et14+ de politique de confidentialité / onboarding affichent un texte complet intégré à l'APK, sans réseau. Le bouton ouvre Santé ; aucune autorisation n'est déclenchée par la seule ouverture du texte.
- La politique explique le journal temporaire, l'option de sauvegarde locale non chiffrée, la durée de 90 jours, export/effacement et la différence entre retirer un accès et effacer une copie.

## Distribution et validation nécessaires

Cette intégration fonctionne dans une **nouvelle version native Android Capacitor**. Une mise à jour Vercel/PWA seule ne l'installe pas sur le téléphone. Le workflow mobile construit un APK debug et un AAB non signé ; le canal Play doit disposer d'une version signée distribuée par le compte du propriétaire.

Avant publication Play : déclarer l'usage santé et READ_STEPS dans Play Console, fournir la politique de confidentialité correspondant au texte natif, compléter les déclarations Data safety selon le fonctionnement global réel de l'application, et obtenir les validations demandées. Aucune validation Play ou autorisation d'utilisateur n'est présumée ici.

Contrôles obligatoires sur appareils : Android13 avec fournisseur séparé ; Android14+ ; Samsung partage activé/désactivé ; refus/annulation/retrait d'autorisation ; absence de données ; double source téléphone/montre ; changement de jour/fuseau ; rappels notifications refusées, redémarrage et économie d'énergie ; lancement à froid depuis notification. Vérifier aussi démarrage API24/25 pour la frontière SDK. Ces tests physiques ne sont pas remplacés par les tests de contrat ou la compilation CI.

Tests ajoutés : permissions minimales et garde API24, absence de somme brute/écriture/transmission, absence de faux zéro ; calcul des rappels incluant bascule DST printemps/automne et heure inexistante.

## Sources officielles consultées le 15 octobre 2026

- [Prise en main, permissions, politique et onboarding](https://developer.android.com/health-and-fitness/health-connect/get-started)
- [Comptage des pas, extension SDK20, changement d'origine en juin2026](https://developer.android.com/health-and-fitness/health-connect/features/steps)
- [Agrégations](https://developer.android.com/health-and-fitness/health-connect/aggregate-data)
- [PermissionController 1.1.0](https://developer.android.com/reference/androidx/health/connect/client/PermissionController)
- [Versions Health Connect](https://developer.android.com/jetpack/androidx/releases/health-connect)
- [Alarmes Android et délais](https://developer.android.com/develop/background-work/services/alarms)
- [Plugins Android Capacitor](https://capacitorjs.com/docs/plugins/android)
- [Compatibilité Kotlin / Gradle / AGP](https://kotlinlang.org/docs/gradle-configure-project.html)

Le manifest et les métadonnées du véritable AAR `connect-client-1.1.0.aar` ont aussi été inspectés : minSdk26, compileSdk36, AGP≥8.9.1.
