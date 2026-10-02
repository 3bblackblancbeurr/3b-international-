# Exploration native vérifiée — 2 octobre 2026

Le dépôt possède maintenant les deux vraies cartes Unreal et leurs acteurs externes World Partition. Le personnage apparaît, marche, court, saute, regarde à la souris et utilise les portes dans un jeu standalone. Le Hub mène à la France et la France ramène au Hub.

## Jouer

Le livrable autonome `Monde-3B-Prototype-Windows.zip` contient le client Win64 Development, les deux cartes préparées pour le jeu et leurs dépendances. Extraire toute l'archive puis ouvrir `ThreeBWorld.exe` dans le dossier `Monde-3B-Prototype-Windows`. Unreal Editor et Visual Studio ne sont pas nécessaires pour lancer ce client. Le `LISEZ-MOI.txt` inclus détaille les commandes et la portée du prototype.

Un redistribuable Visual C++ x64 est fourni dans `Prerequis/vc_redist.x64.exe` pour un autre PC auquel les DLL VC++ manqueraient. Sa signature Authenticode Microsoft a été vérifiée valide. Il n'a pas été exécuté ni installé pendant cette tâche et rien dans l'archive ne l'installe automatiquement.

Pour reconstruire ou exécuter depuis les sources :

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
- Package autonome `RunUAT BuildCookRun`, cible `ThreeBWorld`, Win64 Development, uniquement les deux cartes Hub/France, archive Pak + IoStore : `BUILD SUCCESSFUL`, code 0.
- L'exécutable autonome et le lanceur `ThreeBWorld.exe` à la racine passent chacun le même aller-retour, sans Unreal Editor.
- Le ZIP final a été extrait dans un second dossier puis son propre lanceur a été testé : code 0 et rapport `PASS` pour apparition, déplacement et interaction Hub → France → Hub. Cette preuve exécute les fichiers effectivement livrés dans l'archive.

Archive : **398 216 752 octets** (398,22 Mo), 44 fichiers. SHA-256 : `2CFFF5A6FF62079F42FF67DF1078870B3B010B6A2EEA7C1FF867EC715074FD9D`.

Le test se relance avec `Scripts\run_native_exploration.ps1 -Mode Test`. Il produit `Saved/Validation/native-exploration-runtime.json`. Le constructeur produit `Saved/Validation/native-exploration.json`.

## Portée exacte

Il s'agit d'une exploration native de la géométrie de prototype. Le personnage utilise une silhouette primitive explicitement indiquée dans le HUD. Le premier test utilise NullRHI ; le second prouve un rendu D3D12 réel sans fenêtre visible. Les captures montrent encore des cylindres à damier, des masses architecturales simples et des volumes proches du point d'arrivée. Elles ne constituent pas une validation artistique AAA, un benchmark GPU ou une validation des animations.

L'option `RenderOffScreen` est décrite dans la [référence officielle des arguments Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference).

La campagne, le combat, les PNJ animés, les huit royaumes jouables, les récompenses globales et le multijoueur ne sont pas terminés. Aucun XP, Fragment ou accomplissement de Gardien n'est accordé par ces portes. Le ZIP est un prototype Windows testé sur cette machine ; l'installateur commercial signé, les performances GPU et la compatibilité de tous les PC restent à valider. Ce résultat ne constitue pas une sortie AAA ou Gold Master.

Le lanceur historique de la racine ouvre un constructeur dans l'éditeur ; `run_native_exploration.ps1 -Mode Play` ouvre directement le jeu d'exploration.
