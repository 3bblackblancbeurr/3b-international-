import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('control center database is service-only and allowlists command types',()=>{
 const sql=read('supabase/migrations/20260921180414_control_center_v1.sql');
 for(const table of ['control_center_settings','control_center_devices','control_center_pairings','control_center_commands','control_center_events']){
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security','i'));
  assert.match(sql,new RegExp('revoke all on public\\.'+table+' from public,anon,authenticated','i'));
 }
 for(const command of ['ping','system_status','open_3b','open_repo','open_unreal','unreal_health','open_github','open_supabase']){
  assert.match(sql,new RegExp("'"+command+"'"));
 }
 assert.match(sql,/Arbitrary shell commands are intentionally unsupported/i);
});

test('owner API requires a confirmed owner session and exposes no arbitrary command',()=>{
 const source=read('supabase/functions/control-center/index.ts');
 assert.match(source,/loyalty_session_valid/);
 assert.match(source,/email_confirmed_at/);
 assert.match(source,/owner_email/);
 assert.match(source,/COMMANDS=new Set/);
 assert.doesNotMatch(source,/eval\s*\(/);
 assert.doesNotMatch(source,/new Function/);
});

test('agent API uses revocable device tokens and atomic command RPCs',()=>{
 const source=read('supabase/functions/control-center-agent/index.ts');
 assert.match(source,/x-3b-device-token/);
 assert.match(source,/sha256\(token\)/);
 assert.match(source,/control_center_pair_device/);
 assert.match(source,/control_center_claim_command/);
 assert.match(source,/control_center_complete_command/);
 assert.doesNotMatch(source,/Authorization:'Bearer '/);
});

test('local PC agent has a fixed command switch and no free shell execution',()=>{
 const agent=read('scripts/threeb-control-agent.mjs');
 for(const command of ['ping','system_status','open_3b','open_repo','open_unreal','unreal_health','open_github','open_supabase']){
  assert.match(agent,new RegExp("case'"+command+"'"));
 }
 assert.doesNotMatch(agent,/child_process\.exec/);
 assert.doesNotMatch(agent,/\beval\s*\(/);
 assert.doesNotMatch(agent,/new Function/);
 assert.doesNotMatch(agent,/shell\s*:\s*true/);
 assert.doesNotMatch(agent,/powershell|cmd\.exe/i);
});

test('control center appears only after owner capability probe',()=>{
 const app=read('src/App.jsx');
 const page=read('src/control/ControlCenterPage.jsx');
 assert.match(app,/controlCenterRequest\("status"\)/);
 assert.match(app,/controlAvailable \? \[CONTROL_MENU_ITEM\] : \[\]/);
 assert.match(page,/Centre de commande privé/);
 assert.match(page,/Pas de terminal distant libre/);
});

test('migration integrity manifest includes control center v1',()=>{
 const manifest=JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
 assert.equal(manifest.count,121);
 const row=manifest.migrations.find(m=>m.version==='20260921180414');
 assert.deepEqual(row,{
  version:'20260921180414',
  name:'control_center_v1',
  sha256:'f4643698a97fa2246f372cce03293e20120525e1f665537d059bbd3ecf8d1001'
 });
});
