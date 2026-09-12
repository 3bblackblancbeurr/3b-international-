import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,act,normalize,persist,load} from '../src/world/origins/state.js';
import {POINTS} from '../src/world/origins/data.js';
const run=(s,id,topic)=>act(s,id,{position:POINTS[id],topic});
test('Paris harvest, deliveries, restoration and equipment form a persistent resource loop',()=>{
 let s=blank();s.zone='france';
 assert.equal(run(s,'atelier','repair').changed,false);
 for(let i=0;i<2;i++){
  s=run(s,'flower','gather').save;
  assert.equal(run(s,'flower','gather').changed,false);
  s=run(s,'atelier','deliver').save;
 }
 assert.equal(s.paris.materials,4);assert.equal(s.paris.coins,10);
 s=run(s,'atelier','repair').save;assert.equal(s.paris.workshop,true);
 assert.equal(s.paris.materials,0);assert.equal(s.paris.coins,0);
 assert.equal(run(s,'atelier','repair').changed,false);
 s=run(s,'flower','gather').save;s=run(s,'atelier','craft').save;
 assert.equal(s.equipment,'artisan');assert.equal(s.paris.materials,1);
 assert.equal(run(s,'atelier','craft').changed,false);
 assert.equal(normalize(s).xp,50);
 const storage={data:null,getItem(){return this.data;},setItem(k,v){this.data=v;}};
 assert.equal(persist(storage,null,s),true);assert.deepEqual(load(storage).paris,s.paris);
 const stale=blank();stale.zone='france';persist(storage,null,stale);
 assert.deepEqual(load(storage).paris,s.paris);
});
test('Paris services cannot be used remotely or in another world',()=>{
 const s=blank();assert.equal(act(s,'flower',{position:POINTS.flower,topic:'gather'}).changed,false);
 s.zone='france';assert.equal(act(s,'flower',{position:{x:100,z:100},topic:'gather'}).changed,false);
});
