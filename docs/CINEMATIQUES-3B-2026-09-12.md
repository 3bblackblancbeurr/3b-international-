# 3B — Cinématiques : L’Éveil de l’Héritage

## Statut exact de cette livraison

Branche de travail : `chatgpt-improvements`. Aucune modification de `main`, aucune fusion et aucune publication de production demandées par cette livraison.

**Raccordé dans le code proposé :** présentation après validation complète du personnage dans `AvatarPanel.jsx`, six plans 3D utilisant l’avatar réellement sauvegardé, explication de sa voie et de son équipement, commande Passer, pause, mode lecture et cadrages de début/fin des duels dans `ArenaStage.jsx`. L’ouverture de l’arène reste une mise en scène non bloquante : elle n’arrête pas le chronomètre serveur.

**Préparé et testé, mais PAS raccordé à WorldPage :** sélecteur `worldCinematicEvents` pour l’entrée dans un pays, les alliances de scénario, pouvoirs appris, restaurations, gardiens, résultats importants, premier lien avec un compagnon, découvertes et finale. Il ne faut pas confondre la présence de ces événements avec des cinématiques déjà jouables partout.

**Non livré :** système complet d’armes évolutives, démonstrations d’attaques propres à chaque arme, voix enregistrées, synchronisation des lèvres, nouvelles animations corporelles de qualité studio, galerie de relecture, montage multiprises des huit pays et protocole de présentation synchronisée des matchs en ligne. Le niveau de détail reste celui des modèles 3D déjà présents.

**Vérifications locales :** 16 tests unitaires sur le scénario et les déclencheurs ; vérification de syntaxe JSX des trois composants modifiés/ajoutés. Ces contrôles ne sont pas un build complet de l’application ni un test réel Samsung ou multijoueur.

## Demande et ligne directrice

Installer des cinématiques à la fin de la personnalisation complète (personnage ET arme), dans les huit pays, aux grandes étapes de l’histoire, avant et après les combats importants et dans l’arène. Ne pas ajouter des écrans décoratifs sans rapport avec ce que vient de faire le joueur. Chaque séquence doit avoir une cause, une révélation et une reprise de jeu explicite.

Identité souhaitée : 3B, Black • Blanc • Beur, héritage, unité, luxe discret, noir profond, or champagne et bleu numérique. Kaïs, le Cercle Brisé, les huit portes, les gardiens et le Monstre de l’Oubli donnent une direction à l’histoire. Le personnage créé par le joueur garde sa propre identité : ne jamais le remplacer automatiquement par un Kaïs générique. Ne pas attribuer une puissance biologique à une nationalité ou à une couleur de peau.

Un moment important mérite plusieurs plans construits, pas seulement un texte géant, un zoom et des particules. Les plans rapprochés demandent des modèles capables de les supporter : ne pas annoncer une qualité studio sur la seule base d’une caméra animée.

## 1. Fin de personnalisation — L’Éveil de l’Héritage

### Version raccordée dans cette livraison

Le formulaire valide et enregistre le personnage avant de commencer la présentation. Le monde demeure suspendu par le panneau de personnalisation existant. Fermer ou passer la scène ne relance aucune action de sauvegarde et ne distribue aucune récompense.

La présentation dure 44,5 secondes en lecture animée et peut être passée immédiatement. Elle montre successivement :

1. **Identité — 6,5 s.** Cadrage rapproché sur le personnage réellement enregistré ; son nom apparaît.
2. **Silhouette — 6 s.** Plan plus large sur sa tenue et son apparence personnalisées.
3. **Voie — 8,5 s.** Présentation de la voie de pouvoir choisie, avec la description mécanique déjà utilisée par l’éditeur. Une animation existante de pouvoir accompagne ce plan.
4. **Maîtrise — 8,5 s.** Explication de la manière de jouer et des limites ; la perte de vitalité de Tempête n’est pas masquée.
5. **Équipement — 7,5 s.** Présentation de l’équipement de voyage et distinction entre aventure et arène équilibrée.
6. **Départ — 7,5 s.** Invitation à explorer les huit portes et à rencontrer leurs habitants. Signature : « Ce n’est pas une marque, c’est un héritage. »

La caméra propose portrait, silhouette, pouvoir et recul de départ. Les sous-titres restent accessibles sans son. Le mode lecture avance manuellement et supprime l’animation du personnage. La préférence système de réduction des mouvements est prise en compte.

