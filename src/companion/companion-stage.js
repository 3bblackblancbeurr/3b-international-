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

export const STAGE_PLACEMENT_KEY = 'threeb_companion_stage_v1';

// Persist proportions of the available stage, never old screen pixels. A saved
// placement remains reachable after a phone rotates or its keyboard opens.
export function stagePlacement(position, bounds, side = 'right') {
  const point = clampStagePosition(position, bounds);
  const ratio = (value, minimum, maximum) => maximum > minimum ? (value - minimum) / (maximum - minimum) : 0.5;
  return { version: 1, side: side === 'left' ? 'left' : 'right',
    x: ratio(point.x, bounds.minX, bounds.maxX), y: ratio(point.y, bounds.minY, bounds.maxY) };
}

export function restoreStagePlacement(value, bounds) {
  if (!value || value.version !== 1 || !['left', 'right'].includes(value.side)
    || !Number.isFinite(value.x) || !Number.isFinite(value.y)
    || value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1) return null;
  return { side: value.side, position: {
    x: bounds.minX + value.x * (bounds.maxX - bounds.minX),
    y: bounds.minY + value.y * (bounds.maxY - bounds.minY),
  } };
}

export function createStagePointerGesture(event, position, timestamp = 0) {
  return {
    id: event.pointerId, target: event.currentTarget,
    x: event.clientX, y: event.clientY, origin: { ...position },
    threshold: event.pointerType === 'touch' ? 10 : 6,
    lastX: event.clientX, lastY: event.clientY, lastTime: timestamp,
    vx: 0, vy: 0, moved: false,
  };
}

