import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';

const readJson=url=>JSON.parse(readFileSync(new URL(url,import.meta.url),'utf8'));
const readText=url=>readFileSync(new URL(url,import.meta.url),'utf8');

const pairs=[
 ['../src/world/hub/data/hub-master-plan-v2.json','../unreal/ThreeBWorld/Data/Canonical/hub-master-plan-v2.json'],
 ['../src/world/hub/data/npcs-v1.json','../unreal/ThreeBWorld/Data/Canonical/npcs-v1.json'],
 ['../src/world/hub/data/missions-v1.json','../unreal/ThreeBWorld/Data/Canonical/missions-v1.json'],
 ['../src/world/hub/data/events-v1.json','../unreal/ThreeBWorld/Data/Canonical/events-v1.json'],
 ['../src/world/hub/data/secrets-v1.json','../unreal/ThreeBWorld/Data/Canonical/secrets-v1.json'],
];

function filesRecursive(url){
 const root=new URL(url,import.meta.url);
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
  return entry.isDirectory()?walk(path):[path];
 });
 return walk(root);
}

test('canonical Unreal mirrors stay JSON-equivalent to the web canon',()=>{
 for(const [web,unreal] of pairs)assert.deepEqual(readJson(web),readJson(unreal),unreal);
});

test('ThreeBWorld is the declared UE 5.8 canonical project and legacy is frozen',()=>{
 const project=readJson('../unreal/ThreeBWorld/ThreeBWorld.uproject');
 const readme=readText('../unreal/ThreeBWorld/README.md');
 const legacy=readText('../unreal/3BWorld/README.md');
 assert.equal(project.EngineAssociation,'5.8');
 assert.equal(project.Modules[0].Name,'ThreeBWorld');
 assert.match(readme,/Projet Unreal canonique/i);
 assert.match(legacy,/LEGACY \/ FROZEN/i);
 assert.match(legacy,/\.\.\/ThreeBWorld/);
});

