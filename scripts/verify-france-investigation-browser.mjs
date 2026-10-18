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
 .replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);","code=code.replace(/callbacks\\.current\\s*=\\s*\\{\\s*interact\\s*,/,'window.qa.act=act;window.qa.state=()=>saveRef.current;window.qa.view=()=>({panel,investigationId,story:storyCinematic?.key,loading:assetsLoading,region:save.region,position:snapshot.position,objective:fieldInvestigation?.objective});callbacks.current={interact,');return code.replace(marker,'window.qa.scene=scene.current;'+marker);")
 .replace("return code.replace(marker,`let qaCaptureFrozen=false;","code=code.replace('onSnapshot({','onSnapshot(window.qa.snapshot={');return code.replace(marker,`let qaCaptureFrozen=false;");
if(process.env.FRANCE_INVESTIGATION_GPU==='native')fixture=fixture.replace("'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'");
if(process.env.FRANCE_INVESTIGATION_DEBUG)fixture=fixture.replace('function injectCaptureHooks(code){',`function injectCaptureHooks(code){
 code=code.replace('models=value;rebuild(region);resize();last=performance.now();',"console.log('QA assets loaded');models=value;rebuild(region);console.log('QA region rebuilt');resize();console.log('QA resized');last=performance.now();");`);
const cases=String.raw`
const report=[];
async function hud(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());try{return await callback();}finally{await page.evaluate(()=>qa.scene.qaResumeCapture());}}
// Observe the real click's closure/acceptance before software WebGL resumes.
async function closeLocal(page,card,callback,accepted=async()=>{}){return hud(page,async()=>{await callback();await card.waitFor({state:'hidden',timeout:10000});await accepted();});}
async function preCaptureDiagnostic(page){
 let timer;try{return await Promise.race([page.evaluate(()=>{
  const q=window.qa,summarize=s=>s?{version:s.version,region:s.region,xp:s.xp,shards:s.shards,visited:s.visited,seals:s.seals,adventure:{campaigns:s.adventure?.campaigns,chapters:s.adventure?.chapters,cinematicSeen:s.adventure?.cinematicSeen,finished:s.adventure?.finished}}:null;
  let stored;try{const s=JSON.parse(localStorage.getItem('3b_world_v1_guest')||'null');stored=s?{dirty:s.dirty,data:summarize(s.data)}:null;}catch(error){stored={error:String(error)};}
  const describe=el=>({label:el.getAttribute('aria-label'),bounds:el.getBoundingClientRect().toJSON(),text:el.innerText.slice(0,8000),html:el.outerHTML.slice(0,12000)});
  return{at:Date.now(),phase:'before-capture',save:summarize(q?.state?.()),stored,position:q?.scene?.snapshotPosition?.(),snapshot:{region:q?.snapshot?.region,position:q?.snapshot?.position,campaign:q?.snapshot?.campaign,cinematic:q?.snapshot?.cinematic},scene:q?.scene?.qaGuidanceState?.(),view:q?.view?.(),events:q?.events,dom:{cards:[...document.querySelectorAll('.france-field-interaction')].slice(0,2).map(describe),stories:[...document.querySelectorAll('.world-cinematic-director,.play-cinematic')].slice(0,3).map(describe),body:document.body.innerText.slice(0,20000)}};
 }),new Promise(resolve=>{timer=setTimeout(()=>resolve({phase:'before-capture',error:'Diagnostic deadline exceeded (10 seconds)'}),10000);})]);}catch(error){return{phase:'before-capture',error:String(error)};}finally{clearTimeout(timer);}
}
async function dismissStory(page,deadline=Date.now()+60000){
 const story=page.locator('.world-cinematic-director');
 while(await story.isVisible()){
  if(Date.now()>=deadline)throw Error('The story overlay did not release the world within 60 seconds.');
  try{await hud(page,()=>story.getByRole('button',{name:'Passer',exact:true}).click({timeout:Math.max(1,Math.min(2000,deadline-Date.now()))}));}
  catch(error){
   // A timed story may finish while Playwright checks the button's stability.
   // Its natural disappearance already satisfies the requested dismissal.
   if(error.name!=='TimeoutError')throw error;
   if(!await story.isVisible())return;
  }
 }
}
async function clickFranceContact(page){
 const story=page.locator('.world-cinematic-director'),deadline=Date.now()+60000;
 while(true){
  await dismissStory(page,deadline);
  if(Date.now()>=deadline)throw Error('The story queue did not release the contact within 60 seconds.');
  try{return await hud(page,()=>page.locator('.play-interaction').click({timeout:Math.max(1,Math.min(15000,deadline-Date.now()))}));}
  catch(error){
   // A queued power shot may mount after the hidden check. Keep its real
   // pointer interception, release the render hold, then dismiss/finish it.
   const intercepted=error.name==='TimeoutError'&&String(error.message).includes('world-cinematic-director')&&String(error.message).includes('intercepts pointer events');
   if(!intercepted||Date.now()>=deadline)throw error;
   if(await story.isVisible())await dismissStory(page,deadline);
  }
 }
}
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
   await dismissStory(page);
   const card=page.getByRole('complementary',{name:'Enquête sur place',exact:true});
   let firstInteraction=true;
   async function openCurrent(){
    const expected=await page.evaluate(async()=>{
     const {campaignSnapshot}=await import('/src/world/campaign-runtime.js'),current=campaignSnapshot(qa.state());
     qa.scene.relocateRealm({region:'france',...current.target});qa.scene.skipCinematic();
     return{objective:current.objective,target:current.target};
    });
    await page.waitForFunction(expected=>{const c=qa.snapshot?.campaign,p=qa.snapshot?.position;return qa.snapshot?.region==='france'&&c?.objective===expected.objective&&p&&Math.hypot(expected.target.x-p.x,expected.target.z-p.z)<1;},expected,{timeout:60000,polling:100});
    await dismissStory(page);
    await page.locator('.world-cinematic-director').waitFor({state:'hidden',timeout:60000});
    // First interaction exercises the keyboard. Later contacts use the actual
    // HUD button after queued stories release it. Suspend new WebGL submissions
    // while the native button receives Playwright's real stability/hit checks.
    if(firstInteraction){await page.locator('.world-canvas').focus();await page.keyboard.press('e');firstInteraction=false;}
    else await clickFranceContact(page);
    await card.waitFor({state:'visible'});console.log(profile.id+': opened '+await card.locator('h3').innerText());
    assert.equal(await page.getByRole('dialog').count(),0,'inspection stays in the running world');
    assert.equal(await page.evaluate(()=>qa.scene.qaGuidanceState().paused),false,'walking and camera remain available');
    assert.equal(await page.locator('.realm-challenge').count(),0,'the same objective is not repeated over the scene while reading it');
   }
   await openCurrent();await capture(page,out+'/'+profile.id+'-lea.png');
   await closeLocal(page,card,()=>card.getByRole('button',{name:'Écouter Léa et relever son témoignage',exact:true}).click(),async()=>{assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.france.inventory.temoignage_lea),1);});
   await openCurrent();await closeLocal(page,card,()=>card.getByRole('button',{name:'Interroger le témoin du quai',exact:true}).click());await openCurrent();
   await hud(page,async()=>{await card.getByRole('button',{name:'Accuser le premier témoin',exact:true}).click();assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.france.phase),0,'wrong accusation cannot advance');assert.equal(await card.isVisible(),true,'a wrong accusation keeps the local choices open');assert.match(await card.innerText(),/ne résout pas/);});
   await closeLocal(page,card,()=>card.getByRole('button',{name:'Chercher le registre original',exact:true}).click());
   await openCurrent();assert.match(await card.innerText(),/sceau porte encore la date/);await capture(page,out+'/'+profile.id+'-archives.png');
   await closeLocal(page,card,()=>card.getByRole('button',{name:'Examiner le sceau et relever la date',exact:true}).click());
   await openCurrent();await closeLocal(page,card,()=>card.getByRole('button',{name:'Examiner les trois points de couture',exact:true}).click());
   await openCurrent();await closeLocal(page,card,()=>card.getByRole('button',{name:'Relier les deux traces',exact:true}).click(),async()=>{assert.ok(await page.evaluate(()=>qa.state().adventure.campaigns.france.effects.includes('archives_ouvertes')));});
   await openCurrent();await capture(page,out+'/'+profile.id+'-plateaux.png');
   const bounds=await card.evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom,viewport:innerWidth,height:innerHeight,scroll:el.scrollWidth,width:el.clientWidth};});
   assert.ok(bounds.left>=0&&bounds.right<=bounds.viewport+1&&bounds.bottom<bounds.height,'interaction remains within viewport');assert.ok(bounds.scroll<=bounds.width+2,'no horizontal clue overflow');
   // Move away through the real scene API: a once-open conversation cannot be
   // used from afar. Tests arrange points; canonical commands still check range.
   const away=await page.evaluate(()=>{const p=qa.scene.snapshotPosition(),away={region:'france',x:p.x,z:p.z+14};qa.scene.relocateRealm(away);return away;});
   await page.waitForFunction(away=>qa.snapshot?.position&&Math.hypot(qa.snapshot.position.x-away.x,qa.snapshot.position.z-away.z)<1,away,{polling:100,timeout:90000});
   await hud(page,async()=>{await card.waitFor({state:'hidden',timeout:10000});assert.equal(await page.evaluate(()=>qa.view().investigationId),null);});
   // Yield the old WebGL context before persistence checks and real navigation.
   // The new document creates/resumes its own scene normally after the reload.
   await page.evaluate(()=>qa.scene.qaHoldRender());
   const ledger=await page.evaluate(()=>structuredClone(qa.state().adventure.campaigns.france));
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')||'{}').data?.adventure?.campaigns?.france?.effects?.includes('archives_ouvertes'),undefined,{timeout:20000});
   assert.equal(await page.evaluate(()=>qa.scene.qaGuidanceState().renderHeld),true);console.log(profile.id+': ledger persisted; reloading with old render held');
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>qa.scene&&qa.state().adventure.campaigns.france.effects.includes('archives_ouvertes'),undefined,{timeout:150000});
   assert.deepEqual(await page.evaluate(()=>qa.state().adventure.campaigns.france),ledger,'accepted evidence and consequences survive reload');
   assert.deepEqual(errors,[],'no browser runtime exceptions');
   report.push({profile:profile.id,pass:true,checks:['real-WebGL-world','six-canonical-UI-evidence-actions','wrong-accusation','world-keeps-running','proximity-close','touch-layout','ledger-reload']});
   console.log(profile.id+': PASS');
  }catch(error){console.error(profile.id+': FAILED '+error.stack);const diagnostic=await preCaptureDiagnostic(page);await fs.writeFile(out+'/'+profile.id+'-failure.txt',String(error.stack)+'\n'+JSON.stringify(diagnostic,null,2));await capture(page,out+'/'+profile.id+'-failure.png').catch(()=>{});throw error;}
  finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('FRANCE_INVESTIGATION_OK '+JSON.stringify(report));
}finally{await browser.close();await server.close();}
`;
// The generated file is intentionally private to the QA server, then removed.
const generated=new URL('./.france-investigation-fixture.mjs',import.meta.url);
await fs.writeFile(generated,fixture+cases.replaceAll('await fs.writeFile','await writeFile'));
try{await import(generated.href);}finally{await fs.unlink(generated).catch(()=>{});}
