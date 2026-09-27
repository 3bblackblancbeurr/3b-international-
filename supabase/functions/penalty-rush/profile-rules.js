export const SKIN_TONES = ['#f6d7c3','#e8b894','#cc926a','#a66b48','#805137','#563624','#35251e'];
export const HAIR_COLORS = ['#171412','#503322','#91613b','#d6b66d','#b54e2b','#c6c3bd'];
export const HAIR_STYLES = ['short','cropped','textured','long','bald'];
export function normalizeAppearance(value = {}) {
  const pick = (list, value, fallback) => list.includes(value) ? value : fallback;
  return {
    skin: pick(SKIN_TONES, value?.skin, SKIN_TONES[3]),
    hairColor: pick(HAIR_COLORS, value?.hairColor, HAIR_COLORS[0]),
    hairStyle: pick(HAIR_STYLES, value?.hairStyle, 'short'),
  };
}
export function rankedDivision(rating = 1000, games = 0) {
  if (games < 10) return {id:'placement',label:'Placement',remaining:Math.max(0,10-games)};
  const score = Number.isFinite(Number(rating)) ? Number(rating) : 1000;
  return [...[{id:'bronze',label:'Bronze',min:0},{id:'silver',label:'Argent',min:1000},{id:'gold',label:'Or',min:1200},{id:'platinum',label:'Platine',min:1400},{id:'diamond',label:'Diamant',min:1600},{id:'elite',label:'Élite',min:1800}]].reverse().find(d=>score>=d.min);
}
export function ratingWindow(waitMs = 0) {
  return Math.min(400,100+Math.floor(Math.max(0,Number(waitMs)||0)/15000)*50);
}
