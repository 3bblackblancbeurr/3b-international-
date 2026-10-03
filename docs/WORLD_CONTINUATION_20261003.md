# Reprise du Monde du 3B — 3 octobre 2026

## État de livraison

Cette branche est une reprise intégrée et testée du jeu web. Elle ne constitue
pas une certification AAA/AAAA, une livraison native Unreal ou une activation
des paiements réels. Aucun déploiement de production n'a été effectué pendant
cette reprise.

Base : `main` au commit `3f3647f08fb70dd227fbb343817d27c9deb5f40a`
(PR 409), avec récupération du travail de la PR 399,
`codex/monde-3b-open-world`, au commit
`c89f5b1f176d9a33fbd8cf4dd2a617487fc3f2c3`.
Branche locale : `codex/world-continuation-20261003`.

## Travail intégré

- Reprise de l'exploration à la position et à l'orientation sauvegardées ;
  capture périodique et aux pauses, contrôle de la région, recherche d'un
  emplacement libre si le décor a changé.
- Journal de campagne avec objectifs concrets des huit pays et du final.
- Tournoi optionnel français à trois manches, progression par actions de
  combat, reprise après rechargement, abandon et récompense unique bornée.
- Conservation de la nouvelle plateforme, des services, des missions,
  de la vie du quartier et des habitants présents sur `main`.
- Combat final replacé sur la promenade du Nexus : même ancre et mêmes
  obstacles dans le rendu et dans le moteur serveur. Les anciennes rencontres
  sont translatées une seule fois, sans réinitialiser santé ou maîtrise.
- Limite de sauvegarde et de simulation du final alignée sur le rayon de
  marche du Nexus agrandi ; les pays gardent leur limite précédente.
- Mini-carte et atlas du Nexus raccordés au plan physique actuel : huit portes,
  promenade, cinq bassins, emprises des bâtiments. Les cartes des pays
  conservent leur terrain existant.
- Objectifs, ressources et accès à la vie du quartier disposés dans une même
  pile pour éviter leur superposition sur écran paysage. Nom des habitants
  affiché à la place de l'identifiant interne ; phases du jour traduites.
- Générateur du paquet serveur parcourant les imports depuis le véritable
  point d'entrée, y compris les imports relatifs parents et les dépendances
  des récompenses. Le candidat local contient 54 fichiers.
- Actifs et prototype Unreal récupérés depuis la branche interrompue ; ils
  n'ont pas été compilés ni validés visuellement dans Unreal ici.

## Vérifications exécutées

| Vérification | Résultat et portée |
| --- | --- |
| `npm test` après les corrections carte et interface | 1 573 réussis, 0 échec, 1 ignoré sur 1 574 ; le test Swift nécessite un compilateur macOS absent ici. |
| Dernière correction de limite du final | 26 tests ciblés réussis : combat, migration, sauvegarde, cartes et paquet serveur, après cette correction. |
| Build Vite | Réussi ; avertissements existants de taille des chunks, aucune mesure de performance sur téléphone réel. |
| Parcours navigateur ordinateur | Nexus, journal et reprise d'exploration réussis dans un environnement de test invité isolé. |
| Parcours navigateur tactile 844 × 390 | Tournoi : entrée, première manche, pause, rechargement, reprise puis abandon sans XP indu réussis. |
| Rotation 390 × 844 vers 844 × 390 | Consigne de rotation, reprise paysage, journal et conservation du checkpoint vérifiés. |
| Endpoint serveur empaqueté | Imports isolés et barrières HTTP vérifiés (204 OPTIONS, 405 méthode, 403 origine, 401 authentification). Aucun compte réel utilisé. |

La suite du moteur inclut la traversée des huit pays avec combats par entrées
réelles du simulateur et récompenses attribuées une seule fois. Cela ne remplace
pas une campagne complète jouée manuellement sur appareils.

Le script reproductible `scripts/verify-world-continuation-browser.mjs` monte
temporairement le composant invité avec les fournisseurs React requis. Il
bloque les appels Supabase et supprime sa page temporaire à la fin. Il ne
contourne pas le Passport de l'application de production. Le navigateur utilisé
ici est Chromium avec rendu logiciel ; ses durées ne sont pas une mesure du
framerate mobile. `WORLD_TEST_CASE` permet de rejouer un parcours précis.

## Revue des exceptions visuelles

Les exceptions `gold-master-allow` ajoutées aux lignes existantes de
`Cartography.jsx` conservent exactement leur palette SVG et leurs contrôles.
Seules la source de la géométrie et la représentation de plusieurs bassins
changent. Elles sont nécessaires parce que ces composants préexistants occupent
une seule ligne et que le contrôle analyse les lignes ajoutées entières.
L'exception du panneau de pause dans `WorldPage.jsx` conserve ses contrôles et
options existants avec la capture de checkpoint. Les nouveaux boutons du
journal, du tournoi et de la pile d'objectifs utilisent le composant partagé.
Les exceptions héritées de la PR 399 restent documentées dans son audit daté.

## Paiements et services : constats en lecture seule

- Le catalogue Supabase `world` contient cinq produits en état `test`, cinq
  identifiants de prix Stripe, aucun identifiant Google et aucun identifiant
  Apple au moment de la vérification.
- Un compte Stripe en mode réel est accessible. Son existence ne valide pas
  l'activation des encaissements, les webhooks, les prix ou une transaction.
