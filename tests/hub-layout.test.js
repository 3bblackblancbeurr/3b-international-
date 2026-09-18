import test from 'node:test';
import assert from 'node:assert/strict';
import {BOAT_ROUTE,DISTRICT_LAYOUT,HUB_BOUNDS,PORTAL_LAYOUT,TIER_ZERO_BUILDINGS,TRAIN_TRACK,travelSeconds,validateHubLayout} from '../src/world/living-world/hub-layout.js';

test('hub blockout is substantially larger than the current small platform target',()=>{
 assert.ok(HUB_BOUNDS.width>=1500);
 assert.ok(HUB_BOUNDS.depth>=1200);
 assert.ok(Object.keys(DISTRICT_LAYOUT).length>=9);
});

test('eight portals are distributed around the city instead of a circle cluster',()=>{
 const portals=Object.values(PORTAL_LAYOUT);
 assert.equal(portals.length,8);
 for(let i=0;i<portals.length;i++)for(let j=i+1;j<portals.length;j++)assert.ok(Math.hypot(portals[i].x-portals[j].x,portals[i].z-portals[j].z)>=180);
});

test('tier-zero blockout contains the eight production priorities',()=>{
 assert.equal(TIER_ZERO_BUILDINGS.length,8);
 assert.ok(TIER_ZERO_BUILDINGS.some(building=>building.id==='building-broken-circle-tower'));
 assert.ok(TIER_ZERO_BUILDINGS.some(building=>building.id==='building-france-gate'));
 assert.ok(TIER_ZERO_BUILDINGS.some(building=>building.id==='building-algeria-gate'));
});

test('train and boat routes are closed and provide a real speed advantage',()=>{
 assert.deepEqual(TRAIN_TRACK[0],TRAIN_TRACK.at(-1));
 assert.equal(BOAT_ROUTE[0].stop,'docks');
 assert.equal(BOAT_ROUTE.at(-1).stop,'docks');
 const docks=DISTRICT_LAYOUT.docks,archives=DISTRICT_LAYOUT.archives;
 assert.ok(travelSeconds(docks,archives,'train')<travelSeconds(docks,archives,'walk'));
 assert.ok(travelSeconds(docks,DISTRICT_LAYOUT['city-3b'],'boat')<travelSeconds(docks,DISTRICT_LAYOUT['city-3b'],'walk'));
});

test('hub layout passes structural validation',()=>{
 assert.deepEqual(validateHubLayout(),[]);
});
