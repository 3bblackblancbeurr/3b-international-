import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceStagePointerGesture, advanceStageTravel, chooseStageScene, clampStagePosition, createStageClock,
  createStagePointerGesture, findStageHome, findStageRestPosition, findStageWalkTarget,
  findVisibleHeadingAnchors, getStageBounds, headingAnchorPosition, homeStagePosition,
  interpolateStageTravel, isPointerNearStage, isStagePathClear, isStagePositionClear, normalizeStageAction,
  readHeadingAnchorRect, restoreStagePlacement, stageAutonomousDelay, stagePlacement, stepCompanionFall,
} from '../src/companion/companion-stage.js';

const mobileBounds = () => getStageBounds({ width: 390, height: 844, safeTop: 96, safeBottom: 90 }, { width: 100, height: 116 });
const within = (position, bounds) => {
  assert.ok(position.x >= bounds.minX && position.x <= bounds.maxX, `x ${position.x} outside viewport`);
  assert.ok(position.y >= bounds.minY && position.y <= bounds.maxY, `y ${position.y} outside viewport`);
};

test('the stage reserves the actual viewport, header and bottom navigation', () => {
  const bounds = mobileBounds();
  assert.equal(bounds.minY, 96);
  assert.equal(bounds.maxY + bounds.height, 844 - 90);
  assert.deepEqual(homeStagePosition(bounds, 'left'), { x: 12, y: 638 });
  assert.deepEqual(homeStagePosition(bounds), { x: 278, y: 638 });
  assert.deepEqual(clampStagePosition({ x: -100, y: 4000 }, bounds), { x: 12, y: 638 });
});

test('visual viewport offsets and a small rotated viewport remain bounded', () => {
  const bounds = getStageBounds({ width: 320, height: 240, offsetLeft: 25, offsetTop: 80, safeTop: 96, safeBottom: 100 }, 112);
  assert.equal(bounds.minX, 37);
  assert.equal(bounds.maxX, 221);
  assert.ok(bounds.minY <= bounds.maxY);
  const restored = clampStagePosition({ x: 700, y: 800 }, bounds);
  within(restored, bounds);
  assert.ok(restored.x + bounds.width <= 345);
  assert.ok(restored.y + bounds.height <= 320);
  within(clampStagePosition({ x: NaN, y: Infinity }, bounds), bounds);
});

test('saved placement survives rotation and rejects corrupt or incompatible storage', () => {
  const bounds = mobileBounds();
  const saved = stagePlacement({ x: 88, y: 480 }, bounds, 'left');
  const original = restoreStagePlacement(saved, bounds);
  assert.deepEqual(original, { side: 'left', position: { x: 88, y: 480 } });
  const rotated = getStageBounds({ width: 844, height: 390, safeTop: 64, safeBottom: 48 }, { width: 112, height: 155 });
  const restored = restoreStagePlacement(saved, rotated);
  within(restored.position, rotated);
  assert.equal(restored.side, 'left');
  for (const invalid of [null, [], {}, { ...saved, x: Infinity }, { ...saved, y: -0.2 }, { ...saved, version: 99 }, { ...saved, side: 'middle' }]) {
    assert.equal(restoreStagePlacement(invalid, rotated), null);
  }
});

test('tap detection uses pointer movement, tolerates touch jitter and ignores another finger', () => {
  const event = { pointerId: 7, pointerType: 'touch', clientX: 210, clientY: 410 };
  const gesture = createStagePointerGesture(event, { x: 180, y: 360 }, 100);
  const jitter = advanceStagePointerGesture(gesture, { ...event, clientX: 217, clientY: 414 }, 130);
  assert.equal(jitter.moved, false);
  assert.deepEqual(jitter.origin, { x: 180, y: 360 });
  assert.equal(advanceStagePointerGesture(gesture, { ...event, pointerId: 8, clientX: 20 }, 140), gesture);
  const dragged = advanceStagePointerGesture(gesture, { ...event, clientX: 230 }, 180);
  assert.equal(dragged.moved, true);
  assert.ok(dragged.vx > 0 && dragged.vx <= 740);
  const returned = advanceStagePointerGesture(dragged, event, 220);
  assert.equal(returned.moved, true, 'a real drag does not become a click when the pointer returns');
});

