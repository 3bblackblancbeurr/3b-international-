export const HEALTH_STORAGE_KEY = 'threeb_health_local_v1';
export const RETENTION_DAYS = 90;
export const ROUTINE_KEYS = ['wake-water','wake-move','wake-meal','rest-slow','rest-care','rest-journal'];
export const STEP_SOURCES = ['health-connect', 'apple-health'];

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
export function normalizeStepTarget(value) { return Number.isInteger(value) && value >= 1000 && value <= 30000 && value % 500 === 0 ? value : null; }
export const blankHealth = () => ({ version: 1, days: {}, favorites: [], plan: {}, shoppingChecked: [], nativeEnabled: false, stepTarget: null });
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
      energy: Number.isInteger(day.energy) && day.energy >= 1 && day.energy <= 5 ? day.energy : null,
      routines: Array.isArray(day.routines) ? [...new Set(day.routines.filter(id => ROUTINE_KEYS.includes(id)))] : [],
      mobility: Array.isArray(day.mobility) ? day.mobility.filter(item => item && typeof item.id === 'string' && /^[a-z0-9-]{1,60}$/.test(item.id) && typeof item.completedAt === 'string' && Number.isFinite(Date.parse(item.completedAt)) && boundedNumber(item.minutes, 0.01, 180, 2) !== null).slice(-50).map(item => ({ id:item.id, minutes:boundedNumber(item.minutes, 0.01, 180, 2), completedAt:item.completedAt })) : [],
      nativeSteps: normalizeNativeSteps(day.nativeSteps),
    };
  }
  result.nativeEnabled = raw.nativeEnabled === true;
  result.stepTarget = normalizeStepTarget(raw.stepTarget);
  result.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(v => typeof v === 'string' && /^[a-z0-9-]{1,70}$/.test(v)))].slice(0, 200) : [];
  for (const [day, id] of Object.entries(raw.plan || {})) {
    // Menu planning is independent from recorded health measurements.
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof id === 'string' && /^[a-z0-9-]{1,70}$/.test(id)) result.plan[day] = id;
  }
  result.plan = Object.fromEntries(Object.entries(result.plan).sort().slice(-28));
  result.shoppingChecked = Array.isArray(raw.shoppingChecked) ? raw.shoppingChecked.filter(v => typeof v === 'string').slice(0, 200) : [];
  return result;
}

export function normalizeNativeSteps(raw) {
  if (!raw || !STEP_SOURCES.includes(raw.source) || typeof raw.syncedAt !== 'string' || !Number.isFinite(Date.parse(raw.syncedAt))) return null;
  const steps = typeof raw.steps === 'number' && Number.isInteger(raw.steps) ? boundedNumber(raw.steps, 0, 100000) : null;
  return steps === null ? null : { steps, source:raw.source, syncedAt:raw.syncedAt };
}
export function effectiveSteps(day = {}) {
  const native = normalizeNativeSteps(day.nativeSteps);
  if (native) return { value:native.steps, source:native.source, label:native.source === 'apple-health' ? 'Apple Santé' : 'Health Connect', estimated:false };
  if (day.steps != null) return { value:day.steps, source:'manual', label:'saisis', estimated:false };
  if (day.estimatedSteps != null) return { value:day.estimatedSteps, source:'estimate', label:'estimés', estimated:true };
  return { value:null, source:null, label:'', estimated:false };
}
export function withoutNativeSteps(data) {
  return { ...data, nativeEnabled:false, days:Object.fromEntries(Object.entries(data.days).map(([date,day]) => [date,{...day,nativeSteps:null}])) };
}
export function mergeNativeSteps(data, response, now = new Date()) {
  if (!STEP_SOURCES.includes(response?.source) || !Array.isArray(response.days) || typeof response.syncedAt !== 'string' || !Number.isFinite(Date.parse(response.syncedAt))) throw new Error('Réponse du téléphone invalide.');
  // A fresh snapshot replaces the previous import, including deleted/unreadable data.
  const result = withoutNativeSteps(data), validDays = new Set(previousDays(30,now));
  result.nativeEnabled = true;
  for (const item of response.days) {
    if (!item || !validDays.has(item.date)) continue;
    const nativeSteps = normalizeNativeSteps({steps:item.steps,source:response.source,syncedAt:response.syncedAt});
    if (nativeSteps) result.days[item.date] = {...result.days[item.date],nativeSteps};
  }
  return normalizeHealth(result,now);
}
export function recordMobility(data, session, now = new Date()) {
  const minutes = boundedNumber(session?.minutes, .01, 180, 2);
  if (!session || minutes === null || !Number.isFinite(Date.parse(session.completedAt))) return data;
  const date = localDay(new Date(session.completedAt));
  if (!previousDays(90,now).includes(date)) return data;
  const day = data.days[date] || {}, mobility = day.mobility || [];
  if (mobility.some(item=>item.id===session.id && item.completedAt===session.completedAt)) return data;
  return normalizeHealth({...data,days:{...data.days,[date]:{...day,mobility:[...mobility,{...session,minutes}]}}},now);
}
export function mobilityMinutes(day = {}) { return (day.mobility || []).reduce((sum,item)=>sum+item.minutes,0); }
export function historyValue(day, metric) {
  if (!day) return null;
  if (metric === 'steps') return effectiveSteps(day).value;
  if (metric === 'mobility') return day.mobility?.length ? mobilityMinutes(day) : null;
  return day[metric] ?? null;
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
