// Screen-space choreography. These functions do not read account data or change page text.
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const limit = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const sample = random => {
  const value = random?.();
  return limit(Number.isFinite(value) ? value : 0.5, 0, 0.999999999);
};

export const STAGE_DURATIONS = Object.freeze({
  hello: 2600, curious: 3300, idle: 2200, dance: 6700, breakdance: 7100,
  pocket: 5400, hologram: 6100, sit: 6300, rest: 6500, sleep: 10000,
  wake: 3000, highfive: 3400, celebrate: 4800, secret: 5000, guardian: 4200,
  support: 3900, clock: 4000, notification: 4200, focus: 7500, think: 4900,
  hang: 3300, land: 620,
});

export function normalizeStageAction(action) {
  const aliases = { stroll: 'walk', glance: 'curious', cheer: 'celebrate', greet: 'hello', perch: 'hang' };
  const value = aliases[action] || action;
  return value === 'walk' || value === 'fall' || Object.hasOwn(STAGE_DURATIONS, value) ? value : null;
}

export function getStageBounds(viewport = {}, size = {}) {
  const width = Math.max(1, finite(viewport.width, 360));
  const height = Math.max(1, finite(viewport.height, 720));
  const offsetX = finite(viewport.offsetLeft);
  const offsetY = finite(viewport.offsetTop);
  const objectWidth = Math.max(1, finite(typeof size === 'number' ? size : size.width, 112));
  const objectHeight = Math.max(1, finite(typeof size === 'number' ? size : size.height, 112));
  const margin = Math.max(0, finite(viewport.margin, 12));
  // Collapse insets before allowing the avatar off a narrow/keyboard-reduced viewport.
  const roomX = Math.max(0, width - objectWidth);
  const roomY = Math.max(0, height - objectHeight);
  const insetX = Math.min(margin, roomX / 2);
  const top = Math.min(Math.max(margin, finite(viewport.safeTop, 72)), roomY / 2);
  const bottom = Math.min(Math.max(margin, finite(viewport.safeBottom, 88)), Math.max(0, roomY - top));
  return {
    minX: offsetX + insetX, maxX: offsetX + Math.max(insetX, roomX - insetX),
    minY: offsetY + top, maxY: offsetY + Math.max(top, roomY - bottom),
    width: objectWidth, height: objectHeight,
    viewportWidth: width, viewportHeight: height, offsetX, offsetY,
  };
}

export function clampStagePosition(position = {}, bounds) {
  return {
    x: limit(finite(position.x, bounds.minX), bounds.minX, bounds.maxX),
    y: limit(finite(position.y, bounds.maxY), bounds.minY, bounds.maxY),
  };
}

export function homeStagePosition(bounds, side = 'right') {
  return { x: side === 'left' ? bounds.minX : bounds.maxX, y: bounds.maxY };
}

export function stageRect(position, size) {
  return { left: position.x, top: position.y, right: position.x + size.width, bottom: position.y + size.height };
}

export function rectsOverlap(a, b, gap = 0) {
  return a.left < b.right + gap && a.right > b.left - gap
    && a.top < b.bottom + gap && a.bottom > b.top - gap;
}

export function isStagePositionClear(position, bounds, obstacles = [], gap = 5) {
  const clamped = clampStagePosition(position, bounds);
  if (clamped.x !== position.x || clamped.y !== position.y) return false;
  return !obstacles.some(rect => rectsOverlap(stageRect(position, bounds), rect, gap));
}

export function interpolateStageTravel(from, to, progress, arcHeight = 0) {
  const t = limit(finite(progress), 0, 1);
  const smooth = t * t * (3 - 2 * t);
  return {
    x: from.x + (to.x - from.x) * smooth,
    y: from.y + (to.y - from.y) * smooth - 4 * Math.max(0, arcHeight) * t * (1 - t),
  };
}

export function isStagePathClear(from, to, bounds, obstacles = [], arcHeight = 0) {
  // The distance-based sampling spacing is smaller than the avatar footprint, so a
  // narrow control cannot be skipped between samples. Only the initial overlap is ignored.
  const distance = Math.hypot(to.x - from.x, to.y - from.y) + arcHeight * 2;
  const steps = Math.max(2, Math.ceil(distance / Math.max(10, Math.min(bounds.width, bounds.height) / 3)));
  const startingOverlaps = obstacles.filter(rect => rectsOverlap(stageRect(from, bounds), rect, 5));
  let leftInitialOverlap = false;
  for (let index = 1; index <= steps; index += 1) {
    const position = interpolateStageTravel(from, to, index / steps, arcHeight);
    if (position.x < bounds.minX || position.x > bounds.maxX || position.y < bounds.minY || position.y > bounds.maxY) return false;
    const overlaps = obstacles.filter(rect => rectsOverlap(stageRect(position, bounds), rect, 5));
    if (!overlaps.length) leftInitialOverlap = true;
    if (overlaps.some(rect => !startingOverlaps.includes(rect)) || (leftInitialOverlap && overlaps.length)) return false;
  }
  return isStagePositionClear(to, bounds, obstacles);
}

