export const ULTRA_WORLD = Object.freeze({
  id: 'world-3b-ultra',
  name: 'Monde du 3B · Ultra Map',
  widthMetres: 32000,
  depthMetres: 32000,
  legacyDiameterMetres: 520,
  streamCellMetres: 500,
  activeCellRadius: 1,
  hubName: 'Cité Origine',
  hubTagline: 'La grande ville où commence le voyage.',
  // 32 km × 32 km versus the former 520 m diameter playfield is roughly
  // 3,800× more surface. Only nearby cells are rendered at once.
  areaMultiplier: 3800,
});

export const MAIN_CITY_DISTRICTS = Object.freeze([
  { id: 'zero', name: 'Place Zéro', role: 'spawn', story: 'Le point de départ. Kaïs découvre que les huit valeurs ne sont pas des destinations mais les clés d’un monde à reconstruire.' },
  { id: 'atelier', name: 'Quartier des Ateliers', role: 'craft', story: 'Textile, métal, véhicules, objets et architecture 3B y sont fabriqués.' },
  { id: 'citadelle', name: 'Citadelle des Archives', role: 'story', story: 'Les fragments de mémoire récupérés dans les huit mondes y débloquent des archives et des cinématiques.' },
  { id: 'marche', name: 'Marché International', role: 'trade', story: 'Échanges, collections, ressources et objets cosmétiques.' },
  { id: 'gare', name: 'Gare des Horizons', role: 'transport', story: 'Métro, route, rail magnétique et véhicules permettent de traverser l’Ultra Map sans téléportation permanente.' },
  { id: 'prairies', name: 'Grandes Pâtures', role: 'nature', story: 'Prairies, fermes, rivières, animaux, compagnons sauvages et routes secondaires entourent la métropole.' },
  { id: 'nexus', name: 'District du Nexus', role: 'builder', story: 'Un ancien anneau de construction attend d’être retrouvé. Le Nexus mène à un autre mode : construire sa propre ville 3B.' },
]);

export const NEXUS_SITE = Object.freeze({
  id: 'nexus',
  type: 'portal',
  name: 'Nexus · Crée ta ville 3B',
  x: 92,
  z: -84,
  color: '#54d8ff',
  range: 8,
  district: 'nexus',
  destination: 'nexus-city',
});

export const COUNTRY_PORTAL_SITES = Object.freeze({
  france:   { worldX: -5100, worldZ: -2100, biome: 'métropole, littoral, Alpes, campagnes et patrimoine', gateway: 'Porte de Justice' },
  estonie:  { worldX:  6700, worldZ: -6400, biome: 'forêts boréales, îles, marais, ville médiévale et numérique', gateway: 'Porte de Sagesse' },
  espagne:  { worldX: -7600, worldZ:  3300, biome: 'plateaux, côtes, villes méditerranéennes et architecture monumentale', gateway: 'Porte de Passion' },
  italie:   { worldX:  2600, worldZ: -7100, biome: 'villes historiques, lacs, Alpes, côtes et places monumentales', gateway: 'Porte d’Espoir' },
  maroc:    { worldX: -6200, worldZ:  7200, biome: 'Atlas, médinas, désert, littoral, jardins et kasbahs', gateway: 'Porte de Noblesse' },
  algerie:  { worldX:  3900, worldZ:  8100, biome: 'Méditerranée, Casbah, Hauts Plateaux, Sahara et oasis', gateway: 'Porte de Loyauté' },
  tunisie:  { worldX:  7900, worldZ:  4200, biome: 'Carthage, médinas, littoral, désert et oasis', gateway: 'Porte de Courage' },
  turquie:  { worldX:  8500, worldZ: -900, biome: 'Bosphore, Anatolie, Cappadoce, côtes et grands bazars', gateway: 'Porte de Foi' },
});

