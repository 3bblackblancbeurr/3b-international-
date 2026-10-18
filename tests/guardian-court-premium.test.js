import test from 'node:test';
import assert from 'node:assert/strict';
import {createRealmArchitecture} from '../src/world/realm-architecture.js';
import {GUARDIAN_COURT_ART} from '../src/world/guardian-court-art.js';
import {REALM_COURT_COLUMNS,realmLayout,realmStaticObstacles} from '../src/world/realm-layout.js';
import {obstacleDistance} from '../src/world/collision.js';
import {worldRealmArt} from '../src/design-system/tokens.js';

const regions=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];

test('the eight Guardian courts now have unique in-world artwork, not cloned stone rings',()=>{
 assert.equal(Object.keys(GUARDIAN_COURT_ART).length,8);
 assert.equal(new Set(regions.map(region=>GUARDIAN_COURT_ART[region].symbol)).size,8);
 assert.equal(new Set(regions.map(region=>GUARDIAN_COURT_ART[region].name)).size,8);
 for(const region of regions){
  const profile=GUARDIAN_COURT_ART[region];
  assert.ok(profile.strokes.length>=5&&profile.strokes.length<=7,region+' bounded authored heraldry');
  assert.ok(worldRealmArt[region]?.sun&&worldRealmArt[region]?.cloth);
  for(const stroke of profile.strokes){
   assert.equal(stroke.length,4);
   assert.ok(stroke.every(Number.isFinite));
   assert.ok(Math.abs(stroke[0])<=.5&&Math.abs(stroke[1])<=.5);
   assert.ok(stroke[2]>.02&&stroke[2]<=1.2&&stroke[3]>.02&&stroke[3]<=1.2);
  }
 }
});

test('each arena has eight inscriptions but still shares a single mobile masonry draw and protected combat floor',()=>{
 const layouts=new Map();
 for(const region of regions){
  const architecture=createRealmArchitecture(region),geometry=architecture.guardianCourt();
  try{
   assert.equal(geometry.userData.art.name,GUARDIAN_COURT_ART[region].name);
   assert.equal(geometry.userData.art.symbol,GUARDIAN_COURT_ART[region].symbol);
   assert.equal(geometry.userData.art.inscriptionParts,147,'Seven fluted pillars and carved bridge spandrels join the original inlays in one draw');
   assert.equal(geometry.userData.clearRadius,40,'mechanics stay in the identical 40m combat court');
   assert.equal(geometry.userData.columnRadius,47);
   assert.ok(geometry.attributes.position.count<8000,'new work stays below prior strict 8000 vertex budget');
   assert.ok((geometry.index?.count||geometry.attributes.position.count)/3<5000);
   const windows=geometry.attributes.realmWindow;
   assert.ok([...windows.array].some(v=>v>.2),'arena uses the existing night masonry shader for restrained inlay light');
   assert.equal(geometry.groups.length,0,'one geometry, no new material draw call');
   assert.ok(geometry.boundingBox.max.y>18&&geometry.boundingBox.max.y<20&&geometry.boundingBox.min.y<0);
   // Connected upper lintels sit outside the protected 40m combat radius.
   const verts=geometry.attributes.position;
   let overhead=0;for(let i=0;i<verts.count;i++)if(verts.getY(i)>16&&Math.hypot(verts.getX(i),verts.getZ(i))>40)overhead++;
   assert.ok(overhead>100,'colonnade visibly connects the seven existing pillars above the walkable floor');
   assert.equal(architecture.material.vertexColors,true);
   layouts.set(region,Array.from(geometry.attributes.position.array).slice(-960));
   assert.strictEqual(architecture.guardianCourt(),geometry,'the one court is reused by the streaming world');
  }finally{architecture.dispose();}
 }
 assert.equal(layouts.size,8);
 assert.ok(new Set([...layouts.values()].map(v=>v.join(','))).size>=4,'painted/modeled crests change actual vertex geometry across the realms');
});

test('all real court entrances and guardian fights remain unobstructed after the art pass',()=>{
 for(const region of regions){
  const court=realmLayout(region).sites.find(s=>s.kind==='guardianCourt');
  const obstacles=realmStaticObstacles(region);
  assert.ok(court,region+' actual Guardian location');
  for(const radius of [0,9,20,31,39,40]){
   for(let i=0;i<32;i++){
    const a=i*Math.PI/16,position={x:court.x+Math.sin(a)*radius,z:court.z+Math.cos(a)*radius};
    assert.ok(!obstacles.some(o=>obstacleDistance(position,o)<.9),region+' boss movement is free: '+radius);
   }
  }
  assert.equal(REALM_COURT_COLUMNS.length,7);
  assert.ok(!obstacles.some(o=>obstacleDistance({x:court.x,z:court.z+51},o)<.9),region+' entrance remains open');
 }
});
