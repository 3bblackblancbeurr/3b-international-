# 3B Underground — Le Cercle Brisé

Cette branche installe le socle jouable du jeu automobile 3B **avant la création des modèles de voitures définitifs**. Les voitures utilisées par le moteur sont des prototypes procéduraux et `modelAsset` reste volontairement `null`.

## Boucle de jeu

Nexus → pays → courses → influence → rivaux → lieutenant → rite du Gardien en 4 étapes → fragment → pays suivants → 8 fragments → finale Nexus.

## Progression

- 8 territoires : France, Algérie, Espagne, Maroc, Italie, Tunisie, Turquie, Estonie.
- 7 paliers d'influence par territoire : 0 / 1 000 / 2 500 / 4 500 / 6 500 / 8 000 / 10 000.
- 24 épreuves générées par territoire, soit **192 épreuves de carrière**.
- 9 disciplines : Rush, Cercle, Flow 3B, Ligne Rouge, Duel Sauvage, Chrono, Convoi, Endurance, Nexus.
- 6 rivaux + 1 lieutenant + 1 Gardien par pays.
- 8 Gardiens, chacun avec 4 étapes et une règle liée à sa valeur 3B.
- Niveau Héritage 1–100, Influence territoriale, 3B Coins internes, 8 fragments narratifs.

## Véhicule prototype

Le gameplay ne dépend pas du mesh final. La fiche véhicule contient masse, puissance, couple, transmission, rapports, coefficient de traînée, surface frontale, coefficient d'adhérence, freins, empattement, braquage, appui et stabilité. Le moteur calcule notamment :

- traînée : `Fd = 0.5 * rho * Cd * A * v²` ;
- résistance au roulement : `Fr = Crr * m * g` ;
- force motrice limitée par la puissance et l'adhérence ;
- freinage, pente, vitesse, régime, rapports et nitro ;
- estimation 0–100, vitesse maxi et indice de performance 100–999.

Classes : D / C / B / A / S / X.

Le garage dispose de 8 familles de pièces, 5 niveaux chacune : moteur, turbo, transmission, pneus, freins, suspension, aéro et nitro. Le réglage PRO gère rapport final, freinage, suspension, différentiel, équilibre aéro et pression des pneus.

## IA

L'IA ne se téléporte pas et n'utilise pas de rattrapage artificiel. Chaque rival combine : rythme, agressivité, taux d'erreur, grip et compétence. Les archétypes sont Calculateur, Agressif, Drifter, Sprinteur, Défensif, Opportuniste et Endurant.

## Gardiens

- France / Céliane / Justice : régularité et propreté.
- Algérie / Yliane / Loyauté : coopération et convoi.
- Espagne / Diego / Passion : drift et rythme.
- Maroc / Naël / Noblesse : maîtrise sans contact.
- Italie / Alessio / Espoir : remontée et endurance.
- Tunisie / Soraya / Courage : haute vitesse.
- Turquie / Émir / Foi : navigation et lecture de route.
- Estonie / Eira / Sagesse : adaptation aux changements d'adhérence.

## Rendu 3D actuel

`ThreeRaceView.js` fournit un banc de course WebGL/Three.js sans voiture artistique finale : route procédurale, bâtiments instanciés, pluie, éclairage, ombres, ACES filmic, caméra poursuite, Cercle Brisé 3D animé et prototypes adverses. Il s'agit du support fonctionnel sur lequel les assets premium seront branchés plus tard.

## Fichiers

- `data.js` : pays, progression, disciplines, événements, IA.
- `carModel.js` : physique, PI, upgrades, tuning.
- `career.js` : sauvegarde, économie, déblocages, récompenses, boss.
- `raceEngine.js` : simulation de course et adversaires.
- `ThreeRaceView.js` : scène 3D prototype.
- `Underground3B.jsx` : Nexus, territoires, garage, course, contrôles PC/mobile.
- `underground.css` : interface responsive.
- `underground.test.js` : tests de logique pure.

## Principe de production

Aucun modèle final de voiture ne doit être ajouté avant validation de la conduite, de la progression, du garage, des boss et du rythme de campagne. Les futurs meshes 3D remplaceront les prototypes sans modifier le moteur de carrière.
