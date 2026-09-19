import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildHubLayout,HUB_RADIUS,hubDistrictAt,nextStop} from '../src/world/hub/runtime-core.js';
import {applyHubEvent,blankHubProgress,normalizeHubProgress,startHubMission} from '../src/world/hub/mission-runtime.js';
import {deriveHubSecrets,evaluateHubEvents} from '../src/world/hub/living-world.js';
import {WORLDS} from '../src/world/origins/data.js';
import {clear,route} from '../src/world/origins/space.js';

const json=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const plan=json('src/world/hub/data/hub-master-plan-v2.json');
const npcs=json('src/world/hub/data/npcs-v1.json');
const missions=json('src/world/hub/data/missions-v1.json');
const events=json('src/world/hub/data/events-v1.json');
const secrets=json('src/world/hub/data/secrets-v1.json');
const layout=buildHubLayout(plan,npcs,missions);

test('living hub turns canonical data into a bounded runtime layout',()=>{
  assert.equal(layout.districts.length,10);
  assert.equal(layout.buildings.length,19);
  assert.equal(layout.npcs.length,24);
  assert.equal(layout.missions.length,20);
  assert.equal(layout.trainStations.length,10);
  assert.equal(layout.boatStops.length,5);
  assert.equal(layout.ziplines.length,6);
  assert.equal(new Set(layout.buildings.map(x=>x.id)).size,layout.buildings.length);
  for(const item of [...layout.districts,...layout.buildings,...layout.npcs])assert.ok(Math.hypot(item.x,item.z)<HUB_RADIUS,'inside playable hub: '+item.id);
  assert.equal(hubDistrictAt(layout,layout.districtById.archives)?.id,'archives');
  assert.equal(nextStop(layout.trainStations,layout.trainStations.at(-1).id).id,layout.trainStations[0].id);
});

test('first playable mission advances from real hub events and persists rewards',()=>{
  let progress=blankHubProgress();
  progress=startHubMission(progress,'first_steps',missions).progress;
  assert.equal(progress.active,'first_steps');
  progress=applyHubEvent(progress,{type:'visit',id:'heritage_welcome'},missions).progress;
  assert.equal(progress.missions.first_steps.step,1);
  progress=applyHubEvent(progress,{type:'ride_train'},missions).progress;
  assert.equal(progress.missions.first_steps.step,2);
  const result=applyHubEvent(progress,{type:'arrive',id:'heritage_square'},missions);
  progress=result.progress;
  assert.equal(progress.active,null);
  assert.ok(progress.completed.includes('first_steps'));
  assert.ok(progress.xp>0);
  assert.equal(progress.rides.train,1);
  const restored=normalizeHubProgress(JSON.parse(JSON.stringify(progress)),missions);
  assert.deepEqual(restored.completed,progress.completed);
  assert.equal(restored.xp,progress.xp);
});

test('sanctuary navigation is expanded for the City while preserving a hard world boundary',()=>{
  assert.equal(clear({x:0,z:80},'sanctuary',{}),true);
  assert.equal(clear({x:0,z:HUB_RADIUS+2},'sanctuary',{}),false);
  const extra=[{x:0,z:60,w:14,d:14,h:10,angle:0}];
  const path=route({x:-10,z:60},{x:10,z:60},'sanctuary',{},extra);
  assert.ok(path.length>1);
});

test('Origins values and guardians follow the canonical eight-country direction',()=>{
  const byId=Object.fromEntries(WORLDS.map(w=>[w.id,w]));
  assert.deepEqual(
    ['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].map(id=>[id,byId[id].guardian,byId[id].value]),
    [
      ['france','Céliane','Justice'],['algerie','Yliane','Loyauté'],['maroc','Naël','Noblesse'],['tunisie','Soraya','Courage'],
      ['espagne','Diego','Passion'],['italie','Alessio','Espoir'],['turquie','Émir','Foi'],['estonie','Eira','Sagesse']
    ]
  );
});


test('living-world events are deterministic and weather events stay disabled without weather input',()=>{
  const date=new Date('2026-09-19T21:00:00');
  const active=evaluateHubEvents(events,{date,progress:{completed:['first_steps','first_echo','rooftops_circle']}});
  assert.ok(active.some(e=>e.id==='market_night'));
  assert.ok(active.some(e=>e.id==='power_flicker'));
  assert.equal(active.some(e=>e.id==='heavy_rain_echo'),false);
  assert.equal(active.some(e=>e.id==='dock_fog'),false);
});

test('a completed boat-without-flag mission unlocks its canonical abandoned-quay secret once',()=>{
  const first=deriveHubSecrets(secrets,{completed:['boat_without_flag'],secrets:[]});
  assert.deepEqual(first.ids,['secret_abandoned_quay']);
  assert.equal(first.unlocked.length,1);
  const second=deriveHubSecrets(secrets,{completed:['boat_without_flag'],secrets:first.ids});
  assert.equal(second.unlocked.length,0);
});
