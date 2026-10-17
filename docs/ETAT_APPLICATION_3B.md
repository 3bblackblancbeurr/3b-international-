# État de l’application 3B — 17 octobre 2026

Ce relevé décrit le code de la copie de travail locale et les contrôles exécutés pendant cette intervention. Les documents plus anciens du dépôt donnent un historique ; leurs constats de production ne sont pas considérés comme revérifiés aujourd’hui. Aucune publication, activation de paiement ni création de compte bancaire n’a été effectuée dans ce lot.

## Ce qui est concret dans cette version

- L’application React/Vite dispose déjà de routes, d’un compte membre, d’un passeport, de jeux, d’un monde 3D, d’un espace communautaire, d’un atelier textile et de modules éditoriaux. Les dossiers ne sont pas une série de simples écrans vides.
- La persistance est mixte : certaines fonctions utilisent le navigateur ; d’autres appellent Supabase ou des API serveur. La présence du code d’un fournisseur ne prouve pas que sa configuration actuelle soit active ou que sa recette soit terminée.
- Le nouveau **Projects Center** transforme les 10 projets déjà affichés en plans modifiables et y ajoute **Finance 3B** et **Albert 3B**. Il propose 36 jalons initiaux, tous « À faire », sans inventer d’avancement. Création, modification, responsable, échéance, priorité, notes de contrôle, états, suppression et annulation de la dernière modification sont disponibles.
- La recherche combine les mots, ignore les accents et recherche aussi dans les responsables et les notes. Les états peuvent être filtrés. Les comptes de jalons sont calculés à partir des tâches réellement enregistrées.
- Les jalons restent sur l’appareil, sous une clé propre au compte. Les changements sont relus après rechargement. L’échec d’enregistrement est signalé et n’est jamais affiché comme une sauvegarde réussie. Une ancienne sauvegarde locale illisible est conservée sous une clé de récupération avant son remplacement.
- La sauvegarde JSON peut être exportée, relue, prévisualisée puis fusionnée. Les tâches absentes du fichier sont conservées ; les conflits d’identifiants entre projets sont refusés ; une version plus ancienne n’écrase pas la plus récente. La fusion est recalculée au moment de l’import final pour conserver les modifications faites après la prévisualisation.

## Où ouvrir le centre projets et qui y accède

1. Se connecter avec le compte propriétaire 3B.
2. Ouvrir **Centre de commande** (`#commande`). Le menu principal l’expose lorsque le compte et le contexte de navigation remplissent les conditions de l’application ; le module Command OS dispose également d’une présentation ordinateur.
3. Dans Command OS, rechercher **projets** ou rejoindre la section **Projects Center** (`cc-projects`). Si la section a été masquée dans les réglages des modules, la réafficher.
4. Choisir un projet, ouvrir ses détails ou ajouter un jalon. Le bouton « Ouvrir » conduit vers sa route existante.

Le composant vérifie le statut propriétaire auprès du serveur **avant de monter le planificateur ou de lire ses données locales**. Un visiteur ou un membre ordinaire n’obtient pas ce planificateur. Une session changée démonte l’espace précédent. Au premier accès, la vérification exige le réseau ; un échec propose de réessayer. Après validation, les changements de jalons fonctionnent localement pendant la session.

Les notes et les responsables sont enregistrés en clair dans le stockage du navigateur et dans l’export JSON. Ce centre est un outil personnel de planification : il ne remplace pas un système de secrets, un audit de production ni une synchronisation d’équipe. Il n’envoie aucune commande de déploiement et ne modifie aucune permission serveur. L’annulation concerne la dernière modification de la session ; une sauvegarde JSON reste nécessaire pour transférer les données sur un autre appareil.

## Inventaire des modules inspectés

L’inspection a porté sur les routes de `src/App.jsx`, le registre de navigation, les points d’entrée ci-dessous et les contrats de persistance ou de services visibles dans les sources. Elle ne constitue pas une recette humaine exhaustive de chaque écran.

