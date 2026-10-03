import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,A,B} from './helpers/city-playable-db.js';
const migration=readFileSync(new URL('../supabase/migrations/20261003045247_matrix_civic_services.sql',import.meta.url),'utf8');
const municipal=async()=>{const f=await fixture({landscape:true});await f.db.exec(migration);return f;};
test('existing extra hall becomes an annex and server rejects a new hall even if stored',async()=>{
 const f=await fixture({landscape:true});try{
  await f.place('CITY_HALL_3B');await f.place('CITY_HALL_3B');await f.db.exec(migration);
  const rows=await f.db.query("select building_code from nexus_city_placements where city_id=(select city_id from nexus_cities where user_id=$1)",[A]);
  assert.equal(rows.rows.filter(r=>r.building_code==='CITY_HALL_3B').length,1);assert.equal(rows.rows.filter(r=>r.building_code==='CITIZEN_SERVICES_3B').length,1);
  const before=await f.coins();await assert.rejects(f.place('CITY_HALL_3B'),/possède déjà sa mairie/);assert.equal(await f.coins(),before);
  await f.db.query("update nexus_city_placements set placement_state='stored' where building_code='CITY_HALL_3B'");
  await assert.rejects(f.place('CITY_HALL_3B'),/possède déjà sa mairie/);
  await f.place('CITY_HALL_3B',B); // Each city has its own independent hall.
 }finally{await f.db.close();}
});
test('new civic services count only completed connected buildings and preserve level gates',async()=>{
 const f=await municipal();try{
  await f.db.query('update nexus_cities set city_level=6,city_xp=5000 where user_id=$1',[A]);
  await f.db.query('update economy_accounts set coins=10000 where user_id=$1',[A]);
  for(const code of ['POLICE_3B','FIRE_STATION_3B','WASTE_CENTER_3B','TELECOM_3B','COURTHOUSE_3B'])await f.place(code);
  let m=(await f.query("select nexus_city_life_metrics($1,80,'balanced') m",[A])).m;
  assert.equal(m.safety,0);assert.equal(m.fire,0);
  await f.db.exec("update nexus_city_placements set construction_started_at=now()-interval '2 minutes',construction_ready_at=now()-interval '1 minute'");
  m=(await f.query("select nexus_city_life_metrics($1,80,'balanced') m",[A])).m;assert.equal(m.fire,0);
  await f.db.query("update nexus_cities set city=jsonb_set(city,'{roads}','[{\"x1\":-90,\"z1\":-65,\"x2\":-40,\"z2\":-65,\"width\":4}]') where user_id=$1",[A]);
  m=(await f.query("select nexus_city_life_metrics($1,80,'balanced') m",[A])).m;
  for(const code of ['safety','fire','cleanliness','internet','justice'])assert.equal(m[code],100);
  const events=(await f.query('select nexus_city_life_event_catalog() v')).v;assert.equal(events.length,11);
 }finally{await f.db.close();}
});
