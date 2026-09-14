# Préparation technique des versions mobiles

**Actualisation :** les projets Android et iOS ont été ajoutés avec Capacitor. Le choix de développement actuel et les validations réalisées sont décrits dans [Versions mobiles de test](VERSIONS_MOBILES.md). Les constats ci-dessous décrivent la base initiale auditée ; le passage sur les stores reste à terminer.

## Base examinée

L'audit porte sur le commit `4f10e925ea7d04553eda584b27ae8b97eb800fd5`. Le dépôt contient une application React/Vite et un manifeste web. Aucun projet Android ou iOS, configuration Capacitor, Fastlane ou fichier Digital Asset Links n'a été retrouvé dans l'arborescence examinée. [Installation Android actuelle](../ANDROID_INSTALLATION.md).

## Le fichier base.apk retrouvé

Lecture locale du manifeste Android, sans installation ni exécution de l'APK :

| Élément | Valeur |
| --- | --- |
| Taille | 469 531 octets |
| SHA-256 | `4a3b3d61a11d7ea5646ea6b638ef95dc8f5adbe8d94ec3bcf3b48aff55879f4a` |
| Package | `org.chromium.webapk.aa015b506c1f715df_v2` |
| Version | `1`, code `1` |
| Hôte d'exécution | `com.android.chrome` |
| Distributeur indiqué | `browser` |
| URL de départ | `https://3b-international.vercel.app/` |
| SDK cible indiqué | `33` |

Ces métadonnées identifient un WebAPK utilisé par Chrome. Ce fichier ne fournit ni le projet natif 3B ni une clé de publication appartenant à l'éditeur. Il ne constitue pas un Android App Bundle à déposer pour cette nouvelle application. Ne pas reprendre son identifiant Chromium comme identifiant de publication 3B.

## Android

Le projet ajouté utilise Capacitor 8.5.2 et embarque le contenu web construit. Le SDK cible est 36, le minimum 24. Un APK de débogage et un AAB non signé ont été compilés avec succès dans GitHub Actions ; leurs résultats sont consignés dans [Versions mobiles de test](VERSIONS_MOBILES.md).

Travail restant :

1. Confirmer l'identifiant Android définitif avant le premier dépôt ; vérifier les identifiants de toute version déjà distribuée.
2. Contrôler le SDK cible demandé par Play Console au moment du dépôt.
3. Préparer la signature et conserver la clé d'import dans un emplacement privé durable. Aucune clé ne doit être ajoutée au dépôt.
4. Produire l'AAB signé, puis configurer Play App Signing.
5. Activer les origines natives dans les services après autorisation du déploiement.
6. Tester le lancement, le retour Android, l'authentification et les liens externes sur appareil.

Les nouveaux dépôts utilisent les Android App Bundles ; les noms de package sont permanents. [Google Play : configuration](https://support.google.com/googleplay/android-developer/answer/9859152?hl=fr).

## iPhone

Le projet Capacitor iOS a été généré et compilé avec Xcode 26.3 pour le simulateur. La dépendance Swift est verrouillée sur Capacitor 8.5.2. Cette version sans signature ne s'installe pas sur un iPhone. [Installation Capacitor](https://capacitorjs.com/docs/getting-started).

Il reste à confirmer le Bundle ID et l'équipe Apple, finaliser l'icône, préparer la signature et tester sur appareil. La boutique physique s'ouvre dans le navigateur intégré avec son parcours web existant. Les listes d'origines autorisées dans les fonctions serveur doivent être déployées puis testées avant la recette native des fonctions connectées.

Apple examine l'utilité réelle et la qualité de l'application : emballer le site ne garantit pas son acceptation. La version soumise doit dépasser une simple présentation de liens. [App Review, section 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

## Comptes et confidentialité

Constats dans les fichiers examinés :

| Fonction | Évidence dans le code | Travail restant |
| --- | --- | --- |
| Compte | `AccountPage.jsx` propose inscription, connexion, récupération et déconnexion. | Ajouter le parcours de suppression du compte et confirmer la fermeture de session. |
| API membre | `member-hub/index.ts` ne propose pas d'action utilisateur de suppression de compte. | Implémenter et tester la suppression des données associées ; gérer les éléments qui nécessitent une conservation justifiée. |
| Communauté | Règles, signalements, blocages et interface de modération présents. | Vérifier les parcours et l'organisation réelle de la modération sur la version soumise. |
| Données communautaires | Profils, messages, publications, votes et abonnements. | Déterminer précisément ce qui est supprimé ou conservé, y compris les médias. |
| Création et IA | Appels prévus à des fournisseurs IA ; stockage d'images dans le bucket `studio-3b`. | Vérifier les services actifs, l'information donnée aux utilisateurs et les déclarations de transfert/collecte. |
| Boutique | Paiement Stripe et traitement de commandes de vêtements/accessoires prévus. | Vérifier le mode actif et les données nécessaires aux commandes avant toute déclaration. |
| Pages publiques | Aucune page de confidentialité ou de suppression repérée dans l'arborescence examinée. | Fournir des pages fonctionnelles, une identité d'éditeur et un contact confirmés. |

Le retrait ou masquage de publications ne remplace pas la suppression du compte. Il faut auditer les relations entre tables, les fichiers stockés et les sessions avant d'implémenter cette opération ; aucune suppression de données réelles n'a été exécutée dans cette préparation.

Google demande un parcours dans l'application et une ressource web permettant de demander la suppression. [Suppression des comptes Google Play](https://support.google.com/googleplay/android-developer/answer/13327111?hl=fr). Apple exige une suppression initiable dans l'application lorsqu'elle propose la création de compte. [App Review, section 5.1.1](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage).

## Informations à compléter pour l'envoi

Confirmer l'identité publique de l'éditeur, les coordonnées d'assistance, les conditions de conservation des données, le public visé et les pays de disponibilité. Utiliser ces informations pour finaliser les pages et les formulaires des stores. Ce dossier est une préparation technique ; il ne constitue pas une attestation de conformité ni un résultat d'examen des stores.
