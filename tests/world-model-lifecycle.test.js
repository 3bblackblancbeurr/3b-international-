import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial,Texture} from 'three';
import {loadWorldModels} from '../src/world/models.js';

function deferred(){let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no;});return {promise,resolve,reject};}
function resourceCounts(resources){
 const counts=new Map(resources.map(resource=>[resource,0]));
 for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
 return counts;
}
function asset(geometry,material){const scene=new Group();scene.add(new Mesh(geometry,material));return {scene};}
function harness(){
 const kit=deferred(),atlas=deferred(),places=deferred(),hero={scene:new Group()};
 const living={disposals:0,load:async()=>hero,dispose(){this.disposals++;}};
 const promise=loadWorldModels({living,loader:{loadAsync:path=>path.includes('chapter-kit')?kit.promise:places.promise},textureLoader:{loadAsync:()=>atlas.promise}});
 return {kit,atlas,places,living,promise};
}

test('failed world downloads release already loaded and later arriving resources immediately',async()=>{
 const h=harness(),geometry=new BoxGeometry(),material=new MeshStandardMaterial(),lateGeometry=new BoxGeometry(),lateTexture=new Texture(),lateMaterial=new MeshStandardMaterial({map:lateTexture});
 const counts=resourceCounts([geometry,material,lateGeometry,lateTexture,lateMaterial]);
 h.kit.resolve(asset(geometry,material));await Promise.resolve();
 h.atlas.reject(Error('atlas offline'));
 await assert.rejects(h.promise,/atlas offline/);
 assert.equal(h.living.disposals,1);assert.equal(counts.get(geometry),1);assert.equal(counts.get(material),1);
 assert.equal(counts.get(lateGeometry),0,'the remaining download has not completed');
 h.places.resolve(asset(lateGeometry,lateMaterial));await Promise.resolve();
 assert.ok([...counts.values()].every(count=>count===1),'a late success must not escape failed bundle ownership');
});

test('successful world bundle keeps assets until disposal and disposes shared resources only once',async()=>{
 const h=harness(),geometry=new BoxGeometry(),texture=new Texture(),material=new MeshStandardMaterial({map:texture}),atlas=new Texture();
 const counts=resourceCounts([geometry,texture,material,atlas]);
 h.kit.resolve(asset(geometry,material));h.places.resolve(asset(geometry,material));h.atlas.resolve(atlas);
 const bundle=await h.promise;assert.ok([...counts.values()].every(count=>count===0));assert.equal(bundle.kit.living,h.living);
 bundle.dispose();bundle.dispose();assert.equal(h.living.disposals,1);
 assert.ok([...counts.values()].every(count=>count===1));
});

test('first model rejection does not wait for unrelated downloads and handles their later failures',async()=>{
 const h=harness(),atlas=new Texture(),counts=resourceCounts([atlas]);
 h.kit.reject(Error('kit unavailable'));await assert.rejects(h.promise,/kit unavailable/);
 assert.equal(h.living.disposals,1);h.atlas.resolve(atlas);h.places.reject(Error('places unavailable'));
 await Promise.resolve();await Promise.resolve();assert.equal(counts.get(atlas),1);
});
