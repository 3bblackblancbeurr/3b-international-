// Isolated render QA of the real France investigation module. This deliberately
// excludes WorldPage, terrain streaming, account storage and the main scene loop.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.FRANCE_STAGING_OUT||'artifacts/france-staging';await mkdir(out,{recursive:true});
const port=Number(process.env.FRANCE_STAGING_PORT)||5467;
const entry=`
import * as THREE from 'three';
import {createFranceInvestigationScene} from '/src/world/france-investigation-scene.js';
import {FRANCE_INVESTIGATION_STATIONS} from '/src/world/france-investigation.js';
import {worldRealmArt} from '/src/design-system/tokens.js';
const palette=worldRealmArt.france,renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(palette.sky);scene.fog=new THREE.Fog(palette.fog,85,150);
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.15,180),hemi=new THREE.HemisphereLight(palette.sun,palette.ground,2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(palette.sun,3.1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:85});sun.shadow.normalBias=.025;scene.add(sun,sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(380,380),new THREE.MeshStandardMaterial({color:palette.ground,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;const origin=FRANCE_INVESTIGATION_STATIONS[0].position;ground.position.set(origin.x,-.018,origin.z);scene.add(ground);
const staging=createFranceInvestigationScene({adventure:{}},{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});scene.add(staging.root);
const title=document.getElementById('title'),subtitle=document.getElementById('subtitle');
window.qa={draw(id,restored){
 const station=FRANCE_INVESTIGATION_STATIONS.find(row=>row.id===id);if(!station)throw Error('Unknown station');
 const save={region:'france',adventure:{campaigns:{france:{version:1,effects:restored?['archives_ouvertes','noms_retablis','dossier_resolu']:[]}}}};staging.update(save);staging.tick(0,station.position,null);
 const {x,z}=station.position;if(id==='plateau'){camera.position.set(x+9,7.5,z+21);camera.lookAt(x+9,.8,z-1.1);}else{camera.position.set(x+2.8,3.8,z+6.4);camera.lookAt(x,1.8,z-4.8);}
 sun.position.set(x-16,24,z+8);sun.target.position.set(x,0,z-4);sun.shadow.camera.updateProjectionMatrix();
 title.textContent=station.place+' · '+(restored?'après restitution':'avant restitution');subtitle.textContent='Rendu isolé du module réel · décor de test plat · aucune scène complète';renderer.render(scene,camera);
 return{diagnostics:staging.diagnostics,render:{...renderer.info.render},state:staging.root.userData.investigation,glError:renderer.getContext().getError(),camera:{height:camera.position.y}};
},dispose(){staging.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();}};
qa.draw('bindery',false);
`;
const html=`<!doctype html><html lang="fr"><head><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui,sans-serif}canvas{display:block}aside{position:fixed;left:20px;top:16px;color:#14242d;background:#f2e7d5ed;padding:10px 14px;border:1px solid #334d6955;max-width:calc(100% - 68px)}h1{margin:0;font-size:17px;font-weight:600}p{margin:4px 0 0;font-size:11px}@media(max-height:450px){aside{left:10px;top:8px;padding:6px 10px}h1{font-size:14px}p{font-size:10px}}</style></head><body><canvas></canvas><aside><h1 id="title"></h1><p id="subtitle"></p></aside><script type="module" src="/__france-staging-entry.js"></script></body></html>`;
const server=await createServer({configFile:false,cacheDir:"node_modules/.vite-france-staging-qa",server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'france-staging-qa',resolveId:id=>id==='/__france-staging-entry.js'?id:null,load:id=>id==='/__france-staging-entry.js'?entry:null,configureServer(server){server.middlewares.use('/__france-staging',(_request,response)=>{response.setHeader('Content-Type','text/html');response.end(html);});}}]});
await server.listen();let browser;const report=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const profile of [{id:'desktop',viewport:{width:1280,height:800}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}]){
  const context=await browser.newContext({...profile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  try{
   await page.goto('http://127.0.0.1:'+port+'/__france-staging',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.qa,{timeout:60000});
   for(const id of ['bindery','archive','atelier','plateau'])for(const restored of [false,true]){
    const stats=await page.evaluate(({id,restored})=>qa.draw(id,restored),{id,restored}),label=profile.id+'-'+id+'-'+(restored?'after':'before');
    assert.equal(stats.glError,0,label+': WebGL reports no error');assert.ok(stats.diagnostics.meshes<=10,label+': bounded staging draw budget');assert.equal(stats.state.namesRestored,restored);
    await page.screenshot({path:out+'/'+label+'.png'});report.push({label,...stats});console.log(label+': '+stats.diagnostics.meshes+' render meshes');
   }
   assert.deepEqual(errors,[],profile.id+': browser errors');await page.evaluate(()=>qa.dispose());
  }finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify({kind:'isolated-module-render',captures:report},null,2));console.log('FRANCE_STAGING_ART_OK '+report.length+' captures');
}finally{await browser?.close();await server.close();}
