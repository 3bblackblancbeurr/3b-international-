import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_NARRATIVE,COUNTRY_NARRATIVE,campaignFor,narrativeFor} from '../src/world/narrative-canon.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

const EXPECTED={
 france:['Céliane','Justice'],
 algerie:['Yliane','Loyauté'],
 espagne:['Diego','Passion'],
 maroc:['Naël','Noblesse'],
 italie:['Alessio','Espoir'],
 tunisie:['Soraya','Courage'],
 turquie:['Émir','Foi'],
 estonie:['Eira','Sagesse'],
};

test('narrative canon contains exactly the eight canonical countries, guardians and values',()=>{
 assert.deepEqual(Object.keys(COUNTRY_NARRATIVE).sort(),Object.keys(EXPECTED).sort());
 assert.deepEqual(Object.keys(GUARDIAN_VALUES).sort(),Object.keys(EXPECTED).sort());
 for(const [region,[guardian,value]] of Object.entries(EXPECTED)){
  const narrative=narrativeFor(region),rule=GUARDIAN_VALUES[region];
  assert.equal(narrative.guardian.name,guardian,region);
  assert.equal(narrative.value,value,region);
  assert.equal(rule.name,guardian,region);
  assert.equal(rule.value,value,region);
  assert.equal(rule.question,narrative.question,region);
  assert.equal(rule.flaw,narrative.guardian.flaw,region);
  assert.equal(rule.evolution,narrative.guardian.evolution,region);
  assert.deepEqual(rule.campaign,narrative.campaign,region);
 }
});

test('Kaïs is the narrative link and never a ninth guardian or ninth value',()=>{
 assert.match(WORLD_NARRATIVE.kais.role,/Premier explorateur/);
 assert.match(WORLD_NARRATIVE.kais.distinction,/Kaïs ouvre l’histoire/);
 assert.equal(Object.values(GUARDIAN_VALUES).some(x=>x.name==='Kaïs'),false);
 assert.equal(Object.values(COUNTRY_NARRATIVE).some(x=>x.value==='Kaïs'),false);
 assert.equal(Object.keys(COUNTRY_NARRATIVE).length,8);
});

test('Oblivion is a corrupted protection mechanism rather than a generic evil',()=>{
 assert.match(WORLD_NARRATIVE.oblivion.origin,/protection/i);
 assert.match(WORLD_NARRATIVE.oblivion.corruption,/préservé|préserver/i);
 assert.match(WORLD_NARRATIVE.oblivion.reveal,/système devenu incontrôlable/i);
 assert.ok(WORLD_NARRATIVE.oblivion.manifestations.length>=5);
});

test('each country owns a distinct question, campaign and guardian arc',()=>{
 const questions=new Set(),ids=new Set();
 for(const [region,narrative] of Object.entries(COUNTRY_NARRATIVE)){
  assert.ok(narrative.question.length>20,region);
  assert.ok(narrative.missionStyle.length>5,region);
  assert.ok(narrative.guardian.flaw.length>20,region);
  assert.ok(narrative.guardian.evolution.length>20,region);
  assert.ok(campaignFor(region).length>=5,region);
  assert.equal(questions.has(narrative.question),false,region);
  questions.add(narrative.question);
  for(const beat of narrative.campaign){
   assert.equal(ids.has(beat.id),false,beat.id);
   ids.add(beat.id);
   assert.ok(beat.title,beat.id);
   assert.ok(beat.family,beat.id);
  }
 }
 assert.ok(campaignFor('france').length>=9);
});

test('world narrative preserves memory, heritage, values and reconstruction pillars',()=>{
 assert.deepEqual(WORLD_NARRATIVE.pillars,['Mémoire','Héritage','Valeurs','Reconstruction']);
 assert.match(WORLD_NARRATIVE.player.hook,/Passeport/);
 assert.match(WORLD_NARRATIVE.player.hook,/Kaïs/);
 assert.match(WORLD_NARRATIVE.circle.fracture,/huit fragments/);
 assert.ok(WORLD_NARRATIVE.reveals.length>=5);
});
