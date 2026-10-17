import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_CATEGORIES, ADMIN_JOURNEY_KEY, ADMIN_LIMITS, addAdminCase, addAdminTask,
  adminCaseProgress, adminDeadline, adminToday, createAdminJourneyState,
  exportAdminJourney, importAdminJourney, isAdminDate, loadAdminJourney,
  removeAdminCase, removeAdminTask, saveAdminJourney, updateAdminCase,
  updateAdminTask, validateAdminJourneyState,
} from '../src/member/admin/admin-journey.js';
import { ADMIN_GUIDES } from '../src/member/memberSources.js';

const NOW = '2026-10-18T10:00:00.000Z';
const LATER = '2026-10-19T12:00:00.000Z';
const fields = { title: 'Préparer mon rendez-vous', categoryId: 'identity', dueDate: '2026-10-24' };
const fixture = () => addAdminCase(createAdminJourneyState(), fields, NOW);
const storage = raw => ({ value: raw, getItem(key) { assert.equal(key, ADMIN_JOURNEY_KEY); return this.value; }, setItem(key, value) { assert.equal(key, ADMIN_JOURNEY_KEY); this.value = value; } });

test('categories retain only the existing official destinations and editorial descriptions', () => {
  assert.equal(ADMIN_CATEGORIES.length, ADMIN_GUIDES.length);
  assert.equal(new Set(ADMIN_CATEGORIES.map(item => item.id)).size, ADMIN_GUIDES.length);
  ADMIN_CATEGORIES.forEach((item, index) => {
    assert.equal(item.href, ADMIN_GUIDES[index].href);
    assert.equal(item.description, ADMIN_GUIDES[index].description);
    assert.equal(new URL(item.href).protocol, 'https:');
  });
});

test('empty follow-up starts without fabricated dossiers', () => {
  assert.deepEqual(createAdminJourneyState(), { version: 1, cases: [] });
});

test('creating a dossier is immutable, trims title, and supplies generic editable tasks', () => {
  const original = createAdminJourneyState();
  const state = addAdminCase(original, { ...fields, title: `  ${fields.title}  ` }, NOW);
  assert.equal(original.cases.length, 0);
  const item = state.cases[0];
  assert.equal(item.title, fields.title);
  assert.equal(item.stage, 'preparing');
  assert.equal(item.tasks.length, 3);
  assert.ok(item.tasks.every(task => !task.done));
  assert.equal(item.createdAt, NOW);
  assert.equal(item.updatedAt, NOW);
  assert.equal(new Set(item.tasks.map(task => task.id)).size, 3);
});

test('real calendar dates reject overflow, malformed dates, and pre-1900 values', () => {
  assert.ok(isAdminDate('2028-02-29'));
  assert.ok(isAdminDate('2026-10-18'));
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '1899-12-31', null, 0, '']) assert.equal(isAdminDate(date), false);
  assert.equal(adminToday(new Date(2026, 9, 18, 0, 1)), '2026-10-18');
});

test('invalid new fields never mutate a valid state', () => {
  const state = fixture();
  const before = JSON.stringify(state);
  for (const patch of [{ title: '' }, { title: 'x'.repeat(101) }, { title: 'secret\nnumber' }, { categoryId: 'fake-bank' }, { dueDate: '2026-02-30' }, { stage: 'approved-by-government' }]) {
    assert.throws(() => addAdminCase(state, { ...fields, ...patch }, NOW));
  }
  assert.equal(JSON.stringify(state), before);
});

test('editing preserves dossier identity, creation timestamp, and checklist', () => {
  const state = fixture();
  const id = state.cases[0].id;
  const next = updateAdminCase(state, id, { title: 'Rendez-vous santé', categoryId: 'health', stage: 'sent', dueDate: '' }, LATER);
  assert.equal(next.cases[0].id, id);
  assert.equal(next.cases[0].createdAt, NOW);
  assert.equal(next.cases[0].updatedAt, LATER);
  assert.equal(next.cases[0].stage, 'sent');
  assert.deepEqual(next.cases[0].tasks, state.cases[0].tasks);
  assert.equal(state.cases[0].title, fields.title);
  assert.throws(() => updateAdminCase(state, id, { id: 'replacement' }), /non reconnue/);
  assert.throws(() => updateAdminCase(state, 'missing', { title: 'ok' }), /n’existe plus/);
});

test('checklist can be added, renamed, checked, and removed independently of dossier status', () => {
  let state = fixture();
  const id = state.cases[0].id;
  state = addAdminTask(state, id, '  Prendre rendez-vous  ', LATER);
  const taskId = state.cases[0].tasks.at(-1).id;
  assert.equal(state.cases[0].tasks.at(-1).text, 'Prendre rendez-vous');
  state = updateAdminTask(state, id, taskId, { text: 'Confirmer mon rendez-vous', done: true }, LATER);
  assert.equal(state.cases[0].tasks.at(-1).text, 'Confirmer mon rendez-vous');
  assert.deepEqual(adminCaseProgress(state.cases[0]), { completed: 1, total: 4, percent: 25 });
  assert.equal(state.cases[0].stage, 'preparing');
  state = removeAdminTask(state, id, taskId, LATER);
  assert.equal(state.cases[0].tasks.length, 3);
  assert.equal(state.cases[0].updatedAt, LATER);
});

