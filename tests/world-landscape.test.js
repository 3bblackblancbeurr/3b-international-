import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {BufferGeometry,BufferAttribute,Matrix4,Box3,Vector3} from 'three';
import {createLandscape,bakeGeometry} from '../src/world/landscape.js';
import {blankSave} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {findPath} from '../src/world/navigation.js';
import {landscapeItems,WORLD_RADIUS} from '../src/world/terrain.js';
import {advanceMotion} from '../src/world/motion.js';
const load=async name=>{const b=fs.readFileSync(new URL('../public/world/models/'+name+'.glb',import.meta.url));return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
test('compressed normalized positions retain world-space height and location when batched',()=>{
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Int16Array([32767,0,0,0,32767,0,0,0,32767]),3,true));
 const baked=bakeGeometry(g,new Matrix4().makeTranslation(35,7,-28));baked.computeBoundingBox();assert.deepEqual(baked.boundingBox.min.toArray(),[35,7,-28]);assert.deepEqual(baked.boundingBox.max.toArray(),[36,8,-27]);baked.dispose();g.dispose();
});
test('all eight authored country layouts preserve routes to every objective and animated guardians',async()=>{
 const [kit,hero,places]=await Promise.all([load('chapter-kit'),load('kais-3d'),load('../places/living-places')]);assert.equal(kit.animations.length,16);
 for(const country of [{id:"hub"},...COUNTRIES]){
  if(country.id!=='hub')assert.ok(kit.scene.getObjectByName('Creature_'+country.id));
  const world=createLandscape({kit,hero,places},country.id,blankSave());world.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(world.root);assert.ok(bounds.max.y>8,'Architecture and tree canopies have height');
  const objectives=landscapeItems(country.id,blankSave());
  const obstacles=[...world.collisions,...objectives.filter(i=>i.type==='portal').flatMap(i=>[-1,1].map(side=>({x:i.x+side*3.65,z:i.z,r:1.25})))];
  for(const item of objectives){
   const label=country.id+' '+item.id;
   assert.ok(Math.abs(world.height(item.x,item.z))<.05,'Dry level interaction: '+label);
   const path=findPath({x:0,z:5},item,obstacles,WORLD_RADIUS);assert.ok(path.length,label);
   let state={position:{x:0,z:5},target:path.shift(),route:path};
   for(let i=0;i<2400&&state.target;i++)state=advanceMotion(state,{x:0,z:0},1/30,10.5,obstacles,WORLD_RADIUS);
   assert.ok(Math.hypot(state.position.x-item.x,state.position.z-item.z)<(item.range||5.5),'Actual movement reaches '+label);
  }
  for(const building of world.field.buildings)assert.ok(Math.hypot(building.x-world.field.lake.x,building.z-world.field.lake.z)>world.field.lake.r+6,'Dry architecture');
  world.dispose();
 }
});
