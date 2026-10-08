import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),out=resolve(process.env.ROUTE_PLANNER_OUT||'outputs/route-planner');
const server=await createServer({server:{host:'127.0.0.1',port:5340,strictPort:true,watch:{ignored:['**/outputs/**']}},plugins:[{name:'private-route-fixture',configureServer(s){s.middlewares.use('/__route-qa',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body>Native route worker verification</body></html>');});}}]});
await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[],workers=[];page.on('pageerror',e=>errors.push(e.message));page.on('worker',w=>workers.push(w.url()));
 await page.goto('http://127.0.0.1:5340/__route-qa');
 const report=await page.evaluate(async()=>{
  const [{createRoutePlanner},{findPath,findInteractionPath},{HUB_SCALE,HUB_PLATFORM,platformPortal},{citeSurfaceDistance},{addCiteTerraces},{addCivicTower},{Object3D},{realmDimensions,realmStaticObstacles,realmCampaignPosition}]=await Promise.all([
   import('/src/world/route-planner.js'),import('/src/world/navigation.js'),import('/src/world/hub/platform-layout.js'),import('/src/world/hub/platform-topology.js'),import('/src/world/hub/terraces.js'),import('/src/world/hub/civic-tower.js'),import('/node_modules/three/build/three.module.js'),import('/src/world/realm-layout.js'),
  ]);
  const check=(ok,message)=>{if(!ok)throw Error(message);},planner=createRoutePlanner(),owned=[],collisions=[],settings={mesh:()=>new Object3D(),geo:g=>{owned.push(g);return g;},box:null,materials:{},collisions,sign:()=>{}};
  const surfaces=addCiteTerraces(settings),water={id:'cite-water-boundary',surfaceDistance:p=>-citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)*HUB_SCALE};
  const tower=addCivicTower({...settings,buildings:[{buildingId:'tower_circle',buildingX:0,buildingZ:-38,width:14,depth:10}],cameraSolids:[]});
  for(const o of collisions)for(const key of ['x','z','r','width','depth'])if(Number.isFinite(o[key]))o[key]*=HUB_SCALE;
  const floor=tower.setFloor(2),cases=[
   {name:'round-and-rotated-solid',start:{x:-12,z:-3},destination:{x:12,z:3},obstacles:[{x:0,z:0,r:3},{x:6,z:0,width:3,depth:7,rotation:.23}],radius:76},
   {name:'inactive-solid',start:{x:-12,z:0},destination:{x:12,z:0},obstacles:[{x:0,z:0,width:4,depth:20,enabled:false}],radius:76},
   {name:'conversation-distance',start:{x:-12,z:0},item:{type:'hubNpc',x:12,z:0},interaction:true,obstacles:[{x:0,z:0,r:2}],radius:76},
   {name:'real-Hub-water-and-terraces',start:HUB_PLATFORM.spawn,destination:platformPortal(7),obstacles:[water,...collisions.filter(o=>o.id?.startsWith('belvedere-'))],radius:HUB_PLATFORM.walkRadius},
   {name:'selected-tower-floor',start:{x:floor.x-5,z:floor.z},destination:{x:floor.x+5,z:floor.z},obstacles:tower.collisions(),towerFloor:floor,radius:HUB_PLATFORM.walkRadius},
   {name:'remote-guardian-court',start:{x:0,z:320},destination:realmCampaignPosition('france',3),obstacles:realmStaticObstacles('france'),radius:realmDimensions('france').radius},
  ],parity=[];
  try{
   for(const c of cases){const target=c.item||c.destination,expected=(c.interaction?findInteractionPath:findPath)(c.start,target,c.obstacles,c.radius),started=performance.now(),actual=await planner.plan(c),positions=path=>path.map(({x,z})=>({x,z}));check(expected.length>0,'Expected route exists: '+c.name);check(JSON.stringify(positions(actual))===JSON.stringify(positions(expected)),'Native worker parity: '+c.name);parity.push({name:c.name,points:actual.length,workerMs:performance.now()-started});}
   const first=planner.plan(cases[3]).catch(e=>e.name);await new Promise(resolve=>setTimeout(resolve,1));planner.cancel();check(await first==='AbortError','Native in-flight cancellation rejects');check(!planner.status().pending,'Cancelled route clears pending state');
   const afterCancel=await planner.plan(cases[0]);check(afterCancel.length>0,'Native worker restarts after termination');
   const unsupported=await planner.plan({...cases[0],obstacles:[{id:'unknown',surfaceDistance:()=>1}]}).then(()=>null,e=>e.name);check(unsupported==='UnsupportedObstacleError','Unknown callback rejects');
   const broken=createRoutePlanner({workerFactory:()=>{const worker=new Worker('/src/world/route-planner.worker.js',{type:'module'}),post=worker.postMessage.bind(worker);worker.postMessage=packet=>post({...packet,obstacles:[{routeShape:'unknown'}]});return worker;}});
   const workerError=await broken.plan(cases[0]).then(()=>null,e=>e.message);check(workerError?.includes('Unknown route collision'),'Real worker errors reject with context');check(!broken.status().pending,'Real worker failure clears request');broken.dispose();
   let beats=0;const timer=setInterval(()=>beats++,1);try{await planner.plan(cases[3]);}finally{clearInterval(timer);}check(beats>0,'Main event loop remains available during native route planning');
   planner.dispose();const rejectedAfterDispose=await planner.plan(cases[0]).then(()=>null,e=>e.name);check(rejectedAfterDispose==='InvalidStateError','Disposed planner refuses another worker');
   return{parity,cancelled:'AbortError',unsupported,workerError,mainThreadHeartbeats:beats,disposed:true};
  }finally{planner.dispose();[...surfaces,...owned].forEach(g=>g.dispose());}
 });
 assert.equal(errors.length,0,errors.join('\n'));assert.ok(workers.length>=3,'Actual Chromium workers were created');
 await mkdir(out,{recursive:true});await writeFile(resolve(out,'report.json'),JSON.stringify({...report,nativeWorkers:workers.length,errors},null,2));console.log(JSON.stringify({...report,nativeWorkers:workers.length,errors},null,2));
}finally{await browser?.close();await server.close();}
