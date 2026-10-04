import test from 'node:test';
import assert from 'node:assert/strict';
import { createInterfaceSound, interfaceSoundIntent, companionActionCue, INTERFACE_CUES } from '../src/audio/interface-sound.js';

class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(['exponential', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}
class AudioNode {
  constructor(kind) { this.kind = kind; this.connections = []; this.disconnected = false; this.gain = new Param(1); this.frequency = new Param(440); this.Q = new Param(1); this.pan = new Param(0); this.stops = []; }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; this.connections = []; }
  start(time) { this.started = time; }
  stop(time) { this.stops.push(time); }
}
class AudioContextMock {
  constructor({ suspended = false, deferResume = false, stereo = true } = {}) {
    this.currentTime = 0; this.sampleRate = 8000; this.state = suspended ? 'suspended' : 'running'; this.nodes = []; this.resumeCalls = 0; this.suspendCalls = 0; this.closeCalls = 0;
    this.destination = new AudioNode('destination'); this.deferResume = deferResume;
    if (!stereo) this.createStereoPanner = undefined;
  }
  node(kind) { const node = new AudioNode(kind); this.nodes.push(node); return node; }
  createGain() { return this.node('gain'); }
  createOscillator() { return this.node('oscillator'); }
  createBufferSource() { return this.node('bufferSource'); }
  createBiquadFilter() { return this.node('filter'); }
  createStereoPanner() { return this.node('panner'); }
  createConvolver() { return this.node('convolver'); }
  createDynamicsCompressor() { const node = this.node('compressor'); for (const name of ['threshold', 'knee', 'ratio', 'attack', 'release']) node[name] = new Param(); return node; }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: channel => data[channel] }; }
  resume() { this.resumeCalls++; if (this.deferResume) return new Promise(resolve => { this.resolveResume = () => { this.state = 'running'; resolve(); }; }); this.state = 'running'; return Promise.resolve(); }
  suspend() { this.suspendCalls++; this.state = 'suspended'; return Promise.resolve(); }
  close() { this.closeCalls++; this.state = 'closed'; return Promise.resolve(); }
  finish() { for (const node of [...this.nodes]) if (node.started !== undefined && !node.finished) { node.finished = true; node.onended?.(); } }
}
function rig(contextOptions = {}) {
  const context = new AudioContextMock(contextOptions);
  const env = { time: 100, hidden: false, speaking: false, created: 0 }, timers = new Map(); let timerId = 0;
  const audio = createInterfaceSound({ createContext: () => { env.created++; return context; }, now: () => env.time, isHidden: () => env.hidden, isSpeaking: () => env.speaking, schedule: callback => { timers.set(++timerId, callback); return timerId; }, unschedule: id => timers.delete(id) });
  return { context, env, audio, timers,
    activate() { audio.setEnabled(true); audio.unlock({ isTrusted: true }); },
    advance(ms, audioClock = true) { env.time += ms; if (audioClock) context.currentTime += ms / 1000; },
    runTimers() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } },
  };
}
const flush = () => Promise.resolve().then(() => Promise.resolve());

test('sound creates no context before consent AND a trusted interaction; repeated clicks share one', () => {
  const r = rig();
  assert.equal(r.audio.play('entry'), false);
  assert.equal(r.audio.unlock({ isTrusted: true }), false);
  assert.equal(r.env.created, 0);
  r.audio.setEnabled(true);
  assert.equal(r.audio.play('entry'), false);
  assert.equal(r.audio.unlock({ isTrusted: false }), false);
  assert.equal(r.env.created, 0);
  assert.equal(r.audio.unlock({ isTrusted: true }), true);
  assert.equal(r.audio.play('press'), true);
  r.audio.unlock({ isTrusted: true });
  assert.equal(r.env.created, 1);
  r.audio.close();
});

test('a suspended browser keeps at most the latest cue until the user-gesture resume completes', async () => {
  const r = rig({ suspended: true, deferResume: true }); r.activate();
  for (let i = 0; i < 30; i++) r.audio.play(i === 29 ? 'open' : 'press');
  assert.equal(r.context.nodes.filter(node => node.started !== undefined).length, 0);
  assert.equal(r.audio.snapshot().queued, true);
  assert.equal(r.context.resumeCalls, 1);
  r.context.resolveResume(); await flush();
  assert.equal(r.audio.snapshot().activeCues, 1);
  assert.equal(r.audio.snapshot().sources, INTERFACE_CUES.open.notes.length);
  assert.equal(r.audio.snapshot().queued, false);
  r.audio.close();
});