export function findStageWalkTarget(from, bounds, obstacles = [], random = Math.random) {
  const direction = from.x > (bounds.minX + bounds.maxX) / 2 ? -1 : 1;
  const maximum = Math.min(370, Math.max(60, (bounds.maxX - bounds.minX) * 0.68));
  const preferred = maximum * (0.72 + sample(random) * 0.28);
  // Try a full stroll, then a shorter stroll on the same safe ledge.
  for (const sign of [direction, -direction]) {
    for (const distance of [preferred, preferred * 0.7, 80, 48, 34]) {
      const target = clampStagePosition({ x: from.x + sign * distance, y: from.y }, bounds);
      if (Math.abs(target.x - from.x) < 30) continue;
      if (isStagePathClear(from, target, bounds, obstacles)) return target;
    }
  }
  // Compact layouts often have a free vertical edge but no horizontal aisle.
  // Walking within the screen plane keeps the same safety checks on both axes.
  for (const lift of [-120, 120, -72, 72, -40, 40]) {
    for (const shift of [direction * 42, 0, -direction * 42]) {
      const target = clampStagePosition({ x: from.x + shift, y: from.y + lift }, bounds);
      if (Math.hypot(target.x - from.x, target.y - from.y) < 30) continue;
      if (isStagePathClear(from, target, bounds, obstacles)) return target;
    }
  }
  return null;
}

export function findStageHome(bounds, side = 'right', obstacles = []) {
  const preferred = homeStagePosition(bounds, side);
  const opposite = homeStagePosition(bounds, side === 'right' ? 'left' : 'right');
  const candidates = [preferred, opposite];
  for (const lift of [0.6, 1.25, 2, 2.7, 3.4, 4.1]) {
    const y = Math.max(bounds.minY, bounds.maxY - bounds.height * lift);
    candidates.push({ x: preferred.x, y }, { x: opposite.x, y });
  }
  // Avoid covering controls at rest; a stationary corner is the bounded fallback on a dense page.
  const clear = candidates.filter(candidate => isStagePositionClear(candidate, bounds, obstacles));
  return clear.find(candidate => findStageWalkTarget(candidate, bounds, obstacles, () => 0.5)) || clear[0] || preferred;
}

export function stepCompanionFall(state, seconds, bounds, { gravity = 1680, restitution = 0.27 } = {}) {
  // Long inactive frames must never cause a teleport or a huge bounce.
  const dt = limit(finite(seconds), 0, 0.034);
  const previous = clampStagePosition(state, bounds);
  let vx = limit(finite(state.vx), -760, 760);
  let vy = limit(finite(state.vy), -920, 1300);
  let x = previous.x + vx * dt;
  let y = previous.y + vy * dt + gravity * dt * dt / 2;
  vy = Math.min(1300, vy + gravity * dt);
  vx *= Math.exp(-1.35 * dt);
  let bounces = Math.max(0, finite(state.bounces));
  let hitFloor = false;
  let settled = false;
  if (x < bounds.minX || x > bounds.maxX) { x = limit(x, bounds.minX, bounds.maxX); vx *= -0.24; }
  if (y < bounds.minY) { y = bounds.minY; vy = Math.max(30, vy * -0.18); }
  if (y >= bounds.maxY) {
    hitFloor = true;
    y = bounds.maxY;
    if (vy > 175 && bounces < 2 && !state.settled) {
      vy *= -limit(restitution, 0, 0.45);
      vx *= 0.55;
      bounces += 1;
    } else { vy = 0; vx = 0; settled = true; }
  }
  return { x, y, vx, vy, bounces, hitFloor, settled };
}

const PERSONALITY_SCENES = Object.freeze({
  bienveillant: [['walk', 5], ['hello', 3], ['highfive', 2], ['pocket', 3], ['curious', 2], ['sit', 1]],
  taquin: [['walk', 6], ['hang', 5], ['dance', 4], ['pocket', 4], ['curious', 2], ['highfive', 1]],
  calme: [['walk', 3], ['sit', 5], ['think', 4], ['pocket', 2], ['hello', 1]],
  audacieux: [['walk', 5], ['hang', 5], ['breakdance', 5], ['pocket', 3], ['hologram', 3], ['dance', 2]],
  curieux: [['walk', 5], ['hang', 3], ['curious', 5], ['hologram', 4], ['pocket', 3], ['think', 2]],
  energique: [['walk', 6], ['dance', 6], ['breakdance', 4], ['highfive', 3], ['hang', 3], ['pocket', 2]],
});

export function chooseStageScene({ personality = 'bienveillant', recent = [], hasAnchor = false,
  canWalk = true, reducedMotion = false, lowPower = false, discreet = false, autonomous = true,
  random = Math.random } = {}) {
  if (!autonomous || reducedMotion || lowPower || discreet) return null;
  const catalog = PERSONALITY_SCENES[personality] || PERSONALITY_SCENES.bienveillant;
  const available = catalog.filter(([kind]) => (kind !== 'hang' || hasAnchor) && (kind !== 'walk' || canWalk));
  const unrepeated = available.filter(([kind]) => !recent.slice(-2).includes(kind));
  const choices = unrepeated.length ? unrepeated : available;
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total) return null;
  let threshold = sample(random) * total;
  for (const [kind, weight] of choices) { threshold -= weight; if (threshold < 0) return kind; }
  return choices[choices.length - 1][0];
}

