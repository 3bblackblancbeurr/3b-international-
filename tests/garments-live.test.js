import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitGarments} from '../src/world/garments.js';

function avatarRig(){
 const model=new THREE.Group();
 for(const [name,y] of [['Head',1.75],['spine_03',1.35],['pelvis',.9]]){
  const bone=new THREE.Group();bone.name=name;bone.position.y=y;model.add(bone);
 }
 model.updateMatrixWorld(true);
 return model;
}

test('live garment rebuild removes old generated accessory meshes',()=>{
 const model=avatarRig(),before=new Set();
 model.traverse(o=>before.add(o));
 const garments=fitGarments(model,{cloth:'#445566',accentColor:'#d7bd83',bootColor:'#4a382d',metalColor:'#c9ad75',outerColor:'#223344',fabric:'cotton',headwear:'beret',outer:'cape',bag:true,belt:'utility',pendant:true,capeLength:1,hoodFit:1});
 const generated=[];model.traverse(o=>{if(!before.has(o))generated.push(o);});
 assert.ok(generated.length>=8);
 garments.dispose();
 for(const piece of generated)assert.equal(piece.parent,null);
});


test('cloth motion stays finite when preview speed changes',()=>{
 const model=avatarRig();
 const garments=fitGarments(model,{cloth:'#445566',accentColor:'#d7bd83',bootColor:'#4a382d',metalColor:'#c9ad75',outerColor:'#223344',fabric:'cotton',headwear:'none',outer:'cape',bag:false,belt:'none',pendant:false,capeLength:1,hoodFit:1,pattern:'uni',weapon:'heritage'});
 for(let i=0;i<120;i++)garments.update(i/30,{speed:i<60?0:6,turn:i%20===0?.8:0});
 let checked=0;model.traverse(o=>{if(o.geometry?.attributes?.position){for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));checked++;}});
 assert.ok(checked>0);
 garments.dispose();
});