test('mouse gestures keep a smaller threshold without using the animated target rectangle', () => {
  const event = { pointerId: 1, pointerType: 'mouse', clientX: 500, clientY: 500 };
  const gesture = createStagePointerGesture(event, { x: 444, y: 400 }, 0);
  const overMovingArt = { ...event, currentTarget: { getBoundingClientRect: () => ({ left: 30, top: 10 }) } };
  assert.equal(advanceStagePointerGesture(gesture, overMovingArt, 200).moved, false);
  assert.equal(advanceStagePointerGesture(gesture, { ...event, clientX: 507 }, 200).moved, true);
});

test('approaching the actual footprint pauses mouse travel without treating touch as hover', () => {
  const position = { x: 100, y: 200 };
  const size = { width: 112, height: 155 };
  assert.equal(isPointerNearStage({ x: 90, y: 270, pointerType: 'mouse' }, position, size), true);
  assert.equal(isPointerNearStage({ x: 170, y: 370, pointerType: 'pen' }, position, size), true);
  assert.equal(isPointerNearStage({ x: 50, y: 270, pointerType: 'mouse' }, position, size), false);
  assert.equal(isPointerNearStage({ x: 150, y: 270, pointerType: 'touch' }, position, size), false);
});

test('a throw moves on both axes and always reaches a bounded, finite landing', () => {
  const bounds = mobileBounds();
  let body = { x: 140, y: 130, vx: 650, vy: -600 };
  let seenX = false;
  let seenY = false;
  let floorHits = 0;
  for (let frame = 0; frame < 600 && !body.settled; frame += 1) {
    body = stepCompanionFall(body, 1 / 60, bounds);
    within(body, bounds);
    assert.ok(Number.isFinite(body.vx) && Number.isFinite(body.vy));
    seenX ||= Math.abs(body.x - 140) > 25;
    seenY ||= Math.abs(body.y - 130) > 40;
    if (body.hitFloor) floorHits += 1;
  }
  assert.equal(body.settled, true);
  assert.equal(body.y, bounds.maxY);
  assert.equal(body.vx, 0);
  assert.equal(body.vy, 0);
  assert.ok(seenX && seenY);
  assert.ok(floorHits >= 1 && floorHits <= 3, 'bounce count is bounded');
  assert.ok(body.bounces <= 2);
});

test('a long stalled frame cannot amplify a throw or jump through a boundary', () => {
  const bounds = mobileBounds();
  const start = { x: 270, y: 350, vx: 3000, vy: 5000 };
  assert.deepEqual(stepCompanionFall(start, 12, bounds), stepCompanionFall(start, 0.034, bounds));
  const corrupt = stepCompanionFall({ x: Infinity, y: NaN, vx: NaN, vy: Infinity }, 1 / 60, bounds);
  within(corrupt, bounds);
  assert.ok(Number.isFinite(corrupt.vx) && Number.isFinite(corrupt.vy));
});

test('a dense mobile page still gives the first stroll a real safe corridor', () => {
  const bounds = mobileBounds();
  const controls = [
    { left: 16, top: 270, right: 374, bottom: 600 },
    { left: 180, top: 615, right: 376, bottom: 675 },
    { left: 0, top: 766, right: 390, bottom: 844 },
    { left: 0, top: 0, right: 390, bottom: 84 },
  ];
  const home = findStageHome(bounds, 'right', controls);
  const target = findStageWalkTarget(home, bounds, controls, () => 0.5);
  assert.ok(isStagePositionClear(home, bounds, controls));
  assert.ok(target, 'mobile cards must not reduce the companion to a permanent still image');
  assert.ok(Math.hypot(target.x - home.x, target.y - home.y) >= 30);
  assert.ok(isStagePathClear(home, target, bounds, controls));
});

