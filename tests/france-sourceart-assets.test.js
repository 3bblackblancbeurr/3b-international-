import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
const report=json('unreal/ThreeBWorld/Data/France/france-sourceart-report.json');

const names=[
 'SM_FR_Cliff_Master_A','SM_FR_Cliff_Master_B',
 'SM_FR_Underside_Rib_A','SM_FR_Underside_Rib_B',
 'SM_FR_Island_Rock_A','SM_FR_Island_Rock_B',
 'SM_FR_Cave_Module_A','SM_FR_Cave_Module_B','SM_FR_Cave_Entrance_A',
 'SM_FR_Facade_Paris_A','SM_FR_Facade_Worker_A','SM_FR_JusticeTribunal','SM_FR_StreetKit_A',
 'SM_FR_Tree_A','SM_FR_Tree_B','SM_FR_Shrub_A',
];

const geometry=new Set(names.slice(0,9));
const rel=name=>'unreal/ThreeBWorld/SourceArt/France/'+(geometry.has(name)?'Geometry/':'Architecture/')+name;

test('France source-art report validates all generated meshes without claiming Gold Master',()=>{
  assert.equal(report.gold_master_proof,false);
  assert.equal(report.mesh_count,names.length);
  assert.equal(report.pass_count,names.length);
  assert.deepEqual(new Set(report.results.map(x=>x.name)),new Set(names));
  for(const item of report.results){
    assert.equal(item.status,'PASS',item.name);
    assert.ok(item.vertices>=200,item.name);
    assert.ok(item.faces>=180,item.name);
    assert.ok(item.uv_layers>=1,item.name);
    assert.ok(item.dimensions_m.every(v=>v>.5),item.name);
  }
});
test('every validated source mesh ships blend fbx and glb files',()=>{
  for(const name of names){
    for(const ext of ['blend','fbx','glb']){
      assert.equal(existsSync(new URL('../'+rel(name)+'.'+ext,import.meta.url)),true,name+'.'+ext);
    }
  }
});

test('Unreal importer maps validated FBX sources to canonical France folders',()=>{
  const importer=read('unreal/ThreeBWorld/Scripts/import_france_sourceart.py');
  for(const name of names)assert.match(importer,new RegExp(name),name);
  for(const token of [
    '/Game/3B/World/France/Environment/Geometry',
    '/Game/3B/World/France/Environment/Architecture',
    '/Game/3B/World/France/Environment/Vegetation'
  ])assert.ok(importer.includes(token),token);
  assert.match(importer,/AssetImportTask/);
  assert.match(importer,/import_asset_tasks/);
  assert.match(importer,/gold master|PASS evidence/i);
});

test('Blender generators remain reproducible source-art tooling',()=>{
  const geo=read('unreal/ThreeBWorld/Scripts/generate_france_finalart_meshes.py');
  const arch=read('unreal/ThreeBWorld/Scripts/generate_france_architecture_sourceart.py');
  for(const source of [geo,arch]){
    assert.match(source,/export_scene\.fbx/);
    assert.match(source,/export_scene\.gltf/);
    assert.match(source,/smart_uv/);
  }
});
