import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAUNCH_TIMING, launchPhaseAt, startLaunchPlayback } from '../src/design-system/launch-playback.js';

function playback({ hidden = false, complete = true, decode } = {}) {
  const page = new EventTarget();
  page.hidden = hidden;
  const artwork = new EventTarget();
  artwork.complete = complete;
  artwork.naturalWidth = complete ? 512 : 0;
  artwork.decode = decode || (() => Promise.resolve());
  let clock = 0;
  let serial = 0;
  const frames = new Map();
  const timers = new Map();
  const phases = [], availability = [], pauses = [];
  let finishes = 0, reveals = 0;
  const stop = startLaunchPlayback({
    artwork,
    document: page,
    onPhase: value => phases.push(value),
    onArtwork: value => availability.push(value),
    onPaused: value => pauses.push(value),
    onReveal: () => { reveals += 1; },
    onFinish: () => { finishes += 1; },
    now: () => clock,
    requestFrame: callback => { const id = ++serial; frames.set(id, callback); return id; },
    cancelFrame: id => frames.delete(id),
    setTimer: (callback, delay) => { const id = ++serial; timers.set(id, { at: clock + delay, callback }); return id; },
    clearTimer: id => timers.delete(id),
  });
  return {
    artwork, phases, availability, pauses, stop,
    get finishes() { return finishes; },
    get reveals() { return reveals; },
    get pending() { return frames.size + timers.size; },
    tick(duration = 0) {
      clock += duration;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) {
        timers.delete(id);
        timer.callback();
      }
      for (const [id, callback] of [...frames]) {
        frames.delete(id);
        callback(clock);
      }
    },
    visibility(hidden) { page.hidden = hidden; page.dispatchEvent(new Event('visibilitychange')); },
  };
}

test('first HTML paint hides discovery copy and starts the existing effect without an image or script', () => {
  const html = readFileSync('index.html', 'utf8');
  const critical = html.match(/<style id="threeb-launch-critical">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(critical);
  assert.ok(html.indexOf('threeb-launch-critical') < html.indexOf('<body>'));
  assert.match(critical, /\.seo-discovery\{display:none\}/);
  assert.match(critical, /@keyframes launch-energy-trace/);
  assert.match(html, /<noscript><style>\.seo-discovery\{display:block\}#root\{display:none\}<\/style><\/noscript>/);
  assert.match(html, /rel="preload" as="image" href="\/icons\/3b-icon-20260912-512\.png" fetchpriority="high"/);
  const boot = html.slice(html.indexOf('<div id="root">'), html.indexOf('<section class="seo-discovery"'));
  assert.match(boot, /data-boot="html" aria-hidden="true"/);
  assert.equal((boot.match(/<span /g) || []).length, 7);
  assert.doesNotMatch(boot, /<img\b|<p\b|<h[1-6]\b|<script\b/);
});

test('slow artwork loading preserves every assembly frame instead of revealing the complete logo late', async () => {
  let resolveDecode;
  const run = playback({ complete: false, decode: () => new Promise(resolve => { resolveDecode = resolve; }) });
  run.tick(1500);
  assert.deepEqual(run.phases, []);
  run.artwork.naturalWidth = 512;
  run.artwork.dispatchEvent(new Event('load'));
  run.tick(500);
  assert.deepEqual(run.availability, []);
  resolveDecode();
  await Promise.resolve();
  run.tick();
  assert.deepEqual(run.availability, [true]);
  assert.deepEqual(run.phases, ['assemble']);
  run.tick(LAUNCH_TIMING.assemble - 1);
  assert.deepEqual(run.phases, ['assemble']);
  run.tick(1);
  assert.deepEqual(run.phases, ['assemble', 'hold']);
  run.stop();
});

test('Android background startup waits for visibility and never bypasses the mandatory sequence', async () => {
  const run = playback({ hidden: true });
  await Promise.resolve();
  run.tick(12000);
  assert.deepEqual(run.phases, []);
  assert.equal(run.finishes, 0);
  run.visibility(false);
  run.tick();
  assert.deepEqual(run.phases, ['assemble']);
  run.stop();
});

test('backgrounding pauses both the visible clock and the CSS motion; revealing happens once after dissolution', async () => {
  const run = playback();
  await Promise.resolve();
  run.tick();
  run.tick(1000);
  run.visibility(true);
  run.tick(60000);
  assert.deepEqual(run.phases, ['assemble']);
  assert.equal(run.finishes, 0);
  run.visibility(false);
  run.tick();
  run.tick(LAUNCH_TIMING.assemble - 1000);
  assert.equal(run.phases.at(-1), 'hold');
  run.tick(LAUNCH_TIMING.hold);
  assert.equal(run.phases.at(-1), 'dissolve');
  assert.equal(run.reveals, 0);
  run.tick(LAUNCH_TIMING.dissolve);
  assert.equal(run.phases.at(-1), 'exit');
  assert.equal(run.reveals, 1);
  run.tick(LAUNCH_TIMING.exit);
  run.tick(10000);
  assert.equal(run.finishes, 1);
  assert.equal(run.pending, 0);
  assert.ok(run.pauses.includes(true));
  assert.equal(run.pauses.at(-1), false);
});

test('a failed or stalled icon cannot freeze startup or pop in partway through the effect', async () => {
  const run = playback({ complete: false });
  run.tick(4000);
  assert.deepEqual(run.availability, [false]);
  assert.deepEqual(run.phases, ['assemble']);
  run.artwork.naturalWidth = 512;
  run.artwork.dispatchEvent(new Event('load'));
  await Promise.resolve();
  assert.deepEqual(run.availability, [false]);
  run.tick(Object.values(LAUNCH_TIMING).reduce((sum, duration) => sum + duration, 0));
  assert.equal(run.finishes, 1);
  assert.equal(run.pending, 0);
});

test('unmounting during decode cancels all work, including a late promise resolution', async () => {
  let resolveDecode;
  const run = playback({ decode: () => new Promise(resolve => { resolveDecode = resolve; }) });
  run.stop();
  resolveDecode();
  await Promise.resolve();
  run.visibility(true);
  run.visibility(false);
  run.tick(20000);
  assert.deepEqual(run.phases, []);
  assert.deepEqual(run.availability, []);
  assert.equal(run.finishes, 0);
  assert.equal(run.pending, 0);
});

test('launch phases contain no fixed-logo prelude and respect the existing artistic timings', () => {
  assert.equal(launchPhaseAt(0), 'assemble');
  assert.equal(launchPhaseAt(LAUNCH_TIMING.assemble), 'hold');
  const experience = readFileSync('src/design-system/LuxuryExperience.jsx', 'utf8');
  const launch = readFileSync('src/design-system/CinematicLaunch.jsx', 'utf8');
  const css = readFileSync('src/styles/launch-premium.css', 'utf8');
  assert.match(experience, /!experiencePolicy\(options, device\)\.reduced/);
  assert.match(experience, /data-launch-hidden=\{launching && !revealing/);
  assert.match(css, /threeb-app-content\[data-launch-hidden="true"\]\{display:block;opacity:0/);
  assert.match(css, /data-paused="true"[\s\S]*animation-play-state:paused/);
  assert.match(css, /threeb-launch-core\{opacity:0/);
  assert.doesNotMatch(launch, /setTimeout|Passer l.introduction/);
});
