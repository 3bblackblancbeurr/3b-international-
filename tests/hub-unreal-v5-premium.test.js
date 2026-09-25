import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readText=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const readJson=path=>JSON.parse(readText(path));

const manifest=readJson('../unreal/ThreeBWorld/Data/Production/hub3b-main-v5-premium.json');
const layout=readJson('../unreal/ThreeBWorld/Data/Production/world-layout-unreal.json');
const canon=readJson('../src/world/hub/data/hub-master-plan-v2.json');
const builder=readText('../unreal/ThreeBWorld/Scripts/build_hub3b_main_v5.py');
const init=readText('../unreal/ThreeBWorld/Content/Python/init_unreal.py');
const launcher=readText('../scripts/windows/Launch-Hub3B.ps1');
const readme=readText('../LIRE_MOI_HUB_3B.txt');

test('Hub3B Main V05 is the canonical dispersed metropolis, not the legacy radial sanctuary',()=>{
 assert.equal(manifest.version,'5.0.0');
 assert.equal(manifest.status,'canonical-premium-metropolis');
 assert.equal(manifest.required_map_name,'Hub3B_Main_V05');
 assert.equal(manifest.map_asset,'/Game/3binternational/Maps/Hub3B_Main_V05');
 assert.equal(manifest.visual_reference,'user-master://La Cité des Huit Héritages');
 assert.equal(manifest.world.width_cm,180000);
 assert.equal(manifest.world.depth_cm,140000);
 assert.equal(manifest.world.district_count,10);
 assert.equal(manifest.world.canonical_building_count,19);
 assert.equal(manifest.world.portal_count,8);
 assert.equal(manifest.validation.forbid_even_45_degree_portal_ring,true);
 assert.equal(manifest.validation.forbid_legacy_ring_spokes_petals,true);
 assert.ok(manifest.legacy_rejected.some(row=>/ring\/spokes\/petals/i.test(row)));
 for(const legacyKey of ['"ring"','"spokes"','"petals"'])assert.doesNotMatch(JSON.stringify(manifest),new RegExp(legacyKey));
});

test('V05 portal locations match the real metropolitan gates and remain irregular',()=>{
 const gates=Object.fromEntries(layout.gates.map(row=>[row.id,row.location_cm]));
 const regions=Object.fromEntries(canon.heritagePlatforms.map(row=>[row.code,row.regionId]));
 assert.equal(manifest.portals.length,8);
 assert.equal(new Set(manifest.portals.map(row=>row.code)).size,8);
 for(const portal of manifest.portals){
  assert.deepEqual(portal.location_cm,gates[regions[portal.code]],portal.code);
  assert.equal(portal.state,'prepared-dispersed');
  assert.ok(portal.facility?.name,portal.code);
  assert.ok(portal.services.includes('country_access'),portal.code);
 }
 const angles=manifest.portals.map(p=>(Math.atan2(p.location_cm.y,p.location_cm.x)*180/Math.PI+360)%360).sort((a,b)=>a-b);
 const diffs=angles.map((angle,index)=>(angles[(index+1)%angles.length]-angle+360)%360);
 assert.ok(diffs.some(d=>Math.abs(d-45)>2),'portals must not be an even 45° ring');
 assert.ok(manifest.portals.every(p=>Math.hypot(p.location_cm.x,p.location_cm.y)>20000));
});

test('V05 premium foundation includes districts, useful city fabric, water, landmarks and vertical travel',()=>{
 assert.equal(manifest.districts.length,10);
 assert.equal(Object.keys(manifest.verticality.district_levels_cm).length,10);
 assert.ok(new Set(Object.values(manifest.verticality.district_levels_cm)).size>=6);
 assert.ok(manifest.world.civic_frontages_per_district>=8);
 assert.ok(manifest.water_network.features.length>=5);
 assert.ok(manifest.landmarks.length>=10);
 assert.equal(manifest.vertical_links.length,8);
 assert.equal(manifest.transport.train.stations.length,10);
 assert.equal(manifest.transport.telepherics.lines.length,3);
 assert.equal(manifest.transport.ziplines.lines.length,6);
 assert.equal(manifest.civic_fabric.minimumUsefulFrontagesPerDistrict,6);
 assert.ok(manifest.civic_fabric.uses.includes('school'));
 assert.ok(manifest.civic_fabric.uses.includes('clinic'));
 assert.ok(manifest.civic_fabric.uses.includes('housing'));
});

