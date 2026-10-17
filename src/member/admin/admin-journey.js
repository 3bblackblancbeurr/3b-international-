import { ADMIN_GUIDES } from '../memberSources.js';

export const ADMIN_JOURNEY_KEY = 'threeb_admin_journey_v1';
export const ADMIN_LIMITS = Object.freeze({ cases: 60, tasks: 20, title: 100, task: 140, fileBytes: 1_000_000 });
export const ADMIN_CATEGORIES = Object.freeze(ADMIN_GUIDES.map((guide, index) => Object.freeze({
  ...guide, id: ['identity', 'work', 'housing', 'health', 'tax', 'enterprise', 'justice', 'europe'][index],
})));
export const ADMIN_STAGES = Object.freeze([
  { id: 'preparing', label: 'En préparation' },
  { id: 'sent', label: 'Envoyée' },
  { id: 'done', label: 'Terminée' },
]);
const DEFAULT_TASKS = Object.freeze([
  'Vérifier les informations sur le site officiel',
  'Préparer ma démarche auprès de l’organisme',
  'Suivre la réponse de l’organisme',
]);
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));
const makeId = () => globalThis.crypto?.randomUUID?.() || `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
const timestamp = now => {
  const date = new Date(now ?? Date.now());
  assert(Number.isFinite(date.getTime()), 'Date de modification invalide.');
  return date.toISOString();
};
const validTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const cleanText = (value, max, label) => {
  assert(typeof value === 'string', `${label} invalide.`);
  const text = value.trim();
  assert(text.length > 0 && text.length <= max && !/[\u0000-\u001f\u007f]/u.test(text), `${label} : 1 à ${max} caractères, sans retour à la ligne.`);
  return text;
};

export function isAdminDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '9999-12-31';
}

export function adminToday(now = new Date()) {
  const date = new Date(now);
  assert(Number.isFinite(date.getTime()), 'Date du jour invalide.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createAdminJourneyState() { return { version: 1, cases: [] }; }

export function validateAdminJourneyState(value) {
  assert(isRecord(value) && value.version === 1 && Array.isArray(value.cases), 'Format du suivi administratif non reconnu.');
  assert(value.cases.length <= ADMIN_LIMITS.cases, `Le suivi accepte au maximum ${ADMIN_LIMITS.cases} démarches.`);
  const ids = new Set();
  const cases = value.cases.map(item => {
    assert(isRecord(item) && typeof item.id === 'string' && ID.test(item.id) && !ids.has(item.id), 'Identifiant de démarche invalide ou en double.');
    ids.add(item.id);
    const title = cleanText(item.title, ADMIN_LIMITS.title, 'Intitulé');
    assert(ADMIN_CATEGORIES.some(category => category.id === item.categoryId), 'Catégorie non reconnue.');
    assert(ADMIN_STAGES.some(stage => stage.id === item.stage), 'État de démarche non reconnu.');
    assert(item.dueDate === '' || isAdminDate(item.dueDate), 'Échéance invalide.');
    assert(validTimestamp(item.createdAt) && validTimestamp(item.updatedAt), 'Dates de sauvegarde invalides.');
    assert(Array.isArray(item.tasks) && item.tasks.length <= ADMIN_LIMITS.tasks, `Maximum ${ADMIN_LIMITS.tasks} étapes par démarche.`);
    const taskIds = new Set();
    const tasks = item.tasks.map(task => {
      assert(isRecord(task) && typeof task.id === 'string' && ID.test(task.id) && !taskIds.has(task.id), 'Identifiant d’étape invalide ou en double.');
      taskIds.add(task.id);
      assert(typeof task.done === 'boolean', 'État d’étape invalide.');
      return { id: task.id, text: cleanText(task.text, ADMIN_LIMITS.task, 'Étape'), done: task.done };
    });
    return { id: item.id, title, categoryId: item.categoryId, stage: item.stage, dueDate: item.dueDate, tasks, createdAt: item.createdAt, updatedAt: item.updatedAt };
  });
  return { version: 1, cases };
}

function changeCase(state, id, update, now) {
  const next = validateAdminJourneyState(state);
  const index = next.cases.findIndex(item => item.id === id);
  assert(index >= 0, 'Cette démarche n’existe plus.');
  next.cases[index] = { ...update(next.cases[index]), updatedAt: timestamp(now) };
  return validateAdminJourneyState(next);
}

export function addAdminCase(state, fields, now) {
  const next = validateAdminJourneyState(state);
  assert(next.cases.length < ADMIN_LIMITS.cases, `Maximum ${ADMIN_LIMITS.cases} démarches. Exporte tes données avant de supprimer des démarches terminées.`);
  const at = timestamp(now);
  const item = {
    id: makeId(), title: fields.title, categoryId: fields.categoryId, dueDate: fields.dueDate ?? '', stage: fields.stage ?? 'preparing',
    tasks: DEFAULT_TASKS.map(text => ({ id: makeId(), text, done: false })), createdAt: at, updatedAt: at,
  };
  next.cases.unshift(item);
  return validateAdminJourneyState(next);
}

export function updateAdminCase(state, id, fields, now) {
  const allowed = ['title', 'categoryId', 'dueDate', 'stage'];
  assert(isRecord(fields) && Object.keys(fields).every(key => allowed.includes(key)), 'Modification de démarche non reconnue.');
  return changeCase(state, id, item => ({ ...item, ...fields }), now);
}

export function removeAdminCase(state, id) {
  const next = validateAdminJourneyState(state);
  assert(next.cases.some(item => item.id === id), 'Cette démarche n’existe plus.');
  return { ...next, cases: next.cases.filter(item => item.id !== id) };
}

export function addAdminTask(state, caseId, text, now) {
  return changeCase(state, caseId, item => {
    assert(item.tasks.length < ADMIN_LIMITS.tasks, `Maximum ${ADMIN_LIMITS.tasks} étapes par démarche.`);
    return { ...item, tasks: [...item.tasks, { id: makeId(), text, done: false }] };
  }, now);
}

export function updateAdminTask(state, caseId, taskId, fields, now) {
  assert(isRecord(fields) && Object.keys(fields).every(key => ['text', 'done'].includes(key)), 'Modification d’étape non reconnue.');
  return changeCase(state, caseId, item => {
    assert(item.tasks.some(task => task.id === taskId), 'Cette étape n’existe plus.');
    return { ...item, tasks: item.tasks.map(task => task.id === taskId ? { ...task, ...fields } : task) };
  }, now);
}

export function removeAdminTask(state, caseId, taskId, now) {
  return changeCase(state, caseId, item => {
    assert(item.tasks.some(task => task.id === taskId), 'Cette étape n’existe plus.');
    return { ...item, tasks: item.tasks.filter(task => task.id !== taskId) };
  }, now);
}

export function adminCaseProgress(item) {
  const completed = item.tasks.filter(task => task.done).length;
  return { completed, total: item.tasks.length, percent: item.tasks.length ? Math.round(completed * 100 / item.tasks.length) : 0 };
}

export function adminDeadline(item, today = adminToday()) {
  if (item.stage === 'done') return { tone: 'complete', label: 'Démarche terminée' };
  if (!item.dueDate) return { tone: 'neutral', label: 'Sans échéance' };
  assert(isAdminDate(today) && isAdminDate(item.dueDate), 'Échéance invalide.');
  const days = Math.round((Date.parse(`${item.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { tone: 'late', label: 'Échéance dépassée', days };
  if (days === 0) return { tone: 'soon', label: 'Aujourd’hui', days };
  if (days === 1) return { tone: 'soon', label: 'Demain', days };
  return { tone: days <= 7 ? 'soon' : 'neutral', label: `Dans ${days} jours`, days };
}

