import test from 'node:test';
import assert from 'node:assert/strict';
import { entrySkyBudget, createEntrySky, advanceEntrySky, meteorPoint, addEntryStardust, mountEntrySky } from '../src/design-system/entry-sky.js';

test('celestial sky budgets remain bounded on phones, tablets and high-DPR desktops', () => {
  for (const [width,height,dpr] of [[320,700,3],[390,844,3],[1024,768,2],[1920,1080,2],[3840,2160,4]]) {
    for (const economical of [false,true]) {
      const budget = entrySkyBudget({ width,height,dpr,economical });
      assert.ok(budget.dpr > 0 && budget.dpr <= (economical ? 1 : 1.5));
      assert.ok(width * height * budget.dpr ** 2 <= (economical ? 980000 : 2400000) + .01);
      assert.ok(budget.stars >= 56 && budget.stars <= 190);
      assert.equal(budget.fps,economical ? 20 : 30);
      assert.equal(createEntrySky({ width,height,economical }).stars.length,budget.stars);
    }
  }
});

test('both normal and economical skies have a first visible meteor within two seconds', () => {
  for (const economical of [false,true]) {
    const state = createEntrySky({ economical });
    for (let index = 0; index < 40; index++) advanceEntrySky(state,1 / 30);
    assert.equal(state.meteors.length,0);
    advanceEntrySky(state,1 / 30);
    assert.equal(state.meteors.length,1);
    const meteor = state.meteors[0];
    assert.deepEqual(meteorPoint(meteor,0),meteor.start);
    assert.deepEqual(meteorPoint(meteor,1),meteor.end);
    assert.ok(meteor.start.y < .16 && meteor.end.y < .32,'the first meteor clears the central copy');
    assert.ok(Math.abs(meteor.end.x - meteor.start.x) > .4,'the meteor visibly travels across the sky');
  }
});

test('ten minutes of animation and repeated taps cannot accumulate particles or meteors', () => {
  const state = createEntrySky({ economical:true });
  let meteorCount = 0;
  for (let step = 0; step < 12000; step++) {
    advanceEntrySky(state,.05);
    addEntryStardust(state,.3,.2);
    assert.ok(state.meteors.length <= 1);
    assert.ok(state.bursts.length <= 2);
    meteorCount = Math.max(meteorCount,state.serial);
    for (const meteor of state.meteors) {
      const position = meteorPoint(meteor,meteor.age / meteor.duration);
      assert.ok(Number.isFinite(position.x) && position.x >= 0 && position.x <= 1);
      assert.ok(Number.isFinite(position.y) && position.y >= 0 && position.y <= 1);
    }
  }
  assert.ok(meteorCount > 30 && meteorCount < 80,'meteors have a sparse cadence, including economical mode');
  assert.ok(state.stars.length <= 82);
});

test('stardust throttles repeated touches and handles a suspended-frame time jump', () => {
  const state = createEntrySky();
  assert.equal(addEntryStardust(state,-1,2),true);
  assert.deepEqual([state.bursts[0].x,state.bursts[0].y],[0,1]);
  assert.equal(addEntryStardust(state,.5,.5),false);
  advanceEntrySky(state,9000);
  assert.equal(state.time,.09);
  assert.equal(state.meteors.length,0,'no backlog of invisible meteors on resume');
  assert.equal(addEntryStardust(state,.5,.5),false);
});

function eventHub() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name,callback) { if (!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(callback); },
    removeEventListener(name,callback) { listeners.get(name)?.delete(callback); },
    dispatchEvent(event) { for (const callback of listeners.get(event.type) || []) callback(event); },
  };
}

function fakeCanvasContext() {
  const draws = [];
  const context = { draws, count:0,
    createRadialGradient() { return { addColorStop() {} }; },
    clearRect() { this.count++; this.firstPoint = null; },
    arc(x,y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); if (!this.firstPoint) { this.firstPoint = [x,y]; draws.push(this.firstPoint); } },
    fillRect() {}, setTransform() {}, drawImage() {}, beginPath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
  };
  return context;
}

