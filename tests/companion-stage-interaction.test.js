import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as stageFunctions from '../src/companion/companion-stage.js';

const source = readFileSync(new URL('../src/companion/useCompanionStage.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\n/gm, '').replace('export default function', 'function');

// Exercise the actual hook and its event handlers with deterministic frames,
// effects and viewport events. No browser, graphics or network is required.
function stageFixture(initial = {}, storage = new Map()) {
  let timestamp = 100;
  let nextId = 0;
  let cursor = 0;
  let dirty = true;
  let result;
  let dialogObserver;
  const slots = [];
  let effects = [];
  const timers = new Map();
  const frames = new Map();
  const controls = [];
  const dialogs = [];
  const captures = new Set();
  const properties = new Map();
  const eventTarget = () => {
    const listeners = new Map();
    return {
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
      removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
      emit(type, event = {}) { for (const callback of [...(listeners.get(type) || [])]) callback(event); },
      get listeners() { return [...listeners.values()].reduce((sum, value) => sum + value.size, 0); },
    };
  };
  const element = (rect, { dialog = false, native = false, editable = false, control = false } = {}) => ({
    nodeType: 1, hidden: false, open: true,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }),
    matches(selector) { return selector === 'dialog' ? native : selector.includes('dialog') ? dialog : editable; },
    closest(selector) {
      if (selector.startsWith('.companion3b')) return null;
      if (selector.includes('dialog')) return dialog ? this : null;
      return control ? this : null;
    },
    querySelector: () => null,
  });
  const doc = {
    ...eventTarget(), hidden: false, fullscreenElement: null, activeElement: null,
    body: element({ left: 0, right: 960, top: 0, bottom: 800 }),
    querySelectorAll(selector) {
      if (selector.startsWith('dialog')) return dialogs;
      if (selector.startsWith('button,a[href]')) return controls;
      return [];
    },
  };
  const win = {
    ...eventTarget(), innerWidth: 960, innerHeight: 800,
    performance: { now: () => timestamp },
    getComputedStyle: () => ({ visibility: 'visible', display: 'block' }),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { timers.set(++nextId, { at: timestamp + delay, callback }); return nextId; },
    clearTimeout(id) { timers.delete(id); },
  };
  doc.defaultView = win;
  const shell = {
    ownerDocument: doc, offsetWidth: 112, offsetHeight: 155,
    style: { setProperty: (key, value) => properties.set(key, value) },
    contains: () => false,
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
  };
  const props = { shellRef: { current: shell }, page: 'home', ...initial };
  const changed = (before, after) => !before || before.length !== after.length || before.some((value, index) => value !== after[index]);
  const useStage = vm.runInNewContext(`${source}\nuseCompanionStage;`, {
    ...stageFunctions, window: win, document: doc, performance: win.performance,
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { constructor(callback) { dialogObserver = callback; } observe() {} disconnect() { dialogObserver = null; } },
    useRef(value) { const index = cursor++; return slots[index] ||= { current: value }; },
    useState(value) {
      const index = cursor++;
      slots[index] ||= { value };
      return [slots[index].value, next => { slots[index].value = next; dirty = true; }];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies: [...dependencies], cleanup: callback() };
        });
      }
    },
    useCallback: callback => callback,
    useMemo: callback => callback(),
  });
  function flush() {
    let passes = 0;
    while (dirty) {
      assert.ok(++passes < 20, 'effects must settle');
      dirty = false; cursor = 0;
      result = useStage(props);
      const pending = effects; effects = [];
      pending.forEach(callback => callback());
    }
  }
  function advance(milliseconds) {
    const target = timestamp + milliseconds;
    for (;;) {
      const pending = [...timers.entries()].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!pending) break;
      const [id, value] = pending;
      timers.delete(id); timestamp = value.at; value.callback(); flush();
    }
    timestamp = target;
    flush();
  }
  flush();
  return {
    win, doc, shell, controls, dialogs, captures, timers, frames, storage, element,
    get stage() { return result; },
    get position() { return { x: parseFloat(properties.get('--companion-stage-x')), y: parseFloat(properties.get('--companion-stage-y')) }; },
    event(patch = {}) { return { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 850, clientY: 680, currentTarget: shell, preventDefault() {}, ...patch }; },
    invoke(name, argument) { const value = result[name](argument); flush(); return value; },
    render(patch) { Object.assign(props, patch); dirty = true; flush(); },
    emit(target, type, event) { target.emit(type, event); flush(); },
    mutate(records) { dialogObserver?.(records); advance(0); },
    advance,
    nextTimer() { advance(Math.min(...[...timers.values()].map(value => value.at)) - timestamp); },
    frame(milliseconds = 16) {
      advance(milliseconds);
      const pending = [...frames.entries()];
      for (const [id, callback] of pending) { frames.delete(id); callback(timestamp); }
      flush();
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); dirty = false; },
  };
}

