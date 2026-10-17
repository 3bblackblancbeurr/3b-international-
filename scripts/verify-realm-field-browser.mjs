// Real WorldPage and native buttons for the seven local campaign adapters.
// Private relocations/one repair fixture arrange test state; rewards and
// choices still pass through the real canonical reducer and guest journal.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5462')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.REALM_FIELD_OUT||'artifacts/realm-field';")
 .replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);","code=code.replace(/callbacks\\.current\\s*=\\s*\\{\\s*interact\\s*,/,'window.qa.act=act;window.qa.state=()=>saveRef.current;window.qa.seed=next=>{next=normalizeSave(next);saveRef.current=next;setSave(next);writeLocal(null,next);setInvestigationId(null);setPanel(null);scene.current?.setSave(next);};callbacks.current={interact,');return code.replace(marker,'window.qa.scene=scene.current;'+marker);")
 .replace("return code.replace(marker,`let qaCaptureFrozen=false;","code=code.replace('onSnapshot({','onSnapshot(window.qa.snapshot={');return code.replace(marker,`let qaCaptureFrozen=false;");
if(process.env.REALM_FIELD_GPU==='native')fixture=fixture.replace("'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'");
const cases=String.raw`
const report=[],errors=[];
async function hud(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());try{return await callback();}finally{await page.evaluate(()=>qa.scene.qaResumeCapture());}}
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
 await page.evaluate(async extra=>{const {fieldCampaignSnapshot}=await import('/src/world/realm-story-field.js');const current=fieldCampaignSnapshot(qa.state());if(!current)throw Error('No canonical campaign at '+qa.state()?.region);qa.scene.relocateRealm({region:current.region,x:current.target.x+extra,z:current.target.z});},extra);
 await page.waitForFunction(extra=>{const current=qa.snapshot?.campaign,point=qa.snapshot?.position;return current&&point&&Math.hypot(point.x-current.target.x-extra,point.z-current.target.z)<1;},extra,{timeout:90000});await skipStory();
}
let firstInteraction=true;
async function openCurrent(){
 await relocateCurrent();
 // The first contact exercises the keyboard. Later contacts use the actual
 // HUD control, whose hit testing waits for a queued story shot to release it.
 if(firstInteraction){await page.locator('.world-canvas').focus();await page.keyboard.press('e');firstInteraction=false;}
 else await page.locator('.play-interaction').click();
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
try{
 await page.goto('http://127.0.0.1:5462/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:150000});await page.waitForFunction(()=>qa.scene,undefined,{timeout:150000});await page.evaluate(()=>qa.scene.setQuality('fluid'));await page.waitForFunction(()=>qa.snapshot?.region,undefined,{timeout:150000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});await skipStory();
 const regions=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'].filter(region=>!process.env.REALM_FIELD_REGIONS||process.env.REALM_FIELD_REGIONS.split(',').includes(region));
 for(const region of regions){
  await visit(region);await openCurrent();console.log(region+': local card open');
  await capture(page,out+'/'+region+'-local.png');
  if(region==='maroc'){
   await page.evaluate(()=>{const point=qa.scene.snapshotPosition();qa.scene.relocateRealm({region:'maroc',x:point.x+15,z:point.z});});await card.waitFor({state:'hidden'});await openCurrent();
  }
  const expected=await page.evaluate(async()=>{const {CAMPAIGN_RUNTIME_SPEC}=await import('/src/world/campaign-spec.js');const current=qa.snapshot.campaign;return{token:CAMPAIGN_RUNTIME_SPEC[current.region][0].steps[0].grant,objective:current.objective};});
  await hud(page,()=>card.getByRole('button',{name:'Examiner sur place',exact:true}).click());await card.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(({region,token})=>qa.state().adventure.campaigns[region].inventory[token],{region,token:expected.token}),1);
  assert.equal(await page.evaluate(region=>qa.state().adventure.campaigns[region].step,region),1);
  report.push({region,pass:true,objective:expected.objective,acceptedToken:expected.token,checks:['native-local-card','world-unpaused','actual-button-accepted','no-duplicate-objective']});console.log(region+': accepted');
  if(region==='algerie'){
   await openCurrent();await hud(page,()=>card.getByRole('button',{name:'Entendre chacun avant de partir',exact:true}).click());await card.waitFor({state:'hidden'});
   await openCurrent();await hud(page,()=>card.getByRole('button',{name:'Accompagner le groupe',exact:true}).click());await card.waitFor({state:'hidden'});
   await page.getByRole('complementary',{name:'Épreuve en cours',exact:true}).waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.algerie.started),true);report.at(-1).checks.push('escort-start-returns-to-active-HUD');
  }
 }
 if(!process.env.REALM_FIELD_REGIONS||regions.includes('italie')){
  await visit('italie');await seedRepair();await relocateCurrent();
  await hud(page,()=>page.getByRole('button',{name:'Choisir la réparation',exact:true}).click());await card.waitFor({state:'visible'});
  assert.equal(await page.getByRole('dialog').count(),0,'HUD opens the nearby repair in the running world');
  await hud(page,()=>card.getByRole('button',{name:'Recommencer le plan qui a échoué',exact:true}).click());
  assert.equal(await page.evaluate(()=>qa.state().adventure.campaigns.italie.trial),2);assert.ok(!await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')));
  await hud(page,()=>card.getByRole('button',{name:'Renforcer le nouvel assemblage',exact:true}).click());await card.waitFor({state:'hidden'});
  assert.ok(await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')));await capture(page,out+'/italie-repair-accepted.png');
  await seedRepair();await relocateCurrent(20);
  await hud(page,()=>page.getByRole('button',{name:'Choisir la réparation',exact:true}).click());const dialogue=page.getByRole('dialog',{name:'Une étape du royaume',exact:true});await dialogue.waitFor();
  await hud(page,()=>dialogue.getByRole('button',{name:'Renforcer le nouvel assemblage',exact:true}).click());
  assert.ok(!await page.evaluate(()=>qa.state().adventure.campaigns.italie.effects.includes('jardin_reconstruit')),'a remote dialog cannot bypass the canonical distance check');
  await hud(page,()=>dialogue.getByRole('button',{name:'Reprendre dans le monde',exact:true}).click());
  report.push({region:'italie-repair',pass:true,checks:['HUD-nearby-opens-local','two-repair-choices-preserved','wrong-repair-does-not-advance','accepted-repair','far-dialog-cannot-bypass-server-distance']});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({pass:true,errors,scenarios:report},null,2));console.log('REALM_FIELD_OK '+JSON.stringify(report));
}catch(error){console.error('REALM_FIELD_FAILED '+error.stack);await capture(page,out+'/failure.png').catch(()=>{});await writeFile(out+'/failure.txt',String(error.stack)+'\n'+JSON.stringify(await page.evaluate(()=>({region:qa.state()?.region,position:qa.snapshot?.position,campaign:qa.snapshot?.campaign,scene:qa.scene?.qaGuidanceState()})),null,2)+'\n'+await page.locator('body').innerText());throw error;
}finally{await context.close();await browser.close();await server.close();}
`;
const generated=new URL('./.realm-field-fixture.mjs',import.meta.url);await fs.writeFile(generated,fixture+cases);try{await import(generated.href);}finally{await fs.unlink(generated).catch(()=>{});}
