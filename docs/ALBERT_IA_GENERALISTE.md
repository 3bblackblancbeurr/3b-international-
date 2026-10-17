# Albert — IA généraliste authentifiée

État vérifié le 18 octobre 2026, après déploiement des fonctions existantes.

## Résultat et disponibilité réelle

Le backend Albert généraliste et multi-tours est implémenté, testé et déployé sur le projet Supabase existant `ttvhcezucsbbmnafrotq`. Il réutilise les adaptateurs OpenAI, Claude et Gemini du Trio IA, les comptes membres et les quotas existants. Aucune treizième fonction Vercel n’a été ajoutée.

La vérification distante renvoie cependant `albert.configured: false`, `albert.reason: "disabled"`, `providers: []`. Le drapeau serveur `AI_ENABLED` n’est donc pas activé à la valeur attendue. Ce résultat ne permet pas de savoir si les clés et modèles sont présents : leurs valeurs n’ont pas été consultées. Aucun appel à un fournisseur IA n’a été effectué lors de la recette distante ; aucune réponse de modèle réel n’est présentée comme validée.

L’activation n’a pas pu être effectuée avec les accès de gestion disponibles : le connecteur Supabase ne fournit pas d’outil de liste/définition des secrets, aucune connexion CLI locale n’est disponible et le Dashboard demande une connexion. Aucun nom de secret distant n’a donc été confirmé par une liste de métadonnées. L’écran de connexion du projet a été laissé accessible dans le navigateur ; aucun identifiant n’a été saisi et aucun secret n’a été révélé. Le drapeau n’a pas été contourné et aucun détail de présence des secrets n’a été ajouté au service public pour ce diagnostic.

Fonctions publiées et relues depuis Supabase :

- `ecosystem-private`, version 7, vérification JWT conservée ; authentification et contrôle de session restent obligatoires dans la fonction.
- `ecosystem-public`, version 9, lecture publique GET seule ; accès aux conversations refusé.

Les sources déployées correspondent aux fichiers testés. Les routes de jeux `games` et `game-health`, présentes dans la version distante mais absentes de la copie locale initiale, ont été conservées. Les règles d’origine existantes n’ont pas été élargies.

## Contrat pour l’interface

Utiliser le client membre existant :

```js
const status = await ecosystemPublic('capabilities');
const result = await ecosystem('chat-ai', {
  mode: 'albert',
  messages: [
    { role: 'user', content: 'Explique le fonctionnement d’une blockchain.' },
    { role: 'assistant', content: 'Réponse précédente réellement reçue.' },
    { role: 'user', content: 'Et sa différence avec une banque ?' }
  ]
});
```

L’interface doit attendre `status.albert.configured === true` pour annoncer que la configuration est prête. Ce statut vérifie la configuration serveur ; il ne garantit ni disponibilité, ni crédit, ni accès au modèle chez le fournisseur. Une erreur d’appel reste une erreur explicite. Le guide 3B local peut rester accessible avec son propre libellé ; il ne doit pas être présenté comme la réponse d’une IA distante.

L’historique accepte 1 à 11 messages, alternant strictement `user` et `assistant`, avec un dernier message `user`. Chaque message est borné à 4 000 caractères, le total à 20 000. Les rôles système et les champs supplémentaires de contexte, outils, commandes ou identité sont refusés. Les réponses longues de l’historique doivent être raccourcies par l’interface avant une nouvelle requête.

La réponse JSON conserve les champs du Trio :

```text
answer        texte réellement reçu d’un fournisseur
contributors  fournisseurs ayant fourni une proposition exploitable
synthesized   indique si une synthèse entre fournisseurs a abouti
partial       indique l’échec d’au moins un fournisseur configuré
mode          "albert" (ou "trio" pour les appels existants)
usage         { memberDailyLimit: 20, sharedDailyLimit: 100, windowSeconds: 86400 }
```

`usage` décrit les limites ; il ne prétend pas compter les jetons ou les demandes restantes. Le mode absent conserve le comportement créatif du Trio. Un mode inconnu est refusé.

Statuts attendus : `400` historique/mode/contexte invalide ; `401` connexion ou session invalide ; `403` origine interdite ; `413` corps trop volumineux ; `415` format incorrect ; `429` quota atteint ; `503` configuration désactivée ou fournisseur indisponible. Aucune erreur fournisseur n’est remplacée par une fausse réponse réussie.

## Sécurité, quotas et périmètre

La route existante vérifie le jeton avec Supabase Auth puis la session avec `loyalty_session_valid`. Albert ne passe pas par les commandes du propriétaire et ne reçoit aucun accès aux emails, fichiers privés, appareils, paiements ou portefeuilles. URLs fournisseurs, modèles et instructions sont contrôlés côté serveur.

