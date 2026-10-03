# Crée ma Ville — mairie Matrice et systèmes municipaux

La référence artistique est la mairie 2 du tableau validé par Zakaria : atrium vitré central, ailes en terrasses végétalisées, rubans or et accents bleu Matrix. Le modèle jouable reprend ces volumes ; ce n’est pas une importation photoréaliste de l’image générée. Le même modèle procédural sert au bâtiment, à son chantier, à l’aperçu de placement et au catalogue. Les bâtiments historiques conservent leur parcelle achetée.

## Étape 1 — bâtiments et règles

- Mairie Matrice générale pour toutes les villes. Une seule mairie, même rangée ; elle reste déplaçable. Les mairies en trop deviennent des Maisons des services, avec les coordonnées, chantier et historique conservés.
- Cinq familles architecturales : Matrice, Civique, Héritage, Nexus et Horizon. Recettes distinctes pour pompiers, entretien routier, télécommunications, sports, gares et mobilier.
- 28 nouveaux types : services administratifs, police, pompiers, routes, recyclage, télécommunications, tribunal, prison, hôpital, poste, dépôt bus, gare, trottinettes, entreprises, supermarché, manufacture, piscine, tennis, basket, gymnase, musée, palais patrimonial, Maison des échanges, ateliers du bois/des métaux/numérique, Eiffel Matrix et Arc de l’Unité.
- Niveaux, prix en Coins et services définis par le serveur. Police, secours, propreté, Internet, justice et sports apparaissent progressivement dans les besoins. Chaque bâtiment doit être terminé ; les nouveaux services municipaux doivent être proches d’une route. L’entretien routier améliore la mobilité. Les monuments rares sont limités à un exemplaire.
- Aperçus du catalogue rasterisés à partir de la géométrie réelle, avec tampon de profondeur. Aucun contexte WebGL supplémentaire ni photo de concept à la place du modèle. Chargement visible, cache borné et catalogue par lots de 36.
- Inauguration : halo et particules légers, amplitude/durée selon l’importance du bâtiment ; pas de répétition de récompense ni effet rejoué au rechargement. Respect du mouvement réduit.

## Étape 2 — tracés et population

Dans Routes, choisir le type, puis deux points et Valider. Annulation/rétablissement utilisent une comparaison du plan serveur, y compris entre deux sessions.

- Routes niveau 1, électricité et conduites niveau 2, ponts et Internet niveau 4, tunnels et rails niveau 5.
- Ponts au-dessus de l’eau avec tablier, appuis et rampes. Tunnels avec entrées visibles et véhicules masqués dans leur traversée. Rails réservés sur terrain libre. Conduites souterraines visibles en mode réseau.
- L’eau et l’électricité restent distribuées automatiquement tant que le joueur n’a pas commencé leur réseau. Une fois un réseau dessiné, un chemin continu depuis une station terminée doit desservir les logements ; capacité pondérée par les logements effectivement raccordés. Même principe pour Internet.
- Trafic lié au recensement confirmé, maximum 24 véhicules représentatifs, limité à 12 sur téléphone. Bus après arrêt/dépôt terminé et proche d’une vraie route ; trottinettes après leur station. Population et densité par axe ralentissent le trafic. Les trains circulent uniquement entre au moins deux gares terminées reliées par un graphe de rails, maximum trois trains.
- Les couloirs ferroviaires et de ponts sont réservés aux transports. Les réseaux sont persistants et visibles lors des visites publiques en 3D.

## Étape 3 — maire, ressources et voisins

Ma ville → Ateliers & échanges.

- Ateliers terminés et raccordés à une route : 8 unités de matériau par jour UTC, maximum 24 par matériau, récupération serveur une fois par jour. Stock propre à la ville, indépendant du Passeport et des vrais paiements.
- Une Maison des échanges terminée dans chaque ville permet des contrats volontaires entre joueurs. La destination doit être une ville publique. Bois valeur 2, métaux 3, circuits 4 : six contrats fixes avec valeur 12 de chaque côté.
- Réservation des biens du proposant, verrouillage des villes dans un ordre déterministe, règlement unique après acceptation, restitution après annulation. Contrats expirant après 48 h ; restitution à la prochaine ouverture de l’émetteur. Création idempotente par UUID, maximum 20 offres en attente. Aucun prélèvement automatique sur le destinataire.
- Trois projets permanents au niveau 5 : +20 % eau, +20 % électricité ou +20 % logement. Matériaux consommés atomiquement et +300 XP ville attribués une seule fois. Les ressources ont une vraie utilisation après la production et l’échange.
- Trois nouveaux rendez-vous municipaux après les huit existants : ville sûre, quartiers connectés, administration et sports. Récompenses gérées par les fonctions serveur existantes.

## Validation et portée

Tests PostgreSQL/PGlite : doubles mairies, conversion conservatrice, services terminés/connectés, plans concurrentiels, raccordement des réseaux, permissions, production quotidienne, réservation/règlement unique/annulation, consommation atomique et bonus unique. Tests de géométrie partagée et transports liés aux équipements/population. Compilation et contrôles complets CI avant fusion.

Ce lot fournit une simulation de gestion volontairement simplifiée. Il ne prétend pas reproduire des embouteillages physiques complets, tous les sports, toutes les animations humaines, un réseau ferroviaire avec signalisation ou tous les intérieurs administratifs. Les essais avec deux comptes réels et sur Samsung restent nécessaires. Les prochaines améliorations doivent conserver ces règles serveur et cette source commune des modèles, plutôt que rajouter des objets sans fonction.
