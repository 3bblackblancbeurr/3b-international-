export const PENALTY_COUNTRIES = [
  { id: 'fr', name: 'France', flag: '🇫🇷', value: 'Justice' },
  { id: 'dz', name: 'Algérie', flag: '🇩🇿', value: 'Loyauté' },
  { id: 'ma', name: 'Maroc', flag: '🇲🇦', value: 'Noblesse' },
  { id: 'tn', name: 'Tunisie', flag: '🇹🇳', value: 'Courage' },
  { id: 'tr', name: 'Turquie', flag: '🇹🇷', value: 'Foi' },
  { id: 'it', name: 'Italie', flag: '🇮🇹', value: 'Espoir' },
  { id: 'es', name: 'Espagne', flag: '🇪🇸', value: 'Passion' },
  { id: 'ee', name: 'Estonie', flag: '🇪🇪', value: 'Sagesse' },
];

export const PLAYER_STYLES = {
  technicien: {
    id: 'technicien',
    name: 'Technicien',
    description: 'Contrôle très propre et Flow facile à construire, mais accélération maximale plus exigeante.',
    tuning: { control: 1.06, burst: 0.96, shot: 1, flow: 1.08 },
  },
  explosif: {
    id: 'explosif',
    name: 'Explosif',
    description: 'Premier changement de rythme très fort, au prix d’une énergie plus fragile.',
    tuning: { control: 0.98, burst: 1.07, shot: 1, flow: 0.96 },
  },
  finisseur: {
    id: 'finisseur',
    name: 'Finisseur',
    description: 'Fenêtre de frappe plus confortable, mais feintes avancées plus exigeantes.',
    tuning: { control: 0.98, burst: 0.99, shot: 1.07, flow: 0.96 },
  },
  imprevisible: {
    id: 'imprevisible',
    name: 'Imprévisible',
    description: 'Variations de rythme et gestes avancés très riches, avec une maîtrise plus difficile.',
    tuning: { control: 1, burst: 1.02, shot: 0.98, flow: 1 },
  },
  maestro: {
    id: 'maestro',
    name: 'Maestro',
    description: 'Changements de rythme supérieurs, mais exige une grande précision gestuelle.',
    tuning: { control: 1.03, burst: 1.03, shot: 0.98, flow: 0.96 },
  },
};

export const KEEPER_POWERS = {
  impulse: {
    id: 'impulse',
    name: 'Impulsion',
    cost: 50,
    durationMs: 850,
    description: 'Perturbe brièvement le contrôle adverse. Aucun déplacement forcé.',
    drawback: 'Coûte la moitié de la jauge commune.',
  },
  read: {
    id: 'read',
    name: 'Lecture',
    cost: 45,
    durationMs: 1100,
    description: 'Révèle une zone probable de frappe, jamais la cible exacte.',
    drawback: 'L’information contient volontairement une marge d’erreur.',
  },
  phantom: {
    id: 'phantom',
    name: 'Mur fantôme',
    cost: 60,
    durationMs: 1250,
    description: 'Renforce temporairement une portion du but sans la rendre infranchissable.',
    drawback: 'Le gardien perd un peu de mobilité pendant l’effet.',
  },
  anchor: {
    id: 'anchor',
    name: 'Ancrage',
    cost: 55,
    durationMs: 1500,
    description: 'Augmente la portée d’arrêt pendant une courte fenêtre.',
    drawback: 'Déplacement latéral ralenti pendant l’effet.',
  },
};

export const COMPETITIONS = [
  {
    id: '3b-nations',
    name: '3B Nations',
    scope: 'international',
    cadence: 'Fenêtres internationales de saison',
    description: 'Rencontres par pays, composées de duels 1v1 cumulés.',
  },
  {
    id: 'continental-series',
    name: '3B Continental Series',
    scope: 'international',
    cadence: 'Saison',
    description: 'Séries régionales avant les grandes finales internationales.',
  },
  {
    id: 'international-crown',
    name: 'International Crown',
    scope: 'international',
    cadence: 'Événement majeur',
    description: 'Tableau international regroupant les sélections qualifiées.',
  },
  {
    id: 'crown-of-nations',
    name: 'Crown of Nations',
    scope: 'international',
    cadence: 'Rare',
    description: 'Compétition de prestige réservée aux meilleures sélections de la saison.',
  },
];

