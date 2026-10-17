// Real WorldPage + WebGL scene, local guest ledger only. Private test hooks
// expose state for assertions; all evidence is acquired by real UI buttons.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5456')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.FRANCE_INVESTIGATION_OUT||'artifacts/france-investigation';")
 .replace("import {blankSave} from '/src/world/rules.js';","import {blankSave} from '/src/world/rules.js';import {campaignSnapshot} from '/src/world/campaign-runtime.js';")
 .replace('const save=blankSave();',"const save=applyWorldAction(blankSave(),{type:'visit',region:'france'});")
 .replace('let canonical=structuredClone(save);',"save.adventure.realmTravel={region:'france',...campaignSnapshot(save).target};let canonical=structuredClone(save);")
 .replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);","code=code.replace(/callbacks\\.current\\s*=\\s*\\{\\s*interact\\s*,/,'window.qa.act=act;window.qa.state=()=>saveRef.current;callbacks.current={interact,');return code.replace(marker,'window.qa.scene=scene.current;'+marker);")
 .replace("return code.replace(marker,`let qaCaptureFrozen=false;","code=code.replace('onSnapshot({','onSnapshot(window.qa.snapshot={');return code.replace(marker,`let qaCaptureFrozen=false;");
if(process.env.FRANCE_INVESTIGATION_GPU==='native')fixture=fixture.replace("'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'");
if(process.env.FRANCE_INVESTIGATION_DEBUG)fixture=fixture.replace('function injectCaptureHooks(code){',`function injectCaptureHooks(code){
 code=code.replace('models=value;rebuild(region);resize();last=performance.now();',"console.log('QA assets loaded');models=value;rebuild(region);console.log('QA region rebuilt');resize();console.log('QA resized');last=performance.now();");`);
const cases=String.raw`
const report=[];
async function hud(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());try{return await callback();}finally{await page.evaluate(()=>qa.scene.qaResumeCapture());}}
const profiles=[{id:'desktop',viewport:{width:1280,height:800}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}].filter(p=>!process.env.FRANCE_INVESTIGATION_PROFILES||process.env.FRANCE_INVESTIGATION_PROFILES.split(',').includes(p.id));
try{
 for(const profile of profiles){
  console.log(profile.id+': loading France investigation');
  const context=await browser.newContext({...profile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE_ERROR '+error.message);});page.setDefaultTimeout(45000);
  page.on('console',message=>{if(message.type()==='error'||process.env.FRANCE_INVESTIGATION_DEBUG)console.error('BROWSER '+message.text());});
  await page.addInitScript(()=>{
   localStorage.setItem('3b-world-sound','0');localStorage.setItem('3b-world-intro-seen','1');
   localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:20}));
  });
  try{
   await page.goto('http://127.0.0.1:5456/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>qa.scene,undefined,{timeout:120000});console.log(profile.id+': scene mounted');
   await page.evaluate(()=>qa.scene.setQuality('fluid'));console.log(profile.id+': graphics ready');
   await page.waitForFunction(()=>qa.snapshot?.region,undefined,{timeout:120000});
   await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});
   // The public entry policy deliberately resumes in the Hub. Reach France
   // through its canonical visit command before arranging local test points.
   await page.evaluate(()=>{qa.act({type:'visit',region:'france'});qa.scene.travel('france');});
   await page.waitForFunction(()=>qa.snapshot?.region==='france',undefined,{timeout:120000});console.log(profile.id+': first France frame');
   await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});console.log(profile.id+': models ready');
   await page.evaluate(()=>{qa.scene.setQuality('fluid');qa.scene.skipCinematic();});
   const storySkip=page.getByRole('button',{name:'Passer',exact:true});if(await storySkip.count())await hud(page,()=>storySkip.first().click());
   const card=page.getByRole('complementary',{name:'Enquête sur place',exact:true});
   async function openCurrent(){
    await page.evaluate(async()=>{
     const {campaignSnapshot}=await import('/src/world/campaign-runtime.js'),current=campaignSnapshot(qa.state());
     qa.scene.relocateRealm({region:'france',...current.target});qa.scene.skipCinematic();
    });
    await page.waitForFunction(()=>{const c=qa.snapshot?.campaign,p=qa.snapshot?.position;return c&&p&&Math.hypot(c.target.x-p.x,c.target.z-p.z)<1;},undefined,{timeout:60000});
    const skip=page.getByRole('button',{name:'Passer',exact:true});if(await skip.count())await hud(page,()=>skip.first().click());
    await page.locator('.world-cinematic-director').waitFor({state:'hidden',timeout:60000});
    await page.locator('.world-canvas').focus();await page.keyboard.press('e');
    await card.waitFor({state:'visible'});console.log(profile.id+': opened '+await card.locator('h3').innerText());
    assert.equal(await page.getByRole('dialog').count(),0,'inspection stays in the running world');
    assert.equal(await page.evaluate(()=>qa.scene.qaGuidanceState().paused),false,'walking and camera remain available');
    assert.equal(await page.locator('.realm-challenge').count(),0,'the same objective is not repeated over the scene while reading it');
   }
   await openCurrent();await capture(page,out+'/'+profile.id+'-lea.png');
   await hud(page,()=>card.getByRole('button',{name:'Écouter Léa et relever son témoignage',exact:true}).click());
   await card.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.france.inventory.temoignage_lea),1);
   await openCurrent();await hud(page,()=>card.getByRole('button',{name:'Interroger le témoin du quai',exact:true}).click());
   await card.waitFor({state:'hidden'});await openCurrent();
   await hud(page,()=>card.getByRole('button',{name:'Accuser le premier témoin',exact:true}).click());
   assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.france.phase),0,'wrong accusation cannot advance');
   assert.match(await card.innerText(),/ne résout pas/);
   await hud(page,()=>card.getByRole('button',{name:'Chercher le registre original',exact:true}).click());await card.waitFor({state:'hidden'});
   await openCurrent();assert.match(await card.innerText(),/sceau porte encore la date/);await capture(page,out+'/'+profile.id+'-archives.png');
   await hud(page,()=>card.getByRole('button',{name:'Examiner le sceau et relever la date',exact:true}).click());await card.waitFor({state:'hidden'});
   await openCurrent();await hud(page,()=>card.getByRole('button',{name:'Examiner les trois points de couture',exact:true}).click());await card.waitFor({state:'hidden'});
   await openCurrent();await hud(page,()=>card.getByRole('button',{name:'Relier les deux traces',exact:true}).click());await card.waitFor({state:'hidden'});
   assert.ok(await page.evaluate(()=>qa.state().adventure.campaigns.france.effects.includes('archives_ouvertes')));
   await openCurrent();await capture(page,out+'/'+profile.id+'-plateaux.png');
   const bounds=await card.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom,viewport:innerWidth,height:innerHeight,scroll:el.scrollWidth,width:el.clientWidth};});
   assert.ok(bounds.left>=0&&bounds.right<=bounds.viewport+1&&bounds.bottom<bounds.height,'interaction remains within viewport');assert.ok(bounds.scroll<=bounds.width+2,'no horizontal clue overflow');
   // Move away through the real scene API: a once-open conversation cannot be
   // used from afar. Tests arrange points; canonical commands still check range.
   await page.evaluate(()=>{const p=qa.scene.snapshotPosition();qa.scene.relocateRealm({region:'france',x:p.x,z:p.z+14});});await card.waitFor({state:'hidden'});
   const ledger=await page.evaluate(()=>structuredClone(qa.state().adventure.campaigns.france));
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')||'{}').data?.adventure?.campaigns?.france?.effects?.includes('archives_ouvertes'),undefined,{timeout:20000});
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>qa.scene&&qa.state().adventure.campaigns.france.effects.includes('archives_ouvertes'),undefined,{timeout:150000});
   assert.deepEqual(await page.evaluate(()=>qa.state().adventure.campaigns.france),ledger,'accepted evidence and consequences survive reload');
   assert.deepEqual(errors,[],'no browser runtime exceptions');
   report.push({profile:profile.id,pass:true,checks:['real-WebGL-world','six-canonical-UI-evidence-actions','wrong-accusation','world-keeps-running','proximity-close','touch-layout','ledger-reload']});
   console.log(profile.id+': PASS');
  }catch(error){console.error(profile.id+': FAILED '+error.stack);await capture(page,out+'/'+profile.id+'-failure.png').catch(()=>{});await fs.writeFile(out+'/'+profile.id+'-failure.txt',String(error.stack)+'\n'+await page.locator('body').innerText());throw error;}
  finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('FRANCE_INVESTIGATION_OK '+JSON.stringify(report));
}finally{await browser.close();await server.close();}
`;
// The generated file is intentionally private to the QA server, then removed.
const generated=new URL('./.france-investigation-fixture.mjs',import.meta.url);
await fs.writeFile(generated,fixture+cases.replaceAll('await fs.writeFile','await writeFile'));
try{await import(generated.href);}finally{await fs.unlink(generated).catch(()=>{});}
