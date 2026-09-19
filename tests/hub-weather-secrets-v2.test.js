import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {hubWeatherFor} from '../src/world/hub/weather.js';
import {buildHubRuntimeItems} from '../src/world/hub/runtime.js';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url)),root=join(here,'..','src','world','hub','data');
const read=(name)=>JSON.parse(readFileSync(join(root,name),'utf8'));
const plan=read('hub-master-plan-v2.json'),npcs=read('npcs-v1.json'),missions=read('missions-v1.json'),events=read('events-v1.json'),secrets=read('secrets-v1.json');

test('Hub weather is deterministic inside a four-hour block',()=>{
 const a=hubWeatherFor(new Date('2026-09-19T12:10:00Z'));
 const b=hubWeatherFor(new Date('2026-09-19T15:59:00Z'));
 assert.equal(a,b);
 assert.ok(['clear','rain','heavy_rain','fog'].includes(a));
});

test('Archive Reverse secret only unlocks at the final First Echo objective',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'first_echo'});
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_archive_reverse'}),/conditions/);
 save=applyWorldAction(save,{type:'hubNpcTalk',id:'ines_varga'});
 save=applyWorldAction(save,{type:'hubDistrictVisit',id:'archives'});
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_archive_reverse'});
 assert.ok(save.hub.secrets.includes('secret_archive_reverse'));
 assert.equal(save.hub.missions.first_echo.status,'completed');
});

test('Abandoned quay requires a real boat transit',()=>{
 let save=applyWorldAction(blankSave(),{type:'hubMissionStart',id:'boat_without_flag'});
 assert.throws(()=>applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_abandoned_quay'}),/conditions/);
 save=applyWorldAction(save,{type:'hubTransit',id:'boat:docks'});
 save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_abandoned_quay'});
 assert.equal(save.hub.missions.boat_without_flag.status,'completed');
});

test('Panoramic train secret requires eight distinct train stops',()=>{
 let save=blankSave();
 const stops=['heritage_square','archives','community','gardens','docks','city3b_portal','commerce','arena'];
 for(const district of stops)save=applyWorldAction(save,{type:'hubTransit',id:'train:'+district});
 assert.doesNotThrow(()=>{save=applyWorldAction(save,{type:'hubSecretUnlock',id:'secret_train_window'});});
 assert.ok(save.hub.secrets.includes('secret_train_window'));
});

test('Client runtime hides locked secrets and materializes them when eligible',()=>{
 const locked=blankSave().hub;
 let runtime=buildHubRuntimeItems({plan,npcs,missions,events,secrets,profile:'desktop',hubState:locked});
 assert.equal(runtime.items.some(item=>item.secretId==='secret_abandoned_quay'),false);
 const eligible={...locked,transits:['boat:docks']};
 runtime=buildHubRuntimeItems({plan,npcs,missions,events,secrets,profile:'desktop',hubState:eligible});
 assert.equal(runtime.items.some(item=>item.secretId==='secret_abandoned_quay'),true);
});
