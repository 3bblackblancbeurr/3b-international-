export const ACTION_SECONDS = 15;
export const ATTACKS_PER_HALF = 3;
export const FLOW_MAX = 100;
export const ENERGY_MAX = 100;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round3 = (value) => Math.round(value * 1000) / 1000;

export function magnitude(x = 0, y = 0) {
  return Math.hypot(Number(x) || 0, Number(y) || 0);
}

export function normalizeVector(x = 0, y = 0) {
  const length = magnitude(x, y);
  if (!length) return { x: 0, y: 0, length: 0 };
  return { x: x / length, y: y / length, length };
}

export function interpretAttackGesture(sample = {}) {
  const dx = Number(sample.dx) || 0;
  const dy = Number(sample.dy) || 0;
  const durationMs = clamp(Number(sample.durationMs) || 0, 1, 4000);
  const heldMs = clamp(Number(sample.heldMs) || 0, 0, 4000);
  const distance = magnitude(dx, dy);
  const speed = distance / durationMs;
  const curve = clamp(Number(sample.curve) || 0, -1, 1);
  const taps = clamp(Number(sample.taps) || 0, 0, 4);

  if (taps >= 2 && durationMs <= 460) {
    return { type: 'accelerate', intensity: clamp(0.62 + speed * 0.55, 0.62, 1) };
  }

  if (heldMs >= 320) {
    const shot = shotFromGesture({ dx, dy, durationMs, heldMs, curve });
    return { type: shot.type, shot };
  }

  if (distance <= 34 && durationMs <= 430) {
    return {
      type: 'feint',
      direction: normalizeVector(dx, dy),
      intensity: clamp(0.35 + speed, 0.35, 1),
    };
  }

  if (speed >= 0.72) {
    return {
      type: 'cut',
      direction: normalizeVector(dx, dy),
      intensity: clamp(speed, 0.5, 1),
    };
  }

  return {
    type: 'rhythm',
    direction: normalizeVector(dx, dy),
    intensity: clamp(distance / 90, 0.15, 0.8),
  };
}

export function shotFromGesture(sample = {}) {
  const dx = Number(sample.dx) || 0;
  const dy = Number(sample.dy) || 0;
  const distance = magnitude(dx, dy);
  const heldMs = clamp(Number(sample.heldMs) || 0, 0, 1800);
  const curve = clamp(Number(sample.curve) || 0, -1, 1);
  const directional = normalizeVector(dx, dy);
  const charge = clamp(heldMs / 950, 0.1, 1);
  const travel = clamp(distance / 160, 0.1, 1);
  const power = clamp(charge * 0.84 + travel * 0.16, 0.1, 1);
  const targetX = distance < 12 ? 0 : clamp(dx / 125, -1, 1);
  const targetY = distance < 12 ? 0.38 : clamp(-dy / 135, 0.06, 1);
  const upwardShort = dy < -10 && distance <= 62 && heldMs <= 420;
  const type = upwardShort ? 'panenka' : Math.abs(curve) >= 0.22 ? 'curved-shot' : 'shot';
  const precision = clamp(1 - Math.max(0, power - 0.72) * 0.72 - Math.abs(curve) * 0.08, 0.58, 1);

  return {
    type,
    power: round3(type === 'panenka' ? power * 0.72 : power),
    precision: round3(type === 'panenka' ? Math.min(1, precision + 0.05) : precision),
    curve: round3(curve),
    targetX: round3(targetX),
    targetY: round3(type === 'panenka' ? clamp(targetY * 0.78 + 0.1, 0.16, 0.72) : targetY),
    direction: directional,
  };
}

export function interpretKeeperGesture(sample = {}) {
  const dx = Number(sample.dx) || 0;
  const dy = Number(sample.dy) || 0;
  const durationMs = clamp(Number(sample.durationMs) || 0, 1, 3000);
  const distance = magnitude(dx, dy);
  const speed = distance / durationMs;

  if (distance < 18) {
    return { type: 'hold', direction: 0, intensity: 0 };
  }
  if (Math.abs(dx) >= Math.abs(dy) * 1.1) {
    return {
      type: 'dive',
      direction: dx < 0 ? -1 : 1,
      intensity: clamp(0.42 + speed * 0.7, 0.42, 1),
    };
  }
  if (dy < 0) {
    return {
      type: 'high-claim',
      direction: clamp(dx / Math.max(45, Math.abs(dy)), -1, 1),
      intensity: clamp(0.4 + speed * 0.6, 0.4, 1),
    };
  }
  return {
    type: 'close-angle',
    direction: clamp(dx / Math.max(55, Math.abs(dy)), -1, 1),
    intensity: clamp(0.35 + speed * 0.55, 0.35, 1),
  };
}

export function ballTouchDistance(speed = 0, control = 1) {
  const normalizedSpeed = clamp(speed, 0, 1);
  const normalizedControl = clamp(control, 0.8, 1.2);
  return round3(clamp(0.18 + normalizedSpeed * 0.46 - (normalizedControl - 1) * 0.38, 0.12, 0.68));
}

