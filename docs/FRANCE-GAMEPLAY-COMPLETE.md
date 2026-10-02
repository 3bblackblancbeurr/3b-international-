# Monde 3B — FRANCE GAMEPLAY COMPLETE

Objectif validé : construire le moteur vivant dans une zone France compacte avant de multiplier les royaumes. Document de production, pas déclaration de jeu terminé.

## Boucle centrale et définition de réussite

Explorer → rencontrer → comprendre un problème → accepter ou refuser → agir sur place → obtenir une récompense utile → améliorer Kaïs ou le quartier → découvrir de nouvelles possibilités.

Les fragments, Céliane et la Justice relient cette boucle au Cercle Brisé et au Monstre de l’Oubli. Le retour au Nexus doit ouvrir un service ou une possibilité réelle. Une nouvelle couche de décor ne remplace aucun de ces comportements.

Sur dix parcours représentatifs de 30 secondes dans les rues jouables, tester au moins une activité observable, une interaction accessible et une piste compréhensible. Les pauses calmes restent possibles. Ne pas forcer un incident toutes les 30 secondes. Une route vide doit recevoir une fonction ou être raccourcie.

## Lot 1 présent dans cette proposition

- Quatre habitants interactifs : Nora, jardinière ; Malik, artisan ; Inès, secouriste ; Samuel, livreur. Ils proposent les contrats existants associés à leur métier.
- Présence à un point de travail de 7 h à 20 h, puis à un point résidentiel. Actualisation à la minute. Il s’agit d’horaires discrets, pas encore de trajets simulés ni d’intérieurs résidentiels accessibles.
- Dialogue reconnaissant les contrats accomplis. Pas encore de relations sociales, de besoins personnels ou de mémoire des conversations.
- Guide du contrat pointant vers une action réellement disponible, puis vers la remise seulement quand toutes les étapes sont terminées.
- Contrats affichés selon le royaume et les prérequis existants ; coûts et récompenses explicites.
- Refus libre par fermeture du dialogue ; abandon du contrat actif sans récompense ni remboursement des provisions engagées.
- Registre persistant `completedJobs`, séparé des contrats répétables `jobs` renouvelés après une expédition. Migration depuis les contrats encore présents dans les anciennes sauvegardes. Les anciennes réalisations déjà effacées ne sont pas reconstructibles.
- Jardins aidés : panier de trois provisions à quatre éclats au café, au lieu de six. Source dégagée : une provision supplémentaire par récolte de nourriture. Bonus non cumulatif, plafonds et restrictions existants conservés.
- État et dialogue du quartier reflétant réparations, secours et relais accomplis. La route et le relais ne disposent pas encore d’une modification physique ou de nouveaux services ; leurs états ne doivent pas être annoncés comme de nouvelles mécaniques.
- Conservation de la position de Kaïs lorsque la scène se reconstruit à la suite d’une étape de contrat.
- Réducteurs source et copie serveur candidate maintenus ensemble. L’Edge Function active doit être déployée depuis le paquet partagé avant activation de ce lot pour les comptes.

Ce lot ne rend pas la France « gameplay complete ». Il établit des liens vérifiables entre les systèmes déjà présents.

## Ordre de production et portes de validation

| Ordre | Livraison | Condition de passage |
|---|---|---|
| 1 | Boucle et sauvegarde | Rencontre → contrat → action → remise → avantage → redémarrage ; aucune récompense doublée, aucun changement d’étape qui téléporte Kaïs. |
| 2 | Quartier dense | Fonctions de chaque rue, accès praticables, navigation mobile, six intérieurs utiles proposés ci-dessous, aucun objectif dans un volume inaccessible. |
| 3 | Population vivante | Habitant nommé : métier, domicile, horaires, trajets, besoin, relation et souvenir ; les habitants visibles réagissent à Kaïs et aux incidents. |
| 4 | Missions à solutions | Une enquête Justice et un secours avec plusieurs solutions jouables, refus et abandon ; preuves et conséquences persistantes. |
| 5 | Combat et IA | Ennemis spécialisés, perception, recherche, repli, télégraphies lisibles, parade/contre ; voie sans combat quand la mission la prévoit. |
| 6 | Économie et progression | Récompenses utilisées dans des achats, améliorations ou capacités ; absence de blocage faute de ressources ; prix serveur cohérents. |
| 7 | Événements et exploration | Directeur borné, secrets récompensés, activités libres reliées à la progression ; événements distincts après reprise. |
| 8 | Compagnon et factions | Compagnon utile à une enquête et à un secours ; réputation ouvrant un dialogue ou un accès concret. |
| 9 | Fragment et Nexus | France → fragment → service Nexus débloqué → retour France → nouvelle possibilité jouable. |
| 10 | Endurance et duplication | Sessions longues PC/Samsung, interruptions, optimisation mesurée ; puis portage des règles communes vers un second royaume. |

Ne pas lancer les sept royaumes en parallèle avant cette dernière porte. Les réglages artistiques nécessaires à la lisibilité, aux collisions et aux performances restent prioritaires ; l’expansion décorative attend.