test('muting while resume is pending cancels it without late playback', async () => {
  const r = rig({ suspended: true, deferResume: true }); r.activate(); r.audio.play('entry');
  r.audio.setEnabled(false); r.context.resolveResume(); await flush(); r.runTimers();
  assert.equal(r.context.nodes.filter(node => node.started !== undefined).length, 0);
  assert.equal(r.audio.snapshot().queued, false);
  assert.equal(r.context.state, 'suspended');
  r.audio.close();
});

test('slow resume discards an obsolete cue instead of surprising the user seconds later', async () => {
  const r = rig({ suspended: true, deferResume: true }); r.activate(); r.audio.play('entry'); r.advance(1200);
  r.context.resolveResume(); await flush();
  assert.equal(r.audio.snapshot().activeCues, 0);
  r.audio.close();
});

test('rapid interactions and long accents have finite cue/source budgets', () => {
  const r = rig(); r.activate();
  assert.equal(r.audio.play('dance'), true);
  for (let i = 0; i < 50; i++) assert.equal(r.audio.play('dance'), false);
  r.advance(200, false); assert.equal(r.audio.play('entry'), true);
  r.advance(200, false); assert.equal(r.audio.play('success'), false, 'a third accent cannot exceed 14 simultaneous sources');
  assert.ok(r.audio.snapshot().activeCues <= 3);
  assert.ok(r.audio.snapshot().sources <= 14);
  r.context.finish(); assert.equal(r.audio.snapshot().activeCues, 0); assert.equal(r.audio.snapshot().sources, 0);
  r.audio.close();
});

test('a specific portal cue supersedes the same click generic feedback, with no duplicate chain', () => {
  const r = rig(); r.activate(); r.audio.play('press');
  const oldSources = r.context.nodes.filter(node => node.started !== undefined);
  assert.equal(r.audio.play('portal'), true);
  assert.equal(r.audio.snapshot().activeCues, 1);
  assert.ok(oldSources.every(node => node.stops.at(-1) <= r.context.currentTime + .02), 'the lower-priority cue fades out within 20 ms');
  assert.equal(r.audio.play('portal'), false);
  r.audio.close();
});

test('cue envelopes start and finish silently, have scheduled stops and bounded stereo/levels', () => {
  const r = rig(); r.activate(); r.audio.play('entry', { pan: 999, level: 999 });
  const sources = r.context.nodes.filter(node => node.started !== undefined);
  assert.ok(sources.length > 1);
  for (const source of sources) {
    assert.ok(source.stops.length >= 1);
    assert.ok(source.stops[0] - source.started <= 1.2);
  }
  for (const gain of r.context.nodes.filter(node => node.kind === 'gain' && node.gain.events.some(event => event[0] === 'exponential'))) {
    assert.deepEqual(gain.gain.events[0].slice(0, 2), ['set', 0]);
    assert.deepEqual(gain.gain.events.at(-1).slice(0, 2), ['linear', 0]);
    assert.ok(gain.gain.events.filter(event => event[0] === 'linear').every(event => event[1] <= .12));
  }
  assert.ok(r.context.nodes.filter(node => node.kind === 'panner').every(node => Math.abs(node.pan.value) <= .6));
  const compressor = r.context.nodes.find(node => node.kind === 'compressor');
  assert.ok(compressor.threshold.value <= -12); assert.ok(compressor.ratio.value >= 8);
  r.audio.close();
});

test('all temporary nodes disconnect after the last note and close releases the shared bus', () => {
  const r = rig(); r.activate(); const sharedCount = r.context.nodes.length;
  r.audio.play('success'); r.context.finish();
  assert.equal(r.audio.snapshot().activeCues, 0);
  assert.ok(r.context.nodes.slice(sharedCount).every(node => node.disconnected));
  r.audio.close(); r.audio.close();
  assert.ok(r.context.nodes.every(node => node.disconnected));
  assert.equal(r.context.closeCalls, 1);
  assert.equal(r.timers.size, 0);
});