test('a narrow free side can support a two-axis stroll without crossing a button', () => {
  const bounds = mobileBounds();
  const from = { x: bounds.minX, y: bounds.maxY };
  const controls = [{ left: 122, top: 120, right: 385, bottom: 735 }];
  const target = findStageWalkTarget(from, bounds, controls, () => 0.8);
  assert.ok(target);
  assert.notEqual(target.y, from.y);
  assert.ok(isStagePathClear(from, target, bounds, controls));
});

test('path safety checks intermediate positions, including narrow interactive controls', () => {
  const bounds = mobileBounds();
  const from = { x: 12, y: 450 };
  const to = { x: 278, y: 450 };
  const controls = [{ left: 192, right: 196, top: 400, bottom: 590 }];
  assert.ok(isStagePositionClear(from, bounds, controls));
  assert.ok(isStagePositionClear(to, bounds, controls));
  assert.equal(isStagePathClear(from, to, bounds, controls), false);
  assert.equal(isStagePathClear(from, to, bounds, [], 600), false, 'a leap cannot leave the viewport');
});

test('a fully occupied stage yields stationary choices instead of crossing controls', () => {
  const bounds = mobileBounds();
  const controls = [{ left: 0, right: 390, top: 0, bottom: 844 }];
  const from = homeStagePosition(bounds);
  assert.equal(findStageWalkTarget(from, bounds, controls, () => 0), null);
  assert.notEqual(chooseStageScene({ canWalk: false, hasAnchor: false, random: () => 0 }), 'walk');
});

test('successive strolls explore both axes and remember recently visited locations', () => {
  const bounds = getStageBounds({ width: 960, height: 800, safeTop: 64, safeBottom: 24 }, { width: 112, height: 155 });
  let position = homeStagePosition(bounds);
  const recent = [position];
  for (let index = 0; index < 10; index += 1) {
    const target = findStageWalkTarget(position, bounds, [], () => 0.5, { recent });
    assert.ok(target);
    assert.ok(isStagePathClear(position, target, bounds));
    assert.ok(Math.hypot(target.x - position.x, target.y - position.y) >= 30);
    if (index > 1) assert.ok(Math.hypot(target.x - recent.at(-2).x, target.y - recent.at(-2).y) > 50, 'avoid pacing between the same two spots');
    position = target; recent.push(position);
  }
  assert.ok(new Set(recent.map(point => Math.floor(point.x / 180))).size >= 4);
  assert.ok(new Set(recent.map(point => Math.floor(point.y / 160))).size >= 4);
});

test('a control appearing beneath the companion has a nearby safe exit', () => {
  const bounds = mobileBounds();
  const from = { x: 160, y: 380 };
  const controls = [{ left: 165, right: 275, top: 390, bottom: 500 }];
  const safe = findStageRestPosition(from, bounds, controls);
  assert.ok(safe);
  assert.ok(isStagePositionClear(safe, bounds, controls));
  assert.ok(isStagePathClear(from, safe, bounds, controls));
  assert.ok(Math.hypot(safe.x - from.x, safe.y - from.y) < 150, 'prefer the nearest exit over a home corner');
  assert.equal(findStageRestPosition(from, bounds, [{ left: 0, right: 390, top: 0, bottom: 844 }]), null);
});

test('continuous path safety handles grazing, diagonal thin controls and initial overlap', () => {
  const bounds = mobileBounds();
  const control = { left: 172, right: 172.5, top: 440, bottom: 440.5 };
  assert.equal(isStagePathClear({ x: 12, y: 300 }, { x: 278, y: 540 }, bounds, [control]), false);
  assert.equal(isStagePathClear({ x: 12, y: 100 }, { x: 278, y: 100 }, bounds, [control]), true);
  assert.equal(isStagePathClear({ x: 120, y: 380 }, { x: 12, y: 300 }, bounds, [control]), true, 'an existing overlap can be exited');
  assert.equal(isStagePathClear({ x: -80, y: 300 }, { x: 12, y: 300 }, bounds), false);
});

