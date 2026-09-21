export const TRACK_LENGTH = 64;
export const HOME_LENGTH = 6;
export const PIECES_PER_PLAYER = 4;
export const STABLE = -1;
export const FINISH_STEP = TRACK_LENGTH + HOME_LENGTH;
export const MATCH_VERSION = 2;

export const AI_LEVELS = ['normal', 'tactique', 'gardien'];

export const DEFAULT_RULES = Object.freeze({
  piecesPerPlayer: 4,
  safeCells: true,
  barricades: true,
  captureRequired: false,
  bonusOnCapture: false,
  tripleSixPenalty: true,
  timerSeconds: 30,
  maxDurationMinutes: 0,
  aiLevel: 'tactique',
});

export const COUNTRIES_3B = [
  { id: 'fr', code: 'FR', name: 'France', flag: '🇫🇷', guardian: 'Céliane', value: 'Justice', accent: '#2f80ed', secondary: '#f3f7ff', start: 0, shape: 'shield', crest: 'J' },
  { id: 'dz', code: 'DZ', name: 'Algérie', flag: '🇩🇿', guardian: 'Yliane', value: 'Loyauté', accent: '#1f9d62', secondary: '#f5fff9', start: 8, shape: 'diamond', crest: 'L' },
  { id: 'es', code: 'ES', name: 'Espagne', flag: '🇪🇸', guardian: 'Diego', value: 'Passion', accent: '#e4ad24', secondary: '#fff7dc', start: 16, shape: 'sun', crest: 'P' },
  { id: 'ma', code: 'MA', name: 'Maroc', flag: '🇲🇦', guardian: 'Naël', value: 'Noblesse', accent: '#a72a47', secondary: '#fff1f5', start: 24, shape: 'hex', crest: 'N' },
  { id: 'it', code: 'IT', name: 'Italie', flag: '🇮🇹', guardian: 'Alessio', value: 'Espoir', accent: '#37a66c', secondary: '#f3fff8', start: 32, shape: 'arch', crest: 'E' },
  { id: 'tn', code: 'TN', name: 'Tunisie', flag: '🇹🇳', guardian: 'Soraya', value: 'Courage', accent: '#ef5c62', secondary: '#fff4f5', start: 40, shape: 'round', crest: 'C' },
  { id: 'tr', code: 'TR', name: 'Turquie', flag: '🇹🇷', guardian: 'Émir', value: 'Foi', accent: '#d52b3f', secondary: '#fff2f4', start: 48, shape: 'star', crest: 'F' },
  { id: 'ee', code: 'EE', name: 'Estonie', flag: '🇪🇪', guardian: 'Eira', value: 'Sagesse', accent: '#45a8ff', secondary: '#eff8ff', start: 56, shape: 'rune', crest: 'S' },
];

export const SANCTUARY_CELLS = Object.freeze(COUNTRIES_3B.map((country) => country.start));

const countryMap = new Map(COUNTRIES_3B.map((country) => [country.id, country]));
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const clampInt = (value, min, max, fallback) => Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function countryFor(countryId) {
  return countryMap.get(countryId) || null;
}

export function normalizeRules(input = {}) {
  const value = plain(input) ? input : {};
  return {
    piecesPerPlayer: clampInt(value.piecesPerPlayer, 2, 4, DEFAULT_RULES.piecesPerPlayer),
    safeCells: value.safeCells !== false,
    barricades: value.barricades !== false,
    captureRequired: value.captureRequired === true,
    bonusOnCapture: value.bonusOnCapture === true,
    tripleSixPenalty: value.tripleSixPenalty !== false,
    timerSeconds: [0, 20, 30, 45].includes(value.timerSeconds) ? value.timerSeconds : DEFAULT_RULES.timerSeconds,
    maxDurationMinutes: [0, 10, 20, 30, 45, 60].includes(value.maxDurationMinutes) ? value.maxDurationMinutes : DEFAULT_RULES.maxDurationMinutes,
    aiLevel: AI_LEVELS.includes(value.aiLevel) ? value.aiLevel : DEFAULT_RULES.aiLevel,
  };
}