## Zone compacte proposée

Conserver les coordonnées existantes jusqu’à validation des trajets. Toute compression de carte doit déplacer ensemble géométrie, collisions, navigation, objectifs et points sauvegardés.

| Secteur | Fonction | Intérieur utile proposé | Effet attendu du gameplay |
|---|---|---|---|
| Verrières | Artisans, livraison, réparations | Atelier | Outils et amélioration d’équipement ; réparations ouvrant un passage physique. |
| Marché et café | Approvisionnement, conversations | Café et boutique de quartier | Stock et prix affectés par des livraisons plafonnées. |
| Refuge | Familles, secours, préparation | Refuge | Personnes sauvées présentes, dialogue et assistance débloqués. |
| Jardins et source | Récoltes, besoins locaux | Remise agricole | Production affectée par l’état de la source et des parcelles. |
| Archives de Justice | Enquête et médiation | Archives | Preuves découvertes, décisions argumentées et dossiers suivants. |
| Relais et souterrains | Anomalies, danger et secrets | Local technique | Réparation rendant une zone sûre et révélant une piste du fragment. |

Une façade fermée doit être clairement signalée. Les bâtiments ouverts doivent offrir une action, un service, une information ou un raccourci.

## Mission écrite proposée : « Le pain et la preuve »

Cette mission reste à implémenter. Les noms et détails proposés peuvent évoluer sans changer le canon.

1. Un commerçant signale une livraison disparue. Un voisin accuse un livreur. Kaïs peut écouter ou repartir ; le journal conserve la rumeur sans accepter automatiquement le contrat.
2. Deux témoignages sont incompatibles. Examiner le bon de livraison, suivre les traces de roues, vérifier un relais altéré par l’Oubli. Chaque indice doit être un objet localisable et accessible.
3. Le convoi est immobilisé. Trois solutions : réparer le mécanisme ; négocier le passage avec un groupe ; rejoindre le chargement par les toits et récupérer la preuve. Le combat est possible seulement contre une menace identifiée.
4. Revenir avec les éléments vérifiés. Choisir une réparation collective ou remettre le dossier à Céliane. Une preuve absente ne doit pas devenir disponible par un choix de menu.
5. Attribuer la récompense une seule fois. Mettre à jour livraison, dialogue du commerçant, confiance du livreur, prix et prochain contrat selon les faits.
6. Le fragment effacé dans les archives devient une piste d’histoire. La Justice consiste à établir, écouter et réparer ; aucun pays ou groupe social ne correspond automatiquement à une faction criminelle.

## Inventaire des systèmes restant à produire

| Système demandé | Implémentation attendue | Preuve de fonctionnement |
|---|---|---|
| Population | Identités stables ; adultes, enfants, familles, travailleurs, visiteurs ; ménages et relations. | Un habitant peut être retrouvé au travail ou près de son domicile, et reconnaît une aide réelle. |
| Routines | Déplacements maison/travail/commerce/loisir ; réaction à la météo et aux incidents. | Suivre un habitant sur un cycle sans trajectoire à travers les murs. |
| Besoins | Stocks, commandes, repos, sécurité ; règles bornées hors écran. | Une pénurie crée une demande et sa résolution restaure un service. |
| Interactions | Registre partagé des verbes, portée, conditions, retours visuels et sonores. | Porte, banc, machine et objet important utilisables ou explicitement verrouillés. |
| Missions | Étapes persistantes ; enquête, infiltration, poursuite, défense, escorte, énigme, parkour, secours, tournoi, coop. | Au moins deux solutions sur les missions clés ; aucun objectif fictivement accompli par menu. |
| Choix | Faits, preuves et conséquences ; aucun arbre de choix inutilement massif. | Même sauvegarde avec deux choix produit deux résultats observables. |
| IA hostile | Vue/bruit, dernier lieu connu, recherche, couverture, renforts, encerclement et fuite. | L’ennemi perd Kaïs, cherche une trace, puis reprend une routine au lieu de poursuivre sans fin. |
| Créatures | Comportements propres, territoire et signaux lisibles. | Deux espèces ne partagent pas une simple charge automatique. |
| Combat | Attaques légères/lourdes, garde, esquive, parade, contre, rupture, combos, altérations et phases. | Entrées PC/tactile cohérentes ; boss lisible ; aucune attaque incontournable sans signal. |
| Progression | Déplacement, combat, dialogue, exploration, artisanat, réputation, tenues et compagnon. | Une capacité débloque une route ou une solution et reste après redémarrage. |
| Économie | Éclats du monde, matériaux, boutiques, recettes, réparation, améliorations ; limites de stock. | Chaque gain a un usage ; aucun prix arbitraire envoyé par le client. |
| Activités libres | Parkour, photo, tournoi, livraison, collection, sport et jeux compatibles. | Activité jouable sans histoire principale, avec récompense utile et bornée. |
| Factions | Groupes et opinions locales avec réputations séparées. | Réputation modifie prix, accès ou dialogue ; aucune récompense exploitable par répétition infinie. |
| Vie urbaine | Routes, véhicules, livraisons, arrêts, incidents légers, marchés et attroupements. | Observation immobile montrant plusieurs comportements causaux sans saturer le mobile. |
| Événements | Modèles écrits, préconditions, lieux compatibles, cooldowns, fin et conséquences. | Aucun incendie dans un intérieur inaccessible ; aucun événement rejoué pour doubler le gain. |
| Intérieurs | Chargement limité, fonctions identifiées, sorties fiables. | Entrer, agir, quitter et reprendre sans perdre un objectif. |
| Exploration | Toits, passages, tunnels, indices, raccourcis et narration environnementale. | Secret accessible offrant une information, un objet, une mission ou un accès. |
| Compagnon | Ordres, indices, assistance, relation et progression. | Compagnon détecte une piste réelle et aide sans accomplir toute la mission. |
| Narration | Oubli altérant preuves, pouvoirs, lieux et relations ; montée progressive. | Comprendre un problème du Cercle Brisé en jouant sans cinématique obligatoire. |
| Carte | Découverte progressive, rumeurs distinctes des certitudes, filtres et historique. | Une rumeur ne révèle pas d’avance toute la solution. |
| Persistances | Missions, choix, réputation, habitants clés, compagnons, fragments, position sûre. | Coupure, fermeture, reprise après plusieurs jours : état cohérent. |
| Procédural | Variantes issues de modèles validés avec préconditions et contraintes spatiales. | Variation possible, solution garantie, historique et récompense bornés. |
| Montée en puissance | Étapes de menace et restauration dépendant des fragments. | Une nouvelle étape crée gameplay et réaction des factions, pas seulement un changement de couleur. |
| Nexus | Services, accès, personnages et possibilités par fragment. | Déposer le fragment France rend un service effectivement utilisable. |

