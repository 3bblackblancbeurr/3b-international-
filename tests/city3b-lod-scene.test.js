import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {renderers} from './fixtures/city3b-renderer.js';

// Substitute only the hardware renderer; run the actual scene RAF lifecycle,
// camera gestures, water/reflection targets and disposal with bounded test DOM.
const sceneUrl=new URL('../src/city/city3b-scene.js',import.meta.url).href;
const hook=registerHooks({resolve(specifier,context,next){
 if(specifier==='three'&&context.parentURL===sceneUrl)return {url:new URL('./fixtures/city3b-renderer.js',import.meta.url).href,shortCircuit:true};
 return next(specifier,context);
}});
const {createCityScene}=await import(sceneUrl);hook.deregister();

class Surface{
 constructor(){this.listeners=new Map();this.style={};this.clientHeight=600;this.clientWidth=800;this.children=[];}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 getRootNode(){return document;}
 get ownerDocument(){return document;}
 getBoundingClientRect(){return {width:800,height:600,left:0,top:0};}
 setAttribute(){}
 appendChild(child){this.children.push(child);child.parent=this;}
 remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);}
 focus(){}
 setPointerCapture(){}
 releasePointerCapture(){}
}
function fixture(t,{mobile=false,reduced=false}={}){
 const raf=new Map(),saved=new Map(),doc=new Surface();let frame=0,time=0;
 doc.hidden=false;doc.documentElement={dataset:{motion:reduced?'reduced':'full'}};doc.createElement=()=>new Surface();
 const observer=class{constructor(fn){this.fn=fn;}observe(){}disconnect(){}};
 const globals={document:doc,window:new Surface(),devicePixelRatio:2,ResizeObserver:observer,IntersectionObserver:observer,MutationObserver:observer,
  matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:mobile,addEventListener(){},removeEventListener(){}}),
  requestAnimationFrame:callback=>{raf.set(++frame,callback);return frame;},cancelAnimationFrame:id=>raf.delete(id)};
 for(const [key,value] of Object.entries(globals)){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const instances=[];
 t.after(()=>{for(const instance of instances)instance.dispose();for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {doc,raf,mount(){const host=new Surface(),instance=createCityScene(host);instances.push(instance);return {host,instance,renderer:renderers.at(-1)};},
  tick(gap=1000/60){time+=gap;const callbacks=[...raf.values()];raf.clear();for(const callback of callbacks)callback(time);},
  unmount(instance){instance.dispose();instances.splice(instances.indexOf(instance),1);}};
}
const snapshot=(id='a',half=500)=>({city:{city_id:id,city:{map_extent:half,terrain:[{kind:'lake',x1:0,z1:0,x2:0,z2:0,width:24}]}},placements:[],buildings:[]});
const water=renderer=>renderer.scene.getObjectByName('City 3B · inland').material.uniforms;
const sun=renderer=>renderer.scene.children.find(object=>object.isDirectionalLight);

test('actual scene applies zoom LOD before its render, restores close quality and frees targets on unmount',t=>{
 const f=fixture(t,{reduced:true}),{instance,renderer,host}=f.mount();instance.rebuild(snapshot());
 // setView is immediate with reduced motion; these correspond to close,
 // medium and far orbit radii without replacing any camera implementation.
 instance.setView({center:{x:0,z:0},zoom:10});f.tick(40);
 assert.equal(renderer.pixelRatio,1.75);assert.equal(water(renderer).uDetail.value,1);
 assert.ok(renderer.reflections.length>0);let released=0;
 renderer.reflections.at(-1).addEventListener('dispose',()=>released++);
 instance.setView({center:{x:0,z:0},zoom:2});f.tick(40);
 assert.equal(renderer.pixelRatio,1);assert.equal(water(renderer).uDetail.value,.65);assert.equal(released,1);
 instance.setView({center:{x:0,z:0},zoom:1});f.tick(40);
 assert.equal(renderer.pixelRatio,.85);assert.equal(water(renderer).uDetail.value,.3);assert.equal(sun(renderer).castShadow,false);
 const farPasses=renderer.reflections.length;f.tick(40);assert.equal(renderer.reflections.length,farPasses);
 instance.setView({center:{x:0,z:0},zoom:10});f.tick(40);
 assert.equal(renderer.pixelRatio,1.75);assert.equal(water(renderer).uDetail.value,1);assert.equal(sun(renderer).castShadow,true);
 assert.ok(renderer.reflections.length>farPasses);assert.equal(renderer.reflections.at(-1).width,512);
 renderer.reflections.at(-1).addEventListener('dispose',()=>released++);
 const frames=renderer.frames.length;f.unmount(instance);assert.equal(renderer.disposed,true);assert.equal(host.children.length,0);assert.equal(f.raf.size,0);assert.equal(released,2);
 f.tick(40);assert.equal(renderer.frames.length,frames,'disposed RAF cannot render again');
});

test('mobile RAF cap is not mistaken for slowness and camera changes outside motion update still adapt',t=>{
 const f=fixture(t,{mobile:true}),{instance,renderer}=f.mount();instance.rebuild(snapshot());
 for(let i=0;i<300;i++)f.tick();
 assert.equal(renderer.pixelRatio,1.35);assert.ok(renderer.frames.length<260,'the intentional render cap remains active');
 // Direct camera changes are how OrbitControls/touch gestures feed the scene.
 renderer.camera.position.normalize().multiplyScalar(700);f.tick(40);
 assert.equal(renderer.pixelRatio,.85);assert.equal(water(renderer).uDetail.value,.3);
 instance.zoom(.1);f.tick(40);
 assert.ok(renderer.camera.position.length()<490,'the eased camera has crossed the far leave threshold');
 assert.equal(renderer.pixelRatio,1,'quality follows that eased camera in the same rendered frame');
 assert.equal(water(renderer).uDetail.value,.65);
 // After the eased gesture settles, a direct touch-style view stays sharp.
 for(let i=0;i<60;i++)f.tick();
 renderer.camera.position.normalize().multiplyScalar(100);f.tick(40);
 assert.equal(renderer.pixelRatio,1.35);assert.equal(water(renderer).uDetail.value,1);
});

test('map switches and a simultaneous fresh scene do not inherit a previous distant tier',t=>{
 const f=fixture(t,{reduced:true}),a=f.mount();a.instance.rebuild(snapshot('a',500));a.instance.setView({center:{x:0,z:0},zoom:1});f.tick(40);
 assert.equal(a.renderer.pixelRatio,.85);
 // The same physical camera is near relative to the expanded map.
 a.instance.rebuild(snapshot('b',1000));a.instance.setView({center:{x:0,z:0},zoom:10});f.tick(40);
 assert.equal(a.renderer.pixelRatio,1.75);
 a.instance.setView({center:{x:0,z:0},zoom:1});f.tick(40);assert.equal(a.renderer.pixelRatio,.85);
 const b=f.mount();b.instance.rebuild(snapshot('c',500));b.instance.setView({center:{x:0,z:0},zoom:10});f.tick(40);
 assert.equal(b.renderer.pixelRatio,1.75);assert.equal(water(b.renderer).uDetail.value,1);assert.equal(a.renderer.pixelRatio,.85);
 f.unmount(a.instance);const last=b.renderer.frames.length;b.instance.setView({center:{x:0,z:0},zoom:9});f.tick(40);
 assert.ok(b.renderer.frames.length>last);assert.equal(b.renderer.pixelRatio,1.75);
 f.unmount(b.instance);const c=f.mount();c.instance.rebuild(snapshot('d',500));c.instance.setView({center:{x:0,z:0},zoom:10});f.tick(40);
 assert.equal(c.renderer.pixelRatio,1.75);assert.equal(water(c.renderer).uDetail.value,1,'a remount starts with its own close quality');
});
