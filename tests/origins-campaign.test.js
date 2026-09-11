import test from 'node:test';
import assert from 'node:assert/strict';
import { OriginsGame } from '../src/games/origins/engine.js';
import { freshDoorCampaign, readDoorCampaign } from '../src/games/door-campaign.js';
import { validOriginsRun, createOriginsLevel } from '../src/games/origins/level.js';
import {
  screenMovement,
  createOriginsCamera,
  updateOriginsCamera,
} from '../src/games/origins/motion.js';
import { createStepper } from '../src/games/runtime.js';

const dt = 1 / 60;
// Exercise the public simulation controls, without granting health, damage, movement or progress.
function pilot(g) {
  let lastAttack = -1,
    lastParry = -1,
    lastPower = -1;
  return (input = { x: 0, z: 0 }) => {
    const p = g.player,
      near = g.enemies
        .filter((e) => e.hp > 0 && e.zone === g.zone)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)),
      e = near[0];
    if (e) {
      const d = Math.hypot(e.x - p.x, e.z - p.z),
        danger = near.find((v) => v.state === 'windup' && v.timer < 0.14 && g.inEnemyAttack(v, p));
      if (danger && g.time - lastParry > 0.86) {
        g.parry();
        lastParry = g.time;
      }
      if (d < 7 && p.energy >= 75 && g.time - lastPower > 1) {
        g.power();
        lastPower = g.time;
      }
      if (d < 3.1 && g.time - lastAttack > 0.32 && !danger) {
        g.attack();
        lastAttack = g.time;
      }
    }
    if (p.hp < 35 && g.elixirs) g.heal();
    g.update(dt, input);
    assert.notEqual(g.mode, 'dead', `pilot died at level ${g.stageNumber}, zone ${g.zone}`);
  };
}
function travel(g, step, x, z) {
  for (let i = 0; i < 3000; i++) {
    const dx = x - g.player.x,
      dz = z - g.player.z;
    if (Math.hypot(dx, dz) < 0.4) return;
    step({ x: Math.abs(dx) > 0.2 ? Math.sign(dx) : 0, z: Math.abs(dz) > 0.2 ? Math.sign(dz) : 0 });
  }
  assert.fail(`blocked level ${g.stageNumber}: ${JSON.stringify([g.player.x, g.player.z, x, z])}`);
}
function battle(g, step) {
  for (let i = 0; i < 6000; i++) {
    const p = g.player,
      e = g.enemies
        .filter((e) => e.hp > 0 && e.zone === g.zone)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!e) return;
    const dx = e.x - p.x,
      dz = e.z - p.z;
    step(
      Math.hypot(dx, dz) > 2
        ? { x: Math.abs(dx) > 0.4 ? Math.sign(dx) : 0, z: Math.abs(dz) > 0.4 ? Math.sign(dz) : 0 }
        : { x: 0, z: 0 },
    );
  }
  assert.fail(`combat stalled at ${g.stageNumber}`);
}
test('origins campaign: all 100 complete through movement, ordered runes, combat and the gate', () => {
  let campaign = freshDoorCampaign(),
    previousHealth = 0,
    peakProjectiles = 0;
  for (let level = 1; level <= 100; level++) {
    const g = new OriginsGame(campaign, level, { skipIntro: true }),
      step = pilot(g),
      go = (x, z) => travel(g, step, x, z);
    assert.ok(g.boss.maxHp >= previousHealth);
    previousHealth = g.boss.maxHp;
    go(-5, 7);
    g.interact();
    go(0, 17);
    go(0, 22);
    go(0, 27);
    go(-5, 29);
    battle(g, step);
    go(-5, 33);
    go(-5, 36);
    g.interact();
    go(0, 37);
    g.interact();
    go(5, 37);
    g.interact();
    go(0, 42);
    battle(g, step);
    assert.equal(g.fragments, 6);
    go(0, 62);
    go(0, 68);
    battle(g, step);
    assert.equal(g.boss.phase, 3);
    assert.equal(g.fragments, 8);
    go(0, 94);
    go(0, 106);
    assert.ok(validOriginsRun(g.snapshot().originsRun, level));
    assert.deepEqual(readDoorCampaign(g.snapshot()), g.snapshot());
    const before = g.score;
    g.interact();
    assert.equal(g.mode, 'gate');
    for (let i = 0; i < 310; i++) g.update(dt);
    assert.equal(g.won, true);
    assert.equal(g.campaign.completed.length, level);
    assert.ok(g.score > before);
    assert.ok(g.stars >= 1 && g.stars <= 3);
    assert.ok(g.events.length <= 48);
    peakProjectiles = Math.max(peakProjectiles, g.projectiles.length);
    const score = g.score;
    g.finish();
    assert.equal(g.score, score);
    campaign = g.snapshot();
    assert.equal(campaign.originsRun, null);
  }
  assert.equal(campaign.selected, 100);
  assert.ok(peakProjectiles <= 32);
});
test('origins: movement and smooth follow remain consistent at 30, 60 and 120 Hz; paused camera freezes', () => {
  const end = [];
  for (const hz of [30, 60, 120]) {
    const g = new OriginsGame(null, 1, { skipIntro: true }),
      stepper = createStepper(),
      c = createOriginsCamera();
    for (let i = 0; i < hz; i++) {
      stepper.advance(1 / hz, (dt) => g.update(dt, { x: 0, z: 1 }));
      updateOriginsCamera(c, g, 1 / hz);
    }
    const frozen = structuredClone(c);
    updateOriginsCamera(c, g, 0);
    assert.deepEqual(c, frozen);
    end.push(g.player.z);
  }
  assert.ok(Math.max(...end) - Math.min(...end) < 0.001);
  assert.ok(screenMovement(1, 0).x < 0);
  assert.ok(screenMovement(0, 1).z > 0);
});
test('origins: a heavy strike cannot indefinitely stunlock the boss', () => {
  const g = new OriginsGame(null, 1, { skipIntro: true }),
    b = g.boss;
  g.hurtEnemy(b, 10, 0, true);
  assert.equal(b.state, 'stagger');
  b.state = 'windup';
  b.timer = 0.5;
  g.hurtEnemy(b, 10, 0, true);
  assert.equal(b.state, 'windup');
  assert.equal(b.timer, 0.5);
});
test('origins: the last threshold restores after death, caches cannot create extra elixirs', () => {
  const g = new OriginsGame(null, 1, { skipIntro: true });
  Object.assign(g.player, { x: -6, z: 7 });
  g.interact();
  Object.assign(g.player, { x: 0, z: 20 });
  g.update(dt);
  const saved = g.snapshot();
  g.player.invulnerable = 0;
  g.hurt(999);
  const retry = new OriginsGame(g.snapshot());
  assert.equal(retry.zone, 1);
  assert.equal(retry.player.z, 20);
  assert.equal(retry.player.hp, saved.originsRun.hp);
  assert.equal(retry.fragments, 2);
  assert.equal(retry.defeated.size, g.checkpointData.defeated.length);
  assert.throws(() => readDoorCampaign({ ...saved, originsRun: { ...saved.originsRun, elixirs: 2 } }));
});
test('origins: crossing a fissure on foot falls, an airborne dodge crosses it', () => {
  const make = () => {
    const g = new OriginsGame(null, 1, { skipIntro: true });
    g.activated.add('first-rune');
    g.fragments = 2;
    g.zone = 1;
    g.player.x = -6;
    g.player.z = 23;
    return g;
  };
  const walking = make();
  for (let i = 0; i < 30; i++) walking.update(dt, { x: 0, z: 1 });
  assert.ok(walking.falls > 0);
  const dodging = make();
  dodging.dodge({ x: 0, z: 1 });
  for (let i = 0; i < 38; i++) dodging.update(dt, { x: 0, z: 1 });
  assert.equal(dodging.falls, 0);
  assert.ok(dodging.player.z > 26.1);
});
test('origins: missing seals cannot be imported, and reopening cleared content gives no fragments', () => {
  const g = new OriginsGame(null, 1, { skipIntro: true });
  const run = g.snapshot().originsRun;
  assert.equal(validOriginsRun({ ...run, activated: ['first-rune'], fragments: 0 }, 1), false);
  assert.equal(validOriginsRun({ ...run, defeated: ['nameless'], fragments: 8 }, 1), false);
  assert.equal(createOriginsLevel(100).enemies.length, 10);
});
