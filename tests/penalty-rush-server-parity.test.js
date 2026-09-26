import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as client from '../src/games/penaltyRush/core.js';
import * as server from '../supabase/functions/penalty-rush/engine.js';

test('Penalty Rush client and server engines keep the same deterministic rules', () => {
  assert.equal(server.ACTION_SECONDS, client.ACTION_SECONDS);
  assert.equal(server.ATTACKS_PER_HALF, client.ATTACKS_PER_HALF);

  const gestures = [
    { dx: 20, dy: 3, durationMs: 250, taps: 0 },
    { dx: 82, dy: -22, durationMs: 520, heldMs: 520, curve: .33 },
    { dx: 5, dy: -35, durationMs: 260, heldMs: 260, curve: 0 },
  ];
  for (const sample of gestures) {
    assert.deepEqual(server.interpretAttackGesture(sample), client.interpretAttackGesture(sample));
  }

  const keeperGestures = [
    { dx: -90, dy: 8, durationMs: 180 },
    { dx: 4, dy: -80, durationMs: 200 },
    { dx: 10, dy: 75, durationMs: 240 },
  ];
  for (const sample of keeperGestures) {
    assert.deepEqual(server.interpretKeeperGesture(sample), client.interpretKeeperGesture(sample));
  }

  const shot = { type:'shot', power:.79, precision:.9, curve:.22, targetX:.41, targetY:.48 };
  const context = {
    shot,
    keeperX:.1,
    keeperGesture:{type:'dive',direction:1,intensity:.7},
    keeperEffect:{id:'anchor',reach:1.18},
    attackerFlow:62,
  };
  assert.deepEqual(server.resolveShot(context), client.resolveShot(context));
});

test('Penalty Rush match phase changes are identical on client and server', () => {
  const players=[{id:'a',name:'A'},{id:'b',name:'B'}];
  let a=client.createPenaltyMatch(players,0);
  let b=server.createPenaltyMatch(players,0);
  for(const [result,at] of [['goal',1000],['save',2000],['save',3000],['goal',4000],['save',5000],['save',6000],['goal',7000],['save',8000]]){
    a=client.settlePossession(a,result,at);
    b=server.settlePossession(b,result,at);
    assert.deepEqual(b,a);
  }
  assert.equal(a.status,'finished');
  assert.equal(a.winner,0);
});

test('Penalty Rush Edge service keeps authority and service credentials server-side', () => {
  const source=fs.readFileSync(new URL('../supabase/functions/penalty-rush/index.ts',import.meta.url),'utf8');
  assert.match(source,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source,/authorization/);
  assert.match(source,/loyalty_session_valid/);
  assert.match(source,/revision=eq\./);
  assert.match(source,/penalty_settle_match/);
  assert.match(source,/international\.respond/);
  assert.match(source,/club\.leave/);
  assert.match(source,/club\.disband/);
  assert.match(source,/colorsInput/);
  assert.match(source,/status=eq\.preselected/);
  assert.match(source,/countryNeededRole/);
  assert.match(source,/selectionScore/);
  assert.match(source,/disciplinePenalty/);
  assert.match(source,/recentRankedForm/);
  assert.match(source,/role_profile/);
  assert.match(source,/passport_public_id/);
  assert.match(source,/penalty_ranked_stats/);
  assert.match(source,/club\.invite/);
  assert.match(source,/internationalPhase/);
  assert.match(source,/rankedSeasonId/);
  assert.match(source,/sleeves:/);
  assert.match(source,/socksStyle:/);
  assert.match(source,/material:/);
  assert.match(source,/studs:/);
  assert.doesNotMatch(source,/service_role[^\n]*['"][A-Za-z0-9._-]{20,}/);
  assert.doesNotMatch(source,/Math\.random\(/);
});

test('online-only client talks only to the authenticated Penalty Rush Edge endpoint', () => {
  const source=fs.readFileSync(new URL('../src/games/penaltyRush/online.js',import.meta.url),'utf8');
  assert.match(source,/functions\/v1\/penalty-rush/);
  assert.match(source,/Authorization:\s*'Bearer '\s*\+\s*session\.access_token/);
  assert.match(source,/postgres_changes/);
  assert.match(source,/table\s*:\s*'penalty_rooms'/);
});
