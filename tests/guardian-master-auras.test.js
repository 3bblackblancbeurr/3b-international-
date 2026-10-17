import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_AURA_SIGNATURES,createGuardianAura} from '../src/world/guardian-aura.js';

test('eight unique Guardian ground auras run on the actual Three.js character and cost three meshes or less',()=>{
 assert.equal(Object.keys(GUARDIAN_AURA_SIGNATURES).length,8);
 assert.equal(new Set(Object.values(GUARDIAN_AURA_SIGNATURES).map(x=>x.petals)).size,8);
 for(const country of COUNTRIES){
  const aura=createGuardianAura(country.id);
  assert.ok(aura,country.id);
  assert.equal(aura.group.children.length,3);
  assert.equal(aura.signature,GUARDIAN_AURA_SIGNATURES[country.id]);
  aura.tick(2,{visible:true,phase:1});
  assert.equal(aura.group.visible,true);
  const firstRadius=aura.group.scale.x,firstGlow=aura.group.children[0].material.opacity;
  aura.tick(2,{visible:true,phase:2});
  const secondRadius=aura.group.scale.x;
  aura.tick(2,{visible:true,phase:3,threat:true});
  assert.ok(firstRadius<secondRadius&&secondRadius<aura.group.scale.x,country.id+' phases grow visibly');
  assert.ok(aura.group.children[0].material.opacity>firstGlow,country.id+' danger becomes legible');
  assert.deepEqual(aura.state,{phase:3,liberated:false,threat:true,visible:true});
  const dangerousGlow=aura.group.children[0].material.opacity;
  aura.tick(2,{visible:true,phase:3,liberated:true,threat:true});
  assert.equal(aura.state.threat,false,'the liberated guardian no longer warns of an attack');
  assert.equal(aura.state.liberated,true);
  assert.ok(aura.group.children[0].material.opacity<dangerousGlow,'liberation becomes calm');
  assert.ok(aura.group.children.every(mesh=>mesh.material.opacity>=0&&mesh.material.opacity<=.5));

  assert.ok(aura.group.children[0].material.opacity>=0);
  aura.tick(2,{visible:false});
  assert.equal(aura.group.visible,false);
  aura.dispose();aura.dispose();
  const reduced=createGuardianAura(country.id,{reducedMotion:true});
  reduced.tick(2,{phase:3,threat:true});const rot=reduced.group.children.at(-1).rotation.y,glow=reduced.group.children[0].material.opacity;
  reduced.tick(19,{phase:3,threat:true});assert.equal(reduced.group.children.at(-1).rotation.y,rot,'no rotation for reduced-motion');assert.equal(reduced.group.children[0].material.opacity,glow,'no pulsing for reduced-motion');
  reduced.dispose();
 }
 assert.equal(createGuardianAura('hub'),null,'Kaïs is not a ninth Guardian');
});

test('guardian aura integrates into the game as a visual only and cleans GPU resources',()=>{
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(scene,/createGuardianAura\(card\.country,\{reducedMotion\}\)/);
 assert.match(scene,/aura\?\.tick\(elapsed/);
 assert.match(scene,/threat:combatActive&&acceptedPhase==='windup'/,'actual arena attack windup drives aura warning');
 assert.match(scene,/a\.aura\?\.dispose\(\)/);
 assert.match(scene,/old\.aura\?\.dispose\(\)/);
});
