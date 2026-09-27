import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAppearance,rankedDivision,ratingWindow,SKIN_TONES,HAIR_COLORS,HAIR_STYLES} from '../src/games/penaltyRush/profile-rules.js';
import {normalizePenaltyProfile,createDefaultPenaltyProfile} from '../src/games/penaltyRush/config.js';
import * as server from '../supabase/functions/penalty-rush/profile-rules.js';
test('cosmetics reject injected fields and accept every advertised choice',()=>{
 for(const skin of SKIN_TONES) for(const hairColor of HAIR_COLORS) for(const hairStyle of HAIR_STYLES){
  const value={skin,hairColor,hairStyle};assert.deepEqual(normalizeAppearance(value),value);assert.deepEqual(server.normalizeAppearance(value),value);
 }
 assert.deepEqual(normalizeAppearance({skin:'url(evil)',passport:'secret',rating:9999}),normalizeAppearance());
 assert.deepEqual(normalizeAppearance(null),normalizeAppearance());
});
test('public defaults never copy civil identity or unknown profile fields',()=>{
 const account={passport:{name:'Private Legal Name',country:'France'},profile:{name:'Private Legal Name',handle:'Player'}};
 assert.equal(createDefaultPenaltyProfile(account).displayName,'Player');
 const profile=normalizePenaltyProfile({email:'secret',passportId:'secret',name:'secret'},account);
 for(const key of ['email','passportId','name'])assert.equal(profile[key],undefined);
});
test('placement and all ranked boundaries remain stable',()=>{
 assert.equal(rankedDivision(1800,9).id,'placement');
 for(const [rating,id] of [[999,'bronze'],[1000,'silver'],[1200,'gold'],[1400,'platinum'],[1600,'diamond'],[1800,'elite']])assert.equal(rankedDivision(rating,10).id,id);
 assert.equal(ratingWindow(0),100);assert.equal(ratingWindow(15000),150);assert.equal(ratingWindow(9999999),400);assert.equal(ratingWindow(-1),100);
});
test('session and abuse controls fail closed and appearance rules stay identical',()=>{
 const service=readFileSync(new URL('../supabase/functions/penalty-rush/index.ts',import.meta.url),'utf8');
 assert.doesNotMatch(service,/catch\(\(\) => true\)/);
 assert.match(service,/member.passport_state !== 'active'/);
 assert.equal(readFileSync(new URL('../src/games/penaltyRush/profile-rules.js',import.meta.url),'utf8'),readFileSync(new URL('../supabase/functions/penalty-rush/profile-rules.js',import.meta.url),'utf8'));
});

test('profile normalization preserves each saved celebration and rejects unknown choices',()=>{
 for(const celebration of ['calme','crown','respect','matrix'])assert.equal(normalizePenaltyProfile({celebration}).celebration,celebration);
 assert.equal(normalizePenaltyProfile({celebration:'unknown'}).celebration,'calme');
});
