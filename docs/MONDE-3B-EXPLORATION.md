# Monde 3B — exploration et lumière

Livraison web du 11 septembre 2026. Cette évolution conserve les cartes, les quêtes,
les sauvegardes et l’arène Internet déjà présentes.

## Parcours du joueur

1. Créer son personnage au Nexus ; la silhouette, les origines et le style restent libres.
2. Choisir une des huit portes. La boussole indique le cap de la caméra ; la mini-carte
   montre bâtiments, rues, eau, ateliers, souvenirs et objectifs. La grande carte pose
   un repère que le joueur peut rejoindre automatiquement ou suivre librement.
3. Explorer la ville, rencontrer le guide du chapitre et former son équipe de cartes.
   Les deux carnets ville/campagne donnent chacun 25 XP monde et 6 éclats une seule fois.
4. Utiliser les pouvoirs Allié, Ambiance et Terrain, résoudre l’énigme du monument,
   retrouver les souvenirs et reconstruire le quartier selon les règles existantes.
5. Vaincre le gardien, terminer la restauration et faire évoluer le Nexus. Les huit
   chapitres conduisent à la finale. L’arène conserve ses statistiques de cartes équilibrées.

## Décors et apparence

- Esplanade du Nexus : pavage, anneaux, bancs, jardinières, atelier utilisable.
- Chaque pays possède des rues, un quartier artisanal, des habitations et une campagne.
  Façades, toits, balcons, portes, couleurs et cultures varient selon le pays.
- France : passages parisiens et vergers ; Italie : cours florentines et vignes ;
  Estonie : ruelles de Tallinn et forêt ; Turquie : bazar et formations rocheuses ;
  Algérie : terrasses et oasis ; Tunisie : façades blanches/bleues et oliveraies ;
  Maroc : cours et cultures en terrasses ; Espagne : patios et oliviers.
- Portails : arches extrudées, pilastres, mosaïques, décors régionaux et surface animée.
- Lumière de jour, remplissage des ombres, voile d’écran allégé. Correction des matériaux
  de personnages : tissu et peau diffus, couleurs importées neutralisées avant teinte.
- Dix looks, quatre couleurs indépendantes, cinq motifs, béret/chapeau/capuche,
  cape/écharpe/tablier et sac attachés au squelette. Disponible pour Homme et Femme.
- Équipement léger : +3 % vitesse / −5 vitalité ; renforcé : −3 % / +8 vitalité.
  Ces effets concernent l’aventure et n’affectent pas l’arène.

Ces régions sont des interprétations stylisées compactes, inspirées de lieux réels.
Elles ne constituent pas des villes reproduites à l’échelle ou une photogrammétrie.
Références officielles par région : `src/world/settlements.js` (`source`).
Cette livraison ne modifie pas le projet natif Unreal.

## Validation et déploiement

- 122 tests Node passent : progression complète des huit chapitres, récompenses uniques,
  tenue sauvegardée, déplacement, orientation, rues sèches, routes vers chaque objectif.
- Vérification navigateur : Nexus et huit pays, trajet réel vers les huit campagnes,
  récompense des carnets, carte et zoom, 20 combinaisons look/silhouette, recharge de la
  sauvegarde invitée, contrôles clavier/souris/tactile, formats 390×844 et 844×390.
- Compte temporaire : sauvegarde des nouvelles couleurs/accessoires/équipement et
  découvertes, lecture sur un autre appareil, rejets/rejouements sans double récompense,
  authentification de l’arène. Compte de vérification supprimé après les essais publics.
- Fonctions partagées `world-engine` v5 et `card-arena` v2, sans modification de schéma SQL.
  L’authentification existante et les règles de fidélité sont conservées.
- Géométries statiques regroupées par matériau, végétation instanciée, terrain partagé
  avec la carte ; ajustement automatique de résolution existant conservé.
  Les essais de format mobile ne remplacent pas un benchmark sur chaque téléphone.

Les futurs gains de fidélité restent soumis aux règles et plafonds existants du compte.
Les découvertes ajoutent des XP monde et des éclats ; elles ne créent aucune cryptomonnaie.
