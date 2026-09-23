import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CATALOG } from '../src/games/catalog.js';
import { readFileSync } from 'node:fs';

const gamesHub = readFileSync(new URL('../src/games/GamesHub.jsx', import.meta.url), 'utf8');

test('Penalty Rush is visible as the first local Jeux 3B card', () => {
  const game = GAME_CATALOG.find((entry) => entry.id === 'penalty-rush');
  assert.ok(game);
  assert.equal(game.number, '01');
  assert.equal(game.title, 'PENALTY RUSH');
  assert.equal(Boolean(game.href), false);
});

test('Penalty Rush card opens the internal route instead of a modal or external URL', () => {
  assert.match(gamesHub, /if\(g\.id==='penalty-rush'\)\{goToGame\?\.\('penalty-rush'\);return;\}/);
  assert.match(gamesHub, /game\?\.slug!=='penalty-rush'/);
});