test('bad checklist updates reject missing ids, non-boolean checks, and overlong text', () => {
  const state = fixture(), id = state.cases[0].id, taskId = state.cases[0].tasks[0].id;
  assert.throws(() => updateAdminTask(state, id, taskId, { done: 'true' }), /invalide/);
  assert.throws(() => updateAdminTask(state, id, taskId, { id: 'stolen' }), /non reconnue/);
  assert.throws(() => updateAdminTask(state, id, 'missing', { done: true }), /n’existe plus/);
  assert.throws(() => addAdminTask(state, id, 'x'.repeat(141)), /140/);
  assert.throws(() => removeAdminTask(state, id, 'missing'), /n’existe plus/);
});

test('maximum case and task counts are enforced without dropping data', () => {
  let state = fixture();
  const id = state.cases[0].id;
  while (state.cases[0].tasks.length < ADMIN_LIMITS.tasks) state = addAdminTask(state, id, 'Mon étape', NOW);
  assert.throws(() => addAdminTask(state, id, 'Une de plus', NOW), /20/);
  while (state.cases.length < ADMIN_LIMITS.cases) state = addAdminCase(state, fields, NOW);
  assert.throws(() => addAdminCase(state, fields, NOW), /60/);
  assert.equal(state.cases.length, 60);
});

test('zero checklist tasks has zero progress and all checks never imply official completion', () => {
  let state = fixture();
  const id = state.cases[0].id;
  for (const task of state.cases[0].tasks) state = updateAdminTask(state, id, task.id, { done: true }, NOW);
  assert.equal(adminCaseProgress(state.cases[0]).percent, 100);
  assert.equal(state.cases[0].stage, 'preparing');
  for (const task of [...state.cases[0].tasks]) state = removeAdminTask(state, id, task.id, NOW);
  assert.deepEqual(adminCaseProgress(state.cases[0]), { completed: 0, total: 0, percent: 0 });
});

test('deadline calculations are stable across daylight-saving day boundaries', () => {
  const base = { stage: 'preparing', dueDate: '2026-10-25' };
  assert.deepEqual(adminDeadline(base, '2026-10-24'), { tone: 'soon', label: 'Demain', days: 1 });
  assert.deepEqual(adminDeadline(base, '2026-10-25'), { tone: 'soon', label: 'Aujourd’hui', days: 0 });
  assert.deepEqual(adminDeadline(base, '2026-10-26'), { tone: 'late', label: 'Échéance dépassée', days: -1 });
  assert.equal(adminDeadline(base, '2026-10-18').tone, 'soon');
  assert.equal(adminDeadline(base, '2026-10-17').tone, 'neutral');
  assert.equal(adminDeadline({ ...base, stage: 'done' }, '2026-10-26').tone, 'complete');
  assert.equal(adminDeadline({ ...base, dueDate: '' }, '2026-10-26').label, 'Sans échéance');
});

test('deletion removes only its dossier and fails on stale references', () => {
  const one = fixture(), state = addAdminCase(one, { ...fields, title: 'Autre démarche' }, NOW);
  const next = removeAdminCase(state, one.cases[0].id);
  assert.equal(next.cases.length, 1);
  assert.equal(next.cases[0].title, 'Autre démarche');
  assert.equal(state.cases.length, 2);
  assert.throws(() => removeAdminCase(next, one.cases[0].id), /n’existe plus/);
});

test('schema rejects unsupported versions, duplicate ids, malformed dates and stages', () => {
  const state = fixture();
  assert.throws(() => validateAdminJourneyState({ ...state, version: 2 }));
  assert.throws(() => validateAdminJourneyState({ ...state, cases: [state.cases[0], state.cases[0]] }), /double/);
  for (const patch of [{ dueDate: null }, { dueDate: '2026-02-31' }, { stage: 'government-approved' }, { createdAt: 'yesterday' }, { id: '<script>' }, { tasks: [{ ...state.cases[0].tasks[0], done: 1 }] }]) assert.throws(() => validateAdminJourneyState({ ...state, cases: [{ ...state.cases[0], ...patch }] }));
  assert.throws(() => validateAdminJourneyState({ ...state, cases: [{ ...state.cases[0], tasks: [state.cases[0].tasks[0], state.cases[0].tasks[0]] }] }), /double/);
});

test('schema whitelists data fields so unknown imported properties never enter stored state', () => {
  const original = fixture();
  const input = { ...original, privateData: 'not retained', cases: [{ ...original.cases[0], document: 'not retained', tasks: original.cases[0].tasks.map(task => ({ ...task, accountNumber: 'not retained' })) }] };
  assert.deepEqual(validateAdminJourneyState(input), original);
});

