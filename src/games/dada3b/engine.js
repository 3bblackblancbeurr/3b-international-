export const TRACK_LENGTH = 64;
export const HOME_LENGTH = 6;
export const PIECES_PER_PLAYER = 4;
export const STABLE = -1;
export const FINISH_STEP = TRACK_LENGTH + HOME_LENGTH;

export const COUNTRIES_3B = [
  { id: 'fr', code: 'FR', name: 'France', flag: '🇫🇷', guardian: 'Céliane', value: 'Justice', accent: '#2f80ed', secondary: '#f3f7ff', start: 0, shape: 'shield' },
  { id: 'dz', code: 'DZ', name: 'Algérie', flag: '🇩🇿', guardian: 'Yliane', value: 'Loyauté', accent: '#1f9d62', secondary: '#f5fff9', start: 8, shape: 'diamond' },
  { id: 'es', code: 'ES', name: 'Espagne', flag: '🇪🇸', guardian: 'Diego', value: 'Passion', accent: '#e4ad24', secondary: '#fff7dc', start: 16, shape: 'sun' },
  { id: 'ma', code: 'MA', name: 'Maroc', flag: '🇲🇦', guardian: 'Naël', value: 'Noblesse', accent: '#a72a47', secondary: '#fff1f5', start: 24, shape: 'hex' },
  { id: 'it', code: 'IT', name: 'Italie', flag: '🇮🇹', guardian: 'Alessio', value: 'Espoir', accent: '#37a66c', secondary: '#f3fff8', start: 32, shape: 'arch' },
  { id: 'tn', code: 'TN', name: 'Tunisie', flag: '🇹🇳', guardian: 'Soraya', value: 'Courage', accent: '#ef5c62', secondary: '#fff4f5', start: 40, shape: 'round' },
  { id: 'tr', code: 'TR', name: 'Turquie', flag: '🇹🇷', guardian: 'Émir', value: 'Foi', accent: '#d52b3f', secondary: '#fff2f4', start: 48, shape: 'star' },
  { id: 'ee', code: 'EE', name: 'Estonie', flag: '🇪🇪', guardian: 'Eira', value: 'Sagesse', accent: '#45a8ff', secondary: '#eff8ff', start: 56, shape: 'rune' },
];

const countryMap = new Map(COUNTRIES_3B.map((country) => [country.id, country]));

export function countryFor(countryId) {
  return countryMap.get(countryId) || null;
}

export function createMatch(seats) {
  if (!Array.isArray(seats)) throw new Error('Configuration de partie invalide.');
  const active = seats
    .filter((seat) => seat && seat.active !== false)
    .map((seat) => ({
      countryId: seat.countryId,
      type: seat.type === 'bot' ? 'bot' : 'human',
      name: String(seat.name || countryFor(seat.countryId)?.name || 'Joueur').slice(0, 24),
    }));

  if (active.length < 2 || active.length > 8) throw new Error('Une partie demande de 2 à 8 joueurs.');
  if (new Set(active.map((seat) => seat.countryId)).size !== active.length) throw new Error('Chaque pays ne peut être choisi qu’une fois.');
  if (active.some((seat) => !countryFor(seat.countryId))) throw new Error('Un pays de la partie est invalide.');

  return {
    version: 1,
    status: 'playing',
    winner: null,
    turn: 0,
    round: 1,
    players: active.map((seat) => ({
      ...seat,
      pieces: Array.from({ length: PIECES_PER_PLAYER }, (_, index) => ({ id: index, steps: STABLE })),
      stats: { captures: 0, finished: 0, rolls: 0, sixes: 0 },
    })),
    lastEvent: { type: 'start', text: 'Le Cercle des 8 Portes est ouvert.' },
  };
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
  if (!Number.isInteger(steps) || steps < TRACK_LENGTH || steps > FINISH_STEP) return null;
  return steps - TRACK_LENGTH;
}

export function legalMoves(match, roll, playerIndex = match?.turn ?? 0) {
  if (!match || match.status !== 'playing' || !Number.isInteger(roll) || roll < 1 || roll > 6) return [];
  const player = match.players[playerIndex];
  if (!player) return [];
  const legal = [];
  player.pieces.forEach((piece, index) => {
    if (piece.steps === STABLE) {
      if (roll === 6) legal.push(index);
      return;
    }
    if (piece.steps >= 0 && piece.steps < FINISH_STEP && piece.steps + roll <= FINISH_STEP) {
      legal.push(index);
    }
  });
  return legal;
}

function landingInfo(match, playerIndex, pieceIndex, roll) {
  const player = match.players[playerIndex];
  const piece = player?.pieces?.[pieceIndex];
  if (!player || !piece) return null;
  const nextSteps = piece.steps === STABLE ? 0 : piece.steps + roll;
  const landing = nextSteps < TRACK_LENGTH ? globalCellFor(player.countryId, nextSteps) : null;
  let captures = 0;
  if (landing !== null) {
    match.players.forEach((opponent, opponentIndex) => {
      if (opponentIndex === playerIndex) return;
      opponent.pieces.forEach((target) => {
        if (globalCellFor(opponent.countryId, target.steps) === landing) captures += 1;
      });
    });
  }
  return { nextSteps, landing, captures };
}

