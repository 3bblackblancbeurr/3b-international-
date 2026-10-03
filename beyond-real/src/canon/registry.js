export const FOUNDATION_VERSION = '0.4.0';

export const HERO = Object.freeze({
  id: 'character.kais',
  name: 'Kaïs',
  role: 'Porteur du Lien',
});

export const WORLDS = Object.freeze({
  france: Object.freeze({ worldId: 'world.france', portalId: 'portal.france', guardianId: 'guardian.france.celiane', guardianName: 'Céliane', fragmentId: 'fragment.justice', value: 'Justice' }),
  algerie: Object.freeze({ worldId: 'world.algerie', portalId: 'portal.algerie', guardianId: 'guardian.algerie.yliane', guardianName: 'Yliane', fragmentId: 'fragment.loyaute', value: 'Loyauté' }),
  espagne: Object.freeze({ worldId: 'world.espagne', portalId: 'portal.espagne', guardianId: 'guardian.espagne.diego', guardianName: 'Diego', fragmentId: 'fragment.passion', value: 'Passion' }),
  maroc: Object.freeze({ worldId: 'world.maroc', portalId: 'portal.maroc', guardianId: 'guardian.maroc.nael', guardianName: 'Naël', fragmentId: 'fragment.noblesse', value: 'Noblesse' }),
  italie: Object.freeze({ worldId: 'world.italie', portalId: 'portal.italie', guardianId: 'guardian.italie.alessio', guardianName: 'Alessio', fragmentId: 'fragment.espoir', value: 'Espoir' }),
  tunisie: Object.freeze({ worldId: 'world.tunisie', portalId: 'portal.tunisie', guardianId: 'guardian.tunisie.soraya', guardianName: 'Soraya', fragmentId: 'fragment.courage', value: 'Courage' }),
  turquie: Object.freeze({ worldId: 'world.turquie', portalId: 'portal.turquie', guardianId: 'guardian.turquie.emir', guardianName: 'Émir', fragmentId: 'fragment.foi', value: 'Foi' }),
  estonie: Object.freeze({ worldId: 'world.estonie', portalId: 'portal.estonie', guardianId: 'guardian.estonie.eira', guardianName: 'Eira', fragmentId: 'fragment.sagesse', value: 'Sagesse' }),
});

export const ACHIEVEMENTS = Object.freeze({
  firstPortal: 'achievement.br.first_portal',
  firstMeetingKais: 'achievement.br.first_meeting_kais',
  firstFragment: 'achievement.br.first_fragment',
  prototype000: 'achievement.br.prototype_000_complete',
});

export const CANONICAL_IDS = Object.freeze([
  HERO.id,
  ...Object.values(WORLDS).flatMap(world => [world.worldId, world.portalId, world.guardianId, world.fragmentId]),
  ...Object.values(ACHIEVEMENTS),
]);

const idSet = new Set(CANONICAL_IDS);
if (idSet.size !== CANONICAL_IDS.length) throw new Error('Beyond Real canonical IDs must be unique.');

export function isCanonicalId(value) {
  return typeof value === 'string' && idSet.has(value);
}

export function assertCanonicalId(value) {
  if (!isCanonicalId(value)) throw new Error(`Unknown 3B canonical ID: ${value}`);
  return value;
}

export function canonicalWorld(region) {
  return WORLDS[region] || null;
}
