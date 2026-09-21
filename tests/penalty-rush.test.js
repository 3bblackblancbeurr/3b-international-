import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_SECONDS,
  ATTACKS_PER_HALF,
  ballTouchDistance,
  createPenaltyMatch,
  energyAfterAction,
  expirePossession,
  flowAfterAction,
  interpretAttackGesture,
  interpretKeeperGesture,
  keeperPowerState,
  recoverEnergy,
  resolveShot,
  scoutingBand,
  settlePossession,
  shotFromGesture,
} from '../src/games/penaltyRush/core.js';
import {
  KEEPER_POWERS,
  PENALTY_COUNTRIES,
  PLAYER_STYLES,
  createDefaultPenaltyProfile,
  normalizePenaltyProfile,
} from '../src/games/penaltyRush/config.js';

test('Penalty Rush is tuned for short two-thumb possessions', () => {
  assert.equal(ACTION_SECONDS, 15);
  assert.equal(ATTACKS_PER_HALF, 3);
  assert.equal(PENALTY_COUNTRIES.length, 8);
  assert.deepEqual(PENALTY_COUNTRIES.map((country) => country.id), ['fr', 'dz', 'ma', 'tn', 'tr', 'it', 'es', 'ee']);
});

test('attacker gestures map to acceleration, feints and a single expressive shot gesture', () => {
  assert.equal(interpretAttackGesture({ dx: 8, dy: 2, durationMs: 160, taps: 2 }).type, 'accelerate');
  assert.equal(interpretAttackGesture({ dx: 22, dy: 4, durationMs: 250, taps: 0 }).type, 'feint');
  assert.equal(interpretAttackGesture({ dx: 90, dy: 8, durationMs: 110, heldMs: 110, taps: 0 }).type, 'cut');

  const shot = interpretAttackGesture({ dx: 70, dy: -35, durationMs: 500, heldMs: 500, curve: .35 });
  assert.equal(shot.type, 'curved-shot');
  assert.ok(shot.shot.power > .3);
  assert.ok(shot.shot.targetX > 0);

  const panenka = shotFromGesture({ dx: 5, dy: -38, durationMs: 250, heldMs: 250, curve: 0 });
  assert.equal(panenka.type, 'panenka');
  assert.ok(panenka.power < 1);
});

test('keeper gestures remain contextual instead of becoming a button grid', () => {
  assert.equal(interpretKeeperGesture({ dx: -90, dy: 8, durationMs: 180 }).type, 'dive');
  assert.equal(interpretKeeperGesture({ dx: 8, dy: -90, durationMs: 210 }).type, 'high-claim');
  assert.equal(interpretKeeperGesture({ dx: 12, dy: 84, durationMs: 260 }).type, 'close-angle');
});

test('ball weight increases with speed and better control reduces the loose touch', () => {
  const calm = ballTouchDistance(.2, 1);
  const sprint = ballTouchDistance(.95, 1);
  const technical = ballTouchDistance(.95, 1.1);
  assert.ok(sprint > calm);
  assert.ok(technical < sprint);
});

test('energy prevents feint and acceleration spam while varied actions build Flow', () => {
  assert.ok(energyAfterAction(100, 'accelerate') < energyAfterAction(100, 'rhythm'));
  const first = flowAfterAction(0, 'feint', null, true);
  const varied = flowAfterAction(first, 'cut', 'feint', true);
  const repeated = flowAfterAction(first, 'feint', 'feint', true);
  assert.ok(varied > repeated);
  assert.ok(recoverEnergy(40, 2, false) > 40);
  assert.ok(recoverEnergy(40, 2, true) < recoverEnergy(40, 2, false));
});

test('keeper powers share energy and all expose a drawback', () => {
  assert.deepEqual(Object.keys(KEEPER_POWERS).sort(), ['anchor', 'impulse', 'phantom', 'read']);
  for (const power of Object.values(KEEPER_POWERS)) {
    assert.ok(power.cost >= 40 && power.cost <= 65);
    assert.ok(power.drawback.length > 8);
    const use = keeperPowerState(power.id, 100, 1000);
    assert.equal(use.ok, true);
    assert.equal(use.energy, 100 - power.cost);
    assert.equal(use.effect.id, power.id);
  }
  assert.equal(keeperPowerState('phantom', 20).ok, false);
});

