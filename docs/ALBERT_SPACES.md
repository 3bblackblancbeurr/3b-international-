# Albert — espaces composables

## Ce que cette version ajoute

- Espaces nommés, renommables et supprimables avec annulation : 8 espaces, 16 panneaux par espace.
- Notes, priorités, planning, budgets manuels et références documentaires par lien.
- Grille 12 colonnes, largeur 3–12, hauteur 200–800 px, déplacement, duplication, isolation, panneau détaché dans une fenêtre modale accessible. Le détachement n'ouvre pas une fenêtre du système d'exploitation.
- Une collection de tâches par espace : les vues planning et priorités partagent réellement leurs échéances.
- Composition locale immédiate : « espace marque », « espace semaine », « espace recherche », « ajoute un budget », « ajoute une tâche : Préparer le lancement ».
- Propositions IA validées côté serveur et client : création d'espace, ajout de panneau, changement de largeur, ajout de tâche, plus les commandes d'interface précédentes.
- Réponse progressive via SSE. Les actions ne sont appliquées qu'après réception et validation de la réponse complète. Interruption et déconnexion annulent la demande côté client.
- Mémoire limitée aux 12 derniers messages, activable/désactivable. Seul l'espace actif est envoyé à l'IA, hors mode privé.
- Sauvegarde locale séparée par compte, synchronisation serveur manuelle avec contrôle de révision ; un conflit ne remplace pas silencieusement une version distante.
- Avatar 3D procédural stylisé, tête et bras articulés, regard, clignements, états écoute/réponse. La bouche suit un mouvement stylisé pendant la synthèse vocale, pas un alignement phonétique.
- Caméra cinématique, transitions de déplacement des panneaux, mouvements réduits, rendu plafonné autour de 30 images/s et suspendu hors écran. Portrait de secours si WebGL ne fonctionne pas.
- Dictée navigateur déclenchée par l'utilisateur et lecture vocale interruptible. La transcription doit être envoyée explicitement ; aucune capture automatique.

## Données et configuration

La migration `20260927160710_albert_spaces.sql` crée `albert_workspaces` et une fonction de sauvegarde atomique. RLS est activée, sans accès direct pour `anon` ou `authenticated`. L'API existante vérifie la session et le propriétaire avant d'utiliser le rôle de service. Aucun privilège de compte n'est modifié.

Les variables existantes `OPENAI_API_KEY` et `COMMAND_AI_MODEL` sont nécessaires pour l'IA réelle. Aucune clé n'est exposée au navigateur. Responses utilise `store:false`. Ceci ne constitue pas une promesse de rétention zéro chez le fournisseur. La dictée peut être traitée par le fournisseur du navigateur ; compatibilité et autorisation du microphone sont nécessaires.

Le mode privé ne transmet ni espace ni historique, mais une demande volontairement envoyée est toujours transmise. Les derniers échanges restent sur cet appareil et dans la sauvegarde serveur si l'utilisateur l'a déclenchée. Effacer la conversation locale vide également les piles d'annulation locales ; il faut ensuite sauvegarder en ligne pour actualiser la copie distante. Les autres appareils conservent leurs anciennes copies jusqu'à leur actualisation.

## Vérification reproductible

```sh
node --test tests/albert.test.js tests/albert-spaces.test.js tests/command-integrations-v4.test.js tests/supabase-migration-integrity.test.js
npm run verify
```

Les tests ciblés vérifient les limites et actions autorisées, l'absence de mutations partielles, les flux fragmentés et interrompus, les contrôles propriétaire, le refus des identifiants utilisateur fournis par le client et les conflits de révision. La migration est exécutée dans PGlite pour tester son comportement et ses privilèges.

Ces tests ne remplacent pas une recette navigateur authentifiée, des mesures de fluidité sur appareils réels ou un appel au modèle de production. Ces validations requièrent une session du compte propriétaire accepté par le serveur.

## Limites conservées explicitement

Ce n'est pas un générateur illimité d'applications. Les budgets ne sont pas connectés aux banques ; les liens documentaires ne sont ni téléchargés ni lus automatiquement. L'IA ne peut pas remplir librement tous les champs, créer du code arbitraire, commander un terminal, acheter, envoyer des messages ou changer des permissions. La synchronisation n'est pas collaborative en temps réel. La voix n'est pas une conversation temps réel duplex. Le personnage 3D est stylisé, pas une reproduction photoréaliste du concept.

Les notes et le minuteur du bureau précédent restent disponibles pour préserver les données existantes.

## Références

- https://developers.openai.com/api/docs/guides/streaming-responses
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
