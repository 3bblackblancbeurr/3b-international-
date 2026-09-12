// The public app mounts WorldEntry -> ORIGINS. Its save is NOT world/save.js.
export const NEXUS_DOORS = Object.freeze([
  { code: "FR", region: "france", country: "France", value: "Justice", number: "01" },
  { code: "DZ", region: "algerie", country: "Algérie", value: "Loyauté", number: "02" },
  { code: "ES", region: "espagne", country: "Espagne", value: "Passion", number: "03" },
  { code: "MA", region: "maroc", country: "Maroc", value: "Noblesse", number: "04" },
  { code: "IT", region: "italie", country: "Italie", value: "Espoir", number: "05" },
  { code: "TN", region: "tunisie", country: "Tunisie", value: "Courage", number: "06" },
  { code: "TR", region: "turquie", country: "Turquie", value: "Foi", number: "07" },
  { code: "EE", region: "estonie", country: "Estonie", value: "Sagesse", number: "08" },
].map(Object.freeze));
const REGIONS = new Set(NEXUS_DOORS.map(door => door.region));

// Audited producers: origins/state.js emits flags.justice when the real fragment
// is collected. regional-life.js emits supplies/restored/wins, NOT guardian keys.
// Add the other readers only alongside actual, tested quest/key producers.
const KEY_READERS = Object.freeze({ france: save => save?.flags?.justice === true });
export function nexusProgress(save) {
  const implemented = Object.keys(KEY_READERS);
  const keys = implemented.filter(region => KEY_READERS[region](save));
  return { keys, count: keys.length, total: NEXUS_DOORS.length, implemented,
    missingKeyHooks: NEXUS_DOORS.filter(door => !implemented.includes(door.region)).map(door => door.region),
    originUnlocked: implemented.length === NEXUS_DOORS.length && keys.length === NEXUS_DOORS.length };
}

/** A passport journey changes location, not quests, keys, equipment or rewards. */
export function nexusTravelState(save, region, spawn) {
  if (!REGIONS.has(region)) throw new Error("Cette porte ne correspond à aucun pays du Monde 3B.");
  if (!save || (save.zone !== "sanctuary" && !REGIONS.has(save.zone))) {
    throw new Error("La sauvegarde ORIGINS n’est pas encore disponible.");
  }
  if (save.avatar?.created !== true) throw new Error("Crée d’abord ton personnage dans le Monde 3B, puis reviens au passeport.");
  if (save.flags?.awakened !== true) throw new Error("Éveille d’abord le Cercle Brisé au centre du Sanctuaire. Le passeport ne remplace pas cette première étape.");
  if (save.combat?.active === true) throw new Error("Termine la rencontre avant de changer de pays.");
  if (save.zone === region) return save;
  if (!Number.isFinite(spawn?.x) || !Number.isFinite(spawn?.z)) throw new Error("Le point d’arrivée de cette porte est indisponible.");
  return { ...save, zone: region, position: { x: spawn.x, z: spawn.z } };
}

/** Inject the ORIGINS adapter. No old-engine action journal, no cross-save merge. */
export async function commitNexusTravel({ uid, region, store, isActive = () => true }) {
  if (!REGIONS.has(region)) throw new Error("Porte inconnue.");
  if (!isActive()) return null;
  const loaded = await store.loadWorld(uid);
  if (!isActive()) return null;
  const data = nexusTravelState(loaded.data, region, store.spawns?.[region]);
  if (data === loaded.data) return { data, message: loaded.message, local: true };
  const result = await store.saveWorld(uid, data);
  if (!isActive()) return null;
  if (!result?.ok) throw new Error("Le stockage de cet appareil est indisponible. Le passage n’a pas été confirmé.");
  if (result.data?.zone !== region) throw new Error("La sauvegarde ORIGINS n’a pas confirmé cette destination.");
  return { data: result.data, message: result.message || loaded.message || "", local: true };
}