const ACTION_COSTS = {
  accelerate: 12,
  cut: 7,
  feint: 8,
  rhythm: 2,
  shot: 7,
  'curved-shot': 9,
  panenka: 8,
};

export function energyAfterAction(current = ENERGY_MAX, actionType = 'rhythm') {
  const cost = ACTION_COSTS[actionType] ?? 3;
  return clamp(Math.round((current - cost) * 10) / 10, 0, ENERGY_MAX);
}

export function recoverEnergy(current = 0, dtSeconds = 0, movingFast = false) {
  const rate = movingFast ? 1.4 : 5.5;
  return clamp(Math.round((current + clamp(dtSeconds, 0, 5) * rate) * 10) / 10, 0, ENERGY_MAX);
}

export function flowAfterAction(current = 0, actionType, previousAction, success = true) {
  let delta = success ? 8 : -12;
  if (actionType === previousAction) delta -= success ? 10 : 4;
  if (['feint', 'cut', 'rhythm', 'accelerate'].includes(actionType) && actionType !== previousAction && success) delta += 4;
  if (['shot', 'curved-shot', 'panenka'].includes(actionType)) delta += success ? 5 : -3;
  return clamp(Math.round((current + delta) * 10) / 10, 0, FLOW_MAX);
}

export function keeperPowerState(powerId, keeperEnergy = 100, now = Date.now()) {
  const definitions = {
    impulse: { cost: 50, durationMs: 850, mobility: 1, reach: 1, disruption: 0.18 },
    read: { cost: 45, durationMs: 1100, mobility: 1, reach: 1, read: 0.62 },
    phantom: { cost: 60, durationMs: 1250, mobility: 0.9, reach: 1.08, phantom: 0.12 },
    anchor: { cost: 55, durationMs: 1500, mobility: 0.65, reach: 1.18 },
  };
  const def = definitions[powerId];
  if (!def || keeperEnergy < def.cost) return { ok: false, energy: keeperEnergy, effect: null };
  return {
    ok: true,
    energy: keeperEnergy - def.cost,
    effect: { id: powerId, until: now + def.durationMs, ...def },
  };
}

export function resolveShot({ shot, keeperX = 0, keeperDepth = 0, keeperGesture, keeperEffect, attackerFlow = 0 }) {
  if (!shot) return { goal: false, saved: true, reason: 'invalid-shot', quality: 0 };
  const gesture = keeperGesture || { type: 'hold', direction: 0, intensity: 0 };
  const flowBonus = clamp(attackerFlow / 100, 0, 1) * 0.055;
  const precision = clamp(shot.precision + flowBonus, 0.55, 1);
  const curveOffset = shot.curve * 0.16;
  const disruption = keeperEffect?.id === 'impulse'
    ? Math.sign(shot.targetX || 1) * Number(keeperEffect.disruption || 0)
    : 0;
  const target = clamp(shot.targetX + curveOffset * precision + disruption, -1, 1);
  const shotHeight = clamp(shot.targetY, 0, 1);

  let center = clamp(keeperX, -1, 1);
  const depth = clamp(keeperDepth, 0, 1);
  let reach = 0.28 + depth * 0.045;
  let heightReach = 0.62 + depth * 0.025;

  if (gesture.type === 'dive') {
    center = clamp(center + gesture.direction * (0.38 + gesture.intensity * 0.28), -1, 1);
    reach = 0.3 + gesture.intensity * 0.19;
    heightReach = 0.82;
  } else if (gesture.type === 'high-claim') {
    center = clamp(center + gesture.direction * 0.23, -1, 1);
    reach = 0.34 + depth * 0.055;
    heightReach = Math.min(1, 0.98 + depth * 0.02);
  } else if (gesture.type === 'close-angle') {
    center = clamp(center + gesture.direction * 0.16, -1, 1);
    reach = 0.39 + depth * 0.12;
    heightReach = 0.76 + depth * 0.035;
  }

  if (keeperEffect?.reach) reach *= keeperEffect.reach;
  if (keeperEffect?.phantom) reach += keeperEffect.phantom * 0.38;
  const horizontalGap = Math.abs(target - center);
  const verticalFactor = shotHeight <= heightReach ? 1 : clamp(1 - (shotHeight - heightReach) * 2.2, 0.42, 1);
  const powerEscape = clamp((shot.power - 0.68) * 0.18, 0, 0.06);
  const saveThreshold = reach * verticalFactor - powerEscape;
  const saved = horizontalGap <= saveThreshold;
  const frame = Math.abs(target) > 0.985 && shot.power > 0.45;
  const goal = !saved && !frame;

  return {
    goal,
    saved,
    frame,
    target: round3(target),
    keeperCenter: round3(center),
    saveThreshold: round3(saveThreshold),
    quality: round3(clamp(shot.power * 0.48 + precision * 0.52, 0, 1)),
    reason: goal ? 'goal' : frame ? 'frame' : 'save',
  };
}