test('travel uses active frame time, stays frame-rate independent and caps stalled frames', () => {
  let at60 = 0;
  let at120 = 0;
  for (let index = 0; index < 60; index += 1) at60 = advanceStageTravel(at60, 1 / 60, 3000);
  for (let index = 0; index < 120; index += 1) at120 = advanceStageTravel(at120, 1 / 120, 3000);
  assert.ok(Math.abs(at60 - 1000) < 0.0001);
  assert.ok(Math.abs(at60 - at120) < 0.0001);
  assert.equal(advanceStageTravel(1000, 9, 3000), 1034);
  assert.equal(advanceStageTravel(1000, -1, 3000), 1000);
  assert.equal(advanceStageTravel(2990, 0.034, 3000), 3000);
  assert.equal(advanceStageTravel(NaN, Infinity, 3000), 0);
});

test('travel easing arrives exactly at the target with an optional bounded arc', () => {
  const from = { x: 10, y: 100 };
  const to = { x: 200, y: 50 };
  assert.deepEqual(interpolateStageTravel(from, to, 0, 20), from);
  assert.deepEqual(interpolateStageTravel(from, to, 1, 20), to);
  assert.deepEqual(interpolateStageTravel(from, to, 2, 20), to);
  assert.deepEqual(interpolateStageTravel(from, to, 0.5, 20), { x: 105, y: 55 });
});

test('personality choices are deterministic, varied and do not repeat the last two scenes', () => {
  assert.equal(chooseStageScene({ personality: 'calme', random: () => 0.4 }), 'sit');
  assert.equal(chooseStageScene({ personality: 'energique', random: () => 0.3 }), 'dance');
  const recent = [];
  for (let index = 0; index < 80; index += 1) {
    const kind = chooseStageScene({ personality: 'taquin', recent, hasAnchor: true, random: () => ((index * 17) % 79) / 79 });
    assert.ok(!recent.slice(-2).includes(kind));
    recent.push(kind);
  }
  assert.ok(new Set(recent).size >= 5);
  for (const value of [0, 0.2, 0.5, 0.85, 1]) {
    assert.notEqual(chooseStageScene({ personality: 'audacieux', hasAnchor: false, random: () => value }), 'hang');
  }
});

test('the first initiative arrives promptly, with later energy-aware spacing', () => {
  assert.equal(stageAutonomousDelay({ first: true, random: () => 0 }), 3200);
  assert.ok(stageAutonomousDelay({ first: true, random: () => 1 }) < 4801);
  assert.ok(stageAutonomousDelay({ batterySaver: true, random: () => 0.5 })
    > stageAutonomousDelay({ batterySaver: false, random: () => 0.5 }));
});

test('reduced motion, low power, discretion and initiative off create no autonomous deadline', () => {
  for (const environment of [{ reducedMotion: true }, { lowPower: true }, { discreet: true }, { autonomous: false }]) {
    assert.equal(stageAutonomousDelay({ ...environment, first: true }), null);
    assert.equal(chooseStageScene(environment), null);
  }
  // Disabling initiatives does not remove explicit interaction from the command vocabulary.
  assert.equal(normalizeStageAction('walk'), 'walk');
  assert.equal(normalizeStageAction('cheer'), 'celebrate');
  assert.equal(normalizeStageAction('focus'), 'focus');
  assert.equal(normalizeStageAction('sleep'), 'sleep');
  assert.equal(normalizeStageAction('open-account'), null);
});

test('hanging puts the hands at the actual letter baseline and rejects clipped letters', () => {
  const bounds = mobileBounds();
  const rect = { left: 185, right: 199, top: 160, bottom: 190 };
  const position = headingAnchorPosition(rect, bounds);
  assert.ok(position);
  assert.equal(position.x + bounds.width / 2, 192);
  assert.equal(position.y + bounds.height * 0.2, 190);
  assert.equal(headingAnchorPosition({ ...rect, left: 0, right: 5 }, bounds), null);
  assert.equal(headingAnchorPosition({ ...rect, top: -20, bottom: 10 }, bounds), null);
});

