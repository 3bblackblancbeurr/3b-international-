# MONDE 3B — MASTER AAA : Hub, 8 Royaumes, 8 Gardiens

**Référence approuvée :** l'affiche « Les 8 Gardiens du Monde 3B » et le dossier maître du 7 octobre 2026.  
**Branche de travail :** `feat/world3b-guardian-realm-cinema-master-v1` depuis `b2f24fc`.  
**Principe :** la cible MASTER AAA est une exigence de production et de vérification, jamais un qualificatif octroyé à un shader, un JSON ou une illustration. Aucun passage automatique en production sans tests.

## 1. Ce qui reste canonique et inviolable

- **8 pays, 8 Gardiens, 8 valeurs, 8 Résonances, 8 fragments.** Pas de neuvième Gardien.
- **Kaïs = Porteur du Lien**, non possesseur des huit valeurs. Le Cercle Brisé se restaure lorsque leurs relations redeviennent possibles.
- Boucle jouable : **Hub → portail → pays habité → 3 souvenirs → missions et épreuve de valeur → Gardien en 3 phases → libération → fragment/Résonance → retour au Hub transformé → finale des Huit**.
- Le pays réel sert de source d'inspiration documentée aux édifices, paysages, matériaux, langues, gastronomie, métiers et vie quotidienne. L'Oubli et les Gardiens sont des inventions de fantasy, pas de la prétendue histoire secrète d'un peuple.
- Totems animaux = signes visuels pour l'instant. Décider explicitement, pays par pays, si un totem devient une apparition narrative ou un compagnon, avant de créer ses capacités.
- Les 8 800–10 500 points de vie de l'affiche sont des **statistiques illustratives non appliquées**. Une conversion de difficulté doit être testée en solo et en coop avant de changer le moteur.

## 2. Travail réel apporté par cette branche

| Réalisé dans le code | Ce que cela n'est PAS |
|---|---|
| Portails 3D : 8 signatures d'ondes animées, scintillements et réactivité à la proximité avec mode mouvement réduit et libération GPU | Une vidéo cinématique pré-rendue ni un nouvel algorithme de téléportation |
| Chorégraphie des caméras de Gardiens et panoramas de royaumes, en plusieurs plans qui reviennent à la caméra de jeu | Un motion capture, des animations faciales AAA ou huit courts métrages |
| Panoramas 3D lointains par royaume, tracés en une seule instance GPU par pays, adaptés à leur topographie | Une extension navigable au-delà de la zone de missions |
| Présentation cinéma de l'arme, du totem et de la Résonance après la révélation du Gardien | Un véritable modèle 3D humanoïde armé |
| Manifestes de production `REALM_MASTER_SPEC` et `GUARDIAN_MASTER_SPEC`, tests de cohérence | Des hectares, des quêtes ou des boss déjà générés |

**Hors de cette branche :** refonte complète des 8 modèles GLB, plateformes 50–200× déjà explorable, 8 x 3 nouvelles animations de boss, voice acting, cinématiques rendues comme des films, build Unreal/Android testé, modification des sauvegardes existantes. Ces éléments restent des étapes futures.

## 3. Mondes réellement immenses : ne pas agrandir une carte vide

Le runtime actuel définit les pays dans un disque de 260 unités de rayon et une surface 3D centrale de 1 000 × 1 000 unités. Le Hub possède un rayon de marche d'environ 486 unités. Les objectifs `areaTargetMultiplier` du manifeste sont **des ratios de surface**, non des facteurs à appliquer aveuglément au rayon. Formellement :

`targetRadius = hubWalkRadius * sqrt(targetAreaMultiple)`

Les cibles de **50 à 200 fois la surface du Hub** représentent environ **3,4 à 6,9 kilomètres de rayon** si une unité représente un mètre. Elles demandent une *architecture de zones chargées progressivement*.

### Architecture d'extension requise

