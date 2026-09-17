import { RARITY_BY_ID } from './rarity.js';

export const NEXUS_MODE = Object.freeze({
  id: 'nexus-city-builder',
  name: 'Nexus · Crée ta ville 3B',
  subtitle: 'Un mode de construction séparé du Monde du 3B, relié au même compte, au même inventaire et aux mêmes abonnements.',
  maxPlotsFree: 36,
  maxPlotsSubscriber: 144,
  gridSize: 12,
});

export const BUILDING_LIBRARY = Object.freeze([
  { id: 'maison-3b', name: 'Maison 3B', category: 'habitation', rarity: 'common', cost: { stone: 10, wood: 14 }, footprint: [1,1], height: 1.3 },
  { id: 'atelier-3b', name: 'Atelier 3B', category: 'production', rarity: 'common', cost: { stone: 16, wood: 12 }, footprint: [2,1], height: 1.5 },
  { id: 'jardin-3b', name: 'Jardin d’union', category: 'nature', rarity: 'common', cost: { stone: 4, wood: 8 }, footprint: [1,1], height: .35 },
  { id: 'tour-matrix', name: 'Tour Matrix', category: 'habitation', rarity: 'rare', cost: { stone: 28, wood: 8 }, footprint: [1,1], height: 2.7 },
  { id: 'gare-horizon', name: 'Gare Horizon', category: 'transport', rarity: 'epic', cost: { stone: 42, wood: 18 }, footprint: [2,2], height: 1.4 },
  { id: 'hall-heritage', name: 'Hall de l’Héritage', category: 'culture', rarity: 'special', cost: { stone: 58, wood: 22 }, footprint: [2,2], height: 1.7 },
  { id: 'citadelle-bleue', name: 'Citadelle bleue', category: 'defense', rarity: 'ultra-rare', cost: { stone: 80, wood: 30 }, footprint: [3,2], height: 2.2 },
  { id: 'spire-champagne', name: 'Spire champagne', category: 'prestige', rarity: 'legendary', cost: { stone: 110, wood: 34 }, footprint: [2,2], height: 3.6 },
  { id: 'nexus-ultime', name: 'Nexus Ultime', category: 'prestige', rarity: 'ultimate', cost: { stone: 160, wood: 60 }, footprint: [3,3], height: 4.1 },
  { id: 'monolithe-unique', name: 'Monolithe Unique 3B', category: 'prestige', rarity: 'unique', cost: { stone: 250, wood: 90 }, footprint: [3,3], height: 4.8 },
].map(item => Object.freeze({ ...item, rarityInfo: RARITY_BY_ID[item.rarity] })));

export const ITEM_FAMILIES = Object.freeze([
  { id: 'objects', name: 'Objets', examples: ['mobilier', 'décoration', 'outils', 'reliques', 'éléments de construction'] },
  { id: 'skins', name: 'Skins', examples: ['ville', 'personnage', 'compagnon', 'véhicule', 'arme'] },
  { id: 'weapons', name: 'Armes', examples: ['lame', 'bâton', 'arc énergétique', 'arme de défense', 'outil de gardien'] },
  { id: 'companions', name: 'Compagnons', examples: ['animaux', 'créatures 3B', 'assistants de construction', 'gardiens'] },
  { id: 'vehicles', name: 'Transports', examples: ['moto', 'voiture', 'rail magnétique', 'drone', 'monture', 'navette'] },
]);

export const SUBSCRIPTION_BENEFITS = Object.freeze({
  free: {
    id: 'free', name: 'Libre', plotLimit: NEXUS_MODE.maxPlotsFree,
    benefits: ['construction de base', 'inventaire commun', 'portails pays découverts dans le Monde du 3B'],
  },
  premium: {
    id: 'premium', name: 'Premium 3B', plotLimit: NEXUS_MODE.maxPlotsSubscriber,
    benefits: ['plus de terrains constructibles', 'files de construction supplémentaires', 'cosmétiques d’abonnement', 'stockage de plans de ville', 'bonus d’objets sans modifier les chances Unique'],
  },
  creator: {
    id: 'creator', name: 'Creator 3B', plotLimit: NEXUS_MODE.maxPlotsSubscriber,
    benefits: ['outils de création avancés', 'plans partagés', 'présentations de ville', 'statistiques de fréquentation', 'cosmétiques créateur'],
  },
});

export function buildingById(id) {
  return BUILDING_LIBRARY.find(item => item.id === id) || BUILDING_LIBRARY[0];
}

export function buildingAccess(building, inventory = []) {
  if (['common', 'rare'].includes(building.rarity)) return true;
  return inventory.includes(building.id);
}
