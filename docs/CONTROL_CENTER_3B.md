# Centre de commande 3B

Le Centre de commande relie l'application 3B du propriétaire à un agent local visible sur son PC.

## Architecture

Application 3B (PC ou téléphone) -> `control-center` (JWT propriétaire) -> file de commandes Supabase -> `control-center-agent` (jeton appareil) -> agent local PC.

Le Centre de commande n'est pas un outil de terminal distant. Les commandes sont définies dans une liste fixe côté base, côté Edge Function et côté agent.

## Appairage

1. se connecter dans l'application 3B avec le compte propriétaire et un e-mail confirmé;
2. ouvrir **Centre de commande 3B**;
3. choisir **Appairer un PC**;
4. sur le PC, dans le dépôt, lancer `npm run control:pair -- CODE "Mon PC"`;
5. démarrer l'agent avec `npm run control:agent` ou `scripts/start-3b-control-agent.cmd`;
6. une fois la liaison validée, activer le démarrage automatique avec `npm run control:auto-start` ou `scripts/install-3b-control-autostart.cmd`.

Le code d'appairage est temporaire. Le secret d'appareil est généré une seule fois, stocké localement et conservé dans Supabase uniquement sous forme SHA-256.

## Commandes v1

- état système;
- ping;
- ouvrir l'application 3B;
- ouvrir le dépôt 3B;
- ouvrir le projet Unreal;
- vérifier le Remote Control Unreal local;
- ouvrir GitHub;
- ouvrir le tableau de bord Supabase.

Aucune commande arbitraire, suppression de fichier, téléchargement/exécution de programme, saisie clavier, capture écran ou terminal distant n'est disponible dans v1.

## Sécurité

- propriétaire vérifié par JWT Supabase + session active + e-mail confirmé;
- tables service-only avec RLS;
- appareils révocables;
- commandes expirant rapidement;
- résultats et événements journalisés;
- agent lancé explicitement et visible;
- port Unreal Remote Control conservé sur localhost.


## Démarrage automatique Windows

Le mode automatique reste au niveau de l'utilisateur Windows : aucun droit administrateur n'est requis et aucun service système n'est créé.

`npm run control:auto-start` :

- vérifie que le PC a déjà été appairé;
- installe un lanceur invisible dans le dossier Démarrage de la session Windows;
- conserve le secret appareil uniquement dans `%LOCALAPPDATA%\3BControl\device.json`;
- démarre l'agent sans fenêtre supplémentaire;
- publie `autostart=true` au Command OS dès que l'agent 1.2 est actif.

Commandes locales :

- `npm run control:auto-status` : état de l'installation;
- `npm run control:auto-remove` : retire uniquement le démarrage automatique;
- `npm run control:status` : état local de l'agent, version, mémoire et chemin du journal.

L'agent 1.2 ajoute aussi un verrou anti-doublon, un journal local rotatif et un backoff réseau jusqu'à 30 secondes. Une coupure Internet ne l'arrête donc plus : il continue d'essayer de se reconnecter.

Le fichier de journal local se trouve dans `%LOCALAPPDATA%\3BControl\agent.log`.
