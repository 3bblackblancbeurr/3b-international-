// Exact mission models from the live marker integration, rendered without an
// account, rewards, generated concept art or an external asset dependency.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.REALM_STORY_ART_OUT||'artifacts/realm-story-art');await mkdir(out,{recursive:true});
const port=5364;
const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#101c24;color:#e3d5b7;font:15px Georgia,serif}main{width:960px;margin:auto}header{padding:20px 28px 10px;display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #c9b48655}h1{margin:0;font-size:25px;font-weight:400}small{color:#c9b486}canvas{display:block;width:960px;height:620px}footer{padding:12px 28px 20px;color:#c9b486;font:13px system-ui;line-height:1.5}</style>
<main><header><h1 id="title"></h1><small id="state"></small></header><canvas></canvas><footer id="caption"></footer></main><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {createRealmStoryRelic} from '/src/world/realm-story-relic.js';
import {CAMPAIGN_RUNTIME_SPEC,campaignEffectIds,campaignTokenIds} from '/src/world/campaign-spec.js';
import {worldRealmArt,worldArtMaterials} from '/src/design-system/tokens.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,620,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color('#101c24');
const camera=new THREE.PerspectiveCamera(35,960/620,.1,100);camera.position.set(7.2,5.5,8.4);camera.lookAt(0,1.65,0);
const ambient=new THREE.HemisphereLight(0xd6edf5,0x48565a,2.25);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffe3b8,3.1);sun.position.set(4,8,6);scene.add(sun);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,.12,64),new THREE.MeshStandardMaterial({color:'#34434b',roughness:.92}));floor.position.y=-.09;scene.add(floor);
// A neutral 3 m figure is a scale witness, not a finished character asset.
const reference=new THREE.Group(),referenceMaterial=new THREE.MeshStandardMaterial({color:0x7e8b8d,roughness:.94});
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.27,1.34,4,10),referenceMaterial);body.position.y=1.38;reference.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.27,10,8),referenceMaterial);head.position.y=2.65;reference.add(head);reference.position.set(3.1,0,.2);scene.add(reference);
let art;
window.qaStage=(region,restored)=>{
 art?.dispose();
 const phase=CAMPAIGN_RUNTIME_SPEC[region][restored?7:1],step=phase.steps[0],effects=restored?campaignEffectIds(region):[],inventory=restored?Object.fromEntries(campaignTokenIds(region).map(id=>[id,1])):{};
 art=createRealmStoryRelic({id:region+':'+phase.id+':'+step.id,type:'campaignObjective',region,campaign:{phaseId:phase.id,stepIndex:0,effects,inventory}});if(!art)throw Error('Missing stage '+region);
 // Isolated inspection centres the actual model; live placement remains the
 // collision-checked offset defined by the canonical objective marker.
 art.root.position.set(0,0,0);art.root.rotation.y=0;scene.add(art.root);floor.material.color.set(worldRealmArt[region].ground);
 document.querySelector('#title').textContent=art.stage.place;document.querySelector('#state').textContent=restored?'Conséquences acceptées · retour':'Mission en cours';document.querySelector('#caption').textContent=art.stage.title+' — '+art.stage.clue+' La silhouette grise donne l’échelle.';
 renderer.info.reset();renderer.render(scene,camera);
 const meshes=art.root.children,result={region,phase:phase.id,restored,meshes:meshes.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,vertices:meshes.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count,0),geometries:renderer.info.memory.geometries};
 return result;
};
window.qaDispose=()=>{art?.dispose();renderer.dispose();};window.qaReady=true;
</script></html>`;
let server,browser;
try{
 server=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'realm-story-art-fixture',configureServer(s){s.middlewares.use('/__realm-story-art',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}]});await server.listen();
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1000,height:780},deviceScaleFactor:1}),errors=[],report=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/shader|webgl|three/i.test(message.text()))errors.push(message.text());});
 await page.goto('http://127.0.0.1:'+port+'/__realm-story-art',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.qaReady,undefined,{timeout:120000});
 for(const region of ['algerie','maroc','tunisie','espagne','italie','turquie','estonie'])for(const restored of [false,true]){
  const result=await page.evaluate(([region,restored])=>qaStage(region,restored),[region,restored]);
  assert.equal(result.meshes,3);assert.ok(result.vertices<4000);assert.ok(result.triangles>250&&result.triangles<4500);assert.ok(result.drawCalls<=6);
  assert.ok(result.geometries<=6,'disposed previous variants do not accumulate GPU geometry');
  const png=resolve(out,region+(restored?'-restored':'-mission')+'.png');await page.locator('main').screenshot({path:png});report.push({...result,png});
 }
 assert.deepEqual(errors,[]);await page.evaluate(()=>qaDispose());await writeFile(resolve(out,'report.json'),JSON.stringify({pass:true,errors,variants:report},null,2));console.log('REALM_STORY_ART_OK '+JSON.stringify(report));
}finally{await browser?.close();await server?.close();}
