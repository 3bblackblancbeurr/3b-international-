import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));

const layout=json('unreal/ThreeBWorld/Data/France/france-blockout-layout.json');
const npc=json('unreal/ThreeBWorld/Data/France/france-npc-dialogue-v1.json');
const presentation=json('unreal/ThreeBWorld/Data/France/france-presentation-v1.json');
const manifest=json('unreal/ThreeBWorld/Data/France/france-editor-asset-manifest.json');
const plan=json('unreal/ThreeBWorld/Data/France/france-editor-execution-plan-v1.json');

test('France vertical contract defines eight districts and eight altitude bands',()=>{
  assert.equal(layout.version,'2.0.0');
  assert.equal(layout.districts.length,8);
  assert.equal(new Set(layout.districts.map(x=>x.id)).size,8);
  assert.equal(new Set(layout.districts.map(x=>x.data_layer)).size,8);
  assert.equal(layout.altitude_bands.length,8);
  const ids=new Set(layout.altitude_bands.map(x=>x.id));
  for(const id of ['celestial','high_city','main_city','terraces','lower','caves','underside','floating_islands']){
    assert.ok(ids.has(id),id);
  }
  const z=layout.altitude_bands.map(x=>x.z_cm);
  assert.ok(Math.max(...z)-Math.min(...z)>=45000);
});

test('all canonical story zones are placed in 3D districts',()=>{
  const districts=new Set(layout.districts.map(x=>x.id));
  const bands=new Set(layout.altitude_bands.map(x=>x.id));
  assert.equal(layout.zones.length,9);
  for(const zone of layout.zones){
    assert.equal(typeof zone.location_cm.z,'number',zone.id);
    assert.ok(districts.has(zone.district_id),zone.id);
    assert.ok(bands.has(zone.altitude_band),zone.id);
  }
  assert.deepEqual(layout.story_route,[
    'gate_arrival','residential','community_square','rescue_site','civic_archive',
    'rooftop_route','tribunal','celiane_space','post_liberation_hub'
  ]);
});

test('France has real thickness, underside, cavities and floating islands in the blockout contract',()=>{
  assert.ok(layout.world_masses.length>=8);
  const kinds=new Set(layout.world_masses.map(x=>x.kind));
  assert.ok(kinds.has('main_plateau'));
  assert.ok(kinds.has('underside'));
  assert.ok(kinds.has('sanctuary_pillar'));
  assert.ok(layout.cavities.length>=4);
  assert.ok(layout.floating_islands.length>=5);
  assert.equal(layout.qa_gates.no_flat_platform,true);
  assert.equal(layout.qa_gates.playable_underside,true);
  assert.equal(layout.qa_gates.side_view_must_show_thickness,true);
});

test('building program covers small medium large and iconic scales',()=>{
  const categories=new Set(layout.masses.map(x=>x.category));
  for(const category of ['small','medium','large','iconic'])assert.ok(categories.has(category),category);
  assert.ok(layout.detail_program.micro.length>=10);
  assert.ok(layout.detail_program.meso.length>=10);
  assert.ok(layout.detail_program.macro.length>=8);
});

test('France hydrology has an explicit source-to-fall chain and genuinely vertical waterfalls',()=>{
  assert.deepEqual(layout.hydrology.origin_chain,[
    'rain_capture','high_source','upper_stream','justice_basin',
    'monumental_waterfall','lower_basin','cloud_fall'
  ]);
  assert.ok(layout.hydrology.source_markers.length>=2);
  assert.ok(layout.hydrology.basins.length>=2);
  assert.ok(layout.hydrology.waterfalls.length>=2);
  const main=layout.hydrology.waterfalls.find(x=>x.id==='monumental_waterfall');
  assert.ok(main);
  assert.ok(main.top_cm.z-main.bottom_cm.z>30000);
});

