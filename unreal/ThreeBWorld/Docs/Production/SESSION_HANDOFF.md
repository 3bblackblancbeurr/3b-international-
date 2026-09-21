# Session Application 3B → Unreal

## Règle absolue

Ne jamais transmettre dans une URL :
- access token Supabase ;
- refresh token ;
- clé secrète ;
- service_role ;
- mot de passe.

Les URLs peuvent apparaître dans historiques, logs, analytics ou captures.

## Vertical slice — option retenue

Pour la première version Unreal, le jeu doit établir/recevoir une session utilisateur de façon explicite et appeler ensuite les Edge Functions avec :
- clé publique/publishable ;
- JWT utilisateur dans le header Authorization.

Le backend dérive toujours `user_id` de la session.

## Si l'app 3B et Unreal sont deux processus

Préparer ultérieurement un **handoff à usage unique** :

1. App authentifiée demande un handoff au backend.
2. Backend génère un identifiant opaque aléatoire, durée très courte, usage unique.
3. L'app ouvre Unreal avec uniquement cet identifiant opaque.
4. Unreal le présente au backend.
5. Backend le consomme une seule fois et établit le contexte autorisé.
6. Le handoff expiré ou déjà consommé est rejeté.

Le handoff ne doit jamais être un JWT Supabase brut dans l'URL.

## Changement de compte

À chaque changement de compte :
- vider identité Unreal précédente ;
- vider état bootstrap précédent ;
- annuler les requêtes réseau de l'ancien compte si possible ;
- recharger bootstrap ;
- vérifier `passport.user_id == session.user_id`.

## Déconnexion

Le Monde doit revenir à un état sans compte ou fermer la session de jeu. Une sauvegarde d'un ancien compte ne doit jamais être présentée comme celle du nouveau.
