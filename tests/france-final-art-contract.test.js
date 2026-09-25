import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));

const finalArt=json('unreal/ThreeBWorld/Data/France/france-final-art-v1.json');
const gates=json('unreal/ThreeBWorld/Data/France/france-goldmaster-gates-v1.json');
const plan=json('unreal/ThreeBWorld/Data/France/france-editor-execution-plan-v1.json');

test('France final-art manifest maps concrete targets to real Gold Master gates',()=>{
  assert.equal(finalArt.slice_id,'france_justice_v1');
  assert.equal(finalArt.engine,'5.8');
  const gateIds=new Set(gates.gates.map(gate=>gate.id));
  const groupIds=new Set(finalArt.groups.map(group=>group.id));
  for(const id of ['geometry','underside_caverns','materials','architecture','vegetation','water','niagara','celiane','audio','cinematics'])assert.ok(groupIds.has(id),id);
  const paths=[];
  for(const group of finalArt.groups){
    assert.ok(gateIds.has(group.gate),group.id+':'+group.gate);
    assert.ok(group.targets.length>=4,group.id);
    for(const target of group.targets){
      assert.match(target.path,/^\/Game\/3B\//,target.path);
      assert.ok(target.kind&&target.role,target.path);
      assert.equal(target.critical,true,target.path);
      paths.push(target.path);
    }
  }
  assert.equal(new Set(paths).size,paths.length,'final-art paths must be unique');
  assert.ok(paths.length>=40);
});

test('final-art targets cover the critical France production surfaces',()=>{
  const roles=new Set(finalArt.groups.flatMap(group=>group.targets.map(target=>target.role)));
  for(const role of [
    'primary_cliff','underside_structure','cave_shell','floating_island',
    'rock_wet','facade_primary','justice_landmark','vegetation_distribution',
    'waterfall_actor','waterfall_mist','cloud_ocean',
    'final_mesh','animation_blueprint','justice_trial','liberation',
    'waterfall_distance','void_wind','cave_reverb','celiane_presence',
    'arrival','waterfall_reveal','celiane_intro','return_nexus'
  ])assert.ok(roles.has(role),role);
});
test('Editor validation treats final-art targets as missing until real Unreal assets exist',()=>{
  const validator=read('unreal/ThreeBWorld/Scripts/validate_france_editor_assets.py');
  assert.match(validator,/france-final-art-v1\.json/);
  assert.match(validator,/missing_final_art_assets/);
  assert.match(validator,/duplicate_final_art_paths/);
  assert.match(validator,/EditorAssetLibrary\.does_asset_exist/);
  assert.doesNotMatch(validator,/create_asset|delete_asset|rename_asset|duplicate_asset|save_asset/i);
});

test('execution plan consumes final-art contract at character geometry water and profiling stages',()=>{
  const byId=Object.fromEntries(plan.stages.map(stage=>[stage.id,stage]));
  for(const id of ['stage_05_celiane','stage_08_vertical_blockout','stage_09_hydrology_weather_audio']){
    assert.ok(byId[id].source_contracts.includes('france-final-art-v1.json'),id);
  }
  assert.ok(byId.stage_12_profile.goals.includes('validate_final_art_target_groups_against_evidence'));
});
