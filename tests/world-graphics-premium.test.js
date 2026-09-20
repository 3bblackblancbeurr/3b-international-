import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_SCALE,buildingDimensions,facadeBayCount} from '../src/world/building-scale.js';
import {wetnessForWeather,advanceWetness} from '../src/world/wetness.js';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('premium Heritage platform is wired into the canonical landscape without a second navigation deck',()=>{
 const landscape=read('src/world/landscape.js'),terrain=read('src/world/terrain.js'),platform=read('src/world/heritage-platform.js');
 assert.match(landscape,/addHeritagePlatform/);
 assert.match(landscape,/premiumPlatform\.tick\(time\)/);
 assert.match(terrain,/region==='hub'\?38:13/);
 assert.match(platform,/Three shallow octagonal tiers/);
 assert.match(platform,/player remains on the canonical terrain\/collision plane/);
 assert.match(platform,/3B-Heritage-Platform/);
});

test('hub roads and buildings use the premium visual builders',()=>{
 const scene=read('src/world/scene.js'),visuals=read('src/world/premium-hub-visuals.js');
 assert.match(scene,/buildPremiumHubRoad\(item/);
 assert.match(scene,/decorateHubBuilding\(item/);
 assert.match(visuals,/trottoir|paving|curbMat/);
 assert.match(visuals,/tower_circle/);
 assert.match(visuals,/memory_archives/);
 assert.doesNotMatch(scene,/const car=mesh\('box',material\('#192f3b'/);
});

test('hub missions, secrets and transports no longer depend on prototype sphere-ring markers',()=>{
 const scene=read('src/world/scene.js');
 assert.match(scene,/createPremiumHubMarker\(item/);
 assert.match(scene,/createPremiumTransportVisual\(item/);
 assert.match(scene,/createPremiumTransitVehicle\(spec/);
 assert.doesNotMatch(scene,/const ob=mesh\('sphere',mat,item\.x,y\+1\.35/);
 assert.doesNotMatch(scene,/const pylon=mesh\('cylinder',mat,item\.x,y\+\.9/);
});

test('premium visual helpers remain rendering-only and do not mutate world progression',()=>{
 const visuals=read('src/world/premium-hub-visuals.js'),platform=read('src/world/heritage-platform.js');
 for(const source of [visuals,platform]){
  assert.doesNotMatch(source,/recordWorldAction|saveWorld|supabase|reward|xp\s*[+\-]=|shards\s*[+\-]=/i);
 }
});


test('premium desktop rendering increases shadow detail without forcing mobile cost',()=>{
 const scene=read('src/world/scene.js');
 assert.match(scene,/highEndAuto=mode==='auto'/);
 assert.match(scene,/memory>=8/);
 assert.match(scene,/\?2048:1024/);
 assert.match(scene,/renderer\.shadowMap\.enabled=mode!==\'fluid\'/);
});

test('premium exploration HUD keeps information but reduces its visual footprint',()=>{
 const css=read('src/world/exploration.css');
 assert.match(css,/Premium graphics pass/);
 assert.match(css,/\.world-shell \.world-minimap:hover/);
 assert.match(css,/width:118px/);
 assert.match(css,/\.world-shell \.play-interaction/);
});


test('the eight hub portals receive a monumental outer frame without changing country portal logic',()=>{
 const scene=read('src/world/scene.js'),portals=read('src/world/portals.js');
 assert.match(scene,/if\(region==='hub'\)/);
 assert.match(scene,/TorusGeometry\(1,\.045,8,96\)/);
 assert.match(scene,/obstacles\.push\(\{x:px,z:item\.z,r:\.72\}\)/);
 assert.match(portals,/Eight crafted thresholds/);
});


test('premium water uses two animated normal maps, Fresnel, depth, rain, foam and adaptive quality',()=>{
 const water=read('src/world/premium-water.js'),landscape=read('src/world/landscape.js'),scene=read('src/world/scene.js');
 assert.match(water,/normalA/);
 assert.match(water,/normalB/);
 assert.match(water,/fresnel/);
 assert.match(water,/refract\(/);
 assert.match(water,/foamAmount/);
 assert.match(water,/rainPulse/);
 assert.match(water,/matrixBlue/);
 assert.match(water,/champagneGold/);
 assert.match(water,/low:\{/);
 assert.match(water,/medium:\{/);
 assert.match(water,/high:\{/);
 assert.match(landscape,/createPremiumWater/);
 assert.match(scene,/setWeather\?\.\(weather\)/);
 assert.match(scene,/setDaylight\?\.\(worldTime\.daylight\)/);
});

test('hub waterfront adds promenade, wet edge, stairs, pontoons and controlled lighting',()=>{
 const waterfront=read('src/world/premium-waterfront.js'),landscape=read('src/world/landscape.js');
 assert.match(waterfront,/3B-Premium-Waterfront/);
 assert.match(waterfront,/wetBand/);
 assert.match(waterfront,/Three stairs and pontoons/);
 assert.match(waterfront,/waterfront pavilion/);
 assert.match(landscape,/addPremiumWaterfront/);
});


test('opening cinematic starts low over water before revealing the hub skyline',()=>{
 const scene=read('src/world/scene.js');
 assert.match(scene,/waterReveal:true/);
 assert.match(scene,/focus=\{x:0,z:-145\}/);
 assert.match(scene,/cameraLift=waterReveal\?4\.2/);
 assert.match(scene,/focusLift=waterReveal\?2\.6/);
 assert.match(scene,/returnBlend=waterReveal/);
});

test('quality selector exposes LOW MEDIUM HIGH while preserving legacy technical values',()=>{
 const page=read('src/world/WorldPage.jsx');
 assert.match(page,/value="fluid">LOW/);
 assert.match(page,/value="auto">MEDIUM/);
 assert.match(page,/value="detail">HIGH/);
});


test('premium ground reacts to weather and adds controlled wear cracks joints and puddle roughness',()=>{
 const ground=read('src/world/natural-ground.js'),landscape=read('src/world/landscape.js');
 assert.match(ground,/surfaceWetness/);
 assert.match(ground,/crackField/);
 assert.match(ground,/urbanJoint/);
 assert.match(ground,/wetMask/);
 assert.match(ground,/roughnessFactor=mix/);
 assert.match(ground,/setWeather\(weather\)/);
 assert.match(landscape,/soil\.setWeather/);
});

test('vegetation breaks repetition with edge growth and multiple botanical silhouettes',()=>{
 const grass=read('src/world/vegetation.js'),flora=read('src/world/flora.js');
 assert.match(grass,/edgeGrowthPlacements/);
 assert.match(grass,/width:\.72\+rng/);
 assert.match(grass,/mode==='fluid'\?\.48/);
 assert.match(flora,/variant=.*%3/);
 assert.match(flora,/flora-'\+type\+'-v'/);
});

test('sky is weather-aware with premium night depth clouds mist and stars',()=>{
 const sky=read('src/world/sky.js'),scene=read('src/world/scene.js');
 assert.match(sky,/cloudiness/);
 assert.match(sky,/storminess/);
 assert.match(sky,/mistiness/);
 assert.match(sky,/starCell/);
 assert.match(sky,/setAtmosphere/);
 assert.match(scene,/sky\.setAtmosphere/);
});

test('premium micro-details stay instanced and quality scalable',()=>{
 const details=read('src/world/premium-microdetails.js'),landscape=read('src/world/landscape.js');
 for(const token of ['micro-bollards','micro-drains','micro-utility','micro-litter','micro-crates','micro-bins','micro-sign-faces','micro-puddles'])assert.match(details,new RegExp(token));
 assert.match(details,/InstancedMesh/);
 assert.match(details,/mode==='fluid'\?\.45/);
 assert.match(landscape,/addPremiumMicroDetails/);
});

test('architecture and scene materials use controlled live wetness',()=>{
 const architecture=read('src/world/architecture.js'),scene=read('src/world/scene.js');
 assert.match(architecture,/archWetness/);
 assert.match(architecture,/MeshPhysicalMaterial/);
 assert.match(architecture,/setWeather\(weather\)/);
 assert.match(scene,/sceneWetness/);
 assert.match(scene,/sceneDaylight/);
 assert.match(scene,/3b-scene-wetness-v2/);
});

test('night lighting preserves 3B hierarchy and scales down in LOW',()=>{
 const lighting=read('src/world/premium-lighting.js'),landscape=read('src/world/landscape.js');
 assert.match(lighting,/#d6b46a/);
 assert.match(lighting,/#00a8ff/);
 assert.match(lighting,/Math\.pow\(night,1\.65\)/);
 assert.match(lighting,/mode!==\'fluid\'/);
 assert.match(landscape,/addPremiumWorldLighting/);
});

test('roads and building feet receive explicit premium transition layers',()=>{
 const settlement=read('src/world/settlement-mesh.js');
 assert.match(settlement,/wetSeam/);
 assert.match(settlement,/road\.width\+1\.45/);
 assert.match(settlement,/baseSeam/);
});


test('hub skyline has deliberate low medium high tiers and a dominant Broken Circle Tower',()=>{
 const metro=read('src/world/hub/metropolis.js');
 assert.match(metro,/tower_circle:\[42,42,118\]/);
 assert.match(metro,/tierRoll<58/);
 assert.match(metro,/tierRoll<90/);
 assert.match(metro,/60\+\(\(h>>>17\)%24\)/);
});


test('building feet use instanced contact shadows and weather-driven dampness',()=>{
 const contact=read('src/world/contact-lighting.js'),landscape=read('src/world/landscape.js');
 assert.match(contact,/Town damp building feet/);
 assert.match(contact,/MeshPhysicalMaterial/);
 assert.match(contact,/setWeather\(weather\)/);
 assert.match(contact,/setQuality\(mode\)/);
 assert.match(landscape,/buildingContact\.setWetness/);
});


test('canonical world scale keeps inhabited architecture believable across regions',()=>{
 const regions=['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'];
 for(const region of regions)for(let variant=0;variant<5;variant++){
  const d=buildingDimensions(region,variant,true),doorRatio=d.doorHeight/WORLD_SCALE.avatarHeight;
  assert.ok(doorRatio>=WORLD_SCALE.minDoorClearanceRatio&&doorRatio<=WORLD_SCALE.maxDoorClearanceRatio,`${region}/${variant} door ratio ${doorRatio}`);
  assert.ok(d.storey-d.doorHeight>=WORLD_SCALE.minStoreyHeadroom,`${region}/${variant} storey headroom`);
  for(const [face,span] of [d.width,d.depth].entries()){
   const bays=facadeBayCount(span,variant,face),pitch=(span-.75)/bays;
   assert.ok(bays>=3&&bays<=5,`${region}/${variant} bay count`);
   assert.ok(pitch>=WORLD_SCALE.minFacadeBay&&pitch<=WORLD_SCALE.maxFacadeBay,`${region}/${variant} facade pitch ${pitch}`);
  }
 }
});

test('credibility pass breaks mechanical urban repetition without adding draw-call-heavy unique meshes',()=>{
 const architecture=read('src/world/architecture.js'),details=read('src/world/premium-microdetails.js'),metro=read('src/world/hub/metropolis.js');
 assert.match(architecture,/facadeBayCount\(span,variant,face\)/);
 assert.match(architecture,/col-\(bays-1\)\/2/);
 assert.match(details,/localSlope\(field,cx,cz\)/);
 assert.match(details,/spacing=baseStep\*\(\.78\+rng\(\)\*\.55\)/);
 assert.match(details,/drainSide=/);
 assert.match(details,/InstancedMesh/);
 assert.match(metro,/GOLDEN_ANGLE/);
 assert.match(metro,/districtSeed/);
 assert.match(metro,/basePhase=.*jitter=/);
});


test('credibility pass 2 removes symmetric lighting and periodic waterfront cadence',()=>{
 const visuals=read('src/world/premium-hub-visuals.js'),lighting=read('src/world/premium-lighting.js'),waterfront=read('src/world/premium-waterfront.js');
 assert.match(visuals,/rhythmSeed=hash/);
 assert.match(visuals,/lampFractions=/);
 assert.match(lighting,/userData\.priority/);
 assert.match(lighting,/mode!==\'fluid\'\|\|light\.userData\.priority>=\.72/);
 assert.doesNotMatch(lighting,/for\(let i=0;i<6;i\+\+\)/);
 assert.match(waterfront,/railSegments=new Set/);
 assert.match(waterfront,/lampSegments=new Set/);
 assert.doesNotMatch(waterfront,/i%4===1/);
});

test('weather atmosphere transitions progressively instead of snapping every state',()=>{
 const sky=read('src/world/sky.js');
 assert.match(sky,/targetAtmosphere/);
 assert.match(sky,/Math\.exp\(-dt\*speed\)/);
 assert.match(sky,/approach\(uniforms\.cloudiness\.value,targetAtmosphere\.cloudiness/);
});

test('LOW keeps cheap building contact shadows to avoid floating architecture',()=>{
 const contact=read('src/world/contact-lighting.js');
 assert.match(contact,/shadow\.count=full/);
 assert.match(contact,/damp\.count=mode===\'fluid\'/);
});


test('HIGH water can mirror real scene geometry without charging LOW or MEDIUM',()=>{
 const water=read('src/world/premium-water.js'),landscape=read('src/world/landscape.js'),scene=read('src/world/scene.js');
 assert.match(water,/new THREE\.WebGLRenderTarget/);
 assert.match(water,/reflectionMatrix/);
 assert.match(water,/mirrorCamera/);
 assert.match(water,/high:\{[^\n]*sceneReflection:\.72/);
 assert.match(water,/medium:\{[^\n]*sceneReflection:0/);
 assert.match(water,/low:\{[^\n]*sceneReflection:0/);
 assert.match(water,/renderer\.render\(scene,mirrorCamera\)/);
 assert.match(landscape,/renderWaterReflection\(renderer,scene,camera,time\)/);
 assert.match(scene,/renderWaterReflection\?\.\(renderer,scene,camera,elapsed\)/);
});

test('waterfront geometry contributes real contact foam around walls stairs and pontoons',()=>{
 const water=read('src/world/premium-water.js'),waterfront=read('src/world/premium-waterfront.js'),landscape=read('src/world/landscape.js');
 assert.match(water,/contactFoam/);
 assert.match(water,/setFoamContacts/);
 assert.match(waterfront,/foamContacts\.push/);
 assert.match(waterfront,/pontoon/);
 assert.match(waterfront,/step>=4/);
 assert.match(landscape,/premiumWater\.setFoamContacts\(waterfront\.foamContacts\)/);
});

test('hub skyline protects sightlines around the Broken Circle tower and waterfront',()=>{
 const metro=read('src/world/hub/metropolis.js');
 assert.match(metro,/protectedVista=\['heritage_square','broken_circle_tower','docks'\]/);
 assert.match(metro,/district\.id==='broken_circle_tower'/);
 assert.match(metro,/Math\.min\(height,44\)/);
});


test('wetness is continuous, wets faster than it dries and remains bounded',()=>{
 assert.equal(wetnessForWeather('storm'),1);
 assert.equal(wetnessForWeather('rain'),.55);
 assert.equal(wetnessForWeather('clear'),.06);
 let wet=.06;for(let i=0;i<20;i++)wet=advanceWetness(wet,1,.25);
 let dry=1;for(let i=0;i<20;i++)dry=advanceWetness(dry,.06,.25);
 assert.ok(wet>.85,'rain should build visible wetness quickly');
 assert.ok(dry>.55,'surfaces should remain visibly wet shortly after rain stops');
 assert.ok(wet>=0&&wet<=1&&dry>=0&&dry<=1);
});

test('ground facades puddles contacts and hub materials share the progressive wetness signal',()=>{
 const landscape=read('src/world/landscape.js'),scene=read('src/world/scene.js'),ground=read('src/world/natural-ground.js'),architecture=read('src/world/architecture.js'),details=read('src/world/premium-microdetails.js'),contact=read('src/world/contact-lighting.js');
 assert.match(landscape,/wetnessState=advanceWetness\(wetnessState,wetnessTarget,dt\)/);
 assert.match(landscape,/soil\.setWetness\?\.\(wetnessState\)/);
 assert.match(landscape,/architecture\.setWetness\?\.\(wetnessState\)/);
 assert.match(landscape,/microDetails\.setWetness\?\.\(wetnessState\)/);
 assert.match(landscape,/buildingContact\.setWetness\?\.\(wetnessState\)/);
 assert.match(scene,/sceneWetness\.value=advanceWetness\(sceneWetness\.value,sceneWetnessTarget,dt\)/);
 for(const source of [ground,architecture,details,contact])assert.match(source,/setWetness/);
});


test('PBR pass separates color data from bump and roughness response',()=>{
 const surfaces=read('src/world/surfaces.js'),architecture=read('src/world/architecture.js'),settlement=read('src/world/settlement-mesh.js');
 assert.match(surfaces,/surfaceMaterialMaps/);
 assert.match(surfaces,/bumpMap\.colorSpace=THREE\.NoColorSpace/);
 assert.match(surfaces,/roughnessTexture/);
 assert.match(architecture,/roughnessMap:maps\?\.roughnessMap/);
 assert.match(architecture,/transmission:\.14/);
 assert.match(architecture,/ior:1\.46/);
 assert.match(settlement,/\.\.\.stoneMaps/);
 assert.match(settlement,/\.\.\.earthMaps/);
});

test('hub physical materials distinguish glass champagne gold and black metal',()=>{
 const scene=read('src/world/scene.js'),visuals=read('src/world/premium-hub-visuals.js');
 assert.match(scene,/THREE\.MeshPhysicalMaterial/);
 assert.match(scene,/\['clearcoat','transmission','ior','thickness','specularIntensity'\]/);
 assert.match(visuals,/transmission:\.12/);
 assert.match(visuals,/metalness:\.92/);
 assert.match(visuals,/clearcoatRoughness:\.14/);
});


test('VFX hierarchy reduces permanent neon in daylight while preserving night identity',()=>{
 const scene=read('src/world/scene.js'),post=read('src/world/postprocessing.js');
 assert.match(scene,/totalEmissiveRadiance\*=mix\(1\.12,\.48,sceneDaylight\)/);
 assert.match(scene,/uniform float time,daylight/);
 assert.match(scene,/float pulse=mix\(\.075,\.026,daylight\)/);
 assert.match(scene,/mat\.uniforms\.daylight\.value=sceneDaylight\.value/);
 assert.match(post,/\.008\*intensity/);
 assert.match(post,/streak\*\.045\*flare\*intensity/);
 assert.match(post,/\.0075\*grain\*intensity/);
});
