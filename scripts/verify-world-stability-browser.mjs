// Actual renderer, isolated guest save, fixed daylight and reproducible views.
// Software GPU timings are diagnostic evidence, never a physical-phone claim.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.WORLD_STABILITY_OUT||'/tmp/3b-stability-reference';
await mkdir(out,{recursive:true});
const qaMethods=`
  qaReference(kind='large'){
   cancelAnimationFrame(raf);paused=true;shot=null;
   let view;
   if(region==='hub')view={eye:[110,130,150],target:[0,75,0],name:'Cercle Brisé et tour civique'};
   else{
    const site=landscape.field.realm.sites.find(s=>s.id.endsWith('village-2-3'));
    position={x:site.x,z:site.z};landscape.ensureLanding(position);
    for(let i=0;i<600&&landscape.streamingDiagnostics.pendingSectors;i++)landscape.updateStreaming(position);
    const y=groundY(site.x,site.z),views={
     large:{eye:[site.x+90,y+72,site.z+100],target:[site.x,y+6,site.z]},
     street:{eye:[site.x,groundY(site.x,site.z+48)+1.7,site.z+48],target:[site.x,y+3,site.z-27]},
     square:{eye:[site.x-12,groundY(site.x-12,site.z+10)+1.7,site.z+10],target:[site.x+8,y+3,site.z-15]},
     entry:{eye:[site.x,groundY(site.x,site.z+105)+1.7,site.z+105],target:[site.x,y+6,site.z]},
    };view={...views[kind],name:site.name,kind};
   }
   avatar.visible=false;camera.position.set(...view.eye);camera.lookAt(...view.target);
   landscape.tick(0,0,position);camera.updateMatrixWorld(true);root.updateMatrixWorld(true);sky.update(camera,0);staticInstances?.update(camera);
   landscape.updateDistrict(camera,position);renderer.info.reset();post.render(0);
   return {view,quality:qualityMode,png:canvas.toDataURL('image/png'),stream:landscape.streamingDiagnostics,budget:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}};
  },
  qaResume(){paused=false;avatar.visible=true;last=performance.now();raf=requestAnimationFrame(tick);},
`;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#10151a}canvas{width:100%;height:100%;display:block}</style></head><body><canvas></canvas><script type="module">
import {createWorldScene} from '/src/world/scene.js';import {blankSave} from '/src/world/rules.js';
const save=blankSave();save.region=new URLSearchParams(location.search).get('region')||'hub';save.adventure.avatar.created=true;save.adventure.companionHidden=true;
window.qa={save,ready:false,errors:[],snapshots:[]};window.game=createWorldScene(document.querySelector('canvas'),{save,onSnapshot:s=>{qa.snapshot=s;qa.snapshots.push(s);if(qa.snapshots.length>30)qa.snapshots.shift();},onInteract:()=>{},onActivity:()=>{},onError:e=>qa.errors.push(String(e)),onLoadState:busy=>qa.ready=!busy});game.setQuality(new URLSearchParams(location.search).get('quality')||'auto');
</script></body></html>`;
const server=await createServer({plugins:[{name:'stability-reference-qa',transform(code,id){if(id.endsWith('/src/world/scene.js'))return code.replace('  refreshHubSchedule:',qaMethods+'  refreshHubSchedule:');},configureServer(s){s.middlewares.use('/__stability-qa',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});}}],server:{host:'127.0.0.1',port:5211,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 for(const region of (process.env.WORLD_STABILITY_REGIONS||'hub,france').split(',')){
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await context.addInitScript(()=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-14T16:20:00']));}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/i.test(m.text()))errors.push(m.text());});
  await page.goto('http://127.0.0.1:5211/__stability-qa?region='+region+'&quality='+(process.env.WORLD_STABILITY_QUALITY||'auto'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>qa.ready&&qa.snapshot?.drawCalls>0,null,{timeout:180000});
  await page.evaluate(()=>game.skipCinematic());
  const before=await page.evaluate(()=>({...qa.snapshot.position}));
  await page.keyboard.down('Shift');await page.keyboard.down('s');
  await page.waitForFunction(p=>Math.hypot(qa.snapshot.position.x-p.x,qa.snapshot.position.z-p.z)>1,before,{timeout:60000});
  await page.keyboard.up('s');await page.keyboard.up('Shift');
  const movement={before,...await page.evaluate(()=>({after:qa.snapshot.position,performance:qa.snapshot.performance}))};
  const reference=await page.evaluate(()=>game.qaReference());
  assert.ok(reference.png.length>1000);await writeFile(out+'/'+region+'-reference.png',Buffer.from(reference.png.split(',')[1],'base64'));
  const views=[];
  if(region==='france')for(const kind of ['street','square','entry']){
   const frame=await page.evaluate(kind=>game.qaReference(kind),kind);assert.ok(frame.png.length>1000);
   await writeFile(out+'/france-'+kind+'.png',Buffer.from(frame.png.split(',')[1],'base64'));
   views.push({view:frame.view,budget:frame.budget});
  }
  const state=await page.evaluate(()=>({errors:qa.errors,xp:qa.save.xp,shards:qa.save.shards}));
  assert.deepEqual([...errors,...state.errors],[]);assert.equal(state.xp,0);assert.equal(state.shards,25);
  report.push({region,device:'844×390, mobile input, DPR 1',gpu:'SwiftShader software',movement,view:reference.view,budget:reference.budget,views,quality:reference.quality,stream:reference.stream,errors});
  console.log(region+': real rendering, sprint input and reference capture passed');
  await page.evaluate(()=>game.destroy());await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
