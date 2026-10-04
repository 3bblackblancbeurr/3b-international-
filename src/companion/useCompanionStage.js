import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_DURATIONS, chooseStageScene, clampStagePosition, createStageClock,
  findStageHome, findStageWalkTarget, findVisibleHeadingAnchors, getStageBounds,
  headingAnchorPosition, interpolateStageTravel, isStagePathClear, isStagePositionClear,
  normalizeStageAction, readHeadingAnchorRect, stageAutonomousDelay, stepCompanionFall,
} from './companion-stage.js';

const OWN_UI = '.companion3b-shell,.companion3b-panel';
const EDITABLE = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]),textarea,select,[contenteditable]:not([contenteditable="false"])';
const CONTROL = 'button,a[href],input,textarea,select,[role="button"],iframe,video,[data-companion-avoid]';
const initialUI = { pose: null, facing: -1, dragging: false, moving: false, bubbleSide: 'left', suspended: false };
const boundedVelocity = value => Math.max(-740, Math.min(740, value));

function externalInputFocused(doc) {
  const active = doc.activeElement;
  return !!active?.matches?.(EDITABLE) && !active.closest(OWN_UI);
}

function readControlRects(doc, shell, viewport) {
  const result = [];
  for (const element of Array.from(doc.querySelectorAll(CONTROL)).slice(0, 320)) {
    if (shell?.contains(element) || element.closest(OWN_UI) || element.hidden) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4 || rect.bottom < viewport.offsetTop
      || rect.top > viewport.offsetTop + viewport.height || rect.right < viewport.offsetLeft
      || rect.left > viewport.offsetLeft + viewport.width) continue;
    result.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
  }
  return result;
}

function readViewport(win, doc) {
  const visual = win.visualViewport;
  const viewport = {
    width: visual?.width || win.innerWidth,
    height: visual?.height || win.innerHeight,
    offsetLeft: visual?.offsetLeft || 0,
    offsetTop: visual?.offsetTop || 0,
    safeTop: 64,
    safeBottom: win.innerWidth <= 700 ? 88 : 24,
  };
  for (const element of doc.querySelectorAll('.site-header,.mobile-navigation,[data-companion-safe-top],[data-companion-safe-bottom]')) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 8) continue;
    if (rect.top <= viewport.offsetTop + 4 && rect.bottom < viewport.offsetTop + viewport.height * 0.45) {
      viewport.safeTop = Math.max(viewport.safeTop, rect.bottom - viewport.offsetTop + 12);
    }
    if (rect.bottom >= viewport.offsetTop + viewport.height - 4 && rect.top > viewport.offsetTop + viewport.height * 0.55) {
      viewport.safeBottom = Math.max(viewport.safeBottom, viewport.offsetTop + viewport.height - rect.top + 12);
    }
  }
  return viewport;
}

/**
 * A bounded, interruptible screen stage. React renders scene changes only;
 * animation frames write two transform properties directly to the avatar shell.
 * Manual gestures remain available when spontaneous initiatives are disabled.
 */
