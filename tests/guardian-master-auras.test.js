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
  aura.tick(2,{visible:true});
  assert.equal(aura.group.visible,true);
  assert.ok(aura.group.children[0].material.opacity>=0);
  aura.tick(2,{visible:false});
  assert.equal(aura.group.visible,false);
  aura.dispose();aura.dispose();
  const reduced=createGuardianAura(country.id,{reducedMotion:true});
  reduced.tick(2);const rot=reduced.group.children.at(-1).rotation.y;
  reduced.tick(19);assert.equal(reduced.group.children.at(-1).rotation.y,rot,'no flicker for reduced-motion');
  reduced.dispose();
 }
 assert.equal(createGuardianAura('hub'),null,'Kaïs is not a ninth Guardian');
});

test('guardian aura integrates into the game as a visual only and cleans GPU resources',()=>{
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(scene,/createGuardianAura\(card\.country,\{reducedMotion\}\)/);
 assert.match(scene,/aura\?\.tick\(elapsed/);
 assert.match(scene,/a\.aura\?\.dispose\(\)/);
 assert.match(scene,/old\.aura\?\.dispose\(\)/);
});
