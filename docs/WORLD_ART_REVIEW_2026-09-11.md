# Monde 3B — patrimoine, lieux utiles et combat

## Direction et livraison

Les images fournies montrent une rencontre entre patrimoine local et architecture contemporaine 3B : pierre claire, verre sombre, détails métalliques, végétation et places habitées. Ce sont des références artistiques. Le rendu livré reste une interprétation stylisée en temps réel, pas une reproduction photographique de ces images.

Les huit pays restent ouverts après leurs chapitres. La boucle jouable demeure : explorer, créer des liens, préparer les compagnons, récolter, construire le refuge et réussir de nouvelles expéditions pour renouveler les ressources. Les bâtiments ajoutés donnent un emplacement visible à des fonctions réellement disponibles.

| Manque observé | Modification réalisée |
| --- | --- |
| Monuments génériques sans silhouette locale | Huit modèles géométriques distincts, intégrés aux décors et aux points d’intérêt de l’Atlas. |
| Monuments posés dans l’herbe | Parvis pavés, chemins d’approche, réservations de terrain et bâtiments voisins espacés. |
| Collisions trop larges autour des monuments ouverts | Piliers séparés pour la tour Eiffel et le Mémorial ; empreintes adaptées aux autres silhouettes. |
| Relief lointain en grandes parois artificielles | Relief borné et progressif au-delà de la zone jouable, ciel gradué et nuages. |
| Peu de différence entre logement et service public | Archives 3B dans les huit pays ; nouveaux pavillons d’atelier dans six pays. Le riad marocain et l’atelier du Nexus sont conservés. |
| Atelier sans identité lisible | Verrières, meneaux, auvents, piliers, enseignes intégrées et espace central accessible. |
| Effet identique pour presque chaque action | Arcs de frappe, projection de lumière/nature, éclairs, croissant d’ombre, parade, esquive, soutien, piège et impacts. |
| Riposte visuelle après la fin de la rencontre | Les effets utilisent la transition acceptée : une victoire, un apaisement ou un piège ne déclenche plus de riposte fictive. |
| Piège et soutien contournant la cadence des boutons principaux | Toutes les actions partagent le même délai et la même désactivation, avec disposition adaptée aux petits écrans. |
| Panorama imposé pendant la marche | Vue de monument disponible sur demande, interruptible ; le zoom d’exploration est conservé. |

Les archives gardent la récompense existante de découverte, une seule fois. Les ateliers ouvrent la vraie personnalisation. Le refuge conserve ses constructions et son économie. Aucun gain d’XP, portefeuille ou paiement fictif n’est ajouté par un effet visuel. L’inauguration du pays rallume le parvis ; le monument reste reconnaissable avant cette étape.

## Références patrimoniales

| Pays | Interprétation du monument | Documentation |
| --- | --- | --- |
| France | Tour Eiffel : piliers évasés, treillis, plateformes | [Site officiel](https://www.toureiffel.paris/fr/le-monument/histoire) |
| Italie | Colisée : plan elliptique et trois niveaux d’arcades | [Parc archéologique](https://colosseo.it/en/area/the-colosseum/) |
| Estonie | Cathédrale Alexandre-Nevski : cinq coupoles et arcatures | [Visit Tallinn](https://visittallinn.ee/eng/visitor/see-do/things-to-do/attractions-museums/307/alexander-nevsky-cathedral) |
| Turquie | Tour de Galata : fût cylindrique, galerie et toit conique | [Go Türkiye](https://goturkiye.com/istanbul/blog/3-historical-towers-of-istanbul) |
| Algérie | Mémorial du Martyr : trois palmes convergentes | [Archives photographiques du MIT](https://dome.mit.edu/handle/1721.3/111924), [publication de l’ambassade d’Algérie](https://www.ambassade-algerie.ch/exposition_culturelle/medias/encyclotimbrefr.pdf) |
| Tunisie | Amphithéâtre d’El Jem : arcades ocres et secteur ouvert | [UNESCO](https://whc.unesco.org/en/list/38/) |
| Maroc | Mosquée Hassan II : minaret carré, ornements et toits verts | [Fondation Hassan II](https://fmh2.ma/en/mosque/outbuildings/minaret) |
| Espagne | Sagrada Família : tours effilées et contreforts | [Site officiel](https://sagradafamilia.org/en/history-of-the-temple) |

Chaque monde rassemble plusieurs lieux du pays. Florence/Rome, Séville/Barcelone ou Marrakech/Casablanca ne sont pas présentées comme une seule ville réelle. Les bâtiments 3B sont fictifs ; aucun logo n’est apposé sur les lieux patrimoniaux.

## Technique et vérification

Les nouveaux modèles sont construits dans Three.js, puis fusionnés par matériau. Ils réutilisent les personnages et décors Blender déjà intégrés. Ce lot n’a pas utilisé Houdini, Unreal ni un service payant. Les effets réutilisent leurs géométries, dont des segments instanciés pour les éclairs ; les ressources graphiques sont libérées lors du changement de pays. Le ciel utilise une passe simple, sans ray marching volumétrique. Les effets respectent la préférence de réduction des mouvements.

Validation : tests de règles, accès à chaque interaction dans les neuf régions, accès après construction du refuge, empreintes et budgets des huit monuments, transitions de combat, compilation de production. Essais du parcours réel Atlas → marche → monument → panorama → atelier → archives → récolte → combat, ainsi que pause/reprise et commandes dans un écran de 390 × 844. Le relevé de fluidité concerne le GPU de l’ordinateur de test ; une taille d’écran mobile ne remplace pas un essai sur téléphone physique.

## Limites encore visibles et ordre de travail

1. **Architecture et matériaux.** Les monuments sont stylisés ; les façades résidentielles se répètent encore. Pour se rapprocher des références : davantage de modules de façade, toitures, matériaux de pierre/bois/textile et accessoires propres à chaque rue. Les intérieurs et les étages des monuments ne sont pas visitables.
2. **Créatures et animation.** Les silhouettes sources sont conservées, mais leurs animations restent plus simples que les illustrations. Il manque des mouvements propres à chaque anatomie, des réactions au sol et un meilleur raccord entre main et attaque.
3. **Vie des quartiers.** Les habitants marchent et des services sont utilisables. Il manque des activités autonomes, des variations de fréquentation et des événements qui transforment durablement un quartier. Un bâtiment « hôpital », « université » ou « police » sans fonction ne doit pas être ajouté comme un faux service.
4. **Combat.** Il reste fondé sur des décisions successives. Les nouveaux effets améliorent sa lecture ; ils ne constituent pas une refonte en combat d’action continu. Une telle refonte demanderait de revoir les collisions d’attaque, le rythme, l’IA et les règles réseau ensemble.
5. **Survie et construction.** La boucle d’expéditions est répétable. Les types de constructions et les interactions environnementales restent limités ; agriculture, ateliers et logement peuvent gagner en profondeur sans rendre les tâches quotidiennes obligatoires.
6. **Réseau et téléphone.** L’arène existante est distincte du monde partagé. La coopération libre sur Internet n’est pas livrée par ce lot. Les budgets graphiques doivent aussi être mesurés sur de vrais appareils modestes avant toute promesse de fréquence d’images.

Ces points restent du travail à réaliser. La présente livraison apporte des améliorations jouables et vérifiées ; elle ne clôt pas la production d’un jeu de niveau grand studio.