test('directed vistas enforce the anti-flat vertical reading',()=>{
  assert.ok(layout.vistas.length>=5);
  for(const vista of layout.vistas){
    assert.ok(vista.required_visible_bands.length>=3,vista.id);
    assert.equal(typeof vista.location_cm.z,'number',vista.id);
    assert.equal(typeof vista.target_cm.z,'number',vista.id);
  }
  assert.ok(layout.vistas.some(x=>x.id==='under_france'));
  assert.ok(layout.vistas.some(x=>x.landmark==='monumental_waterfall'));
  assert.equal(layout.qa_gates.three_altitudes_visible_from_vistas,true);
});

test('France population covers all eight districts with scalable routines',()=>{
  const districtIds=new Set(layout.districts.map(x=>x.id));
  const populationIds=new Set(npc.population_archetypes.map(x=>x.district_id));
  assert.deepEqual([...populationIds].sort(),[...districtIds].sort());
  assert.equal(npc.population_rules.districts_required,8);
  assert.ok(npc.population_rules.active_ai_controller_budget<=48);
  assert.deepEqual(npc.population_rules.simulation_tiers.map(x=>x.id),['near','mid','far']);
  const routines=new Set(npc.routine_profiles.map(x=>x.id));
  for(const role of npc.npc_roles){
    assert.ok(districtIds.has(role.district_id),role.id);
    assert.ok(routines.has(role.routine),role.id);
  }
  for(const routine of npc.routine_profiles){
    assert.deepEqual(Object.keys(routine.slots),['morning','day','evening','night']);
  }
});

test('weather and altitude presentation cover the full vertical world without authoring progression',()=>{
  const expected=['CLEAR','GOLDEN_CLEAR','HIGH_CLOUD','LOW_CLOUD','LIGHT_RAIN','HEAVY_RAIN','STORM','POST_RAIN'];
  assert.deepEqual(presentation.weather_state_machine.states.map(x=>x.id),expected);
  assert.equal(presentation.authority.persistent_mutation,false);
  assert.equal(presentation.authority.gameplay_reward,false);
  const bands=new Set(layout.altitude_bands.map(x=>x.id));
  const presentationBands=new Set(presentation.altitude_environment_profiles.map(x=>x.altitude_band));
  assert.deepEqual([...presentationBands].sort(),[...bands].sort());
  assert.equal(presentation.vista_rules.require_under_france_vista,true);
});

test('Editor manifest and execution plan cover system layers and vertical Gold Master evidence',()=>{
  const assetPaths=new Set(manifest.required_assets.map(x=>x.path));
  for(const layer of [
    'DL_BaseGeometry','DL_Water','DL_Vegetation','DL_Architecture',
    'DL_Population','DL_WeatherVariants','DL_Cinematic'
  ]){
    assert.ok(assetPaths.has('/Game/3B/World/France/DataLayers/'+layer),layer);
  }
  assert.ok(plan.stages.some(x=>x.id==='stage_08_vertical_blockout'));
  assert.ok(plan.stages.some(x=>x.id==='stage_09_hydrology_weather_audio'));
  assert.ok(plan.stages.some(x=>x.id==='stage_10_population_navigation'));
  assert.ok(plan.evidence_rules.required_proof_types.includes('anti_flat_capture_set'));
  assert.ok(plan.evidence_rules.required_proof_types.includes('navigation_capture'));
});

test('blockout generator consumes the canonical vertical contract instead of a second architecture',()=>{
  const script=read('unreal/ThreeBWorld/Scripts/build_france_blockout.py');
  for(const token of ['world_masses','districts','vertical_links','floating_islands','hydrology','vistas']){
    assert.match(script,new RegExp(token),token);
  }
  assert.match(script,/segment_transform/);
  assert.match(script,/math\.degrees\(math\.atan2\(dz/);
  assert.match(script,/3B_FR_WORLD_/);
  assert.match(script,/3B_FR_WATERFALL_/);
  assert.match(script,/3B_FR_VISTA_/);
});