function environment({ inert = false, hidden = false } = {}) {
  const raf = new Map(), observers = [], mutations = [], host = eventHub();
  let id = 0;
  const ctx = fakeCanvasContext();
  const shell = { inert, hasAttribute() { return this.inert; } };
  const doc = { ...eventHub(), hidden, documentElement:{}, createElement() { return { width:0,height:0,getContext:() => fakeCanvasContext() }; } };
  const win = { ...eventHub(), innerWidth:390,innerHeight:844,devicePixelRatio:3,
    requestAnimationFrame(callback) { const key = ++id; raf.set(key,callback); return key; },
    cancelAnimationFrame(key) { raf.delete(key); },
    getComputedStyle() { return { getPropertyValue:() => '' }; },
    ResizeObserver:class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    MutationObserver:class { constructor(callback) { this.callback = callback; mutations.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    CustomEvent:class { constructor(type,options) { this.type = type; this.detail = options.detail; } },
  };
  doc.defaultView = win;
  const element = { ownerDocument:doc,dataset:{},width:0,height:0,parentElement:host,
    getContext:() => ctx, closest:selector => selector === '.intro3b' ? host : shell,
    getBoundingClientRect:() => ({ width:win.innerWidth,height:win.innerHeight,left:0,top:0 }),
  };
  return { element,ctx,raf,win,doc,host,shell,observers,mutations,
    tick(time) { const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach(callback => callback(time)); },
  };
}

test('economical canvas really animates, responds to touch and cleans up every active listener', () => {
  const env = environment();
  const dispose = mountEntrySky(env.element,{ economical:true });
  assert.equal(env.element.dataset.skyState,'living');
  assert.equal(env.raf.size,1);
  const initial = [...env.ctx.draws[0]];
  env.tick(100); env.tick(140);
  assert.equal(env.ctx.count,1,'20 fps renderer does not paint at 25 fps');
  env.tick(155);
  assert.equal(env.ctx.count,2);
  assert.notDeepEqual(env.ctx.draws.at(-1),initial,'the star positions move between frames');
  let sound = null;
  env.win.addEventListener('threeb:interface-sound',event => { sound = event.detail; });
  const touch = { type:'pointerdown',isTrusted:true,clientX:90,clientY:105,target:{ closest:() => null } };
  env.host.dispatchEvent(touch);
  assert.equal(sound?.kind,'constellation');
  assert.equal(sound?.event,touch,'the optional audio cue retains the real activation event');
  dispose();
  assert.equal(env.raf.size,0);
  assert.equal(env.element.width,1);
  assert.equal(env.element.height,1);
  assert.ok([...env.host.listeners.values(),...env.doc.listeners.values()].every(set => set.size === 0));
  assert.ok([...env.observers,...env.mutations].every(observer => observer.disconnected));
});

test('a reduced-motion sky paints stars once, does not schedule frames, and ignores touch', () => {
  const env = environment();
  const dispose = mountEntrySky(env.element,{ reduced:true });
  assert.equal(env.element.dataset.skyState,'still');
  assert.equal(env.ctx.count,1);
  assert.ok(env.ctx.draws.length > 0,'reduced motion keeps its star artwork');
  assert.equal(env.raf.size,0);
  for (const name of ['pointermove','pointerdown','pointerleave']) assert.equal(env.host.listeners.get(name)?.size || 0,0,'a still sky installs no movement listeners');
  env.host.dispatchEvent({ type:'pointerdown',isTrusted:true,clientX:10,clientY:10 });
  env.tick(10000);
  assert.equal(env.ctx.count,1);
  dispose();
});

test('a decorative canvas can receive gestures from its real page and removes those listeners on exit', () => {
  const env = environment();
  const page = eventHub();
  const dispose = mountEntrySky(env.element,{ interactionHost:page });
  let sounds = 0;
  env.win.addEventListener('threeb:interface-sound',() => { sounds++; });
  const touch = { type:'pointerdown',isTrusted:true,clientX:90,clientY:105,target:{ closest:() => null } };
  env.host.dispatchEvent(touch);
  assert.equal(sounds,0,'the decorative parent never owns gestures');
  page.dispatchEvent(touch);
  assert.equal(sounds,1,'the real page activates the celestial response');
  assert.equal(page.listeners.get('pointermove')?.size,1);
  dispose();
  assert.ok([...page.listeners.values()].every(set => set.size === 0));
  assert.equal(env.raf.size,0);
});

test('initial cinematic, hidden tab and page lifecycle pause the sky without a lost first meteor', () => {
  const env = environment({ inert:true });
  const dispose = mountEntrySky(env.element);
  assert.equal(env.raf.size,0);
  assert.equal(env.element.dataset.skyState,'paused');
  env.shell.inert = false; env.mutations[0].callback();
  assert.equal(env.raf.size,1);
  env.tick(6000); env.tick(6040);
  const count = env.ctx.count;
  env.doc.hidden = true; env.doc.dispatchEvent({ type:'visibilitychange' });
  assert.equal(env.raf.size,0);
  env.tick(50000); assert.equal(env.ctx.count,count);
  env.doc.hidden = false; env.doc.dispatchEvent({ type:'visibilitychange' });
  env.tick(80000); assert.equal(env.ctx.count,count,'resuming establishes a new frame time');
  env.tick(80040); assert.equal(env.ctx.count,count + 1);
  env.win.dispatchEvent({ type:'pagehide' }); assert.equal(env.raf.size,0);
  env.win.dispatchEvent({ type:'pageshow' }); assert.equal(env.raf.size,1);
  dispose();
});

test('interactive entry controls never trigger sky gestures or audio', () => {
  const env = environment();
  const dispose = mountEntrySky(env.element);
  let sounds = 0;
  env.win.addEventListener('threeb:interface-sound',() => { sounds++; });
  env.host.dispatchEvent({ type:'pointerdown',isTrusted:true,clientX:190,clientY:640,target:{ closest:() => ({ tagName:'BUTTON' }) } });
  assert.equal(sounds,0);
  dispose();
});