test('V05 keeps the full story, safety and progression canon',()=>{
 assert.equal(manifest.safe_zone.hubIsOnlyMajorSafeZone,true);
 assert.equal(manifest.safe_zone.monsters,false);
 assert.equal(manifest.safe_zone.hostileDamage,false);
 assert.equal(manifest.safe_zone.wildPvp,false);
 assert.ok(manifest.laws.some(rule=>/Portes restent dispersées/.test(rule)));
 assert.ok(manifest.laws.some(rule=>/Kaïs reste le héros central/.test(rule)));
 assert.equal(manifest.fragment_milestones.length,9);
 assert.equal(manifest.fragment_milestones[4].id,'tower_transformation');
 assert.equal(manifest.fragment_milestones[7].id,'beyond_the_guardians');
 assert.equal(manifest.fragment_milestones[8].id,'circle_restored');
 assert.equal(manifest.arsenal.canonicalWeapons,16);
 assert.equal(manifest.arsenal.frozenBase,true);
 assert.match(manifest.story.finalThreat,/Monstre de l’Oubli/);
 assert.equal(manifest.npc_memory.persistent,true);
});

test('the Unreal V05 builder constructs the full metropolis and refuses the old radial model',()=>{
 assert.match(builder,/hub3b-main-v5-premium\.json/);
 assert.match(builder,/world-layout-unreal\.json/);
 assert.match(builder,/hub-master-plan-v2\.json/);
 assert.match(builder,/spawn_civic_fabric/);
 assert.match(builder,/spawn_canonical_buildings/);
 assert.match(builder,/spawn_landmarks/);
 assert.match(builder,/spawn_broken_circle_monument/);
 assert.match(builder,/spawn_skybridges/);
 assert.match(builder,/spawn_transit/);
 assert.match(builder,/spawn_portals/);
 assert.match(builder,/spawn_water/);
 assert.match(builder,/spawn_gardens/);
 assert.match(builder,/HUB_V5_PLAYER_START_SAFE/);
 assert.match(builder,/VALIDATION HUB 3B V5 PREMIUM: OK/);
 assert.doesNotMatch(builder,/def spawn_ring\(/);
 assert.doesNotMatch(builder,/def spawn_spoke\(/);
 assert.doesNotMatch(builder,/def spawn_petals/);
});

test('one-click launch now builds Hub3B Main V05 premium while V4 remains only legacy fallback',()=>{
 assert.match(launcher,/build_hub3b_main_v5\.py/);
 assert.match(launcher,/-3BHubV5AutoBuild/);
 assert.match(init,/-3BHubV5AutoBuild/);
 assert.match(init,/build_hub3b_main_v5\.py/);
 assert.match(readme,/Hub3B_Main_V05/);
 assert.match(readme,/Cité des Huit Héritages/);
 assert.match(readme,/ne sont plus la référence/i);
});


test('V05 native builder differentiates all civic functions and all eight heritage facilities',()=>{
 for(const token of [
  '_BALCONY_','_AWNING','_WORKSHOP_','_SCHOOL_','_CLINIC_',
  '_SHOP_WINDOW_','_GUILD_BANNER_','_CIVIC_CANOPY'
 ])assert.match(builder,new RegExp(token));
 for(const token of [
  'FR_TRIBUNAL','DZ_ALLIANCE','ES_STAGE','MA_CRAFT',
  'IT_REBUILD','TN_RESCUE','TR_OBSERVATORY','EE_DATA'
 ])assert.match(builder,new RegExp(token));
 assert.match(builder,/HUB_V5_DISTRICT_RETENTION_/);
 assert.match(builder,/district_terraces/);
 assert.match(builder,/heritage_identity/);
 assert.match(builder,/civic_identity/);
});


test('V05 premium manifest defines device budgets without changing the city',()=>{
 assert.equal(manifest.premium.release,'V05 Premium canonical');
 assert.equal(manifest.premium.same_city_mobile_desktop,true);
 assert.equal(manifest.performance.mobileMedium.target_fps,30);
 assert.equal(manifest.performance.mobileHigh.target_fps,60);
 assert.equal(manifest.performance.desktop.target_fps,60);
 assert.ok(manifest.performance.desktop.civic_frontages_per_district>manifest.performance.mobileMedium.civic_frontages_per_district);
 assert.ok(manifest.performance.desktop.street_furniture_per_district>manifest.performance.mobileMedium.street_furniture_per_district);
 assert.ok(manifest.premium.release_gate.includes('no legacy radial ring/spokes/petals model'));
});
