import test from 'node:test';
import assert from 'node:assert/strict';
import {
  moderateCommunityText,
  moderationCanonical,
  moderationRestriction,
  moderationStrikeWeight
} from '../supabase/functions/_shared/moderation.js';

test('clean community messages remain untouched',()=>{
 const result=moderateCommunityText('Bonjour, on joue au foot demain ?');
 assert.equal(result.action,'allow');
 assert.equal(result.severity,0);
 assert.equal(result.text,'Bonjour, on joue au foot demain ?');
});

test('light vulgarity is masked without blocking the message',()=>{
 const result=moderateCommunityText('Putain, quel match !');
 assert.equal(result.action,'mask');
 assert.equal(result.severity,1);
 assert.match(result.text,/••••/);
 assert.ok(!result.text.toLowerCase().includes('putain'));
});

test('directed insults are blocked',()=>{
 const result=moderateCommunityText('Tu es un connard.');
 assert.equal(result.action,'block');
 assert.equal(result.severity,3);
 assert.ok(result.reasons.includes('directed_insult'));
});

test('leet speak, spacing and repeated letters do not bypass the filter',()=>{
 assert.equal(moderateCommunityText('tu es un c0nnard').action,'block');
 assert.equal(moderateCommunityText('p u t a i n').action,'block');
 assert.equal(moderateCommunityText('tu es un connnnard').action,'block');
 assert.equal(moderationCanonical('c0nnnnard'),'connard');
});

test('credible direct threats escalate for owner review',()=>{
 const result=moderateCommunityText('Je vais te frapper.');
 assert.equal(result.action,'escalate');
 assert.equal(result.severity,4);
 assert.ok(result.reasons.includes('threat'));
});

test('innocent words are not matched by loose substrings',()=>{
 for(const message of ['Je vais à Puteaux demain.','Le débile moteur est réparé'.replace('débile','débit'),'On se retrouve au bord de la route.']){
  assert.equal(moderateCommunityText(message).action,'allow');
 }
});

test('repeat offences produce progressive temporary restrictions',()=>{
 const light=moderateCommunityText('merde');
 const insult=moderateCommunityText('tu es un connard');
 assert.equal(moderationStrikeWeight(light),1);
 assert.equal(moderationStrikeWeight(insult),3);
 const now=Date.parse('2026-09-23T00:00:00Z');
 assert.equal(moderationRestriction(4,2,now),null);
 assert.equal(moderationRestriction(5,2,now),'2026-09-23T00:15:00.000Z');
 assert.equal(moderationRestriction(8,2,now),'2026-09-24T00:00:00.000Z');
 assert.equal(moderationRestriction(12,3,now),'2026-09-30T00:00:00.000Z');
 assert.equal(moderationRestriction(5,4,now),'2026-09-30T00:00:00.000Z');
});