export function previewMove(match, pieceIndex, roll, playerIndex = match?.turn ?? 0) {
  if (!legalMoves(match, roll, playerIndex).includes(pieceIndex)) return null;
  const player = match.players[playerIndex];
  const piece = player.pieces[pieceIndex];
  const landing = landingInfo(match, playerIndex, pieceIndex, roll);
  return {
    playerIndex,
    pieceIndex,
    from: piece.steps,
    to: landing.nextSteps,
    landing: landing.landing,
    captures: landing.captures,
    exitsStable: piece.steps === STABLE,
    entersHome: piece.steps < TRACK_LENGTH && landing.nextSteps >= TRACK_LENGTH,
    finishes: landing.nextSteps === FINISH_STEP,
  };
}

export function movePiece(match, pieceIndex, roll) {
  if (!match || match.status !== 'playing') throw new Error('La partie est terminée.');
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new Error('Le dé doit être compris entre 1 et 6.');
  const legal = legalMoves(match, roll);
  if (!legal.includes(pieceIndex)) throw new Error('Ce totem ne peut pas avancer avec ce dé.');

  const next = structuredClone(match);
  const playerIndex = next.turn;
  const player = next.players[playerIndex];
  const country = countryFor(player.countryId);
  const piece = player.pieces[pieceIndex];
  const before = piece.steps;
  const projected = landingInfo(next, playerIndex, pieceIndex, roll);
  piece.steps = projected.nextSteps;

  player.stats.rolls += 1;
  if (roll === 6) player.stats.sixes += 1;

  const captured = [];
  if (projected.landing !== null) {
    next.players.forEach((opponent, opponentIndex) => {
      if (opponentIndex === playerIndex) return;
      opponent.pieces.forEach((target, targetIndex) => {
        if (globalCellFor(opponent.countryId, target.steps) === projected.landing) {
          captured.push({
            countryId: opponent.countryId,
            pieceIndex: targetIndex,
            from: target.steps,
          });
          target.steps = STABLE;
        }
      });
    });
  }

  if (captured.length) player.stats.captures += captured.length;
  if (piece.steps === FINISH_STEP && before !== FINISH_STEP) player.stats.finished += 1;

  const won = player.pieces.every((candidate) => candidate.steps === FINISH_STEP);
  const event = {
    type: captured.length ? 'capture' : piece.steps === FINISH_STEP ? 'finish' : before === STABLE ? 'exit' : 'move',
    countryId: player.countryId,
    pieceIndex,
    roll,
    from: before,
    to: piece.steps,
    landing: projected.landing,
    captured,
    text: captured.length
      ? `${country.name} déclenche Fracture Matrix · ${captured.length} totem${captured.length > 1 ? 's' : ''} renvoyé${captured.length > 1 ? 's' : ''} à l’écurie.`
      : piece.steps === FINISH_STEP
        ? `${country.name} sécurise un totem dans le Nexus.`
        : before === STABLE
          ? `${country.name} ouvre sa Porte et sort de l’écurie.`
          : `${country.name} avance de ${roll} case${roll > 1 ? 's' : ''}.`,
  };

  if (won) {
    next.status = 'finished';
    next.winner = player.countryId;
    event.type = 'victory';
    event.text = `${country.name} rassemble ses quatre totems · Cercle 3B complété.`;
  } else if (roll !== 6) {
    const previousTurn = next.turn;
    next.turn = (next.turn + 1) % next.players.length;
    if (next.turn <= previousTurn) next.round += 1;
  }

  next.lastEvent = event;
  return { match: next, event };
}

export function passTurn(match, roll) {
  if (!match || match.status !== 'playing') return match;
  const next = structuredClone(match);
  const player = next.players[next.turn];
  player.stats.rolls += 1;
  if (roll === 6) player.stats.sixes += 1;
  const previousTurn = next.turn;
  next.turn = (next.turn + 1) % next.players.length;
  if (next.turn <= previousTurn) next.round += 1;
  next.lastEvent = {
    type: 'blocked',
    countryId: player.countryId,
    roll,
    text: `${countryFor(player.countryId).name} ne peut déplacer aucun totem.`,
  };
  return next;
}

export function selectBotMove(match, roll, playerIndex = match?.turn ?? 0) {
  const legal = legalMoves(match, roll, playerIndex);
  if (!legal.length) return null;
  let best = legal[0];
  let bestScore = -Infinity;

  legal.forEach((pieceIndex) => {
    const move = previewMove(match, pieceIndex, roll, playerIndex);
    let score = move.to;
    if (move.captures) score += 5000 + move.captures * 600;
    if (move.finishes) score += 4200;
    if (move.entersHome) score += 1700;
    if (move.exitsStable) score += 900;
    if (move.to >= TRACK_LENGTH) score += 700 + move.to;
    if (score > bestScore) {
      bestScore = score;
      best = pieceIndex;
    }
  });

  return best;
}

export function scoreFor(match, countryId) {
  const player = match?.players?.find((candidate) => candidate.countryId === countryId);
  if (!player) return 0;
  const progress = player.pieces.reduce((sum, piece) => sum + Math.max(0, piece.steps + 1), 0);
  const victory = match.winner === countryId ? 2000 : 0;
  return Math.round(victory + player.stats.captures * 180 + player.stats.finished * 320 + progress * 4);
}
