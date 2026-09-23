export const PASSPORT_LEVEL_2_ITEMS = Object.freeze([
  'PASSPORT_FOUNDER_GOLD',
]);

export function passportAccessLevel(passport, inventory = []) {
  if (!passport?.userId) return 0;

  const owned = new Set(
    (Array.isArray(inventory) ? inventory : [])
      .filter((item) => Number(item?.quantity || 0) > 0)
      .map((item) => String(item?.item_code || '').trim().toUpperCase())
      .filter(Boolean),
  );

  if (PASSPORT_LEVEL_2_ITEMS.some((code) => owned.has(code))) return 2;
  return 1;
}

export function canAccess3B(passport, inventory) {
  return passportAccessLevel(passport, inventory) >= 1;
}

export function canAccessWorld3B(passport, inventory) {
  return passportAccessLevel(passport, inventory) >= 2;
}
