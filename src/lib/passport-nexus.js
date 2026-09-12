// The Nexus reads the world's guardian seals, never XP, visits or runner keys.
// Keep these identifiers aligned with src/world/catalog.js.
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

export function nexusProgress(save) {
  const seals = new Set(Array.isArray(save?.seals) ? save.seals : []);
  const keys = NEXUS_DOORS.filter(door => seals.has(door.region)).map(door => door.region);
  return { keys, count: keys.length, total: NEXUS_DOORS.length,
    originUnlocked: keys.length === NEXUS_DOORS.length };
}

export function nexusTravelCommands(save, region) {
  if (!REGIONS.has(region)) throw new Error("Cette porte ne correspond à aucun pays du Monde 3B.");
  if (!save || (save.region !== "hub" && !REGIONS.has(save.region))) {
    throw new Error("La sauvegarde du monde n’est pas encore disponible.");
  }
  const encounter = save.adventure?.encounter;
  if (encounter && !encounter.result) {
    throw new Error("Une rencontre est en cours. Reprends le monde pour la terminer ou te replier avant de changer de pays.");
  }
  if (save.region === region) return [];
  // The existing engine requires a stop in the hub between countries.
  return [
    ...(save.region === "hub" ? [] : [{ type: "visit", region: "hub" }]),
    { type: "visit", region },
  ];
}

/**
 * Use the existing command journal and synchronization, not arbitrary save totals.
 * `isActive` prevents a late load from modifying another session, and a late
 * synchronization from navigating after the player closed the Nexus.
 * Dependencies are injected so error, offline and cancellation paths are testable.
 */
export async function commitNexusTravel({ uid, region, store, isActive = () => true }) {
  if (!REGIONS.has(region)) throw new Error("Porte inconnue.");
  if (!isActive()) return null;
  const loaded = await store.loadWorld(uid);
  if (!isActive()) return null;
  const commands = nexusTravelCommands(loaded.data, region);
  let data = loaded.data;
  for (const command of commands) data = store.recordWorldAction(uid, data, command);
  // recordWorldAction intentionally journals first; explicitly detect a failed
  // local snapshot instead of pretending that a guest's destination was saved.
  if (!store.writeLocal(uid, data, true)) {
    throw new Error("Le stockage de cet appareil est indisponible. Le passage n’a pas été confirmé ; réessaie après avoir libéré de l’espace.");
  }
  const result = await store.saveWorld(uid, data);
  if (!isActive()) return null;
  const confirmed = result.data || data;
  if (confirmed.region !== region) {
    throw new Error(result.message || "Le monde n’a pas confirmé cette destination. Réessaie depuis le Nexus.");
  }
  return { data: confirmed, pending: Boolean(result.pending), message: result.message || loaded.message || "" };
}
