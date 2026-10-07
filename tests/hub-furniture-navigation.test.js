import test from 'node:test';
import assert from 'node:assert/strict';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave,moveWithCollision} from '../src/world/rules.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {findInteractionPath} from '../src/world/navigation.js';
import {obstacleDistance} from '../src/world/collision.js';

test('conversation guidance approaches a resident without overlapping them or moving an already close player',()=>{
 const resident={type:'hubNpc',x:12,z:8,range:7};
 const far={x:2,z:8},near={x:10,z:8};
 const end=findInteractionPath(far,resident,[],600).at(-1);
 assert.ok(Math.hypot(end.x-resident.x,end.z-resident.z)>2.5);
 assert.ok(Math.hypot(end.x-resident.x,end.z-resident.z)<resident.range);
 assert.deepEqual(findInteractionPath(near,resident,[],600).at(-1),near);
});

test('guidance can leave a reading table after physically valid manual steps towards its edge',()=>{
 const hub=createHubPlatform(blankSave());
 try{
  const read=hub.lifeItems.find(i=>i.id==='hub:life:mission_hotel:dispatch-desk');
  const examine=hub.lifeItems.find(i=>i.id==='hub:life:tower_circle:city-model');
  let position={x:read.x,z:read.z};
  for(let i=0;i<12;i++)position=moveWithCollision(position,.1,0,hub.collisions,HUB_PLATFORM.walkRadius);
  const clearance=Math.min(...hub.collisions.map(o=>obstacleDistance(position,o)));
  assert.ok(clearance>=.7&&clearance<.75,'real walking stops beside the physical desk');
  const path=findInteractionPath(position,examine,hub.collisions,HUB_PLATFORM.walkRadius);
  assert.ok(path.length>1,'a valid reading exit connects to the real city route');
  assert.ok(Math.hypot(path.at(-1).x-examine.x,path.at(-1).z-examine.z)<=examine.range);
  let from=position;
  for(const [index,to] of path.entries()){
   const steps=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.1);
   for(let step=1;step<=steps;step++){
    const p={x:from.x+(to.x-from.x)*step/steps,z:from.z+(to.z-from.z)*step/steps};
    assert.ok(hub.collisions.every(o=>obstacleDistance(p,o)>=(index===0?.7:1.25)-.00001),'the departure and remaining route never enter furniture, walls or water');
   }
   from=to;
  }
 }finally{hub.dispose();}
});

test('departure cannot rescue a position embedded inside a real table',()=>{
 const hub=createHubPlatform(blankSave());
 try{
  const desk=hub.collisions.find(o=>o.id==='interior:mission_hotel:dispatch-desk');
  const examine=hub.lifeItems.find(i=>i.id==='hub:life:tower_circle:city-model');
  assert.deepEqual(findInteractionPath({x:desk.x,z:desk.z},examine,hub.collisions,HUB_PLATFORM.walkRadius),[]);
 }finally{hub.dispose();}
});
