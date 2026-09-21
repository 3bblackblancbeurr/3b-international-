import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACK_LENGTH,
  FINISH_STEP,
  STABLE,
  createMatch,
  legalMoves,
  movePiece,
  globalCellFor,
  selectBotMove,
} from '../src/games/dada3b/engine.js';

const seats = [
  { countryId: 'fr', type: 'human' },
  { countryId: 'dz', type: 'human' },
];

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
});

test('un déplacement sans 6 passe au joueur suivant', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 4;
  const result = movePiece(match, 0, 3);
  assert.equal(result.match.players[0].pieces[0].steps, 7);
  assert.equal(result.match.turn, 1);
});

test('une capture renvoie le totem adverse à l’écurie', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = 2;
  const landingCell = globalCellFor('fr', 5);
  let opponentStep = null;
  for (let step = 0; step < TRACK_LENGTH; step += 1) {
    if (globalCellFor('dz', step) === landingCell) opponentStep = step;
  }
  assert.notEqual(opponentStep, null);
  match.players[1].pieces[0].steps = opponentStep;
  const result = movePiece(match, 0, 3);
  assert.equal(result.match.players[1].pieces[0].steps, STABLE);
  assert.equal(result.event.captured.length, 1);
});

test('il faut le compte exact pour atteindre le Nexus', () => {
  const match = createMatch(seats);
  match.players[0].pieces[0].steps = FINISH_STEP - 2;
  assert.deepEqual(legalMoves(match, 3), []);
  assert.deepEqual(legalMoves(match, 2), [0]);
  const result = movePiece(match, 0, 2);
  assert.equal(result.match.players[0].pieces[0].steps, FINISH_STEP);
});

test('la victoire exige les quatre totems au Nexus', () => {
  const match = createMatch(seats);
  match.players[0].pieces.forEach((piece) => { piece.steps = FINISH_STEP; });
  match.players[0].pieces[0].steps = FINISH_STEP - 1;
  const result = movePiece(match, 0, 1);
  assert.equal(result.match.status, 'finished');
  assert.equal(result.match.winner, 'fr');
});

test('l’IA privilégie une capture disponible', () => {
  const match = createMatch([
    { countryId: 'fr', type: 'bot' },
    { countryId: 'dz', type: 'human' },
  ]);
  match.players[0].pieces[0].steps = 1;
  match.players[0].pieces[1].steps = 10;
  const targetCell = globalCellFor('fr', 4);
  let opponentStep = null;
  for (let step = 0; step < TRACK_LENGTH; step += 1) {
    if (globalCellFor('dz', step) === targetCell) opponentStep = step;
  }
  match.players[1].pieces[0].steps = opponentStep;
  assert.equal(selectBotMove(match, 3), 0);
});