| Module / route | Ce qui existe dans le code | Limite ou dépendance à vérifier |
| --- | --- | --- |
| Accueil et carte du monde (`#accueil`) | Accueil Concept 13, destinations et navigation des modules | Finition visuelle du lot accueil ; contrôle navigateur et téléphone réel |
| 3B Maintenant (`#maintenant`) | Module dédié et expériences quotidiennes | Qualité des contenus et recette de tous les parcours |
| Compte (`#membre`) | Authentification, profil, compte et état de session | Configurations Auth, messagerie, récupération et tests entre plusieurs comptes |
| Passeport (`#passeport`) | Identité 3B, apparence, services de reconnaissance et vérification séparés | Vérification d’identité et acceptation partenaire ne sont pas déduites de l’interface |
| Fidélité (`#cartes`) | Cartes, XP et points reliés au contexte membre | Les points de fidélité ne sont pas de l’argent ni une crypto transférable |
| Monde 3B (`#monde-3b`) | Entrée 3D, univers, progression et ressources de jeu | Recette graphique, performance et reprise sur appareils réels |
| Monde invisible / scanner (`#monde-invisible`) | Expériences caméra et découverte des gardiens | Permission caméra, matériel et parcours de repli |
| Arène (`#arene`) | Expérience dédiée, sortie et accès compte | Recette commandes tactiles et progression |
| Jeux (`#jeux`, `/jeux/…`) | Catalogue, jeux locaux, sauvegarde membre et récompenses | Contrôle de chaque jeu et des scores sur un compte réel |
| Manga (`#manga`) | Page et univers narratif dédiés | Exhaustivité du contenu et lecture mobile |
| Sport (`#sport`) | Module dédié, contenus et catalogue de médias | Fournisseurs de directs, disponibilité et droits des sources |
| E-sport (`#16-18-esport`) | Module dédié et point d’entrée dans le menu | Règles de participation et exploitation des événements |
| Santé (`#sante`) | Données locales, coffre santé et parcours dédiés | Mesures réelles, consentements et intégrations natives à tester séparément |
| Scanner alimentaire (`#scanner-alimentaire`) | Lecture de code-barres et appel à `/api/food-product` | Autorisation caméra et disponibilité de la source externe |
| 3 bons plans (`#3-bons-plans`) | Module, données sourcées et datées | Validité effective des offres au moment de l’usage |
| Informations actuelles (`#informations-actuelles`) | Briefs et contenus éditoriaux avec services dédiés | Actualité des sources et réponse des API |
| Association 3B (`#association-3b`) | Présentation, participation et orientation | Statut associatif réel à confirmer ; aucune entité inventée |
| Partenaires (`#partenaires-3b`) | Orientation et prises de contact | Aucun partenariat n’est acquis par la présence d’un lien |
| Banque & crypto (`#banque-crypto`) | Guides officiels et laboratoire de simulation ajouté dans le lot finance | Le laboratoire local ne fournit aucun IBAN, dépôt, paiement réel ni jeton sur une blockchain |
| Voyage (`#voyage-3b`) | Répertoire de pays et liens de conseils officiels | Pas de réservation ni d’agence de voyage démontrée par ces liens |
| Nous recherchons (`#nous-recherchons`) | Opportunités et candidature par prise de contact | Aucun contrat de recrutement automatiquement créé |
| 3B Origins TV (`#3b-origins-tv`) | Présentation des créations et programmes 3B | Catalogue et droits à finaliser avant une offre éditoriale complète |
| Administration (`#administration-3b`) | Guides et annuaire de services publics | Démarches effectuées auprès des organismes officiels ; le module ne délivre pas de document public |
| Cinéma (`#cinema-3b`) | Recherche et orientation vers des offres légales | Disponibilité territoriale et abonnement des plateformes |
| Communauté (`#communaute`) | Profil, charte, publications, votes, blocage et signalements via services authentifiés | Exploitation de la modération et recette entre plusieurs membres |
| IA et textile (`#ia`, `#ia-textile`) | Brief textile, aperçu, sauvegarde, export et partage communauté | Génération d’image conditionnée aux capacités serveur ; aperçu schématique avant fabrication |
| Mode 3 IA (`#mode-3-ia`) | Client GPT / Claude / Gemini et synthèse via serveur | Clés, modèles et activation nécessaires ; aucune réponse de Claude n’a été fabriquée dans cet audit |
| Albert (`#albert-3b`) | Prévisualisation publique du concierge | Connexion au moteur personnel distincte de la prévisualisation |
| Command OS (`#commande`) | Contrôle propriétaire, appareils, actions autorisées, intégrations et centre projets | Vérification propriétaire et services serveur ; les jalons locaux ne prouvent pas les connexions |
| Boutique (`#boutique`) | Catalogue, panier, API de commande, Checkout Stripe et webhook préparés | Paiement réel soumis aux verrous serveur et à une recette commerciale complète |
| Nosbloc (`#nosbloc`) | Studio de projets, versions, restauration, équipes et synchronisation préparée | Ouverture publique et opérations financières soumises à leurs conditions propres |
| Religion (`#religion`), secret (`#secret`) et guide (`#guide`) | Points d’entrée dédiés, contenus et mécanismes propres | Relecture éditoriale et recette spécifique de chaque parcours |

## Réel, local et démonstration

**Réel dans le code local :** navigation, formulaires, moteurs de jeux, sauvegardes locales, contrôle des erreurs et clients de services. Les 36 jalons initiaux sont des suggestions de travail, jamais des contrôles déjà réalisés.

**À dépendance serveur :** comptes, sauvegardes cloud, communauté, commande propriétaire, génération IA, catalogue commercial et statut des commandes. Les réponses et configurations réelles doivent être contrôlées dans l’environnement choisi. Aucun accès de production n’est déclaré fonctionnel sur la seule base de fichiers `.env.example` ou d’un document ancien.

