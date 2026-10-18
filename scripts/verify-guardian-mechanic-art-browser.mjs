// Isolated real WebGL of the same read-only mechanic objects used by bosses.
// Cases are produced by guardianBossPresentation, never simulated visual wins.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.GUARDIAN_MECHANIC_ART_OUT||'artifacts/guardian-mechanics';await mkdir(out,{recursive:true});const port=Number(process.env.GUARDIAN_MECHANIC_ART_PORT)||5471;
const entry=`
import * as THREE from 'three';
import {createGuardianMechanicArt} from '/src/world/guardian-mechanic-art.js';
import {guardianBossPresentation} from '/src/world/guardian-combat.js';
import {worldArtMaterials,worldRealmArt} from '/src/design-system/tokens.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();scene.background=new THREE.Color(worldRealmArt.france.night);const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100),sun=new THREE.DirectionalLight(worldRealmArt.france.sun,3.2);sun.position.set(-10,18,8);scene.add(sun,new THREE.HemisphereLight(worldRealmArt.france.sun,worldRealmArt.france.ground,2.0));
const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentDark,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;scene.add(floor);let art;
window.qa={draw(region,changed){
 art?.dispose();art=createGuardianMechanicArt(region,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});scene.add(art.root);
 const encounter={boss:true,region,enemy:changed?20:100,enemyMax:100,guardianMeter:region==='espagne'?(changed?88:24):(changed?24:100),guardianShield:changed?0:26,guardianFlag:changed,field:{home:{x:0,z:0},p:{x:changed?20:2,z:3},enemy:{x:0,z:0},aim:{x:3,z:5},phase:changed?'recovery':'windup'}};
 const presentation=guardianBossPresentation(encounter);art.update(presentation);
 const views={algerie:[[10,7.5,14],[0,.6,0]],maroc:[[8,5.5,10],[-3,1,-2]],tunisie:[[11,9,15],[0,.5,5]],espagne:[[5,4.6,9],[-4,1.6,-3]],italie:[[11,6.5,13],[0,1,-4]],turquie:[[10,9,13],[3,.5,4]],estonie:[[9,6.5,13],[0,1.2,0]]},view=views[region];camera.position.fromArray(view[0]);camera.lookAt(...view[1]);renderer.render(scene,camera);
 document.getElementById('title').textContent=art.root.name.replace('3B · ','');document.getElementById('detail').textContent=region+' · phase '+presentation.index+' · projections de mécanique · rendu isolé du module réel';
 return{diagnostics:art.diagnostics,state:art.root.userData.state,render:{...renderer.info.render},glError:renderer.getContext().getError()};
},dispose(){art?.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();}};qa.draw('algerie',false);
`;
const html=`<!doctype html><html lang="fr"><head><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui,sans-serif}canvas{display:block}aside{position:fixed;left:18px;top:14px;max-width:calc(100% - 64px);padding:10px 13px;color:#14242d;background:#f3efe6ee;border:1px solid #334d6955}h1{font-size:17px;margin:0}p{font-size:11px;margin:5px 0 0}@media(max-height:450px){aside{top:7px;left:9px;padding:6px 10px}h1{font-size:14px}p{font-size:9px}}</style></head><body><canvas></canvas><aside><h1 id="title"></h1><p id="detail"></p></aside><script type="module" src="/__guardian-mechanic-art-entry.js"></script></body></html>`;
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-guardian-mechanic-art-qa',server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'guardian-mechanic-art-qa',resolveId:id=>id==='/__guardian-mechanic-art-entry.js'?id:null,load:id=>id==='/__guardian-mechanic-art-entry.js'?entry:null,configureServer(server){server.middlewares.use('/__guardian-mechanic-art',(_request,response)=>{response.setHeader('Content-Type','text/html');response.end(html);});}}]});
await server.listen();let browser;const captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const profile of [{id:'desktop',viewport:{width:1100,height:750}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}]){
  const context=await browser.newContext({...profile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  try{
   await page.goto('http://127.0.0.1:'+port+'/__guardian-mechanic-art',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.qa,{timeout:60000});
   for(const region of ['algerie','maroc','tunisie','espagne','italie','turquie','estonie'])for(const changed of [false,true]){
    const result=await page.evaluate(({region,changed})=>qa.draw(region,changed),{region,changed}),label=profile.id+'-'+region+'-'+(changed?'phase3':'phase1');assert.equal(result.glError,0);assert.ok(result.diagnostics.renderMeshes<=4);assert.equal(result.state.phase,changed?3:1);
    await page.screenshot({path:out+'/'+label+'.png'});captures.push({label,...result});console.log(label+': '+result.diagnostics.renderMeshes+' batches');
   }
   assert.deepEqual(errors,[],profile.id+': browser errors');await page.evaluate(()=>qa.dispose());
  }finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify({kind:'actual-guardian-mechanic-projections',captures},null,2));console.log('GUARDIAN_MECHANIC_ART_OK '+captures.length+' renders');
}finally{await browser?.close();await server.close();}
