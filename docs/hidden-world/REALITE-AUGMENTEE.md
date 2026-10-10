# Monde caché — module spatial Android

## Ce qui est construit

Le scanner photo reste disponible. Un module Capacitor `HiddenWorldAR` lance une activité Android interne utilisant ARCore 1.56.0. Le menu propose un aperçu 3D sans caméra et, si le plugin est installé et ARCore compatible, un laboratoire de portail spatial. Aucune mission ni énigme n’est ouverte, aucune récompense n’est attribuée.

Le rendu natif utilise OpenGL ES 2 : image caméra ARCore, surface horizontale ou mur vertical détecté, ancre spatiale créée à la demande, orientation vers le joueur au placement, socle et anneau champagne, surface animée bleue. Les shaders canoniques de `src/world/invisible/ar-assets/hidden-ar/` sont utilisés par l’aperçu web et empaquetés par Gradle dans les assets Android. Le build web ne dépend donc pas du dossier Android exclu du déploiement Vercel. L’éclairage directionnel HDR est filtré pour éviter les variations brutales. La profondeur automatique, lorsqu’elle existe, masque les pixels virtuels derrière le décor. Une profondeur absente ou âgée de plus de 200 ms n’est jamais utilisée.

Le portail compact mesure environ 32 cm de haut. Les surfaces détectées sont acceptées entre 25 cm et 1,5 m (distance caméra–point visé). Un mur détecté reçoit un portail centré au point visé, parallèle à sa normale horizontale ; un sol reçoit un petit portail debout. Sans surface détectée mais avec suivi, le bouton crée une ancre manuelle à 55 cm sur le rayon central : cette distance est choisie, pas mesurée sur le mur, et l’occlusion est désactivée pour ce mode. Sans suivi, le même bouton affiche un aperçu lié à la caméra, explicitement étiqueté ; il ne prétend pas rester accroché au mur. Replacer permet de réessayer un ancrage. La détection automatique d’un mur uniforme reste dépendante des détails visuels de la pièce. Les objets ancrés disparaissent lors d’une perte de suivi et réapparaissent seulement si leur repère est à nouveau suivi. Un repère arrêté est détaché. L’utilisateur peut replacer ou fermer. La caméra est arrêtée quand l’activité passe en arrière-plan et la session est libérée à sa destruction. Le scanner WebView est arrêté avant le lancement.

## Essai direct dans la caméra du site / PWA

Le bouton « Essayer le portail avec la caméra » ouvre le flux vidéo réel et superpose un petit portail 3D transparent. Il ne nécessite ni APK ni détection de surface ni distance minimale. L’art du portail partage les mêmes shaders que le module Android. Cet aperçu reste au centre de l’image et suit le téléphone : il ne constitue pas un ancrage sur un mur, ne mesure aucune distance et ne cache pas le portail derrière un meuble. Le message d’aperçu reste visible. Masquer conserve la caméra, Arrêter ou quitter le scanner libère caméra et renderer. La photo du scanner capture uniquement l’image caméra, sans le portail.

## Installation et publication

La mise à jour du site/PWA permet l’aperçu 3D. Elle ne peut pas installer du code natif dans une ancienne application Android. Le module spatial nécessite une nouvelle compilation Android et l’installation de cette version. `mobile-build.yml` compile l’APK de test, le bundle non signé et les tests JUnit. L’APK debug utilise le paquet séparé `app.vercel.threebinternational.arpreview` et le nom « 3B — Portail AR (test) » : il s’installe à côté de l’application officielle, sans la désinstaller ni effacer ses données. Le compte 3B se reconnecte séparément dans cette version. La distribution Play nécessite sa chaîne de signature et sa piste de test existantes. Ne pas présenter une mise à jour Vercel comme une installation du module ARCore.

## Dessins et lieux futurs

Aucune image cible ni coordonnée fictive n’est intégrée. Le registre `android/app/src/main/assets/hidden-ar/targets.json` est vide. Le chargeur natif peut enregistrer jusqu’à 16 dessins placés sur le sol, avec leur largeur physique. Il refuse les chemins externes, doublons et tailles invalides. Une cible n’est utilisable pour placer un portail que si ARCore la suit réellement (`FULL_TRACKING`), si elle est horizontale et à une distance valide. Les marqueurs sur un mur nécessiteront une règle de placement dédiée ; ils ne sont pas confondus avec un sol. La reconnaissance d’un dessin exige son fichier maître, sa dimension physique et un test de reconnaissance sous les angles/lumières réels. Un placement manuel sur le sol ne prouve pas la présence à un lieu déterminé. Pour une future découverte, la reconnaissance visuelle, la localisation et la validation serveur devront être reliées au catalogue publié avant toute récompense. Le laboratoire ne fournit pas de voie d’attribution de récompenses.

Les personnages ne sont pas ajoutés sous forme de silhouettes provisoires : leurs modèles, textures, animations et interactions doivent être produits et validés avant publication. Le portail procédural est une première scène artistique exploitable pour tester le moteur, pas une certification « AAA ».

## Validation sur Samsung SM-G990B

Compilation et tests automatisés ne remplacent pas un essai réel. Sur le téléphone : autoriser/refuser caméra ; accepter/refuser installation ARCore ; placer/replacer ; marcher latéralement et s’approcher ; vérifier occultation avec un meuble ; changer orientation ; interrompre/reprendre via écran verrouillé et autre application ; revenir au scanner ; essayer lumière faible et surfaces sans texture ; tester 15 minutes pour chauffe et fréquence d’images.

Cibles à mesurer : aucun crash, caméra libérée à la fermeture, contrôle lisible en portrait/paysage, ancrage stable sur sol texturé et mur comportant des repères ; fallback manuel à moins d’un mètre et aperçu sans suivi, occlusion cohérente si profondeur active, 30 images/s soutenues sur le modèle ciblé. Ces mesures sont à établir sur appareil, pas annoncées comme acquises.

Références :
- https://developers.google.com/ar/develop/java/enable-arcore
- https://developers.google.com/ar/develop/java/depth/developer-guide
- https://developers.google.com/ar/develop/java/lighting-estimation/developer-guide
- https://developers.google.com/ar/privacy-requirements
- https://github.com/google-ar/arcore-android-sdk/releases/tag/v1.56.0