test('a click on a walking companion keeps the hit target through late focus and opens normally', () => {
  const fixture = stageFixture();
  const home = fixture.position;
  fixture.nextTimer(); fixture.frame(1000);
  assert.equal(fixture.stage.moving, true);
  assert.notDeepEqual(fixture.position, home);
  const pausedAt = fixture.position;
  const event = fixture.event({ clientX: pausedAt.x + 40, clientY: pausedAt.y + 70 });
  fixture.invoke('onPointerDown', event);
  fixture.frame(32);
  fixture.invoke('onPointerUp', event);
  fixture.render({ paused: true });
  assert.deepEqual(fixture.position, pausedAt, 'focus must not teleport the button home');
  assert.equal(fixture.captures.size, 0);
  assert.equal(fixture.frames.size, 0);
  assert.equal(fixture.invoke('consumeClick', { detail: 1 }), false, 'native click must reach the panel handler');
  fixture.unmount();
});

test('approaching with a mouse stops an automatic stroll before the press', () => {
  const fixture = stageFixture();
  fixture.nextTimer(); fixture.frame(600);
  const point = fixture.position;
  fixture.emit(fixture.win, 'pointermove', fixture.event({ clientX: point.x - 12, clientY: point.y + 75 }));
  assert.equal(fixture.stage.moving, false);
  fixture.frame(1000);
  assert.deepEqual(fixture.position, point);
  assert.equal(fixture.timers.size, 0, 'hover keeps the target still');
  fixture.emit(fixture.win, 'pointermove', fixture.event({ clientX: 0, clientY: 0 }));
  assert.ok(fixture.timers.size > 0, 'autonomous life resumes after the pointer leaves');
  fixture.unmount();
});

test('touch jitter opens normally; a drag suppresses its click without blocking later keyboard activation', () => {
  const fixture = stageFixture({ reducedMotion: true });
  const down = fixture.event({ pointerType: 'touch', clientX: 840, clientY: 650 });
  fixture.invoke('onPointerDown', down);
  fixture.invoke('onPointerMove', { ...down, clientX: 846, clientY: 654 });
  fixture.invoke('onPointerUp', { ...down, clientX: 846, clientY: 654 });
  assert.equal(fixture.invoke('consumeClick', { detail: 1 }), false);
  fixture.invoke('onPointerDown', down);
  fixture.invoke('onPointerUp', { ...down, clientX: 670 });
  assert.equal(fixture.invoke('consumeClick', { detail: 1 }), true, 'coalesced release movement is still a drag');
  fixture.invoke('onPointerDown', down);
  fixture.invoke('onPointerMove', { ...down, clientX: 770 });
  fixture.invoke('onPointerCancel', down);
  assert.equal(fixture.invoke('consumeClick', { detail: 0 }), false, 'Enter/Space never inherit drag suppression');
  assert.equal(fixture.frames.size, 0, 'reduced motion keeps explicit placement without physics');
  fixture.unmount();
});

