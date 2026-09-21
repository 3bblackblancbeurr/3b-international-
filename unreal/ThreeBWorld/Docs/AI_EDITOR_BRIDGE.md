# 3B Unreal Editor Bridge

Ce bridge est séparé du pont joueur `ThreeBWorldBridgeSubsystem`.

- **Pont joueur**: Passeport 3B -> ticket à usage unique -> session Unreal courte -> même `user_id`.
- **Pont éditeur**: automatisation de l'Unreal Editor uniquement pendant le développement.

## Plugins UE 5.8

Le projet active:

- Python Editor Script Plugin (`PythonScriptPlugin`);
- Editor Scripting Utilities;
- Remote Control API.

Ces outils sont destinés à l'éditeur. Le Remote Control d'Unreal est une fonctionnalité Beta et Python Editor Scripting est une fonctionnalité expérimentale.

## Démarrage local

Dans l'Unreal Editor:

1. ouvrir `unreal/ThreeBWorld/ThreeBWorld.uproject`;
2. redémarrer l'éditeur si Unreal le demande après activation des plugins;
3. ouvrir **Output Log**;
4. exécuter `WebControl.StartServer`.

Le serveur HTTP Remote Control utilise normalement `127.0.0.1:30010`.

Ensuite, depuis le dépôt:

```bash
npm run unreal:bridge:health
npm run unreal:bridge:actors
npm run unreal:bridge:snapshot
```

Le client v1 est **lecture seule**. Il sait vérifier l'API et lire la liste des acteurs du niveau. Il refuse tout hôte autre que localhost/127.0.0.1/::1.

## Sécurité

Ne jamais ouvrir le port 30010 sur Internet. Ne pas placer de clé API IA, clé Supabase secrète ou token utilisateur dans le Remote Control.

Les futures actions d'écriture devront être:

- explicitement listées;
- idéalement exposées via un Remote Control Preset ou des fonctions BlueprintCallable dédiées;
- journalisées;
- testables et réversibles;
- exécutées après validation, jamais directement à partir du texte brut d'un modèle IA.

## Étape suivante

Quand l'éditeur UE 5.8 sera ouvert sur la machine de développement, le test `unreal:bridge:snapshot` permettra de confirmer le premier lien réel entre le dépôt et l'éditeur. Ensuite on pourra ajouter des commandes autorisées comme validation de niveau, contrôle des Data Assets et lancement de tests d'automatisation.