export function loadAdminJourney(storage) {
  let raw;
  try { raw = storage?.getItem(ADMIN_JOURNEY_KEY); }
  catch { return { state: createAdminJourneyState(), status: 'unavailable', message: 'Le stockage local est indisponible. Exporte ton suivi avant de quitter.' }; }
  if (!storage) return { state: createAdminJourneyState(), status: 'unavailable', message: 'Le stockage local est indisponible. Exporte ton suivi avant de quitter.' };
  if (raw == null) return { state: createAdminJourneyState(), status: 'empty', message: '', snapshot: null };
  try {
    assert(raw.length <= ADMIN_LIMITS.fileBytes, 'Sauvegarde trop volumineuse.');
    return { state: validateAdminJourneyState(JSON.parse(raw)), status: 'ready', message: '', snapshot: raw };
  } catch { return { state: createAdminJourneyState(), status: 'invalid', message: 'La sauvegarde locale est illisible. Elle est conservée ; exporte-la ou confirme son remplacement avant d’enregistrer un nouveau suivi.', snapshot: raw }; }
}

export function saveAdminJourney(storage, state, options = {}) {
  try {
    assert(storage && typeof storage.setItem === 'function', 'Stockage indisponible.');
    const raw = JSON.stringify(validateAdminJourneyState(state));
    if (Object.hasOwn(options, 'expectedRaw')) {
      assert(typeof storage.getItem === 'function', 'Lecture du stockage indisponible.');
      if (storage.getItem(ADMIN_JOURNEY_KEY) !== options.expectedRaw) return { ok: false, conflict: true, message: 'Une autre page a modifié le suivi enregistré. Tes changements restent dans cette page et ne l’écrasent pas. Exporte-les avant de recharger le suivi enregistré.' };
    }
    storage.setItem(ADMIN_JOURNEY_KEY, raw);
    return { ok: true, message: '', snapshot: raw };
  } catch (error) { return { ok: false, message: `Enregistrement impossible. Ton suivi reste dans cette page ; exporte-le avant de quitter. ${error?.message || ''}`.trim() }; }
}

export function exportAdminJourney(state, now) {
  return JSON.stringify({ format: 'threeb-admin-journey', exportedAt: timestamp(now), data: validateAdminJourneyState(state) }, null, 2);
}

export function importAdminJourney(raw) {
  assert(typeof raw === 'string' && raw.length <= ADMIN_LIMITS.fileBytes, 'Fichier trop volumineux (1 Mo maximum).');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Le fichier n’est pas un JSON lisible.'); }
  assert(isRecord(parsed) && parsed.format === 'threeb-admin-journey' && validTimestamp(parsed.exportedAt), 'Choisis un export du suivi administratif 3B.');
  return clone(validateAdminJourneyState(parsed.data));
}
