import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  APPEARANCE_OPTIONS,
  RANKED_DIVISIONS,
  archetypeLevelForXp,
  formatPassportPublicId,
  profileCompletion,
  rankedDivisionFor,
  scoutingLabel,
} from '../src/games/penaltyRush/career.js';

const server=readFileSync(new URL('../supabase/functions/penalty-rush/index.ts',import.meta.url),'utf8');
const migrationV8=readFileSync(new URL('../supabase/migrations/20260926205824_penalty_rush_final_career_v8.sql',import.meta.url),'utf8');
const migrationV9=readFileSync(new URL('../supabase/migrations/20260926210949_penalty_rush_progression_international_v9.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/games/PenaltyRush.jsx',import.meta.url),'utf8');

test('ranked season uses placements before divisions and ends at Crown',()=>{
  assert.equal(RANKED_DIVISIONS.length,9);
  assert.equal(rankedDivisionFor(1000,0,5).id,'placement');
  assert.equal(rankedDivisionFor(1000,4,5).remaining,1);
  assert.equal(rankedDivisionFor(1000,5,5).id,'division-6');
  assert.equal(rankedDivisionFor(1450,20,5).id,'division-2');
  assert.equal(rankedDivisionFor(1800,30,5).id,'crown');
});

test('football avatar profile completion requires identity-facing cosmetic fields',()=>{
  const profile={
    shirtName:'3B',styleId:'technicien',preferredRole:'versatile',dominantFoot:'right',
    appearance:{skinTone:'tone4',hairStyle:'short',faceShape:'balanced'},
  };
  assert.deepEqual(profileCompletion(profile),{ready:true,missing:[]});
  const incomplete=profileCompletion({...profile,appearance:{...profile.appearance,hairStyle:''}});
  assert.equal(incomplete.ready,false);
  assert.ok(incomplete.missing.includes('coiffure'));
});

test('appearance catalog supports broad visual customization without racial labels',()=>{
  assert.equal(APPEARANCE_OPTIONS.skinTones.length,8);
  assert.ok(APPEARANCE_OPTIONS.hairColors.some(item=>item[0]==='blond'));
  assert.ok(APPEARANCE_OPTIONS.hairStyles.some(item=>item[0]==='afro'));
  assert.ok(APPEARANCE_OPTIONS.hairStyles.some(item=>item[0]==='braids'));
  assert.deepEqual(APPEARANCE_OPTIONS.roles.map(item=>item[0]),['attacker','keeper','versatile']);
});

test('archetype progression is bounded and public Passport formatting stays opaque',()=>{
  assert.equal(archetypeLevelForXp(0),1);
  assert.ok(archetypeLevelForXp(999999)<=50);
  assert.equal(formatPassportPublicId('89abcdef-1234-4abc-9def-0123456789ab'),'3B-PASS-89AB-CDEF-1234');
});

test('career UI exposes Passport, ranked, club recruitment and national pathway',()=>{
  assert.match(ui,/PASSEPORT → JOUEUR → CLUB → CLASSÉ → SÉLECTION/);
  assert.match(ui,/Copier mon ID public de recrutement/);
  assert.match(ui,/CELLULE DE RECRUTEMENT/);
  assert.match(ui,/SCORE SÉLECTION/);
  assert.match(ui,/POURQUOI CE SCORE/);
  assert.match(ui,/ABANDONS/);
  assert.match(ui,/Jouer pour mon pays/);
});

test('server makes Passport identity authoritative and competitive writes server-only',()=>{
  assert.match(server,/passport_public_id/);
  assert.match(server,/assertCompetitiveIdentity/);
  assert.match(server,/identity_status/);
  assert.match(server,/penalty_ranked_stats/);
  assert.match(server,/selectionScore/);
  assert.match(server,/recentRankedForm/);
  assert.match(server,/clubInvitesFor/);
  assert.match(server,/internationalPhase/);
  assert.match(server,/Math\.abs\(number\(host\.rankedRating,1000\)-number\(context\.rankedRating,1000\)\)>320/);
});

test('V8 migration creates server-authoritative seasons and recruitment with RLS',()=>{
  assert.match(migrationV8,/create table if not exists public\.penalty_ranked_seasons/);
  assert.match(migrationV8,/create table if not exists public\.penalty_ranked_stats/);
  assert.match(migrationV8,/create table if not exists public\.penalty_club_invites/);
  assert.match(migrationV8,/enable row level security/);
  assert.match(migrationV8,/revoke all on public\.penalty_ranked_stats from anon,authenticated/);
  assert.match(migrationV8,/penalty_competitive_history_settle/);
});

test('V9 migration automates international phases and cosmetic-only archetype progression',()=>{
  assert.match(migrationV9,/selection_closes_at/);
  assert.match(migrationV9,/matches_start_at/);
  assert.match(migrationV9,/matches_end_at/);
  assert.match(migrationV9,/penalty_player_progression_settle/);
  assert.match(migrationV9,/archetype_xp=archetype_xp\+v_a_gain/);
  assert.doesNotMatch(migrationV9,/STYLE_TUNING/);
});

test('selection labels cover the full national progression journey',()=>{
  assert.equal(scoutingLabel('non-classe'),'Placement requis');
  assert.equal(scoutingLabel('radar'),'Radar national');
  assert.equal(scoutingLabel('observe'),'Observé');
  assert.equal(scoutingLabel('preselection'),'Convocation');
  assert.equal(scoutingLabel('selection'),'Sélection confirmée');
});