test('backgrounding stops sounds, suspends after the fade and requires a fresh gesture on return', () => {
  const r = rig(); r.activate(); r.audio.play('entry');
  r.env.hidden = true; r.audio.visibility(true); r.runTimers();
  assert.equal(r.audio.snapshot().sources, 0);
  assert.equal(r.context.state, 'suspended');
  assert.ok(r.context.nodes.filter(node => node.started !== undefined).every(node => node.disconnected));
  r.env.hidden = false; r.audio.visibility(false);
  assert.equal(r.context.resumeCalls, 0);
  assert.equal(r.audio.play('success'), false);
  r.advance(1200); r.audio.unlock({ isTrusted: true });
  assert.equal(r.context.resumeCalls, 1);
  assert.equal(r.audio.play('success'), true);
  r.audio.close();
});

test('companion speech ducks the bus; decorative dance and stars wait while speech is active', () => {
  const r = rig(); r.activate(); const bus = r.context.nodes[0];
  r.audio.setSpeaking(true);
  assert.ok(bus.gain.value < .06);
  assert.equal(r.audio.play('dance'), false); assert.equal(r.audio.play('constellation'), false);
  assert.equal(r.audio.play('press'), true);
  r.audio.setSpeaking(false); assert.equal(bus.gain.value, .34);
  r.env.speaking = true; r.advance(500); assert.equal(r.audio.play('open'), true);
  assert.ok(bus.gain.value < .06, 'other browser speech also lowers a new cue');
  r.audio.close();
});

test('mono-only browsers and unavailable WebAudio remain usable without errors', () => {
  const r = rig({ stereo: false }); r.activate(); assert.equal(r.audio.play('portal'), true); r.audio.close();
  const unavailable = createInterfaceSound({ createContext: () => null });
  unavailable.setEnabled(true);
  assert.equal(unavailable.unlock({ isTrusted: true }), false);
  assert.equal(unavailable.play('entry'), false);
  assert.doesNotThrow(() => unavailable.close());
});

function target({ tag = 'BUTTON', attrs = {}, classes = [], silent = false, typing = false, open = false, disabled = false } = {}) {
  return { tagName: tag, disabled, parentElement: { open }, classList: { contains: name => classes.includes(name) }, getAttribute: key => attrs[key] ?? null,
    closest: selector => (silent && selector.includes('[data-feedback')) || (typing && selector.includes('textarea')) ? {} : null };
}

test('semantic clicks separate navigation, menus, entry and toggles without premature success sounds', () => {
  assert.equal(interfaceSoundIntent(target({ tag: 'A', attrs: { href: '/#monde-3b' } })).kind, 'portal');
  assert.equal(interfaceSoundIntent(target({ tag: 'A', attrs: { href: '/#passeport' } })).kind, 'navigate');
  assert.equal(interfaceSoundIntent(target({ tag: 'SUMMARY', open: false })).kind, 'open');
  assert.equal(interfaceSoundIntent(target({ tag: 'SUMMARY', open: true })).kind, 'close');
  assert.equal(interfaceSoundIntent(target({ classes: ['intro3b-enter'] })).kind, 'entry');
  assert.equal(interfaceSoundIntent(target({ attrs: { 'aria-label': 'Enregistrer ma ville' } })).kind, 'press');
  assert.equal(interfaceSoundIntent(target({ attrs: { 'data-sound': 'success' } })).kind, 'success');
  const on = interfaceSoundIntent(target({ attrs: { 'aria-pressed': 'false', 'data-sound-toggle': 'interfaceSound' } }), { clientX: 500, detail: 1 }, 500);
  assert.equal(on.kind, 'toggleOn'); assert.equal(on.enabled, true); assert.equal(on.pan, .45);
  assert.equal(interfaceSoundIntent(target(), { clientX: 0, detail: 0 }, 500).pan, 0, 'keyboard activation is centered');
});

test('typing, muted surfaces, active navigation and disabled controls produce no cue', () => {
  for (const element of [target({ typing: true }), target({ silent: true }), target({ disabled: true }), target({ attrs: { 'aria-disabled': 'true' } }), target({ attrs: { 'aria-current': 'page' } }), target({ attrs: { 'data-sound': 'off' } }), target({ classes: ['skip-link'] })]) assert.equal(interfaceSoundIntent(element), null);
  assert.equal(companionActionCue('walk'), null); assert.equal(companionActionCue('idle'), null); assert.equal(companionActionCue('hologram'), 'constellation');
});
