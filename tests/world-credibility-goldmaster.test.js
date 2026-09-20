// Consolidated visual credibility gate: any failure blocks the candidate branch.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_SCALE,buildingDimensions,facadeBayCount} from '../src/world/building-scale.js';
import {wetnessForWeather,advanceWetness} from '../src/world/wetness.js';
import {worldVisualCapabilities} from '../src/world/device-capabilities.js';
import {STREAMING_PROFILES,lodForDistanceHysteresis} from '../src/world/streaming.js';
import {cinematicEase,cinematicRiseProgress,cinematicReturnBlend} from '../src/world/cinematic-camera.js';
import {hubNpcSimulation} from '../src/world/hub/npc-motion.js';
import {metropolisRoadItems} from '../src/world/hub/metropolis.js';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const plan=JSON.parse(read('src/world/hub/data/hub-master-plan-v2.json'));

test('Gold Master credibility: scale, facade rhythm and skyline hierarchy stay believable',()=>{
 const regions=['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'];
 for(const region of regions)for(let variant=0;variant<5;variant++){
  const d=buildingDimensions(region,variant,true);
  const doorRatio=d.doorHeight/WORLD_SCALE.avatarHeight;
  assert.ok(doorRatio>=WORLD_SCALE.minDoorClearanceRatio&&doorRatio<=WORLD_SCALE.maxDoorClearanceRatio);
  for(const [face,span] of [d.width,d.depth].entries()){
   const bays=facadeBayCount(span,variant,face);
   assert.ok(bays>=3&&bays<=5);
  }
 }
 const metro=read('src/world/hub/metropolis.js');
 assert.match(metro,/GOLDEN_ANGLE/);
 assert.match(metro,/protectedVista=\['heritage_square','broken_circle_tower','docks'\]/);
 assert.match(metro,/Math\.min\(height,44\)/);
});

test('Gold Master credibility: water, weather and PBR retain their physical hierarchy',()=>{
 const water=read('src/world/premium-water.js'),waterfront=read('src/world/premium-waterfront.js'),surfaces=read('src/world/surfaces.js'),architecture=read('src/world/architecture.js');
 assert.match(water,/high:\{[^\n]*sceneReflection:\.72/);
 assert.match(water,/medium:\{[^\n]*sceneReflection:0/);
 assert.match(water,/contactFoam/);
 assert.match(water,/renderer\.render\(scene,mirrorCamera\)/);
 assert.match(waterfront,/foamContacts\.push/);
 assert.match(surfaces,/surfaceMaterialMaps/);
 assert.match(surfaces,/THREE\.NoColorSpace/);
 assert.match(architecture,/roughnessMap:maps\?\.roughnessMap/);
 assert.match(architecture,/ior:1\.46/);

 let wet=.06;for(let i=0;i<20;i++)wet=advanceWetness(wet,wetnessForWeather('storm'),.25);
 let dry=1;for(let i=0;i<20;i++)dry=advanceWetness(dry,wetnessForWeather('clear'),.25);
 assert.ok(wet>.85);
 assert.ok(dry>.55);
});

test('Gold Master credibility: NPCs move smoothly and the city changes routine',()=>{
 const scene=read('src/world/scene.js'),schedule=read('src/world/hub/npc-schedule.js');
 assert.match(scene,/actor\.controller\.update\(dt,mx,mz,moved\)/);
 assert.match(scene,/blend=1-Math\.exp\(-dt\*follow\)/);
 assert.match(schedule,/pause de midi/);
 assert.match(schedule,/abri météo/);
 assert.match(schedule,/promenade/);

 const worker={id:'hub:npc:test',npcId:'test',homeX:4,homeZ:-2,x:4,z:-2,activity:'travail'};
 const a=hubNpcSimulation(worker,10,{distance:10,weather:'clear'});
 assert.equal(a.moving,false);
 assert.ok(Math.hypot(a.x-worker.homeX,a.z-worker.homeZ)<.25);
});

test('Gold Master credibility: level design, VFX and cinematic camera avoid prototype patterns',()=>{
 const lanes=metropolisRoadItems(plan).filter(road=>road.kind==='lane');
 assert.equal(lanes.length,10);
 assert.ok(lanes.every(road=>road.width===6.5));

 const scene=read('src/world/scene.js'),post=read('src/world/postprocessing.js');
 assert.match(scene,/totalEmissiveRadiance\*=mix\(1\.12,\.48,sceneDaylight\)/);
 assert.match(scene,/float pulse=mix\(\.075,\.026,daylight\)/);
 assert.match(post,/streak\*\.045\*flare\*intensity/);

 assert.equal(cinematicEase(0),0);
 assert.equal(cinematicEase(1),1);
 assert.ok(cinematicRiseProgress(.1,{waterReveal:true})<.01);
 assert.equal(cinematicReturnBlend(.79,{waterReveal:true}),0);
 assert.equal(cinematicReturnBlend(1,{waterReveal:true}),1);
});

test('Gold Master credibility: LOD and mobile budgets fail safe instead of popping or overheating',()=>{
 const profile=STREAMING_PROFILES.auto;
 let lod=0;
 lod=lodForDistanceHysteresis(profile.near*1.03,profile,lod,.08);
 assert.equal(lod,0);
 lod=lodForDistanceHysteresis(profile.near*1.10,profile,lod,.08);
 assert.equal(lod,1);

 const phone=worldVisualCapabilities({mode:'detail',width:844,height:390,deviceMemory:8,coarsePointer:true});
 assert.equal(phone.allowPlanarReflection,false);
 assert.equal(phone.shadowMapSize,1024);
 const desktop=worldVisualCapabilities({mode:'detail',width:1440,height:900,deviceMemory:8,coarsePointer:false});
 assert.equal(desktop.allowPlanarReflection,true);
 assert.equal(desktop.shadowMapSize,2048);

 const water=read('src/world/premium-water.js');
 assert.match(water,/sceneReflection=allowPlanarReflection\?q\.sceneReflection:0/);
});
