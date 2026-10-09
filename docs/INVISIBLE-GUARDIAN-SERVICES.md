# Gardien et huit échos — contrat de service

La route unique `invisible-guardian` propose `dialog`, `cooperationSnapshot` et `contribute`. Elle exige un compte connecté non anonyme, un jeton validé par Supabase Auth et une session encore présente via `loyalty_session_valid`. Le dialogue exige un Passeport actif avant et après la réponse fournisseur. Les RPC collectives contrôlent elles-mêmes session, Passeport actif et état serveur.

## Dialogue

POST JSON `{action:"dialog",message:"Un indice ?",history:[]}`. Réponse `{source:"ai"|"narrative",guardian:"Céliane",text:"…"}`. Un message a au plus 800 caractères ; l’historique est limité à trois échanges alternés, 4 000 caractères au total avec le message courant et 16 KiB pour le corps. Aucun paramètre de progression, d’identité ou de contexte client n’est admis.

Le serveur lit `member_world_state.data.invisible`, le normalise avec le même modèle canonique que le moteur du Monde, puis transmet seulement la progression utile et les résumés d’événements canoniques consentis. Aucune identité du Passeport, coordonnée, sauvegarde complète ou autre champ privé n’est transmis au fournisseur. Le Gardien n’a aucun outil ni accès à la validation ou aux récompenses.

Les limites durables SQL sont de 6 messages/minute/session, 12/minute/compte, 60/jour/compte. Les requêtes IA réelles partagent en plus un plafond de 100/jour pour le service. Ce sont des fenêtres fixes réinitialisées après expiration. La configuration existante `AI_ENABLED=true`, `OPENAI_API_KEY` et `OPENAI_CHAT_MODEL` est lue uniquement côté serveur. Aucun secret n’est créé par ce module. Sans configuration IA utilisable ou en cas d’échec du fournisseur, `source:"narrative"` désigne explicitement le récit local sans IA.

Le service ne stocke aucun message, aucun historique ni réponse fournisseur. Le navigateur conserve les trois derniers échanges uniquement en mémoire dans le composant ; un départ, une déconnexion ou un changement de compte les efface. Le consentement `memoryConsent` conserve seulement les résumés canoniques des événements futurs de l’aventure, via les actions du moteur ; « Effacer les souvenirs » retire ces résumés sans modifier la progression. Il n’active jamais un archivage de conversations.

La requête Responses utilise `store:false`, aucun identifiant de conversation, et aucun outil. Cela désactive le stockage de l’état applicatif Responses ; cela ne promet pas l’absence de toute conservation technique par le fournisseur. Voir la [documentation officielle Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) et les [règles de conservation des données](https://developers.openai.com/api/docs/guides/your-data).

## Coopération réelle

Migration : `supabase/migrations/20261009132008_invisible_eight_echoes.sql`. Les tables et les RPC ne sont accessibles qu’au rôle serveur. L’interface consulte seulement un agrégat : `realms:[{realm,contributors}]`, `covered`, `required:8`, `awakened`, `contributors`, `contributedRealm` du compte courant et `eligible`.

`invisible_echo_contribute(p_user,p_session,p_realm)` verrouille et relit l’état serveur. Il exige `started:true`, les trois énigmes dans l’ordre canonique, `chestOpened:true` et un Passeport actif. `p_realm` est une affinité explicitement choisie parmi les huit royaumes ; sa valeur par défaut correspond au pays du Passeport. Ce choix ne constitue jamais une géolocalisation ni une preuve de résidence.

La clé primaire est `user_id` : un compte contribue une seule fois à toute la mission, peut rejouer le même envoi sans doubler les compteurs et ne peut ensuite choisir une autre affinité. La résonance collective existe quand au moins un compte a choisi chacune des huit affinités : il faut donc au moins huit comptes. Aucun compteur simulé, personnage connecté inventé, identité publique, chat collectif ou position n’est exposé. Cette mission donne un état collectif réel ; elle ne crée pas de nouvelle récompense mondiale. L’effacement d’un compte supprime sa contribution et les agrégats sont recalculés.

## Construction et validation

`node scripts/prepare-invisible-guardian.mjs <payload.json>` crée un paquet de déploiement autonome avec les sources canoniques nécessaires et `deno.json`. Déployer ce paquet comme `invisible-guardian`, point d’entrée `index.ts`. Les imports vers `src/world` du fichier source sont réécrits vers les fichiers embarqués ; ne pas envoyer uniquement les trois fichiers du dossier source. La copie locale de `guardian-story.js` et celle du client doivent rester identiques ; le script utilise toujours le fichier canonique client.

`node --test tests/invisible-guardian.test.js tests/invisible-cooperation-database.test.js` vérifie le contrat avec un fournisseur simulé et la migration réelle dans PostgreSQL PGlite : session révoquée, Passeport absent/suspendu, limites, injection de contexte, résultats fournisseur non sûrs, absence de conversations stockées, contrôles SQL, rejouage, impossibilité de remplir huit affinités avec un compte et interdiction des accès directs client. Aucun appel fournisseur payant n’est utilisé par les tests.

Le fonctionnement d’un modèle IA réellement configuré et la coopération entre comptes distants nécessitent un contrôle après déploiement. Les animations de portail et le mode promenade de l’interface ne sont pas une expérience de réalité augmentée géolocalisée.