export const COUNTRY_REALMS = Object.freeze({
  france: {
    guardian: 'Céliane', value: 'Justice', capital: 'Paris 3B',
    cities: ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Strasbourg', 'Nice'],
    landmarks: ['Tour Eiffel', 'Arc de Triomphe', 'Mont-Saint-Michel', 'Notre-Dame', 'Pont du Gard'],
    futureStyle: 'pierre claire, verre fumé, acier champagne, lignes bleu Matrix et jardins verticaux',
  },
  estonie: {
    guardian: 'Eira', value: 'Sagesse', capital: 'Tallinn 3B',
    cities: ['Tallinn', 'Tartu', 'Pärnu', 'Narva'],
    landmarks: ['Vieille ville de Tallinn', 'Toompea', 'remparts de Tallinn', 'tour de télévision de Tallinn'],
    futureStyle: 'pierre médiévale, bois sombre, verre froid, aurores numériques et réseaux lumineux',
  },
  espagne: {
    guardian: 'Diego', value: 'Passion', capital: 'Madrid 3B',
    cities: ['Madrid', 'Barcelone', 'Séville', 'Valence', 'Bilbao', 'Grenade'],
    landmarks: ['Sagrada Família', 'Alhambra', 'Palais royal de Madrid', 'Plaza de España'],
    futureStyle: 'terre cuite, métal rouge sombre, céramique, ombres franches et façades cinétiques',
  },
  italie: {
    guardian: 'Alessio', value: 'Espoir', capital: 'Roma 3B',
    cities: ['Rome', 'Milan', 'Florence', 'Venise', 'Naples', 'Turin'],
    landmarks: ['Colisée', 'Tour de Pise', 'Duomo de Milan', 'Pont du Rialto'],
    futureStyle: 'travertin, marbre, laiton champagne, lumière chaude et volumes classiques réinterprétés',
  },
  maroc: {
    guardian: 'Naël', value: 'Noblesse', capital: 'Rabat 3B',
    cities: ['Rabat', 'Casablanca', 'Marrakech', 'Fès', 'Tanger', 'Agadir'],
    landmarks: ['Mosquée Hassan II', 'Koutoubia', 'Kasbah des Oudayas', 'Bab Boujloud'],
    futureStyle: 'zellige, tadelakt, cuivre, arches, patios et géométrie lumineuse Matrix',
  },
  algerie: {
    guardian: 'Yliane', value: 'Loyauté', capital: 'Alger 3B',
    cities: ['Alger', 'Oran', 'Constantine', 'Tlemcen', 'Annaba', 'Ghardaïa'],
    landmarks: ['Maqam Echahid', 'Casbah d’Alger', 'ponts de Constantine', 'vallée du M’Zab'],
    futureStyle: 'blanc méditerranéen, pierre, cuivre, vert profond, passerelles futuristes et oasis technologiques',
  },
  tunisie: {
    guardian: 'Soraya', value: 'Courage', capital: 'Tunis 3B',
    cities: ['Tunis', 'Sousse', 'Sfax', 'Kairouan', 'Bizerte', 'Tozeur'],
    landmarks: ['Carthage', 'amphithéâtre d’El Jem', 'médina de Tunis', 'Sidi Bou Saïd'],
    futureStyle: 'blanc, bleu, pierre chaude, mosaïques, terrasses marines et énergie solaire visible',
  },
  turquie: {
    guardian: 'Émir', value: 'Foi', capital: 'Istanbul 3B',
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Konya'],
    landmarks: ['Sainte-Sophie', 'tour de Galata', 'Bosphore', 'Cappadoce'],
    futureStyle: 'dômes, pierre sombre, cuivre, verre irisé, ponts lumineux et silhouettes aériennes',
  },
});

export function ultraSectorFor(worldX, worldZ) {
  const half = ULTRA_WORLD.widthMetres / 2;
  const x = Math.max(-half, Math.min(half - 1, worldX));
  const z = Math.max(-half, Math.min(half - 1, worldZ));
  return {
    x: Math.floor((x + half) / ULTRA_WORLD.streamCellMetres),
    z: Math.floor((z + half) / ULTRA_WORLD.streamCellMetres),
  };
}

export function activeSectorKeys(worldX, worldZ) {
  const center = ultraSectorFor(worldX, worldZ);
  const keys = [];
  for (let dz = -ULTRA_WORLD.activeCellRadius; dz <= ULTRA_WORLD.activeCellRadius; dz += 1) {
    for (let dx = -ULTRA_WORLD.activeCellRadius; dx <= ULTRA_WORLD.activeCellRadius; dx += 1) {
      keys.push(`${center.x + dx}:${center.z + dz}`);
    }
  }
  return keys;
}