test('keeper impulse changes shot resolution without guaranteeing a save', () => {
  const shot = { type: 'shot', power: .82, precision: .9, curve: 0, targetX: .25, targetY: .42 };
  const normal = resolveShot({ shot, keeperX: 0, keeperGesture: { type: 'hold', direction: 0, intensity: 0 } });
  const powered = resolveShot({
    shot,
    keeperX: 0,
    keeperGesture: { type: 'hold', direction: 0, intensity: 0 },
    keeperEffect: { id: 'impulse', disruption: .18, reach: 1 },
  });
  assert.notEqual(powered.target, normal.target);
  assert.ok(['goal', 'save', 'frame'].includes(powered.reason));
});

test('three attacks switch the roles, then a tie opens Duel d’Or', () => {
  let match = createPenaltyMatch([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], 0);
  assert.equal(match.attacker, 0);
  assert.equal(match.keeper, 1);

  match = settlePossession(match, 'goal', 1000);
  match = settlePossession(match, 'save', 2000);
  match = settlePossession(match, 'save', 3000);
  assert.equal(match.phase, 'second-half');
  assert.equal(match.attacker, 1);
  assert.equal(match.keeper, 0);
  assert.deepEqual(match.score, [1, 0]);

  match = settlePossession(match, 'goal', 4000);
  match = settlePossession(match, 'save', 5000);
  match = settlePossession(match, 'save', 6000);
  assert.equal(match.phase, 'golden-duel');
  assert.deepEqual(match.score, [1, 1]);

  match = settlePossession(match, 'goal', 7000);
  assert.equal(match.status, 'playing');
  assert.equal(match.attacker, 1);

  match = settlePossession(match, 'save', 8000);
  assert.equal(match.status, 'finished');
  assert.equal(match.winner, 0);
});

test('possession expiry is server-resolvable and counts as a missed attack', () => {
  const match = createPenaltyMatch([{ id: 'a' }, { id: 'b' }], 1000);
  const before = match.possessionDeadline;
  const untouched = expirePossession(match, before - 1);
  assert.equal(untouched.attacks[0], 0);
  const expired = expirePossession(match, before);
  assert.equal(expired.attacks[0], 1);
  assert.equal(expired.history.at(-1).outcome, 'timeout');
});

test('career scouting requires a real sample before national selection', () => {
  assert.equal(scoutingBand({ nationalRank: 1, matches: 4, reputation: 2000, pressureScore: 1 }), 'non-classe');
  assert.equal(scoutingBand({ nationalRank: 55, matches: 20, reputation: 250, pressureScore: .4 }), 'radar');
  assert.equal(scoutingBand({ nationalRank: 20, matches: 30, reputation: 600, pressureScore: .7 }), 'observe');
  assert.equal(scoutingBand({ nationalRank: 8, matches: 35, reputation: 900, pressureScore: .5 }), 'preselection');
  assert.equal(scoutingBand({ nationalRank: 8, matches: 35, reputation: 900, pressureScore: .8 }), 'selection');
});

test('player customization is cosmetic and normalizes identity safely', () => {
  const account = { passport: { name: 'Neo7', country: 'France' } };
  const base = createDefaultPenaltyProfile(account);
  const normalized = normalizePenaltyProfile({
    ...base,
    shirtName: 'neo seven forever too long',
    shirtNumber: 150,
    countryId: 'xx',
    styleId: 'cheat-mode',
    keeperPowers: ['read', 'read', 'unknown'],
    kit: { shirtPrimary: '#ff00ff' },
    boots: { preset: 'future' },
  }, account);

  assert.equal(normalized.shirtName.length <= 14, true);
  assert.equal(normalized.shirtNumber, 99);
  assert.equal(normalized.countryId, 'fr');
  assert.equal(normalized.styleId, 'technicien');
  assert.deepEqual(normalized.keeperPowers, ['read', 'anchor']);
  assert.equal(normalized.kit.shirtPrimary, '#ff00ff');
  assert.equal(normalized.boots.preset, 'future');

  for (const style of Object.values(PLAYER_STYLES)) {
    for (const value of Object.values(style.tuning)) assert.ok(value >= .95 && value <= 1.08);
  }
});
