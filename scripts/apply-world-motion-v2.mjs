import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,content)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content.endsWith('\n')?content:`${content}\n`);};
const replaceExact=(source,oldValue,newValue,label)=>{
 if(source.includes(newValue))return source;
 if(!source.includes(oldValue))throw new Error(`World Motion V2: motif introuvable pour ${label}`);
 return source.replace(oldValue,newValue);
};

const motion=`import {distance,moveWithCollision} from './rules.js';

// Consume distance in small collision steps. Arrival uses the remaining distance,
// so a slow frame cannot skip a waypoint or alternate around the destination.
export function advanceMotion(state,input,seconds,speed,obstacles,radius=76,moveStep=moveWithCollision){
 let {position,target}=state,route=state.route,travelled=0;
 const length=Math.hypot(input.x,input.z),manual=length>1e-5;
 if(manual){target=null;route=[];}
 let budget=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25))*speed*(manual?Math.min(length,1):1);
 while(budget>1e-7&&(manual||target)){
  const d=manual?Infinity:distance(position,target);
  if(d<1e-5){target=route[0]||null;route=route.slice(1);continue;}
  const step=Math.min(budget,.12,d);
  const dx=manual?input.x/length:(target.x-position.x)/d;
  const dz=manual?input.z/length:(target.z-position.z)/d;
  const next=moveStep(position,dx*step,dz*step,obstacles,radius),moved=distance(next,position);
  budget-=step;travelled+=moved;position=next;
  if(moved<1e-7){if(!manual){target=null;route=[];}break;}
 }
 if(target&&distance(position,target)<1e-5){target=route[0]||null;route=route.slice(1);}
 return {position,target,route,travelled,moving:travelled>1e-5};
}

export function createMotionSmoother({acceleration=14,deceleration=20,epsilon=.012}={}){
 let x=0,z=0;
 const reset=()=>{x=0;z=0;};
 return {
  update(input={x:0,z:0},seconds=0){
   const dt=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25));
   let tx=Number.isFinite(input.x)?input.x:0,tz=Number.isFinite(input.z)?input.z:0;
   const targetLength=Math.hypot(tx,tz);
   if(targetLength>1){tx/=targetLength;tz/=targetLength;}
   const hasIntent=Math.hypot(tx,tz)>epsilon,rate=hasIntent?acceleration:deceleration;
   const blend=1-Math.exp(-Math.max(0,rate)*dt);
   x+=(tx-x)*blend;z+=(tz-z)*blend;
   if(!hasIntent&&Math.hypot(x,z)<epsilon)reset();
   const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
   return {x,z};
  },
  reset,
  value(){return{x,z};}
 };
}

export function pointerStick(dx,dy,{deadZone=10,maxRadius=72,exponent=1.22}={}){
 const length=Math.hypot(dx,dy);
 if(length<=deadZone)return {x:0,z:0};
 const linear=Math.min(1,(length-deadZone)/Math.max(1,maxRadius-deadZone));
 const strength=Math.pow(linear,exponent);
 return {x:dx/length*strength,z:dy/length*strength};
}

export const QUALITY_MODES=['auto','fluid','detail'];
export function createQualityController(mode='auto'){
 let value=1,slow=0,fast=0;
 return {
  profile(){return mode==='fluid'||mode==='auto'&&value<=.7?'light':'high';},
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=1;slow=fast=0;},
  ratio(width,height,dpr=1){
   const cap=mode==='fluid'?1:1.75;
   const pixels=mode==='fluid'?850000:3000000;
   return Math.max(.5,Math.min(dpr,cap,Math.sqrt(pixels/Math.max(1,width*height)))*(mode==='auto'?value:1));
  },
  sample(fps,seconds){
   if(mode!=='auto'||!Number.isFinite(fps)||fps<=0||!Number.isFinite(seconds)||seconds<=0)return false;
   seconds=Math.min(seconds,2);
   slow=fps<45?slow+seconds:0;fast=fps>57?fast+seconds:0;
   if(slow>=2&&value>.6){value=Math.max(.6,value-.12);slow=fast=0;return true;}
   if(fast>=12&&value<1){value=Math.min(1,value+.06);slow=fast=0;return true;}
   return false;
  }
 };
}
`;
write('src/world/motion.js',motion);

