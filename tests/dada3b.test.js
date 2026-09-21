import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINISH_STEP,
  SANCTUARY_CELLS,
  STABLE,
  TRACK_LENGTH,
  achievementsFor,
  createMatch,
  globalCellFor,
  legalMoves,
  movePiece,
  readMatchSnapshot,
  resolveTimeout,
  rollTurn,
  selectBotMove,
  serializeMatch,
} from '../src/games/dada3b/engine.js';

const seats = [
  { countryId: 'fr', type: 'human' },
  { countryId: 'dz', type: 'human' },
];

function opponentStepFor(countryId, cell) {
  for (let step = 0; step < TRACK_LENGTH; step += 1) {
    if (globalCellFor(countryId, step) === cell) return step;
  }
  return null;
}

test('un totem ne sort de l’écurie que sur un 6', () => {
  const match = createMatch(seats);
  assert.deepEqual(legalMoves(match, 5), []);
  assert.deepEqual(legalMoves(match, 6), [0, 1, 2, 3]);
});

test('un 6 sort un totem et conserve le tour', () => {
  const match = createMatch(seats);
  const result = movePiece(match, 0, 6);
  assert.equal(result.match.players[0].pieces[0].steps, 0);
  assert.equal(result.match.turn, 0);
  assert.equal(result.match.players[0].stats.sixes, 1);
});

test('un déplacement sans 6 passe au joueur suivant', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 4;
  const result = movePiece(match, 0, 3);
  assert.equal(result.match.players[0].pieces[0].steps, 7);
  assert.equal(result.match.turn, 1);
});

test('une capture renvoie un totem adverse à l’écurie et compte les statistiques', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 2;
  const landingCell = globalCellFor('fr', 5);
  const opponentStep = opponentStepFor('dz', landingCell);
  assert.notEqual(opponentStep, null);
  match.players[1].pieces[0].steps = opponentStep;
  const result = movePiece(match, 0, 3);
  assert.equal(result.match.players[1].pieces[0].steps, STABLE);
  assert.equal(result.event.captured.length, 1);
  assert.equal(result.match.players[0].stats.captures, 1);
  assert.equal(result.match.players[1].stats.timesCaptured, 1);
});

test('les Portes de départ sont des Sanctuaires 3B non capturables', () => {
  const match = createMatch(seats);
  const sanctuary = SANCTUARY_CELLS[0];
  match.players[0].pieces[0].steps = 0;
  const opponentStep = opponentStepFor('dz', sanctuary);
  match.players[1].pieces[0].steps = opponentStep - 1;
  assert.equal(globalCellFor('dz', match.players[1].pieces[0].steps + 1), sanctuary);
  assert.equal(legalMoves(match, 1, 1).includes(0), false);
});

test('deux totems alliés forment une barricade qu’un adversaire ne traverse pas', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 10;
  match.players[0].pieces[1].steps = 10;
  const blockedCell = globalCellFor('fr', 10);
  const opponentStep = opponentStepFor('dz', blockedCell);
  match.turn = 1;
  match.players[1].pieces[0].steps = opponentStep - 2;
  assert.equal(legalMoves(match, 4).includes(0), false);
});

test('la capture obligatoire filtre les mouvements non offensifs quand une capture existe', () => {
  const match = createMatch(seats, { captureRequired: true });
  match.players[0].pieces[0].steps = 2;
  match.players[0].pieces[1].steps = 12;
  const landingCell = globalCellFor('fr', 5);
  match.players[1].pieces[0].steps = opponentStepFor('dz', landingCell);
  assert.deepEqual(legalMoves(match, 3), [0]);
});

test('il faut le compte exact pour atteindre le Nexus', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = FINISH_STEP - 2;
  assert.equal(legalMoves(match, 3).includes(0), false);
  assert.equal(legalMoves(match, 2).includes(0), true);
  const result = movePiece(match, 0, 2);
  assert.equal(result.match.players[0].pieces[0].steps, FINISH_STEP);
});

test('un 6 bloqué garde le tour et permet une nouvelle relance', () => {
  const match = createMatch(seats);
  match.players[0].pieces.forEach((piece) => { piece.steps = FINISH_STEP - 1; });
  const rolled = rollTurn(match, 6);
  assert.equal(rolled.autoPass, true);
  assert.equal(rolled.match.turn, 0);
  assert.equal(rolled.match.pendingRoll, null);
});

test('trois 6 consécutifs déclenchent la surcharge Matrix et font passer le tour', () => {
  let match = createMatch(seats);
  match = movePiece(match, 0, 6).match;
  match = movePiece(match, 0, 6).match;
  const third = rollTurn(match, 6);
  assert.equal(third.penalty, true);
  assert.equal(third.match.turn, 1);
  assert.equal(third.match.players[0].stats.tripleSixPenalties, 1);
});

test('la victoire exige tous les totems au Nexus', () => {
  const match = createMatch(seats);
  match.players[0].pieces.forEach((piece) => { piece.steps = FINISH_STEP; });
  match.players[0].pieces[0].steps = FINISH_STEP - 1;
  const result = movePiece(match, 0, 1);
  assert.equal(result.match.status, 'finished');
  assert.equal(result.match.winner, 'fr');
  assert.equal(result.match.endedAt !== null, true);
});

test('l’IA Gardien privilégie une capture disponible', () => {
  const match = createMatch([
    { countryId: 'fr', type: 'bot', aiLevel: 'gardien' },
    { countryId: 'dz', type: 'human' },
  ]);
  match.players[0].pieces[0].steps = 1;
  match.players[0].pieces[1].steps = 10;
  const targetCell = globalCellFor('fr', 4);
  match.players[1].pieces[0].steps = opponentStepFor('dz', targetCell);
  assert.equal(selectBotMove(match, 3, 0, 'gardien'), 0);
});

test('le timer peut résoudre automatiquement un tour humain avec la stratégie Gardien', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 5;
  const resolved = resolveTimeout(match, 2);
  assert.equal(resolved.match.players[0].stats.turnsTimedOut, 1);
  assert.equal(resolved.match.turn, 1);
  assert.equal(resolved.match.players[0].pieces[0].steps, 7);
});

test('une partie en cours se sérialise et se restaure sans perdre les règles ni les positions', () => {
  let match = createMatch(seats, { piecesPerPlayer: 3, timerSeconds: 20, bonusOnCapture: true, aiLevel: 'gardien' });
  match = movePiece(match, 0, 6).match;
  const restored = readMatchSnapshot(serializeMatch(match));
  assert.ok(restored);
  assert.equal(restored.rules.piecesPerPlayer, 3);
  assert.equal(restored.rules.timerSeconds, 20);
  assert.equal(restored.rules.bonusOnCapture, true);
  assert.equal(restored.players[0].pieces[0].steps, 0);
  assert.equal(restored.turn, 0);
});

test('les succès post-partie sont calculés depuis des statistiques vérifiables', () => {
  const match = createMatch(Array.from({ length: 8 }, (_, index) => ({
    countryId: ['fr', 'dz', 'es', 'ma', 'it', 'tn', 'tr', 'ee'][index],
    type: 'human',
  })));
  match.players[0].pieces.forEach((piece) => { piece.steps = FINISH_STEP; });
  match.players[0].stats.captures = 2;
  match.players[0].stats.timesCaptured = 0;
  match.winner = 'fr';
  match.status = 'finished';
  const ids = achievementsFor(match, 'fr').map((achievement) => achievement.id);
  assert.ok(ids.includes('first-capture'));
  assert.ok(ids.includes('four-nexus'));
  assert.ok(ids.includes('untouchable'));
  assert.ok(ids.includes('eight-nations'));
});
