import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,A} from './helpers/city-playable-db.js';
import {cityMapInitialView} from '../src/city/city3b-map.js';
import {cityBuildingHeight} from '../src/city/city3b-model-preview.js';
const migration=readFileSync(new URL('../supabase/migrations/20261003203318_city3b_architectural_scale.sql',import.meta.url),'utf8');
test('new architectural parcels enlarge buildings without changing saved parcels or their moved dimensions',async()=>{
 const f=await fixture({landscape:true});try{
 const old=await f.place('HOME_ORIGIN');
 await f.db.exec("update nexus_city_districts set unlocked=true");
 const before=(await f.db.query('select footprint_w,footprint_h from nexus_city_placements where id=$1',[old.id])).rows[0];
 await f.db.exec(migration);
 const catalogue=(await f.db.query("select code,footprint from nexus_city_buildings where code in ('CITY_HALL_3B','HOME_ORIGIN')")).rows;
 assert.deepEqual(catalogue.find(x=>x.code==='CITY_HALL_3B').footprint,{w:12,h:10});
 assert.deepEqual(catalogue.find(x=>x.code==='HOME_ORIGIN').footprint,{w:6,h:5});
 await f.db.exec(migration);assert.deepEqual((await f.db.query("select footprint from nexus_city_buildings where code='HOME_ORIGIN'")).rows[0].footprint,{w:6,h:5});
 await f.db.query('select nexus_city_move_v2($1,$2,-40,-40,90::smallint,$3)',[A,old.id,randomUUID()]);
 const moved=(await f.db.query('select footprint_w,footprint_h from nexus_city_placements where id=$1',[old.id])).rows[0];
 assert.equal(moved.footprint_w,before.footprint_h);assert.equal(moved.footprint_h,before.footprint_w);
 const placed=(await f.db.query("select nexus_city_place_v2($1,'HOME_ORIGIN',40,40,0::smallint,$2) id",[A,randomUUID()])).rows[0];
 assert.deepEqual((await f.db.query('select footprint_w,footprint_h from nexus_city_placements where id=$1',[placed.id])).rows[0],{footprint_w:6,footprint_h:5});
 }finally{await f.db.close();}
});
test('new and sparse cities open at a readable neighborhood distance on every map',()=>{
 for(const map_preset of ['plains','river','hills','snow']){
 const data={city:{city:{map_extent:1000,map_preset}}};
 const empty=cityMapInitialView(data);assert.ok(1000/empty.zoom<=34);
 const sparse=cityMapInitialView({...data,placements:[{x:20,z:10,footprint_w:12,footprint_h:10,placement_state:'placed'}]});
 assert.ok(1000/sparse.zoom<=22);assert.deepEqual(sparse.center,{x:26,z:15});
 }
 assert.ok(cityBuildingHeight(2,2,'civic','CITY_HALL_3B')>cityBuildingHeight(2,2,'housing','HOME_ORIGIN'));
});
