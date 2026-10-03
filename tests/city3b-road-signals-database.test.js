import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fixture,A,B} from './helpers/city-playable-db.js';
const sql=readFileSync(new URL('../supabase/migrations/20261003121332_city_fixed_roads_and_player_signals.sql',import.meta.url),'utf8');
const road=(id,roadType,width,x1=-20,z1=0,x2=20,z2=0)=>({id,roadType,width,x1,z1,x2,z2});
const setup=async()=>{const f=await fixture({landscape:true});await f.db.exec(sql);return f;};
const roads=(f,to,from=[])=>f.db.query('select nexus_city_plan_roads_v2($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify(to),JSON.stringify(from)]);
const signals=(f,to,from=[])=>f.db.query('select nexus_city_plan_signals($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify(to),JSON.stringify(from)]);
test('typed road width and level are authoritative, saved metadata survives and stale edits fail',async()=>{
 const f=await setup();try{
 await assert.rejects(roads(f,[road('a','simple',8)]),/largeur fixe/);await assert.rejects(roads(f,[road('a','motorway',10)]),/niveau 5/);
 const first=[road('a','simple',4)];await roads(f,first);assert.deepEqual((await f.city()).city.roads,first);
 await assert.rejects(roads(f,[road('b','dirt',3)]),/routes ont changé/);
 await roads(f,[],first);assert.deepEqual((await f.city()).city.roads,[]);
 await f.db.exec('set role authenticated');await assert.rejects(roads(f,first),/permission denied/);
 }finally{await f.db.close();}
});
test('signals require a real junction and level, reject duplicates and stale edits, support removal',async()=>{
 const f=await setup();try{
 const plan=[road('a','simple',4),road('b','simple',4,0,-20,0,20)];await roads(f,plan);
 const light={id:'light-1',x:0,z:0,mode:'balanced',green:12};
 await assert.rejects(signals(f,[light]),/niveau 3/);await f.db.query('update nexus_cities set city_level=3 where user_id=$1',[A]);
 await assert.rejects(signals(f,[{...light,x:10}]),/carrefour/);await assert.rejects(signals(f,[{...light,green:999}]),/invalide/);
 await signals(f,[light]);assert.deepEqual((await f.city()).city.signals,[light]);
 assert.equal((await f.city(B)).city.signals,undefined);
 await assert.rejects(signals(f,[{...light,mode:'x'}]),/feux ont changé/);
 await assert.rejects(signals(f,[light,{...light,id:'second'}],[light]),/déjà des feux/);
 await signals(f,[],[light]);assert.deepEqual((await f.city()).city.signals,[]);
 await f.db.exec('set role authenticated');await assert.rejects(signals(f,[light]),/permission denied/);
 }finally{await f.db.close();}
});
test('all road choices persist their dimensions; adding a typed path preserves old roads',async()=>{
 const f=await setup();try{
 let previous=[];
 for(const [kind,width] of [['pedestrian',2],['dirt',3],['simple',4],['oneway',4],['double',8],['motorway',10]]){
  await f.db.query('update nexus_cities set city_level=5 where user_id=$1',[A]);const next=[road('r',kind,width)];await roads(f,next,previous);assert.deepEqual((await f.city()).city.roads,next);previous=next;
 }
 const legacy={id:'old-road',x1:-20,z1:0,x2:20,z2:0,width:8};await roads(f,[legacy],previous);
 const mixed=[legacy,road('p','pedestrian',2,-20,20,20,20)];await roads(f,mixed,[legacy]);assert.deepEqual((await f.city()).city.roads,mixed);
 }finally{await f.db.close();}
});
