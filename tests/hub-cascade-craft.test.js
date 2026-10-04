import test from 'node:test';
import assert from 'node:assert/strict';
import {CITE_ISLANDS,citeIslandRadius} from '../src/world/hub/platform-topology.js';
import {cascadeGeometry,cascadeMist} from '../src/world/hub/cascade-craft.js';
import {islandCliffGeometry} from '../src/world/hub/island-cliffs.js';

test('cascade lips match the coast and fall to the ocean without changing the deck',()=>{
 for(const island of CITE_ISLANDS){
  const g=cascadeGeometry(island),p=g.attributes.position;
  assert.ok([...p.array].every(Number.isFinite));
  for(let i=0;i<13;i++){
   const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x);
   assert.ok(Math.abs(Math.hypot(x,z)-citeIslandRadius(island,a)-.15)<.0001);
   assert.ok(Math.abs(p.getY(i))<.000001);
  }
  for(let i=p.count-13;i<p.count;i++)assert.equal(p.getY(i),-18);
  const cliff=islandCliffGeometry(island),c=cliff.attributes.position;
  for(let i=0;i<c.count;i++){
   assert.ok(c.getY(i)<=0&&c.getY(i)>=-28);
   if(c.getY(i)===0)assert.ok(Math.abs(Math.hypot(c.getX(i),c.getZ(i))-citeIslandRadius(island,Math.atan2(c.getZ(i),c.getX(i))))<.0001);
  }
  g.dispose();cliff.dispose();
 }
});
test('cascade spray stays bounded, shared and disposable in both quality modes',()=>{
 const owned=[],spray=cascadeMist(CITE_ISLANDS.slice(0,20),owned);
 assert.equal(spray.points.geometry.attributes.position.count,720);
 assert.equal(owned.length,2);
 spray.tick(12);assert.equal(spray.points.material.uniforms.time.value,12);
 spray.setQuality('fluid');assert.equal(spray.points.material.uniforms.pixelScale.value,.7);
 spray.setDaylight(.18);assert.equal(spray.points.material.uniforms.day.value,.18);
 let disposed=0;owned.forEach(a=>{a.addEventListener('dispose',()=>disposed++);a.dispose();});assert.equal(disposed,2);
});
