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
const districtContent=json('unreal/ThreeBWorld/Data/France/france-district-content-v1.json');
const districtMissions=json('unreal/ThreeBWorld/Data/France/france-district-missions-v1.json');

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


test('generic Unreal region data asset extends the existing territory definition without France hard-coding',()=>{
  const header=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBRegionDefinition.h');
  const source=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBRegionDefinition.cpp');
  const world=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWorldDefinition.h');
  assert.match(header,/UThreeBRegionDefinition/);
  assert.match(header,/FThreeBAltitudeBandDefinition/);
  assert.match(header,/FThreeBDistrictDefinition/);
  assert.match(header,/FThreeBHydrologyLinkDefinition/);
  assert.match(header,/FThreeBVistaDefinition/);
  assert.match(header,/FThreeBRegionStreamingProfile/);
  assert.match(source,/ValidateDefinition/);
  assert.match(source,/Duplicate altitude band/);
  assert.match(source,/Duplicate district/);
  assert.doesNotMatch(header,/Céliane|Justice|france_centre|monumental_waterfall/i);
  assert.match(world,/#include \"ThreeBRegionDefinition\.h\"/);
  assert.match(world,/TSoftObjectPtr<UThreeBRegionDefinition> RegionDefinition/);
  assert.doesNotMatch(world,/\\n/);
  assert.ok(manifest.required_assets.some(x=>x.path.endsWith('/DA_FranceRegion')&&x.kind==='ThreeBRegionDefinition'));
});


test('district content turns the eight district labels into a production-ready building and activity program',()=>{
  const layoutDistricts=new Set(layout.districts.map(x=>x.id));
  const contentDistricts=new Set(districtContent.districts.map(x=>x.id));
  assert.deepEqual([...contentDistricts].sort(),[...layoutDistricts].sort());
  assert.ok(districtContent.building_catalog.small.length>=20);
  assert.ok(districtContent.building_catalog.medium.length>=10);
  assert.ok(districtContent.building_catalog.large.length>=5);
  assert.ok(districtContent.building_catalog.landmarks.length>=3);

  const catalog=Object.values(districtContent.building_catalog).flat();
  const buildingIds=new Set(catalog.map(x=>x.id));
  assert.equal(buildingIds.size,catalog.length);

  for(const item of catalog)assert.ok(layoutDistricts.has(item.district),item.id);
  for(const district of districtContent.districts){
    assert.ok(district.activities.length>0,district.id);
    assert.ok(district.mission_hooks.length>0,district.id);
    assert.ok(district.secrets.length>0,district.id);
    assert.ok(district.vertical_connections.length>0,district.id);
    assert.ok(district.pre_liberation.length>0,district.id);
    assert.ok(district.post_liberation.length>0,district.id);
    for(const id of district.building_ids)assert.ok(buildingIds.has(id),district.id+':'+id);
  }
  assert.equal(districtContent.rules.filler_buildings_forbidden,true);
  assert.equal(districtContent.rules.one_region_not_eight_maps,true);
});


test('France local missions use canonical districts, story phases and vertical gameplay without bypassing Céliane authority',()=>{
  const districtIds=new Set(layout.districts.map(x=>x.id));
  const story=json('unreal/ThreeBWorld/Data/France/france-justice-v1.json');
  const phases=new Set(story.phases.map(x=>x.id));
  const states=new Set(story.world_states.map(x=>x.id));
  assert.ok(districtMissions.missions.length>=12);
  for(const mission of districtMissions.missions){
    assert.ok(districtIds.has(mission.district_id),mission.id);
    assert.ok(mission.objectives.length>=3,mission.id);
    assert.ok(mission.gameplay.length>0,mission.id);
    assert.match(mission.reward_policy_key,/^france\./);
    for(const phase of mission.available_phases)assert.ok(phases.has(phase),mission.id+':'+phase);
    for(const state of mission.requires_world_state)assert.ok(states.has(state),mission.id+':'+state);
  }
  assert.ok(districtMissions.missions.some(x=>x.gameplay.includes('underside')));
  assert.ok(districtMissions.missions.some(x=>x.gameplay.includes('floating_islands')));
  assert.ok(districtMissions.missions.some(x=>x.gameplay.includes('hydrology')));
  assert.ok(districtMissions.invariants.some(x=>x.includes('never bypass justice_trial')));
  assert.ok(districtMissions.authority_model.client_may_not.includes('set_guardian_liberated'));
});


test('generic mission population and weather runtime types stay reusable and authority-safe',()=>{
  const missionH=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBMissionCatalog.h');
  const missionCpp=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBMissionCatalog.cpp');
  const popH=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBPopulationDefinition.h');
  const popCpp=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBPopulationDefinition.cpp');
  const weatherH=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherProfile.h');
  const weatherCpp=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherProfile.cpp');
  for(const source of [missionH,missionCpp,popH,popCpp,weatherH,weatherCpp]){
    assert.doesNotMatch(source,/Céliane|france_centre|monumental_waterfall|fragment_justice/i);
  }
  assert.match(missionH,/UThreeBMissionCatalog/);
  assert.match(missionH,/EThreeBMissionAuthority/);
  assert.match(missionCpp,/Server-verified mission/);
  assert.match(popH,/UThreeBPopulationDefinition/);
  assert.match(popH,/ActiveAiControllerBudget/);
  assert.match(popCpp,/Simulation tiers must be ordered by distance/);
  assert.match(weatherH,/UThreeBWeatherProfile/);
  assert.match(weatherH,/enum class EThreeBWeatherState/);
  assert.match(weatherCpp,/States\.Num\(\) != 8/);
});

test('Weather Director is replicated, event-driven and cannot author progression',()=>{
  const header=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherDirector.h');
  const source=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherDirector.cpp');
  assert.match(header,/AThreeBWeatherDirector/);
  assert.match(header,/ReplicatedUsing=OnRep_WeatherState/);
  assert.match(header,/BlueprintAuthorityOnly/);
  assert.match(header,/BlueprintImplementableEvent/);
  assert.match(source,/DOREPLIFETIME\(AThreeBWeatherDirector, CurrentWeather\)/);
  assert.match(source,/if \(!HasAuthority\(\)\)/);
  assert.match(source,/OnWeatherChanged\.Broadcast/);
  assert.doesNotMatch(header+source,/grant_global_xp|grant_fragment|inventory|guardian_liberated/i);
  assert.doesNotMatch(header+source,/Tick\(/);
});

test('replicated story state now exposes a presentation reaction signal without client mutation',()=>{
  const header=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBGameState.h');
  const source=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBGameState.cpp');
  assert.match(header,/FThreeBStoryStateChanged/);
  assert.match(header,/BlueprintAssignable/);
  assert.match(header,/OnStoryStateChanged/);
  assert.match(source,/OnStoryStateChanged\.Broadcast\(StoryState\)/);
  assert.match(source,/if \(!HasAuthority\(\)/);
  assert.doesNotMatch(header,/UFUNCTION\(Server[^)]*\)[\s\S]{0,160}ApplyAuthoritativeStoryState/);
});

test('France Editor bootstrap creates canonical assets and layers without destructive operations',()=>{
  const bootstrap=read('unreal/ThreeBWorld/Scripts/bootstrap_france_goldmaster_assets.py');
  const prepare=read('unreal/ThreeBWorld/Scripts/prepare_france_goldmaster.py');
  for(const token of [
    'DA_FranceRegion','DA_FranceMissions','DA_FrancePopulation','DA_FranceWeather',
    'DataAssetFactory','DataLayerFactory','create_data_layer_instance',
    'ThreeBWeatherDirector','save_current_level'
  ]) assert.match(bootstrap,new RegExp(token),token);
  assert.match(prepare,/bootstrap_france_goldmaster_assets/);
  assert.match(prepare,/build_france_blockout/);
  assert.match(prepare,/validate_france_editor_assets/);
  assert.doesNotMatch(bootstrap,/delete_asset|delete_directory|rename_asset|duplicate_asset/i);
});

test('runtime assets are critical and planned exactly once',()=>{
  const required=[
    ['/Game/3B/World/France/Data/DA_FranceMissions','ThreeBMissionCatalog'],
    ['/Game/3B/World/France/Data/DA_FrancePopulation','ThreeBPopulationDefinition'],
    ['/Game/3B/World/France/Data/DA_FranceWeather','ThreeBWeatherProfile']
  ];
  const planned=plan.stages.flatMap(x=>x.asset_paths||[]);
  for(const [path,kind] of required){
    const entry=manifest.required_assets.find(x=>x.path===path);
    assert.ok(entry,path);
    assert.equal(entry.kind,kind,path);
    assert.equal(entry.critical,true,path);
    assert.equal(planned.filter(x=>x===path).length,1,path);
  }
  assert.equal(manifest.runtime_sources.story_signal,'AThreeBGameState.OnStoryStateChanged');
});


test('France weather narrative overrides reference registered authoritative WorldState tags',()=>{
  const story=json('unreal/ThreeBWorld/Data/France/france-justice-v1.json');
  const config=read('unreal/ThreeBWorld/Config/DefaultGameplayTags.ini');
  const presentation=json('unreal/ThreeBWorld/Data/France/france-presentation-v1.json');
  const profileH=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherProfile.h');
  const profileCpp=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherProfile.cpp');
  const directorCpp=read('unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBWeatherDirector.cpp');
  const ids=new Set(story.world_states.map(x=>x.id));
  for(const [stateId] of Object.entries(presentation.weather_state_machine.narrative_overrides)){
    assert.ok(ids.has(stateId),stateId);
  }
  for(const state of story.world_states){
    assert.match(config,new RegExp(state.tag.replace(/[.]/g,'\\.')),state.tag);
  }
  assert.match(profileH,/TMap<FName, EThreeBWeatherState> WorldStateOverrides/);
  assert.match(profileCpp,/WorldStateOverrides\.Find\(WorldStateTagName\)/);
  assert.match(directorCpp,/OnStoryStateChanged\.AddDynamic/);
  assert.match(directorCpp,/OnStoryStateChanged\.RemoveDynamic/);
  assert.match(directorCpp,/WorldStateTag\.GetTagName\(\)/);
  assert.match(directorCpp,/if \(!HasAuthority\(\)/);
});

test('Editor bootstrap imports world-state weather overrides and has robust reflected error reporting',()=>{
  const bootstrap=read('unreal/ThreeBWorld/Scripts/bootstrap_france_goldmaster_assets.py');
  assert.match(bootstrap,/def reflected_type_name/);
  assert.match(bootstrap,/world_state_overrides/);
  assert.match(bootstrap,/france-justice-v1\.json/);
  assert.match(bootstrap,/narrative_overrides/);
  assert.match(bootstrap,/DataLayerCreationParameters/);
  assert.match(bootstrap,/save_loaded_asset/);
  assert.doesNotMatch(bootstrap,/service_role|grant_global_xp|grant_fragment|mint_inventory/i);
});
