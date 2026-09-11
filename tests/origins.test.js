import test from 'node:test';
import assert from 'node:assert/strict';
import { OriginsGame } from '../src/games/origins/engine.js';
import {
  moveBody,
  screenMovement,
  createOriginsCamera,
  updateOriginsCamera,
} from '../src/games/origins/motion.js';
import { readDoorCampaign } from '../src/games/door-campaign.js';
import { createOriginsLevel, validOriginsRun, ZONES } from '../src/games/origins/level.js';
const game = () => new OriginsGame(null, 1, { skipIntro: true });
const tick = (g, t, input = { x: 0, z: 0 }) => {
  for (let i = 0; i < Math.ceil(t * 120); i++) g.update(1 / 120, input);
};
test('origins: acceleration, braking, facing, diagonals and collisions stay bounded', () => {
  const g = game();
  tick(g, 1, { x: 1, z: 0 });
  assert.ok(g.player.x > 4.5 && g.player.x < 5.3);
  assert.ok(g.player.heading > 1.5);
  const x = g.player.x;
  tick(g, 0.4);
  assert.ok(g.player.x - x < 0.3);
  assert.ok(Math.hypot(g.player.vx, g.player.vz) < 0.01);
  const a = { x: 0, z: 0, r: 0.4 };
  moveBody(a, 10, 0, [{ x: 3, z: 0, r: 1 }], 20);
  assert.ok(a.x < 1.61);
  const d = screenMovement(1, 1, 0);
  assert.ok(Math.abs(Math.hypot(d.x, d.z) - 1) < 1e-9);
});
test('origins: camera anticipates smoothly and widens gradually near several enemies', () => {
  const g = game(),
    c = createOriginsCamera();
  g.player.x = 5;
  g.player.vx = 5;
  updateOriginsCamera(c, g, 1 / 60);
  assert.ok(c.lookX > 0 && c.lookX < 1);
  const old = c.zoom;
  g.enemies
    .filter((e) => e.zone === 2)
    .forEach((e) => {
      e.x = 5;
      e.z = 1;
    });
  updateOriginsCamera(c, g, 0.016);
  assert.ok(c.zoom >= old && c.zoom - old < 0.05);
});
test('origins: introduction is short, skippable, and does not move or damage Kaïs', () => {
  const g = new OriginsGame();
  tick(g, 2, { x: 1, z: 1 });
  assert.equal(g.player.x, 0);
  assert.equal(g.time, 0);
  g.attack();
  assert.equal(g.player.attack, null);
  g.skipIntro();
  tick(g, 0.5, { x: 1, z: 0 });
  assert.ok(g.player.x > 1);
});
test('origins: a light combo, buffered attack and heavy charge damage and stagger', () => {
  const g = game(),
    e = g.enemies[0];
  Object.assign(e, { x: 0, z: 2, maxHp: 300, hp: 300, cooldown: 20 });
  g.attack();
  tick(g, 0.18);
  g.attack();
  tick(g, 0.5);
  assert.ok(e.hp < 280);
  assert.ok(g.combo >= 1);
  g.startCharge();
  tick(g, 0.8);
  g.releaseCharge();
  assert.equal(g.player.attack.kind, 'charged');
  tick(g, 0.8);
  assert.ok(e.hp < 240);
});
test('origins: attacks cannot hit behind Kaïs and a corpse cannot score twice', () => {
  const g = game(),
    e = g.enemies[0];
  Object.assign(e, { x: 0, z: 2, hp: 1, cooldown: 20 });
  g.attack();
  tick(g, 0.2);
  const score = g.score;
  g.hurtEnemy(e, 100);
  assert.equal(g.score, score);
  assert.equal(g.defeated.has(e.id), true);
  assert.equal(e.state, 'dead');
});
test('origins: perfect dodge creates energy and counter without taking the telegraphed hit', () => {
  const g = game(),
    e = g.enemies[0];
  Object.assign(e, { x: 0, z: 1.5, state: 'windup', timer: 0.18, windup: 0.7, attackAngle: Math.PI });
  g.dodge({ x: 1, z: 0 });
  assert.equal(g.perfects, 1);
  assert.ok(g.player.counter > 0);
  assert.ok(g.player.energy >= 59);
  tick(g, 0.45, { x: 1, z: 0 });
  assert.equal(g.player.hp, 100);
  g.attack();
  assert.equal(g.player.attack.kind, 'counter');
});
test('origins: parry and damage grace prevent simultaneous enemy hits, death freezes play', () => {
  const g = game(),
    e = g.enemies[0];
  g.parry();
  g.hurt(30, e);
  assert.equal(g.player.hp, 100);
  assert.ok(g.player.counter > 0);
  g.player.invulnerable = 0;
  g.player.parry = 0;
  g.hurt(20, e);
  g.hurt(20, e);
  assert.equal(g.player.hp, 80);
  g.player.invulnerable = 0;
  g.hurt(100, e);
  const time = g.time;
  tick(g, 2, { x: 1, z: 0 });
  assert.equal(g.time, time);
  assert.equal(g.mode, 'dead');
  assert.equal(g.won, false);
});
test('origins: Matrix consumes energy, hits nearby enemies and clears nearby projectiles', () => {
  const g = game(),
    e = g.enemies[0];
  Object.assign(e, { x: 0, z: 3, hp: 200 });
  g.player.energy = 100;
  g.projectiles = [{ x: 1, z: 1, life: 3 }];
  g.power();
  assert.ok(e.hp < 200);
  assert.equal(g.projectiles.length, 0);
  const hp = e.hp;
  g.power();
  assert.equal(e.hp, hp);
  assert.ok(g.player.energy < 75);
});
test('origins: barriers require interaction, ordered runes, court and boss victory', () => {
  const g = game();
  assert.equal(g.maxZ(), 18);
  Object.assign(g.player, { x: -6, z: 7 });
  g.interact();
  assert.equal(g.fragments, 2);
  assert.equal(g.maxZ(), 40);
  g.zone = 1;
  Object.assign(g.player, { x: 5, z: 37 });
  g.interact();
  assert.equal(g.runeSequence.length, 0);
  for (const [id, x] of [
    ['sun', -5],
    ['moon', 0],
    ['star', 5],
  ]) {
    Object.assign(g.player, { x, z: 37 });
    g.interact();
    assert.ok(g.activated.has(id));
  }
  assert.equal(g.fragments, 4);
  assert.equal(g.maxZ(), 65);
  g.zone = 2;
  for (const e of g.enemies.filter((e) => e.zone === 2)) g.hurtEnemy(e, 10000);
  assert.equal(g.fragments, 6);
  assert.equal(g.maxZ(), 92);
  g.zone = 3;
  g.hurtEnemy(g.boss, 10000);
  assert.equal(g.fragments, 8);
  assert.equal(g.maxZ(), 110);
});
test('origins: all five zones exist, hidden caches and pickups award once', () => {
  const g = game();
  assert.equal(ZONES.length, 5);
  Object.assign(g.player, { x: -10, z: 14 });
  assert.equal(g.closestInteraction(), null);
  Object.assign(g.player, { x: -8, z: 12 });
  g.interact();
  Object.assign(g.player, { x: -10, z: 14 });
  g.interact();
  const score = g.score;
  g.interact();
  assert.equal(g.score, score);
  assert.ok(g.opened.has('secret-cache'));
  assert.deepEqual(readDoorCampaign(g.snapshot()), g.snapshot());
});
test('origins: saved checkpoints validate, legacy campaigns survive and malformed runs fail', () => {
  const g = game();
  const saved = g.snapshot();
  assert.ok(validOriginsRun(saved.originsRun, 1));
  assert.deepEqual(new OriginsGame(saved).snapshot(), saved);
  assert.throws(() => readDoorCampaign({ ...saved, originsRun: { ...saved.originsRun, zone: 4 } }));
  assert.throws(() => readDoorCampaign({ ...saved, originsRun: { ...saved.originsRun, fragments: 8 } }));
  assert.throws(() =>
    readDoorCampaign({ ...saved, originsRun: { ...saved.originsRun, defeated: ['not-an-enemy'] } }),
  );
  assert.equal(createOriginsLevel(100).difficulty.level, 100);
});
