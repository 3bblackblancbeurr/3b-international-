import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,A,B} from './helpers/city-playable-db.js';
const setup=async()=>{const f=await fixture({landscape:true});for(const name of ['20261003045247_matrix_civic_services.sql','20261003045254_city_infrastructure_networks.sql','20261003045300_city_neighbor_material_exchange.sql'])await f.db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));await f.db.exec('update nexus_cities set city_level=6,visibility=\'public\';update economy_accounts set coins=10000');return f;};
const act=async(f,uid,action,offer=null,target=null,deal=null)=>(await f.query('select nexus_city_materials($1,$2,$3,$4,$5) v',[uid,action,offer,target,deal])).v;
const finish=async f=>f.db.exec("update nexus_city_placements set construction_started_at=now()-interval '2 minutes',construction_ready_at=now()-interval '1 minute'");
test('materials cannot appear from unfinished or disconnected factories and daily claim is unique',async()=>{
 const f=await setup();try{
  await f.place('TIMBER_WORKS_3B');await assert.rejects(act(f,A,'claim'),/Termine un atelier/);await finish(f);await assert.rejects(act(f,A,'claim'),/Termine un atelier/);
  await f.db.query("update nexus_cities set city=jsonb_set(city,'{roads}','[{\"x1\":-90,\"z1\":-65,\"x2\":-40,\"z2\":-65,\"width\":4}]') where user_id=$1",[A]);
  assert.equal((await act(f,A,'claim')).stock.timber,8);assert.equal((await act(f,A,'claim')).stock.timber,8);
 }finally{await f.db.close();}
});
test('fair exchanges reserve materials, settle once and reject sender acceptance or forged ids',async()=>{
 const f=await setup();try{
  await f.place('TRADE_CENTER_3B',A);await f.place('TRADE_CENTER_3B',B);await finish(f);
  await act(f,A,'snapshot');await act(f,B,'snapshot');await f.db.query("update nexus_city_material_stock set quantity=24 where user_id=$1 and material='timber'",[A]);await f.db.query("update nexus_city_material_stock set quantity=20 where user_id=$1 and material='steel'",[B]);
  const target=(await f.city(B)).city_id,offer=randomUUID();let s=await act(f,A,'offer',offer,target,'timber_steel');assert.equal(s.stock.timber,18);
  s=await act(f,A,'offer',offer,target,'timber_steel');assert.equal(s.stock.timber,18);
  await assert.rejects(act(f,A,'accept',offer),/Seule la ville destinataire/);
  const r=await act(f,B,'accept',offer);assert.equal(r.stock.timber,6);assert.equal(r.stock.steel,16);
  assert.equal((await act(f,B,'accept',offer)).stock.timber,6);assert.equal((await act(f,A,'snapshot')).stock.steel,4);
  await assert.rejects(act(f,A,'offer',randomUUID(),target,'give_money'),/Contrat invalide/);
  const cancelled=randomUUID();await act(f,A,'offer',cancelled,target,'timber_steel');assert.equal((await act(f,A,'cancel',cancelled)).stock.timber,18);assert.equal((await act(f,A,'cancel',cancelled)).stock.timber,18);
 }finally{await f.db.close();}
});
test('municipal upgrades consume materials atomically and grant each city bonus only once',async()=>{
 const f=await setup();try{
  await act(f,A,'snapshot');await f.db.query("update nexus_city_material_stock set quantity=12 where user_id=$1 and material='steel'",[A]);
  await assert.rejects(act(f,A,'upgrade',null,null,'water_efficiency'),/Matériaux insuffisants/);assert.equal((await act(f,A,'snapshot')).stock.steel,12);
  await f.db.query("update nexus_city_material_stock set quantity=6 where user_id=$1 and material='circuits'",[A]);const before=(await f.city()).city_xp;
  assert.equal((await act(f,A,'upgrade',null,null,'water_efficiency')).stock.steel,0);await act(f,A,'upgrade',null,null,'water_efficiency');assert.equal((await f.city()).city_xp,before+300);
  await f.db.exec('set role authenticated');await assert.rejects(f.db.query('select nexus_city_materials($1)',[B]),/permission denied/);
 }finally{await f.db.close();}
});
