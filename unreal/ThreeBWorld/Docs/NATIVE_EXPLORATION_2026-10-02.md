# Exploration native vérifiée — 2 octobre 2026

Le dépôt possède maintenant les deux vraies cartes Unreal et leurs acteurs externes World Partition. Le personnage apparaît, marche, court, saute, regarde à la souris et utilise les portes dans un jeu standalone. Le Hub mène à la France et la France ramène au Hub.

## Jouer

Depuis le dossier du projet Unreal :

```powershell
powershell -ExecutionPolicy Bypass -File Scripts\run_native_exploration.ps1 -Mode Build
powershell -ExecutionPolicy Bypass -File Scripts\run_native_exploration.ps1 -Mode Play
```

La compilation demande Unreal Engine 5.8 et Visual Studio C++. Le moteur local validé est UE 5.8.2. Un chemin moteur différent peut être passé avec `-EngineRoot`.

Commandes : ZQSD ou WASD, souris, Maj pour courir, Espace pour sauter, E devant la borne de voyage, Alt+F4 pour quitter. Une borne France se trouve à sept mètres du départ du Hub ; la porte France canonique reste aux Archives. Une borne de retour existe à l'arrivée en France. Une chute sous la géométrie replace le personnage au départ.

## Preuves exécutées

- Compilation `ThreeBWorldEditor Win64 Development` : réussie.
- Construction par `UnrealEditor-Cmd -run=pythonscript` : code de sortie 0.
- Hub `Hub3B_Main_V05` : 768 acteurs, un vrai PlayerStart, deux portes natives.
- France `L_France_OpenWorld` : 134 acteurs, un vrai PlayerStart, une porte native.
- Test standalone `-ThreeBExplorationSmoke` : code de sortie 0, apparition du personnage, déplacement supérieur à un mètre, interaction par la caméra, Hub → France → Hub.
- Second test avec rendu GPU D3D12 `-RenderOffScreen -ThreeBExplorationSmoke -ThreeBExplorationCapture -ResX=1600 -ResY=900` : code de sortie 0 et deux captures PNG 1600 × 900 réellement produites et inspectées. Le HUD, le sol, le ciel, les portes et les volumes sont visibles. Les captures sont dans `Saved/Screenshots/native-nexus.png` et `native-france.png`.

Le test se relance avec `Scripts\run_native_exploration.ps1 -Mode Test`. Il produit `Saved/Validation/native-exploration-runtime.json`. Le constructeur produit `Saved/Validation/native-exploration.json`.

## Portée exacte

Il s'agit d'une exploration native de la géométrie de prototype. Le personnage utilise une silhouette primitive explicitement indiquée dans le HUD. Le premier test utilise NullRHI ; le second prouve un rendu D3D12 réel sans fenêtre visible. Les captures montrent encore des cylindres à damier, des masses architecturales simples et des volumes proches du point d'arrivée. Elles ne constituent pas une validation artistique AAA, un benchmark GPU ou une validation des animations.

L'option `RenderOffScreen` est décrite dans la [référence officielle des arguments Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference).

La campagne, le combat, les PNJ animés, les huit royaumes jouables, les récompenses globales et le multijoueur ne sont pas terminés. Aucun XP, Fragment ou accomplissement de Gardien n'est accordé par ces portes. Le client signé et installé reste à produire. Ce résultat ne constitue pas une sortie AAA ou Gold Master.

Le lanceur historique de la racine ouvre un constructeur dans l'éditeur ; `run_native_exploration.ps1 -Mode Play` ouvre directement le jeu d'exploration.
