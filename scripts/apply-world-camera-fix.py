from pathlib import Path

p=Path('src/world/scene.js');s=p.read_text()
a="import {cinemaProfile} from './cinematic-director.js';"
assert a in s
s=s.replace(a,a+"\nimport {cinematicReturnView} from './cinematic-camera.js';")
a='const finalView=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);endCamera=finalView.position.clone();endTarget=finalView.target.clone();'
b='const finalView=cinematicReturnView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);endCamera=finalView.position;endTarget=finalView.target;'
assert a in s;s=s.replace(a,b);p.write_text(s)
Path('src/world/cinematic-camera.js').write_text('''import {Vector3} from 'three';
import {orbitView} from './orbit.js';

// The gameplay orbit returns plain coordinates. Cinematic interpolation requires
// independent Vector3 values; never call .clone() on the plain gameplay result.
export function cinematicReturnView(orbit,position,height,portrait=false,heightAt){
 const view=orbitView(orbit,position,height,portrait,heightAt);
 return {position:new Vector3().copy(view.position),target:new Vector3().copy(view.target)};
}
''')
Path('tests/cinematic-camera.test.js').write_text('''import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {readFileSync} from 'node:fs';
import {cinematicReturnView} from '../src/world/cinematic-camera.js';
import {DEFAULT_ORBIT,orbitView} from '../src/world/orbit.js';

test('cinematic return converts plain gameplay coordinates to independent vectors',()=>{
 for(const portrait of [false,true]){
  const orbit={...DEFAULT_ORBIT,yaw:.43},position={x:8,z:-4},heightAt=()=>2;
  const plain=orbitView(orbit,position,2,portrait,heightAt);
  const result=cinematicReturnView(orbit,position,2,portrait,heightAt);
  for(const key of ['position','target']){
   assert.equal(result[key].isVector3,true);
   assert.deepEqual(result[key].toArray(),[plain[key].x,plain[key].y,plain[key].z]);
   assert.doesNotThrow(()=>new Vector3().lerpVectors(result[key],result[key].clone(),.5));
  }
  result.position.x=999;
  assert.equal(position.x,8);
 }
});

test('the real opening cinematic uses the tested return-view contract',()=>{
 const source=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(source,/const finalView=cinematicReturnView\\(orbit,position,/);
 assert.match(source,/endCamera=finalView\\.position;endTarget=finalView\\.target;/);
 assert.doesNotMatch(source,/finalView\\.(?:position|target)\\.clone\\(/);
});
''')
