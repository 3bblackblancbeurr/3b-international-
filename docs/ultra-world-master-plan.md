# 3B Ultra World — Master plan

## Canon
Le Monde du 3B possède une immense carte principale : **Cité Origine**. Le Nexus n'est plus un hub de voyage. Les huit Portes-pays sont dispersées dans Cité Origine. Le Nexus est un neuvième passage, caché puis débloqué par l'histoire, qui mène au mode séparé **Crée ta ville 3B**.

## Architecture de Cité Origine
La taille logique cible est 16 km x 16 km. Le client ne charge jamais cette surface en une fois : grille de chunks de 256 m, anneau actif 3x3 sur mobile et 5x5 sur appareils puissants. LOD 0 < 80 m, LOD 1 < 220 m, LOD 2 < 600 m, silhouettes/imposteurs au-delà. Les simulations habitants/IA sont actives uniquement dans le chunk joueur et les chunks adjacents. Les coordonnées mondiales restent stables afin que portails, quêtes et sauvegardes ne dépendent pas du streaming.

### Zones principales
- Origine Central : skyline 3B, gare suspendue, marché, ateliers, place du Cercle.
- Ceinture des Héritages : quartiers résidentiels, musées, centres communautaires.
- Plaine des Ouvriers : pâtures, fermes, hangars réinterprétés, routes secondaires.
- Hautes Terres : montagnes, mines, belvédères, tunnels.
- Rives Matrix : fleuve, canaux, port futuriste, passerelles.
- Forêt des Échos : exploration, compagnons, secrets.
- Friches du Cercle : combats, ruines, événements.
- Couronne extérieure : grandes distances, véhicules, événements dynamiques.

## Portails
Les portails sont des destinations physiques et non des boutons de menu.
- France : (-2450, -1180) — quartier ferroviaire / Justice.
- Italie : (1880, -2680) — terrasses / Espoir.
- Estonie : (3260, -720) — forêt boréale / Sagesse.
- Turquie : (2750, 2260) — observatoire / Foi.
- Algérie : (720, 3380) — oasis / Loyauté.
- Tunisie : (-980, 3060) — rivage / Courage.
- Maroc : (-3060, 1420) — hautes terres / Noblesse.
- Espagne : (-3380, -1540) — falaises / Passion.
- Nexus : (0, -3420), invisible au départ. Il apparaît après la quête « Le Cercle sous la ville » et devient traversable après l'activation des huit relais d'Origine. Il mène uniquement au constructeur de ville.

## Progression Nexus
1. Arrivée à Cité Origine et première cinématique.
2. Découverte libre de la ville et des huit relais.
3. Chaque relais révèle un fragment du Cercle sans obliger à terminer le monde-pays correspondant.
4. Les 8 relais activés révèlent l'entrée souterraine du Nexus.
5. Cinématique : descente, Cercle brisé, activation du portail.
6. Traversée → écran premium « CRÉE TA VILLE 3B » → COMMENCER.
7. Création d'une parcelle persistante. Le Nexus ne remplace jamais les huit Portes-pays.

## Huit mondes-pays
Chaque monde est une interprétation futuriste 3B inspirée de plusieurs paysages et architectures, pas une copie géographique exacte.
- France : Paris/passages, Loire/vergers, Alpes ; Céliane ; Justice ; mémoire des noms.
- Italie : Florence, Toscane, Venise stylisée ; Alessio ; Espoir ; jardins suspendus.
- Estonie : Tallinn, Lahemaa, côte baltique ; Eira ; Sagesse ; aurores et archives.
- Turquie : Istanbul, Cappadoce, côte égéenne ; Émir ; Foi ; ciel partagé.
- Algérie : Alger, Casbah réinterprétée, Sahara/oasis ; Yliane ; Loyauté ; eau et mémoire.
- Tunisie : Carthage, Sidi Bou Saïd, oliveraies/rivage ; Soraya ; Courage ; marées de l'histoire.
- Maroc : Marrakech/Fès réinterprétés, Atlas, jardins ; Naël ; Noblesse ; souffle des cimes.
- Espagne : Séville/Barcelone réinterprétées, Andalousie/falaises ; Diego ; Passion ; phare et engrenages.

Chaque pays doit contenir : capitale/quartier dense, zone rurale, zone naturelle, monument majeur réinterprété, village, donjon/ruine, habitants nommés, gardien, compagnon, 3 missions principales, 6 secondaires, 8 secrets, 1 cinématique d'arrivée, 1 cinématique gardien et 1 cinématique de restauration.

## Crée ta ville 3B
Boucle : choisir parcelle → placer routes → zones → bâtiments → services → décorations → habitants → améliorer → événements.
Outils : placer, déplacer, rotation 15°, dupliquer, supprimer avec confirmation, annuler/rétablir, grille activable, collision, aperçu coût, mode photo. Sauvegarde serveur versionnée + copie locale de secours. Les modifications sont envoyées par lots et validées côté serveur.

### Familles de construction
Résidentiel, commerce, atelier, culture, sport, transport, énergie, eau, nature, défense/événement, monuments. Chaque pays fournit un kit architectural compatible avec la même grille de construction.

## Objets et raretés
Familles : skins, tenues, armes de jeu, compagnons, véhicules, outils, plans de construction, décorations, effets, badges.
Raretés : Commun, Rare, Épique, Spécial, Ultra rare, Légendaire, Ultime, Unique.
Poids serveur de référence sur 1 milliard : 700000000 / 200000000 / 70000000 / 20000000 / 8000000 / 1900000 / 99999 / 1. **Ultime : 8 exemplaires mondiaux maximum par objet concerné. Unique : 1 exemplaire mondial maximum.** L'attribution doit être atomique en base. Aucun tirage payant n'est activé tant que la conformité et le modèle commercial ne sont pas validés.

## Abonnements
Les abonnements peuvent accorder des avantages de confort/cosmétique prévus par le produit : emplacements de sauvegarde supplémentaires, thèmes de ville, statistiques avancées, files de construction de confort, cosmétiques identifiés. Aucun abonnement ne doit augmenter la probabilité Unique/Ultime ni contourner les caps mondiaux. Paiements réels désactivés pour l'instant.

## Télémétrie
Compteurs : installation détectée, session active, actifs 15 min, plateforme, version app, zone de jeu agrégée. Pas d'IP stockée par le système applicatif, pas de GPS analytique, pas de coordonnées précises. Présence expirée automatiquement.

## Budget performances
Android milieu de gamme : cible 30 FPS, <= 650 Mo mémoire, <= 140 draw calls en exploration, textures visibles <= 220 Mo, chunks actifs 3x3. Android haut de gamme/PC : 60 FPS cible, 5x5 chunks, ombres et LOD étendus. Chargement initial Monde <= 12 s sur réseau mobile raisonnable après installation ; transition portail <= 8 s avec préchargement. Aucun monde complet n'est empaqueté en mémoire simultanément.

## Tests obligatoires avant fusion
- navigation Cité Origine → chacun des 8 portails → retour ;
- Nexus inaccessible avant conditions, accessible après ;
- Nexus mène au constructeur, jamais à un pays ;
- placement/rotation/déplacement/suppression/sauvegarde/rechargement ville ;
- caps Ultime/Unique atomiques sous concurrence ;
- présence et installations sans données personnelles superflues ;
- reprise hors ligne locale puis synchronisation ;
- 30 min d'exploration Android sans fuite mémoire majeure ;
- build web, tests Node, Capacitor Android/iOS, Vercel preview ;
- aucune activation Stripe Live.
