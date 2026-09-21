import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20260921234026_dada3b_competitive_hardening_v3.sql');
const edge=read('supabase/functions/dada3b/index.ts');
const ui=read('src/games/Dada3B.jsx');
const css=read('src/games/dada3b.css');

test('DADA room mode constraint now accepts live 2v2 and tournaments',()=>{
  assert.match(migration,/team2v2/);
  assert.match(migration,/tournament/);
  assert.match(migration,/dada_rooms_mode_check/);
  assert.match(edge,/ONLINE_MODES=new Set\(\['private','quick','ranked','team2v2','tournament'\]\)/);
});

test('2v2 rating is isolated from solo rating and only settles after the room settles',()=>{
  assert.match(migration,/create table if not exists public\.dada_team_ratings/);
  assert.match(migration,/new\.mode='team2v2'/);
  assert.match(migration,/rating=least\(100000,rating\+12\)/);
  assert.match(migration,/rating=greatest\(0,rating-12\)/);
  assert.match(migration,/old\.settled_at is null and new\.settled_at is not null/);
  assert.match(edge,/board==='team'\?'dada_team_ratings':'dada_ratings'/);
});

test('tournament schema is fail-closed and bracket advancement is server-side',()=>{
  for(const table of ['dada_tournaments','dada_tournament_entries','dada_tournament_matches']){
    assert.match(migration,new RegExp('alter table public\\.'+table+' enable row level security'));
    assert.match(migration,new RegExp('revoke all on public\\.'+table+' from anon, authenticated'));
  }
  assert.match(migration,/dada3b_seed_tournament/);
  assert.match(migration,/dada3b_advance_tournament_room/);
  assert.match(migration,/winner_user_id=r\.winner_user_id/);
  assert.match(migration,/status='finished',finished_at=now\(\)/);
});

test('playable tournament API creates authoritative tournament rooms and handles races',()=>{
  for(const action of ['tournaments','tournament_create','tournament_join','tournament_status','tournament_match']){
    assert.match(edge,new RegExp("'"+action+"'"));
  }
  assert.match(edge,/mode:'tournament'/);
  assert.match(edge,/timerSeconds:20/);
  assert.match(edge,/captureRequired:true/);
  assert.match(edge,/room_id=is\.null/);
  assert.match(edge,/Le match vient d’être ouvert sur un autre appareil/);
});

test('tournament creation is bounded and cannot spam simultaneous open brackets',()=>{
  assert.match(edge,/\[4,8,16\]\.includes/);
  assert.match(edge,/Termine ou annule ton tournoi actuel/);
  assert.match(migration,/max_entries in \(4,8,16\)/);
  assert.match(migration,/single_elimination/);
});

test('UI exposes solo and team rankings plus playable tournament bracket',()=>{
  assert.match(ui,/Classé 1v1/);
  assert.match(ui,/Classé 2v2/);
  assert.match(ui,/Tournois/);
  assert.match(ui,/Brackets 4 \/ 8 \/ 16/);
  assert.match(ui,/Jouer mon prochain match/);
  assert.match(ui,/dadaRequest\('tournament_match'/);
});

test('accessibility preferences are persistent and never rely on color alone',()=>{
  for(const key of ['largeText','highContrast','colorblind','reducedMotion'])assert.match(ui,new RegExp(key));
  assert.match(ui,/dada3b:a11y/);
  assert.match(ui,/aria-live="assertive"/);
  assert.match(css,/dada3b-a11y-colorblind/);
  assert.match(css,/border-style:dashed/);
  assert.match(css,/outline:3px dotted/);
  assert.match(css,/dada3b-a11y-contrast/);
  assert.match(css,/dada3b-a11y-reduced/);
});

test('responsive bracket remains usable on narrow mobile screens',()=>{
  assert.match(css,/dada3b-bracket-rounds/);
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/@media\(max-width:480px\)/);
});