export const SHIRT_COLORS = [
  '#08090b', '#f4f4f0', '#d8b35e', '#14385f', '#8a1538', '#1f6d43', '#702f8a', '#d04b32',
];

export const BOOT_PRESETS = [
  { id: 'classic', name: 'Classique', sole: 'standard' },
  { id: 'speed', name: 'Vitesse', sole: 'light' },
  { id: 'control', name: 'Technique', sole: 'grip' },
  { id: 'future', name: 'Futuriste', sole: 'hybrid' },
  { id: 'retro', name: 'Rétro', sole: 'standard' },
];

export const CAREER_TIERS = [
  { id: 'unknown', label: 'Inconnu', minReputation: 0 },
  { id: 'prospect', label: 'Prospect', minReputation: 80 },
  { id: 'breakthrough', label: 'Révélation', minReputation: 220 },
  { id: 'confirmed', label: 'Confirmé', minReputation: 520 },
  { id: 'star', label: 'Star', minReputation: 950 },
  { id: 'international', label: 'International', minReputation: 1500 },
  { id: 'icon', label: 'Icône', minReputation: 2400 },
];

export function careerTierFor(reputation = 0) {
  return [...CAREER_TIERS].reverse().find((tier) => reputation >= tier.minReputation) || CAREER_TIERS[0];
}

export function createDefaultPenaltyProfile(account) {
  const passport = account?.passport;
  const country = PENALTY_COUNTRIES.find((item) => item.name === passport?.country) || PENALTY_COUNTRIES[0];
  const name = String(passport?.name || account?.profile?.name || account?.profile?.handle || 'Joueur 3B').trim().slice(0, 24);
  return {
    displayName: name || 'Joueur 3B',
    shirtName: (name || '3B').toUpperCase().slice(0, 14),
    shirtNumber: 10,
    countryId: country.id,
    styleId: 'technicien',
    keeperPowers: ['read', 'anchor'],
    clubName: '',
    kit: {
      shirtPrimary: '#08090b',
      shirtSecondary: '#d8b35e',
      shorts: '#08090b',
      socks: '#08090b',
      trim: '#d8b35e',
      pattern: 'clean',
    },
    boots: {
      preset: 'control',
      upper: '#08090b',
      sole: '#d8b35e',
      laces: '#d8b35e',
    },
    celebration: 'calme',
  };
}

export function normalizePenaltyProfile(value, account) {
  const base = createDefaultPenaltyProfile(account);
  const input = value && typeof value === 'object' ? value : {};
  const countryId = PENALTY_COUNTRIES.some((item) => item.id === input.countryId) ? input.countryId : base.countryId;
  const styleId = Object.hasOwn(PLAYER_STYLES, input.styleId) ? input.styleId : base.styleId;
  const powers = Array.isArray(input.keeperPowers)
    ? [...new Set(input.keeperPowers.filter((id) => Object.hasOwn(KEEPER_POWERS, id)))].slice(0, 2)
    : base.keeperPowers;
  return {
    ...base,
    ...input,
    displayName: String(input.displayName || base.displayName).trim().slice(0, 24),
    shirtName: String(input.shirtName || base.shirtName).trim().toUpperCase().slice(0, 14),
    shirtNumber: Math.max(1, Math.min(99, Number.parseInt(input.shirtNumber, 10) || base.shirtNumber)),
    countryId,
    styleId,
    keeperPowers: powers.length === 2 ? powers : base.keeperPowers,
    clubName: String(input.clubName || '').trim().slice(0, 40),
    kit: { ...base.kit, ...(input.kit || {}) },
    boots: { ...base.boots, ...(input.boots || {}) },
  };
}

export function countryById(id) {
  return PENALTY_COUNTRIES.find((country) => country.id === id) || PENALTY_COUNTRIES[0];
}
