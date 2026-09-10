import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {BufferGeometry,BufferAttribute,Matrix4,Box3,Vector3} from 'three';
import {createLandscape,bakeGeometry} from '../src/world/landscape.js';
import {blankSave,worldItems} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {findPath} from '../src/world/navigation.js';
const load=async name=>{const b=fs.readFileSync(new URL('../public/world/models/'+name+'.glb',import.meta.url));return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
test('compressed normalized positions retain world-space height and location when batched',()=>{
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Int16Array([32767,0,0,0,32767,0,0,0,32767]),3,true));
 const baked=bakeGeometry(g,new Matrix4().makeTranslation(35,7,-28));baked.computeBoundingBox();assert.deepEqual(baked.boundingBox.min.toArray(),[35,7,-28]);assert.deepEqual(baked.boundingBox.max.toArray(),[36,8,-27]);baked.dispose();g.dispose();
});
test('all eight authored country layouts preserve routes to every objective and animated guardians',async()=>{
 const [kit,hero]=await Promise.all([load('chapter-kit'),load('kais-3d')]);assert.equal(kit.animations.length,16);
 for(const country of COUNTRIES){
  assert.ok(kit.scene.getObjectByName('Creature_'+country.id));
  const world=createLandscape({kit,hero},country.id,blankSave());world.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(world.root);assert.ok(bounds.max.y>8,'Architecture and tree canopies have height');
  for(const item of worldItems(country.id,blankSave())){const route=findPath({x:0,z:5},item,world.collisions);assert.ok(route.length,country.id+' '+item.id);assert.ok(Math.hypot(route.at(-1).x-item.x,route.at(-1).z-item.z)<item.range||Math.hypot(route.at(-1).x-item.x,route.at(-1).z-item.z)<5.5,country.id+' '+item.id);}
  world.dispose();
 }
});
