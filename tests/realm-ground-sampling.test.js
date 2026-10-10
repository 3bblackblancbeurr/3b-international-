import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRealmGroundField} from '../src/world/realm-ground.js';

// Captured from the previous sampler before removing road-object allocations.
// Include settlement edges, road shoulders, intersections and the whole realm:
// faster sampling must not move the ground under saved players or buildings.
const fingerprints={
 france:'c94edd626c8efb920c5519046af2c18379fc034c4caf74475fb1cae7f324a446',
 italie:'31d67ee552230b0fc6484badb37884e684cb0fc605ede60755133a9360b52e1f',
 estonie:'ce18e331967bab740797ce2227d2f16b815fbbde7a7a1d90bf6eee39623f7375',
 turquie:'613a9e7a71795b122fd3b31f29bf05d9e884619add8fb7770aea93b3fbaffcd2',
 algerie:'16b1cd028452562c977f5eeeb5840f324c98890c8587b53839daad96f1452c73',
 tunisie:'44638b862499decf86a05a45437fdfb3dc56a915b32da2c8f229bb9a808479ed',
 maroc:'34200a19dc112bcb8fead3343d1d4edcab03f82d3ba0c230ed5e6c4a26376b9e',
 espagne:'4139c4fb4fcf585f1fdcfcf575f74e5850dd98eceb6eb639ba9ccb6e423f2526',
};
test('ground sampling without road copies preserves all eight canonical surfaces',()=>{
 for(const [region,expected] of Object.entries(fingerprints)){
  const field=createRealmGroundField(region,(x,z)=>Math.sin(x*.031)*Math.cos(z*.024)*4),points=[];
  for(let i=-24;i<=24;i++)for(let j=-24;j<=24;j++)points.push([i*field.layout.radius/24,j*field.layout.radius/24]);
  for(const s of field.sites)for(const d of [0,s.r-.01,s.r,s.r+.01,s.r+15,s.r+30])for(const angle of [0,.7,2.4,4.7])points.push([s.x+Math.cos(angle)*d,s.z+Math.sin(angle)*d]);
  for(const s of field.roadSegments)for(const t of [0,.25,.5,.75,1])for(const margin of [0,s.road.width/2,s.road.width/2+8.99,s.road.width/2+9.01]){
   const length=Math.sqrt(s.lengthSq);points.push([s.a.x+s.dx*t-s.dz/length*margin,s.a.z+s.dz*t+s.dx/length*margin]);
  }
  const hash=createHash('sha256').update(points.map(([x,z])=>field.height(x,z).toFixed(6)).join(',')).digest('hex');
  assert.equal(hash,expected,region+' unchanged terrain and road shoulders');
 }
});