const cameraFollow=`import {cameraRelative} from './orbit.js';

export const CAMERA_FOLLOW_RESUME_SECONDS=.55;
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function createMovementFrame(){
 let basis=null;
 return {reset(){basis=null;},resolve(x,z,yaw){
  if(Math.hypot(x,z)<=1e-5){basis=null;return{x:0,z:0};}
  if(basis===null)basis=yaw;
  return cameraRelative(x,z,basis);
 }};
}

export function followMovement(orbit,dx,dz,dt,{enabled=true,manual=false,quietFor=Infinity,reducedMotion=false}={}){
 if(!enabled||manual||quietFor<CAMERA_FOLLOW_RESUME_SECONDS||Math.hypot(dx,dz)<1e-5)return orbit;
 const desired=Math.atan2(-dx,-dz),delta=angleDelta(orbit.yaw,desired);
 if(Math.abs(delta)<.004)return orbit;
 const seconds=Math.min(dt,.25),response=reducedMotion?3.2:5.2,maxSpeed=reducedMotion?1.25:2.35;
 const step=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-seconds*response)),seconds*maxSpeed);
 return {...orbit,yaw:orbit.yaw+step};
}

export function viewBearing(cameraPosition,target){
 return Math.atan2(cameraPosition.x-target.x,cameraPosition.z-target.z);
}
`;
write('src/world/camera-follow.js',cameraFollow);

let scene=read('src/world/scene.js');
scene=replaceExact(scene,"import {advanceMotion,pointerStick,createQualityController} from './motion.js';","import {advanceMotion,pointerStick,createQualityController,createMotionSmoother} from './motion.js';",'import du contrôleur de mouvement');
scene=replaceExact(scene," let qualityMode='auto',cameraFollow=true,manualCameraAt=-Infinity,travelTimer=null;"," let qualityMode='auto',cameraFollow=true,manualCameraAt=-Infinity,travelTimer=null,routeSprintUntil=0,lastGroundTapAt=-Infinity,lastCameraTapAt=-Infinity;",'état tactile et sprint');
scene=replaceExact(scene," const movementFrame=createMovementFrame();"," const movementFrame=createMovementFrame(),motionSmoother=createMotionSmoother();",'initialisation locomotion');
scene=replaceExact(scene," function startRoute(destination,interaction=false){route=(interaction?findInteractionPath:findPath)(position,destination,obstacles,WORLD_RADIUS);target=route.shift()||null;needsRender=true;}"," function startRoute(destination,interaction=false,run=false){motionSmoother.reset();route=(interaction?findInteractionPath:findPath)(position,destination,obstacles,WORLD_RADIUS);target=route.shift()||null;routeSprintUntil=run?performance.now()+2200:0;needsRender=true;}",'route intelligente');
scene=replaceExact(scene," function clearInput(){keys.clear();stick={x:0,z:0};held=null;orbitHeld=null;touchPoints.clear();pinchDistance=null;target=null;route=[];movementFrame.reset();}"," function clearInput(){keys.clear();stick={x:0,z:0};held=null;orbitHeld=null;touchPoints.clear();pinchDistance=null;target=null;route=[];routeSprintUntil=0;movementFrame.reset();motionSmoother.reset();}",'réinitialisation locomotion');
scene=replaceExact(scene,"  const rect=canvas.getBoundingClientRect(),cameraTouch=e.pointerType==='touch'&&e.clientX-rect.left>rect.width*.55;","  const rect=canvas.getBoundingClientRect(),cameraTouch=e.pointerType==='touch'&&e.clientX-rect.left>=rect.width*.52;",'séparation des zones tactiles');
scene=replaceExact(scene,"  if(!held||held.id!==e.pointerId)return;const dx=e.clientX-held.x,dy=e.clientY-held.y,len=Math.hypot(dx,dy);if(len>7)held.drag=true;held.run=len>88;stick=pointerStick(dx,dy);onActivity();","  if(!held||held.id!==e.pointerId)return;const dx=e.clientX-held.x,dy=e.clientY-held.y,len=Math.hypot(dx,dy);if(len>10)held.drag=true;held.run=len>68;stick=pointerStick(dx,dy);onActivity();",'joystick flottant');
scene=replaceExact(scene," function pointRoute(e){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(landscape.ground,false)[0];if(hit){const p=hit.point,r=Math.hypot(p.x,p.z),scale=Math.min(1,(WORLD_RADIUS-2)/r);startRoute({x:p.x*scale,z:p.z*scale});}}"," function pointRoute(e,run=false){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(landscape.ground,false)[0];if(hit){const p=hit.point,r=Math.hypot(p.x,p.z),scale=Math.min(1,(WORLD_RADIUS-2)/r);startRoute({x:p.x*scale,z:p.z*scale},false,run);}}",'tap-to-move sprint');
scene=replaceExact(scene,` function up(e){
  rememberCamera();
  if(touchPoints.has(e.pointerId)){if(orbitHeld?.id===e.pointerId&&!orbitHeld.drag&&e.type==='pointerup'&&e.pointerType==='touch')pointRoute(e);touchPoints.delete(e.pointerId);pinchDistance=null;if(orbitHeld?.id===e.pointerId){const next=[...touchPoints.entries()][0];orbitHeld=next?{id:next[0],x:next[1].x,y:next[1].y,startX:next[1].x,startY:next[1].y,drag:true}:null;}return;}
  if(!held||held.id!==e.pointerId)return;if(!held.drag&&!paused&&e.type==='pointerup')pointRoute(e);held=null;stick={x:0,z:0};
 }`,` function up(e){
  rememberCamera();
  if(touchPoints.has(e.pointerId)){
   const cameraTap=orbitHeld?.id===e.pointerId&&!orbitHeld.drag&&e.type==='pointerup'&&e.pointerType==='touch',tappedAt=performance.now();
   if(cameraTap){if(tappedAt-lastCameraTapAt<320){manualCameraAt=-Infinity;cameraFollow=true;try{localStorage.setItem('3b-world-camera-follow','true');}catch{}needsRender=true;}lastCameraTapAt=tappedAt;}
   touchPoints.delete(e.pointerId);pinchDistance=null;if(orbitHeld?.id===e.pointerId){const next=[...touchPoints.entries()][0];orbitHeld=next?{id:next[0],x:next[1].x,y:next[1].y,startX:next[1].x,startY:next[1].y,drag:true}:null;}return;
  }
  if(!held||held.id!==e.pointerId)return;
  if(!held.drag&&!paused&&e.type==='pointerup'){const tappedAt=performance.now(),run=tappedAt-lastGroundTapAt<320;lastGroundTapAt=tappedAt;pointRoute(e,run);}
  held=null;stick={x:0,z:0};
 }`,'fin des gestes tactiles');
