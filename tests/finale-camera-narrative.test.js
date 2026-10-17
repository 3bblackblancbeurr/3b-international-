import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {combatCameraView} from '../src/world/master-presentation.js';
import {orbitView} from '../src/world/orbit.js';
import {createOblivionActor} from '../src/world/oblivion-manifestation.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';
import {blankSave} from '../src/world/rules.js';

test('the complete 10.8 metre manifestation and its animated wings fit the actual combat perspective',()=>{
 for(const pose of ['idle','windup','attack']){
 const actor=createOblivionActor();
 try{
  assert.equal(actor.object.userData.oblivion.height,10.8);
  actor.setFinalState({final:true,enemy:360,enemyMax:360,field:{phase:pose==='windup'?'windup':'recovery'}});
  if(pose==='attack')actor.action('Attack',1);
  actor.update(.25);actor.update(.25);
  for(const aspect of [390/844,.65,1,844/390])for(const distance of [4,7,16,22])for(const bearing of [0,.8,1.6,2.4,3.2,4,4.8,5.6]){
   const hero={x:0,y:0,z:0},enemy={x:Math.sin(bearing)*distance,y:0,z:Math.cos(bearing)*distance};
   const view=orbitView({yaw:.4,pitch:.23,distance:24},hero,0,aspect<.85),before=structuredClone({view,hero,enemy});
   const framed=combatCameraView(view,hero,enemy,{aspect,enemyHeight:10.8});
   const camera=new THREE.PerspectiveCamera(60,aspect,.3,1800);
   camera.position.copy(framed.position);camera.lookAt(new THREE.Vector3(framed.target.x,framed.target.y,framed.target.z));camera.updateMatrixWorld();
   const inside=point=>{
    point.project(camera);
    assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1,
     `Final ${pose} body clips at aspect ${aspect}, distance ${distance}, bearing ${bearing}`);
   };
   for(const point of [new THREE.Vector3(0,.2,0),new THREE.Vector3(0,3.4,0),new THREE.Vector3(enemy.x,10.8,enemy.z)])inside(point);
   actor.object.position.copy(enemy);actor.object.rotation.y=Math.atan2(-enemy.x,-enemy.z);actor.object.updateMatrixWorld(true);
   const point=new THREE.Vector3();
   actor.object.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++)inside(point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld));
   });
   assert.deepEqual({view,hero,enemy},before,'Framing cannot relocate combatants or rewrite the orbit');
   assert.equal(combatCameraView(view,hero,enemy,{enabled:false,aspect,enemyHeight:10.8}),view,'Manual camera remains available');
  }
 }finally{actor.dispose();}
 }
});

test('canonical final result events narrate the Circle rather than a France guardian reward',()=>{
 for(const result of ['victory','defeat']){
  const previous=blankSave();previous.region='hub';
  previous.adventure.encounter={final:true,boss:true,region:'france',card:'C164',result:null};
  const next=structuredClone(previous);next.adventure.encounter.result=result;next.adventure.finished=result==='victory';
  const before=structuredClone({previous,next}),events=worldCinematicEvents(previous,next,{type:'field'});
  const event=events.find(event=>event.kind==='important-combat-result');
  assert.equal(event.context.final,true,'The accepted battle result must carry its canonical final flag');
  const presentation=storyCinematicPresentation(event);
  assert.equal(presentation.countryName,'Cité des Huit Héritages');assert.equal(presentation.value,'Les huit liens');
  assert.equal(presentation.voiceCharacter,'narrator');
  assert.doesNotMatch(presentation.title+' '+presentation.detail,/Céliane|sceau de France|rejoint tes alliés/);
  assert.match(presentation.title+' '+presentation.detail,result==='victory'?/Oubli|Cercle/:/Cercle|liens/);
  assert.equal(events.some(event=>event.kind==='story-finale'),result==='victory');
  assert.deepEqual({previous,next},before,'Narrative presentation cannot grant victory or rewards');
 }
 const guardian=storyCinematicPresentation({kind:'important-combat-result',key:'result:france:C165:victory',region:'france',context:{region:'france',card:'C165',result:'victory',final:false}});
 assert.match(guardian.title,/Céliane/);assert.equal(guardian.voiceCharacter,'C165','Ordinary guardian liberation keeps its own voice');
});

test('the final introduction identifies all eight links despite the combat adapter France region',()=>{
 const presentation=storyCinematicPresentation({kind:'final-combat-intro',key:'intro:france:C164:adventure',region:'france',context:{region:'france',card:'C164',final:true}});
 assert.equal(presentation.countryName,'Cité des Huit Héritages');
 assert.equal(presentation.value,'Les huit liens');assert.equal(presentation.voiceCharacter,'narrator');
 assert.match(presentation.title+' '+presentation.detail,/huit/i);assert.doesNotMatch(presentation.title,/Céliane/);
});
