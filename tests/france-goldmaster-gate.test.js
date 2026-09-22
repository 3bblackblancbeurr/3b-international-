import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const json=(path)=>JSON.parse(read(path));

const root='unreal/ThreeBWorld';
const gates=json(root+'/Data/France/france-goldmaster-gates-v1.json');
const gateScript=read(root+'/Scripts/france_goldmaster_gate.py');
const runner=read(root+'/Scripts/run_france_goldmaster.ps1');
const uproject=json(root+'/ThreeBWorld.uproject');

test('France Gold Master gates are exhaustive unique and conservative',()=>{
  const ids=gates.gates.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(gates.engine,'5.8');
  assert.match(gates.gold_master_rule,/Every required gate must be PASS/);
  const required=gates.gates.filter(x=>x.required!==false);
  assert.ok(required.length>=20);
  assert.equal(gates.gates.find(x=>x.id==='vertical_foundation').required,false);

  for(const id of [
    'compile_editor_client_server',
    'final_nanite_geometry',
    'final_underside_caverns',
    'water_system_and_waterfall_materials',
    'niagara_weather_vfx',
    'population_models_animations_statetrees',
    'celiane_final',
    'navigation_all_levels',
    'lumen_final',
    'spatial_audio_final',
    'cinematics_final',
    'world_partition_hlod_generated',
    'pie_singleplayer',
    'pie_multiplayer_reconnect',
    'profiling_gpu_cpu',
    'package_client',
    'package_server',
    'client_server_smoke'
  ]) assert.ok(ids.includes(id),id);
});

test('strict Editor gate cannot turn PREPARED into Gold Master',()=>{
  assert.match(gateScript,/GOLD_MASTER_VALIDATED/);
  assert.ok(gateScript.includes('by_id[gate_id]["status"] != "PASS"'));
  assert.match(gateScript,/Gold Master is true only when every required gate has real PASS evidence/);
  assert.match(gateScript,/vertical_foundation/);
  assert.match(gateScript,/PREPARED/);
  assert.match(gateScript,/france_goldmaster_report\.json/);
  assert.match(gateScript,/world_partition\.json/);
});

test('Windows runner compiles native targets and prepares official World Partition builders',()=>{
  for(const target of ['ThreeBWorldEditor','ThreeBWorldClient','ThreeBWorldServer']){
    assert.match(runner,new RegExp(target),target);
  }
  assert.match(runner,/InstalledBuild\.txt/);
  assert.match(runner,/ForceSourceTargets/);
  assert.match(runner,/WorldPartitionHLODsBuilder/);
  assert.match(runner,/WorldPartitionNavigationDataBuilder/);
  assert.match(runner,/Assert-EvidencePassList/);
  assert.match(runner,/final_nanite_geometry\.json/);
  assert.match(runner,/pie_multiplayer\.json/);
  assert.match(runner,/profiling\.json/);
  assert.match(runner,/RunUAT\.bat/);
  assert.match(runner,/BuildCookRun/);
  assert.match(runner,/package_client\.json/);
  assert.match(runner,/package_server\.json/);
  assert.match(runner,/ExecutePythonScript=/);
  assert.match(runner,/compile_partial\.json/);
  assert.doesNotMatch(runner,/blockout.*gold.?master.*pass/i);
});

test('project enables plugins required by command-line Editor automation',()=>{
  const enabled=new Set(uproject.Plugins.filter(x=>x.Enabled).map(x=>x.Name));
  assert.ok(enabled.has('PythonScriptPlugin'));
  assert.ok(enabled.has('EditorScriptingUtilities'));
  assert.ok(enabled.has('Niagara'));
  assert.ok(enabled.has('StateTree'));
});