scene=replaceExact(scene,`   dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
   dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
   ({x:dx,z:dz}=movementFrame.resolve(dx,dz,viewBearing(camera.position,cameraTarget)));
   const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(keys.has('shift')||held?.run?1.4:1),obstacles,WORLD_RADIUS);`,`   dx=stick.x+((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('q')||keys.has('arrowleft'))?1:0);
   dz=stick.z+((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('z')||keys.has('arrowup'))?1:0);
   const rawInput=movementFrame.resolve(dx,dz,viewBearing(camera.position,cameraTarget));
   ({x:dx,z:dz}=motionSmoother.update(rawInput,dt));
   const sprinting=keys.has('shift')||held?.run||target&&routeSprintUntil>now;
   const previous=position,next=advanceMotion({position,target,route},{x:dx,z:dz},dt,10.5*stats.speed*(sprinting?1.4:1),obstacles,WORLD_RADIUS);`,'lissage de la locomotion');
write('src/world/scene.js',scene);

let motionTest=read('tests/world-motion.test.js');
motionTest=replaceExact(motionTest,"import {advanceMotion,pointerStick,createQualityController} from '../src/world/motion.js';","import {advanceMotion,pointerStick,createQualityController,createMotionSmoother} from '../src/world/motion.js';",'import test locomotion');
if(!motionTest.includes('motion smoothing is frame-rate independent'))motionTest+=`

test('motion smoothing is frame-rate independent and preserves precise stops',()=>{
 const samples=[];
 for(const fps of [30,60,120]){const controller=createMotionSmoother();let value;for(let i=0;i<fps/2;i++)value=controller.update({x:1,z:0},1/fps);samples.push(value.x);}
 assert.ok(Math.max(...samples)-Math.min(...samples)<1e-10);
 const controller=createMotionSmoother(),started=controller.update({x:1,z:0},1/60);assert.ok(started.x>0&&started.x<1);
 const released=controller.update({x:0,z:0},1/60);assert.ok(released.x>0&&released.x<started.x);
 for(let i=0;i<60;i++)controller.update({x:0,z:0},1/60);assert.deepEqual(controller.value(),{x:0,z:0});
 controller.update({x:1,z:1},1);assert.ok(Math.hypot(controller.value().x,controller.value().z)<=1+1e-12);controller.reset();assert.deepEqual(controller.value(),{x:0,z:0});
});

test('floating joystick offers precision near centre and full sprint at a comfortable radius',()=>{
 assert.deepEqual(pointerStick(9,0),{x:0,z:0});
 const precise=pointerStick(24,0),running=pointerStick(72,0);assert.ok(precise.x>0&&precise.x<.3);assert.equal(running.x,1);
});
`;
write('tests/world-motion.test.js',motionTest);

