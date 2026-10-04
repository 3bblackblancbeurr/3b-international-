const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;

// Four original arrangements leave the message and its primary action in clear space.
export const ENTRY_CONSTELLATIONS = Object.freeze([
  { x:.16, y:.18, size:1, phase:0, tone:'gold', nodes:[[-.5,.2],[-.24,-.13],[.05,.06],[.34,-.3],[.5,.1],[.22,.36]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,2]] },
  { x:.85, y:.19, size:.87, phase:2.4, tone:'blue', nodes:[[-.48,-.16],[-.23,.18],[.02,-.3],[.27,.13],[.49,-.09],[.33,.4],[-.05,.32]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]] },
  { x:.16, y:.84, size:.86, phase:4.2, tone:'blue', nodes:[[-.44,.03],[-.16,-.22],[.12,.02],[.36,-.23],[.48,.17],[.2,.31],[-.1,.22]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,5]] },
  { x:.84, y:.79, size:1.08, phase:1.6, tone:'gold', nodes:[[-.45,.11],[-.16,-.28],[.11,-.13],[.43,-.35],[.35,.08],[.12,.33],[-.14,.2]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,4]] },
]);

export function skyRandom(seed = 31826) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function entrySkyBudget({ width = 390, height = 844, dpr = 1, economical = false } = {}) {
  const area = Math.max(1, width * height);
  return {
    fps: economical ? 20 : 30,
    dpr: Math.min(Math.max(.25, dpr), economical ? 1 : 1.5, Math.sqrt((economical ? 980000 : 2400000) / area)),
    stars: Math.round(clamp(Math.sqrt(area) / (economical ? 10 : 6), economical ? 56 : 96, economical ? 82 : 190)),
    meteors: economical ? 1 : 2,
  };
}

export function createEntrySky({ width = 390, height = 844, economical = false, seed = 31826 } = {}) {
  const random = skyRandom(seed);
  const budget = entrySkyBudget({ width, height, economical });
  return {
    width, height, economical, random, time:0, nextMeteor:1.35, serial:0, meteors:[], bursts:[],
    stars:Array.from({ length:budget.stars }, (_, index) => ({
      x:random(), y:random(), depth:.25 + random() * .75,
      radius: index % 11 === 0 ? 1.35 + random() * .45 : .4 + random() * .65,
      phase:random() * TAU, speed:.5 + random(), tone:index % 7 === 0 ? 'gold' : index % 3 === 0 ? 'blue' : 'white',
    })),
  };
}

function makeMeteor(state) {
  const random = state.random;
  const first = state.serial++ === 0;
  const lower = !first && random() > .64;
  const mirrored = !first && random() > .5;
  const start = { x:.04 + random() * .16, y:lower ? .72 : .06 + random() * .09 };
  const end = { x:.68 + random() * .25, y:lower ? .94 : .24 + random() * .07 };
  const bend = { x:mix(start.x, end.x, .48), y:mix(start.y, end.y, .48) - .025 };
  if (mirrored) { start.x = 1 - start.x; end.x = 1 - end.x; bend.x = 1 - bend.x; }
  return { start, end, bend, age:0, duration:1.6 + random() * .6, tone:state.serial % 3 ? 'blue' : 'gold' };
}

export function meteorPoint(meteor, progress) {
  const t = clamp(progress, 0, 1), v = 1 - t;
  return { x:v * v * meteor.start.x + 2 * v * t * meteor.bend.x + t * t * meteor.end.x,
    y:v * v * meteor.start.y + 2 * v * t * meteor.bend.y + t * t * meteor.end.y };
}

/** Simulation time only advances with visible frames: resuming never emits a backlog. */
export function advanceEntrySky(state, delta) {
  const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .09);
  state.time += dt;
  state.meteors.forEach(meteor => { meteor.age += dt; });
  state.meteors = state.meteors.filter(meteor => meteor.age < meteor.duration);
  state.bursts.forEach(burst => { burst.age += dt; });
  state.bursts = state.bursts.filter(burst => burst.age < 1.65);
  if (state.time >= state.nextMeteor) {
    if (state.meteors.length < (state.economical ? 1 : 2)) state.meteors.push(makeMeteor(state));
    state.nextMeteor = state.time + (state.economical ? 8 : 5.5) + state.random() * 4;
  }
  return state;
}

export function addEntryStardust(state, x, y) {
  const latest = state.bursts.at(-1);
  if (latest && latest.age < .8) return false;
  state.bursts = [...state.bursts.slice(-1), { x:clamp(x,0,1), y:clamp(y,0,1), age:0, phase:state.random() * TAU }];
  return true;
}

