import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSculpture,renderSoftwareTree} from '../src/religion/sculpture.js';
import {PerspectiveCamera,Vector3} from 'three';
const corpus=JSON.parse(readFileSync(new URL('../src/religion/corpus.json',import.meta.url),'utf8'));
test('organic tree shares finite 3D positions and a bounded geometry budget across renderers',()=>{
 const model=createSculpture(corpus.nodes),again=createSculpture(corpus.nodes);
 assert.equal(model.positions.size,corpus.nodes.length);
 assert.ok(model.leaves.length>500&&model.leaves.length<1600);
 assert.ok(model.wood.length>70&&model.wood.length<100);
 assert.deepEqual(model.positions,again.positions);
 for(const p of [...model.positions.values(),...model.wood.flatMap(w=>w.samples),...model.leaves.map(l=>l.position)])assert.ok([p.x,p.y,p.z].every(Number.isFinite));
 const minZ=Math.min(...model.leaves.map(l=>l.position.z)),maxZ=Math.max(...model.leaves.map(l=>l.position.z));assert.ok(maxZ-minZ>65,'The sculpture has real depth, not a flat chart');
 // No automatic parent edge may be inferred from the decorative wood model.
 assert.ok(!('edges' in model));
});
test('software 3D renderer draws the tree and explicit selected relationships without a WebGL context',()=>{
 const model=createSculpture(corpus.nodes),camera=new PerspectiveCamera(38,1.5,.1,2000);camera.position.set(13,64,240);camera.lookAt(0,45,0);camera.updateMatrixWorld();
 let strokes=0,ellipses=0;const gradient={addColorStop(){}};
 const ctx=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,stroke(){strokes++},ellipse(){ellipses++}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const project=p=>{const s=p.clone().project(camera);return{x:(s.x*.5+.5)*900,y:(-s.y*.5+.5)*600,visible:true,depth:300-p.z,scale:2};};
 renderSoftwareTree(ctx,900,600,camera,model,{selected:'adam',related:new Set(),visibleIds:new Set(['adam','eve']),edges:corpus.edges,project});
 assert.ok(strokes>70);assert.ok(ellipses>500);
});
