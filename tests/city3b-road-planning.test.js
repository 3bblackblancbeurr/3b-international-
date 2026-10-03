import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../supabase/migrations/20261003003056_city3b_living_runtime.sql',import.meta.url),'utf8');

test('City 3B road planning is authenticated, bounded and server persisted',()=>{
  assert.match(edge,/async function auth\(req:Request\)/);
  assert.match(edge,/function cleanRoads\(input:unknown,half:number\)/);
  assert.match(edge,/input\.length>256/);
  assert.match(edge,/Math\.hypot\(x2-x1,z2-z1\)<6/);
  assert.match(edge,/action==='plan_roads'/);
  assert.match(edge,/user_id=eq\.\+'\+uid|user_id=eq\.'\+uid/);
  assert.match(edge,/rpc\('nexus_city_plan_roads'/);
  assert.match(runtime,/for update/);
  assert.match(runtime,/'road_plan'/);
  assert.doesNotMatch(edge,/action==='unlock_district'/);
});

test('Public city visits include the persisted plan for road rendering',()=>{
  assert.match(edge,/ambience,city,updated_at/);
});