function makeGlow(document, color) {
  const image = document.createElement('canvas'); image.width = 64; image.height = 64;
  const ctx = image.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,color); gradient.addColorStop(.13,color); gradient.addColorStop(1,'transparent');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
  return image;
}

function makeNebula(document, width, height, palette, economical) {
  const image = document.createElement('canvas');
  const scale = Math.min(1, (economical ? 420 : 720) / Math.max(width,height));
  image.width = Math.max(1,Math.round(width * scale)); image.height = Math.max(1,Math.round(height * scale));
  const ctx = image.getContext('2d');
  if (!ctx) return null;
  const w = image.width, h = image.height;
  for (let index = 0; index < 7; index++) {
    const x = (.07 + index * .15) * w, y = (.15 + Math.sin(index * .69) * .5) * h;
    const radius = Math.max(w,h) * (.19 + index % 3 * .06);
    const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,index < 4 ? palette.blue : palette.gold); gradient.addColorStop(1,'transparent');
    ctx.globalAlpha = index % 3 === 0 ? .075 : .035;
    ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
  }
  return image;
}

function focusFalloff(x,y,width,height) {
  const distance = Math.hypot((x / width - .5) / .36, (y / height - .53) / .3);
  return mix(.26,1,clamp((distance - .3) / .8,0,1));
}

function glow(ctx, image, x, y, radius, alpha) {
  if (!image || alpha <= 0) return;
  ctx.globalAlpha = clamp(alpha,0,1);
  ctx.drawImage(image,x - radius,y - radius,radius * 2,radius * 2);
}