test('launch deep link cannot override the native API origin',()=>{
 const instance=readText('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBGameInstance.cpp');
 const bridge=readText('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWorldBridgeSubsystem.cpp');
 const launch=readText('../supabase/functions/world-unreal-launch/index.ts');
 assert.match(instance,/ConfigureApiBase\(DefaultApiBase\)/);
 assert.doesNotMatch(instance,/QueryValue\(LaunchUrl,\s*TEXT\("api"\)\)/);
 assert.match(bridge,/ProductionApiBase/);
 assert.match(bridge,/ttvhcezucsbbmnafrotq\.supabase\.co/);
 assert.match(bridge,/Configuration du portail 3B refusée/);
 assert.doesNotMatch(launch,/threebworld:\/\/launch\?ticket=\$\{encodeURIComponent\(ticket\)\}&api=/);
 assert.match(launch,/launch_url:\s*`threebworld:\/\/launch\?ticket=/);
});

test('canonical Unreal source does not embed private Supabase credentials',()=>{
 const sourceFiles=filesRecursive('../unreal/ThreeBWorld/Source/').filter(url=>/\.(?:h|cpp|cs)$/.test(url.pathname));
 for(const file of sourceFiles){
  const text=readFileSync(file,'utf8');
  assert.doesNotMatch(text,/SUPABASE_SERVICE_ROLE_KEY/i,file.pathname);
  assert.doesNotMatch(text,/service_role\s*=/i,file.pathname);
 }
});

test('legacy reusable-token backend was not copied into the canonical runtime',()=>{
 assert.equal(existsSync(new URL('../unreal/ThreeBWorld/Source/ThreeBWorld/Private/ThreeBBackendSubsystem.cpp',import.meta.url)),false);
 assert.equal(existsSync(new URL('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBBackendSubsystem.cpp',import.meta.url)),false);
 const bridge=readText('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWorldBridgeSubsystem.cpp');
 assert.doesNotMatch(bridge,/SetUserAccessToken|PublishableKey|Bearer \+ AccessToken/);
});

test('backend JSON schemas preserve account and City ownership boundaries',()=>{
 const passport=readJson('../unreal/ThreeBWorld/Data/Contracts/passport.schema.json');
 const city=readJson('../unreal/ThreeBWorld/Data/Contracts/city3b.schema.json');
 const world=readJson('../unreal/ThreeBWorld/Data/Contracts/world-state.schema.json');
 assert.ok(passport.required.includes('user_id'));
 assert.ok(passport.required.includes('country'));
 assert.equal(city.properties.placements.items.properties.rotation.enum.length,4);
 assert.equal(world.properties.version.const,1);
});

test('world-bootstrap remains account-scoped and server-side',()=>{
 const source=readText('../supabase/functions/world-bootstrap/index.ts');
 assert.match(source,/const uid=await authenticate\(req\)/);
 assert.match(source,/member_profiles\?user_id=eq\.'\+uid/);
 assert.match(source,/member_world_state\?user_id=eq\.'\+uid/);
 assert.match(source,/nexus_cities\?user_id=eq\.'\+uid/);
 assert.doesNotMatch(source,/body\.user_id/);
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+/);
});

test('canonical production layout preserves scale and complete topology',()=>{
 const layout=readJson('../unreal/ThreeBWorld/Data/Production/world-layout-unreal.json');
 assert.equal(layout.world.width_cm,180000);
 assert.equal(layout.world.depth_cm,140000);
 assert.equal(layout.world.radius_cm,82000);
 assert.equal(layout.world.cell_target_cm,15000);
 assert.equal(layout.districts.length,10);
 assert.equal(layout.buildings.length,19);
 assert.equal(layout.gates.length,8);
 assert.equal(layout.roads.length,37);
 assert.equal(layout.world.safe_hub,true);
 assert.ok(layout.gates.every(gate=>Math.hypot(gate.location_cm.x,gate.location_cm.y)>50000));
 assert.equal(new Set(layout.gates.map(gate=>gate.location_cm.x+':'+gate.location_cm.y)).size,8);
});

test('transport and crowd exports preserve canonical budgets',()=>{
 const transport=readJson('../unreal/ThreeBWorld/Data/Production/transport-network-unreal.json');
 const crowd=readJson('../unreal/ThreeBWorld/Data/Production/crowd-budgets.json');
 assert.equal(transport.train.stations.length,10);
 assert.equal(transport.boats.stops.length,5);
 assert.equal(transport.telepherics.length,3);
 assert.equal(transport.ziplines.length,6);
 assert.equal(crowd.narrative_npcs,24);
 assert.equal(crowd.profiles.mobileMedium.target_fps,30);
 assert.equal(crowd.profiles.mobileHigh.target_fps,60);
 assert.equal(crowd.profiles.desktop.target_fps,60);
});

test('Gold Master slice keeps identity and server-authority invariants explicit',()=>{
 const flow=readJson('../unreal/ThreeBWorld/Data/Production/vertical-slice-state-machine.json');
 const qa=readJson('../unreal/ThreeBWorld/Data/Production/acceptance-tests.json');
 assert.equal(flow.initial,'SESSION_REQUIRED');
 assert.equal(flow.states.at(-1).id,'SLICE_COMPLETE');
 assert.ok(flow.invariants.includes('client_cannot_assert_city_proof'));
 assert.ok(flow.invariants.includes('passport.user_id == authenticated.user_id'));
 const cases=qa.suites.flatMap(suite=>suite.cases);
 for(const required of [
  'new_account_sees_own_passport',
  'existing_city_never_relocks',
  'world_sync_receipt_is_server_written',
  'mobile_medium_30fps_target_profiled',
  'network_loss_during_world_sync_recovers'
 ])assert.ok(cases.includes(required),required);
});

test('canonical typed contracts keep token state fail-closed',()=>{
 const contract=readText('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBDataContracts.h');
 assert.match(contract,/FThreeBEconomySnapshot/);
 assert.match(contract,/FThreeBSeasonSnapshot/);
 assert.match(contract,/GlobalLevel = 1/);
 assert.match(contract,/TokenEnabled = false/);
 assert.match(contract,/TokenBlockchainEnabled = false/);
 assert.match(contract,/TokenTradingEnabled = false/);
});


test('native launch bridge uses an ephemeral client instance id instead of hardware identity',()=>{
 const source=readText('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBGameInstance.cpp');
 assert.doesNotMatch(source,/FPlatformMisc::GetDeviceId|GetDeviceId\(/);
 assert.match(source,/FGuid::NewGuid\(\)/);
 assert.match(source,/ClientInstanceId/);
 assert.match(source,/user_id is the player identity/i);
});


test('Unreal Hub launcher and builder target the V5 metropolitan Gold Master, not the obsolete V4 wheel',()=>{
 const init=readText('../unreal/ThreeBWorld/Content/Python/init_unreal.py');
 const launcher=readText('../scripts/windows/Launch-Hub3B.ps1');
 const builder=readText('../unreal/ThreeBWorld/Scripts/build_hub3b_main_v5.py');
 const manifest=readJson('../unreal/ThreeBWorld/Data/Production/hub3b-main-v5.json');
 assert.match(init,/-3BHubV5AutoBuild/);
 assert.match(init,/build_hub3b_main_v5\.py/);
 assert.doesNotMatch(init,/V4AutoBuild|build_hub3b_main_v4/);
 assert.match(launcher,/-3BHubV5AutoBuild/);
 assert.match(launcher,/build_hub3b_main_v5\.py/);
 assert.equal(manifest.required_map_name,'Hub3B_Main_V05');
 assert.equal(manifest.validation.gates,8);
 assert.equal(manifest.validation.roads,37);
 assert.equal(manifest.validation.forbid_central_gate_wheel,true);
 assert.match(builder,/world-layout-unreal\.json/);
 assert.match(builder,/HUB_V5_GATE_/);
 assert.doesNotMatch(builder,/spawn_spoke|spawn_petals_and_pad|angle_deg.*45/);
});
