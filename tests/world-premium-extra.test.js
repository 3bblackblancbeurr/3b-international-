import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,teamStats} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldWeatherForDate,weatherProfile} from '../src/world/world-weather.js';
import {hubMissionJournal,hubMissionSummary} from '../src/world/hub/mission-journal.js';

test('companion tactical orders persist and alter meaningful team stats',()=>{
 let base=blankSave();
 const normal=teamStats(base);
 const guard=teamStats(applyWorldAction(base,{type:'companionOrder',value:'guard'}));
 const support=teamStats(applyWorldAction(base,{type:'companionOrder',value:'support'}));
 const scout=teamStats(applyWorldAction(base,{type:'companionOrder',value:'scout'}));
 assert.ok(guard.health>normal.health);
 assert.ok(support.heal>normal.heal);
 assert.ok(scout.speed>normal.speed);
 assert.throws(()=>applyWorldAction(base,{type:'companionOrder',value:'teleport'}),/Ordre compagnon invalide/);
});

test('regional weather is deterministic and profiles constrain visibility',()=>{
 for(const region of ['hub','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne']){
  const a=worldWeatherForDate(region,'2026-09-19'),b=worldWeatherForDate(region,'2026-09-19');
  assert.equal(a,b);
  const p=weatherProfile(a);
  assert.ok(p.visibility>0&&p.visibility<=1);
  assert.ok(p.wind>=0&&p.wind<=1);
 }
});

test('Hub journal exposes all 20 missions with locks, optional metadata and summary',()=>{
 const save=blankSave(),rows=hubMissionJournal(save),summary=hubMissionSummary(save);
 assert.equal(rows.length,20);
 assert.equal(summary.total,20);
 assert.ok(rows.some(row=>row.locked));
 assert.ok(rows.some(row=>row.optional.length>0));
 assert.equal(rows.find(row=>row.id==='first_steps').locked,false);
});
