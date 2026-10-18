# Monde 3B · préparation de publication du 18 octobre 2026

Ce relevé décrit une inspection en lecture seule. Aucun déploiement, aucune fusion
et aucun changement de forfait n'ont été effectués par cette préparation. Les
vérifications finales doivent porter sur le SHA exact contenant les derniers
changements de jeu, pas seulement sur le premier SHA de la PR.

## Cibles observées

| Service | Cible canonique | État observé |
| --- | --- | --- |
| GitHub | `3bblackblancbeurr/3b-international-`, PR 579 vers `main` | PR ouverte, base `ecae51bc5a34db5247718d5fb02c69dc3a1055de` |
| Supabase | projet `ttvhcezucsbbmnafrotq`, région `eu-west-1` | `world-engine` actif, version 34 du 10 octobre, 69 fichiers, JWT de passerelle activé |
| Vercel | `3b-international`, projet `prj_G7Nur5cM7Y51VWXh51WTMcPAGitR` | Production `dpl_B8TkcqEYAGuKXStcoqE8csGZc7JF`, READY |
| Site public | `https://3b-international.vercel.app` | `/version.json` confirme `buildId: ecae51bc5a34` |

La fonction `world-engine-goldmaster-candidate` existe aussi, en version 9 ; elle
n'est pas l'endpoint appelé par les sauvegardes publiques. Le client utilise
`/functions/v1/world-engine`.

Le connecteur Vercel a retrouvé le projet canonique en omettant `teamId`, avec le
bon `accountId` dans la réponse. Les appels explicitement limités à l'ancien
`team_pii0LCfZEGvY02L2a5LwIDER` ont renvoyé 403/404. Confirmer l'identifiant du
projet dans chaque réponse ; ne pas créer de projet de remplacement.

## Limite gratuite et contrôles CI

Au SHA `e73f2b58984542da7ea21a1f970525ab6de513aa`, le statut Vercel échoue avec
`api-deployments-free-per-day` : plus de 100 créations, nouvelle tentative demandée
après 24 heures. Aucun en-tête donnant une heure exacte de réouverture n'a été
obtenu. Ce refus est une limite de plateforme ; il ne démontre pas un défaut du
build. Les contrôles GitHub Actions étaient encore partiellement en cours au
relevé ; leur résultat final doit être vérifié avant publication.

Conserver le forfait actuel et limiter les créations. Attendre la réouverture
gratuite si nécessaire. Ne pas déclencher des redéploiements répétés ni choisir
une machine payante. La [documentation Vercel](https://vercel.com/docs/limits)
indique 100 créations quotidiennes pour Hobby. Un déploiement bloqué ne doit pas
être annoncé comme publié.

## Paquet serveur et compatibilité

`prepare-world-engine.mjs` parcourt les imports canoniques depuis `index.ts`.
Le relevé initial donne 70 fichiers : les changements par rapport à la version 34
concernent `realm-layout.js`, `motion.js`, `campaign-runtime.js`, et l'ajout de
`france-investigation.js`. Regénérer ce paquet après les derniers changements.

Les métadonnées SQL confirment la présence des trois tables de sauvegarde, de
`world_commit_v2`, `loyalty_session_valid`, `loyalty_rate`, et du traitement serveur
de la boîte de récompenses. Le périmètre inspecté n'exige pas de migration SQL.

Une comparaison locale avec les vrais modules de la version 34 a vérifié les six
premières actions France : conservation de la sauvegarde après normalisation,
rejeu idempotent des commandes terminées, et acceptation des anciennes positions
pour les commandes sans `layoutVersion`. Le nouveau client doit continuer à
soumettre sa version de disposition pour valider les nouveaux lieux strictement.
Les nouveaux parcours et leurs récompenses restent à valider au SHA final.

## Ordre de publication

1. Figer le SHA final, vérifier les contrôles de PR et les tests locaux de
   sauvegarde/rejeu, les parcours navigateur et le build. Vérifier à nouveau le
   SHA de la PR immédiatement avant la fusion.
2. Récupérer la fonction courante avec `supabase_get_edge_function`, en conservant
   **tous** les fichiers, l'entrée, la carte d'import et le réglage JWT hors du
   dépôt. Une copie complète de la version 34 a été préparée localement.
3. Regénérer le paquet avec `node scripts/prepare-world-engine.mjs <sortie-hors-dépôt>`.
   Déployer `world-engine` sur le projet canonique avec `entrypoint_path: index.ts`,
   `import_map_path: deno.json`, `verify_jwt: true`, et tous les fichiers générés.
   Relire ensuite la fonction distante pour vérifier version et parité des sources.
4. Vérifier CORS et refus anonyme sans créer de sauvegarde utilisateur. Vérifier la
   synchronisation et le rejeu uniquement avec une fixture ou un compte de test
   autorisé ; ne pas modifier de sauvegarde réelle pour obtenir un statut vert.
5. Fusionner le SHA validé de la PR vers `main` lorsque la publication Vercel peut
   aboutir. L'intégration existante déclenche le build de production. Éviter une
   création manuelle supplémentaire si ce build existe déjà.
6. Attendre READY et l'affectation du domaine public. Vérifier `/version.json`,
   l'ouverture du monde, une inspection locale et la reprise de sauvegarde. Un
   aperçu READY ne prouve pas que le domaine public a changé.

Si un build de production est volontairement préparé sans affectation de domaine,
le tester puis promouvoir cet identifiant avec `vercel_request_promote`. La
[documentation officielle](https://vercel.com/docs/deployments/promoting-a-deployment)
distingue cette promotion sans rebuild de la promotion d'un aperçu avec rebuild et
variables de production. Le schéma du connecteur de création inspecté n'expose pas
le drapeau CLI `--skip-domain` ; ne pas inventer ce champ dans une requête.

## Retour arrière

Conserver l'identifiant de production précédent et le paquet complet de la
fonction précédente. En cas d'échec du nouveau client, réaffecter d'abord le domaine
au déploiement précédent, puis restaurer la fonction précédente si nécessaire.
Ne pas effacer les tables, les reçus de commandes ou les soldes. La version des
sauvegardes reste 1. Recontrôler les anciennes données avant de restaurer un moteur
qui ne reconnaîtrait pas de nouveaux champs. Vercel précise qu'un rollback peut
désactiver l'affectation automatique jusqu'à une promotion ultérieure.
