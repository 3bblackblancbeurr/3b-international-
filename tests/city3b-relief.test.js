import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,A} from './helpers/city-playable-db.js';
import {terrainHeight,landscapeCheck,cityLandscape} from '../src/city/city3b-landscape.js';
import {cityTerrainGeometry} from '../src/city/city3b-terrain-geometry.js';
import {cityConstructionIsNight} from '../src/city/city3b-environment.js';
const relief=(kind='hill',x=220,z=220,width=80)=>({id:randomUUID(),kind,x1:x,z1:z,x2:x,z2:z,width});
test('terrain rises and falls smoothly, returns to flat ground and auto light stays readable at night',()=>{
 const hill=relief(),basin=relief('basin',-220,-220,40);
 assert.equal(terrainHeight([hill],220,220),17.6);assert.equal(terrainHeight([basin],-220,-220),-3.2);
 assert.equal(terrainHeight([hill],260,220),0);assert.ok(terrainHeight([hill],240,220)>0);assert.equal(terrainHeight([hill],0,0),0);
 assert.equal(cityConstructionIsNight({day_mode:'auto'}),false);assert.equal(cityConstructionIsNight({day_mode:'night'}),true);
});
test('relief saves, survives reload, supports undo and protects roads/buildings on stable ground',async()=>{
 const f=await fixture({landscape:true});try{
  const hill=relief(),plan=(features,expected=[])=>f.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify(features),JSON.stringify(expected)]);
  await plan([hill]);const saved=await f.city();assert.deepEqual(cityLandscape({city:saved}),[hill]);
  assert.equal(landscapeCheck({city:saved},[{x1:190,z1:220,x2:260,z2:220,width:4}],{road:true}).valid,false);
  await assert.rejects(f.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([{id:'r',x1:180,z1:220,x2:260,z2:220,width:4}])]),/eau|étendue/);
  await assert.rejects(f.query('select nexus_city_place_v2($1,$2,220,220,0::smallint,$3)',[A,'HOME_ORIGIN',randomUUID()]),/décor/);
  await assert.rejects(plan([{...hill,width:999}],[hill]),/dimensions/);assert.deepEqual((await f.city()).city.terrain,[hill]);
  await plan([], [hill]);assert.deepEqual((await f.city()).city.terrain,[]);
  await plan([relief('basin')]);assert.equal((await f.city()).city.terrain[0].kind,'basin');
 }finally{await f.db.close();}
});
test('terrain cannot deform existing infrastructure or overlap another landscape feature',async()=>{
 const f=await fixture({landscape:true});try{
  const plan=features=>f.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify(features),'[]']);
  await f.place('HOME_ORIGIN');await assert.rejects(plan([relief('hill',-80,-80)]),/bâtiment/);
  await f.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([{id:'r',x1:180,z1:220,x2:260,z2:220,width:4}])]);
  await assert.rejects(plan([relief()]),/route/);
  await assert.rejects(plan([relief('basin',-220,220),{...relief('lake',-220,220,24)}]),/relief/);
  assert.equal((await f.city()).city.terrain,undefined);
 }finally{await f.db.close();}
});

test('the rendered heightfield stays lightweight on flat maps and deforms both directions',()=>{
 for(const [features,target] of [[[],0],[ [{...relief('hill',0,0,80)}],17.6],[ [{...relief('basin',0,0,40)}],-3.2]]){
  const geometry=cityTerrainGeometry(500,features);try{
   const p=geometry.attributes.position;assert.ok(p.count<=66049);if(!features.length)assert.equal(p.count,4);
   if(features.length){let centre=-1;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.01&&Math.abs(p.getZ(i))<.01){centre=i;break;}assert.ok(centre>=0);assert.ok(Math.abs(p.getY(centre)-(target-.05))<.00001);}
   assert.ok(Math.abs(p.getY(0)+.05)<.00001);assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  }finally{geometry.dispose();}
 }
});