### Version cible avec armes — à produire

Ajouter une véritable séquence de résonance de l’arme seulement lorsque le choix d’arme est sauvegardé, son modèle existe et ses mécaniques sont jouables. Le scénario accepte déjà un objet d’arme explicitement activé avec nom, attaque, défense et contrepartie ; l’intégration actuelle ne lui en fournit pas, car aucun arsenal évolutif n’est disponible dans l’éditeur audité.

Ne pas inventer une arme équipée pour combler ce manque. Ne pas faire passer une voie de pouvoir pour un système d’armes complet.

Storyboard cible : le Cercle réagit, l’avatar apparaît dans sa tenue réelle, l’arme choisie se révèle, un mannequin spectral reçoit une démonstration, une défense est montrée, puis le défaut de cette défense apparaît. La caméra revient au personnage et indique le premier objectif réellement disponible. Les phases d’attaque/défense sont des démonstrations isolées : elles ne changent pas les points de vie d’un ennemi du monde.

## 2. Armes — expliquer sans mentir au joueur

La séquence lit une seule source de données partagée avec le combat : famille, forme actuelle, transformations autorisées, portée, coût, défense, récupération et vulnérabilité. Les valeurs affichées ne doivent jamais être codées uniquement dans le texte de la cinématique.

Pour les **ciseaux à lames détachables**, exemple de logique à implémenter : forme liée pour la précision et la parade ; séparation pour menacer à distance ; perte de couverture rapprochée pendant la séparation ; rappel avec délai et exposition mesurables. Montrer les deux lames revenir effectivement dans la main. Ne pas annoncer quatre formes si le gameplay n’en comporte qu’une.

Pour une **arme lourde**, montrer l’impact et la protection, puis sa récupération lente. Pour un **arc**, montrer la distance utile et sa faiblesse au contact. Pour les **griffes**, montrer l’enchaînement et la faible portée. Pour un **fil spectral**, montrer le contrôle d’espace et sa limite d’utilisation. Ce sont des directions de conception, pas des statistiques déjà installées.

Une évolution doit découler d’un événement vérifié : quête, maîtrise ou épreuve. Montrer la forme obtenue, expliquer ce qui change et ce qui reste vulnérable. Ne pas accorder de déblocage au bouton « Passer ». Les variantes des huit pays s’appuient sur leur direction artistique, sans rendre toutes les armes identiques ou toutes-puissantes.

## 3. Huit pays — donner un sens à l’arrivée

Cible : une première entrée de 12–20 secondes par pays, puis seulement une transition courte lors des retours. Les panoramas doivent utiliser les lieux du jeu, pas des photos touristiques insérées à leur place.

| Pays | Direction narrative cible | Construction visuelle |
|---|---|---|
| France | Justice, Céliane | Révéler le quartier, son monument, puis une trace de l’Oubli et un objectif local. |
| Algérie | Loyauté, Yliane | Relier ville, reliefs et mémoire des habitants ; montrer un lien à protéger. |
| Maroc | Noblesse, Naël | Travail architectural distinct, seuils et cours ; révéler une responsabilité, pas seulement un panorama. |
| Tunisie | Courage, Soraya | Identité côtière et minérale distincte du Maroc ; mettre en scène une épreuve à traverser. |
| Italie | Espoir, Alessio | Arches, places et lumière retrouvée ; montrer un lieu qui peut revivre. |
| Espagne | Passion, Diego | Rythme, places et mouvement ; introduire une énergie à canaliser. |
| Turquie | Foi, Émir | Seuils et passage entre espaces ; traiter les références spirituelles avec respect. |
| Estonie | Sagesse, Eira | Pierre, forêt et mémoire numérique ; révéler un indice à comprendre. |

Ces noms/valeurs appartiennent à la direction narrative du projet. Au raccordement, vérifier la correspondance avec le catalogue des cartes et les personnages effectivement chargés. Ne pas renommer silencieusement le catalogue si les identifiants ne correspondent pas.

Structure de chaque arrivée : franchissement de la porte, plan d’ensemble, détail propre au pays, signe de l’Oubli, puis objectif concret. Revenir exactement au même emplacement jouable et à la caméra normale du joueur.

