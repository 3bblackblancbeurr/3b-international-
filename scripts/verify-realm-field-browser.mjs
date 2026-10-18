// Real WorldPage and native buttons for the seven local campaign adapters.
// Private relocations/one repair fixture arrange test state; rewards and
// choices still pass through the real canonical reducer and guest journal.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5462')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.REALM_FIELD_OUT||'artifacts/realm-field';")
 .replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);","code=code.replace(/callbacks\\.current\\s*=\\s*\\{\\s*interact\\s*,/,'window.qa.act=act;window.qa.state=()=>saveRef.current;window.qa.view=()=>({panel,investigationId,story:storyCinematic?.key,loading:assetsLoading,region:save.region,position:snapshot.position,objective:fieldInvestigation?.objective});window.qa.setUiPosition=point=>setSnapshot(previous=>({...previous,position:{...point}}));window.qa.seed=next=>{next=normalizeSave(next);saveRef.current=next;setSave(next);writeLocal(null,next);setInvestigationId(null);setPanel(null);scene.current?.setSave(next);};callbacks.current={interact,');return code.replace(marker,'window.qa.scene=scene.current;'+marker);")
 .replace("return code.replace(marker,`let qaCaptureFrozen=false;","code=code.replace('onSnapshot({','onSnapshot(window.qa.snapshot={');return code.replace(marker,`let qaCaptureFrozen=false;");
if(process.env.REALM_FIELD_GPU==='native')fixture=fixture.replace("'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'");
const cases=String.raw`
const report=[],errors=[];
async function hud(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());try{return await callback();}finally{await page.evaluate(()=>qa.scene.qaResumeCapture());}}
// Keep the native click and its React/DOM acceptance in the same brief render
// hold. Resuming SwiftShader between them can starve the closure observation.
async function closeLocal(callback,accepted=async()=>{}){return hud(page,async()=>{await callback();await card.waitFor({state:'hidden',timeout:10000});await accepted();});}
async function preCaptureDiagnostic(){
 let timer;try{return await Promise.race([page.evaluate(()=>{
  const q=window.qa,summarize=s=>s?{version:s.version,region:s.region,xp:s.xp,shards:s.shards,visited:s.visited,seals:s.seals,adventure:{campaigns:s.adventure?.campaigns,chapters:s.adventure?.chapters,cinematicSeen:s.adventure?.cinematicSeen,finished:s.adventure?.finished}}:null;
  let stored;try{const s=JSON.parse(localStorage.getItem('3b_world_v1_guest')||'null');stored=s?{dirty:s.dirty,data:summarize(s.data)}:null;}catch(error){stored={error:String(error)};}
  const describe=el=>({label:el.getAttribute('aria-label'),bounds:el.getBoundingClientRect().toJSON(),text:el.innerText.slice(0,8000),html:el.outerHTML.slice(0,12000)});
  return{at:Date.now(),phase:'before-capture',save:summarize(q?.state?.()),stored,position:q?.scene?.snapshotPosition?.(),snapshot:{region:q?.snapshot?.region,position:q?.snapshot?.position,campaign:q?.snapshot?.campaign,cinematic:q?.snapshot?.cinematic},scene:q?.scene?.qaGuidanceState?.(),view:q?.view?.(),events:q?.events,dom:{cards:[...document.querySelectorAll('.france-field-interaction')].slice(0,2).map(describe),stories:[...document.querySelectorAll('.world-cinematic-director,.play-cinematic')].slice(0,3).map(describe),body:document.body.innerText.slice(0,20000)}};
 }),new Promise(resolve=>{timer=setTimeout(()=>resolve({phase:'before-capture',error:'Diagnostic deadline exceeded (10 seconds)'}),10000);})]);}catch(error){return{phase:'before-capture',error:String(error)};}finally{clearTimeout(timer);}
}
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(45000);
page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE_ERROR '+error.message);});
page.on('console',message=>{if(message.type()==='error')console.error('BROWSER '+message.text());});
await page.addInitScript(()=>{localStorage.setItem('3b-world-sound','0');localStorage.setItem('3b-world-intro-seen','1');localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:20}));});
const card=page.getByRole('complementary',{name:'Étape sur place',exact:true});
async function skipStory(){
 await page.evaluate(()=>qa.scene.skipCinematic());
 const skip=page.getByRole('button',{name:'Passer',exact:true});if(await skip.count())await hud(page,()=>skip.first().click({timeout:8000}).catch(async error=>{if(await skip.first().isVisible())throw error;}));
 await page.locator('.world-cinematic-director').waitFor({state:'hidden',timeout:90000});
}
async function visit(region){
 console.log(region+': travel');
 await page.evaluate(region=>{if(qa.state().region!=='hub')qa.act({type:'visit',region:'hub'});const next=qa.act({type:'visit',region});if(next?.region!==region)throw Error('Canonical visit was not accepted: '+region);qa.scene.setSave(next);qa.scene.travel(region);},region);
 await page.waitForFunction(region=>qa.state()?.region===region&&qa.snapshot?.region===region,region,{timeout:150000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});await skipStory();
}
async function relocateCurrent(extra=0){
 const expected=await page.evaluate(async extra=>{const {fieldCampaignSnapshot}=await import('/src/world/realm-story-field.js');const current=fieldCampaignSnapshot(qa.state());if(!current)throw Error('No canonical campaign at '+qa.state()?.region);const point={x:current.target.x+extra,z:current.target.z};qa.scene.relocateRealm({region:current.region,...point});return{region:current.region,objective:current.objective,name:current.name,point};},extra);
 // An old objective plus its old position also satisfies a self-comparison.
 // Wait for publication of this accepted objective and the arranged live point.
 await page.waitForFunction(expected=>{const current=qa.snapshot?.campaign,point=qa.snapshot?.position;return qa.snapshot?.region===expected.region&&current?.objective===expected.objective&&point&&Math.hypot(point.x-expected.point.x,point.z-expected.point.z)<1;},expected,{timeout:90000,polling:100});await skipStory();return expected;
}
let firstInteraction=true;
async function openCurrent(){
 const expected=await relocateCurrent();
 // The first contact exercises the keyboard. Later contacts use the actual
 // HUD control after story overlays release it. Let the new snapshot's React
 // commit and Playwright's two stability frames run without more SwiftShader
 // submissions; hit testing and the canonical proximity checks remain real.
 if(firstInteraction){await page.locator('.world-canvas').focus();await page.keyboard.press('e');firstInteraction=false;}
 else{
  await page.locator('.world-cinematic-director').waitFor({state:'hidden',timeout:90000});
  await hud(page,async()=>{
   await page.waitForFunction(name=>document.querySelector('.play-interaction')?.getAttribute('aria-label')?.endsWith(name),expected.name,{polling:50,timeout:8000});
   await page.locator('.play-interaction').click({timeout:8000});
  });
 }
 await card.waitFor({state:'visible'});
 assert.equal(await page.getByRole('dialog').count(),0,'the local campaign does not open a blocking modal');
 assert.equal(await page.evaluate(()=>qa.scene.qaGuidanceState().paused),false,'local campaign keeps walking and camera running');
 assert.equal(await page.locator('.realm-challenge').count(),0,'only the local reading card represents this objective');
}
async function seedRepair(){
 await page.evaluate(async()=>{
  const {blankCampaignState}=await import('/src/world/campaign-state.js');const next=structuredClone(qa.state());
  next.adventure.campaigns.italie={...blankCampaignState(),active:true,completed:['rumor','path'],step:1,started:true,trial:2,clock:5,effects:['perte_reconnue'],inventory:{plan_nouveau:1,semences:1}};qa.seed(next);
 });
}
async function staleUiEvidence(expected){
 // Arrange a lagged React pose while the live simulation remains beside the
 // real objective. E and the evidence button must use the live point; neither
 // this hook nor the render hold changes the canonical save or command rules.
 await closeLocal(()=>card.getByRole('button',{name:'Reprendre la marche',exact:true}).last().click({timeout:8000}));
 await hud(page,async()=>{
  const live=await page.evaluate(()=>qa.scene.snapshotPosition()),old={x:live.x-13,z:live.z};
  try{
   await page.evaluate(old=>qa.setUiPosition(old),old);
   await page.waitForFunction(old=>qa.view().position.x===old.x&&qa.view().position.z===old.z,old,{polling:50,timeout:8000});
   await page.locator('.world-canvas').focus();await page.keyboard.press('e');await card.waitFor({state:'visible',timeout:8000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await card.isVisible(),true,'the real E card survives its effects while the displayed pose lags');
   assert.equal(await page.evaluate(()=>qa.view().investigationId),expected.objective);
   await card.getByRole('button',{name:'Examiner sur place',exact:true}).click({timeout:8000});await card.waitFor({state:'hidden',timeout:8000});
   assert.equal(await page.evaluate(token=>qa.state().adventure.campaigns.algerie.inventory[token],expected.token),1,'the real button grants the canonical evidence once');
   assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.algerie.step),1);
   assert.deepEqual(await page.evaluate(()=>qa.view().position),old,'evidence acceptance does not rewrite the arranged lagged pose');
   assert.deepEqual(await page.evaluate(()=>qa.scene.snapshotPosition()),live,'a display-only fixture cannot move the live player');
  }finally{
   await page.evaluate(live=>qa.setUiPosition(live),live);
   await page.waitForFunction(live=>qa.view().position.x===live.x&&qa.view().position.z===live.z,live,{polling:50,timeout:8000});
  }
 });
}
try{
 await page.goto('http://127.0.0.1:5462/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:150000});await page.waitForFunction(()=>qa.scene,undefined,{timeout:150000});await page.evaluate(()=>qa.scene.setQuality('fluid'));await page.waitForFunction(()=>qa.snapshot?.region,undefined,{timeout:150000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});await skipStory();
 const regions=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'].filter(region=>!process.env.REALM_FIELD_REGIONS||process.env.REALM_FIELD_REGIONS.split(',').includes(region));
 for(const region of regions){
  await visit(region);await openCurrent();console.log(region+': local card open');
  await capture(page,out+'/'+region+'-local.png');
  if(region==='maroc'){
   const away=await page.evaluate(()=>{const point=qa.scene.snapshotPosition(),away={region:'maroc',x:point.x+15,z:point.z};qa.scene.relocateRealm(away);return away;});
   // A genuine scene snapshot must publish the move before the render hold;
   // holding first would prevent the real proximity-closing effect from running.
   await page.waitForFunction(away=>qa.snapshot?.position&&Math.hypot(qa.snapshot.position.x-away.x,qa.snapshot.position.z-away.z)<1,away,{polling:100,timeout:90000});
   await hud(page,async()=>{await card.waitFor({state:'hidden',timeout:10000});assert.equal(await page.evaluate(()=>qa.view().investigationId),null);});await openCurrent();
  }
  const expected=await page.evaluate(async()=>{const {CAMPAIGN_RUNTIME_SPEC}=await import('/src/world/campaign-spec.js');const current=qa.snapshot.campaign;return{token:CAMPAIGN_RUNTIME_SPEC[current.region][0].steps[0].grant,objective:current.objective};});
  if(region==='algerie')await staleUiEvidence(expected);
  else await closeLocal(()=>card.getByRole('button',{name:'Examiner sur place',exact:true}).click(),async()=>{
   assert.equal(await page.evaluate(({region,token})=>qa.state().adventure.campaigns[region].inventory[token],{region,token:expected.token}),1);
   assert.equal(await page.evaluate(region=>qa.state().adventure.campaigns[region].step,region),1);
  });
  report.push({region,pass:true,objective:expected.objective,acceptedToken:expected.token,checks:['native-local-card','world-unpaused','actual-button-accepted','no-duplicate-objective']});console.log(region+': accepted');
  if(region==='algerie'){
   await openCurrent();await closeLocal(()=>card.getByRole('button',{name:'Entendre chacun avant de partir',exact:true}).click(),async()=>{
    const state=await page.evaluate(()=>qa.state().adventure.campaigns.algerie);assert.equal(state.phase,1);assert.equal(state.step,0);assert.equal(state.started,false);assert.ok(state.effects.includes('groupe_reuni'));assert.ok(state.completed.includes('rumor'));
   });
   await openCurrent();await closeLocal(()=>card.getByRole('button',{name:'Accompagner le groupe',exact:true}).click(),async()=>{
    await page.getByRole('complementary',{name:'Épreuve en cours',exact:true}).waitFor({state:'visible',timeout:10000});assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.algerie.started),true);
   });report.at(-1).checks.push('lagged-React-pose-live-E-and-canonical-evidence','escort-start-returns-to-active-HUD');
  }
 }
 if(!process.env.REALM_FIELD_REGIONS||regions.includes('italie')){
  await visit('italie');await seedRepair();await relocateCurrent();
  await hud(page,async()=>{await page.getByRole('button',{name:'Choisir la réparation',exact:true}).click();await card.waitFor({state:'visible',timeout:10000});});
  assert.equal(await page.getByRole('dialog').count(),0,'HUD opens the nearby repair in the running world');
  await hud(page,async()=>{await card.getByRole('button',{name:'Recommencer le plan qui a échoué',exact:true}).click();assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.italie.trial),2);assert.ok(!await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')));assert.equal(await card.isVisible(),true,'a wrong repair keeps the local choices open');});
  await closeLocal(()=>card.getByRole('button',{name:'Renforcer le nouvel assemblage',exact:true}).click(),async()=>{assert.ok(await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')));});await capture(page,out+'/italie-repair-accepted.png');
  await seedRepair();await relocateCurrent(20);
  const dialogue=page.getByRole('dialog',{name:'Une étape du royaume',exact:true});await hud(page,async()=>{await page.getByRole('button',{name:'Choisir la réparation',exact:true}).click();await dialogue.waitFor({state:'visible',timeout:10000});});
  await hud(page,async()=>{await dialogue.getByRole('button',{name:'Renforcer le nouvel assemblage',exact:true}).click();assert.ok(!await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')),'a remote dialog cannot bypass the canonical distance check');assert.equal(await dialogue.isVisible(),true);});
  await hud(page,async()=>{await dialogue.getByRole('button',{name:'Reprendre dans le monde',exact:true}).click();await dialogue.waitFor({state:'hidden',timeout:10000});});
  report.push({region:'italie-repair',pass:true,checks:['HUD-nearby-opens-local','two-repair-choices-preserved','wrong-repair-does-not-advance','accepted-repair','far-dialog-cannot-bypass-server-distance']});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({pass:true,errors,scenarios:report},null,2));console.log('REALM_FIELD_OK '+JSON.stringify(report));
}catch(error){console.error('REALM_FIELD_FAILED '+error.stack);const diagnostic=await preCaptureDiagnostic();await writeFile(out+'/failure.txt',String(error.stack)+'\n'+JSON.stringify(diagnostic,null,2));await capture(page,out+'/failure.png').catch(()=>{});throw error;
}finally{await context.close();await browser.close();await server.close();}
`;
const generated=new URL('./.realm-field-fixture.mjs',import.meta.url);await fs.writeFile(generated,fixture+cases);try{await import(generated.href);}finally{await fs.unlink(generated).catch(()=>{});}
