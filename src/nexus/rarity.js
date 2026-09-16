export const RARITIES = Object.freeze([
  { id: 'common', name: 'Commun', percent: 70, supplyCap: null, glow: '#d7d7d7' },
  { id: 'rare', name: 'Rare', percent: 20, supplyCap: null, glow: '#69a7ff' },
  { id: 'epic', name: 'Épique', percent: 7, supplyCap: null, glow: '#b078ff' },
  { id: 'special', name: 'Spécial', percent: 2, supplyCap: null, glow: '#44e0d1' },
  { id: 'ultra-rare', name: 'Ultra rare', percent: 0.8, supplyCap: null, glow: '#ff80cc' },
  { id: 'legendary', name: 'Légendaire', percent: 0.19, supplyCap: null, glow: '#f4c860' },
  { id: 'ultimate', name: 'Ultime', percent: 0.0099999, supplyCap: 8, glow: '#ff7a45' },
  { id: 'unique', name: 'Unique', percent: 0.0000001, supplyCap: 1, glow: '#ffffff' },
]);

export const RARITY_BY_ID = Object.freeze(Object.fromEntries(RARITIES.map(item => [item.id, item])));
export const UNIQUE_ODDS = 1_000_000_000;

export function validateRarityTable(table = RARITIES) {
  const sum = table.reduce((total, rarity) => total + rarity.percent, 0);
  if (Math.abs(sum - 100) > 1e-9) throw new Error(`La table de rareté doit totaliser 100 %, reçu ${sum}.`);
  if (RARITY_BY_ID.unique.percent !== 100 / UNIQUE_ODDS) throw new Error('La rareté Unique doit rester à une chance sur un milliard.');
  return true;
}

export function rarityFromRoll(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Le tirage doit être compris entre 0 inclus et 1 exclu.');
  let cursor = 0;
  for (const rarity of RARITIES) {
    cursor += rarity.percent / 100;
    if (value < cursor) return rarity;
  }
  return RARITIES.at(-1);
}

export function rarityOddsLabel(rarity) {
  const item = typeof rarity === 'string' ? RARITY_BY_ID[rarity] : rarity;
  if (!item) return '';
  if (item.id === 'unique') return '1 chance sur 1 000 000 000';
  const odds = Math.round(100 / item.percent);
  return item.percent >= 1 ? `${item.percent}%` : `≈ 1 chance sur ${odds.toLocaleString('fr-FR')}`;
}

validateRarityTable();