## 4. Progression de l’histoire et événements du monde

Déclencher une scène sur un changement réel d’état, jamais sur le simple clic du joueur. Éviter les interruptions pour chaque ressource ramassée, chaque petit gain d’XP et chaque ennemi ordinaire.

| Événement cible | Déclencheur existant vérifié | Séquence souhaitée |
|---|---|---|
| Première arrivée | `visit`, nouveau pays dans `visited` | Présentation propre au pays. |
| Première aide à l’habitant | `help`, chapitre `helped` passe à vrai | Échange, alliance et objectif suivant. |
| Pouvoir appris | `power`, nouvelle entrée dans `powers` | Révélation courte et explication de son usage. |
| Énigme résolue | `solve`, `restored` atteint 1 | Le lieu se souvient ; le décor témoigne du changement. |
| Quartier reconstruit | `restore`, `restored` atteint 2 | Montrer le jardin OU l’atelier réellement choisi. |
| Pays restauré | `restore`, `restored` atteint 3 | Le pays retrouve sa lumière ; conséquence dans le monde. |
| Découverte | `survey`, nouveau carnet dans `discoveries` | Micro-séquence de découverte, sans interrompre une urgence. |
| Nouveau compagnon | `pactChoice`, nouveau recrutement réellement possédé | Première rencontre de confiance, puis retour au groupe. |
| Finale | Victoire finale et `finished` passe à vrai | Conclusion du Cercle, puis monde encore explorable. |

Prévoir une file de lecture bornée avec priorités : combat important > chapitre > découverte. Fusionner ou différer les petites révélations lorsque plusieurs changements surviennent ensemble. Une synchronisation, un import de sauvegarde ou un rechargement ne doit pas rejouer tous les chapitres.

## 5. Début et fin des combats importants

**Introduction de gardien, 8–15 s :** approche, révélation de l’adversaire réellement présent, regard/positionnement, indice sur son comportement, cadre de duel, puis reprise des commandes. Un avertissement utile est préférable à une explication qui révèle tout le combat.

**Victoire, 6–12 s :** relâchement de la tension, réaction du gardien, reconnaissance du lien et résultat réel. Pour un gardien, le respect et la restauration sont plus cohérents qu’une élimination gratuite.

**Défaite, 4–7 s :** retraite ou reprise de souffle, conservation des compagnons, piste concrète pour mieux préparer le groupe. Ne jamais jouer la célébration de victoire après une défaite.

**Boss final :** introduction et conclusion plus longues, avec une réalisation dédiée. Lire la fin réellement acquise dans `adventure.finished`, ne pas déclencher la conclusion à chaque retour au Nexus.

Le moteur utilise `encounter.boss` et `encounter.final` ; une patrouille peut aussi porter `boss: true`. Il faut donc exclure `patrol` des grandes introductions de gardien. Le sélecteur livré teste cette distinction.

Point critique de raccordement : `fieldStart` prépare le combat et `field` le fait progresser en temps réel. Pendant une cinématique solo, arrêter réellement les commandes et la simulation concernée ; masquer les boutons ne suffit pas. Annuler les touches maintenues. Restituer le contrôle, l’interface et la caméra après fin, passage, interruption et erreur.

## 6. Arène

### Déjà modifié dans le code proposé

La caméra d’ouverture révèle progressivement la scène, sans bloquer les commandes. Cette ouverture s’efface dès qu’une action a été jouée. Après le résultat, un cadrage se recentre sur le véritable vainqueur ; une égalité n’est pas traitée comme une victoire. Aucun chronomètre, résultat, classement ou gain n’est modifié.

### Version cible complète

Pré-match : présentation des combattants réels et de leurs équipements autorisés, versus, information de format et compte à rebours partagé. Pour un tournoi, distinguer demi-finale et finale. Après-match : respect entre adversaires, résultat réel, puis récompenses effectivement validées.

Un match en ligne ne peut pas être « mis en pause » par un simple état React local. Introduire une phase de présentation commune côté serveur, un horodatage partagé de début, une durée maximale et une politique de déconnexion. Tant que ce protocole n’existe pas, les cinématiques locales doivent rester non bloquantes, sans cacher une action ni consommer du temps de réflexion à l’insu du joueur.

