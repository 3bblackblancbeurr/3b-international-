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
function Studio(){const [draft,update]=React.useState({weapon:WEAPONS[0].id,weaponForm:0});window.armoryQA.select=id=>update({weapon:id,weaponForm:0});return React.createElement(Armory,{draft,change:patch=>update(d=>({...d,...patch})),xp:0});}
createRoot(document.getElementById('armory')).render(React.createElement(Studio));
`;
const armoryHandler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><style>body{margin:0;background:#0b1320;color:#f4e5c5;padding:20px;font-family:sans-serif}main{max-width:1100px;margin:auto}</style></head><body><main id="armory"></main><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/__armory-entry.jsx"></script></body></html>`);};
const server=await createServer({plugins:[{name:'world-art-qa',resolveId(id){if(id==='/__armory-entry.jsx')return id;},load(id){if(id==='/__armory-entry.jsx')return armoryEntry;},transform(code,id){if(id.endsWith('/src/world/scene.js'))return code.replace('return{\n  refreshHubSchedule:', 'return{renderHubOverview(){camera.position.set(340,260,340);camera.lookAt(0,35,0);renderer.render(scene,camera);},debugView(){return {camera,cameraTarget,cameraSolids,shot,avatarBounds:new THREE.Box3().setFromObject(avatar),frontMeshes:(()=>{const r=new THREE.Raycaster();r.setFromCamera(new THREE.Vector2(0,-.4),camera);return r.intersectObject(root,true).slice(0,5).map(h=>({name:h.object.name,type:h.object.geometry.type,point:h.point,scale:h.object.getWorldScale(new THREE.Vector3())}));})()};},\n  refreshHubSchedule:');},configureServer(s){s.middlewares.use('/__world-art-qa',qaHandler);s.middlewares.use('/__armory-qa',armoryHandler);}}],server:{host:'127.0.0.1',port:5197,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const region of (process.env.WORLD_ART_REGIONS||'hub,france,maroc').split(',')){
  const errors=[],context=await browser.newContext({viewport:{width:Number(process.env.WORLD_ART_WIDTH)||800,height:Number(process.env.WORLD_ART_HEIGHT)||500},deviceScaleFactor:1});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await context.addInitScript(({dateString})=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[dateString]));}static now(){return new NativeDate(dateString).getTime();}};localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:.12,pitch:.21,distance:24}));},{dateString:'2026-10-02T'+(process.env.WORLD_ART_CLOCK||'16:20:00')});
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('console',m=>{if(m.text().startsWith('QA'))console.log(region,m.text());if(m.type()==='error'&&/WebGL|THREE|shader/i.test(m.text()))errors.push(m.text());});
  console.log('LOAD',region);
  await page.goto('http://127.0.0.1:5197/__world-art-qa?region='+region+'&quality='+(process.env.WORLD_ART_QUALITY||'fluid'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.qa?.ready&&qa.snapshot?.drawCalls>0,{},{timeout:180000});
  await page.evaluate(()=>game.skipCinematic());
  await page.waitForFunction(()=>qa.snapshots.length>4,{},{timeout:90000});
  console.log('FRAME',JSON.stringify(await page.evaluate(()=>({calls:qa.snapshot.drawCalls,triangles:qa.snapshot.triangles,graphics:qa.snapshot.graphics,camera:game.debugView().camera.position,target:game.debugView().cameraTarget,nearSolids:game.debugView().cameraSolids.filter(b=>Math.hypot(b.x,b.z)<35),shot:game.debugView().shot?.kind,avatarBounds:game.debugView().avatarBounds,frontMeshes:game.debugView().frontMeshes}))));
  await page.evaluate(()=>game.setPaused(true));
  await page.screenshot({path:out+'/'+region+'.png',timeout:60000});if(region==='hub'){await page.evaluate(()=>game.renderHubOverview());await page.screenshot({path:out+'/hub-overview.png',timeout:60000});}await page.evaluate(()=>game.setPaused(false));
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
  await page.evaluate(()=>game.destroy());await context.close();console.log('PASS',JSON.stringify(results.at(-1)));
 }
 if(process.env.WORLD_ART_ARMORY==='1'){
  const context=await browser.newContext({viewport:{width:Number(process.env.WORLD_ART_WIDTH)||800,height:Number(process.env.WORLD_ART_HEIGHT)||500},deviceScaleFactor:1}),errors=[];
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('ARMORYERROR',e.message);});page.on('console',m=>{if(m.type()==='error'&&/WebGL|THREE|shader/i.test(m.text()))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5197/__armory-qa',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.weapon-showroom-stage canvas').catch(async e=>{await page.screenshot({path:out+'/armory-failure.png',fullPage:true});console.log('ARMORY STATE',JSON.stringify({errors,html:await page.locator('main').innerHTML()}));throw e;});
  const weapons=await page.evaluate(()=>armoryQA.weapons);assert.equal(weapons.length,16);
  await page.screenshot({path:out+'/armory-menu.png',fullPage:true});
  for(const id of weapons){
   await page.evaluate(id=>armoryQA.select(id),id);
   await page.waitForFunction(id=>document.querySelector('.armory-grid button[aria-pressed="true"]')?.querySelector('strong')?.textContent===document.querySelector('.weapon-showroom figcaption strong')?.textContent&&window.armoryQA.weapons.includes(id),id);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const stage=page.locator('.weapon-showroom-stage');assert.equal(await stage.getAttribute('data-failed'),'false',id+' real 3D renderer');
   assert.equal(await stage.locator('canvas').count(),1,'Exactly one selected-item renderer');
   const box=await stage.boundingBox();assert.ok(box.width>250&&box.height>=240,'Weapon preview stays large');
   await stage.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');
   await page.locator('.weapon-showroom').screenshot({path:out+'/weapon-'+id+'.png'});
  }
  assert.deepEqual(errors,[],'Armory mounts and switches all 16 weapons without shader or script errors');results.push({armory:true,weapons,ok:true,errors});
  await context.close();
 }
}finally{await browser.close();await server.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
