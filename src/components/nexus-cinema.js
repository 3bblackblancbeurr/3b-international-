// Presentation-only data. The canonical world engine remains the source of progress.
export const NEXUS_CINEMA_VERSION = 'cinema-reference-20260913';
export const NEXUS_CINEMA_ASSETS = '/nexus/cinema-v1';
export const NEXUS_CINEMA_SIZE = Object.freeze({ width: 941, height: 1116 });
export const NEXUS_CINEMA_GATES = Object.freeze({
  FR: [90, 100, 185, 365], DZ: [282, 139, 164, 330],
  ES: [498, 139, 170, 330], MA: [684, 100, 175, 365],
  IT: [7, 460, 163, 331], TN: [181, 474, 139, 316],
  TR: [620, 474, 146, 316], EE: [786, 460, 148, 332],
});
export function nexusDoorImage(code) {
  return Object.hasOwn(NEXUS_CINEMA_GATES, code) ? `${NEXUS_CINEMA_ASSETS}/${code}.webp` : null;
}
export function nexusHotspotStyle(code) {
  const box = NEXUS_CINEMA_GATES[code];
  if (!Object.hasOwn(NEXUS_CINEMA_GATES, code) || !box) return null;
  return { left: `${box[0] / 941 * 100}%`, top: `${box[1] / 1116 * 100}%`, width: `${box[2] / 941 * 100}%`, height: `${box[3] / 1116 * 100}%` };
}
