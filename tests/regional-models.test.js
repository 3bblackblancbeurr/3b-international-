import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Box3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const dir=new URL('../public/world/districts/',import.meta.url);
test('seven regional kits and both detail levels decode at human scale with verified file hashes',async()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir))),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 assert.equal(manifest.models.length,21);assert.equal(new Set(manifest.models.map(m=>m.country)).size,7);
 for(const model of manifest.models)for(const file of model.files){
  const buffer=fs.readFileSync(new URL(file.file,dir));assert.equal(buffer.length,file.bytes);assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),file.sha256);
  assert.ok(buffer.length<750000,file.file+' download budget');
  const asset=await loader.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length),'');
  const bounds=new Box3().setFromObject(asset.scene);assert.ok(bounds.min.y>=-.1&&bounds.max.y>model.floors*5.5&&bounds.max.y<model.floors*5.6+8,file.file+' height');
  assert.ok(bounds.max.x-bounds.min.x<17&&bounds.max.z-bounds.min.z<17,file.file+' footprint');
  let triangles=0;asset.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));o.geometry.dispose();o.material.dispose();}});assert.ok(triangles>100&&triangles<100000,file.file+' triangle budget');
 }
});