**Simulation financière :** les montants et opérations du laboratoire banque/crypto restent fictifs. Un solde local et un registre de démonstration ne créent ni établissement bancaire, ni compte de paiement, ni actif échangeable, ni token déployé. Les éventuelles futures connexions doivent conserver une séparation explicite avec ce laboratoire.

## Blocages opérationnels restants

| Sujet | Travail déjà préparé | Ce qui reste nécessaire pour l’ouverture réelle |
| --- | --- | --- |
| Publication | Build Vite, PWA et projets mobiles présents | Choisir la version publiée, vérifier domaine/URL et réaliser une recette sur les appareils cibles |
| Comptes et données | Contrats Auth, protections de session et stockage présents | Parcours inscription/récupération/suppression, tests de séparation des comptes et procédure de restauration |
| Commerce | API catalogue/Checkout/webhooks et verrous de lancement | Produits, prix, disponibilité, livraison, retours, identité du vendeur, configuration prestataire et commande/remboursement test complets |
| Banque / crypto | Parcours visuels et simulation locale | Fournisseurs, architecture et habilitations adaptées au service réel choisi ; aucune activité financière réelle n’a été activée |
| Passeport vérifié | Clients de statut et contrats dédiés | Prestataire d’identité, essais de bout en bout et acceptation réelle des partenaires ; une identité 3B seule ne les établit pas |
| IA multiples | Conseil IA et Mode 3 IA configurables | Disponibilité réelle des clés/modèles, activation côté serveur, budgets et essais de chaque fournisseur |
| Communauté / Nosbloc | Publication, signalement, équipes et versions dans le code | Recette bêta, exploitation de la modération, règles d’usage et gestion des litiges |
| Centre projets | Planification et sauvegarde locale opérationnelles | Pour une équipe : concevoir ensuite une synchronisation serveur, droits de collaboration et historique partagé |

Les informations d’entreprise, identités, coordonnées professionnelles, contrats prestataires, décisions commerciales et pièces de vérification ne peuvent pas être déduites des sources. La poursuite du développement local et des simulations reste possible en parallèle de leur préparation.

## Prochaines validations concrètes

1. **Parcours public sur téléphone et ordinateur :** ouvrir l’accueil, chercher un module, visiter banque/crypto, revenir, ouvrir un pays et le compte ; contrôler lisibilité, retour navigateur et absence de débordement horizontal.
2. **Finance en démonstration :** effectuer une opération fictive, refuser un montant invalide ou supérieur au disponible, relire l’historique, recharger et exporter ; vérifier que l’interface décrit toujours la simulation et qu’aucun fonds réel ne bouge.
3. **Centre projets avec un compte propriétaire :** créer un jalon, lui attribuer responsable/date/priorité, changer son état, recharger, exporter puis importer. Modifier aussi un jalon après l’aperçu d’import pour vérifier sa conservation. Supprimer puis annuler une tâche.
4. **Séparation des rôles :** tenter `#commande` sans connexion puis avec un membre ordinaire ; vérifier qu’aucun planificateur ni donnée locale propriétaire ne s’affiche. Changer de compte sans recharger et répéter. Vérifier le message de reprise quand le stockage du navigateur est bloqué.
5. **Fournisseurs externes :** consulter leur statut dans l’environnement cible, puis réaliser un essai authentifié par fournisseur. Pour Mode 3 IA, relever quels services répondent réellement. Pour commerce, tester commande, webhook et remboursement dans l’environnement de test configuré. Pour identité, utiliser uniquement le parcours de recette du prestataire réellement configuré.
6. **Avant une publication choisie :** conserver le résultat des tests, la version du build, les captures mobile/ordinateur et les résultats des contrôles précédents dans les notes des jalons concernés.

## Vérifications de ce lot

- `node --test tests/projects-center.test.js tests/control-center-mobile-os.test.js tests/control-center-v3.test.js tests/gold-master-design-system.test.js` : **39 tests réussis**, dont 12 nouveaux tests du planificateur.
- Couverture du nouveau modèle : création/édition, changement d’état, recherche avec accents, suppression sans mutation de l’ancien état, sauvegarde/relecture, séparation des comptes, export/import, conflit de projet, sauvegarde ancienne, restauration d’une sauvegarde de la veille sur un nouvel appareil, annulation puis réimport d’une sauvegarde antérieure, JSON invalide, dates invalides, limites et stockage indisponible. Les propositions initiales ont une date de référence stable : ouvrir un nouvel appareil aujourd’hui ne les rend pas plus récentes que les vrais changements d’hier. Une annulation date les tâches qu’elle modifie comme de nouveaux changements, sans redater les autres tâches.
- Boutons du centre projets : primitive partagée `Button`. Couleurs, rayons et surfaces : tokens Gold Master existants.
- La compilation de l’application et les autres lots sont vérifiés par l’intégration globale de cette intervention. La recette sur téléphone physique et les essais de paiement/identité réels restent distincts des tests locaux.

Fichiers du lot : `src/control/ProjectsCenterPanel.jsx`, `src/control/projects-model.js`, `src/control/projects-center.css`, `tests/projects-center.test.js` et ce document.