1. Garder les villages et quêtes déjà présents intacts ; sauvegardes, coordonnées d'entrée, interactions et limites du combat toujours valides.
2. Découper chaque royaume en cellules de terrain (`256 m` suggérés), avec clés stables `royaume/coordX/coordZ`, génération déterministe et textures partagées.
3. **Anneau A / proche :** terrain, collisions, PNJ, animaux, intérieurs ouverts, gameplay, IA, végétation détaillée, voix spatiales.
4. **Anneau B / intermédiaire :** végétation instanciée, routes, architecture HLOD, silhouettes habitables approximées, acteurs à simulation allégée.
5. **Anneau C / horizon :** terrain ultra bas-poly ou imposteurs, végétation en masse, ciel volumétrique budgété ; **pas** de collisions ni de quêtes factices.
6. Streaming asynchrone avec file de priorités, budget GPU/CPU/VRAM, annulation si le joueur change de portail, préchargement du point d'entrée et pas de téléport dans le vide.
7. Traversées longues rendues intéressantes : routes, villages, transports, chevaux/bateaux lorsqu'ils sont effectivement implémentés, événements, dangers et points de sauvegarde.
8. Une boucle traversable est nécessaire dans **chaque** royaume avant d'annoncer sa superficie effective. Aucun lieu important ne doit être accessible uniquement par un marqueur HUD.
9. Définir budget de qualité adaptative : mobile minimum 30 FPS visés, PC 60 FPS visés, puis mesurer sur les vrais appareils. Maintenir surchauffe/mémoire et trames stables, pas seulement une capture statique.

### Progression des royaumes, sans duplication cosmétique

| Pays · Gardien | Quartiers, vie, biomes | Monument présent dans la base ; autres à produire | Arène / épreuve spécifique |
|---|---|---|---|
| **France · Céliane** | Paris des passages, Loire habitée, reliefs alpins ; cafés, transports, ateliers | Tour Eiffel ; passes, châteaux de Loire | **Tribunal des Échos** : témoignages contradictoires, parade après preuve |
| **Algérie · Yliane** | Casbah d'Alger, oasis, Kabylie ; artisans, marchés, terrasses | Mémorial du Martyr ; Casbah et oasis | **Porte des Deux Alliés** : maintenir le lien sans asservir |
| **Maroc · Naël** | Marrakech, Casablanca, Atlas ; souks, cours, jardins, villages | Mosquée Hassan II ; médinas/riads | **Cour des Serments** : protéger la vulnérabilité plutôt que chercher le DPS |
| **Tunisie · Soraya** | Sidi Bou Saïd, Carthage, El Jem ; port, poteries, oliviers | Amphithéâtre d'El Jem ; rivage/Carthage | **Passage des Vents** : fenêtres de danger et sauvetage |
| **Espagne · Diego** | Barcelone, patios de Séville, paysages andalous ; places, artisanat | Sagrada Família ; ateliers andalous | **Sept Battements** : combos propres, timing, surchauffe |
| **Italie · Alessio** | Rome, Florence, Toscane ; restauration, marchés, vignes | Colisée ; ateliers et cours historiques | **Atelier des Retours** : réparation défensive temporaire et reconstruction |
| **Turquie · Émir** | Istanbul, Cappadoce, Anatolie ; bazars, ferries, artisanat | Tour de Galata ; vallées rocheuses | **Sanctuaire des Repères** : illusions et maintien d'une orientation fiable |
| **Estonie · Eira** | Tallinn, Lahemaa, îles baltiques ; forêts, ports, tourbières | Cathédrale Alexandre-Nevski ; ville médiévale et nature | **Bois des Faux Reflets** : observation des copies, bonne fenêtre de décision |

*Attention :* chaque première colonne contient une inspiration plausible, pas l'annonce de modèles identiques aux monuments réels au centimètre près. Garder proportions/histoire et autorisations de matériaux documentées. Éviter les caricatures culturelles.

## 4. Grille de finition à répéter 8 fois (vraie production AAA)

**Personnage :** planches face/profil/dos, modèle GLB ou Unreal propre correspondant à l'affiche, visage, armure, textures PBR, cheveux/tissus, LODs, version influencée par l'Oubli et libérée, tissage des totems décidé.

**Armes :** vrai modèle de rapière / flyssa / poignards / lance-bouclier / lame de Tolède / épée-gantelet / kilij / lames baltiques, sockets main/fourreau, dégâts et collisions synchronisés, animation sans traverser le corps.

**Animations :** veille, marche, course, saut/esquive, garde/contre, 3 attaques de base, puissance, signature, blessure, phase 2/3, victoire/défaite, libération et relations sociales. Reconnaissance des attaques, plans de caméra non-obstrués, aucune transition brutale.

**Boss :** 3 phases qui changent réellement tactique, vitesse, espaces, effets et récit ; cohérence entre attaque indiquée et dégâts exécutés ; aucun doublon de fragment / sceau / récompense. Test manuel à la manette, tactile et clavier.