function drawEntrySky(ctx, state, pointer, palette, sprites, nebula, reduced) {
  const { width:w, height:h, time:t } = state;
  ctx.clearRect(0,0,w,h);
  ctx.globalCompositeOperation = 'source-over';
  if (nebula) {
    ctx.globalAlpha = reduced ? .8 : .85 + Math.sin(t * .15) * .12;
    ctx.drawImage(nebula,-w * .025 + pointer.x * 12,-h * .025 + pointer.y * 9,w * 1.05,h * 1.05);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const star of state.stars) {
    const drift = reduced ? 0 : t;
    const x = ((star.x * w + drift * star.depth * 1.9 + pointer.x * star.depth * 22 + 24) % (w + 48) + w + 48) % (w + 48) - 24;
    const y = ((star.y * h - drift * star.depth * .55 + pointer.y * star.depth * 17 + 24) % (h + 48) + h + 48) % (h + 48) - 24;
    const twinkle = reduced ? .75 : .58 + Math.sin(t * star.speed + star.phase) * .23 + Math.sin(t * 2.1 + star.phase) * .08;
    const alpha = clamp(twinkle * (.56 + star.depth * .4) * focusFalloff(x,y,w,h),0,1);
    if (star.radius > 1.15) glow(ctx,sprites[star.tone],x,y,star.radius * 7,alpha * .33);
    ctx.globalAlpha = alpha; ctx.fillStyle = palette[star.tone];
    ctx.beginPath(); ctx.arc(x,y,star.radius,0,TAU); ctx.fill();
    if (star.radius > 1.55) {
      ctx.globalAlpha = alpha * .42; ctx.lineWidth = .55; ctx.strokeStyle = palette[star.tone];
      ctx.beginPath(); ctx.moveTo(x - 4,y); ctx.lineTo(x + 4,y); ctx.moveTo(x,y - 4); ctx.lineTo(x,y + 4); ctx.stroke();
    }
  }

  const compact = w < 620;
  ENTRY_CONSTELLATIONS.forEach((constellation,index) => {
    // A portrait sky keeps the constellations in the top and bottom margins.
    const centerX = compact ? (index % 2 ? .79 : .2) : constellation.x;
    const centerY = compact ? (index < 2 ? .12 + index * .055 : .84 + (index - 2) * .05) : constellation.y;
    const size = Math.min(compact ? w * .37 : w * .22,h * .28,280) * constellation.size;
    const offsetX = pointer.x * 16 + (reduced ? 0 : Math.sin(t * .12 + index) * 4);
    const offsetY = pointer.y * 12 + (reduced ? 0 : Math.cos(t * .1 + index) * 3);
    const nodes = constellation.nodes.map(([x,y]) => ({ x:centerX * w + x * size + offsetX,y:centerY * h + y * size + offsetY }));
    const cycle = ((t * .2 + constellation.phase) % 4) / 4;
    const breathe = reduced ? .85 : .7 + Math.sin(t * .65 + constellation.phase) * .2;
    for (let edge = 0; edge < constellation.edges.length; edge++) {
      const [a,b] = constellation.edges[edge], from = nodes[a], to = nodes[b];
      const reveal = reduced ? 1 : clamp(cycle * (constellation.edges.length + 3) - edge,0,1);
      ctx.strokeStyle = palette[constellation.tone]; ctx.lineWidth = .7;
      ctx.globalAlpha = .16 * breathe;
      ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
      if (reveal > 0) {
        ctx.globalAlpha = .24 * breathe;
        ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(mix(from.x,to.x,reveal),mix(from.y,to.y,reveal)); ctx.stroke();
      }
    }
    nodes.forEach((node,nodeIndex) => {
      const proximity = reduced ? 0 : clamp(1 - Math.hypot(node.x - (pointer.x + .5) * w,node.y - (pointer.y + .5) * h) / 135,0,1);
      const alpha = (.62 + proximity * .3) * breathe;
      glow(ctx,sprites[constellation.tone],node.x,node.y,nodeIndex === 2 ? 12 : 8,alpha * .35);
      ctx.fillStyle = palette.white; ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(node.x,node.y,nodeIndex === 2 ? 1.7 : 1.1,0,TAU); ctx.fill();
    });
  });

  for (const meteor of state.meteors) {
    const progress = meteor.age / meteor.duration;
    const fade = clamp(progress * 9,0,1) * clamp((1 - progress) * 4,0,1);
    const tail = .23, steps = state.economical ? 14 : 22;
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps, previous = (step - 1) / steps;
      const a = meteorPoint(meteor,progress - tail + previous * tail), b = meteorPoint(meteor,progress - tail + fraction * tail);
      ctx.strokeStyle = palette[meteor.tone]; ctx.globalAlpha = fade * fraction * fraction * .07;
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x * w,a.y * h); ctx.lineTo(b.x * w,b.y * h); ctx.stroke();
      ctx.strokeStyle = palette.white; ctx.globalAlpha = fade * fraction * fraction * .75;
      ctx.lineWidth = .65 + fraction * .65; ctx.beginPath(); ctx.moveTo(a.x * w,a.y * h); ctx.lineTo(b.x * w,b.y * h); ctx.stroke();
    }
    const head = meteorPoint(meteor,progress);
    glow(ctx,sprites[meteor.tone],head.x * w,head.y * h,17,fade * .7);
    glow(ctx,sprites.white,head.x * w,head.y * h,4,fade);
  }
  for (const burst of state.bursts) {
    const fade = clamp(1 - burst.age / 1.65,0,1);
    for (let index = 0; index < 9; index++) {
      const angle = burst.phase + index * TAU / 9;
      const distance = 5 + 48 * (1 - Math.exp(-burst.age * 2.8));
      const x = burst.x * w + Math.cos(angle) * distance,y = burst.y * h + Math.sin(angle) * distance * .72;
      glow(ctx,sprites[index % 3 ? 'gold' : 'blue'],x,y,6,fade * .6);
      ctx.globalAlpha = fade * .85; ctx.fillStyle = palette.white;
      ctx.beginPath(); ctx.arc(x,y,1,0,TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** Bounded Canvas2D renderer. No timer, no asset fetch, no permissions and no pointer capture. */
export function mountEntrySky(element, { reduced = false, economical = false, interactionHost } = {}) {
  const document = element.ownerDocument, win = document.defaultView;
  const ctx = element.getContext('2d', { alpha:true });
  if (!ctx || !win) return () => {};
  const host = interactionHost || element.closest('.intro3b') || element.parentElement;
  const shell = element.closest('.threeb-app-content');
  const style = win.getComputedStyle(document.documentElement);
  const palette = {
    gold:style.getPropertyValue('--3b-champagne-highlight').trim() || 'rgb(240,221,175)',
    blue:style.getPropertyValue('--3b-matrix').trim() || 'rgb(59,167,255)',
    white:style.getPropertyValue('--3b-white').trim() || 'rgb(247,244,236)',
  };
  const sprites = Object.fromEntries(Object.entries(palette).map(([key,value]) => [key,makeGlow(document,value)]));
  let state, budget, nebula, rect, frame = 0, last = 0, disposed = false, pageHidden = false;
  const pointer = { x:0,y:0 }, eased = { x:0,y:0 };
  const allowed = () => !disposed && !reduced && !document.hidden && !pageHidden && !shell?.hasAttribute('inert');
  const render = () => { if (state && !document.hidden) drawEntrySky(ctx,state,eased,palette,sprites,nebula,reduced); };
  const resize = () => {
    if (disposed) return;
    rect = element.getBoundingClientRect();
    const width = Math.max(1,rect.width || win.innerWidth),height = Math.max(1,rect.height || win.innerHeight);
    budget = entrySkyBudget({ width,height,dpr:win.devicePixelRatio || 1,economical });
    if (!state || state.width !== width || state.height !== height) {
      const next = createEntrySky({ width,height,economical });
      if (state) Object.assign(next,{ time:state.time,nextMeteor:state.nextMeteor,serial:state.serial,meteors:state.meteors,bursts:state.bursts });
      state = next; nebula = makeNebula(document,width,height,palette,economical);
    }
    element.width = Math.round(width * budget.dpr); element.height = Math.round(height * budget.dpr);
    ctx.setTransform(budget.dpr,0,0,budget.dpr,0,0);
    element.dataset.starCount = String(budget.stars);
    render();
  };
  const draw = now => {
    frame = 0;
    if (!allowed()) return;
    frame = win.requestAnimationFrame(draw);
    if (!last) { last = now; return; }
    const interval = 1000 / budget.fps, elapsed = now - last;
    if (elapsed < interval) return;
    last = now;
    const dt = Math.min(elapsed / 1000,.09);
    advanceEntrySky(state,dt);
    const ease = 1 - Math.exp(-dt * 3.6);
    eased.x += (pointer.x - eased.x) * ease; eased.y += (pointer.y - eased.y) * ease;
    render();
  };
  const visibility = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0; last = 0;
    element.dataset.skyState = reduced ? 'still' : allowed() ? 'living' : 'paused';
    if (allowed()) frame = win.requestAnimationFrame(draw);
  };
  const move = event => {
    if (!allowed() || !rect) return;
    pointer.x = clamp((event.clientX - rect.left) / state.width - .5,-.5,.5);
    pointer.y = clamp((event.clientY - rect.top) / state.height - .5,-.5,.5);
  };
  const leave = () => { pointer.x = 0; pointer.y = 0; };
  const press = event => {
    if (!allowed() || event.target?.closest?.('button,a,input,summary,select,textarea')) return;
    move(event);
    if (addEntryStardust(state,pointer.x + .5,pointer.y + .5) && event.isTrusted) {
      win.dispatchEvent(new win.CustomEvent('threeb:interface-sound',{ detail:{ kind:'constellation',pan:pointer.x,event } }));
    }
  };
  const pagehide = () => { pageHidden = true; visibility(); };
  const pageshow = () => { pageHidden = false; resize(); visibility(); };
  const observer = win.ResizeObserver ? new win.ResizeObserver(resize) : null;
  const launchObserver = shell && win.MutationObserver ? new win.MutationObserver(visibility) : null;
  observer?.observe(element);
  launchObserver?.observe(shell,{ attributes:true,attributeFilter:['inert'] });
  if (!reduced) {
    host?.addEventListener('pointermove',move,{ passive:true });
    host?.addEventListener('pointerdown',press,{ passive:true });
    host?.addEventListener('pointerleave',leave,{ passive:true });
  }
  document.addEventListener('visibilitychange',visibility);
  win.addEventListener('resize',resize,{ passive:true });
  win.addEventListener('pagehide',pagehide);
  win.addEventListener('pageshow',pageshow);
  resize(); visibility();
  return () => {
    disposed = true;
    if (frame) win.cancelAnimationFrame(frame);
    observer?.disconnect(); launchObserver?.disconnect();
    host?.removeEventListener('pointermove',move); host?.removeEventListener('pointerdown',press); host?.removeEventListener('pointerleave',leave);
    document.removeEventListener('visibilitychange',visibility); win.removeEventListener('resize',resize);
    win.removeEventListener('pagehide',pagehide); win.removeEventListener('pageshow',pageshow);
    element.dataset.skyState = 'disposed';
    // Release bitmap backing stores when the user enters the application.
    Object.values(sprites).forEach(sprite => { if (sprite) { sprite.width = 1; sprite.height = 1; } });
    if (nebula) { nebula.width = 1; nebula.height = 1; }
    element.width = 1; element.height = 1;
  };
}