write('tests/camera-follow.test.js',`import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMERA_FOLLOW_RESUME_SECONDS,angleDelta,followMovement} from '../src/world/camera-follow.js';

test('camera follow resumes quickly after a deliberate manual look',()=>{
 const orbit={yaw:0};
 assert.equal(CAMERA_FOLLOW_RESUME_SECONDS,.55);
 assert.deepEqual(followMovement(orbit,1,0,1/60,{quietFor:.54}),orbit);
 const resumed=followMovement(orbit,1,0,1/60,{quietFor:.56});assert.ok(resumed.yaw<0);
 assert.deepEqual(followMovement(orbit,1,0,1/60,{quietFor:10,manual:true}),orbit);
});

test('camera follow remains bounded and takes the shortest angular path',()=>{
 assert.ok(Math.abs(angleDelta(Math.PI-.05,-Math.PI+.05)-.1)<1e-10);
 const fast=followMovement({yaw:0},1,0,.25,{quietFor:10}),reduced=followMovement({yaw:0},1,0,.25,{quietFor:10,reducedMotion:true});
 assert.ok(Math.abs(fast.yaw)<=.25*2.35+1e-12);assert.ok(Math.abs(reduced.yaw)<=.25*1.25+1e-12);
});
`);

write('docs/3B_AAA_MASTER/03_GAMEPLAY_CONTROLES_CAMERA.md',`# 3B AAA MASTER — Gameplay, contrôles et caméra

## Statut

Lot **World Motion V2** implémenté sur une branche dédiée.

## Décisions appliquées

- Joystick flottant dynamique à gauche : zone morte de 10 px, réponse progressive, pleine course à 72 px.
- Tap gauche : pathfinding existant. Double tap : sprint de trajet limité.
- Zone droite réservée à la caméra ; un tap droit ne lance plus de trajet.
- Double tap droit : reprise immédiate du suivi automatique.
- Accélération et décélération exponentielles indépendantes du FPS.
- Reprise du suivi caméra après 0,55 seconde au lieu de 1,4 seconde.

## Critères d’acceptation

- Aucun mouvement involontaire pendant une rotation caméra.
- Arrêt court et naturel sans glissement prolongé.
- Tap-to-move annulable par le contrôle manuel.
- Collisions, pathfinding et vitesse indépendants du FPS.
- Build et tests dédiés verts.

## Suite P0

1. Test tactile sur Samsung réel en paysage.
2. Ajustement des constantes à partir des FPS et d’une vidéo réelle.
3. Évitement caméra des murs par raycast.
4. Profils caméra intérieur / exploration / combat.
5. Orientation paysage uniquement dans le Monde du 3B.
`);

write('docs/reports/BASELINE_AUDIT.md',`# Baseline audit — Monde du 3B

- Base : main au commit 486d0e4a18f1944539c05b30b69848963be78626.
- Branche : chatgpt-improvements-world-motion-v2.
- L’ancienne branche chatgpt-improvements reste intacte car elle a divergé de main.

## Défauts P0 vérifiés

- La zone gauche combinait joystick invisible et tap-to-move.
- Un tap dans la zone caméra pouvait lancer pointRoute.
- Pas de contrôleur d’accélération/décélération du joueur.
- Reprise caméra après 1,4 seconde.

## Fondations déjà présentes

- Pathfinding A* via navigation.js.
- Collisions et mouvement par pas courts via advanceMotion.
- Profils auto / fluid / detail.
- Tests de mouvement à 15, 30, 60 et 120 FPS.
`);

write('docs/reports/WORK_LOG.md',`# Work log 3B

## Cycle World Motion V2

- Branche propre créée depuis main.
- Audit scene.js, motion.js, camera-follow.js et tests.
- Locomotion progressive, joystick recalibré, zones tactiles séparées.
- Double tap sprint et reprise caméra.
- Tests unitaires et documentation ajoutés.
`);

console.log('World Motion V2 appliqué avec succès.');
