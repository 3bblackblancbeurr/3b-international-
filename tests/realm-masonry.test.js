import test from 'node:test';
import assert from 'node:assert/strict';
import {LinearMipmapLinearFilter} from 'three';
import {REALM_PROVINCES} from '../src/world/realm-layout.js';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';

test('all eight masonry families use valid metric surfaces in one material draw',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const architecture=createRealmArchitecture(region),geometries=[architecture.house(1),architecture.house(2),...REALM_PROVINCES[region].map(p=>architecture.monument(p[1])),architecture.guardianCourt()];
  try{
   assert.equal(architecture.material.isMeshStandardMaterial,true);assert.equal(architecture.material.vertexColors,true);
   for(const geometry of geometries){
    assert.equal(geometry.groups.length,0,region+' has no extra material draws');
    const {position,normal,uv,realmSurface}=geometry.attributes;
    for(const attribute of [position,normal,uv,realmSurface]){assert.ok(attribute,region+' masonry surface attribute');assert.equal(attribute.count,position.count);assert.ok([...attribute.array].every(Number.isFinite),region+' finite surface attribute');}
    assert.equal(uv.itemSize,2);assert.equal(realmSurface.itemSize,1);
    for(let vertex=0;vertex<position.count;vertex++){assert.ok(Math.abs(Math.hypot(normal.getX(vertex),normal.getY(vertex),normal.getZ(vertex))-1)<.002,region+' unit normal');const surface=realmSurface.getX(vertex);assert.ok(Number.isInteger(surface)&&surface>=0&&surface<=3,region+' valid atlas cell');}
    const count=geometry.index?.count||position.count;
    for(let triangle=0;triangle<count;triangle+=3){const a=geometry.index?.getX(triangle)??triangle,b=geometry.index?.getX(triangle+1)??triangle+1,c=geometry.index?.getX(triangle+2)??triangle+2;assert.equal(realmSurface.getX(a),realmSurface.getX(b),region+' stable triangle atlas cell');assert.equal(realmSurface.getX(a),realmSurface.getX(c),region+' stable triangle atlas cell');const area=(uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getY(b)-uv.getY(a))*(uv.getX(c)-uv.getX(a));assert.ok(Math.abs(area)>1e-10,region+' non-degenerate masonry projection');}
   }
   assert.ok(architecture.guardianCourt().attributes.position.count<8000,'Permanent court keeps its mobile geometry budget');
  }finally{architecture.dispose();}
 }
});

test('masonry has three bounded mipmapped atlases and releases every owned resource',()=>{
 for(const region of Object.keys(REALM_PROVINCES)){
  const architecture=createRealmArchitecture(region),material=architecture.material,geometries=new Set([architecture.house(1),architecture.house(2),...REALM_PROVINCES[region].map(p=>architecture.monument(p[1])),architecture.guardianCourt()]),textures=new Set([material.map,material.normalMap,material.roughnessMap]);
  assert.equal(textures.size,3,'Colour, normal and roughness have separate atlases');
  const disposed=new Map();for(const resource of [...geometries,material,...textures]){assert.ok(resource,region+' actual allocated resource');disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));}
  for(const texture of textures){assert.equal(texture.image.width,512);assert.equal(texture.image.height,512);assert.equal(texture.generateMipmaps,true);assert.equal(texture.minFilter,LinearMipmapLinearFilter);assert.ok(texture.anisotropy<=4,'Mobile atlas filtering budget');}
  architecture.dispose();architecture.dispose();for(const count of disposed.values())assert.equal(count,1,'Every owned geometry, atlas and material is released once, even after repeated teardown');
 }
});
