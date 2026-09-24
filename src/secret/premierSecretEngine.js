export const COUNTRIES = [
  { id: "france", name: "France", glyph: "◇", pulses: 3, value: "Justice" },
  { id: "algerie", name: "Algérie", glyph: "△", pulses: 2, value: "Loyauté" },
  { id: "espagne", name: "Espagne", glyph: "✧", pulses: 3, value: "Passion" },
  { id: "maroc", name: "Maroc", glyph: "⬡", pulses: 2, value: "Noblesse" },
  { id: "italie", name: "Italie", glyph: "◈", pulses: 3, value: "Espoir" },
  { id: "tunisie", name: "Tunisie", glyph: "☽", pulses: 2, value: "Courage" },
  { id: "turquie", name: "Turquie", glyph: "⌁", pulses: 3, value: "Foi" },
  { id: "estonie", name: "Estonie", glyph: "⊕", pulses: 2, value: "Sagesse" },
];

export const TRANSMISSION_TOKENS = ["☽", "△", "☀", "◇"];
export const ARCHIVE_VALUES = ["Mémoire", "Courage", "Transmission", "Unité"];
export const SLOT_NAMES = ["Nord", "Est", "Sud", "Ouest"];

function rotate(items, offset) {
  const safe = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(safe), ...items.slice(0, safe)];
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function parisDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return [values.year, values.month, values.day].join("-");
}

export function makePremierSecretConfig(dayKey = parisDayKey()) {
  const seed = fnv1a("3B-PREMIER-SECRET-" + dayKey);
  const signalIndex = seed % COUNTRIES.length;
  const country = COUNTRIES[signalIndex];

  let transmission = rotate(TRANSMISSION_TOKENS, (seed >>> 4) % TRANSMISSION_TOKENS.length);
  if ((seed >>> 9) & 1) {
    transmission = [transmission[0], transmission[2], transmission[1], transmission[3]];
  }

  const ringTargets = [
    (seed >>> 3) % 8,
    (seed >>> 8) % 8,
    (seed >>> 13) % 8,
  ];
  const ringStart = ringTargets.map((value, index) => (value + 3 + index) % 8);

  let archiveOrder = rotate(ARCHIVE_VALUES, (seed >>> 18) % ARCHIVE_VALUES.length);
  if ((seed >>> 23) & 1) {
    archiveOrder = [archiveOrder[0], archiveOrder[3], archiveOrder[2], archiveOrder[1]];
  }

  const unitySlot = archiveOrder.indexOf("Unité");
  const memorySlot = archiveOrder.indexOf("Mémoire");
  const courageSlot = archiveOrder.indexOf("Courage");
  const transmissionSlot = archiveOrder.indexOf("Transmission");

  const chamberValue = archiveOrder[(seed >>> 26) % archiveOrder.length];

  return {
    dayKey,
    seed,
    signalIndex,
    country,
    transmission,
    ringTargets,
    ringStart,
    archiveOrder,
    archiveClues: [
      "L’Unité repose au " + SLOT_NAMES[unitySlot] + ".",
      "La Mémoire se trouve " + relation(memorySlot, unitySlot) + " de l’Unité.",
      "Le Courage se trouve " + relation(courageSlot, memorySlot) + " de la Mémoire.",
      "La Transmission ferme le cercle au " + SLOT_NAMES[transmissionSlot] + ".",
    ],
    chamberNumber: signalIndex + 1,
    chamberValue,
    finalSeal: ["Unité", "Mémoire", "Avenir"],
  };
}

function relation(from, to) {
  const delta = (from - to + 4) % 4;
  if (delta === 1) return "à droite";
  if (delta === 2) return "à l’opposé";
  if (delta === 3) return "à gauche";
  return "au même point";
}

export function advanceCoupledRing(values, index, direction = 1) {
  const next = [...values];
  const step = direction >= 0 ? 1 : -1;
  next[index] = (next[index] + step + 8) % 8;
  if (index < next.length - 1) {
    next[index + 1] = (next[index + 1] + step + 8) % 8;
  }
  return next;
}

export function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
