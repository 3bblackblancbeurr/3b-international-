import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GARAGE_LIGHTING,GARAGE_INVENTORY,createGarageShowroom,addGarageLighting} from '../src/games/underground/GarageShowroomV2.js';
import {GARAGE_VIEWS,garageBrightness,garagePixelRatio,garageZoom,disposeGarageVehicle} from '../src/games/underground/GarageStageV2.js';

// These are executable scene/math/integration-contract tests, not mobile GPU QA.
test('modern garage is populated 3D geometry, not a background photo',()=>{
  const room=createGarageShowroom({labels:false});
  for(const name of ['garage_architecture','garage_workbench','garage_tool_cart','garage_storage_cabinets','garage_wheel_display','garage_performance_tires','garage_compressor','garage_diagnostic_station','garage_parts_detailing','garage_safety'])assert.ok(room.getObjectByName(name),name);
  assert.deepEqual(room.userData.inventory,[...GARAGE_INVENTORY]);
  let meshes=0,triangles=0;room.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  assert.ok(meshes>10&&meshes<70,`${meshes} static meshes`);
  assert.ok(triangles>1000&&triangles<90000,`${triangles} triangles`);
  room.userData.dispose();
});

test('floor is resin PBR, not a black metal mirror',()=>{
  const room=createGarageShowroom({labels:false}),floor=room.getObjectByName('garage_floor');
  assert.ok(floor);assert.equal(floor.material.roughness,.26);assert.equal(floor.material.metalness,.02);
  assert.equal(floor.material.specularIntensity,.55);assert.ok(floor.receiveShadow);room.userData.dispose();
});

test('7 area lights aim at the vehicle plus exactly 1 shadow light',()=>{
  const scene=new THREE.Scene();const rig=addGarageLighting(scene);let areas=0,shadows=0;
  rig.updateMatrixWorld(true);rig.traverse(o=>{if(o.castShadow)shadows++;if(o.isRectAreaLight){areas++;assert.ok(o.intensity>0&&o.intensity<50);assert.ok(o.width>0&&o.height>0);const forward=new THREE.Vector3(0,0,-1).applyQuaternion(o.quaternion),toward=new THREE.Vector3(0,.7,0).sub(o.position).normalize();assert.ok(forward.dot(toward)>.75,o.name);}});
  assert.equal(areas,7);assert.equal(shadows,1);assert.equal(GARAGE_LIGHTING.exposure,1.35);
});

test('brightness cannot be saved as black, NaN or extreme white',()=>{
  assert.equal(garageBrightness(-100),.9);assert.equal(garageBrightness(900),1.45);
  assert.equal(garageBrightness('broken'),1);assert.equal(garageBrightness(1.2),1.2);
});

test('DPR cap and zoom remain bounded on mobile',()=>{
  assert.equal(garagePixelRatio(4,true),1.25);assert.equal(garagePixelRatio(4,false),1.65);
  assert.equal(garageZoom(4,.01),2.4);assert.equal(garageZoom(4,9),7.2);
});

test('front camera looks from the negative-Z nose of the actual Montara',()=>{
  assert.ok(GARAGE_VIEWS.exterior.camera[2]<0);assert.ok(GARAGE_VIEWS.front.camera[2]<0);
  assert.ok(GARAGE_VIEWS.rear.camera[2]>0);assert.equal(GARAGE_VIEWS.profile.camera[2],0);
  for(const view of Object.values(GARAGE_VIEWS))assert.ok([...view.camera,...view.target,view.fov].every(Number.isFinite));
});

test('static resources are disposed once even on repeated cleanup',()=>{
  const room=createGarageShowroom({labels:false});let count=0;
  room.getObjectByName('garage_floor').material.addEventListener('dispose',()=>count++);
  room.userData.dispose();room.userData.dispose();assert.equal(count,1);
});

test('production asset disposal hook is not called twice',()=>{
  const model=new THREE.Group();let calls=0;model.userData.disposeProductionAsset=()=>calls++;
  disposeGarageVehicle(model);assert.equal(calls,1);disposeGarageVehicle(null);
});

test('integration initializes LTC and PMREM and suspends hidden rendering',()=>{
  const source=readFileSync(new URL('../src/games/underground/GarageStageV2.js',import.meta.url),'utf8');
  for(const required of ['RectAreaLightUniformsLib.init()','this.scene.environment=this.environment.texture','document.hidden','IntersectionObserver','webglcontextlost','this.pmrem?.dispose()'])assert.ok(source.includes(required),required);
});

test('garage keeps original production loader and adds brightness/zoom controls',()=>{
  const source=readFileSync(new URL('../src/games/underground/VehicleLabPreview.jsx',import.meta.url),'utf8');
  for(const required of ['loadProductionVehicle(vehicle)','createModularVehicleProxy(vehicle)','INSPECTION_PRESETS','Luminosité du garage','Zoom avant','data-garage="modern-showroom-v2"','id!==request.current'])assert.ok(source.includes(required),required);
  assert.ok(!source.includes('updateProductionVehicleRuntime('),'stationary wheels must not spin in showroom');
});
