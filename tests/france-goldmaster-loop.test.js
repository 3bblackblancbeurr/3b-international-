import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {chapterState} from '../src/world/chapters.js';
import {GUARDIAN_VALUES,guardianHubPresence} from '../src/world/guardian-values.js';

test('France Gold Master progression closes the Justice/Céliane loop back to the hub',()=>{
  let s=blankSave();
  s=applyWorldAction(s,{type:'visit',region:'france'});
  assert.equal(s.region,'france');

  s=applyWorldAction(s,{type:'help'});
  for(const power of ['ally','ambiance','terrain'])s=applyWorldAction(s,{type:'power',power});
  for(const index of [0,1,2,3])s=applyWorldAction(s,{type:'puzzleStep',index});
  s=applyWorldAction(s,{type:'solve'});
  assert.equal(chapterState(s,'france').restored,1);

  for(const id of ['france:0','france:1','france:2'])s=applyWorldAction(s,{type:'beacon',id});
  s=applyWorldAction(s,{type:'restore',choice:'garden'});
  assert.equal(chapterState(s,'france').restored,2);

  assert.equal(GUARDIAN_VALUES.france.name,'Céliane');
  assert.equal(GUARDIAN_VALUES.france.value,'Justice');
  for(const choiceId of ['écouter','preuve','réparer'])s=applyWorldAction(s,{type:'guardianValueChoice',choiceId});
  assert.equal(s.adventure.values.france.completed,true);

  s=applyWorldAction(s,{type:'encounter',id:'france:guardian'});
  assert.equal(s.adventure.encounter.boss,true);
  // Isolate progression from combat-balance tuning: one legal victory must grant the seal server-side.
  s=normalizeSave({...s,adventure:{...s.adventure,encounter:{...s.adventure.encounter,enemy:1}}});
  s=applyWorldAction(s,{type:'battle',action:'strike'});
  assert.equal(s.adventure.encounter.result,'victory');
  assert.ok(s.seals.includes('france'));

  s=applyWorldAction(s,{type:'restore'});
  assert.equal(chapterState(s,'france').restored,3);
  s=applyWorldAction(s,{type:'visit',region:'hub'});
  assert.equal(s.region,'hub');

  const returned=guardianHubPresence(s.seals,['france']).find(g=>g.region==='france');
  assert.equal(returned.name,'Céliane');
  assert.equal(returned.value,'Justice');
});
