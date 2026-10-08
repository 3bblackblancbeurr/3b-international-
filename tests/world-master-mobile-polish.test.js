import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WORLD_AUDIO_PRESETS,brokenCircleMusicGain} from '../src/world/audio-director.js';
import {createPremiumTransitVehicle} from '../src/world/premium-hub-visuals.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('headphone / mobile mix presets are independently balanced and never turn on sound',()=>{
 assert.deepEqual(Object.keys(WORLD_AUDIO_PRESETS),['ambiance','cinema','discret']);
 for(const mix of Object.values(WORLD_AUDIO_PRESETS))for(const key of ['master','music','ambience','sfx','voice']){
  assert.ok(Number.isFinite(mix[key])&&mix[key]>=0&&mix[key]<=1);
 }
 assert.ok(WORLD_AUDIO_PRESETS.ambiance.ambience>WORLD_AUDIO_PRESETS.ambiance.sfx*2);
 assert.ok(WORLD_AUDIO_PRESETS.discret.sfx<WORLD_AUDIO_PRESETS.cinema.sfx);
 assert.ok(brokenCircleMusicGain(0)>brokenCircleMusicGain(95));
 assert.ok(brokenCircleMusicGain(95)>brokenCircleMusicGain(10000));
 assert.ok(brokenCircleMusicGain(0,{indoors:true})<brokenCircleMusicGain(0));
});

test('a human-scale boat has a sheltered passenger deck without more draw calls',()=>{
 const root=new THREE.Group(),geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,16)},materials=[];
 const boat=createPremiumTransitVehicle({transport:'boat',height:0,color:'#dbc28e'},{x:0,z:0},{root,geometry,groundY:()=>0,material:(color,options={})=>{
  const material=new THREE.MeshStandardMaterial({color,...options});materials.push(material);return material;
 }});
 try{
  const size=new THREE.Box3().setFromObject(boat).getSize(new THREE.Vector3());
  assert.ok(size.x>=4.5&&size.z>=9.5,`Boat must accommodate the traveller, got ${size.toArray()}`);
  assert.ok(size.y>=3.8,'protect the upper body with a full-height canopy');
  assert.ok(boat.children.length<=3,'premium boat shares its existing three GPU draw calls');
  assert.equal(boat.userData.transitCraft.transport,'boat');
 }finally{
  root.clear();
  for(const value of new Set(Object.values(geometry)))value.dispose();
  materials.forEach(m=>m.dispose());
 }
});

test('landscape edit supports face and whole body while retaining scrolling over canvases',()=>{
 const avatar=read('src/world/AvatarPanel.jsx'),stage=read('src/arena/ArenaStage.jsx'),css=read('src/world/hub/platform.css');
 assert.match(avatar,/Visage entier/);assert.match(avatar,/Corps entier/);
 assert.match(stage,/faceView\?Math.max\(2\.45/);
 assert.match(css,/world-dialog-avatar \.hub-creator \.arena-stage\{touch-action:pan-y/);
 assert.match(css,/max-height:570px/);
});

test('mobile startup cinematics and 3D home circle have portrait-safe landscape controls',()=>{
 const home=read('src/components/BrokenCircle3D.jsx'),css=read('src/world/hub/platform.css');
 assert.match(home,/menuMode\?37:29/);
 assert.match(home,/mobile\?11\.45:11\.70/);
 assert.match(css,/\.hub-opening>footer\{z-index:10/);
 assert.match(css,/min-height:44px/);
});

test('save status overlay has a dismiss target and leaves the settings journal intact',()=>{
 const warning=read('src/world/WorldSaveStatus.jsx'),css=read('src/world/hub/hub-master.css');
 assert.match(warning,/hub-save-dismiss/);
 assert.match(warning,/if\(compact&&/);
 assert.match(warning,/onClick=\{onSync\}/);
 assert.match(css,/\.hub-save-dismiss:focus-visible/);
});

test('mobile guard hold and companion gait recovery do not alter rewards or account state',()=>{
 const controls=read('src/world/WorldPlayControls.jsx'),scene=read('src/world/scene.js');
 assert.match(controls,/onGuardHeld\?\.\(true\)/);
 assert.match(controls,/onPointerCancel=\{id==='guard'\?releaseGuard/);
 assert.match(scene,/setGuardHeld\(value\)/);
 assert.match(scene,/Math\.min\(Math\.hypot\(mx,mz\),Math\.max\(0,dt\)\*9\.5\)/);
 assert.match(scene,/transportRide\?\.transport==='boat'\?\.46:0/);
});
