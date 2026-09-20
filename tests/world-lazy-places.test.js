import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {addLivingPlaces} from '../src/world/places.js';
import {createSceneryOcclusion} from '../src/world/occlusion.js';

function placeAsset(name='UnionWorkshop'){
 const scene=new Group(),place=new Group(),geometry=new BoxGeometry(1,1,1),material=new MeshStandardMaterial();
 place.name=name;place.add(new Mesh(geometry,material));scene.add(place);
 return{asset:{scene,animations:[]},dispose(){geometry.dispose();material.dispose();}};
}

test('countries without authored living places never request the optional 1 MB pack',async()=>{
 createSceneryOcclusion();let calls=0;const root=new Group(),source=placeAsset();
 const authored=addLivingPlaces({getPlaces:async()=>{calls++;return source.asset;}},'france',root,()=>0,null);
 await authored.ready;
 assert.equal(calls,0);assert.equal(authored.groups.length,0);assert.equal(root.children.length,0);
 authored.dispose();source.dispose();
});

test('hub requests authored places lazily and keeps player sightline occlusion',async()=>{
 createSceneryOcclusion();let calls=0;const root=new Group(),source=placeAsset(),models={getPlaces:async()=>{calls++;return source.asset;}};
 const authored=addLivingPlaces(models,'hub',root,()=>0,null);
 assert.equal(authored.groups.length,1);assert.equal(root.children.length,1);assert.equal(authored.groups[0].children.length,0);
 await authored.ready;
 assert.equal(calls,1);assert.equal(authored.groups[0].children.length,1);assert.equal(authored.groups[0].children[0].name,'UnionWorkshop');
 const material=authored.groups[0].children[0].children[0].material;
 assert.match(material.customProgramCacheKey(),/3b-scenery-sightline-v4/);
 authored.dispose();source.dispose();
});
