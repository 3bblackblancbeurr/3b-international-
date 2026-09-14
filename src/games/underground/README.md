# 3B Underground — Le Cercle Brisé

Cette branche installe le socle jouable du jeu automobile 3B avant la création des modèles de voitures définitifs. Les voitures utilisées par le moteur sont des prototypes procéduraux et `modelAsset` reste volontairement `null`.

## Boucle de jeu
Nexus → pays → courses → influence → rivaux → lieutenant → rite du Gardien en 4 étapes → fragment → pays suivants → 8 fragments → finale Nexus.

## Progression
- 8 territoires : France, Algérie, Espagne, Maroc, Italie, Tunisie, Turquie, Estonie.
- 7 paliers d'influence par territoire : 0 / 1 000 / 2 500 / 4 500 / 6 500 / 8 000 / 10 000.
- 24 épreuves par territoire, soit 192 épreuves de carrière.
- 9 disciplines : Rush, Cercle, Flow 3B, Ligne Rouge, Duel Sauvage, Chrono, Convoi, Endurance, Nexus.
- 6 rivaux + 1 lieutenant + 1 Gardien par pays.
- Niveau Héritage 1–100, Influence, 3B Coins internes et 8 fragments narratifs.

## Véhicule prototype et performance
Le gameplay ne dépend pas du mesh final. La fiche véhicule contient masse, puissance, couple, transmission, rapports, coefficient de traînée, surface frontale, adhérence, freins, empattement, braquage, appui et stabilité.

Le tuning mécanique couvre 18 familles : moteur, admission, ECU, carburant, échappement, turbo, intercooler, refroidissement, embrayage, transmission, différentiel, pneus, freins, suspension, aéro, allègement, nitro et électronique.

Le réglage PRO stocke rapport final, freinage, suspension, différentiel, aéro, pression pneus, carrossage, pincement, hauteur, ressorts, compression/détente, barres antiroulis, direction, diff accel/decel, antipatinage, ABS, launch control et boost turbo.

## Personnalisation ultra
Le système de personnalisation est entièrement data-driven avant les futurs modèles 3D : 50 slots et près de 300 variantes dans 9 familles.

Familles : carrosserie, roues/stance, phares/lumières, peinture/matières, stickers/livrées, habitacle, audio/multimédia, baie moteur et détails/identité.

Exemples : pare-chocs, ailes, capot, toit, aileron, diffuseur, jantes, pneus, étriers, phares, DRL, feux arrière, néons, finition peinture, carbone, teinte des vitres, fauteuils, cuir/alcantara/nappa, volant, levier/palettes, planche de bord, compteurs, ciel de toit, tapis, arceau, pédalier, poste radio/écran, haut-parleurs, caisson, amplificateur, coffre audio, cache moteur, admission, durites, plaque et badges.

Le moteur de livrée accepte jusqu'à 128 couches de vinyle indépendantes et 64 stickers. Chaque couche stocke surface, position, échelle, rotation, miroir, texte/couleurs et opacité. Néons et ambiance intérieure sont zonés et configurables.

Tous les choix ont `assetRef: null` tant que les modèles finaux n'existent pas. Les futurs meshes, matériaux, textures, decals et profils d'éclairage viendront se brancher sur les slots existants sans refaire la sauvegarde, l'économie ou la carrière.

## Plateforme automobile modulaire S1
Le véhicule possède maintenant une identité de plateforme indépendante du futur design : `u3b-modular-platform-s1`.

`vehiclePlatform.js` définit :
- une enveloppe physique de référence en mètres ;
- 50 slots liés à des points de montage ;
- plus de 45 anchors nommés pour carrosserie, roues, feux, habitacle, audio, baie moteur et identité ;
- 18 canaux de matériaux paramétriques ;
- 7 surfaces UV/logiques pour livrées et stickers ;
- des règles de compatibilité pour futurs packs de pièces ;
- les transformations mathématiques de stance ;
- un assembleur qui transforme la sauvegarde du joueur en liste de modules à monter ;
- un rapport séparant clairement « données prêtes » et « art final prêt ».

`ModularVehicleProxy.js` consomme déjà cette architecture. Le proxy en course reflète maintenant couleurs, stance, jantes, éclairage, néons, sièges, écran, audio coffre, aileron et plusieurs détails. Ce proxy n'est pas le design final : c'est le banc de validation du système modulaire.

La future voiture originale 3B devra donc être exportée en pièces séparées : châssis, coque, pare-chocs, capot, toit, ailes, aileron, diffuseur, rétros, roues, freins, optiques, sièges, volant, tableau de bord, multimédia, installation audio, éléments de baie moteur et détails d'identité.

Le contrat complet de production est documenté dans `docs/3B_UNDERGROUND_MODULAR_VEHICLE_PLATFORM.md`.

## IA
L'IA ne se téléporte pas et n'utilise pas de rattrapage artificiel. Les rivaux combinent rythme, agressivité, erreurs, grip et compétence.

## Rendu 3D actuel
`ThreeRaceView.js` et `PremiumWorld.js` fournissent un banc de course Three.js/WebGL avec route humide, bâtiments, pluie, éclairage, ombres, ACES, caméra poursuite, Cercle Brisé, France Gold Master procédurale et plateforme véhicule modulaire proxy.

## Fichiers clés
- `data.js` : pays, progression, disciplines, événements, IA.
- `carModel.js` : physique, PI, 18 upgrades, tuning PRO et identité de plateforme.
- `customization.js` : personnalisation ultra et livrées.
- `vehiclePlatform.js` : contrat modulaire, anchors, compatibilité, assembly et stance.
- `ModularVehicleProxy.js` : rendu proxy modulaire branché sur la vraie sauvegarde de personnalisation.
- `career.js` : sauvegarde, économie, achats, personnalisation, boss.
- `raceEngine.js` : simulation de course et adversaires.
- `ThreeRaceView.js` / `PremiumWorld.js` : rendu 3D prototype premium.
- `Underground3B.jsx` : Nexus, territoires, 3B Custom Lab, course et contrôles.
- `underground.test.js`, `underground-customization.test.js`, `vehicle-platform.test.js` : tests.

## Principe de production
Aucun modèle final de voiture ne doit être ajouté avant validation de la conduite, de la progression, du garage, de la personnalisation, des boss et du rythme visuel. Le premier vrai véhicule doit respecter le contrat de plateforme S1 afin que ses meshes 3D remplacent les proxies sans modifier carrière, tuning, économie, sauvegarde ou livrées.