function freshStats() {
  return {
    captures: 0,
    timesCaptured: 0,
    finished: 0,
    rolls: 0,
    sixes: 0,
    distance: 0,
    safeLandings: 0,
    barricadesFormed: 0,
    turnsTimedOut: 0,
    tripleSixPenalties: 0,
    maxSixStreak: 0,
  };
}

function appendEvent(match, event) {
  match.sequence = (match.sequence || 0) + 1;
  match.lastEvent = { id: match.sequence, ...event };
  match.history = [...(match.history || []), match.lastEvent].slice(-80);
}

function advanceTurn(match) {
  const previous = match.turn;
  match.turn = (match.turn + 1) % match.players.length;
  if (match.turn <= previous) match.round += 1;
  match.turnSixes = 0;
  match.pendingRoll = null;
  match.pendingMoves = [];
}

export function createMatch(seats, ruleInput = {}) {
  if (!Array.isArray(seats)) throw new Error('Configuration de partie invalide.');
  const rules = normalizeRules(ruleInput);
  const active = seats
    .filter((seat) => seat && seat.active !== false)
    .map((seat) => ({
      countryId: seat.countryId,
      type: seat.type === 'bot' ? 'bot' : 'human',
      aiLevel: AI_LEVELS.includes(seat.aiLevel) ? seat.aiLevel : rules.aiLevel,
      name: String(seat.name || countryFor(seat.countryId)?.name || 'Joueur').slice(0, 24),
    }));

  if (active.length < 2 || active.length > 8) throw new Error('Une partie demande de 2 à 8 joueurs.');
  if (new Set(active.map((seat) => seat.countryId)).size !== active.length) throw new Error('Chaque pays ne peut être choisi qu’une fois.');
  if (active.some((seat) => !countryFor(seat.countryId))) throw new Error('Un pays de la partie est invalide.');

  const match = {
    version: MATCH_VERSION,
    status: 'playing',
    winner: null,
    turn: 0,
    round: 1,
    turnSixes: 0,
    pendingRoll: null,
    pendingMoves: [],
    rules,
    createdAt: Date.now(),
    endedAt: null,
    endedReason: null,
    sequence: 0,
    history: [],
    players: active.map((seat) => ({
      ...seat,
      pieces: Array.from({ length: rules.piecesPerPlayer }, (_, index) => ({ id: index, steps: STABLE })),
      stats: freshStats(),
    })),
    lastEvent: null,
  };
  appendEvent(match, { type: 'start', text: 'Le Cercle des 8 Portes est ouvert.' });
  return match;
}

