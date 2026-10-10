import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderLib} from 'three';
import {createCameraObstructionResolver,resolveCameraObstruction} from '../src/world/camera-obstruction.js';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';
import {REALM_PROVINCES,realmCivilianRoadItems,realmStaticObstacles} from '../src/world/realm-layout.js';
import {createCivilianRoutes,civilianRoutePoint,civilianRoutine,civilianHeading} from '../src/world/ambient-civilian-routes.js';
import {createQualityController} from '../src/world/motion.js';
import {obstacleDistance} from '../src/world/collision.js';

test('camera broad phase exactly preserves rotated walls, interior cutaways, cell crossings and live disabled gates',()=>{
 const solids=Array.from({length:900},(_,i)=>({x:(i%30-15)*13,z:(Math.floor(i/30)-15)*17,width:3+i%8,depth:2+i%9,bottom:i%3,top:12+i%17,rotation:i*.237}));
 const gate={x:-32,z:32,width:120,depth:2,bottom:0,top:20,rotation:.8};solids.push(gate,{x:0,z:0,width:2000,depth:2,bottom:0,top:30});
 const resolve=createCameraObstructionResolver(solids);
 for(let i=0;i<1400;i++){
  gate.enabled=i%3!==0;
  const target={x:Math.sin(i*.137)*240,y:i%21,z:Math.cos(i*.081)*260},eye={x:target.x+Math.sin(i*.3)*50,y:target.y+3+(i%6),z:target.z+Math.cos(i*.3)*50};
  assert.deepEqual(resolve(target,eye,.45),resolveCameraObstruction(target,eye,solids,.45),'Identical wall clipping at camera sample '+i);
 }
 for(const [target,eye] of [[{x:NaN,y:1,z:0},{x:2,y:1,z:0}],[{x:-900,y:3,z:-900},{x:900,y:8,z:900}],[{x:0,y:3,z:0},{x:0,y:3,z:0}]])assert.deepEqual(resolve(target,eye),resolveCameraObstruction(target,eye,solids));
 const old={x:0,y:3,z:0},eye={x:0,y:4,z:20},fresh=createCameraObstructionResolver([{x:0,z:10,width:5,depth:3,bottom:0,top:12}]);
 assert.notDeepEqual(fresh(old,eye),createCameraObstructionResolver()(old,eye),'A rebuilt district has its own collision index');
});

test('the camera rejects remote scenery once and keeps a bounded nearby set while running',()=>{
 const solids=Array.from({length:2500},(_,i)=>({x:(i%50)*20,z:Math.floor(i/50)*20,width:6,depth:7,bottom:0,top:15})),resolve=createCameraObstructionResolver(solids);
 for(let i=0;i<600;i++){const target={x:10+i*.04,y:3,z:10},eye={x:target.x+8,y:8,z:26};resolve(target,eye);assert.ok(resolve.diagnostics.candidates<=20,'No full-world camera scan each frame');}
});

test('all eight realms have three reusable domestic identities inside the existing building and rendering budgets',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const architecture=createRealmArchitecture(region),owned=new Map();
  try{
   for(const floors of [1,2]){
    const homes=[0,1,2].map(variant=>architecture.house(floors,variant));
    assert.equal(new Set(homes).size,3);
    assert.equal(new Set(homes.map(g=>g.attributes.position.count)).size,3,'Canopies and planters change real geometry');
    for(const [variant,g] of homes.entries()){
     assert.equal(architecture.house(floors,variant),g,'Repeated houses share geometry');assert.equal(g.groups.length,0);assert.ok(g.index.count/3<=5000);assert.ok(g.attributes.position.count<g.index.count*.8,'Indexed meshes reduce attribute storage');
     assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<15&&g.boundingBox.max.z-g.boundingBox.min.z<14);
     for(const a of Object.values(g.attributes))assert.ok([...a.array].every(Number.isFinite));
     const windows=g.attributes.realmWindow.array;assert.ok(windows.some(v=>v>0)&&windows.some(v=>v===0));
     owned.set(g,0);g.addEventListener('dispose',()=>owned.set(g,owned.get(g)+1));
    }
    assert.notDeepEqual(homes[0].attributes.color.array.slice(250,600),homes[2].attributes.color.array.slice(250,600),'Garden homes carry a distinct facade tint');
   }
  }finally{architecture.dispose();architecture.dispose();}
  for(const count of owned.values())assert.equal(count,1);
 }
});

