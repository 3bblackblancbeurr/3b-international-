// Exercise the actual playable renderer with an isolated in-memory save.
// No account, reward or remote service is contacted.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.WORLD_ART_OUT||'/tmp/3b-world-art';
await mkdir(out,{recursive:true});
const qaHandler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><style>html,body{margin:0;background:#10151a;width:100%;height:100%}canvas{width:100%;height:100%;display:block}</style></head><body><canvas></canvas><script type="module">
import {createWorldScene} from '/src/world/scene.js';
import {blankSave} from '/src/world/rules.js';
const p=new URLSearchParams(location.search),save=blankSave();save.region=p.get('region')||'hub';save.adventure.avatar.created=true;save.adventure.companionHidden=true;
window.qa={ready:false,snapshots:[],errors:[],save};console.log('QA renderer start');
window.game=createWorldScene(document.querySelector('canvas'),{save,onSnapshot:s=>{if(!qa.snapshot)console.log('QA first frame',s.drawCalls);qa.snapshot=s;qa.snapshots.push(s);if(qa.snapshots.length>30)qa.snapshots.shift();},onInteract:()=>{},onActivity:()=>{},onError:e=>qa.errors.push(String(e)),onLoadState:busy=>{qa.ready=!busy;console.log('QA loading',busy);}});
game.setQuality(p.get('quality')||'fluid');
</script></body></html>`);};
const armoryEntry=`
import React from 'react';
import {createRoot} from 'react-dom/client';
import Armory from '/src/world/origins/Armory.jsx';
import {WEAPONS} from '/src/world/arsenal.js';
import '/src/world/origins/creator.css';
window.armoryQA={weapons:WEAPONS.map(w=>w.id)};
function Studio(){const [draft,update]=React.useState({weapon:WEAPONS[0].id,weaponForm:0});window.armoryQA.select=(id,weaponForm=0)=>update({weapon:id,weaponForm});return React.createElement(Armory,{draft,change:patch=>update(d=>({...d,...patch})),xp:1000});}
createRoot(document.getElementById('armory')).render(React.createElement(Studio));
`;
const armoryHandler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><style>body{margin:0;background:#0b1320;color:#f4e5c5;padding:20px;font-family:sans-serif}main{max-width:1100px;margin:auto}</style></head><body><main id="armory"></main><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/__armory-entry.jsx"></script></body></html>`);};
const cartographyEntry=`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MiniMap,DetailedMap} from '/src/world/Cartography.jsx';
import '/src/world/world.css';
import '/src/world/exploration.css';
import '/src/world/audit.css';
window.cartographyQA={ready:false,selections:[]};
function Atlas(){const [fixture,setFixture]=React.useState(null),[mode,setMode]=React.useState('atlas');window.cartographyQA.mount=setFixture;window.cartographyQA.mode=setMode;React.useEffect(()=>{cartographyQA.ready=!!fixture;},[fixture]);if(!fixture)return null;const props={region:'hub',...fixture,onSelect:item=>cartographyQA.selections.push(item.id),onOpen:()=>setMode('atlas')};return mode==='atlas'?React.createElement('main',{className:'world-dialog cartography-qa-dialog'},React.createElement(DetailedMap,props)):React.createElement('main',{className:'world-shell cartography-qa-shell'},React.createElement(MiniMap,props));}
createRoot(document.getElementById('cartography')).render(React.createElement(Atlas));
`;
const cartographyHandler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#0b1e2c;color:#f4e5c5;font-family:sans-serif}*{box-sizing:border-box}.cartography-qa-dialog.world-dialog{position:relative;inset:auto;transform:none;width:calc(100% - 24px);max-width:1100px;margin:12px auto;padding:18px;max-height:none;height:auto;overflow:visible}.cartography-qa-shell.world-shell{position:relative;min-height:100vh;width:100%}</style></head><body><div id="cartography"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/__cartography-entry.jsx"></script></body></html>`);};
const server=await createServer({plugins:[{name:'world-art-qa',resolveId(id){if(id==='/__armory-entry.jsx'||id==='/__cartography-entry.jsx')return id;},load(id){if(id==='/__armory-entry.jsx')return armoryEntry;if(id==='/__cartography-entry.jsx')return cartographyEntry;},transform(code,id){if(id.endsWith('/src/world/scene.js'))return code.replace('return{\n  refreshHubSchedule:', 'return{qaLifeNavigationDiagnostic(kind){const nearest=p=>obstacles.map(o=>({id:o.id||null,x:o.x,z:o.z,r:o.r,width:o.width,depth:o.depth,rotation:o.rotation,enabled:o.enabled,distance:obstacleDistance(p,o)})).sort((a,b)=>a.distance-b.distance).slice(0,4);return {position:{...position},floor:landscape?.towerFloor||null,paused,shot:shot?.kind||null,lifeInteraction:lifeInteraction.sample(elapsed),nearby:nearest(position),candidates:physicalItems().filter(i=>i.type==="hubLifeObject"&&i.kind===kind).map(item=>{const path=findInteractionPath(position,item,obstacles,worldRadius),approach=path.at(-1);return {id:item.id,x:item.x,z:item.z,range:item.range,pathLength:path.length,approach:approach||null,approachDistance:approach?Math.hypot(approach.x-item.x,approach.z-item.z):null,nearby:nearest(item)};})};},qaLifeItems(){return physicalItems();},qaApproachLife(id){const item=physicalItems().find(i=>i.id===id);if(!item)return false;endLifeInteraction();const path=findInteractionPath(position,item,obstacles,worldRadius),approach=path.at(-1);if(!approach||Math.hypot(approach.x-item.x,approach.z-item.z)>item.range)return false;position={...approach};clearInput();return true;},mapQaFixture(){return{items:[...items,...physicalItems()],position:{...position},heading,cartography:landscape.cartography,route:target?[target,...route]:[],waypoint};},renderQaFrame(){post.render(0);},renderHubOverview(view="city"){const views={city:[[340,260,340],[0,35,0]],cascade:[[340,1,65],[285,-10,0]],nexus:[[110,130,150],[0,75,0]],bridge:[[90,4,4],[112,1,0]],interior:[[-139.4,4.8,-118],[-139.4,4,-136.85]]};const [position,target]=views[view]||views.city;camera.position.set(...position);camera.lookAt(...target);if(view==="facade"){const mass=landscape.root.getObjectByName("3B · tissu urbain des quartiers").getObjectByName("Bâtiments des quartiers");const matrix=new THREE.Matrix4();mass.getMatrixAt(0,matrix);const centre=new THREE.Vector3().setFromMatrixPosition(matrix);mass.localToWorld(centre);const aim=centre.clone().add(new THREE.Vector3(0,6,0));const probe=new THREE.Raycaster();let eye=aim.clone().add(new THREE.Vector3(19,12,19));for(let i=0;i<12;i++){const angle=i*Math.PI/6,candidate=aim.clone().add(new THREE.Vector3(Math.cos(angle)*19,5,Math.sin(angle)*19)),direction=aim.clone().sub(candidate),distance=direction.length();probe.set(candidate,direction.normalize());const obstruction=probe.intersectObject(landscape.root,true).find(hit=>!hit.object.material?.transparent&&hit.distance<distance-6);if(!obstruction){eye=candidate;break;}}camera.position.copy(eye);camera.lookAt(aim);}landscape.updateDistrict(camera,view==="interior"?{x:-139.4,z:-118}:{x:0,z:0});sky.update(camera,elapsed);landscape?.renderWaterReflection?.(renderer,scene,camera,elapsed+.1);post.render(0);},debugView(){return {camera,cameraTarget,cameraSolids,shot,avatarPosition:avatar.position.clone(),avatarBounds:new THREE.Box3().setFromObject(avatar),frontMeshes:(()=>{const r=new THREE.Raycaster();r.setFromCamera(new THREE.Vector2(0,-.4),camera);return r.intersectObject(root,true).slice(0,5).map(h=>({name:h.object.name,type:h.object.geometry.type,point:h.point,scale:h.object.getWorldScale(new THREE.Vector3())}));})()};},\n  refreshHubSchedule:');},configureServer(s){s.middlewares.use('/__world-art-qa',qaHandler);s.middlewares.use('/__armory-qa',armoryHandler);s.middlewares.use('/__cartography-qa',cartographyHandler);}}],server:{host:'127.0.0.1',port:5197,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
// The QA page consists solely of the renderer canvas. Export a freshly drawn
// frame synchronously, before WebGL's default drawing buffer is discarded.
// This avoids compositor screenshot stalls on the SwiftShader runner.
async function captureRenderer(page,path,view=null){
 const uri=await page.evaluate(view=>{
  if(view)game.renderHubOverview(view);else game.renderQaFrame();
  return document.querySelector('canvas').toDataURL('image/png');
 },view);
 assert.ok(uri.startsWith('data:image/png;base64,')&&uri.length>1000,'Renderer exported a PNG frame');
 await writeFile(path,Buffer.from(uri.slice(uri.indexOf(',')+1),'base64'));
}
try{
 if(process.env.WORLD_ART_ARMORY==='1'||process.env.WORLD_ART_ONLY_ARMORY==='1'){
  const context=await browser.newContext({viewport:{width:Number(process.env.WORLD_ART_WIDTH)||800,height:Number(process.env.WORLD_ART_HEIGHT)||500},deviceScaleFactor:1}),errors=[];
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('ARMORYERROR',e.message);});page.on('console',m=>{if(m.type()==='error'&&/WebGL|THREE|shader/i.test(m.text()))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5197/__armory-qa',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.weapon-showroom-stage canvas').catch(async e=>{await page.screenshot({path:out+'/armory-failure.png',fullPage:true});console.log('ARMORY STATE',JSON.stringify({errors,html:await page.locator('main').innerHTML()}));throw e;});
  const weapons=await page.evaluate(()=>armoryQA.weapons);assert.equal(weapons.length,16);
  await page.evaluate(()=>armoryQA.canvas=document.querySelector('.weapon-showroom-stage canvas'));
  if(await page.locator('.weapon-tile img').count()){
   await page.evaluate(()=>document.querySelectorAll('.weapon-tile img').forEach(img=>img.loading='eager'));
   await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.weapon-tile img')];return images.length===16&&images.every(img=>img.complete&&img.naturalWidth>0);},{},{timeout:30000});
   assert.equal(await page.locator('.weapon-tile img').count(),16,'Every collection tile loads its actual model image');
  }
  await page.screenshot({path:out+'/armory-menu.png',fullPage:true});
  for(const id of weapons){
   await page.evaluate(id=>armoryQA.select(id),id);
   await page.waitForFunction(id=>document.querySelector('.armory-grid button[aria-pressed="true"]')?.querySelector('strong')?.textContent===document.querySelector('.weapon-showroom figcaption strong')?.textContent&&window.armoryQA.weapons.includes(id),id);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const stage=page.locator('.weapon-showroom-stage');assert.equal(await stage.getAttribute('data-failed'),'false',id+' real 3D renderer');
   assert.equal(await stage.locator('canvas').count(),1,'Exactly one selected-item renderer');
   assert.equal(await page.evaluate(()=>armoryQA.canvas===document.querySelector('.weapon-showroom-stage canvas')),true,'Changing weapons reuses the same GPU context');
   await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.weapon-evolution-image img')];return images.length===4&&images.every(img=>img.complete&&img.naturalWidth===360&&img.naturalHeight===240);},{},{timeout:30000});
   const formImages=await page.evaluate(()=>[...document.querySelectorAll('.weapon-evolution-image img')].map(img=>img.src));
   assert.equal(new Set(formImages).size,4,id+' four tier photographs use distinct equipped geometry');
   for(let form=0;form<4;form++){assert.ok(formImages[form].startsWith('data:image/jpeg;base64,'),'Form photographs come from the live persistent renderer');await writeFile(out+'/weapon-form-'+id+'-'+form+'.jpg',Buffer.from(formImages[form].slice('data:image/jpeg;base64,'.length),'base64'));}
   await page.evaluate(id=>armoryQA.select(id,3),id);
   await page.waitForFunction(()=>document.querySelector('.weapon-showroom figcaption span')?.textContent.includes('FORME 4'));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await stage.getAttribute('data-failed'),'false',id+' highest-tier equipment renders');
   assert.equal(await page.evaluate(()=>armoryQA.canvas===document.querySelector('.weapon-showroom-stage canvas')),true,'Evolution selection retains the same GPU context');
   await page.evaluate(id=>armoryQA.select(id,0),id);
   await page.waitForFunction(()=>document.querySelector('.weapon-showroom figcaption span')?.textContent.includes('FORME 1'));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const box=await stage.boundingBox();assert.ok(box.width>250&&box.height>=240,'Weapon preview stays large');
   await stage.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');
   await page.locator('.weapon-showroom').screenshot({path:out+'/weapon-'+id+'.png'});
   await stage.screenshot({path:out+'/weapon-tile-'+id+'.jpg',type:'jpeg',quality:92});
  }
  assert.deepEqual(errors,[],'Armory mounts and switches all 16 weapons without shader or script errors');results.push({armory:true,weapons,forms:weapons.length*4,ok:true,errors});
  await context.close();
 }
 // Weapon captures finish first and remain available even if city QA later fails.
 for(const region of (process.env.WORLD_ART_ONLY_ARMORY==='1'?[]:(process.env.WORLD_ART_REGIONS||'hub,france,maroc').split(','))){
  const errors=[],context=await browser.newContext({viewport:{width:Number(process.env.WORLD_ART_WIDTH)||800,height:Number(process.env.WORLD_ART_HEIGHT)||500},deviceScaleFactor:1});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await context.addInitScript(({dateString})=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[dateString]));}static now(){return new NativeDate(dateString).getTime();}};localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:.12,pitch:.21,distance:24}));},{dateString:'2026-10-02T'+(process.env.WORLD_ART_CLOCK||'16:20:00')});
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('console',m=>{if(m.text().startsWith('QA'))console.log(region,m.text());if(m.type()==='error'&&/WebGL|THREE|shader/i.test(m.text()))errors.push(m.text());});
  console.log('LOAD',region);
  await page.goto('http://127.0.0.1:5197/__world-art-qa?region='+region+'&quality='+(process.env.WORLD_ART_QUALITY||'fluid'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.qa?.ready&&qa.snapshot?.drawCalls>0,{},{timeout:180000});
  if(region==='hub')await page.waitForFunction(()=>qa.snapshot.graphics?.crowd?.ready&&qa.snapshot.graphics.crowd.models?.length===2,{},{timeout:120000});
  await page.evaluate(()=>game.skipCinematic());
  await page.waitForFunction(()=>qa.snapshots.length>4,{},{timeout:90000});
  console.log('FRAME',JSON.stringify(await page.evaluate(()=>({calls:qa.snapshot.drawCalls,triangles:qa.snapshot.triangles,graphics:qa.snapshot.graphics,camera:game.debugView().camera.position,target:game.debugView().cameraTarget,nearSolids:game.debugView().cameraSolids.filter(b=>Math.hypot(b.x,b.z)<35),shot:game.debugView().shot?.kind,avatarBounds:game.debugView().avatarBounds,frontMeshes:game.debugView().frontMeshes}))));
  await page.evaluate(()=>game.setPaused(true));
  await captureRenderer(page,out+'/'+region+'.png');if(region==='hub'){await captureRenderer(page,out+'/hub-overview.png','city');for(const view of ['cascade','nexus','facade','bridge','interior'])await captureRenderer(page,out+'/hub-'+view+'.png',view);}await page.evaluate(()=>game.setPaused(false));
  const before=await page.evaluate(()=>qa.snapshot.position);
  await page.keyboard.down('s');await page.waitForFunction(p=>Math.hypot(qa.snapshot.position.x-p.x,qa.snapshot.position.z-p.z)>.1,before,{timeout:30000}).catch(()=>{});await page.keyboard.up('s');
  const data=await page.evaluate(()=>({snapshot:qa.snapshot,errors:qa.errors,saveUnchanged:qa.save.xp===0&&qa.save.shards===25}));
  assert.ok(Math.hypot(data.snapshot.position.x-before.x,data.snapshot.position.z-before.z)>.1,'Keyboard movement remains responsive');
  assert.deepEqual([...errors,...data.errors],[],'No script, shader or asset errors');assert.equal(data.saveUnchanged,true);
  results.push({region,ok:true,errors,drawCalls:data.snapshot.drawCalls,triangles:data.snapshot.triangles,positionBefore:before,positionAfter:data.snapshot.position,graphics:data.snapshot.graphics});
  if(region==='hub'&&process.env.WORLD_ART_JOURNEY==='1'){
   const sources=data.snapshot.graphics.instancing.sourceMeshes;
   for(const destination of ['france','hub']){await page.evaluate(destination=>game.travel(destination),destination);await page.waitForFunction(destination=>qa.ready&&qa.snapshot.region===destination,destination,{timeout:180000});await page.evaluate(()=>game.skipCinematic());}
   const rebuilt=await page.evaluate(()=>qa.snapshot.graphics.instancing.sourceMeshes);assert.equal(rebuilt,sources,'Rebuilding the Hub does not duplicate static meshes');
   await page.evaluate(()=>game.setQuality('detail'));await page.waitForFunction(()=>qa.snapshot.ambientOcclusion,{},{timeout:120000});
   await page.evaluate(()=>game.playCinematicShot('memory-fragment',{},3200));await page.waitForFunction(()=>qa.snapshot.cinematic!==null,{},{timeout:60000});await page.evaluate(()=>game.skipCinematic());
   await page.evaluate(()=>game.setQuality('fluid'));await page.waitForFunction(()=>qa.snapshot.ambientOcclusion===false,{},{timeout:90000});
   assert.deepEqual(errors,[],'No shader errors after travel, HIGH and cinematic');results.at(-1).journey=['hub-france-hub','no-duplicated-instances','HIGH','cinematic-skip','LOW'];
  }
  if(region==='hub'){
   for(const kind of ['seat','read','examine']){
    const item=await page.evaluate(kind=>game.qaLifeItems().filter(i=>i.type==='hubLifeObject'&&i.kind===kind).find(i=>game.qaApproachLife(i.id)),kind);
    if(!item){
     const diagnostic=await page.evaluate(kind=>game.qaLifeNavigationDiagnostic(kind),kind);
     await writeFile(out+'/hub-'+kind+'-navigation-failure.json',JSON.stringify(diagnostic,null,2));
     await captureRenderer(page,out+'/hub-'+kind+'-navigation-failure.png');
     console.log('QA LIFE NAVIGATION FAILURE',JSON.stringify(diagnostic));
    }
    assert.ok(item,'A physical '+kind+' object has a reachable approach through the real room');
    await page.evaluate(item=>{game.setPaused(false);game.contextAction(item.kind==='seat'?'sit':item.kind==='read'?'read':'inspect',item);},item);
    await page.waitForFunction(title=>qa.snapshot.lifeInteraction?.title===title,item.name,{timeout:60000});
    await page.waitForFunction(title=>qa.snapshots.slice(-4).length===4&&qa.snapshots.slice(-4).every(s=>s.lifeInteraction?.title===title),item.name,{timeout:60000});
    await page.evaluate(()=>game.setPaused(false));await captureRenderer(page,out+'/hub-'+kind+'-pose.png');
    await page.keyboard.down('s');await page.waitForFunction(()=>qa.snapshot.lifeInteraction===null,{},{timeout:30000});await page.keyboard.up('s');
   }
   const crown=await page.evaluate(()=>game.setTowerFloor(2));assert.equal(crown.y,63,'Ascenseur reaches the real63metredeck');
   await page.waitForFunction(()=>qa.snapshot.towerFloor?.index===2,{},{timeout:60000});
   await page.waitForFunction(()=>Math.abs(game.debugView().avatarPosition.y-63)<.001&&qa.snapshots.slice(-3).every(s=>s.towerFloor?.index===2),{},{timeout:60000});
   const hallIds=['hub:life:tower_circle:city-model','hub:life:tower_circle:welcome-seat'];
   assert.equal(await page.evaluate(ids=>qa.snapshot.mapItems.some(item=>ids.includes(item.id)),hallIds),false,'Upper-floor atlas cannot offer physical objects located in the ground hall');
   const upperExhibit=await page.evaluate(()=>game.qaLifeItems().find(item=>item.floorIndex===2));assert.ok(upperExhibit,'Active upper exhibit is a physical destination');
   await page.evaluate(item=>game.waypoint(item,true),upperExhibit);
   await page.waitForFunction(id=>qa.snapshot.towerFloor?.index===2&&qa.snapshot.waypoint?.id===id,upperExhibit.id,{timeout:60000});
   await captureRenderer(page,out+'/hub-tower-crown.png');
   const floorStart=await page.evaluate(()=>qa.snapshot.position);await page.keyboard.down('d');
   await page.waitForFunction(p=>Math.hypot(qa.snapshot.position.x-p.x,qa.snapshot.position.z-p.z)>.1,floorStart,{timeout:30000});await page.keyboard.up('d');
   const onFloor=await page.evaluate(()=>qa.snapshot.position);assert.ok(Math.abs(onFloor.x-crown.x)<crown.width/2&&Math.abs(onFloor.z-crown.z)<crown.depth/2,'Walking stays on the actual elevated floor');
   const hallBuilding=await page.evaluate(()=>game.mapQaFixture().items.find(item=>item.type==='hubBuilding'&&item.buildingId==='tower_circle'));assert.ok(hallBuilding);
   await page.evaluate(item=>game.waypoint(item,true),hallBuilding);
   await page.waitForFunction(id=>qa.snapshot.towerFloor===null&&qa.snapshot.waypoint?.id===id,hallBuilding.id,{timeout:60000});
   assert.equal(await page.evaluate(ids=>ids.every(id=>qa.snapshot.mapItems.some(item=>item.id===id)),hallIds),true,'Returning to the ground restores hall map destinations');
   assert.equal(await page.evaluate(()=>qa.snapshot.mapItems.some(item=>item.floorIndex===2)),false,'Returning to the ground removes upper exhibit destinations');
   assert.deepEqual(errors,[],'Physical interaction poses and tower floors have no script or shader errors');
   results.at(-1).life={poses:['seat','read','examine'],movementCancels:true,towerDeckMetres:63,groundReturn:true,verticalNavigation:['hall-items-hidden-upstairs','active-exhibit-stays-upstairs','named-hall-destination-returns-ground','hall-items-restored']};
  }
  if(region==='hub'){
   const fixture=await page.evaluate(()=>{const initial=game.mapQaFixture(),gate=initial.items.find(i=>i.type==='portal'&&i.id==='france');game.waypoint(gate,true);const fixture=JSON.parse(JSON.stringify(game.mapQaFixture()));game.setPaused(true);return fixture;});
   await writeFile(out+'/cartography-fixture.json',JSON.stringify(fixture,null,2));
   assert.ok(fixture.route.length>1,'The map receives a real detour route from the playable navigator');
   await page.evaluate(()=>game.destroy());
   await page.goto('http://127.0.0.1:5197/__cartography-qa',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>typeof window.cartographyQA?.mount==='function',{},{timeout:60000});
   await page.evaluate(fixture=>cartographyQA.mount(fixture),fixture);
   await page.waitForSelector('.hub-map-viewport svg');
   assert.equal(await page.locator('[data-island-id]').count(),29,'Atlas outlines every actual island');
   assert.equal(await page.locator('[data-building-id]').count(),19,'Atlas shows every functional room footprint');
   assert.equal(await page.locator('.hub-map-route polyline').count(),2,'Atlas renders the navigated route rather than a direct line');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Atlas does not overflow phone or desktop width');
   await page.screenshot({path:out+'/hub-atlas.png',fullPage:true});
   const map=page.locator('.hub-map-viewport svg'),before=await map.getAttribute('viewBox');
   await page.getByRole('button',{name:'Rapprocher la carte',exact:true}).click();
   assert.notEqual(await map.getAttribute('viewBox'),before,'Atlas zoom changes the physical viewport');
   await map.focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.evaluate(()=>Number(document.querySelector('.hub-map-viewport svg>g').getAttribute('transform').match(/translate\(([-\d.]+)/)[1])<0),true,'Keyboard panning preserves north-up physical orientation');
   await page.getByRole('searchbox',{name:'Trouver un lieu'}).fill('mémoire');
   const archiveItem=fixture.items.find(i=>i.type==='hubBuilding'&&i.buildingId==='memory_archives');
   assert.ok(archiveItem,'The real scene fixture contains the functional archive building');
   const archive=page.locator('.hub-map-destination-list button[data-destination-id="'+archiveItem.id+'"]');
   await archive.waitFor({state:'visible'});
   assert.ok((await archive.innerText()).includes('Archives'),'Accent-aware search finds the real archive building');
   await archive.click();
   assert.equal((await page.evaluate(()=>cartographyQA.selections)).at(-1),archiveItem.id,'Destination uses the existing real building ID');
   await page.getByRole('searchbox',{name:'Trouver un lieu'}).fill('');
   await page.getByRole('button',{name:'Transports',exact:true}).click();
   const franceGate=fixture.items.find(i=>i.type==='portal'&&i.id==='france');assert.ok(franceGate);
   assert.equal(await page.locator('.hub-map-destination-list button[data-destination-id="'+franceGate.id+'"]').count(),1,'The real French gate remains selectable in transport filter');
   await page.evaluate(()=>cartographyQA.mode('mini'));await page.waitForSelector('.hub-minimap');
   await page.screenshot({path:out+'/hub-minimap.png',fullPage:true});
   await page.getByRole('button',{name:'Élargir la mini-carte',exact:true}).click();
   assert.ok((await page.locator('.minimap-footer').innerText()).includes('Toute la cité'),'Mini-map can show the expanded entire city');
   await page.screenshot({path:out+'/hub-minimap-city.png',fullPage:true});
   await page.getByRole('button',{name:'Masquer la mini-carte',exact:true}).click();assert.equal(await page.locator('.hub-minimap.collapsed').count(),1);
   await page.getByRole('button',{name:'Afficher la mini-carte',exact:true}).click();assert.equal(await page.locator('.hub-minimap .minimap-open').count(),1);
   const open=page.getByRole('button',{name:'Ouvrir et explorer la grande carte de la cité',exact:true});await open.focus();await page.keyboard.press('Enter');await page.waitForSelector('.hub-map-viewport svg');
   assert.deepEqual(errors,[],'Atlas and mini-map mount, zoom, search, pan and navigate without script errors');
   results.at(-1).cartography={ok:true,islands:29,rooms:19,routeVertices:fixture.route.length,scenery:{fabric:fixture.cartography.fabric.length,vegetation:fixture.cartography.vegetation.length},interactions:['zoom','pan-keyboard','accent-search','destination-ID','transport-filter','mini-city','collapse-expand','keyboard-open']};
  }else await page.evaluate(()=>game.destroy());
  await context.close();console.log('PASS',JSON.stringify(results.at(-1)));
 }

}finally{await browser.close();await server.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
