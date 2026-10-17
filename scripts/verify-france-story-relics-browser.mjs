// Isolated Three.js visual audit of the exact four props used by France quests.
// Never connects to a real user account or saves progress.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.FRANCE_STORY_ART_OUT||'artifacts/france-story-art');
await mkdir(out,{recursive:true});
const port=5242;
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><style>html,body{margin:0;background:#14222b}canvas{display:block;margin:auto}</style><canvas></canvas><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {createStoryRelic} from '/src/world/story-relic.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(840,540,false);renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#14222b');
const camera=new THREE.PerspectiveCamera(37,840/540,.1,100);camera.position.set(2.15,2.2,3.85);camera.lookAt(0,.79,0);
scene.add(new THREE.HemisphereLight(0xcce8f3,0x394d54,1.8));
const sun=new THREE.DirectionalLight(0xffdfa2,2.3);sun.position.set(4,7,4);scene.add(sun);
const floor=new THREE.Mesh(new THREE.BoxGeometry(2.4,.48,1.65),new THREE.MeshStandardMaterial({color:0x566775,roughness:.85}));floor.position.y=.255;scene.add(floor);
const inlay=new THREE.Mesh(new THREE.BoxGeometry(2.55,.065,1.8),new THREE.MeshStandardMaterial({color:0xd8b879,metalness:.4,roughness:.52}));inlay.position.y=.035;scene.add(inlay);
let art=null;
window.qaStage=phase=>{
 art?.dispose();art=createStoryRelic({region:'france',type:'campaignObjective',campaign:{phaseId:phase}});
 if(!art)throw Error('France stage missing '+phase);
 scene.add(art.root);renderer.info.reset();renderer.render(scene,camera);
 const result={phase,meshes:art.root.children.length,triangles:renderer.info.render.triangles,draws:renderer.info.render.calls,bytes:art.root.children.reduce((n,m)=>n+m.geometry.attributes.position.array.byteLength,0)};
 return result;
};
window.qaDispose=()=>{art?.dispose();renderer.dispose();};
window.qaReady=true;
</script></html>`;
let server,browser;
try{
 server=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'story-art-fixture',configureServer(s){s.middlewares.use('/__france-story-art',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}]});await server.listen();
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:840,height:540},deviceScaleFactor:1}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/__france-story-art',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.qaReady===true,undefined,{timeout:120000});
 for(const phase of ['rumor','evidence','coordination','post']){
  const item=await page.evaluate(phase=>qaStage(phase),phase);
  assert.equal(item.meshes,3);
  assert.ok(item.triangles>100&&item.triangles<5000);
  assert.ok(item.draws<=5);
  const png=resolve(out,phase+'.png');await page.locator('canvas').screenshot({path:png});results.push({...item,png});
 }
 await page.evaluate(()=>qaDispose());assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify(results,null,2));
 console.log('FRANCE_STORY_ART_OK '+JSON.stringify(results));
 await page.close();
}finally{await browser?.close();await server?.close();}
