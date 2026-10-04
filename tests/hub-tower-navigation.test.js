import test from 'node:test';
import assert from 'node:assert/strict';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {blankSave} from '../src/world/rules.js';
import {hubMapDestinations} from '../src/world/hub/cartography-model.js';
import {hubPhysicalItemsForLevel,towerDestinationReturnsGround} from '../src/world/hub/tower-navigation.js';

test('tower physical destinations switch levels without retaining hall chairs or exhibits',()=>{
 const hub=createHubPlatform(blankSave());
 try{
  const ground=hubPhysicalItemsForLevel(hub),chair=ground.find(i=>i.id==='hub:life:tower_circle:welcome-seat'),model=ground.find(i=>i.id==='hub:life:tower_circle:city-model');assert.ok(chair&&model);
  hub.setTowerFloor(2);const upper=hubPhysicalItemsForLevel(hub);assert.deepEqual(upper.map(i=>i.id),['hub:tower-lift','hub:tower-exhibit:2']);
  const atlas=hubMapDestinations([...worldRuntimeItems('hub',blankSave()),...upper]);assert.ok(!atlas.some(i=>i.id===chair.id||i.id===model.id));
  hub.setTowerFloor(null);const returned=hubPhysicalItemsForLevel(hub);assert.ok(returned.some(i=>i.id===chair.id)&&returned.some(i=>i.id===model.id));assert.ok(!returned.some(i=>i.id==='hub:tower-exhibit:2'));
 }finally{hub.dispose();}
});

test('named ground destinations return through the lift even when their X/Z lies in the upper room',()=>{
 const hub=createHubPlatform(blankSave());
 try{
  const ground=hubPhysicalItemsForLevel(hub),floor=hub.setTowerFloor(2),upper=hubPhysicalItemsForLevel(hub),building=worldRuntimeItems('hub',blankSave()).find(i=>i.buildingId==='tower_circle');
  for(const destination of [building,...ground.filter(i=>i.buildingId==='tower_circle'&&i.type==='hubLifeObject')])assert.equal(towerDestinationReturnsGround(destination,floor,upper),true,destination.id);
  for(const destination of upper)assert.equal(towerDestinationReturnsGround(destination,floor,upper),false,destination.id+' stays at the active floor');
  assert.equal(towerDestinationReturnsGround({x:floor.x+2,z:floor.z+2},floor,upper),false,'anonymous tap inside upper room stays upstairs');
  assert.equal(towerDestinationReturnsGround({x:floor.x+floor.width,z:floor.z},floor,upper),true,'anonymous tap outside upper room returns to ground');
  assert.equal(towerDestinationReturnsGround(building,null,ground),false,'ground navigation does not switch levels');
 }finally{hub.dispose();}
});