**Habitants :** routines distinctes par région/métier, vêtements appropriés à la scène, transports, échanges, intéractions, conversation, métiers, petits événements persistants. Ne pas créer des foule figées pour « faire vivant ».

**Cinéma :** world opening, arrivée de royaume, premier indice, épreuve de valeur, reveal du Gardien, transitions des phases, libération, retour au Hub, finale contre l'Oubli. Chaque plan doit avoir un acteur 3D, une intention de caméra, une raison sonore et visuelle, des transitions fluides et des sous-titres. La qualité film demande des assets, animation et éclairage réellement réalisés : **un CSS vignette n'est pas une vidéo cinéma**.

**Rendu uniforme :** bible matière (bleu Matrix + or champagne comme lien visuel ; palette régionale secondaire), exposition, tonemapping, PBR, matériaux de sol/eau, brouillard, particules lumineuses/ondes, shadows, animations textiles, reflets avec budget mobile. Les 8 terres se distinguent naturellement, sans niveler leurs architectures.

## 5. Plan d'intégration et critères de diffusion

| Lot | Objectif démontrable | Preuve nécessaire |
|---|---|---|
| **A** | Base intacte + portails animés + caméra 3D + profils Gardiens + arrière-plans distincts | Tests Node, build Vite, captures PC & Samsung, aucune régression des 8 portails |
| **B** | Céliane entièrement finalisée, vrai modèle et rapière, 3 phases, mission de Justice, libération et Hub | Vertical slice BOOT→HUB→FRANCE→BOSS→FRAGMENT→SAVE→RESTART ; Unreal Editor/PIE si utilisé |
| **C** | Streaming de royaume sur cellules, premier territoire 50x réellement navigable et peuplé | Trajet de frontière, point de retour, textures et collisions streamées, fps/VRAM/chauffe |
| **D** | 7 Gardiens restants à niveau, 8 environnements et 22 missions structurelles terminés | Checklist 12 critères et vidéo du gameplay effectif pour chacun |
| **E** | Hub et 8 royaumes au même niveau, scènes avant boss et finale des Huit | Jeu complet solo et coop, dialogue, rendu, audio, charge, contrôles |
| **F** | Master TEST candidat | CI verte, test Android réel, test PC, crash/reconnexion, récompenses exactly once, sécurité, accessibilité, Gold Master Unreal attesté |

### Cas de chaos à obligatoirement vérifier

Coupure réseau pendant cinématique et récompense, fermeture en phase 2, recharge pendant la libération, spam récompenses, mort avant sauvegarde, annulation d'une mission, collision hors monde, vol de commandes, veille longue, pression mémoire, changement de qualité/fenêtre, arrivée/retour répétés par chaque portail, coopération entrée/sortie, reprise après plusieurs jours.

**Conditions de vérité :** `conçu`, `codé`, `asset présent`, `rendu mesuré`, `intégré`, `testé en production` sont des états séparés. Ne jamais transformer un concept en « MASTER AAA terminé » avant les preuves. 

## 6. Fichiers à protéger et chemins d'exécution

- Identité et progression : `src/world/story-canon.js`, `guardian-values.js`, `guardian-resonances.js`, `rules.js`, `engine.js`, `mission-index.js`.
- Interface et scène actuelle : `WorldPage.jsx`, `scene.js`, `landscape.js`, `terrain.js`, `settlements.js`, `portals.js`, `hub/platform-layout.js`.
- Cette branche : `portal-energy.js`, `cinematic-framing.js`, `realm-horizons.js`, `realm-master-spec.js`, `CinematicOverlay.jsx`, `cinematic-director.css`, `story-cinematic.js`, et tests correspondants.
- Unreal : `unreal/ThreeBWorld/`; toute validation « exécutée » exige véritable lancement Editor/PIE et capture, pas uniquement `json` ou Markdown.
- Aucune carte existante, sceau ou sauvegarde ne doit être supprimé pour « simplifier » le jeu.

## 7. État réel de cette livraison

**Livré sur branche de travail :** effets portails, caméra cinématique multi-beats, panorama GPU de paysages, UI identité des Gardiens, manifeste clair des 8 cibles et tests de non-régression. **Non démontré à ce stade :** validation PC/Samsung, build publié, films quasi-cinéma, huit grands royaumes streamés, modèles humanoïdes AAA et progression complète Gold Master. L'objectif final est défini, pas simulé.