- Le serveur conserve ses contrôles d'approbation du mode réel, de prix,
  de devise, de reçu et de webhook. Aucun produit n'a été activé, aucun achat
  effectué, aucun paramètre financier modifié.
- Le moteur Supabase en production était `world-engine` version 26 (48 fichiers),
  avec vérification JWT. Le candidat de cette branche n'a pas été déployé.
- Les achats natifs restent à implémenter et à vérifier dans les environnements
  Apple/Google appropriés. Les vérifications invitées ne prouvent pas la
  synchronisation de comptes réels ou le multijoueur de production.

## Publication et critères restant ouverts

Le contrôle automatique a d'abord rejeté la publication sur le dépôt public.
Le propriétaire a ensuite explicitement autorisé cette publication le 3 octobre.
La connexion GitHub a permis de publier le contenu testé dans la PR 411 ; son
arbre Git est identique à celui vérifié localement. Le push Git direct n'avait
pas d'identifiants dans cet environnement. Cette autorisation de publication
ne vaut pas activation des paiements.

Avant de qualifier le jeu de version commerciale complète : terminer et
valider les actifs et cartes au niveau artistique attendu, compiler les cibles
natives retenues, tester les comptes et la coopération avec le moteur déployé,
valider les achats et leur restauration, et effectuer des sessions prolongées
sur téléphones physiques avec mesures de mémoire, chauffe, stabilité et
performances. Ces critères ne sont pas satisfaits par les seuls tests unitaires.

## Suite après autorisation — sauvegarde et confort visuel

La PR 410 de `main` a été intégrée sans conflit pour conserver le paysage et les
constructions de Crée ma Ville, qui garde sa progression indépendante.

Les réponses de sauvegarde doivent maintenant contenir un état et un numéro
d'acquittement cohérents avant de retirer des commandes du journal. Une réponse
HTTP 200 vide ou trop ancienne conserve les commandes et provoque un message
de reprise, sans boucle de synchronisation sans fin. La copie locale est écrite
avant la purge des commandes acquittées. Les lectures de compte et écritures
utilisent la même file afin de ne pas écraser une action reçue pendant un
rafraîchissement. Une copie de migration facultative échouée ne bloque plus
la récupération du compte. Le retour du réseau déclenche une synchronisation.

En mode invité, une action qui ne peut pas être enregistrée faute d'espace est
refusée explicitement. Pour un compte, le journal reste la source des commandes
à renvoyer ; la récupération distante demeure nécessaire si la copie locale
n'a pas pu être actualisée.

Le confort visuel propose une luminosité de 80 à 150 % et une aide à la lecture
des ombres, active par défaut. Elle relève les lumières indirectes la nuit sans
changer l'heure, la météo, les missions, la difficulté ou les récompenses.
Les deux options sont conservées localement et appliquées immédiatement.
Le panneau clavier utilisait une classe prévue pour des commandes positionnées
sur le jeu ; sa classe est désormais distincte pour empêcher le recouvrement
des autres options. Les boutons préexistants du panneau restent inchangés.
La marche libre utilise également le rayon de la plateforme actuelle : le
joueur ne peut plus avancer sur le vide de l'ancien terrain. Un checkpoint
sur le bord est replacé de quelques mètres vers l'intérieur à la reprise.

Validation de cette suite :

- Six scénarios de sauvegarde : reçu incomplet/ancien, réponse perdue après
  commit serveur, quota sur la copie locale, quota sur le journal, invité sans
  stockage, rafraîchissement concurrent. Le test multi-onglets existant passe.
- Trois tests de préférences : éclairage dans les neuf régions, bornes et
  indépendance du gameplay, conservation et stockage indisponible.
- `npm run verify` : 1 593 réussis, zéro échec, un test Swift ignoré ; build
  réussi. Le sélecteur du panneau clavier est revalidé après son renommage.
- Navigateur tactile : rotation, journal, réglage réel des contrôles,
  conservation après rechargement, perte WebGL simulée, écran de récupération
  et reprise du checkpoint réussis. Aucun contournement de clic n'est utilisé.
  Un déplacement clavier réel depuis le bord confirme la limite du Nexus.
- Le workflow `Verify World browser journeys` reproduit les parcours sur les
  modifications du monde et conserve captures et rapport comme artefacts CI.
- Les huit workflows GitHub de la première publication sont verts, dont les
  builds mobiles de test ; ce constat ne certifie pas les commits suivants ni
  des essais sur appareil physique.

Les paiements, les cibles Unreal et la qualification commerciale restent ouverts
selon les critères ci-dessus. Aucun achat réel n'a été simulé comme réussi.

Le moteur de validation `world-engine-goldmaster-candidate` a ensuite été
déployé en version 8 avec JWT obligatoire. Ses 54 fichiers relus sur Supabase
correspondent exactement au paquet testé. Le précontrôle OPTIONS répond 204
avec l'origine attendue ; POST sans authentification répond 401. Le moteur
de production `world-engine` reste en version 26. Il reste à valider un parcours
connecté avant de remplacer ce moteur de production.

Le premier workflow navigateur a validé ordinateur et rotation complète mais
a dépassé les 30 secondes de navigation au rechargement du tournoi, sans erreur
JavaScript. Les parcours indépendants utilisent maintenant chacun un processus
navigateur neuf et une limite de navigation de 120 secondes cohérente avec le
chargement WebGL logiciel. Les assertions du tournoi restent toutes actives.
Ce délai technique ne constitue pas un objectif acceptable de performance mobile.
