import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NEXUS_DOORS} from '../src/lib/passport-nexus.js';

// Check the actual world metadata without importing the 3D scene into Node.
const source=readFileSync(new URL('../src/world/origins/data.js',import.meta.url),'utf8');
const declaration=source.match(/export const WORLDS=\[([\s\S]*?)\]\.map/);
assert.ok(declaration,'World gate metadata must remain inspectable.');
const values=new Map([...declaration[1].matchAll(/\{id:'([^']+)'[^\n]*?value:'([^']+)'/g)].map(([,id,value])=>[id,value]));
for(const door of NEXUS_DOORS){
 test(`Nexus and ORIGINS agree on ${door.country}: ${door.value}`,()=>{
  assert.equal(values.get(door.region),door.value);
 });
}
