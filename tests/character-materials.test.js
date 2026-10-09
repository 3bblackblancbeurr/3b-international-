import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareTintMaterial} from '../src/world/avatar-material.js';
import {createLivingActor} from '../src/world/living.js';
import {fitGarments} from '../src/world/garments.js';
import {guardianIdentity,guardianRecipe} from '../src/world/guardian-identity.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

test('two actors preserve their cached albedo and normal textures while separating skin, cloth, leather and metal',async()=>{
 const asset=await loadShippedCrowdFixture(4),textures=[],cached=[];
 asset.scene.traverse(o=>{
  if(!o.isMesh)return;
  const m=o.material;m.normalMap=new T.Texture();m.roughnessMap=new T.Texture();m.metalnessMap=new T.Texture();
  textures.push(m.normalMap,m.roughnessMap,m.metalnessMap);
  cached.push({m,normal:m.normalMap,orm:m.roughnessMap,color:m.color.clone(),scale:m.normalScale.clone(),roughness:m.roughness,metalness:m.metalness});
 });
 const actors=[];
 try{
  for(const skinColor of ['#e7c8b2','#7d573a'])await new Promise((ok,fail)=>{
   const actor=createLivingActor({load:async()=>asset},{avatar:{body:'femme',style:'sentinelle',skinColor,fabric:'satin',outer:'cape'},onLoad:ok,onError:fail});actors.push(actor);
  });
  const roles=actors.map(actor=>{
   const materials=new Map();actor.object.traverse(o=>{if(o.isMesh&&o.material?.userData.surface3b)materials.set(o.material.name,o.material);});return materials;
  });
  for(const entry of cached){
   for(const materials of roles){
    const owned=materials.get(entry.m.name);assert.ok(owned,entry.m.name+' remains a renderable slot');
    assert.notEqual(owned,entry.m,'personal surface owns its parameters');
    assert.equal(owned.normalMap,entry.normal,'authored anatomical and clothing normals survive');
    assert.equal(owned.roughnessMap,null,'incorrect shared ORM no longer varnishes skin and cloth');
    assert.equal(owned.metalnessMap,null);
   }
   assert.equal(entry.m.roughnessMap,entry.orm);assert.equal(entry.m.roughness,entry.roughness);assert.equal(entry.m.metalness,entry.metalness);
   assert.ok(entry.m.color.equals(entry.color));assert.ok(entry.m.normalScale.equals(entry.scale),'cached normal strengths are not modified');
  }
  const slot=(role,match)=>[...roles[0].values()].find(m=>m.userData.surface3b===role&&(!match||match.test(m.name)));
  assert.equal(slot('skin').metalness,0);assert.equal(slot('eyes').metalness,0);assert.ok(slot('eyes').roughness<slot('skin').roughness,'iris has a wet highlight instead of skin roughness');
  assert.ok(slot('cloth',/Trouser/).roughness>slot('cloth',/ClothColor_ClothColor/).roughness,'trousers stay matte beneath a satin tunic');
  assert.ok(slot('metal').metalness>.7);assert.ok(slot('metal').color.equals(new T.Color('#c9ad75')),'neutralized trim receives the selected avatar metal colour');assert.equal(slot('leather').metalness,0);
  const firstSkin=slot('skin'),secondSkin=roles[1].get(firstSkin.name);assert.ok(!firstSkin.color.equals(secondSkin.color),'a second avatar cannot overwrite the first skin selection');
 }finally{actors.forEach(a=>a.dispose());textures.forEach(t=>t.dispose());}
});

test('surface programs distinguish skin, fabric and preserved patterns without allocating texture detail',()=>{
 const textures=[new T.Texture(),new T.Texture()],materials=[
  new T.MeshStandardMaterial({name:'SkinColor',map:textures[0]}),
  new T.MeshStandardMaterial({name:'ClothColor',map:textures[1]}),
  new T.MeshStandardMaterial({name:'TrimColor'}),
 ];
 try{
  materials.forEach((m,i)=>prepareTintMaterial(m,{pattern:i===1}));
  assert.equal(new Set(materials.map(m=>m.customProgramCacheKey())).size,3,'GPU programs cannot accidentally reuse the first material profile');
  for(const [i,m] of materials.entries()){
   const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
   assert.ok(shader.fragmentShader.includes('fwidth(phase3b.x)'),'subpixel detail fades before aliasing');
   assert.ok(shader.fragmentShader.includes('determinant)<1e-10'),'degenerate UVs cannot generate an invalid normal');
   if(i===0)assert.ok(shader.fragmentShader.includes('sampledDiffuseColor.a'),'skin tint preserves alpha and baked anatomical shading');
   if(i===1)assert.ok(shader.fragmentShader.includes('#include <map_fragment>'),'pattern RGB remains authored');
   assert.equal(Object.values(m).filter(v=>v?.isTexture).length,i===2?0:1,'detail does not consume a second texture or sampler');
  }
 }finally{materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
});

test('guardian capes have geometric folds on the shared rig and stay still with reduced motion',async()=>{
 const asset=await loadShippedCrowdFixture(4),model=clone(asset.scene),garments=fitGarments(model,guardianRecipe(guardianIdentity('france')),{reducedMotion:true});
 try{
  const cape=model.getObjectByName('Cape · plis');assert.ok(cape);assert.equal(cape.parent.name,'spine_03');
  const positions=cape.geometry.attributes.position,normals=cape.geometry.attributes.normal,base=Array.from(positions.array),length=Math.max(...base.filter((_,i)=>i%3===1).map(y=>-y));
  assert.ok(positions.count<150,'folds retain a small mobile mesh');
  const residual=Array.from({length:positions.count},(_,i)=>positions.getZ(i)+.09*(-positions.getY(i)/length));
  assert.ok(Math.max(...residual)-Math.min(...residual)>.025,'cape is physically pleated instead of a flat textured rectangle');
  assert.ok(Array.from(normals.array).every(Number.isFinite));
  garments.update(.2);garments.update(8);assert.deepEqual(Array.from(positions.array),base,'motion preference preserves the authored static drape');
 }finally{garments.dispose();}
});
