import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_ROUTINES, MOBILITY_SESSIONS, ROUTINE_IDS, WELLNESS_SOURCES, freshMobilityTimer, mobilityActiveMinutes, mobilityTimeLabel, mobilityTimerAction, normalizeRoutineIds, toggleRoutine } from '../src/health/wellness-content.js';

const sample = { steps: [{ seconds: 10, kind: 'prepare' }, { seconds: 20, kind: 'move' }, { seconds: 10, kind: 'rest' }, { seconds: 30, kind: 'move' }] };
function runSeconds(state, session, start, seconds) {
  let next = state;
  for (let elapsed = 1; elapsed <= seconds; elapsed++) next = mobilityTimerAction(next, session, 'tick', start + elapsed * 1000);
  return next;
}

test('wellness plans have honest nominal durations, sources and no duplicate routine IDs', () => {
  for (const session of MOBILITY_SESSIONS) {
    assert.equal(session.steps.reduce((total, step) => total + step.seconds, 0), session.minutes * 60);
    assert.ok(session.steps.some(step => step.kind === 'rest'));
    assert.ok(session.sourceIds.every(id => WELLNESS_SOURCES[id]?.url.startsWith('https://')));
  }
  assert.equal(new Set(ROUTINE_IDS).size, 6);
  assert.ok(Object.values(DAILY_ROUTINES).every(group => group.length === 3));
});

test('routine toggles ignore invalid IDs and preserve the other moment of the day', () => {
  assert.deepEqual(normalizeRoutineIds(['wake-move', null, 'bogus', 'wake-move', 'rest-care']), ['wake-move', 'rest-care']);
  assert.deepEqual(toggleRoutine(['wake-move', 'rest-care'], 'wake-move'), ['rest-care']);
  assert.deepEqual(toggleRoutine(['rest-care'], 'wake-meal'), ['rest-care', 'wake-meal']);
  assert.deepEqual(toggleRoutine(['rest-care'], '__proto__'), ['rest-care']);
  assert.deepEqual(normalizeRoutineIds('wake-move'), []);
});

test('monotonic timer counts movement only and paused time never earns credit', () => {
  let state = mobilityTimerAction(freshMobilityTimer(), sample, 'start', 0);
  state = runSeconds(state, sample, 0, 10);
  assert.equal(state.index, 1);
  assert.equal(state.activeMs, 0, 'preparation excluded');
  state = runSeconds(state, sample, 10000, 5);
  state = mobilityTimerAction(state, sample, 'pause', 15000);
  state = mobilityTimerAction(state, sample, 'tick', 999999);
  assert.equal(state.elapsedMs, 5000);
  state = mobilityTimerAction(state, sample, 'start', 1000000);
  state = runSeconds(state, sample, 1000000, 15);
  assert.equal(state.index, 2);
  assert.equal(state.activeMs, 20000);
  state = runSeconds(state, sample, 1015000, 10);
  assert.equal(state.activeMs, 20000, 'rest excluded');
  state = runSeconds(state, sample, 1025000, 30);
  assert.equal(state.status, 'complete');
  assert.equal(state.activeMs, 50000);
  assert.equal(mobilityActiveMinutes(state), .8, 'never rounds credited time up');
});

test('finishing repetitions early credits elapsed time; skipping excludes the whole step', () => {
  let state = mobilityTimerAction(freshMobilityTimer(), sample, 'skip', 0);
  state = mobilityTimerAction(state, sample, 'start', 1000);
  state = runSeconds(state, sample, 1000, 7);
  state = mobilityTimerAction(state, sample, 'finish', 8500);
  assert.equal(state.activeMs, 7500);
  state = mobilityTimerAction(state, sample, 'skip', 8500);
  state = runSeconds(state, sample, 8500, 4);
  state = mobilityTimerAction(state, sample, 'skip', 12500);
  assert.equal(state.status, 'complete');
  assert.equal(state.activeMs, 7500, 'partially elapsed skipped movement is excluded');
  assert.equal(mobilityActiveMinutes(state), .1);
});

test('a suspended or stalled page pauses without inventing exercise or skipping instructions', () => {
  let state = mobilityTimerAction(freshMobilityTimer(), sample, 'skip', 0);
  state = mobilityTimerAction(state, sample, 'start', 0);
  state = runSeconds(state, sample, 0, 4);
  state = mobilityTimerAction(state, sample, 'tick', 500000);
  assert.equal(state.status, 'paused');
  assert.equal(state.index, 1);
  assert.equal(state.elapsedMs, 4000);
  assert.equal(state.activeMs, 0);
  assert.equal(state.interrupted, true);
  assert.equal(mobilityTimerAction(state, sample, 'tick', Infinity), state);
});

test('timer never double-records and restart clears prior completion', () => {
  let state = mobilityTimerAction(freshMobilityTimer(), sample, 'skip', 0);
  state = mobilityTimerAction(state, sample, 'start', 0);
  state = runSeconds(state, sample, 0, 20);
  state = mobilityTimerAction(state, sample, 'skip', 20000);
  state = mobilityTimerAction(state, sample, 'skip', 20000);
  state = mobilityTimerAction(state, sample, 'record', 20000);
  assert.equal(state.recorded, true);
  assert.equal(mobilityTimerAction(state, sample, 'record', 22000), state);
  assert.equal(mobilityTimerAction(state, sample, 'tick', 40000), state);
  assert.deepEqual(mobilityTimerAction(state, sample, 'reset', 40000), freshMobilityTimer());
  assert.equal(mobilityTimerAction(freshMobilityTimer(), sample, 'record', 0).recorded, false);
});

test('timer display stays non-negative and deadlines do not accumulate interval drift', () => {
  assert.equal(mobilityTimeLabel(-100), '0:00');
  assert.equal(mobilityTimeLabel(60001), '1:01');
  let state = mobilityTimerAction(freshMobilityTimer(), sample, 'start', 2000);
  state = mobilityTimerAction(state, sample, 'tick', 3329);
  state = mobilityTimerAction(state, sample, 'tick', 4997);
  assert.equal(state.elapsedMs, 2997);
  assert.equal(mobilityTimerAction(state, sample, 'tick', 1000), state);
});
