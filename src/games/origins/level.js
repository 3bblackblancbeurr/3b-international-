import { rng } from '../core.js';

export const ZONES = [
  {
    name: 'L’Approche',
    from: -8,
    to: 18,
    checkpoint: { x: 0, z: 0 },
    goal: 'Éveille le symbole du Cercle Brisé.',
  },
  {
    name: 'Le Passage brisé',
    from: 18,
    to: 40,
    checkpoint: { x: 0, z: 20 },
    goal: 'Traverse les fissures et aligne les trois runes.',
  },
  {
    name: 'La Cour des Oubliés',
    from: 40,
    to: 65,
    checkpoint: { x: 0, z: 42 },
    goal: 'Libère la cour de ses ombres.',
  },
  {
    name: 'Le Cercle',
    from: 65,
    to: 92,
    checkpoint: { x: 0, z: 67 },
    goal: 'Vaincs le Gardien sans nom.',
  },
  {
    name: 'La Porte interdite',
    from: 92,
    to: 116,
    checkpoint: { x: 0, z: 95 },
    goal: 'Approche la Porte et offre les huit fragments.',
  },
];
export const ORIGINS_RUNE_ORDER = ['sun', 'moon', 'star'];
export const RUNE_NAMES = { sun: 'Soleil', moon: 'Lune', star: 'Étoile' };
export function originsDifficulty(level = 1) {
  const n = Math.max(1, Math.min(100, Math.floor(level))),
    t = (n - 1) / 99;
  return {
    level: n,
    damage: Math.round(8 + t * 8),
    health: 1 + t * 0.9,
    bossHealth: Math.round(440 + t * 440),
    windup: 1 - t * 0.22,
    extra: Math.floor(t * 3),
    par: 300 + Math.floor(t * 120),
  };
}
export function createOriginsLevel(level = 1) {
  const d = originsDifficulty(level),
    random = rng(0x3b0716 + level * 733),
    obstacles = [
      { id: 'approach-pillar-l', x: -9, z: 3, r: 1.1 },
      { id: 'approach-pillar-r', x: 9, z: 8, r: 1.1 },
      { id: 'broken-pillar', x: 5, z: 11, r: 1.15 },
      { id: 'passage-pillar-l', x: -9, z: 27, r: 1.1 },
      { id: 'passage-pillar-r', x: 9, z: 34, r: 1.1 },
      { id: 'court-pillar-l', x: -9, z: 47, r: 1.3 },
      { id: 'court-pillar-r', x: 9, z: 47, r: 1.3 },
      { id: 'court-debris', x: -6, z: 56, r: 1.1 },
      { id: 'court-debris-r', x: 7, z: 60, r: 1 },
      { id: 'circle-pillar-l', x: -11, z: 76, r: 1.3 },
      { id: 'circle-pillar-r', x: 11, z: 76, r: 1.3 },
      { id: 'gate-pillar-l', x: -8, z: 101, r: 1.5 },
      { id: 'gate-pillar-r', x: 8, z: 101, r: 1.5 },
    ];
  const pits = [
    { x: -6, z: 25, w: 9, d: 2.2 },
    { x: 6, z: 30, w: 9, d: 2.5 },
    { x: 0, z: 34, w: 4.2, d: 2.3 },
  ];
  const objects = [
    {
      id: 'first-rune',
      kind: 'rune',
      x: -6,
      z: 7,
      zone: 0,
      label: 'Éveiller le Cercle',
      symbol: 'broken',
    },
    { id: 'inscription', kind: 'inscription', x: 5, z: 23, zone: 1, label: 'Lire l’inscription' },
    { id: 'sun', kind: 'rune', x: -5, z: 37, zone: 1, label: 'Activer le Soleil', symbol: 'sun' },
    { id: 'moon', kind: 'rune', x: 0, z: 37, zone: 1, label: 'Activer la Lune', symbol: 'moon' },
    { id: 'star', kind: 'rune', x: 5, z: 37, zone: 1, label: 'Activer l’Étoile', symbol: 'star' },
    { id: 'loose-stone', kind: 'stone', x: -8, z: 12, zone: 0, label: 'Déplacer la pierre' },
    {
      id: 'secret-cache',
      kind: 'cache',
      x: -10,
      z: 14,
      zone: 0,
      label: 'Ouvrir la cache 3B',
      hidden: true,
    },
    { id: 'court-cache', kind: 'cache', x: 9, z: 57, zone: 2, label: 'Récupérer la mémoire 3B' },
    { id: 'gate', kind: 'gate', x: 0, z: 108, zone: 4, label: 'Ouvrir la Porte interdite' },
  ];
  const enemies = [
    { id: 'approach-shadow', kind: 'shadow', zone: 0, x: 3, z: 11 },
    { id: 'passage-shadow', kind: 'shadow', zone: 1, x: -5, z: 29 },
    { id: 'court-shadow-a', kind: 'shadow', zone: 2, x: -4, z: 48 },
    { id: 'court-shadow-b', kind: 'shadow', zone: 2, x: 4, z: 50 },
    { id: 'court-sentinel', kind: 'sentinel', zone: 2, x: 0, z: 57 },
    { id: 'court-shard', kind: 'corrupt', zone: 2, x: 6, z: 58 },
    { id: 'nameless', kind: 'boss', zone: 3, x: 0, z: 81 },
  ];
  for (let i = 0; i < d.extra; i++)
    enemies.push({
      id: 'reinforcement-' + i,
      kind: i % 2 ? 'corrupt' : 'shadow',
      zone: 2,
      x: (i % 2 ? 1 : -1) * (3 + random() * 3),
      z: 51 + random() * 8,
    });
  return {
    difficulty: d,
    obstacles,
    pits,
    objects,
    enemies: enemies.map((e, i) => ({
      ...e,
      r: e.kind === 'boss' ? 1.25 : e.kind === 'sentinel' ? 0.8 : 0.55,
      maxHp:
        e.kind === 'boss'
          ? d.bossHealth
          : Math.round({ shadow: 45, sentinel: 90, corrupt: 36 }[e.kind] * d.health),
      speed: { shadow: 3.4, sentinel: 1.9, corrupt: 2.6, boss: 2.1 }[e.kind],
      seed: i * 0.71,
    })),
    pickups: [
      { id: 'approach-energy', x: 6, z: 5, zone: 0 },
      { id: 'passage-energy', x: -6, z: 32, zone: 1 },
      { id: 'court-energy', x: -8, z: 61, zone: 2 },
      { id: 'gate-energy', x: 4, z: 98, zone: 4 },
    ],
  };
}
export function validOriginsRun(r, unlocked) {
  if (
    !r ||
    r.version !== 1 ||
    !Number.isInteger(r.level) ||
    r.level < 1 ||
    r.level > unlocked ||
    !Number.isInteger(r.zone) ||
    r.zone < 0 ||
    r.zone > 4
  )
    return false;
  for (const [key, max] of Object.entries({
    hp: 110,
    energy: 120,
    fragments: 8,
    score: 1e7,
    hits: 1e5,
    falls: 1e5,
    elixirs: 2,
    usedElixirs: 2,
  }))
    if (!Number.isInteger(r[key]) || r[key] < 0 || r[key] > max) return false;
  if (r.hp < 1 || !Number.isFinite(r.time) || r.time < 0 || r.time > 86400) return false;
  const level = createOriginsLevel(r.level),
    allowed = {
      defeated: level.enemies.map((e) => e.id),
      activated: ['first-rune', 'sun', 'moon', 'star'],
      opened: ['secret-cache', 'court-cache'],
      picked: level.pickups.map((p) => p.id),
      moved: ['loose-stone'],
    };
  for (const [key, ids] of Object.entries(allowed))
    if (
      !Array.isArray(r[key]) ||
      r[key].length > ids.length ||
      new Set(r[key]).size !== r[key].length ||
      r[key].some((id) => !ids.includes(id))
    )
      return false;
  const runeCount = ORIGINS_RUNE_ORDER.filter((id) => r.activated.includes(id)).length;
  if (ORIGINS_RUNE_ORDER.slice(0, runeCount).some((id) => !r.activated.includes(id))) return false;
  if (
    r.defeated.some((id) => level.enemies.find((e) => e.id === id).zone > r.zone) ||
    r.opened.some((id) => level.objects.find((o) => o.id === id).zone > r.zone) ||
    r.picked.some((id) => level.pickups.find((p) => p.id === id).zone > r.zone)
  )
    return false;
  if (r.opened.includes('secret-cache') && !r.moved.includes('loose-stone')) return false;
  if (r.zone === 0 && runeCount > 0) return false;
  if (r.zone > 0 && !r.activated.includes('first-rune')) return false;
  if (r.zone > 1 && !ORIGINS_RUNE_ORDER.every((id) => r.activated.includes(id))) return false;
  if (r.zone > 2 && !level.enemies.filter((e) => e.zone === 2).every((e) => r.defeated.includes(e.id)))
    return false;
  if (r.zone > 3 && !r.defeated.includes('nameless')) return false;
  const fragments =
    (r.activated.includes('first-rune') ? 2 : 0) +
    (ORIGINS_RUNE_ORDER.every((id) => r.activated.includes(id)) ? 2 : 0) +
    (level.enemies.filter((e) => e.zone === 2).every((e) => r.defeated.includes(e.id)) ? 2 : 0) +
    (r.defeated.includes('nameless') ? 2 : 0);
  return r.fragments === fragments;
}
