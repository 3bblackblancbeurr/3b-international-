export const HEALTH_STORAGE_KEY = 'threeb_health_local_v1';
export const RETENTION_DAYS = 90;

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function previousDays(count = 7, date = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(date); day.setDate(day.getDate() - (count - 1 - index)); return localDay(day);
  });
}
export function boundedNumber(value, min, max, decimals = 0) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Number(number.toFixed(decimals));
}
export const blankHealth = () => ({ version: 1, days: {}, favorites: [], plan: {}, shoppingChecked: [] });
export function normalizeHealth(raw, now = new Date()) {
  const result = blankHealth();
  if (!raw || raw.version !== 1) return result;
  const validDays = new Set(previousDays(RETENTION_DAYS, now));
  for (const [date, day] of Object.entries(raw.days || {})) {
    if (!validDays.has(date) || !day || typeof day !== 'object') continue;
    result.days[date] = {
      steps: boundedNumber(day.steps, 0, 100000),
      estimatedSteps: boundedNumber(day.estimatedSteps, 0, 100000),
      water: boundedNumber(day.water, 0, 40) ?? 0,
      plants: boundedNumber(day.plants, 0, 30) ?? 0,
      activeMinutes: boundedNumber(day.activeMinutes, 0, 1440),
      sleepHours: boundedNumber(day.sleepHours, 0, 24, 2),
    };
  }
  result.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(v => typeof v === 'string' && /^[a-z0-9-]{1,70}$/.test(v)))].slice(0, 200) : [];
  for (const [day, id] of Object.entries(raw.plan || {})) {
    // Menu planning is independent from recorded health measurements.
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof id === 'string' && /^[a-z0-9-]{1,70}$/.test(id)) result.plan[day] = id;
  }
  result.plan = Object.fromEntries(Object.entries(result.plan).sort().slice(-28));
  result.shoppingChecked = Array.isArray(raw.shoppingChecked) ? raw.shoppingChecked.filter(v => typeof v === 'string').slice(0, 200) : [];
  return result;
}
export function readHealth(storage) {
  try { const raw = storage.getItem(HEALTH_STORAGE_KEY); return { data: normalizeHealth(raw ? JSON.parse(raw) : null), saved: !!raw, error: false }; }
  catch { return { data: blankHealth(), saved: false, error: true }; }
}
export function sleepDuration(start, end) {
  if (!start || !end) return null;
  const first = new Date(start), last = new Date(end);
  const hours = (last - first) / 3600000;
  return Number.isFinite(hours) && hours > 0 && hours <= 24 ? Number(hours.toFixed(2)) : null;
}
export function displayNumber(value) { return value === null || value === undefined ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value); }
export function searchText(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }
export function shoppingList(plan, recipes, servings = 2) {
  const entries = new Map();
  for (const recipeId of Object.values(plan)) {
    const recipe = recipes.find(r => r.id === recipeId); if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const key = `${searchText(ingredient.name)}|${ingredient.unit || ''}`;
      const quantity = typeof ingredient.quantity === 'number' ? ingredient.quantity * servings / recipe.servings : ingredient.quantity;
      const previous = entries.get(key);
      if (previous && typeof quantity === 'number' && typeof previous.quantity === 'number') previous.quantity += quantity;
      else if (!previous) entries.set(key, { ...ingredient, key, quantity });
    }
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Approximation from real acceleration peaks; never synthesizes steps from time.
// This is not the native OS pedometer and must remain explicitly labelled.
export function createStepDetector() {
  let gravity = null, high = false, lastStep = -Infinity, previousTime = null;
  return (x, y, z, time) => {
    if (![x, y, z, time].every(Number.isFinite)) return false;
    if (previousTime !== null && time - previousTime < 20) return false;
    previousTime = time;
    const magnitude = Math.hypot(x, y, z);
    if (gravity === null) { gravity = magnitude; return false; }
    gravity = gravity * .9 + magnitude * .1;
    const delta = magnitude - gravity;
    if (delta < .4) high = false;
    if (delta > 1.2 && delta < 12 && !high && time - lastStep > 320) {
      high = true; lastStep = time; return true;
    }
    return false;
  };
}
