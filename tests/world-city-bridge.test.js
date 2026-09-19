import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/20260919_world_city_bridge.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');

test('World to City bridge is service-role only and reads server-owned world state',()=>{
 assert.match(sql,/security definer/i);
 assert.match(sql,/member_world_state/);
 assert.match(sql,/revoke all on function public\.nexus_city_sync_world\(uuid\) from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function public\.nexus_city_sync_world\(uuid\) to service_role/i);
});

test('World to City bridge is idempotent and never grants Coins',()=>{
 assert.match(sql,/origin_ref=v_origin_ref/);
 assert.match(sql,/market_mint_item/);
 assert.match(sql,/world:guardian:/);
 assert.match(sql,/world:secret:/);
 assert.doesNotMatch(sql,/economy_accounts|threeb_wallet_apply_server|coins_delta|points\s*=|member_profiles\s+set\s+points/i);
});

test('City Edge action sync_world uses server RPC and preserves native app origins',()=>{
 assert.match(edge,/action==='sync_world'/);
 assert.match(edge,/nexus_city_sync_world/);
 assert.match(edge,/https:\/\/localhost/);
 assert.match(edge,/capacitor:\/\/localhost/);
 assert.match(portal,/call\('sync_world'\)/);
 assert.match(portal,/Monde 3B synchronisé/);
});
