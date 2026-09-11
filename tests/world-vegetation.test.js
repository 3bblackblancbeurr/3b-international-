import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Matrix4,Vector3} from 'three';
import {createPlantGeometry,createFlora,FLORA_TYPES} from '../src/world/flora.js';
import {createTerrainField} from '../src/world/terrain.js';
import {blankSave} from '../src/world/rules.js';
import {meadowPlacements,plantingAllowed,addMeadow} from '../src/world/vegetation.js';
import {GROUND_STYLE} from '../src/world/natural-ground.js';
import {createSceneryOcclusion} from '../src/world/occlusion.js';

test('six plant silhouettes have finite geometry, individual leaves and a bounded polygon budget',()=>{
 const heights=[];
 for(const type of FLORA_TYPES){
  const plant=createPlantGeometry(type,83),triangles=(plant.wood.attributes.position.count+plant.leaves.attributes.position.count)/3;
  assert.ok(triangles<6500,type+' triangle budget');assert.ok(plant.leaves.attributes.position.count>500);
  assert.equal(plant.leaves.attributes.plantFlex.count,plant.leaves.attributes.position.count);
  for(const g of Object.values(plant))for(const a of Object.values(g.attributes))assert.ok(a.array.every(Number.isFinite));
  heights.push(plant.leaves.boundingBox.max.y);plant.wood.dispose();plant.leaves.dispose();
 }
 assert.ok(heights[2]>heights[0]&&heights[0]>heights[1]&&heights[1]>heights[5]);
});

test('trees share instance batches but separate garden visibility, with matching camera occlusion and wind',()=>{
 const root=new Group(),garden=new Group(),occlusion=createSceneryOcclusion(),flora=createFlora('france',13,occlusion);root.add(garden);
 for(let i=0;i<20;i++)flora.plant('Tree',i*5,0,30,1,0,root);
 flora.plant('Tree',0,0,0,.7,0,garden);flora.finish();
 assert.equal(flora.instances.length,4);assert.equal(flora.instances[0].count,20);assert.equal(flora.instances[2].count,1);garden.visible=false;assert.equal(root.children[1].visible,true);
 const matrix=new Matrix4();flora.instances[0].getMatrixAt(19,matrix);assert.equal(new Vector3().setFromMatrixPosition(matrix).x,95);
 const leaf=flora.instances[1],wood=flora.instances[0];assert.notEqual(leaf.material.customProgramCacheKey(),wood.material.customProgramCacheKey());
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};leaf.material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('cityWorld=instanceMatrix*cityWorld'));assert.ok(shader.uniforms.floraTime&&shader.uniforms.cityCamera);assert.ok(leaf.customDepthMaterial);
 let disposed=0;for(const m of flora.instances)m.addEventListener('dispose',()=>disposed++);flora.dispose();assert.equal(disposed,4);
});

test('meadows stay off roads, buildings, water and interactions and reduce density in fluid mode',()=>{
 for(const region of ['hub','france','estonie','maroc']){
  const field=createTerrainField(region,blankSave()),points=meadowPlacements(field,region);assert.ok(points.length>1000);assert.ok(points.length<=GROUND_STYLE[region].count);
  for(const p of points){assert.ok(plantingAllowed(field,p.x,p.z,.2));assert.ok(p.y>=-.4&&p.y<=13);}
 }
 const owned=[],root=new Group(),meadow=addMeadow(createTerrainField('hub',blankSave()),root,owned,'hub');assert.ok(meadow.meshes.length<=16);
 meadow.setQuality('fluid');for(const {mesh,count} of meadow.meshes)assert.equal(mesh.count,Math.round(count*.55));
 meadow.setQuality('detail');for(const {mesh,count} of meadow.meshes)assert.equal(mesh.count,count);
 owned.forEach(o=>o.dispose());
});
