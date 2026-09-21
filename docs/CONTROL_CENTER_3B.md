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
5. démarrer l'agent avec `npm run control:agent` ou `scripts/start-3b-control-agent.cmd`.

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
