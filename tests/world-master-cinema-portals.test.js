import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPortalEnergy} from '../src/world/portal-energy.js';
import {cinematicFraming} from '../src/world/cinematic-framing.js';
import {COUNTRIES} from '../src/world/catalog.js';

test('all eight portals have bounded, distinct, disposable living energy without altering traversal',()=>{
 const ids=COUNTRIES.map(country=>country.id);
 assert.equal(ids.length,8);
 for(const country of COUNTRIES){
  const energy=createPortalEnergy({accent:country.color,region:country.id});
  assert.match(energy.group.name,/3B-Portal-Resonance/);
  assert.equal(energy.group.children.length,5);
  assert.equal(energy.state.particleCount,42);
  const initial=energy.state.time;
  energy.tick(2,.032);
  assert.ok(energy.state.time>initial,country.id+' clock runs');
  const bright=energy.state.strength;
  energy.tick(55,.033);
  assert.ok(energy.state.strength<bright,country.id+' energy responds to player proximity');
  const clock=energy.state.time;
  energy.tick(2,.5,{reducedMotion:true});
  assert.equal(energy.state.time,clock,'reduced motion stops portal spin');
  energy.tick(Infinity,-1);
  assert.ok(Number.isFinite(energy.state.strength));
  energy.dispose();
  energy.dispose();
 }
});

test('hero guardian introductions and kingdom reveals have reversible filmic camera beats',()=>{
 const guard=['guardian-intro','final-combat-intro','important-combat-result','guardian-value-complete','guardian-homecoming'];
 const realm=['country-first-entry','story-restoration','story-finale'];
 const neutral={radiusScale:1,yawOffset:0,heightOffset:0,targetOffset:0,lightPulse:0};
 for(const kind of [...guard,...realm]){
  assert.deepEqual(cinematicFraming(kind,0),neutral,kind+' first frame is continuous');
  assert.deepEqual(cinematicFraming(kind,1),neutral,kind+' last frame returns to original camera');
  assert.deepEqual(cinematicFraming(kind,.55,{reducedMotion:true}),neutral,kind+' honours reduced-motion');
  let hasMotion=false;
  for(let i=0;i<=30;i++){
   const frame=cinematicFraming(kind,i/30);
   for(const n of Object.values(frame))assert.ok(Number.isFinite(n));
   assert.ok(frame.radiusScale>.65&&frame.radiusScale<1.5);
   if(frame.radiusScale!==1||frame.heightOffset!==0||frame.yawOffset!==0)hasMotion=true;
  }
  assert.ok(hasMotion,kind+' has a dynamic on-screen camera cue');
 }
 assert.deepEqual(cinematicFraming('world-opening',.5),neutral,'original entry shot is preserved');
 assert.deepEqual(cinematicFraming('guardian-intro',NaN),neutral,'invalid progress is safe');
});

test('portal energy and cinematic choreography use the existing real Three.js scene',()=>{
 const portals=fs.readFileSync(new URL('../src/world/portals.js',import.meta.url),'utf8');
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(portals,/createPortalEnergy\(/);
 assert.match(portals,/energy\.tick\(distance,dt,options\)/);
 assert.match(portals,/energy\.dispose\(\)/);
 assert.match(scene,/framing\.radiusScale/);
 assert.match(scene,/framing\.yawOffset/);
 assert.match(scene,/framing\.heightOffset/);
 assert.match(scene,/framing\.targetOffset/);
 assert.match(scene,/advancePortalCrossing\(portalCrossing,position/,'physical threshold remains connected to travel');
});
