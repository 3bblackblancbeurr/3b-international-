import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Mesh,ShaderLib} from 'three';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';
import {createNaturalGround} from '../src/world/natural-ground.js';
import {REALM_PROVINCES,realmLayout,realmStreetFurniture,realmStaticObstacles,realmPositionValid,safeRealmPosition} from '../src/world/realm-layout.js';
import {createVillageFurnitureGeometry} from '../src/world/realm-village-props.js';
import {createRealmRoadGeometry} from '../src/world/realm-road-surface.js';
import {createTerrainField} from '../src/world/terrain.js';
import {blankSave} from '../src/world/rules.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findPath} from '../src/world/navigation.js';

test('regional homes keep one draw and bounded geometry while their roofs have different physical silhouettes',()=>{
 const heights={};
 for(const region of Object.keys(REALM_PROVINCES)){
  const architecture=createRealmArchitecture(region);
  try{
   for(const floors of [1,2]){
    const geometry=architecture.house(floors),triangles=(geometry.index?.count||geometry.attributes.position.count)/3;
    assert.equal(geometry.groups.length,0,'Every detailed home keeps one material draw');
    assert.ok(triangles<=5000,region+' mobile instance geometry: '+triangles);
    const bounds=new Box3().setFromObject(new Mesh(geometry,architecture.material)),size=bounds.getSize(new Vector3());
    assert.ok(size.x<15&&size.z<14,region+' upper-floor details stay close to the existing collision footprint');
    if(floors===1)heights[region]=size.y;
   }
  }finally{architecture.dispose();}
 }
 assert.ok(heights.estonie>heights.italie+1,'Baltic gables read steeper than Mediterranean roofs');
 assert.ok(heights.france>heights.espagne,'Dormers and chimney retain a distinct French skyline');
});

test('terrain quality and weather change uniforms without reallocating materials or program variants',()=>{
 const ground=createNaturalGround('maroc'),material=ground.material;
 try{
  const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  const program=material.customProgramCacheKey(),version=material.version;
  ground.setQuality('fluid');const lowDetail=shader.uniforms.detailStrength.value;
  ground.setQuality('detail');assert.ok(shader.uniforms.detailStrength.value>lowDetail);
  ground.setWetness(10);assert.equal(shader.uniforms.surfaceWetness.value,1);
  ground.setWetness(-2);assert.equal(shader.uniforms.surfaceWetness.value,0);
  ground.setDaylight(-2);assert.equal(shader.uniforms.daylight.value,0);
  ground.setDaylight(10);assert.equal(shader.uniforms.daylight.value,1);
  assert.equal(material.version,version);assert.equal(material.customProgramCacheKey(),program);
 }finally{material.dispose();for(const map of Object.values(ground.maps))map?.dispose();}
});

test('street ensembles fit their canonical collisions and preserve village arrivals and civilian aisles',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const field=createTerrainField(region,blankSave()),furniture=realmStreetFurniture(region),obstacles=realmStaticObstacles(region),geometry=createVillageFurnitureGeometry(region,field.biome);
  try{
   assert.ok(furniture.length>=40,region+' inhabited villages');assert.equal(geometry.groups.length,0);
   assert.ok(geometry.attributes.position.count/3<1000,'One inexpensive instanced ensemble');
   const position=geometry.attributes.position;
   for(let i=0;i<position.count;i++){assert.ok(Math.hypot(position.getX(i),position.getZ(i))<=2.55);assert.ok(position.getY(i)<=4.45);}
   for(const prop of furniture){
    assert.ok(obstacles.some(o=>o.id===prop.id),'Rendered furniture has a canonical footprint');
    assert.equal(realmPositionValid(region,prop),false,'A save inside a circular furniture footprint is not safe');
    const resumed=safeRealmPosition(region,prop);assert.ok(realmPositionValid(region,resumed));assert.ok(obstacleDistance(resumed,prop)>=.9,'Resume relocates outside the furniture with player clearance');
   }
   for(const site of realmLayout(region).sites.filter(s=>s.kind!=='terminal'&&s.kind!=='guardianCourt')){
    assert.ok(obstacles.every(o=>obstacleDistance(site.arrival,o)>.9),region+' safe arrival');
    assert.ok(findPath(site.arrival,site.campaign,obstacles,field.radius).length,region+' mission remains reachable');
    for(const x of [-9,0,9])for(const z of [-28,0,29])assert.ok(furniture.every(o=>obstacleDistance({x:site.x+x,z:site.z+z},o)>.9),region+' civilian aisle stays clear');
   }
  }finally{geometry.dispose();}
 }
});

test('streets and shoulders follow real land in one finite opaque surface',()=>{
 const field=createTerrainField('algerie',blankSave()),site=realmLayout('algerie').sites.find(s=>s.id.endsWith('village-2-3')),geometry=createRealmRoadGeometry(field,[],[site]);
 try{
  assert.equal(geometry.groups.length,0);assert.ok(geometry.index.count/3<500);
  for(const attribute of Object.values(geometry.attributes))assert.ok([...attribute.array].every(Number.isFinite));
  const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const above=p.getY(i)-field.height(p.getX(i),p.getZ(i));assert.ok(above>.05&&above<.12,'Continuous sampled shoulder height');}
 }finally{geometry.dispose();}
});