export default function useCompanionStage({
  shellRef, enabled = true, visible = true, reducedMotion = false, lowPower = false,
  discreet = false, paused = false, autonomous = true, batterySaver = true,
  page, personality = 'bienveillant', onScene, size,
}) {
  const options = useRef(null);
  options.current = { enabled, visible, reducedMotion, lowPower, discreet, paused, autonomous, batterySaver, page, personality, onScene, size };
  const controller = useRef(null);
  const suppressClick = useRef(false);
  const [ui, setUI] = useState(initialUI);

  useEffect(() => {
    const shell = shellRef.current;
    if (!enabled || !shell || typeof window === 'undefined') return undefined;
    const win = window;
    const doc = shell.ownerDocument || document;
    const clock = createStageClock({
      requestFrame: callback => win.requestAnimationFrame(callback),
      cancelFrame: id => win.cancelAnimationFrame(id),
      setTimer: (callback, delay) => win.setTimeout(callback, delay),
      clearTimer: id => win.clearTimeout(id),
    });
    const state = {
      alive: true, ui: { ...initialUI }, bounds: null, obstacles: [], position: null,
      home: null, side: 'right', drag: null, scene: null, source: null,
      moving: false, anchor: null, recent: [], first: true,
      lastOptions: { ...options.current },
    };
    const now = () => win.performance?.now?.() ?? Date.now();
    const publish = patch => {
      if (!state.alive) return;
      const next = { ...state.ui, ...patch };
      if (Object.keys(patch).every(key => state.ui[key] === next[key])) return;
      state.ui = next;
      setUI(next);
    };
    const isSuspended = () => !options.current.enabled || !options.current.visible || doc.hidden
      || !!doc.fullscreenElement || externalInputFocused(doc);
    const canTravel = () => !isSuspended() && !options.current.reducedMotion && !options.current.lowPower;
    const canAuto = () => canTravel() && !options.current.paused && !options.current.discreet
      && options.current.autonomous && !state.drag && !state.scene;

    function measure() {
      const viewport = readViewport(win, doc);
      const configured = options.current.size;
      const dimensions = typeof configured === 'number' ? { width: configured, height: configured } : configured;
      const width = dimensions?.width || shell.offsetWidth || (options.current.discreet ? 76 : 112);
      const height = dimensions?.height || shell.offsetHeight || (options.current.discreet ? 88 : 124);
      state.bounds = getStageBounds(viewport, { width, height });
      state.obstacles = readControlRects(doc, shell, viewport);
      state.home = findStageHome(state.bounds, state.side, state.obstacles);
    }

    function write(position) {
      state.position = clampStagePosition(position, state.bounds);
      shell.style.setProperty('--companion-stage-x', `${state.position.x.toFixed(2)}px`);
      shell.style.setProperty('--companion-stage-y', `${state.position.y.toFixed(2)}px`);
      const bubbleSide = state.position.x + state.bounds.width / 2 < state.bounds.offsetX + state.bounds.viewportWidth / 2 ? 'right' : 'left';
      if (bubbleSide !== state.ui.bubbleSide) publish({ bubbleSide });
    }

    function releaseCapture() {
      const drag = state.drag;
      state.drag = null;
      if (drag) {
        try { if (drag.target?.hasPointerCapture?.(drag.id)) drag.target.releasePointerCapture(drag.id); } catch { /* OS already released it. */ }
      }
      publish({ dragging: false });
      return drag;
    }

    function schedule() {
      clock.clear('auto');
      if (!canAuto()) return;
      const delay = stageAutonomousDelay({ ...options.current, first: state.first });
      if (delay === null) return;
      clock.timeout('auto', () => {
        if (!canAuto()) return;
        measure();
        const walkTarget = findStageWalkTarget(state.position, state.bounds, state.obstacles);
        const anchors = availableAnchors();
        const kind = state.first && walkTarget ? 'walk' : chooseStageScene({
          ...options.current, recent: state.recent, hasAnchor: anchors.length > 0, canWalk: !!walkTarget,
        });
        state.first = false;
        if (!kind || !play(kind, 'auto', { walkTarget, anchors })) schedule();
      }, delay);
    }

    function finish() {
      clock.clear('scene');
      clock.cancelAnimation();
      state.scene = null;
      state.source = null;
      state.moving = false;
      state.anchor = null;
      publish({ pose: null, moving: false });
      schedule();
    }

    function cancel({ home = false, reschedule = true } = {}) {
      clock.clearAll();
      releaseCapture();
      state.scene = null;
      state.source = null;
      state.anchor = null;
      state.moving = false;
      if (home && state.home) write(state.home);
      publish({ pose: null, moving: false });
      if (reschedule) schedule();
    }

    function travel(to, { pose = 'walk', duration, arc = 0, arrived = finish } = {}) {
      const from = { ...state.position };
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const milliseconds = duration || Math.max(850, Math.min(4100, distance / 76 * 1000));
      const started = now();
      state.moving = true;
      publish({ pose, moving: true, facing: to.x < from.x ? -1 : 1 });
      const tick = timestamp => {
        if (!state.alive || isSuspended()) { cancel({ reschedule: false }); return; }
        if (!canTravel()) { cancel({ home: false }); return; }
        const progress = Math.min(1, Math.max(0, (timestamp - started) / milliseconds));
        write(interpolateStageTravel(from, to, progress, arc));
        if (progress >= 1) { state.moving = false; publish({ moving: false }); arrived(); }
        else clock.frame(tick);
      };
      clock.frame(tick);
    }

    function returnHome() {
      measure();
      const target = state.home;
      if (Math.hypot(target.x - state.position.x, target.y - state.position.y) > 16
        && canTravel() && isStagePathClear(state.position, target, state.bounds, state.obstacles)) {
        travel(target, { pose: 'walk', arrived: finish });
      } else {
        // A control may now occupy the path home: keep the landing safe instead of crossing it.
        if (!isStagePositionClear(state.position, state.bounds, state.obstacles)) write(target);
        finish();
      }
    }

    function fall(vx = 0, vy = 0) {
      state.anchor = null;
      state.moving = true;
      publish({ pose: 'fall', moving: true });
      let physics = { ...state.position, vx, vy, bounces: 0 };
      let previousTime = now();
      const started = previousTime;
      const tick = timestamp => {
        if (!state.alive || isSuspended()) { cancel({ reschedule: false }); return; }
        if (!canTravel()) { cancel({ home: false }); return; }
        physics = stepCompanionFall(physics, (timestamp - previousTime) / 1000, state.bounds);
        previousTime = timestamp;
        write(physics);
        if (physics.settled || timestamp - started > 5200) {
          state.moving = false;
          write({ x: state.position.x, y: state.bounds.maxY });
          publish({ pose: 'land', moving: false });
          clock.timeout('scene', returnHome, STAGE_DURATIONS.land);
        } else clock.frame(tick);
      };
      clock.frame(tick);
    }

    function availableAnchors() {
      return findVisibleHeadingAnchors(doc, state.bounds, { shell }).filter(anchor => {
        const target = headingAnchorPosition(anchor.rect, state.bounds);
        return target && isStagePositionClear(target, state.bounds, state.obstacles)
          && isStagePathClear(state.position, target, state.bounds, state.obstacles);
      });
    }

    function play(action, source = 'user', prepared = {}) {
      const kind = normalizeStageAction(action);
      if (!kind || isSuspended() || (source === 'auto' && !canAuto())) return false;
      measure();
      let target;
      let anchor;
      if (kind === 'walk' && canTravel()) {
        target = prepared.walkTarget || findStageWalkTarget(state.position, state.bounds, state.obstacles);
        if (!target) {
          if (source === 'auto') return false;
          // A tight screen can still show a step in place without covering its controls.
          target = null;
        }
      }
      if (kind === 'hang') {
        if (!canTravel()) return false;
        const candidates = prepared.anchors || availableAnchors();
        // Nearby letters feel intentional and keep the leap within the visible application.
        const reachable = candidates.map(value => ({
          anchor: value, target: headingAnchorPosition(value.rect, state.bounds),
        })).filter(value => value.target && isStagePathClear(state.position, value.target, state.bounds, state.obstacles));
        reachable.sort((a, b) => Math.hypot(a.target.x - state.position.x, a.target.y - state.position.y)
          - Math.hypot(b.target.x - state.position.x, b.target.y - state.position.y));
        const selected = reachable[Math.floor(Math.random() * Math.min(4, reachable.length))];
        if (!selected) return false;
        anchor = selected.anchor;
        target = selected.target;
      }
      cancel({ reschedule: false });
      state.scene = kind;
      state.source = source;
      state.recent = [...state.recent, kind].slice(-4);
      publish({ pose: kind });
      try { options.current.onScene?.({ kind, source, ...(anchor ? { anchor: anchor.letter } : {}) }); } catch { /* Choreography survives an optional reply handler. */ }
      if (kind === 'walk' && target) { travel(target); return true; }
      if (kind === 'hang') {
        const duration = Math.max(1000, Math.min(2100, Math.hypot(target.x - state.position.x, target.y - state.position.y) * 3.7));
        travel(target, {
          pose: 'hang', duration,
          arrived: () => {
            const rect = readHeadingAnchorRect(anchor, doc);
            const anchored = rect && headingAnchorPosition(rect, state.bounds);
            if (!anchored) { fall(); return; }
            state.anchor = anchor;
            write(anchored);
            publish({ pose: 'hang', moving: false });
            clock.timeout('scene', () => fall(state.ui.facing * 32, -30), STAGE_DURATIONS.hang);
          },
        });
        return true;
      }
      if (kind === 'fall' && canTravel()) {
        // A requested tumble starts with a small leap, then releases into actual gravity.
        if (state.position.y >= state.bounds.maxY - 5) {
          const peak = clampStagePosition({ x: state.position.x, y: state.position.y - Math.min(125, state.bounds.height) }, state.bounds);
          if (isStagePathClear(state.position, peak, state.bounds, state.obstacles)) {
            travel(peak, { pose: 'curious', duration: 540, arrived: () => fall(state.ui.facing * 50) });
          } else fall(0, -360);
        } else fall(state.ui.facing * 30);
        return true;
      }
      // Reduced-motion and battery modes retain explicit poses without automatic displacement.
      clock.timeout('scene', finish, STAGE_DURATIONS[kind] || 2800);
      return true;
    }

    function pointerDown(event) {
      if (isSuspended() || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      suppressClick.current = false;
      cancel({ reschedule: false });
      measure();
      state.drag = {
        id: event.pointerId, target: event.currentTarget,
        x: event.clientX, y: event.clientY, origin: { ...state.position },
        lastX: event.clientX, lastY: event.clientY, lastTime: now(), vx: 0, vy: 0, moved: false,
      };
      try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Synthetic/legacy pointer. */ }
    }

    function pointerMove(event) {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      const timestamp = now();
      const dt = Math.max(0.008, (timestamp - drag.lastTime) / 1000);
      drag.vx = boundedVelocity((event.clientX - drag.lastX) / dt) * 0.6 + drag.vx * 0.4;
      drag.vy = boundedVelocity((event.clientY - drag.lastY) / dt) * 0.6 + drag.vy * 0.4;
      drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastTime = timestamp;
      drag.moved = true;
      suppressClick.current = true;
      event.preventDefault?.();
      write({ x: drag.origin.x + dx, y: drag.origin.y + dy });
      publish({ dragging: true, pose: 'hang', facing: dx < 0 ? -1 : 1 });
    }

    function pointerUp(event) {
      if (state.drag?.id !== event.pointerId) return;
      const drag = releaseCapture();
      if (!drag?.moved) { finish(); return; }
      suppressClick.current = true;
      if (canTravel()) {
        state.scene = 'fall'; state.source = 'user';
        try { options.current.onScene?.({ kind: 'fall', source: 'user' }); } catch { /* Optional dialogue. */ }
        // A pause before letting go removes stale throw velocity.
        const fresh = now() - drag.lastTime < 120;
        fall(fresh ? drag.vx * 0.65 : 0, fresh ? drag.vy * 0.45 : 0);
      } else { publish({ pose: null }); schedule(); }
    }

    function pointerCancel(event) {
      if (!state.drag || (event?.pointerId !== undefined && state.drag.id !== event.pointerId)) return;
      const moved = state.drag.moved;
      releaseCapture();
      suppressClick.current = moved;
      // Cancellation belongs to the browser/OS; do not interpret it as an intentional throw.
      cancel({ home: moved });
    }

    function updateGeometry() {
      if (!state.alive) return;
      const suspended = isSuspended();
      publish({ suspended });
      if (suspended) { cancel({ reschedule: false }); return; }
      measure();
      if (state.drag) { write(state.position); return; }
      if (state.anchor) {
        const rect = readHeadingAnchorRect(state.anchor, doc);
        const position = rect && headingAnchorPosition(rect, state.bounds);
        if (position && isStagePositionClear(position, state.bounds, state.obstacles)) { write(position); return; }
        cancel({ home: true });
      } else if (state.moving) cancel({ home: true });
      else {
        const position = clampStagePosition(state.position, state.bounds);
        write(isStagePositionClear(position, state.bounds, state.obstacles) ? position : state.home);
        schedule();
      }
    }

    function sync() {
      const previous = state.lastOptions;
      const current = options.current;
      state.lastOptions = { ...current };
      const shouldStop = current.page !== previous.page || current.reducedMotion !== previous.reducedMotion
        || current.lowPower !== previous.lowPower || current.discreet !== previous.discreet
        || (!previous.paused && current.paused) || (!previous.autonomous && current.autonomous);
      if (shouldStop && !state.drag) cancel({ home: true, reschedule: false });
      publish({ suspended: isSuspended() });
      if (isSuspended()) { cancel({ reschedule: false }); return; }
      measure();
      write(state.position || state.home);
      if (!current.autonomous) clock.clear('auto');
      schedule();
    }

    const onGeometry = () => {
      if (doc.hidden) return;
      clock.timeout('viewport', updateGeometry, 45);
    };
    const onEnvironment = () => {
      if (isSuspended()) { publish({ suspended: true }); cancel({ reschedule: false }); }
      else { publish({ suspended: false }); updateGeometry(); }
    };
    const onFocusOut = () => clock.timeout('environment', onEnvironment, 0);
    const onPointerNear = event => {
      if (event.pointerType === 'touch' || !canAuto() || options.current.paused || state.ui.pose) return;
      const centerX = state.position.x + state.bounds.width / 2;
      const centerY = state.position.y + state.bounds.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      if (distance < 170 && distance > state.bounds.width * 0.45) {
        // Head tracking is handled by useCompanionGaze. This is a bounded, occasional glance.
        if (now() - (state.lastGlance || 0) < 9000) return;
        state.lastGlance = now();
        publish({ facing: event.clientX < centerX ? -1 : 1 });
      }
    };

    measure();
    write(state.home);
    publish({ suspended: isSuspended(), pose: null, dragging: false, moving: false });
    controller.current = {
      play: action => play(action), cancel: () => cancel({ home: true }),
      place: side => {
        state.side = side === 'left' ? 'left' : 'right';
        cancel({ reschedule: false }); measure(); write(state.home); schedule();
      },
      pointerDown, pointerMove, pointerUp, pointerCancel, sync,
    };
    doc.addEventListener('visibilitychange', onEnvironment);
    doc.addEventListener('fullscreenchange', onEnvironment);
    doc.addEventListener('focusin', onEnvironment);
    doc.addEventListener('focusout', onFocusOut);
    doc.addEventListener('scroll', onGeometry, { passive: true, capture: true });
    win.addEventListener('resize', onGeometry, { passive: true });
    win.addEventListener('pointermove', onPointerNear, { passive: true });
    win.visualViewport?.addEventListener('resize', onGeometry, { passive: true });
    win.visualViewport?.addEventListener('scroll', onGeometry, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(onGeometry) : null;
    resizeObserver?.observe(shell);
    schedule();

    return () => {
      state.alive = false;
      releaseCapture();
      clock.dispose();
      resizeObserver?.disconnect();
      doc.removeEventListener('visibilitychange', onEnvironment);
      doc.removeEventListener('fullscreenchange', onEnvironment);
      doc.removeEventListener('focusin', onEnvironment);
      doc.removeEventListener('focusout', onFocusOut);
      doc.removeEventListener('scroll', onGeometry, true);
      win.removeEventListener('resize', onGeometry);
      win.removeEventListener('pointermove', onPointerNear);
      win.visualViewport?.removeEventListener('resize', onGeometry);
      win.visualViewport?.removeEventListener('scroll', onGeometry);
      controller.current = null;
    };
  }, [shellRef, enabled]);

  useEffect(() => { controller.current?.sync(); }, [enabled, visible, reducedMotion, lowPower, discreet, paused, autonomous, batterySaver, page, personality, size]);

  const play = useCallback(action => controller.current?.play(action) || false, []);
  const cancel = useCallback(() => controller.current?.cancel(), []);
  const place = useCallback(side => controller.current?.place(side), []);
  const onPointerDown = useCallback(event => controller.current?.pointerDown(event), []);
  const onPointerMove = useCallback(event => controller.current?.pointerMove(event), []);
  const onPointerUp = useCallback(event => controller.current?.pointerUp(event), []);
  const onPointerCancel = useCallback(event => controller.current?.pointerCancel(event), []);
  const consumeClick = useCallback(() => {
    const consumed = suppressClick.current;
    suppressClick.current = false;
    return consumed;
  }, []);
  const style = useMemo(() => ({
    position: 'fixed', left: 0, top: 0, bottom: 'auto', right: 'auto',
    transform: 'translate3d(var(--companion-stage-x, calc(100vw - 136px)), var(--companion-stage-y, calc(100dvh - 220px)), 0)',
    transition: 'none', touchAction: 'none',
    willChange: ui.moving || ui.dragging ? 'transform' : 'auto',
    visibility: ui.suspended ? 'hidden' : undefined,
  }), [ui.moving, ui.dragging, ui.suspended]);

  return { ...ui, style, play, cancel, place, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, consumeClick };
}
