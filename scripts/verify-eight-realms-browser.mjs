// Isolated real createWorldScene renderer. All relocation, raycast and capture
// diagnostics are injected by this test server, never shipped in production.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.EIGHT_REALMS_OUT||'outputs/eight-realms'),port=Number(process.env.EIGHT_REALMS_PORT)||5335;
const requestedSites=(process.env.EIGHT_REALMS_SITES||'').split(',').filter(Boolean);
const surfaceClose=process.env.EIGHT_REALMS_SURFACE_CLOSE==='1';
await mkdir(out,{recursive:true});
function injectQa(code){
 const marker='return{\n  refreshHubSchedule:';assert.ok(code.includes(marker),'Private territory fixture matches real scene API');
 return code.replace(marker,`let qaCaptureFrozen=false;return{
  qaRealmState(){const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {region,position:{...position},avatar:avatar?{x:avatar.position.x,y:avatar.position.y,z:avatar.position.z}:null,height:groundY(position.x,position.z),camera:camera.position.toArray(),paused,shot:shot?.kind||null,elapsed,heroReady:hero?.ready,guardians:actors.filter(a=>a.creature).map(a=>({id:a.itemId,x:a.controller.object.position.x,y:a.controller.object.position.y,z:a.controller.object.position.z,visible:a.controller.object.visible,ready:a.controller.ready})),stream:landscape?.streamingDiagnostics,crowd:ambientCrowd?.diagnostics,render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};},
  qaTerrainAt(point){scene.updateMatrixWorld(true);const y=groundY(point.x,point.z),ray=new THREE.Raycaster(new THREE.Vector3(point.x,y+600,point.z),new THREE.Vector3(0,-1,0)),hit=ray.intersectObjects(landscape.walkSurfaces||[landscape.ground],false)[0];return {height:y,hit:hit?{y:hit.point.y,name:hit.object.name}:null,difference:hit?Math.abs(y-hit.point.y):null};},
  qaLook(){orbit={...orbit,yaw:0,pitch:.34,distance:34};cameraFollow=false;const view=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);needsRender=true;},
  qaSurfaceLook({yaw=0,pitch=.32,distance=18}={}){orbit={...orbit,yaw,pitch,distance};cameraFollow=false;const view=orbitView(orbit,position,groundY(position.x,position.z),camera.aspect<.85,groundY);camera.position.copy(view.position);cameraTarget.copy(view.target);camera.lookAt(cameraTarget);needsRender=true;},
  qaFreezeCapture(){if(!qaCaptureFrozen){cancelAnimationFrame(raf);qaCaptureFrozen=true;}post.render(0);return canvas.toDataURL('image/png');},
  qaResumeCapture(){if(!qaCaptureFrozen)return;qaCaptureFrozen=false;last=performance.now();raf=requestAnimationFrame(tick);},
  refreshHubSchedule:`);
}
const handler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#102331}canvas{width:100%;height:100%;display:block}</style><canvas tabindex="0"></canvas><script type="module">
import {createWorldScene} from '/src/world/scene.js';import {blankSave} from '/src/world/rules.js';import {realmLayout,realmBuildings} from '/src/world/realm-layout.js';
const region=new URLSearchParams(location.search).get('region')||'france',save=blankSave();save.region=region;save.adventure.avatar.created=true;save.adventure.avatar.name='Voyageur QA';save.adventure.companionHidden=true;
// Eligible private fixture: guardians deliberately appear only after the
// value trial is completed. No rewards or account mutation are submitted.
save.adventure.values[region]={...save.adventure.values[region],completed:true};
window.qa={ready:false,errors:[],snapshot:null,save,sites:realmLayout(region).sites,buildings:realmBuildings(region)};window.game=createWorldScene(document.querySelector('canvas'),{save,onSnapshot:s=>qa.snapshot=s,onInteract:()=>{},onActivity:()=>{},onError:e=>qa.errors.push(String(e)),onLoadState:busy=>qa.ready=!busy});game.setQuality('${surfaceClose?'detail':'auto'}');
</script></html>`);};
let server,browser;const report={ok:false,scope:surfaceClose?'selected-close-surfaces':requestedSites.length?'selected-sites':'complete-realm-arrivals',requestedSites,surfaceClose,quality:surfaceClose?'detail':'auto',renderer:'Chromium ANGLE SwiftShader (software)',physicalDeviceFpsMeasured:false,checks:['real WebGL render',requestedSites.length?'selected remote review sites':'remote province, village and permanent guardian court per country','actual keyboard movement','ground raycast','finite coordinates','bounded sector allocations','human civilian pool','guardian physically at the distant court when selected','no script/shader/asset errors'],results:[],errors:[]};
async function capture(page,path){const uri=await page.evaluate(()=>game.qaFreezeCapture());try{assert.ok(uri.startsWith('data:image/png;base64,')&&uri.length>10000,'Real GPU frame exported');await writeFile(path,Buffer.from(uri.slice(uri.indexOf(',')+1),'base64'));}finally{await page.evaluate(()=>game.qaResumeCapture());}}
const finiteState=state=>[state.position.x,state.position.z,state.avatar?.x,state.avatar?.y,state.avatar?.z,state.height,...state.camera].every(Number.isFinite);
try{
 server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true,watch:{ignored:['**/scripts/.*fixture*','**/outputs/**']}},plugins:[{name:'private-eight-realms-fixture',transform(code,id){if(id.split('?')[0].endsWith('/src/world/scene.js'))return injectQa(code);},configureServer(s){s.middlewares.use('/__eight-realms-qa',handler);}}]});await server.listen();
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const regions=(process.env.EIGHT_REALMS_REGIONS||'france,algerie,maroc,tunisie,espagne,italie,turquie,estonie').split(',');
 for(const region of regions){const context=await browser.newContext({viewport:{width:960,height:600},deviceScaleFactor:1}),errors=[];await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>4});const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-08T12:30:00']));}static now(){return new NativeDate('2026-10-08T12:30:00').getTime();}};localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:34}));});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const result={region,ok:false,arrivals:[]};report.results.push(result);
  try{
   console.log(region+': loading real scene');await page.goto('http://127.0.0.1:'+port+'/__eight-realms-qa?region='+region,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>qa.ready&&game.qaRealmState().heroReady&&qa.snapshot?.drawCalls>0,undefined,{timeout:180000});await page.evaluate(()=>game.skipCinematic());
   const sites=(await page.evaluate(()=>[qa.sites.find(s=>s.id.endsWith('province-2')),qa.sites.find(s=>s.id.endsWith('village-2-3')),qa.sites.find(s=>s.kind==='guardianCourt')])).filter(s=>!requestedSites.length||requestedSites.includes(s.id));assert.ok(sites.length,'Each requested country has at least one review site');
   for(const site of sites){
    console.log(region+': visiting '+site.id);
    const landing=surfaceClose?await page.evaluate(site=>{
     if(site.kind==='guardianCourt')return{x:site.x,z:site.z+18,view:{yaw:0,pitch:.4,distance:22}};
     const home=qa.buildings.filter(b=>b.site===site.id).sort((a,b)=>Math.hypot(a.x-site.arrival.x,a.z-site.arrival.z)-Math.hypot(b.x-site.arrival.x,b.z-site.arrival.z))[0];if(!home)throw Error('No house at requested surface review site');
     const outward={x:Math.sin(home.rotation),z:Math.cos(home.rotation)};return{x:home.x+outward.x*(home.depth/2+10),z:home.z+outward.z*(home.depth/2+10),building:home.id,view:{yaw:Math.atan2(outward.x,outward.z),pitch:.32,distance:18}};
    },site):site.arrival;
    assert.equal(await page.evaluate(({site,landing})=>game.relocateRealm({region:site.region,x:landing.x,z:landing.z}),{site,landing}),true);await page.evaluate(({close,view})=>close?game.qaSurfaceLook(view):game.qaLook(),{close:surfaceClose,view:landing.view});
    try{await page.waitForFunction(court=>{const s=game.qaRealmState();return s.stream?.pendingSectors===0&&s.crowd?.ready&&(court?s.guardians.some(g=>g.ready):s.crowd.visible>0);},site.kind==='guardianCourt',{timeout:120000,polling:400});}
    catch(error){const state=await page.evaluate(()=>game.qaRealmState()).catch(e=>({diagnosticError:String(e)}));const summary={site:site.id,pending:state.stream?.pendingSectors,active:state.stream?.activeSectors,sectors:state.stream?.generatedSectors,visible:state.crowd?.visible,crowdReady:state.crowd?.ready,crowdError:state.crowd?.error,guardianReady:state.guardians?.some(g=>g.ready),render:state.render,paused:state.paused};result.lastState=summary;console.error(region+': settlement diagnostics '+JSON.stringify(summary));throw error;}
    const before=await page.evaluate(()=>game.qaRealmState()),floorBefore=await page.evaluate(p=>game.qaTerrainAt(p),before.position);assert.ok(finiteState(before));assert.ok(Math.hypot(before.position.x-landing.x,before.position.z-landing.z)<.1,'Selected landing really is unobstructed');assert.ok(floorBefore.hit&&floorBefore.difference<1.5,'Actual rendered ground matches physics');assert.ok(Math.hypot(before.position.x,before.position.z)>before.stream.radius*.70,'Reached outer playable territory');assert.ok(before.stream.activeSectors<=49&&before.stream.maxSectors<=49);assert.ok(before.stream.natureInstances<=320&&before.stream.buildingInstances<=48);assert.ok(before.stream.drawCalls<=72);assert.equal(before.crowd.count,32);assert.ok(before.crowd.drawCalls<=4);
    if(site.kind==='guardianCourt')assert.ok(before.guardians.some(g=>g.visible&&Math.hypot(g.x-site.x,g.z-site.z)<1),'Real guardian inhabits the remote court');
    await capture(page,resolve(out,region+'-'+(site.kind==='guardianCourt'?'guardian-court':site.major?'province':'village')+'.png'));
    await page.locator('canvas').focus();await page.keyboard.down('s');try{await page.waitForFunction(p=>Math.hypot(game.qaRealmState().position.x-p.x,game.qaRealmState().position.z-p.z)>1.8,before.position,{timeout:60000});}finally{await page.keyboard.up('s');}
    await page.waitForTimeout(450);const after=await page.evaluate(()=>game.qaRealmState()),floorAfter=await page.evaluate(p=>game.qaTerrainAt(p),after.position);assert.ok(finiteState(after));assert.ok(Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z)>1.8,'Native keyboard moved the real avatar');assert.ok(floorAfter.hit&&floorAfter.difference<1.5);assert.ok(Math.abs(after.avatar.y-after.height)<.05,'Avatar feet use streamed height');
    result.arrivals.push({site:site.id,name:site.name,building:landing.building,view:landing.view,positionBefore:before.position,positionAfter:after.position,height:after.height,ground:floorAfter,stream:after.stream,guardians:site.kind==='guardianCourt'?after.guardians:undefined,crowd:{visible:after.crowd.visible,count:after.crowd.count,drawCalls:after.crowd.drawCalls},render:after.render,renderer:after.renderer});
   }
   const fixtureErrors=await page.evaluate(()=>qa.errors);assert.deepEqual([...errors,...fixtureErrors],[],'No script, shader or asset errors');const save=await page.evaluate(()=>qa.save);assert.equal(save.xp,0);assert.equal(save.shards,25);result.ok=true;console.log(region+': PASS');
  }catch(error){result.error=error.message;result.errors=errors;report.errors.push(region+': '+error.message);await capture(page,resolve(out,region+'-failure.png')).catch(()=>{});console.error(region+': FAIL '+error.message);}
  await page.evaluate(()=>game?.destroy()).catch(()=>{});await context.close();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
 }
 report.ok=report.results.length===regions.length&&report.results.every(r=>r.ok);assert.equal(report.ok,true,'Every requested country must pass');
}finally{await browser?.close();await server?.close();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));}
console.log('EIGHT_REALMS_OK '+JSON.stringify({countries:report.results.length,arrivals:report.results.reduce((n,r)=>n+r.arrivals.length,0),renderer:report.renderer,physicalDeviceFpsMeasured:false}));
