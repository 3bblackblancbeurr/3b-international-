// Presentation metadata only. Never grants keys, XP or access to locked chapters.
export const NEXUS_WORLDS = Object.freeze([
  { code: 'FR', id: 'france', country: 'France', value: 'Justice', guardian: 'Céliane', number: '01', color: '#79bdff', architecture: 'La flèche de verre', description: 'Des arches de pierre, une structure de métal et la lumière bleue de la Justice.' },
  { code: 'DZ', id: 'algerie', country: 'Algérie', value: 'Loyauté', guardian: 'Yliane', number: '02', color: '#61dac1', architecture: 'Les trois élévations', description: 'Trois voiles minérales se rejoignent au-dessus d’un jardin de lumière.' },
  { code: 'ES', id: 'espagne', country: 'Espagne', value: 'Passion', guardian: 'Diego', number: '03', color: '#edab82', architecture: 'Les tours de braise', description: 'Des flèches sculptées et une pierre chaude traversées d’une énergie ambrée.' },
  { code: 'MA', id: 'maroc', country: 'Maroc', value: 'Noblesse', guardian: 'Naël', number: '04', color: '#e1bf7d', architecture: 'Le palais des étoiles', description: 'Un passage en fer à cheval, des remparts et des motifs géométriques dorés.' },
  { code: 'IT', id: 'italie', country: 'Italie', value: 'Espoir', guardian: 'Alessio', number: '05', color: '#b4ccff', architecture: 'Les arches éternelles', description: 'Une couronne d’arcades romaines suspendue entre la mémoire et l’avenir.' },
  { code: 'TN', id: 'tunisie', country: 'Tunisie', value: 'Courage', guardian: 'Soraya', number: '06', color: '#efbfad', architecture: 'Le théâtre des mémoires', description: 'Des gradins de pierre claire, des colonnes et l’horizon d’une cité méditerranéenne.' },
  { code: 'TR', id: 'turquie', country: 'Turquie', value: 'Foi', guardian: 'Émir', number: '07', color: '#b6a5f4', architecture: 'La coupole céleste', description: 'Une grande coupole et quatre tours fines dessinées dans un ciel indigo.' },
  { code: 'EE', id: 'estonie', country: 'Estonie', value: 'Sagesse', guardian: 'Eira', number: '08', color: '#99dbe1', architecture: 'La citadelle boréale', description: 'Des remparts nordiques et des toits élancés baignés d’une aurore digitale.' },
]);

export function resolveNexusWorld(code) {
  return NEXUS_WORLDS.find(world => world.code === code) || null;
}

export function nexusGatePosition(index) {
  const angle = -1.13 + Math.max(0, Math.min(7, index)) * 2.26 / 7;
  return { x: Math.sin(angle) * 17, z: 3 - Math.cos(angle) * 17 };
}

export function nexusPixelRatio(width, dpr = 1, quality = 'auto') {
  const finite = Number.isFinite(dpr) ? dpr : 1;
  return Math.max(1, Math.min(finite, quality === 'light' ? 1 : width < 760 ? 1.35 : 1.75));
}

// Keep the established handoff; country travel remains governed by the world.
export function rememberNexusCountry(storage, code) {
  if (!resolveNexusWorld(code)) return false;
  try { storage.setItem('3b:nexus-country', code); return true; } catch { return false; }
}
