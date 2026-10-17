import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_PORTALS,atlasPoint,atlasPortalForRealm,atlasConnections} from '../src/components/atlas-map-model.js';

const REALMS={europe:['france','espagne','italie','turquie','estonie'],africa:['algerie','maroc','tunisie']};
const coordinates=path=>path.match(/-?\d+(?:\.\d+)?/g).map(Number);

test('six geographic pins share the 1000 by 500 route viewport',()=>{
 assert.equal(ATLAS_PORTALS.length,6);
 assert.equal(new Set(ATLAS_PORTALS.map(pin=>pin.id)).size,6);
 for(const pin of ATLAS_PORTALS){
  assert.deepEqual(atlasPoint(pin.id),{x:pin.x*10,y:pin.y*5});
  assert.ok(pin.x>=0&&pin.x<=100&&pin.y>=0&&pin.y<=100);
 }
 assert.deepEqual(atlasPoint('europe'),{x:520,y:130});
 assert.deepEqual(atlasPoint('africa'),{x:480,y:220});
 assert.equal(atlasPoint('unknown'),null);
});

test('all eight realms select their geographic group',()=>{
 for(const [portal,realms] of Object.entries(REALMS)){
  for(const realm of realms)assert.equal(atlasPortalForRealm(realm),portal,realm);
 }
 for(const value of ['travel','unknown','toString','__proto__',undefined,null]){
  assert.equal(atlasPortalForRealm(value),null);
 }
 assert.equal(ATLAS_PORTALS.find(pin=>pin.id==='europe').action,'france');
 assert.equal(ATLAS_PORTALS.find(pin=>pin.id==='africa').action,'maroc');
});

test('five unique base routes join real pin coordinates with control points inside the map',()=>{
 const routes=atlasConnections('france');
 assert.equal(routes.length,5);
 assert.equal(new Set(routes.map(route=>[route.from,route.to].sort().join(':'))).size,5);
 assert.equal(new Set(routes.map(route=>route.path)).size,5);
 for(const route of routes){
  const [x1,y1,cx,cy,x2,y2]=coordinates(route.path);
  assert.deepEqual({x:x1,y:y1},atlasPoint(route.from),route.id);
  assert.deepEqual({x:x2,y:y2},atlasPoint(route.to),route.id);
  assert.ok(cx>=0&&cx<=1000&&cy>=0&&cy<=500,route.id);
  assert.equal(route.from,'europe');
 }
});

test('exactly one active route travels toward each selected realm group',()=>{
 for(const [portal,realms] of Object.entries(REALMS))for(const realm of realms){
  const routes=atlasConnections(realm),active=routes.filter(route=>route.active);
  assert.equal(active.length,1,realm);
  assert.equal(routes.filter(route=>route.activePath).length,1,realm);
  const [x1,y1,,,x2,y2]=coordinates(active[0].activePath);
  const origin=portal==='europe'?'africa':'europe';
  assert.deepEqual({x:x1,y:y1},atlasPoint(origin),realm);
  assert.deepEqual({x:x2,y:y2},atlasPoint(portal),realm);
 }
});

test('Europe and Africa reuse the same base curve in opposite active directions',()=>{
 const europe=atlasConnections('estonie'),africa=atlasConnections('tunisie');
 assert.deepEqual(europe.map(route=>route.path),africa.map(route=>route.path));
 const outward=africa.find(route=>route.active),inward=europe.find(route=>route.active);
 assert.equal(outward.id,inward.id);
 const [sx,sy,cx,cy,tx,ty]=coordinates(outward.activePath);
 assert.deepEqual(coordinates(inward.activePath),[tx,ty,cx,cy,sx,sy]);
 assert.equal(outward.activePath,outward.path);
});

test('unknown realms leave all routes calm and returned route objects are independent',()=>{
 for(const realm of [undefined,null,'unknown','travel']){
  assert.ok(atlasConnections(realm).every(route=>!route.active&&route.activePath===null));
 }
 const routes=atlasConnections('france');
 routes[0].path='changed';
 assert.notEqual(atlasConnections('france')[0].path,'changed');
 assert.ok(Object.isFrozen(ATLAS_PORTALS)&&ATLAS_PORTALS.every(Object.isFrozen));
});
