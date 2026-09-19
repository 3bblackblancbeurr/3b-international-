import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';

test('Hub life actions persist talks, visits and transport rides',()=>{
 let save=blankSave();
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'ines_varga'});
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'ines_varga'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'archives'});
 save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'archives',to:'community',night:true,dateKey:'2026-09-19'});
 assert.equal(save.hub.stats.npcTalks.ines_varga,2);
 assert.deepEqual(save.hub.stats.districtVisits,['archives']);
 assert.equal(save.hub.stats.transportRides.train,1);
 assert.ok(save.hub.stats.transportStops.includes('train:community'));
 assert.ok(save.hub.stats.nightTrainDates.includes('2026-09-19'));
});

test('Hub life state rejects forged identifiers and normalizes unsafe values',()=>{
 let save=blankSave();
 assert.throws(()=>applyWorldAction(save,{type:'hubNpcTalk',id:'fake_npc'}),/Personnage Hub inconnu/);
 assert.throws(()=>applyWorldAction(save,{type:'hubTransportRide',transport:'plane',from:'archives',to:'community'}),/Transport Hub inconnu/);
 const normalized=normalizeSave({...save,hub:{...save.hub,stats:{npcTalks:{ines_varga:500,fake:8},districtVisits:['archives','fake'],transportRides:{train:5000,boat:-2},transportStops:['train:archives','plane:fake'],nightTrainDates:['2026-09-19','bad']}}});
 assert.equal(normalized.hub.stats.npcTalks.ines_varga,99);
 assert.equal(normalized.hub.stats.npcTalks.fake,undefined);
 assert.deepEqual(normalized.hub.stats.districtVisits,['archives']);
 assert.equal(normalized.hub.stats.transportRides.train,999);
 assert.equal(normalized.hub.stats.transportRides.boat,0);
 assert.deepEqual(normalized.hub.stats.transportStops,['train:archives']);
 assert.deepEqual(normalized.hub.stats.nightTrainDates,['2026-09-19']);
});

test('The last-train secret requires three distinct night ride dates',()=>{
 let save=blankSave();
 for(const dateKey of ['2026-09-17','2026-09-18','2026-09-19']){
  save=applyWorldAction(save,{type:'hubTransportRide',transport:'train',from:'docks',to:'city3b_portal',night:true,dateKey});
 }
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_last_train'});
 assert.ok(save.hub.secrets.includes('secret_last_train'));
});