test('a geometry notification cannot steal a just-released tap and later clears an obstructed position', () => {
  const fixture = stageFixture({ autonomous: false });
  const before = fixture.position;
  const event = fixture.event();
  fixture.invoke('onPointerDown', event); fixture.invoke('onPointerUp', event);
  fixture.controls.push(fixture.element({ left: before.x, right: before.x + 112, top: before.y, bottom: before.y + 155 }, { control: true }));
  fixture.emit(fixture.win, 'resize'); fixture.advance(45);
  assert.deepEqual(fixture.position, before);
  assert.equal(fixture.invoke('consumeClick', { detail: 1 }), false);
  fixture.advance(450);
  assert.notDeepEqual(fixture.position, before, 'the deferred safety check still runs');
  fixture.unmount();
});

test('manual placement is restored safely after a new session and viewport resize', () => {
  const storage = new Map();
  const first = stageFixture({ reducedMotion: true }, storage);
  first.invoke('place', 'left');
  assert.equal(first.position.x, 12);
  first.unmount();
  const second = stageFixture({ reducedMotion: true }, storage);
  assert.equal(second.position.x, 12);
  second.win.innerWidth = 390; second.win.innerHeight = 380;
  second.emit(second.win, 'resize'); second.advance(50);
  assert.ok(second.position.x >= 0 && second.position.x + 112 <= 390);
  assert.ok(second.position.y >= 0 && second.position.y + 155 <= 380);
  second.unmount();
});

test('typing and external dialogs suspend presence, then resume without replaying an old scene', () => {
  const fixture = stageFixture();
  fixture.nextTimer(); fixture.frame(500);
  const input = fixture.element({ left: 20, right: 300, top: 20, bottom: 70 }, { editable: true });
  fixture.doc.activeElement = input;
  fixture.emit(fixture.doc, 'focusin');
  assert.equal(fixture.stage.suspended, true);
  assert.equal(fixture.frames.size + fixture.timers.size, 0);
  fixture.doc.activeElement = null;
  fixture.emit(fixture.doc, 'focusout'); fixture.advance(0);
  assert.equal(fixture.stage.suspended, false);
  const dialog = fixture.element({ left: 30, right: 800, top: 40, bottom: 760 }, { dialog: true, native: true });
  fixture.dialogs.push(dialog);
  fixture.mutate([{ target: fixture.doc.body, addedNodes: [dialog], removedNodes: [] }]);
  assert.equal(fixture.stage.suspended, true);
  dialog.open = false;
  fixture.mutate([{ target: dialog, attributeName: 'open' }]);
  assert.equal(fixture.stage.suspended, false, 'closing a native dialog must restore presence');
  assert.equal(fixture.stage.moving, false);
  fixture.unmount();
});

test('explicit sleep expires and immediate disable releases an active drag with no pending work', () => {
  const fixture = stageFixture({ autonomous: false, reducedMotion: true });
  assert.equal(fixture.invoke('play', 'sleep'), true);
  assert.equal(fixture.stage.pose, 'sleep');
  fixture.advance(stageFunctions.STAGE_DURATIONS.sleep);
  assert.equal(fixture.stage.pose, null);
  const event = fixture.event();
  fixture.invoke('onPointerDown', event);
  fixture.invoke('onPointerMove', { ...event, clientX: 740 });
  assert.equal(fixture.captures.size, 1);
  fixture.invoke('suspend');
  assert.equal(fixture.stage.suspended, true);
  assert.equal(fixture.stage.dragging, false);
  assert.equal(fixture.captures.size + fixture.frames.size + fixture.timers.size, 0);
  fixture.emit(fixture.win, 'focus'); fixture.advance(1000);
  assert.equal(fixture.stage.suspended, true, 'focus must not undo an explicit disable');
  fixture.unmount();
  assert.equal(fixture.win.listeners + fixture.doc.listeners, 0);
});