## Extension des valeurs aux royaumes

| Royaume / Gardien | Valeur | Mécanique proposée pour le portage |
|---|---|---|
| France / Céliane | Justice | Établir une preuve, entendre plusieurs personnes, rendre une réparation possible. |
| Algérie / Yliane | Loyauté | Tenir un engagement ; arbitrer deux obligations compatibles ou contradictoires. |
| Maroc / Naël | Noblesse | Protéger dignité et hospitalité par des actions qui ont un coût. |
| Tunisie / Soraya | Courage | Risque lisible, secours sous pression et retrait tactique possible. |
| Espagne / Diego | Passion | Maîtrise par pratique, rythme et création ; conserver le contrôle. |
| Italie / Alessio | Espoir | Reconstruire un service et rendre des perspectives aux habitants. |
| Turquie / Émir | Foi | Confiance, engagement et mémoire ; respect des croyances sans caricature. |
| Estonie / Eira | Sagesse | Observation, lecture de systèmes et conséquences différées. |

## Règles techniques et livraison

Le serveur reste l’autorité des gains de compte. Réutiliser journal séquencé, reçus et validation des commandes. Le client ne transmet pas une somme à créditer. Les éclats du monde restent distincts des XP/Coins du Passeport et de tout jeton financier.

Déployer d’abord le paquet serveur contenant les nouveaux réducteurs, vérifier des commandes de test, puis activer le client correspondant. Ne pas fusionner une interface dépendant d’une commande serveur encore inconnue en production. Le paquet généré doit inclure `france-life.js` et sa dépendance `district-jobs.js`.

Les horaires et positions des habitants de ce lot sont une représentation locale légère. Ils ne constituent pas un simulateur déterministe partagé de population. Les futurs événements et transactions doivent employer un temps serveur, des identifiants stables et une politique de conflit explicite.

Les budgets mobiles doivent être mesurés : population simulée distincte de population visible ; simulation distante à faible fréquence ; nombre de chemins et d’événements borné ; profils adaptatifs. Cible à vérifier : 30 images/s stables sur le Samsung de référence et 60 images/s sur PC cible. Aucun résultat de performance n’est affirmé par ce document.

Tests de rupture obligatoires avant « complete » : réseau perdu pendant récompense et sauvegarde ; fermeture pendant cinématique ; coffre spammé ; abandon ; mort au checkpoint ; entrée/sortie coop ; veille ; arrière-plan ; mémoire limitée ; chute sous la carte ; reprise après plusieurs jours. Ajouter conflit entre deux appareils et stockage local plein.

Validation locale du lot 1 : 17 tests ciblés réussis et analyse syntaxique des fichiers modifiés. Le build complet, le test visuel des habitants, la conservation de position en scène réelle et les sessions Samsung restent à valider avant publication. Une copie candidate Supabase présente dans GitHub n’est pas une Edge Function déployée.

Le Passeport reste hors de ce chantier : effets Matrix bleus conservés, aucun bouton ajouté. « Créer ma Ville » reste un jeu distinct du Monde 3B.
