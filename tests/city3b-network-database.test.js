import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,A} from './helpers/city-playable-db.js';
const sql=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const setup=async()=>{const f=await fixture({landscape:true});await f.db.exec(sql('20261003045247_matrix_civic_services.sql'));await f.db.exec(sql('20261003045254_city_infrastructure_networks.sql'));return f;};
const network=(kind,x1=-30,z1=0,x2=0,z2=0)=>({id:kind+'-'+x1+'-'+z1,kind,x1,z1,x2,z2,width:2});
const plan=(f,to,from=[])=>f.db.query('select nexus_city_plan_networks($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify(to),JSON.stringify(from)]);
test('network server rejects locked tools and stale plans, retry is idempotent',async()=>{
 const f=await setup();try{
  await assert.rejects(plan(f,[network('rail')]),/Disponible au niveau/);
  await f.db.query('update nexus_cities set city_level=5 where user_id=$1',[A]);const first=[network('rail')];await plan(f,first);await plan(f,first);
  await assert.rejects(plan(f,[...first,network('power')]),/La ville a changé/);
  await plan(f,[...first,network('power')],first);
  await assert.rejects(plan(f,[network('invalid')],[...first,network('power')]),/Type de réseau/);
 }finally{await f.db.close();}
});
test('water network needs a completed source and continuous path to a home',async()=>{
 const f=await setup();try{
  await f.db.query('update nexus_cities set city_level=5 where user_id=$1',[A]);await f.db.query('update economy_accounts set coins=10000 where user_id=$1',[A]);
  await f.place('WATER_3B'); // source centre (-79,-79)
  const lines=[network('water',-80,-65,-40,-65),network('water',-40,-65,0,-65)];await plan(f,lines);
  let r=await f.query("select city3b_network_served((select city_id from nexus_cities where user_id=$1),'water',0,-60) v",[A]);assert.equal(r.v,false);
  await f.db.exec("update nexus_city_placements set construction_started_at=now()-interval '2 minutes',construction_ready_at=now()-interval '1 minute'");
  // Move the endpoint closer to the actual source so the first segment is fed.
  const fed=[network('water',-80,-75,-40,-65),network('water',-40,-65,0,-65)];await plan(f,fed,lines);
  r=await f.query("select city3b_network_served((select city_id from nexus_cities where user_id=$1),'water',0,-60) v",[A]);assert.equal(r.v,true);
  await plan(f,[fed[1]],fed);r=await f.query("select city3b_network_served((select city_id from nexus_cities where user_id=$1),'water',0,-60) v",[A]);assert.equal(r.v,false);
  await f.db.exec('set role authenticated');await assert.rejects(f.db.query('select nexus_city_plan_networks($1,\'[]\',\'[]\')',[A]),/permission denied/);
 }finally{await f.db.close();}
});
