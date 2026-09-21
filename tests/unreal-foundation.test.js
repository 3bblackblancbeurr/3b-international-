import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function filesUnder(relative){
 const base=new URL('../'+relative,import.meta.url).pathname;
 const out=[];
 const walk=dir=>{
  for(const name of readdirSync(dir)){
   const full=join(dir,name);
   if(statSync(full).isDirectory())walk(full);else out.push(full);
  }
 };
 walk(base);
 return out;
}

test('ThreeBWorld is an Unreal Engine 5.8 project with the required gameplay plugins',()=>{
 const project=JSON.parse(read('unreal/ThreeBWorld/ThreeBWorld.uproject'));
 assert.equal(project.EngineAssociation,'5.8');
 const enabled=new Set(project.Plugins.filter(p=>p.Enabled).map(p=>p.Name));
 for(const name of ['EnhancedInput','GameplayAbilities','StateTree','GameplayStateTree','Niagara','MotionWarping','SmartObjects'])assert.ok(enabled.has(name),name);
});

test('Unreal gameplay foundation keeps GAS authoritative on PlayerState and exposes canonical attributes',()=>{
 const state=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBPlayerState.cpp');
 const attrs=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBAttributeSet.h');
 assert.match(state,/SetIsReplicated\(true\)/);
 assert.match(state,/EGameplayEffectReplicationMode::Mixed/);
 for(const name of ['Health','Stamina','Focus','Resonance'])assert.match(attrs,new RegExp('FGameplayAttributeData '+name));
});

test('Unreal source never contains Supabase service-role or refresh-token secrets',()=>{
 const files=filesUnder('unreal/ThreeBWorld').filter(path=>/\.(h|cpp|ini|cs|md|uproject)$/.test(path));
 for(const file of files){
  const source=readFileSync(file,'utf8');
  assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|refresh_token|sb_secret_/i,file);
 }
});

test('App to Unreal bridge uses authenticated launch plus one-time native redemption',()=>{
 const launch=read('supabase/functions/world-unreal-launch/index.ts');
 const redeem=read('supabase/functions/world-unreal-redeem/index.ts');
 assert.match(launch,/loyalty_session_valid/);
 assert.match(launch,/world_unreal_launch_tickets/);
 assert.match(launch,/expires_in:90/);
 assert.match(redeem,/world_unreal_redeem_ticket/);
 assert.match(redeem,/x-3b-client/);
 assert.match(redeem,/p_session_ttl_seconds:1800/);
 assert.doesNotMatch(redeem,/SUPABASE_ANON_KEY/);
});

test('Unreal migration stays fail-closed to browser roles',()=>{
 const sql=read('supabase/migrations/20260921141028_world_unreal_launch_bridge_v1.sql');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all on table public\.world_unreal_launch_tickets from public, anon, authenticated/i);
 assert.match(sql,/revoke all on table public\.world_unreal_sessions from public, anon, authenticated/i);
 assert.match(sql,/security invoker/i);
 assert.match(sql,/grant execute on function public\.world_unreal_redeem_ticket[\s\S]*to service_role/i);
});

test('migration integrity manifest includes all 112 applied migrations through Unreal bridge',()=>{
 const manifest=JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
 assert.equal(manifest.count,112);
 const unreal=manifest.migrations.find(m=>m.version==='20260921141028');
 assert.deepEqual(unreal,{
  version:'20260921141028',
  name:'world_unreal_launch_bridge_v1',
  sha256:'63957f4d9fdd5a85c653e3e59ac3165f75339f723770c22871951eceb80022c4'
 });
});

test('home portal represents all eight canonical gates and keeps native launch feature-gated',()=>{
 const portal=read('src/components/WorldPortalCard.jsx');
 const env=read('.env.example');
 for(const code of ['FR','DZ','ES','MA','IT','TN','TR','EE'])assert.match(portal,new RegExp("'"+code+"'"));
 assert.match(portal,/UNREAL_LAUNCH_ENABLED/);
 assert.match(env,/VITE_UNREAL_LAUNCH_ENABLED=false/);
});
