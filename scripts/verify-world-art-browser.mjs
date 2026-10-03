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
const server=await createServer({plugins:[{name:'world-art-qa',transform(code,id){if(id.endsWith('/src/world/scene.js'))return code.replace('return{\n  refreshHubSchedule:', 'return{debugView(){return {camera,cameraTarget,cameraSolids,shot};},\n  refreshHubSchedule:');},configureServer(s){s.middlewares.use('/__world-art-qa',qaHandler);}}],server:{host:'127.0.0.1',port:5197,strictPort:true}});
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
  console.log('FRAME',JSON.stringify(await page.evaluate(()=>({calls:qa.snapshot.drawCalls,triangles:qa.snapshot.triangles,graphics:qa.snapshot.graphics,camera:game.debugView().camera.position,target:game.debugView().cameraTarget,nearSolids:game.debugView().cameraSolids.filter(b=>Math.hypot(b.x,b.z)<35),shot:game.debugView().shot?.kind}))));
  await page.evaluate(()=>game.setPaused(true));
  await page.screenshot({path:out+'/'+region+'.png',timeout:60000});await page.evaluate(()=>game.setPaused(false));
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
}finally{await browser.close();await server.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
