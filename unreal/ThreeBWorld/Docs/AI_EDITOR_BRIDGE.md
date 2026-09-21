# 3B Unreal Editor Bridge

Ce pont concerne uniquement l'éditeur Unreal pendant le développement. Il est distinct du pont joueur Passeport -> ticket à usage unique -> session Unreal.

Le projet active `PythonScriptPlugin`, `EditorScriptingUtilities` et `RemoteControl`.

Dans l'Unreal Editor 5.8, lancer le serveur Remote Control depuis l'Output Log:

```
WebControl.StartServer
```

Puis, depuis le dépôt:

```
npm run unreal:bridge:health
npm run unreal:bridge:actors
npm run unreal:bridge:snapshot
```

Le client v1 est volontairement en lecture seule et refuse tout hôte autre que localhost / 127.0.0.1 / ::1.

Ne jamais exposer le port Remote Control sur Internet et ne jamais y transmettre une clé IA, une clé Supabase secrète ou un token utilisateur. Les futures commandes d'écriture devront être explicitement autorisées, journalisées, testables et réversibles.
