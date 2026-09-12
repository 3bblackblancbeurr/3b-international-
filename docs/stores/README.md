# Préparation des fiches 3B International

Dossier préparé le 12 septembre 2026 pour la version source `4f10e925ea7d04553eda584b27ae8b97eb800fd5`.

**Statut : brouillons de publication. Aucun envoi aux stores n'est effectué par ces fichiers.**

La version web reste disponible sur [3B International](https://3b-international.vercel.app/). L'installation depuis Chrome et la présence dans un store sont deux parcours distincts.

## Textes prêts à reprendre

[fr-FR.json](fr-FR.json) contient le nom, les descriptions française courte et complète, le sous-titre Apple, les mots-clés et le texte promotionnel. Les longueurs ont été contrôlées selon les limites des consoles. La catégorie Divertissement et le SKU Apple sont proposés ; ils ne sont pas enregistrés.

La description se limite aux fonctions repérées dans le code. Le manga et Secret 3B ouvrent actuellement un écran d'attente : ils ne sont pas annoncés comme disponibles. Les fonctions IA et les achats ne sont pas promis dans cette première description, car leur configuration active et le parcours natif restent à vérifier.

Les champs `null` sont des informations à fournir ou à vérifier. Ils ne doivent pas être transmis tels quels. Les formulaires concernant les données et le public cible nécessitent l'audit de la version réellement distribuée.

## Ordre de préparation

| Étape | Résultat attendu |
| --- | --- |
| Compte Google Play | Identité et téléphone validés ; création d'application accessible. |
| Compte Apple | Accès à App Store Connect avec une adhésion permettant de distribuer l'application. |
| Version Android | Un Android App Bundle signé, un identifiant propre à 3B et un test sur appareil. |
| Version iPhone | Un projet iOS compilé avec Xcode, signé par l'équipe Apple et testé. |
| Comptes et données | Suppression du compte, politique de confidentialité et assistance effectivement accessibles. |
| Fiches | Textes, icônes, captures réelles, coordonnées et déclarations exactes. |
| Tests et examen | Parcours fonctionnels validés, exigences de test du compte remplies, puis envoi pour examen. |

La validation d'un compte développeur ne construit pas les applications et ne les publie pas. L'indexation du site dans Google ne publie pas non plus une fiche de store.

Pour les comptes Google Play personnels créés après le 13 novembre 2023, Google demande au moins 12 testeurs inscrits au test fermé pendant 14 jours consécutifs avant une demande d'accès à la production. La date de création du compte doit être vérifiée dans la console. [Exigences officielles de test](https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr).

## Détails utilisables pour la suite

- [Préparation technique](TECHNIQUE.md) : nature du fichier APK retrouvé, choix de packaging et problèmes concrets à traiter.
- [Visuels et recette](VISUELS_ET_TESTS.md) : captures à produire depuis les builds et parcours à vérifier.

## Références des champs

Google Play autorise 30 caractères pour le nom, 80 pour le texte court et 4 000 pour la description. [Créer et configurer une application](https://support.google.com/googleplay/android-developer/answer/9859152?hl=fr).

Apple autorise 30 caractères pour le nom et le sous-titre. [Informations sur l'application](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/). Le texte promotionnel accepte 170 caractères, la description 4 000 et les mots-clés 100 octets. [Informations sur la version](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/).
