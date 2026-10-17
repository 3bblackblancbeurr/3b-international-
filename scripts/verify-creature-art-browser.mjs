// Actual isolated WebGL renders of the shipped procedural animal controllers.
// No WorldPage, account service, terrain streaming or private player data.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CREATURE_ART_OUT||'artifacts/creatures';await mkdir(out,{recursive:true});
const port=Number(process.env.CREATURE_ART_PORT)||5469;
const entry=`
import * as THREE from 'three';
import {createCreatureActor} from '/src/world/creature-models.js';
import {worldArtMaterials,worldRealmArt} from '/src/design-system/tokens.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.1,80);scene.background=new THREE.Color(worldRealmArt.france.sky);scene.fog=new THREE.Fog(worldRealmArt.france.fog,30,65);
const hemi=new THREE.HemisphereLight(worldRealmArt.france.sun,worldRealmArt.france.ground,2.1),sun=new THREE.DirectionalLight(worldRealmArt.france.sun,3.0);sun.position.set(-7,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:35});sun.shadow.normalBias=.025;scene.add(hemi,sun,sun.target);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:worldArtMaterials.dust,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.045;floor.receiveShadow=true;scene.add(floor);
const title=document.getElementById('title'),description=document.getElementById('description');let actor;
window.qa={draw(card,pose='Idle'){
 actor?.dispose();actor=createCreatureActor({card,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});if(!actor)throw Error('Unsupported nonhuman spirit '+card);scene.add(actor.object);
 if(pose==='walk'){for(let i=0;i<4;i++)actor.update(.1,0,.20,.20);}else if(pose!=='Idle'){actor.action(pose,.8);actor.update(.25);}else actor.update(.1);
 // A fixed three-quarter camera and light make silhouette comparisons honest.
 actor.object.rotation.y=0;camera.position.set(7.2,3.7,7.5);camera.lookAt(0,1.85,.05);renderer.render(scene,camera);
 const identity=actor.object.userData.creatureIdentity;title.textContent=identity.name+' · '+identity.label;description.textContent='Carte '+card+' · '+identity.region+' · adaptation 3D stylisée du véritable contrôleur · scène de test isolée';
 return{...actor.snapshotCreature(),render:{...renderer.info.render},glError:renderer.getContext().getError()};
},dispose(){actor?.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();}};qa.draw('C025');
`;
const html=`<!doctype html><html lang="fr"><head><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;overflow:hidden;font-family:system-ui,sans-serif}canvas{display:block}aside{position:fixed;top:16px;left:18px;background:#f3efe6ee;color:#14242d;border:1px solid #334d6955;max-width:calc(100% - 64px);padding:10px 13px}h1{margin:0;font-size:17px}p{margin:5px 0 0;font-size:11px}@media(max-height:450px){aside{top:7px;left:9px;padding:6px 10px}h1{font-size:14px}p{font-size:9px}}</style></head><body><canvas></canvas><aside><h1 id="title"></h1><p id="description"></p></aside><script type="module" src="/__creature-art-entry.js"></script></body></html>`;
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-creature-art-qa',server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'creature-art-qa',resolveId:id=>id==='/__creature-art-entry.js'?id:null,load:id=>id==='/__creature-art-entry.js'?entry:null,configureServer(server){server.middlewares.use('/__creature-art',(_request,response)=>{response.setHeader('Content-Type','text/html');response.end(html);});}}]});
await server.listen();let browser;const captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const profile of [{id:'desktop',viewport:{width:1100,height:750}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}]){
  const context=await browser.newContext({...profile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  try{
   await page.goto('http://127.0.0.1:'+port+'/__creature-art',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!!window.qa,{timeout:60000});
   for(const [card,name,pose] of [['C025','italie-wolf','walk'],['C050','estonie-lynx','walk'],['C065','turquie-bear','walk'],['C085','algerie-fennec','Idle'],['C105','tunisie-eagle','Cast'],['C125','maroc-lion','walk'],['C145','espagne-bull','Idle'],['C038','italie-lion','Idle']]){
    const result=await page.evaluate(({card,pose})=>qa.draw(card,pose),{card,pose}),label=profile.id+'-'+name;assert.equal(result.glError,0,label+': WebGL errors');assert.ok(result.renderMeshes<=8,label+': bounded instances');assert.equal(result.card,card);assert.equal(result.ready,true);
    await page.screenshot({path:out+'/'+label+'.png'});captures.push({label,...result});console.log(label+': '+result.renderMeshes+' material/shape batches');
   }
   assert.deepEqual(errors,[],profile.id+': browser errors');await page.evaluate(()=>qa.dispose());
  }finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify({kind:'actual-isolated-creature-controllers',captures},null,2));console.log('CREATURE_ART_OK '+captures.length+' renders');
}finally{await browser?.close();await server.close();}
