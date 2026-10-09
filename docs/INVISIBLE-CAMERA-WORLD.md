# Monde Invisible — caméra et monde 3D (v5)

## Utilisation sur Android

Ouvrir le Monde Invisible, puis **Caméra** dans la navigation. Le bouton caméra du portail ouvre cette même vue ; il ne crée aucun aperçu intégré supplémentaire. Le monde s’ouvre en plein écran, avant toute demande de permission. Appuyer sur **Ouvrir ma caméra**, puis autoriser la caméra. Le décor filmé reste visible derrière les objets 3D.

**Tourner avec téléphone** active le regard par les capteurs. Le premier échantillon valide calibre la direction ; **Recentrer** replace le portail devant soi. Sans capteurs, glisser tourne le regard. Taper un objet ouvre sa fiche ; **Réveiller sa lumière** produit une réaction visuelle. **Objets** permet également de choisir une présence sans la chercher dans le champ de vision.

Choisir un autre royaume dans **Royaumes**, puis ouvrir sa caméra. Les huit ambiances sont disponibles sans résoudre d’énigme. L’exploration ne valide aucun secret et ne crée aucune récompense.

## Deux affichages distincts

| Affichage | Fonctionnement |
| --- | --- |
| Caméra | Vidéo locale + scène transparente en perspective, à hauteur humaine. Le toucher ou l’orientation modifie le regard. Les déplacements du téléphone ne sont pas suivis. |
| Placer en AR | Session native `immersive-ar`, suivi du téléphone et détection du sol par WebXR. Le portail est placé en mètres au point touché, face au joueur. Les objets restent dans le repère spatial de cette session. |
| 3D | Visite à distance du royaume, sans caméra ni capteurs. Le toucher tourne autour des objets ; pincer ajuste la distance. |

Le placement est proposé après `isSessionSupported('immersive-ar')` et la demande doit effectivement fournir `hit-test`, un repère local et `dom-overlay`, afin de garder les commandes HTML accessibles. Une caméra accessible ne constitue pas une preuve de suivi spatial. Les murs, plafonds et poses non rigides sont refusés. Une perte du suivi masque le monde ; un changement du repère demande un nouveau placement. Aucune ancre persistante, reconnaissance de bâtiment, géolocalisation ni occlusion par les objets réels n’est annoncée.

Google documente [WebXR sur Chrome Android via ARCore](https://developers.google.com/ar/develop/webxr). La compatibilité de chaque téléphone reste vérifiée à l’exécution. [WebXR Hit Test](https://www.w3.org/TR/webxr-hit-test-1/) et [Device Orientation](https://www.w3.org/TR/orientation-event/) définissent les poses et les axes utilisés.

## Ressources et permissions

La demande de caméra vise la caméra arrière, 1280×720 et 30 images/seconde, sans audio ; ce sont des contraintes idéales, la résolution réellement fournie dépend du navigateur. Le rendu hors session XR native est limité à 1,5 fois la définition CSS et 1,8 million de pixels. Les huit scènes conservent au plus 80 appels de dessin et 35 000 triangles ; les effets du portail sont procéduraux et n’exigent aucune texture distante.

Fermer, revenir en 3D ou passer l’application en arrière-plan arrête la caméra et les capteurs. Les flux et sessions obtenus après annulation sont immédiatement libérés. Passer de l’AR à la caméra attend la fin de la session native. Aucun enregistrement de photo/vidéo et aucun envoi du flux ne sont implémentés. Observer à l’arrêt dans un espace public dégagé.

## Validation

`node --test tests/invisible-lens-adventure.test.js tests/invisible-lens-xr.test.js` couvre les huit scènes, budgets, libération des ressources, indépendance de la progression, calibration, poses au sol et courses de permissions.

`node scripts/verify-invisible-camera.mjs` valide la composition d’un véritable `MediaStream` généré par Chromium et de WebGL, les contrôles en portrait/paysage, les huit royaumes, refus et annulations, pistes interrompues, fermeture, arrière-plan et capteurs simulés. `node scripts/verify-invisible-browser.mjs` conserve le parcours complet de l’aventure et vérifie que les inspections ne modifient ni énigmes ni récompenses.

Les fixtures utilisent un membre synthétique. Ces vérifications automatiques ne constituent pas un essai de caméra ou de suivi AR sur un téléphone physique.