test('night windows follow daylight without extra lamps, textures or shader recompilation',()=>{
 const architecture=createRealmArchitecture('france'),material=architecture.material,shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
 try{
  architecture.setDaylight(.18);material.onBeforeCompile(shader);assert.ok(shader.uniforms.villageNight.value>.7);
  const version=material.version,key=material.customProgramCacheKey(),textures=[material.map,material.normalMap,material.roughnessMap];
  architecture.setDaylight(1);assert.equal(shader.uniforms.villageNight.value,0);
  architecture.setDaylight(.4);assert.ok(shader.uniforms.villageNight.value>0&&shader.uniforms.villageNight.value<.7);
  assert.equal(material.version,version);assert.equal(material.customProgramCacheKey(),key);assert.deepEqual([material.map,material.normalMap,material.roughnessMap],textures);
  assert.match(shader.vertexShader,/vRealmWindow=realmWindow/);assert.match(shader.fragmentShader,/totalEmissiveRadiance\+=villageWindowColor/);
 }finally{architecture.dispose();}
});

test('village routes include actual side walks and crossings with clearance for paired residents',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const obstacles=realmStaticObstacles(region),routes=createCivilianRoutes(realmCivilianRoadItems(region),{obstacles});
  assert.ok(routes.some(r=>Math.abs(r.to.z-r.from.z)<.01));assert.ok(routes.some(r=>r.id.includes(':promenade:')));
  for(const route of routes)for(const offset of [-.85,0,.85])for(let i=0;i<=60;i++){
   const p=civilianRoutePoint(route,i/60,offset);
   // The runtime yields to the already validated centre if a lateral lane
   // approaches furniture. Both pathways must remain physically clear.
   const actual=route.obstacles.some(o=>obstacleDistance(p,o)<.5)?civilianRoutePoint(route,i/60):p;
   assert.ok(obstacles.every(o=>obstacleDistance(actual,o)>.35),region+' safe village resident path');
  }
 }
});

test('residents brake continuously, face a companion or visitor, then turn before resuming their route',()=>{
 const agent={route:{from:{x:0,z:0},to:{x:0,z:20},length:20},speed:1,pause:4,phase:0,offset:.85,social:true};
 const dt=.0001;
 for(const time of [.1,.4,1,10,19.5,19.9,20,22,24,24.1,30,43.9,44]){
  const pose=civilianRoutine(agent,time),next=civilianRoutine(agent,time+dt),speed=Math.hypot(next.x-pose.x,next.z-pose.z)/dt;
  assert.ok(Math.abs(speed-pose.speed)<.001,'Rendered position and interpolation velocity agree at '+time);
 }
 const stopped=civilianRoutine(agent,22),peer={...agent,offset:-.85},peerPose=civilianRoutine(peer,22);
 const heading=civilianHeading(agent,stopped,null),peerHeading=civilianHeading(peer,peerPose,null);
 assert.ok(Math.sin(heading)>.99&&Math.sin(peerHeading)<-.99,'Companions face each other across their lanes');
 const visitor={x:stopped.x,z:stopped.z-3};assert.ok(Math.cos(civilianHeading(agent,stopped,visitor))<-.99);
 const before=civilianHeading(agent,civilianRoutine(agent,24-dt),null),after=civilianHeading(agent,civilianRoutine(agent,24+dt),null);
 assert.ok(Math.abs(Math.sin(before)-Math.sin(after))<.001&&Math.abs(Math.cos(before)-Math.cos(after))<.001,'No snapped half turn on departure');
 assert.equal(civilianHeading(agent,stopped,visitor,false),0,'Reduced motion freezes idle turning');
});


test('automatic quality still reduces rendering load below one frame per second and ignores invalid samples',()=>{
 const q=createQualityController('auto'),ratio=()=>q.ratio(1280,800,1),start=ratio();
 assert.equal(Math.round(1/3),0,'The old display label loses a real slow-frame sample');
 assert.equal(q.sampleFrames(1,3),true);assert.ok(ratio()<start,'A multi-second frame must trigger load reduction');
 for(let i=0;i<8;i++)q.sampleFrames(1,3);assert.equal(ratio(),.6,'Repeated stalls reach the existing lower bound');
 for(const [frames,seconds] of [[0,3],[-1,3],[NaN,3],[1,0],[1,Infinity],[1,-3]])assert.equal(q.sampleFrames(frames,seconds),false);
 for(let i=0;i<12;i++)q.sampleFrames(60,1);assert.ok(ratio()>.6,'Sustained recovery still restores quality gradually');
 const fluid=createQualityController('fluid');assert.equal(fluid.sampleFrames(1,3),false,'Explicit user quality remains fixed');
});