export function stageAutonomousDelay({ first = false, batterySaver = true, personality = 'bienveillant',
  autonomous = true, reducedMotion = false, lowPower = false, discreet = false, random = Math.random } = {}) {
  if (!autonomous || reducedMotion || lowPower || discreet) return null;
  if (first) return 3200 + sample(random) * 1600;
  const calmer = personality === 'calme' ? 1.4 : 1;
  return Math.round((batterySaver ? 23000 + sample(random) * 14000 : 14000 + sample(random) * 11000) * calmer);
}

const PRIVATE_OR_INTERACTIVE = 'button,a,input,textarea,select,label,form,[contenteditable]:not([contenteditable="false"]),[role="dialog"],dialog,[data-private],[data-sensitive],[data-personal],[data-companion-avoid],.companion3b-panel,.companion3b-shell';

export function readHeadingAnchorRect(anchor, doc = globalThis.document) {
  if (!anchor?.node?.isConnected || !doc?.createRange) return null;
  try {
    const range = doc.createRange();
    range.setStart(anchor.node, anchor.start);
    range.setEnd(anchor.node, anchor.end);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    return rect.width >= 2 && rect.height >= 12 ? rect : null;
  } catch { return null; }
}

export function headingAnchorPosition(rect, bounds) {
  const position = { x: (rect.left + rect.right) / 2 - bounds.width / 2, y: rect.bottom - bounds.height * 0.2 };
  const clamped = clampStagePosition(position, bounds);
  // Never hang on an invisible/clipped letter by clamping the character elsewhere.
  return clamped.x === position.x && clamped.y === position.y ? position : null;
}

export function findVisibleHeadingAnchors(doc, bounds, { shell = null, maximum = 28 } = {}) {
  if (!doc?.querySelectorAll || !doc.createTreeWalker || !doc.createRange) return [];
  const anchors = [];
  const view = doc.defaultView;
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,[data-companion-anchor]')).slice(0, 24);
  for (const heading of headings) {
    if (heading.closest(PRIVATE_OR_INTERACTIVE) || heading.hidden || heading.getAttribute('aria-hidden') === 'true') continue;
    const style = view?.getComputedStyle?.(heading);
    if (style?.display === 'none' || style?.visibility === 'hidden' || Number(style?.opacity) === 0) continue;
    const headingRect = heading.getBoundingClientRect();
    if (headingRect.bottom < bounds.minY || headingRect.top > bounds.maxY || headingRect.width < 16) continue;
    const walker = doc.createTreeWalker(heading, 4); // SHOW_TEXT; no input values/attributes are accessed.
    let node;
    let inspected = 0;
    while ((node = walker.nextNode()) && inspected < 100) {
      if (node.parentElement?.closest(PRIVATE_OR_INTERACTIVE)) continue;
      const text = node.textContent || '';
      for (let start = 0; start < text.length && inspected < 100; start += 1, inspected += 1) {
        const letter = text[start];
        if (!/[\p{L}\p{N}]/u.test(letter)) continue;
        const anchor = { node, element: heading, start, end: start + 1, letter };
        const rect = readHeadingAnchorRect(anchor, doc);
        if (!rect || !headingAnchorPosition(rect, bounds)) continue;
        const hitX = (rect.left + rect.right) / 2;
        const hitY = (rect.top + rect.bottom) / 2;
        const hits = doc.elementsFromPoint?.(hitX, hitY);
        const top = hits?.find(element => !shell?.contains?.(element));
        if (top && !heading.contains(top) && top !== heading) continue;
        anchors.push({ ...anchor, rect });
        if (anchors.length >= maximum) return anchors;
      }
    }
  }
  return anchors;
}

export function createStageClock({ requestFrame, cancelFrame, setTimer, clearTimer }) {
  let disposed = false;
  let frameId = null;
  const timers = new Map();
  const clear = name => {
    if (timers.has(name)) { clearTimer(timers.get(name)); timers.delete(name); }
  };
  const cancelAnimation = () => {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  };
  const clearAll = () => { cancelAnimation(); for (const name of timers.keys()) clear(name); };
  return {
    frame(callback) {
      cancelAnimation();
      if (!disposed) frameId = requestFrame(now => { frameId = null; if (!disposed) callback(now); });
    },
    timeout(name, callback, delay) {
      clear(name);
      if (!disposed) timers.set(name, setTimer(() => { timers.delete(name); if (!disposed) callback(); }, Math.max(0, delay)));
    },
    clear, cancelAnimation, clearAll,
    dispose() { disposed = true; clearAll(); },
    get pending() { return timers.size + Number(frameId !== null); },
  };
}
