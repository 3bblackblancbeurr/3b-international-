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

Le contrôle automatique d'approbation a rejeté le push vers GitHub : le dépôt
`3bblackblancbeurr/3b-international-` est public et une autorisation explicite de
publication est requise. Aucun autre moyen de publication n'a été utilisé.
Le travail reste dans des commits locaux pour revue. La publication GitHub
nécessite cet accord ; elle ne vaut pas activation des paiements.

Avant de qualifier le jeu de version commerciale complète : terminer et
valider les actifs et cartes au niveau artistique attendu, compiler les cibles
natives retenues, tester les comptes et la coopération avec le moteur déployé,
valider les achats et leur restauration, et effectuer des sessions prolongées
sur téléphones physiques avec mesures de mémoire, chauffe, stabilité et
performances. Ces critères ne sont pas satisfaits par les seuls tests unitaires.