test('absent storage is distinguishable from an empty existing store', () => {
  assert.equal(loadAdminJourney(null).status, 'unavailable');
  assert.equal(loadAdminJourney(storage(null)).status, 'empty');
  const throwing = { getItem() { throw new Error('access denied'); } };
  assert.equal(loadAdminJourney(throwing).status, 'unavailable');
});

test('read/save persists exact validated values', () => {
  const local = storage(null), state = fixture();
  const result = saveAdminJourney(local, state);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot, JSON.stringify(state));
  assert.equal(loadAdminJourney(local).status, 'ready');
  assert.deepEqual(loadAdminJourney(local).state, state);
});

test('corrupt local data stays untouched and is not presented as a fresh saved state', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 1, cases: [{ title: 'bad' }] }), 'x'.repeat(ADMIN_LIMITS.fileBytes + 1)]) {
    const local = storage(raw);
    const result = loadAdminJourney(local);
    assert.equal(result.status, 'invalid');
    assert.equal(local.value, raw);
    assert.deepEqual(result.state, createAdminJourneyState());
  }
});

test('full or unavailable storage is reported while the current follow-up remains intact', () => {
  const state = fixture(), before = JSON.stringify(state);
  const local = { setItem() { throw new Error('quota'); } };
  assert.equal(saveAdminJourney(local, state).ok, false);
  assert.match(saveAdminJourney(local, state).message, /exporte/);
  assert.equal(saveAdminJourney(null, state).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('a stale tab cannot overwrite another tab and can export its unsaved changes', () => {
  const local = storage(null);
  const firstTab = loadAdminJourney(local), secondTab = loadAdminJourney(local);
  const firstState = addAdminCase(firstTab.state, { ...fields, title: 'Première page' }, NOW);
  const firstSave = saveAdminJourney(local, firstState, { expectedRaw: firstTab.snapshot });
  assert.equal(firstSave.ok, true);
  const secondState = addAdminCase(secondTab.state, { ...fields, title: 'Deuxième page' }, NOW);
  const secondSave = saveAdminJourney(local, secondState, { expectedRaw: secondTab.snapshot });
  assert.equal(secondSave.ok, false);
  assert.equal(secondSave.conflict, true);
  assert.deepEqual(loadAdminJourney(local).state, firstState);
  assert.deepEqual(importAdminJourney(exportAdminJourney(secondState, NOW)), secondState);
  const reloaded = loadAdminJourney(local);
  const updated = updateAdminCase(reloaded.state, reloaded.state.cases[0].id, { stage: 'sent' }, LATER);
  assert.equal(saveAdminJourney(local, updated, { expectedRaw: reloaded.snapshot }).ok, true);
});

test('stale replacement of a corrupt backup also preserves newer data', () => {
  const local = storage('{broken');
  const initial = loadAdminJourney(local);
  const newer = fixture();
  assert.equal(saveAdminJourney(local, newer).ok, true);
  assert.equal(saveAdminJourney(local, createAdminJourneyState(), { expectedRaw: initial.snapshot }).conflict, true);
  assert.deepEqual(loadAdminJourney(local).state, newer);
});

test('export/import restores independent copies, including empty backups and non-ASCII text', () => {
  const state = addAdminCase(createAdminJourneyState(), { ...fields, title: 'Démarche – إرشاد – 日本語' }, NOW);
  assert.deepEqual(importAdminJourney(exportAdminJourney(state, NOW)), state);
  assert.deepEqual(importAdminJourney(exportAdminJourney(createAdminJourneyState(), NOW)), createAdminJourneyState());
  const imported = importAdminJourney(exportAdminJourney(state, NOW));
  imported.cases[0].tasks[0].done = true;
  assert.equal(state.cases[0].tasks[0].done, false);
});

test('import rejects unrelated JSON, oversized text, and malformed backup records', () => {
  for (const raw of ['<html>', '{}', JSON.stringify(fixture()), JSON.stringify({ format: 'threeb-admin-journey', exportedAt: NOW, data: { version: 2, cases: [] } }), JSON.stringify({ format: 'threeb-admin-journey', exportedAt: 'tomorrow', data: createAdminJourneyState() }), 'x'.repeat(ADMIN_LIMITS.fileBytes + 1)]) assert.throws(() => importAdminJourney(raw));
});

test('largest permitted Unicode follow-up fits its own import file limit', () => {
  let state = createAdminJourneyState();
  for (let i = 0; i < ADMIN_LIMITS.cases; i++) {
    state = addAdminCase(state, { ...fields, title: '界'.repeat(100) }, NOW);
    const item = state.cases[0];
    item.tasks = Array.from({ length: ADMIN_LIMITS.tasks }, (_, j) => ({ id: `step_${j}`, text: '界'.repeat(140), done: true }));
  }
  const raw = exportAdminJourney(state, NOW);
  assert.ok(Buffer.byteLength(raw) < ADMIN_LIMITS.fileBytes);
  assert.deepEqual(importAdminJourney(raw), state);
});