export function secureRoll() {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const bucket = new Uint32Array(1);
    const max = 0xffffffff - (0xffffffff % 6);
    do cryptoObject.getRandomValues(bucket); while (bucket[0] >= max);
    return (bucket[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export function currentPlayer(match) {
  return match?.players?.[match.turn] || null;
}

export function globalCellFor(countryId, steps) {
  const country = countryFor(countryId);
  if (!country || !Number.isInteger(steps) || steps < 0 || steps >= TRACK_LENGTH) return null;
  return (country.start + steps) % TRACK_LENGTH;
}

export function homeIndexFor(steps) {
  if (!Number.isInteger(steps) || steps < TRACK_LENGTH || steps >= FINISH_STEP) return null;
  return steps - TRACK_LENGTH;
}

export function isSanctuaryCell(match, cell) {
  return Boolean(match?.rules?.safeCells && SANCTUARY_CELLS.includes(cell));
}

export function occupantsAt(match, cell, exclude = null) {
  const occupants = [];
  match?.players?.forEach((player, playerIndex) => {
    player.pieces.forEach((piece, pieceIndex) => {
      if (exclude && exclude.playerIndex === playerIndex && exclude.pieceIndex === pieceIndex) return;
      if (globalCellFor(player.countryId, piece.steps) === cell) occupants.push({ playerIndex, pieceIndex, piece });
    });
  });
  return occupants;
}

export function blockadeOwnerAt(match, cell, exclude = null) {
  if (!match?.rules?.barricades) return null;
  const counts = new Map();
  for (const occupant of occupantsAt(match, cell, exclude)) {
    counts.set(occupant.playerIndex, (counts.get(occupant.playerIndex) || 0) + 1);
  }
  for (const [playerIndex, count] of counts) if (count >= 2) return playerIndex;
  return null;
}

function trackCellsBetween(countryId, fromSteps, toSteps) {
  const cells = [];
  const start = fromSteps === STABLE ? 0 : fromSteps + 1;
  const end = Math.min(toSteps, TRACK_LENGTH - 1);
  for (let step = start; step <= end; step += 1) {
    const cell = globalCellFor(countryId, step);
    if (cell !== null) cells.push(cell);
  }
  return cells;
}

function baseMoveInfo(match, playerIndex, pieceIndex, roll) {
  const player = match?.players?.[playerIndex];
  const piece = player?.pieces?.[pieceIndex];
  if (!player || !piece || !Number.isInteger(roll) || roll < 1 || roll > 6) return null;

  if (piece.steps === STABLE) {
    if (roll !== 6) return null;
  } else if (piece.steps < 0 || piece.steps >= FINISH_STEP || piece.steps + roll > FINISH_STEP) {
    return null;
  }

  const nextSteps = piece.steps === STABLE ? 0 : piece.steps + roll;
  const path = trackCellsBetween(player.countryId, piece.steps, nextSteps);
  const landing = nextSteps < TRACK_LENGTH ? globalCellFor(player.countryId, nextSteps) : null;
  const exclude = { playerIndex, pieceIndex };

  for (const cell of path) {
    const owner = blockadeOwnerAt(match, cell, exclude);
    if (owner !== null && !(landing === cell && owner === playerIndex && occupantsAt(match, cell, exclude).length < 2)) return null;
  }

  let captures = [];
  let formsBarricade = false;
  let sanctuary = false;

  if (landing !== null) {
    sanctuary = isSanctuaryCell(match, landing);
    const occupants = occupantsAt(match, landing, exclude);
    const own = occupants.filter((entry) => entry.playerIndex === playerIndex);
    const opponents = occupants.filter((entry) => entry.playerIndex !== playerIndex);

    if (match.rules.barricades && own.length >= 2) return null;
    if (sanctuary && opponents.length) return null;

    if (match.rules.barricades) {
      const opponentCounts = new Map();
      for (const entry of opponents) opponentCounts.set(entry.playerIndex, (opponentCounts.get(entry.playerIndex) || 0) + 1);
      if ([...opponentCounts.values()].some((count) => count >= 2)) return null;
    }

    captures = opponents.map((entry) => ({
      playerIndex: entry.playerIndex,
      countryId: match.players[entry.playerIndex].countryId,
      pieceIndex: entry.pieceIndex,
      from: entry.piece.steps,
    }));
    formsBarricade = match.rules.barricades && own.length === 1;
  }

  return {
    playerIndex,
    pieceIndex,
    from: piece.steps,
    to: nextSteps,
    landing,
    path,
    captures,
    exitsStable: piece.steps === STABLE,
    entersHome: piece.steps < TRACK_LENGTH && nextSteps >= TRACK_LENGTH,
    finishes: nextSteps === FINISH_STEP,
    sanctuary,
    formsBarricade,
  };
}

function baseLegalMoves(match, roll, playerIndex = match?.turn ?? 0) {
  if (!match || match.status !== 'playing' || !Number.isInteger(roll) || roll < 1 || roll > 6) return [];
  const player = match.players[playerIndex];
  if (!player) return [];
  const legal = [];
  player.pieces.forEach((_, pieceIndex) => {
    if (baseMoveInfo(match, playerIndex, pieceIndex, roll)) legal.push(pieceIndex);
  });
  return legal;
}

export function legalMoves(match, roll = match?.pendingRoll, playerIndex = match?.turn ?? 0) {
  const legal = baseLegalMoves(match, roll, playerIndex);
  if (!match?.rules?.captureRequired || !legal.length) return legal;
  const capturing = legal.filter((pieceIndex) => (baseMoveInfo(match, playerIndex, pieceIndex, roll)?.captures.length || 0) > 0);
  return capturing.length ? capturing : legal;
}

export function previewMove(match, pieceIndex, roll = match?.pendingRoll, playerIndex = match?.turn ?? 0) {
  if (!legalMoves(match, roll, playerIndex).includes(pieceIndex)) return null;
  return baseMoveInfo(match, playerIndex, pieceIndex, roll);
}

export function rollTurn(match, forcedRoll = secureRoll(), options = {}) {
  if (!match || match.status !== 'playing') throw new Error('La partie est terminée.');
  if (match.pendingRoll !== null) throw new Error('Un déplacement doit être résolu avant un nouveau lancer.');
  if (!Number.isInteger(forcedRoll) || forcedRoll < 1 || forcedRoll > 6) throw new Error('Le dé doit être compris entre 1 et 6.');

  const next = structuredClone(match);
  const player = next.players[next.turn];
  player.stats.rolls += 1;
  if (options.timedOut) player.stats.turnsTimedOut += 1;

  if (forcedRoll === 6) {
    player.stats.sixes += 1;
    next.turnSixes += 1;
    player.stats.maxSixStreak = Math.max(player.stats.maxSixStreak, next.turnSixes);
  } else {
    next.turnSixes = 0;
  }

  if (forcedRoll === 6 && next.rules.tripleSixPenalty && next.turnSixes >= 3) {
    player.stats.tripleSixPenalties += 1;
    appendEvent(next, {
      type: 'triple-six',
      countryId: player.countryId,
      roll: forcedRoll,
      text: `${countryFor(player.countryId).name} enchaîne trois 6 · surcharge Matrix, le tour passe.`,
    });
    advanceTurn(next);
    return { match: next, roll: forcedRoll, legal: [], penalty: true, autoPass: true };
  }

  const moves = legalMoves(next, forcedRoll);
  if (!moves.length) {
    appendEvent(next, {
      type: 'blocked',
      countryId: player.countryId,
      roll: forcedRoll,
      text: forcedRoll === 6
        ? `${countryFor(player.countryId).name} obtient 6 mais aucun mouvement n’est possible · relance conservée.`
        : `${countryFor(player.countryId).name} ne peut déplacer aucun totem.`,
    });
    if (forcedRoll !== 6) advanceTurn(next);
    return { match: next, roll: forcedRoll, legal: [], penalty: false, autoPass: true };
  }

  next.pendingRoll = forcedRoll;
  next.pendingMoves = moves;
  appendEvent(next, {
    type: 'roll',
    countryId: player.countryId,
    roll: forcedRoll,
    text: `${countryFor(player.countryId).name} obtient ${forcedRoll}.`,
  });
  return { match: next, roll: forcedRoll, legal: moves, penalty: false, autoPass: false };
}

function applyMove(match, pieceIndex) {
  if (!match || match.status !== 'playing') throw new Error('La partie est terminée.');
  const roll = match.pendingRoll;
  if (!Number.isInteger(roll)) throw new Error('Lance le dé avant de déplacer un totem.');
  const info = previewMove(match, pieceIndex, roll);
  if (!info) throw new Error('Ce totem ne peut pas avancer avec ce dé.');

  const next = structuredClone(match);
  const playerIndex = next.turn;
  const player = next.players[playerIndex];
  const country = countryFor(player.countryId);
  const piece = player.pieces[pieceIndex];
  const before = piece.steps;
  piece.steps = info.to;
  player.stats.distance += before === STABLE ? 1 : Math.max(0, info.to - before);

  for (const captured of info.captures) {
    const target = next.players[captured.playerIndex].pieces[captured.pieceIndex];
    target.steps = STABLE;
    next.players[captured.playerIndex].stats.timesCaptured += 1;
  }
  if (info.captures.length) player.stats.captures += info.captures.length;
  if (info.finishes && before !== FINISH_STEP) player.stats.finished += 1;
  if (info.sanctuary) player.stats.safeLandings += 1;
  if (info.formsBarricade) player.stats.barricadesFormed += 1;

  const won = player.pieces.every((candidate) => candidate.steps === FINISH_STEP);
  const event = {
    type: info.captures.length ? 'capture' : info.finishes ? 'finish' : info.exitsStable ? 'exit' : info.formsBarricade ? 'barricade' : 'move',
    countryId: player.countryId,
    pieceIndex,
    roll,
    from: before,
    to: info.to,
    landing: info.landing,
    captured: info.captures,
    sanctuary: info.sanctuary,
    formsBarricade: info.formsBarricade,
    text: info.captures.length
      ? `${country.name} déclenche Fracture Matrix · ${info.captures.length} totem${info.captures.length > 1 ? 's' : ''} renvoyé${info.captures.length > 1 ? 's' : ''} à l’écurie.`
      : info.finishes
        ? `${country.name} transforme un totem en fragment lumineux dans le Nexus.`
        : info.exitsStable
          ? `${country.name} ouvre sa Porte et libère un totem.`
          : info.formsBarricade
            ? `${country.name} forme un Bouclier 3B.`
            : info.sanctuary
              ? `${country.name} atteint un Sanctuaire 3B.`
              : `${country.name} avance de ${roll} case${roll > 1 ? 's' : ''}.`,
  };

  next.pendingRoll = null;
  next.pendingMoves = [];

  if (won) {
    next.status = 'finished';
    next.winner = player.countryId;
    next.endedAt = Date.now();
    next.endedReason = 'nexus';
    event.type = 'victory';
    event.text = `${country.name} rassemble tous ses totems · Nexus 3B complété.`;
  } else {
    const keepTurn = roll === 6 || (info.captures.length > 0 && next.rules.bonusOnCapture);
    if (!keepTurn) advanceTurn(next);
    else if (roll !== 6) next.turnSixes = 0;
  }

  appendEvent(next, event);
  return { match: next, event, move: info };
}

export function movePiece(match, pieceIndex, roll) {
  if (Number.isInteger(roll) && match?.pendingRoll === null) {
    const rolled = rollTurn(match, roll);
    if (rolled.autoPass) return { match: rolled.match, event: rolled.match.lastEvent, move: null };
    return applyMove(rolled.match, pieceIndex);
  }
  return applyMove(match, pieceIndex);
}

export function passTurn(match, roll) {
  if (!match || match.status !== 'playing') return match;
  if (match.pendingRoll !== null) {
    const next = structuredClone(match);
    const player = next.players[next.turn];
    appendEvent(next, { type: 'pass', countryId: player.countryId, roll: next.pendingRoll, text: `${countryFor(player.countryId).name} passe son déplacement.` });
    advanceTurn(next);
    return next;
  }
  return rollTurn(match, roll).match;
}

function distanceToCell(countryId, steps, targetCell) {
  if (steps < 0 || steps >= TRACK_LENGTH) return null;
  const current = globalCellFor(countryId, steps);
  const distance = (targetCell - current + TRACK_LENGTH) % TRACK_LENGTH;
  if (distance < 1 || distance > 6) return null;
  if (steps + distance >= TRACK_LENGTH) return null;
  return distance;
}

export function threatCount(match, playerIndex, cell) {
  if (cell === null || isSanctuaryCell(match, cell)) return 0;
  let threats = 0;
  match.players.forEach((player, opponentIndex) => {
    if (opponentIndex === playerIndex) return;
    player.pieces.forEach((piece) => {
      if (distanceToCell(player.countryId, piece.steps, cell) !== null) threats += 1;
    });
  });
  return threats;
}

function moveScore(match, move, difficulty) {
  const playerIndex = move.playerIndex;
  let score = Math.max(0, move.to) * 2;
  if (move.exitsStable) score += difficulty === 'normal' ? 160 : 320;
  if (move.entersHome) score += difficulty === 'normal' ? 650 : 1200;
  if (move.finishes) score += difficulty === 'normal' ? 1800 : 3800;
  if (move.captures.length) score += (difficulty === 'normal' ? 1500 : 4200) + move.captures.length * 480;
  if (move.sanctuary) score += difficulty === 'normal' ? 120 : 650;
  if (move.formsBarricade) score += difficulty === 'gardien' ? 1450 : difficulty === 'tactique' ? 600 : 80;

  if (difficulty !== 'normal' && move.landing !== null) {
    const threats = threatCount(match, playerIndex, move.landing);
    score -= threats * (difficulty === 'gardien' ? 720 : 280);
  }

  if (difficulty === 'gardien') {
    const player = match.players[playerIndex];
    const stableCount = player.pieces.filter((piece) => piece.steps === STABLE).length;
    if (move.exitsStable && stableCount > 2) score += 420;
    if (move.to >= TRACK_LENGTH) score += 560;
    if (move.from > TRACK_LENGTH - 10 && move.to < TRACK_LENGTH) score += 220;
  }
  return score;
}

export function selectBotMove(match, roll = match?.pendingRoll, playerIndex = match?.turn ?? 0, difficulty) {
  const legal = legalMoves(match, roll, playerIndex);
  if (!legal.length) return null;
  const level = AI_LEVELS.includes(difficulty) ? difficulty : match.players[playerIndex]?.aiLevel || match.rules.aiLevel;
  let best = legal[0];
  let bestScore = -Infinity;
  legal.forEach((pieceIndex) => {
    const move = baseMoveInfo(match, playerIndex, pieceIndex, roll);
    const score = moveScore(match, move, level);
    if (score > bestScore || (score === bestScore && pieceIndex < best)) {
      bestScore = score;
      best = pieceIndex;
    }
  });
  return best;
}

export function resolveTimeout(match, forcedRoll = secureRoll()) {
  if (!match || match.status !== 'playing') return { match, event: null };
  let next = structuredClone(match);
  next.players[next.turn].stats.turnsTimedOut += 1;

  if (next.pendingRoll === null) {
    const rolled = rollTurn(next, forcedRoll);
    next = rolled.match;
    if (rolled.autoPass || next.pendingRoll === null) return { match: next, event: next.lastEvent };
  }

  const pieceIndex = selectBotMove(next, next.pendingRoll, next.turn, 'gardien');
  if (pieceIndex === null) {
    const passed = passTurn(next);
    return { match: passed, event: passed.lastEvent };
  }
  return applyMove(next, pieceIndex);
}

export function finishByTime(match) {
  if (!match || match.status !== 'playing') return match;
  const next = structuredClone(match);
  const ranked = next.players
    .map((player) => ({
      countryId: player.countryId,
      score: scoreFor(next, player.countryId),
      finished: player.stats.finished,
      captures: player.stats.captures,
      distance: player.stats.distance,
    }))
    .sort((a, b) => b.score - a.score || b.finished - a.finished || b.captures - a.captures || b.distance - a.distance || a.countryId.localeCompare(b.countryId));
  next.status = 'finished';
  next.winner = ranked[0]?.countryId || null;
  next.endedAt = Date.now();
  next.endedReason = 'time';
  next.pendingRoll = null;
  next.pendingMoves = [];
  appendEvent(next, {
    type: 'time-limit',
    countryId: next.winner,
    text: next.winner
      ? `Temps écoulé · ${countryFor(next.winner).name} prend l’avantage au classement de la partie.`
      : 'Temps écoulé · partie terminée.',
  });
  return next;
}

export function achievementsFor(match, countryId) {
  const player = match?.players?.find((candidate) => candidate.countryId === countryId);
  if (!player) return [];
  const achievements = [];
  if (player.stats.captures >= 1) achievements.push({ id: 'first-capture', title: 'Première capture', detail: 'Déclencher Fracture Matrix une première fois.' });
  if (player.pieces.every((piece) => piece.steps === FINISH_STEP)) achievements.push({ id: 'four-nexus', title: '4 au Nexus', detail: 'Réunir tous ses totems dans le Nexus.' });
  if (match.winner === countryId && player.stats.timesCaptured === 0) achievements.push({ id: 'untouchable', title: 'Aucun pion capturé', detail: 'Gagner sans retour forcé à l’écurie.' });
  if (match.winner === countryId && match.players.length === 8) achievements.push({ id: 'eight-nations', title: '8 nations', detail: 'Gagner une partie complète à huit pays.' });
  if (player.stats.barricadesFormed >= 2) achievements.push({ id: 'shield-master', title: 'Bouclier 3B', detail: 'Former deux barricades dans la même partie.' });
  return achievements;
}

export function scoreFor(match, countryId) {
  const player = match?.players?.find((candidate) => candidate.countryId === countryId);
  if (!player) return 0;
  const progress = player.pieces.reduce((sum, piece) => sum + Math.max(0, piece.steps + 1), 0);
  const victory = match.winner === countryId ? 2200 : 0;
  return Math.round(
    victory
    + player.stats.captures * 190
    + player.stats.finished * 340
    + player.stats.barricadesFormed * 70
    + player.stats.safeLandings * 20
    + progress * 4
    - player.stats.turnsTimedOut * 20,
  );
}

export function serializeMatch(match) {
  if (!match) return null;
  return structuredClone(match);
}

export function readMatchSnapshot(value) {
  if (!plain(value)) return null;
  if (value.version !== MATCH_VERSION) return null;
  const rules = normalizeRules(value.rules);
  if (!Array.isArray(value.players) || value.players.length < 2 || value.players.length > 8) return null;
  if (!Number.isInteger(value.turn) || value.turn < 0 || value.turn >= value.players.length) return null;
  if (!['playing', 'finished'].includes(value.status)) return null;

  const players = value.players.map((player) => {
    if (!plain(player) || !countryFor(player.countryId) || !Array.isArray(player.pieces) || player.pieces.length !== rules.piecesPerPlayer) throw new Error('Sauvegarde DADA 3B invalide.');
    const pieces = player.pieces.map((piece, index) => {
      if (!plain(piece) || !Number.isInteger(piece.steps) || piece.steps < STABLE || piece.steps > FINISH_STEP) throw new Error('Position DADA 3B invalide.');
      return { id: index, steps: piece.steps };
    });
    const rawStats = plain(player.stats) ? player.stats : {};
    const stats = freshStats();
    Object.keys(stats).forEach((key) => {
      const raw = rawStats[key];
      stats[key] = Number.isFinite(raw) ? Math.max(0, Math.min(1e7, Math.round(raw))) : 0;
    });
    return {
      countryId: player.countryId,
      type: player.type === 'bot' ? 'bot' : 'human',
      aiLevel: AI_LEVELS.includes(player.aiLevel) ? player.aiLevel : rules.aiLevel,
      name: String(player.name || countryFor(player.countryId).name).slice(0, 24),
      pieces,
      stats,
    };
  });

  const result = {
    version: MATCH_VERSION,
    status: value.status,
    winner: value.winner && countryFor(value.winner) ? value.winner : null,
    turn: value.turn,
    round: clampInt(value.round, 1, 1e6, 1),
    turnSixes: clampInt(value.turnSixes, 0, 3, 0),
    pendingRoll: Number.isInteger(value.pendingRoll) && value.pendingRoll >= 1 && value.pendingRoll <= 6 ? value.pendingRoll : null,
    pendingMoves: [],
    rules,
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
    endedAt: Number.isFinite(value.endedAt) ? value.endedAt : null,
    endedReason: ['nexus', 'time'].includes(value.endedReason) ? value.endedReason : null,
    sequence: clampInt(value.sequence, 0, 1e7, 0),
    history: Array.isArray(value.history) ? value.history.slice(-80).filter(plain) : [],
    players,
    lastEvent: plain(value.lastEvent) ? value.lastEvent : null,
  };

  if (result.pendingRoll !== null && result.status === 'playing') result.pendingMoves = legalMoves(result, result.pendingRoll);
  if (result.status === 'finished' && !result.winner) return null;
  return result;
}