export function advanceStagePointerGesture(gesture, event, timestamp = 0) {
  if (!gesture || gesture.id !== event.pointerId
    || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return gesture;
  // Only the pointer's viewport coordinates determine a drag. Animated artwork,
  // a changing target rectangle, and sub-threshold touch jitter do not count.
  const moved = gesture.moved || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= gesture.threshold;
  if (!moved) return gesture;
  const dt = Math.max(0.008, (timestamp - gesture.lastTime) / 1000);
  const blend = 1 - Math.exp(-18 * dt);
  const velocity = (delta, previous) => limit(delta / dt, -740, 740) * blend
    + (dt < 0.12 ? previous : 0) * (1 - blend);
  return { ...gesture, moved, lastX: event.clientX, lastY: event.clientY, lastTime: timestamp,
    vx: velocity(event.clientX - gesture.lastX, gesture.vx),
    vy: velocity(event.clientY - gesture.lastY, gesture.vy) };
}

export function isPointerNearStage(pointer, position, size, padding = 28) {
  if (!pointer || pointer.pointerType === 'touch' || !position) return false;
  return pointer.x >= position.x - padding && pointer.x <= position.x + size.width + padding
    && pointer.y >= position.y - padding && pointer.y <= position.y + size.height + padding;
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
  // Zero speed AND zero acceleration at both ends: a stroll settles into its
  // idle pose without a last-frame jerk. The path itself remains a straight line.
  const smooth = t * t * t * (10 + t * (-15 + t * 6));
  return {
    x: from.x + (to.x - from.x) * smooth,
    y: from.y + (to.y - from.y) * smooth - 4 * Math.max(0, arcHeight) * t * (1 - t),
  };
}

export function isStagePathClear(from, to, bounds, obstacles = [], arcHeight = 0) {
  const origin = clampStagePosition(from, bounds);
  if (origin.x !== from.x || origin.y !== from.y) return false;
  if (!arcHeight) {
    if (!isStagePositionClear(to, bounds, obstacles)) return false;
    // Sweep the complete footprint against expanded controls. Unlike sparse
    // samples, this cannot miss a thin button and its cost does not grow with
    // travel distance. A pre-existing overlap may only be exited, never entered.
    return obstacles.every(rect => {
      if (rectsOverlap(stageRect(from, bounds), rect, 5)) return true;
      let enter = 0;
      let leave = 1;
      for (const [origin, delta, minimum, maximum] of [
        [from.x, to.x - from.x, rect.left - bounds.width - 5, rect.right + 5],
        [from.y, to.y - from.y, rect.top - bounds.height - 5, rect.bottom + 5],
      ]) {
        if (Math.abs(delta) < 1e-9) {
          if (origin <= minimum || origin >= maximum) return true;
        } else {
          const a = (minimum - origin) / delta;
          const b = (maximum - origin) / delta;
          enter = Math.max(enter, Math.min(a, b));
          leave = Math.min(leave, Math.max(a, b));
          if (enter >= leave) return true;
        }
      }
      return enter >= leave;
    });
  }
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

function stageCandidates(from, bounds, obstacles = []) {
  const candidates = [];
  const keys = new Set();
  const add = candidate => {
    const point = clampStagePosition(candidate, bounds);
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (!keys.has(key)) { keys.add(key); candidates.push(point); }
  };
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  for (const x of [0, 0.25, 0.5, 0.75, 1]) {
    for (const y of [0, 0.25, 0.5, 0.75, 1]) add({ x: bounds.minX + spanX * x, y: bounds.minY + spanY * y });
  }
  for (const distance of [42, 84, 160, 260, 370]) {
    for (let angle = 0; angle < 8; angle += 1) {
      add({ x: from.x + Math.cos(angle * Math.PI / 4) * distance,
        y: from.y + Math.sin(angle * Math.PI / 4) * distance });
    }
  }
  // Control corners supply local detours that a regular grid alone can miss.
  // Limit this work: there is no DOM or path search in the animation frame.
  const near = [...obstacles].sort((a, b) =>
    Math.hypot((a.left + a.right) / 2 - from.x, (a.top + a.bottom) / 2 - from.y)
    - Math.hypot((b.left + b.right) / 2 - from.x, (b.top + b.bottom) / 2 - from.y)).slice(0, 16);
  for (const rect of near) {
    for (const x of [rect.left - bounds.width - 6, rect.right + 6]) {
      for (const y of [rect.top - bounds.height - 6, rect.bottom + 6]) add({ x, y });
      add({ x, y: from.y });
    }
    for (const y of [rect.top - bounds.height - 6, rect.bottom + 6]) add({ x: from.x, y });
  }
  return candidates;
}

export function findStageWalkTarget(from, bounds, obstacles = [], random = Math.random, { recent = [] } = {}) {
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const preferred = Math.min(340, Math.max(90, Math.hypot(spanX, spanY) * 0.47));
  const visitRadius = Math.max(50, Math.min(150, preferred * 0.55));
  const history = recent.slice(-7);
  const choices = [];
  for (const target of stageCandidates(from, bounds, obstacles)) {
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    if (distance < 30 || distance > Math.max(370, preferred * 1.35)
      || !isStagePathClear(from, target, bounds, obstacles)) continue;
    const repetition = history.reduce((sum, point, index) => {
      const away = Math.hypot(target.x - point.x, target.y - point.y) / visitRadius;
      return sum + Math.exp(-away * away) * (index + 1) / history.length;
    }, 0);
    const pace = 1 - Math.abs(distance - preferred) / Math.max(preferred, distance);
    const vertical = Math.min(1, Math.abs(target.y - from.y) / Math.max(100, preferred));
    // A remembered visit costs more than a tiny random tie break. This lets the
    // companion explore free lanes across both axes instead of pacing one edge.
    choices.push({ target, score: pace * 1.6 + vertical * 0.35 - repetition * 1.8 + sample(random) * 0.22 });
  }
  choices.sort((a, b) => b.score - a.score);
  return choices[0]?.target || null;
}

export function findStageRestPosition(from, bounds, obstacles = []) {
  const position = clampStagePosition(from, bounds);
  if (isStagePositionClear(position, bounds, obstacles)) return position;
  const choices = stageCandidates(position, bounds, obstacles)
    .filter(candidate => isStagePositionClear(candidate, bounds, obstacles))
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y));
  return choices.find(candidate => isStagePathClear(position, candidate, bounds, obstacles)) || choices[0] || null;
}

export function advanceStageTravel(elapsed, seconds, duration) {
  const milliseconds = Math.max(1, finite(duration, 1000));
  const delta = limit(finite(seconds), 0, 0.034) * 1000;
  return Math.min(milliseconds, Math.max(0, finite(elapsed)) + delta);
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
  return Math.round((batterySaver ? 12000 + sample(random) * 8000 : 8000 + sample(random) * 7000) * calmer);
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