export function createPenaltyMatch(players, now = Date.now()) {
  if (!Array.isArray(players) || players.length !== 2) throw new Error('3B Penalty Rush nécessite exactement deux joueurs.');
  const safePlayers = players.map((player, index) => ({
    id: String(player?.id || index),
    name: String(player?.name || `Joueur ${index + 1}`).slice(0, 24),
  }));
  return {
    version: 1,
    status: 'playing',
    phase: 'first-half',
    players: safePlayers,
    attacker: 0,
    keeper: 1,
    score: [0, 0],
    attacks: [0, 0],
    possession: 1,
    possessionStartedAt: now,
    possessionDeadline: now + ACTION_SECONDS * 1000,
    flow: [0, 0],
    energy: [ENERGY_MAX, ENERGY_MAX],
    goldenPair: 0,
    goldenPending: [],
    history: [],
    winner: null,
  };
}

export function remainingPossessionSeconds(match, now = Date.now()) {
  return Math.max(0, Math.ceil((Number(match?.possessionDeadline) - now) / 1000));
}

function switchToSecondHalf(next, now) {
  next.phase = 'second-half';
  next.attacker = 1;
  next.keeper = 0;
  next.possession = 1;
  next.possessionStartedAt = now;
  next.possessionDeadline = now + ACTION_SECONDS * 1000;
}

function beginGolden(next, now) {
  next.phase = 'golden-duel';
  next.attacker = 0;
  next.keeper = 1;
  next.possession = 1;
  next.goldenPair = 1;
  next.goldenPending = [];
  next.possessionStartedAt = now;
  next.possessionDeadline = now + ACTION_SECONDS * 1000;
}

function finishMatch(next) {
  next.status = 'finished';
  next.phase = 'finished';
  next.possessionDeadline = null;
  next.winner = next.score[0] === next.score[1] ? null : next.score[0] > next.score[1] ? 0 : 1;
}

export function settlePossession(match, outcome, now = Date.now()) {
  if (!match || match.status !== 'playing') return match;
  const next = structuredClone(match);
  const attacker = next.attacker;
  const goal = outcome === 'goal';
  if (goal) next.score[attacker] += 1;
  next.attacks[attacker] += 1;
  next.history.push({
    phase: next.phase,
    attacker,
    outcome: goal ? 'goal' : outcome === 'timeout' ? 'timeout' : 'save',
    at: now,
    score: [...next.score],
  });
  if (next.history.length > 40) next.history = next.history.slice(-40);

  if (next.phase === 'first-half') {
    if (next.attacks[0] >= ATTACKS_PER_HALF) {
      switchToSecondHalf(next, now);
      return next;
    }
    next.possession += 1;
  } else if (next.phase === 'second-half') {
    if (next.attacks[1] >= ATTACKS_PER_HALF) {
      if (next.score[0] === next.score[1]) {
        beginGolden(next, now);
        return next;
      }
      finishMatch(next);
      return next;
    }
    next.possession += 1;
  } else if (next.phase === 'golden-duel') {
    next.goldenPending.push({ attacker, goal });
    if (next.goldenPending.length === 1) {
      next.attacker = 1;
      next.keeper = 0;
      next.possession += 1;
    } else {
      const [first, second] = next.goldenPending;
      if (first.goal !== second.goal) {
        finishMatch(next);
        return next;
      }
      next.goldenPair += 1;
      next.goldenPending = [];
      next.attacker = 0;
      next.keeper = 1;
      next.possession += 1;
    }
  }

  next.possessionStartedAt = now;
  next.possessionDeadline = now + ACTION_SECONDS * 1000;
  return next;
}

export function expirePossession(match, now = Date.now()) {
  if (!match || match.status !== 'playing') return match;
  if (now < Number(match.possessionDeadline || Infinity)) return match;
  return settlePossession(match, 'timeout', now);
}

export function careerReputationDelta({ won = false, goalRate = 0, saveRate = 0, flow = 0, ranked = false, international = false }) {
  const performance = clamp(goalRate, 0, 1) * 8 + clamp(saveRate, 0, 1) * 8 + clamp(flow, 0, 100) / 18;
  const result = won ? 12 : 4;
  const context = (ranked ? 4 : 0) + (international ? 10 : 0);
  return Math.max(1, Math.round(performance + result + context));
}

export function scoutingBand({ nationalRank, matches = 0, reputation = 0, pressureScore = 0 }) {
  if (matches < 10) return 'non-classe';
  if (nationalRank <= 12 && reputation >= 700) return pressureScore >= 0.65 ? 'selection' : 'preselection';
  if (nationalRank <= 30 && reputation >= 420) return 'observe';
  if (nationalRank <= 75) return 'radar';
  return 'club';
}