Albert et le Trio partagent exactement les clés RPC `ecosystem:ai-chat:<membre>` et `ecosystem:ai-chat:global` : 20 tentatives par membre et 100 tentatives communes sur une période de 86 400 secondes démarrant au premier appel. Changer de mode n’accorde pas de quota supplémentaire. Une tentative admise peut consommer le quota même si le fournisseur échoue ensuite. Le SQL versionné de `loyalty_rate` utilise un `INSERT ... ON CONFLICT ... DO UPDATE` pour incrémenter atomiquement ; aucune migration SQL n’a été effectuée dans ce lot.

Chaque question consulte les fournisseurs déjà configurés, puis peut demander une synthèse au premier fournisseur disponible : de 1 à 4 appels par question selon la configuration. Les plafonds existants sont conservés, avec 1 600 jetons de sortie maximum par appel, 35 secondes par appel et une réponse fournisseur bornée en taille. Les appels futurs pourront utiliser le crédit existant des fournisseurs après activation ; aucune gratuité n’est promise.

Le prompt Albert couvre compréhension, rédaction, apprentissage, programmation, budgets et crypto. Il demande des calculs et hypothèses explicites, sans promesse de rendement, décision d’investissement personnalisée ou validation juridique. Sans outil web, il doit signaler les données actuelles à vérifier et ne pas inventer de cours ou de sources. Il ne peut ni créer une banque, ni émettre un token, ni déplacer des fonds.

Le backend ne crée pas d’historique durable de conversation. L’historique soumis est envoyé aux fournisseurs configurés pour répondre. OpenAI utilise `store: false` et un historique transmis explicitement ; cela ne signifie pas une absence générale de conservation ou de journaux chez les fournisseurs. Les politiques et réglages de leurs comptes restent applicables. Aucune clé, phrase de récupération ou autre secret ne doit figurer dans la conversation.

La voix prévue côté interface utilise la dictée du navigateur pour produire du texte et le même contrat multi-tours. Ce lot ne déploie aucun service audio ou Realtime distinct.

## Activation et validations restantes

Réutiliser les paramètres déjà présents du projet, sans créer de clé :

| Rôle | Noms des paramètres serveur |
| --- | --- |
| Activation commune | `AI_ENABLED` |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` |
| Claude | `ANTHROPIC_API_KEY`, `ANTHROPIC_CHAT_MODEL` |
| Gemini | `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL` |

1. Vérifier dans la configuration serveur du projet que le drapeau d’activation autorise l’IA et qu’au moins une paire clé/modèle existante est complète. Ne pas modifier les secrets de session, les origines ou les permissions du propriétaire.
2. Relire `capabilities`. Si le motif devient `provider_missing`, la configuration existante ne suffit pas ; ne pas inventer de modèle et ne pas créer de nouvelle clé sans décision explicite.
3. Avec un compte membre actif, envoyer une question neutre, puis une relance faisant référence à la réponse ; vérifier réponse réelle, historique et fournisseurs annoncés.
4. Vérifier une panne fournisseur, une session révoquée et un quota atteint dans un environnement de recette sans charge payante inutile.
5. Faire relire les réponses finance/crypto, vérifier les hypothèses et éviter toute annonce de fonds réels ou de banque opérationnelle.

## Recette effectuée

Les 14 tests du backend Albert couvrent requêtes réelles simulées aux trois API, historique, persona généraliste, compatibilité Trio, configuration manquante, refus de rôle/contexte injecté, erreurs et réponses vides, synthèse partielle, taille maximale et refus explicite du modèle. Ils exécutent également la frontière HTTP privée avec Auth et RPC simulés : invité, session révoquée, origine interdite, quota et réponse authentifiée. Une rafale de 24 requêtes alternant Trio/Albert autorise 20 demandes et refuse les 4 suivantes via le même quota simulé atomique.

Commandes exécutées avec succès :

```sh
node --test tests/albert-generalist-backend.test.js tests/edge-boundary-split.test.js tests/mobile-refinement.test.js
node --test tests/ecosystem.test.js tests/invisible-guardian.test.js tests/command-integrations-v4.test.js
```

Total : 51 tests réussis. La recette distante en lecture confirme `capabilities` 200, invité privé 401, POST public 405, origine hostile 403 et catalogue jeux 200. Elle ne remplace pas une recette IA authentifiée après activation du fournisseur.

## Sources officielles consultées

- [OpenAI — Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) : historique multi-tours transmis dans les entrées de l’API Responses.
- [OpenAI — Migrate to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) : format Responses et contrôle `store`.
- [OpenAI — Data controls](https://developers.openai.com/api/docs/guides/your-data) : distinction entre stockage des réponses et autres règles de conservation.
- [Claude — Create a Message](https://platform.claude.com/docs/en/api/messages/create) : historique, instruction système et limite de sortie.
- [Gemini — Generate content](https://ai.google.dev/api/generate-content) : historique `contents` et `systemInstruction`.

Le choix utilisateur « Réutiliser l’accès IA existant du projet » a résolu le préalable de la compétence OpenAI Platform API Key. Aucune nouvelle clé n’a été créée et aucun secret n’a été écrit localement. La documentation officielle a été recherchée et ouverte avant l’implémentation.