function headingFixture() {
  const calls = { mutations: 0, ranges: 0, privateReads: 0 };
  const makeHeading = (text, { privateHeading = false, hidden = false } = {}) => {
    const heading = {
      privateHeading, hidden, getAttribute: () => null,
      closest: () => privateHeading ? {} : null,
      getBoundingClientRect: () => ({ left: 100, right: 270, top: 140, bottom: 170, width: 170, height: 30 }),
      contains: element => element === heading,
    };
    const node = { isConnected: true, parentElement: heading, _text: text };
    Object.defineProperty(node, 'textContent', { get() {
      if (privateHeading || hidden) { calls.privateReads += 1; throw new Error('Must not inspect private/hidden text'); }
      return text;
    } });
    heading.node = node;
    return heading;
  };
  const headings = [makeHeading('PRIVATE', { privateHeading: true }), makeHeading('HIDDEN', { hidden: true }), makeHeading('3B Héritage')];
  const doc = {
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }) },
    querySelectorAll: () => headings,
    createTreeWalker(heading) {
      let used = false;
      return { nextNode() { if (used) return null; used = true; return heading.node; } };
    },
    createRange() {
      calls.ranges += 1;
      let start;
      return {
        setStart(node, offset) { if (offset >= node._text.length) throw new Error('Stale text'); start = offset; },
        setEnd() {},
        getBoundingClientRect: () => ({ left: 100 + start * 12, right: 110 + start * 12, top: 140, bottom: 166, width: 10, height: 26 }),
        detach() {},
      };
    },
    elementsFromPoint: () => [headings[2]],
  };
  return { doc, calls, headings };
}

test('letter anchors use visible public heading ranges and never read private/hidden text', () => {
  const { doc, calls } = headingFixture();
  const anchors = findVisibleHeadingAnchors(doc, mobileBounds(), { maximum: 3 });
  assert.deepEqual(anchors.map(anchor => anchor.letter), ['3', 'B', 'H']);
  assert.equal(calls.privateReads, 0);
  assert.equal(calls.mutations, 0);
  assert.equal(calls.ranges, 3);
});

test('deleted headings and changed text invalidate the anchor cleanly', () => {
  const { doc, headings } = headingFixture();
  const node = headings[2].node;
  assert.ok(readHeadingAnchorRect({ node, start: 0, end: 1 }, doc));
  assert.equal(readHeadingAnchorRect({ node, start: 1000, end: 1001 }, doc), null);
  node.isConnected = false;
  assert.equal(readHeadingAnchorRect({ node, start: 0, end: 1 }, doc), null);
});

function fakeClock() {
  let id = 0;
  const frames = new Map();
  const timers = new Map();
  const clock = createStageClock({
    requestFrame(callback) { frames.set(++id, callback); return id; },
    cancelFrame(value) { frames.delete(value); },
    setTimer(callback) { timers.set(++id, callback); return id; },
    clearTimer(value) { timers.delete(value); },
  });
  return { clock, frames, timers };
}

test('the scheduler owns at most one frame and replaces a named scene timer', () => {
  const { clock, frames, timers } = fakeClock();
  clock.frame(() => {});
  clock.frame(() => {});
  clock.timeout('scene', () => {}, 100);
  clock.timeout('scene', () => {}, 200);
  assert.equal(frames.size, 1);
  assert.equal(timers.size, 1);
  assert.equal(clock.pending, 2);
  clock.clearAll();
  assert.equal(clock.pending, 0);
  assert.equal(frames.size + timers.size, 0);
});

test('unmount cancels timers/frames and a stale callback cannot restart the stage', () => {
  const { clock, frames, timers } = fakeClock();
  let calls = 0;
  clock.frame(() => { calls += 1; clock.frame(() => {}); });
  clock.timeout('auto', () => { calls += 1; clock.timeout('auto', () => {}, 10); }, 10);
  const lateFrame = [...frames.values()][0];
  const lateTimer = [...timers.values()][0];
  clock.dispose();
  lateFrame(500);
  lateTimer();
  clock.frame(() => {});
  clock.timeout('scene', () => {}, 100);
  assert.equal(calls, 0);
  assert.equal(clock.pending, 0);
  assert.equal(frames.size + timers.size, 0);
});
