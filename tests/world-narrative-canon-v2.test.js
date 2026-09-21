import test from 'node:test';
import assert from 'node:assert/strict';
import {CANON_WORLDS,STORY_CANON,GUARDIAN_STORIES} from '../src/world/story-canon.js';
import {COUNTRY_CAMPAIGNS,campaignFor,campaignMetaFor} from '../src/world/country-campaigns.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

test('one canonical source defines exactly eight countries, Guardians and values',()=>{
 assert.equal(Object.keys(CANON_WORLDS).length,8);
 assert.deepEqual(Object.keys(COUNTRY_CAMPAIGNS).sort(),Object.keys(CANON_WORLDS).sort());
 assert.deepEqual(Object.keys(GUARDIAN_VALUES).sort(),Object.keys(CANON_WORLDS).sort());
 for(const [region,canon] of Object.entries(CANON_WORLDS)){
  const rule=GUARDIAN_VALUES[region],story=GUARDIAN_STORIES[region],campaign=campaignMetaFor(region);
  assert.equal(rule.name,canon.guardian,region);
  assert.equal(rule.value,canon.value,region);
  assert.equal(story.name,canon.guardian,region);
  assert.equal(story.value,canon.value,region);
  assert.equal(rule.flaw,story.flaw,region);
  assert.equal(rule.evolution,story.conflict,region);
  assert.equal(rule.question,campaign.question,region);
  assert.equal(rule.missionStyle,campaign.missionStyle,region);
  assert.deepEqual(rule.campaign,campaign.campaign,region);
 }
});

test('Kaïs remains Porteur du Lien, never a ninth Guardian or value',()=>{
 assert.equal(STORY_CANON.hero.name,'Kaïs');
 assert.match(STORY_CANON.hero.rule,/ni un neuvième Gardien ni le détenteur d’une neuvième valeur/);
 assert.equal(Object.values(CANON_WORLDS).some(x=>x.guardian==='Kaïs'),false);
 assert.deepEqual(STORY_CANON.finale.requirement,{countries:8,guardians:8,values:8,fragments:8});
});

test('Oblivion stays aligned with the existing central canon',()=>{
 assert.match(STORY_CANON.oubli.nature,/force qui grandit/i);
 assert.match(STORY_CANON.oubli.monster,/manifestation condensée/i);
 assert.match(STORY_CANON.oubli.falseAnswer,/n’est pas un peuple, un pays ou une personne/i);
});

test('territory campaign questions and beats are distinct without creating a second world canon',()=>{
 const questions=new Set(),ids=new Set();
 for(const [region,campaign] of Object.entries(COUNTRY_CAMPAIGNS)){
  assert.ok(campaign.question.length>20,region);
  assert.ok(campaign.missionStyle.length>5,region);
  assert.equal(questions.has(campaign.question),false,region);
  questions.add(campaign.question);
  assert.ok(campaignFor(region).length>=5,region);
  for(const beat of campaign.campaign){
   assert.equal(ids.has(beat.id),false,beat.id);
   ids.add(beat.id);
   assert.ok(beat.title,beat.id);
   assert.ok(beat.family,beat.id);
  }
 }
 assert.ok(campaignFor('france').length>=9);
});

test('campaign catalog carries no progression or reward authority',()=>{
 const raw=JSON.stringify(COUNTRY_CAMPAIGNS);
 assert.doesNotMatch(raw,/grant_global_xp|grant_fragment|mint_inventory|set_guardian_liberated|service_role/i);
});
