import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityConstructionGrid,cityConstructionGridVisible} from '../src/city/city3b-construction-grid.js';
import {cityTerrainGeometry} from '../src/city/city3b-terrain-geometry.js';

test('grid follows all construction modes and catalogue but stays absent during visits',()=>{
 assert.equal(cityConstructionGridVisible(),false);
 assert.equal(cityConstructionGridVisible({constructionMode:true,tool:'inspect'}),true);
 for(const tool of ['build','move','road','landscape','signal','erase']){
  assert.equal(cityConstructionGridVisible({tool}),true);
  assert.equal(cityConstructionGridVisible({tool,constructionMode:true,previewOnly:true}),false);
 }
 assert.equal(cityConstructionGridVisible({tool:'inspect'}),false);
});
test('grid covers flat and sculpted maps, shares terrain and never intercepts placement picking',()=>{
 const grid=createCityConstructionGrid(),flat=cityTerrainGeometry(1000,[]),hill=cityTerrainGeometry(50,[{kind:'hill',x1:0,z1:0,width:30}]);
 grid.setTerrain(flat);assert.equal(grid.mesh.geometry,flat);assert.equal(flat.attributes.position.count,4);
 grid.setTerrain(hill);assert.equal(grid.mesh.geometry,hill);assert.ok(hill.attributes.position.getY(0)+grid.mesh.position.y>hill.attributes.position.getY(0));
 const picks=[];grid.mesh.raycast({},picks);assert.deepEqual(picks,[]);
 assert.equal(grid.mesh.material.depthWrite,false);assert.equal(grid.mesh.material.depthTest,true);
 let disposed=false;hill.addEventListener('dispose',()=>disposed=true);grid.dispose();assert.equal(disposed,false);
 flat.dispose();hill.dispose();
});
