import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {createRealmEffects,createRealmMarker} from '../src/world/realm-effects.js';

test('realm travel, active campaign and map sites appear together at their physical coordinates',()=>{
 const save=applyWorldAction(blankSave(),{type:'visit',region:'france'}),items=worldRuntimeItems('france',save),objective=items.find(item=>item.type==='campaignObjective'),current=campaignSnapshot(save,'france');
 assert.equal(items.filter(item=>item.type==='realmTravel').length,18);
 assert.equal(items.filter(item=>item.type==='realmSite').length,17);
 assert.equal(objective.id,current.objective);assert.equal(objective.x,current.target.x);assert.equal(objective.z,current.target.z);
 assert.ok(Math.hypot(objective.x,objective.z)>500,'active story is placed in a real expanded province');
});
test('objective markers move with an escorted group and dispose owned graphics without changing a save',()=>{
 const point={id:'group',type:'campaignObjective',mode:'escort',x:1000,z:2000},marker=createRealmMarker(point,{groundY:()=>7});
 marker.update({...point,x:1020,z:2020});marker.tick(1,{x:1022,z:2022});
 assert.deepEqual(marker.root.position.toArray(),[1020,7,2020]);assert.equal(marker.root.visible,true);
 marker.tick(2,{x:0,z:0});assert.equal(marker.root.visible,false);
 const scene=new THREE.Scene();scene.add(marker.root);marker.dispose();assert.equal(scene.children.length,0);
});
test('boss presentation displays actual decoy positions and reliable anchor rather than invented hits',()=>{
 const effect=createRealmEffects('estonie',{groundY:()=>0,reducedMotion:true}),encounter={boss:true,region:'estonie',field:{home:{x:100,z:100},phase:'windup'},enemy:100};
 effect.tick(0,{encounter,player:{x:104,z:100},focus:{x:100,z:100},presentation:{index:2,decoys:[{x:96,z:100},{x:104,z:100}]}});
 const echoes=effect.root.children.filter(child=>child.geometry?.type==='CapsuleGeometry');
 assert.equal(echoes.filter(echo=>echo.visible).length,2);assert.equal(echoes[0].position.x,-4);assert.equal(echoes[1].position.x,4);assert.equal(effect.root.userData.state.phase,2);
 assert.equal(encounter.enemy,100);effect.dispose();
});
test('campaign actions announce real memory and guardian changes through the existing cinematic ledger',()=>{
 const before=applyWorldAction(blankSave(),{type:'visit',region:'france'}),after=structuredClone(before);after.beacons=['france:0'];
 const memory=worldCinematicEvents(before,after,{type:'campaignAction',region:'france',operation:'interact'});
 assert.equal(memory.find(event=>event.kind==='memory-fragment')?.key,'memory:france:0');
 after.adventure.encounter={boss:true,region:'france',card:'C165'};
 assert.equal(worldCinematicEvents(before,after,{type:'campaignAction',region:'france'}).find(event=>event.kind==='guardian-intro')?.key,'intro:france:C165:adventure');
});