Passer la présentation côté client ne doit pas permettre de frapper avant l’autre joueur. N’exécuter ni dégâts ni mouvements de tour depuis une timeline cinématique. Le résultat officiel reste celui du serveur.

## 7. Architecture à terminer

Les sélecteurs et le scénario sont séparés des composants de rendu. Le raccordement restant doit ajouter :

- Un directeur de séquences gérant file, priorités, pause, reprise, abandon et contexte de sauvegarde.
- Une timeline de plans : sujet, position/visée caméra, transition, animation existante, réplique, durée et événement sonore.
- Des adaptateurs de scène donnant accès au héros, au vrai adversaire, au monument et aux objets du monde sans reconstruire tout le niveau pour chaque plan.
- Une mémoire des scènes vues par sauvegarde et version. Distinguer vue, passée et interrompue ; la relecture ne modifie jamais le monde.
- Une galerie de souvenirs, avec uniquement les scènes débloquées et une protection contre les révélations de chapitres non atteints.
- Un retour sans ambiguïté : exploration, combat, résultat ou menu d’arène selon le contexte initial.

Point d’entrée proposé : calculer `worldCinematicEvents(previous, next, command)` uniquement après succès de `recordWorldAction` dans `WorldPage.act`. Enregistrer d’abord la progression de jeu ; les cinématiques la présentent mais ne l’attribuent pas. Retarder les scènes d’arrivée jusqu’au chargement effectif du pays. Ne pas exécuter ce sélecteur lors du simple chargement/synchronisation d’un état.

## 8. Réalisation, son et mobile

Employer des mouvements lents et intentionnels, des compositions lisibles, un éclairage cohérent avec le lieu et des transitions sans téléportation de caméra injustifiée. Conserver l’apparence, l’arme, sa forme, le compagnon possédé et le pays courant. Ne pas utiliser des gros plans de visage si les animations faciales restent insuffisantes : préférer des cadrages qui valorisent les modèles disponibles.

Prévoir voix originales ou licenciées, sous-titres indépendants, musique adaptative et sons d’arme. Cette livraison n’ajoute aucune voix ou musique. Une voix de synthèse improvisée n’est pas une preuve de doublage réalisé ni de synchronisation labiale.

Sur téléphone : pas de chargement vidéo lourd systématique, pas de seconde scène complète laissée active en arrière-plan, libération des ressources à la fermeture, arrêt des horloges de présentation quand l’application est masquée. Préserver les contrôles d’accessibilité et un bouton Passer tactile d’au moins 44 pixels. Le mode lecture ne supprime pas les informations d’histoire.

Les objectifs de fluidité sont à mesurer sur appareil, pas à annoncer comme garantis. Vérifier portrait et paysage, reprise après verrouillage, chaleur/mémoire et transitions entre huit pays. La branche proposée doit passer un build complet et une revue visuelle avant toute fusion.

## 9. Recette avant activation générale

1. Personnage enregistré : six plans utilisent les bons détails et le bon nom ; aucun reset d’avatar.
2. Annulation/fermeture/passage : reprise correcte, aucune double sauvegarde ni récompense.
3. Pause et retour d’onglet : le texte n’a pas sauté toute la scène.
4. Mode lecture : caméras stables, sous-titres complets, progression manuelle.
5. Préférence de réduction des mouvements : respectée dès l’ouverture.
6. Armes : aucune démonstration d’un pouvoir absent du moteur ; coûts et limites concordent.
7. Huit premières entrées : bon pays, bon monument, absence de répétition au retour.
8. Restauration : bon état avant/après, choix jardin/atelier respecté.
9. Gardien : aucune perte de vie pendant la présentation solo.
10. Défaite, victoire et égalité : trois résultats distincts, jamais inversés.
11. Finale : la conclusion n’est acquise qu’une fois, relecture sans gains.
12. Arène avec deux appareils : aucun avantage lié à Passer, aucun tour perdu, résultats cohérents.
13. Navigation pendant une scène et changement de compte : aucun reste de la partie précédente.
14. Modèle ou réseau indisponible : information lisible et sortie possible.
15. Appareil Samsung physique : lancement, contrôle tactile, températures, mémoire, son et reprise réellement vérifiés.

Commande des tests livrés : `node --test tests/cinematic-script.test.js`. Le script de test général du dépôt (`tests/*.test.js`) les inclut automatiquement.
