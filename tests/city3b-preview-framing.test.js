import test from 'node:test';
import assert from 'node:assert/strict';
import {cityModelPrimitives,cityPreviewTriangles,cityPreviewFrame} from '../src/city/city3b-model-preview.js';

test('catalogue frames the complete geometry, including tall and legacy narrow parcels',()=>{
 for(const code of ['CITY_HALL_3B','HOME_ORIGIN','SCHOOL_3B','MARKET_3B','SOLAR_3B','WATER_3B','BUS_STOP_3B','PARK_UNITY','HOSPITAL_3B','TOWER_3B'])for(const size of [1,2,6,12]){
  const d={code,category:code==='HOME_ORIGIN'?'home':'community',footprint:{w:size,h:size*.8}};
  const faces=cityPreviewTriangles(d),frame=cityPreviewFrame(faces);
  assert.ok(faces.length>0);
  for(const p of faces.flatMap(f=>f.points)){
   const x=240+(p.x-frame.centerX)*frame.scale,y=frame.offsetY+(p.y-frame.minY)*frame.scale;
   assert.ok(x>=23&&x<=457&&y>=23&&y<=337,`${code}: ${x}, ${y}`);
  }
 }
});

test('solar equipment and water tanks remain exposed instead of being covered by the generic roof',()=>{
 const solar=cityModelPrimitives({code:'SOLAR_3B',category:'community',footprint:{w:2,h:2}});
 assert.ok(Math.max(...solar.map(p=>p.y+p.h/2))<1);
 const water=cityModelPrimitives({code:'WATER_3B',category:'community',footprint:{w:2,h:2}});
 assert.ok(water.filter(p=>p.type==='cylinder').length>=8);
 assert.ok(Math.max(...water.map(p=>p.y+p.h/2))<1.5);
});
