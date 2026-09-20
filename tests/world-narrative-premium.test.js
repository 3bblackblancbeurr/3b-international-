import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {COUNTRY_NARRATIVE,WORLD_NARRATIVE} from '../src/world/narrative-canon.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {campaignBeat,chapterObjective} from '../src/world/chapters.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';

const franceState=({helped=false,powers=[],solved=false,beacons=[]}={})=>{
 const save=blankSave();
 save.region='france';
 save.beacons=[...beacons];
 save.adventure.chapters.france={helped,powers:[...powers],solved,restored:0,challenge:false,choice:null,board:[]};
 return save;
};

test('premium narrative has one coherent world mystery and no chosen-one shortcut',()=>{
 assert.match(WORLD_NARRATIVE.player.hook,/Passeport|Souvenir/);
 assert.match(WORLD_NARRATIVE.player.hook,/Kaïs/);
 assert.match(WORLD_NARRATIVE.oblivion.origin,/protection/i);
 assert.match(WORLD_NARRATIVE.oblivion.corruption,/préservé|préserver/i);
 assert.match(WORLD_NARRATIVE.circle.danger,/réveille|réveiller/i);
 assert.match(WORLD_NARRATIVE.player.role,/n’est pas un élu/i);
 assert.doesNotMatch(WORLD_NARRATIVE.player.role,/destin|prophétie|choisi par le destin/i);
 assert.equal(WORLD_NARRATIVE.reveals.length,5);
});

test('all eight countries have distinct thematic questions, mission identities and imperfect guardians',()=>{
 const entries=Object.entries(COUNTRY_NARRATIVE);
 assert.equal(entries.length,8);
 assert.equal(new Set(entries.map(([,n])=>n.value)).size,8);
 assert.equal(new Set(entries.map(([,n])=>n.question)).size,8);
 assert.equal(new Set(entries.map(([,n])=>n.missionStyle)).size,8);
 for(const [region,n] of entries){
  assert.ok(n.question.endsWith('?'),region);
  assert.ok(n.guardian.flaw.length>40,region);
  assert.ok(n.guardian.evolution.length>35,region);
  assert.ok(n.campaign.length>=5,region);
  assert.ok(n.campaign.some(m=>m.combat===false),region);
  assert.ok(n.campaign.some(m=>/Gardien|valeur/i.test(m.family)),region);
 }
});

test('France premium campaign exposes nine different narrative beats through the legacy-compatible state',()=>{
 const expected=[
  'Deux versions',
  'Le témoin qui manque',
  'La preuve',
  'Céliane',
  'La foule',
  'Celui qu’on avait oublié',
  'Les Archives',
  'Justice n’est pas vengeance',
  'Le poids de la vérité',
 ];
 const states=[
  franceState(),
  franceState({helped:true}),
  franceState({helped:true,powers:['ally']}),
  franceState({helped:true,powers:['ally','ambiance']}),
  franceState({helped:true,powers:['ally','ambiance','terrain']}),
  franceState({helped:true,powers:['ally','ambiance','terrain'],solved:true}),
  franceState({helped:true,powers:['ally','ambiance','terrain'],solved:true,beacons:['france:0']}),
  franceState({helped:true,powers:['ally','ambiance','terrain'],solved:true,beacons:['france:0','france:1']}),
  franceState({helped:true,powers:['ally','ambiance','terrain'],solved:true,beacons:['france:0','france:1','france:2']}),
 ];
 assert.deepEqual(states.map(s=>campaignBeat(s,'france')?.title),expected);
 assert.deepEqual(states.slice(0,8).map(s=>chapterObjective(s,'france').title),expected.slice(0,8));
});

test('guardian value system preserves stable choice ids while adding human conflict and evolution',()=>{
 const expected={
  france:['écouter','preuve','réparer'],
  italie:['tenir','ouvrir','transmettre'],
  estonie:['observer','relier','mesurer'],
  turquie:['tenir','douter','agir'],
  algerie:['rester','dire','protéger'],
  tunisie:['avancer','protéger','assumer'],
  maroc:['respecter','donner','tenir'],
  espagne:['canaliser','créer','maîtriser'],
 };
 for(const [region,ids] of Object.entries(expected)){
  const guardian=GUARDIAN_VALUES[region];
  assert.deepEqual(guardian.choices.map(([id])=>id),ids,region);
  assert.equal(guardian.value,COUNTRY_NARRATIVE[region].value);
  assert.equal(guardian.question,COUNTRY_NARRATIVE[region].question);
  assert.equal(guardian.flaw,COUNTRY_NARRATIVE[region].guardian.flaw);
  assert.equal(guardian.evolution,COUNTRY_NARRATIVE[region].guardian.evolution);
 }
});

test('cinematics expose the personal hook and keep the Circle ending open',()=>{
 const opening=storyCinematicPresentation({kind:'world-opening',key:'opening:world',context:{}});
 assert.match(opening.detail,/Kaïs/);
 assert.match(opening.detail,/comprendre/i);
 const france=storyCinematicPresentation({kind:'country-first-entry',key:'entry:france',context:{region:'france'}});
 assert.match(france.detail,/Comment juger/);
 const finale=storyCinematicPresentation({kind:'story-finale',key:'finale:world',context:{}});
 assert.match(finale.detail,/8\/8/);
 assert.match(finale.detail,/suite/i);
});
