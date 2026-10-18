// Real WorldPage and shipped WebGL scene. The private fixture replays accepted
// engine commands with a bounded visual clock; it never touches an account.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const spec=await fs.readFile(new URL('../tests/realm-campaign-runtime.test.js',import.meta.url),'utf8');
const seedMarker="test('eight physical campaigns";
assert.ok(spec.includes(seedMarker),'Canonical playthrough seed fixture matches the test');
const seedModule=new URL('../tests/.final-circle-seed-fixture.mjs',import.meta.url);
let seed;
try{
 await fs.writeFile(seedModule,spec.slice(0,spec.indexOf(seedMarker))+`\nlet seed=blankSave();for(const country of COUNTRIES)seed=playCountry(seed,country.id);seed=applyWorldAction(seed,{type:'visit',region:'hub'});export default seed;`);
 seed=(await import(seedModule.href+'?t='+Date.now())).default;
}finally{await fs.unlink(seedModule).catch(()=>{});}
function replaceOnce(source,marker,replacement,label=marker){
 assert.equal(source.split(marker).length-1,1,'Private final fixture marker must match exactly once: '+label);return source.replace(marker,replacement);
}
function injectFinalPage(code,marker){
 const callbacks=/callbacks\.current\s*=\s*\{\s*interact\s*,/g,matches=[...code.matchAll(callbacks)];assert.equal(matches.length,1,'Private final callback owner must match exactly once');
 code=code.replace(matches[0][0],'window.qa.act=act;window.qa.interact=interact;window.qa.state=()=>saveRef.current;window.qa.consumeCombatInput??=false;window.qa.acceptedCombatInputs??=[];callbacks.current={interact,');
 const combat=/combat\s*:\s*(?:input|\(\s*input\s*\))\s*=>\s*act\(\s*\{\s*type\s*:\s*(['"])field\1\s*,\s*\.\.\.input\s*\}\s*\)/g,combatMatches=[...code.matchAll(combat)];assert.equal(combatMatches.length,1,'Private final canonical combat callback must match exactly once');
 code=replaceOnce(code,combatMatches[0][0],`combat:input=>{if(!window.qa.consumeCombatInput)return null;const next=act({type:'field',...input});if(next)window.qa.acceptedCombatInputs.push({input:{...input},field:{...next.adventure.encounter.field}});return next;}`,'canonical combat callback');
 return replaceOnce(code,marker,'window.qa.scene=scene.current;'+marker,'scene ref');
}
function injectFinalScene(code){
 const clock='function tick(now){\n  now=performance.now();',api='return{\n  refreshHubSchedule:';
 code=replaceOnce(code,clock,'let qaVisualDt=null,qaVisualFrames=0;function tick(now){\n  now=qaVisualDt===null?performance.now():last+qaVisualDt*1000;','visual clock');
 return replaceOnce(code,api,`let qaCaptureFrozen=false;return{
  qaHoldRender(){cancelAnimationFrame(raf);qaCaptureFrozen=true;return elapsed;},
  qaFreezeCapture(){cancelAnimationFrame(raf);qaCaptureFrozen=true;post.render(0);return canvas.toDataURL('image/png');},
  qaFrame(count=1,dt=.25){
   if(!Number.isInteger(count)||count<1||count>6||!Number.isFinite(dt)||dt<=0||dt>.25)throw Error('Bounded private final visual step required');
   cancelAnimationFrame(raf);qaCaptureFrozen=true;try{for(let i=0;i<count;i++){qaVisualDt=dt;tick(last+dt*1000);qaVisualFrames++;cancelAnimationFrame(raf);}}finally{qaVisualDt=null;}
  },
  qaFinalLook(){orbit={...orbit,yaw:0,pitch:.34,distance:28};cameraFollow=true;manualCameraAt=-Infinity;needsRender=true;},
  qaFinalState(){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const a=actors.find(a=>a.itemId==='final'),body=a?.controller.object,project=(o,h)=>new THREE.Vector3(o.x,o.y+h,o.z).project(camera).toArray();return {ready:!!hero?.ready,bodyReady:!!a?.controller.ready,body:body?.userData.oblivion,visible:body?.visible,anchors:body&&avatar?[project(avatar.position,.2),project(avatar.position,4),project(body.position,.2),project(body.position,10.8)]:[],camera:camera.position.toArray(),target:cameraTarget.toArray(),environment:finaleEnvironment?.root.userData.presentation,environmentVisible:finaleEnvironment?.root.visible,paused,render:{...renderer.info.render},visualFrames:qaVisualFrames,region};},
  refreshHubSchedule:`,'scene API');
}
const original=(await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8')).replaceAll('\r\n','\n');
assert.equal(original.split('const report=[];').length-1,1,'Base browser fixture report boundary must match once');
let fixture=original.slice(0,original.indexOf('const report=[];')).replaceAll('5199','5472');
fixture=replaceOnce(fixture,"const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.FINAL_CIRCLE_OUT||'artifacts/final-circle';",'output');
fixture=replaceOnce(fixture,'const save=blankSave();','const save='+JSON.stringify(seed)+';','accepted playthrough seed');
fixture=replaceOnce(fixture,'const server=await createServer({',"const server=await createServer({cacheDir:'node_modules/.vite-final-circle-qa',",'isolated Vite cache');
const captureStart=fixture.indexOf('function injectCaptureHooks(code){'),captureEnd=fixture.indexOf('\nconst server=',captureStart);assert.ok(captureStart>=0&&captureEnd>captureStart,'Capture hook boundaries must match');
fixture=replaceOnce(fixture,fixture.slice(captureStart,captureEnd),replaceOnce.toString()+'\n'+injectFinalPage.toString()+'\nconst injectCaptureHooks='+injectFinalScene.toString()+';','private scene hook');
fixture=replaceOnce(fixture,"return code.replace(marker,'window.qa.scene=scene.current;'+marker);",'return injectFinalPage(code,marker);','private WorldPage hook');
// A screenshot does not resume the real-time scene: explicit bounded visual
// steps settle the camera, while accepted combat runs only through qa.act or
// the single real defense-button callback below.
fixture=replaceOnce(fixture,'scene?.qaResumeCapture();','scene?.qaHoldRender();','frozen capture return');
if(process.env.FINAL_CIRCLE_GPU==='native')fixture=replaceOnce(fixture,"'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'",'native GPU');
const cases=String.raw`
const report=[];
const profiles=[{id:'desktop',viewport:{width:1280,height:800}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}].filter(p=>!process.env.FINAL_CIRCLE_PROFILES||process.env.FINAL_CIRCLE_PROFILES.split(',').includes(p.id));
assert.ok(profiles.length,'At least one known final-circle profile is required');
async function hold(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());return callback();}
async function skipStories(page){
 const story=page.locator('.world-cinematic-director'),deadline=Date.now()+60000;
 for(let i=0;i<8;i++){
  await page.waitForTimeout(100);
  if(!await story.isVisible())break;
  while(await story.isVisible()){
   if(Date.now()>=deadline)throw Error('Final story controls did not release the world within 60 seconds');
   try{await story.getByRole('button',{name:'Passer',exact:true}).click({timeout:2000});}
   catch(error){if(error.name!=='TimeoutError')throw error;}
  }
 }
 await story.waitFor({state:'hidden',timeout:30000});
 await page.evaluate(()=>qa.scene.skipCinematic());
}
async function draw(page,count=5){return page.evaluate(count=>{const before=qa.state().adventure.encounter?.field?.time;qa.scene.qaFrame(count,.25);if(qa.state().adventure.encounter?.field?.time!==before)throw Error('Visual settling advanced canonical combat');return qa.scene.qaFinalState();},count);}
function cameraCheck(s){
 assert.equal(s.anchors.length,4);for(const p of s.anchors)assert.ok(p.every(Number.isFinite)&&Math.abs(p[0])<1.03&&Math.abs(p[1])<1.03&&p[2]>=-1&&p[2]<=1,'Hero and complete manifestation remain framed');
 assert.ok(s.camera.every(Number.isFinite));assert.equal(s.visible,true);
}
try{
 for(const profile of profiles){
  const context=await browser.newContext({...profile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
  await page.addInitScript(()=>{localStorage.setItem('3b-world-sound','0');localStorage.setItem('3b-world-intro-seen','1');localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:28}));});
  try{
   console.log(profile.id+': loading final circle WorldPage');await page.goto('http://127.0.0.1:5472/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>qa.scene&&qa.scene.qaFinalState().ready&&qa.scene.qaFinalState().bodyReady,undefined,{timeout:180000});
   await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});await hold(page,()=>skipStories(page));
   assert.equal(await page.evaluate(()=>qa.state().seals.length),8);assert.equal(await page.evaluate(()=>qa.state().adventure.finished),false);
   // Accepted final command creates the canonical field at the true Hub apron.
   await page.evaluate(()=>qa.interact(qa.scene.qaFinalState().region==='hub'?{id:'final',type:'final'}:null));await page.getByRole('region',{name:'Combat en déplacement libre'}).waitFor();
   await skipStories(page);await page.evaluate(()=>{qa.scene.setQuality('fluid');qa.scene.qaFinalLook();});
   assert.equal(await page.getByRole('heading',{name:'La manifestation de l’Oubli',exact:true}).count(),1,'The final enemy keeps its story identity instead of a collectible card placeholder');
   let s=await draw(page,6);cameraCheck(s);
   assert.equal(s.body.art,'authored-fragment-body');assert.equal(s.environment.fighting,true);assert.equal(s.region,'hub');
   const status=await page.locator('.field-status').boundingBox();assert.ok(status&&status.x>=0&&status.y>=0&&status.x+status.width<=profile.viewport.width+1&&status.y+status.height<=profile.viewport.height+1,'Final status stays in the viewport');
   for(const name of ['Frapper','Garder','Esquiver','Pouvoir']){const box=await page.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.width>=30&&box.height>=30&&box.x>=0&&box.y>=0&&box.x+box.width<=profile.viewport.width+1&&box.y+box.height<=profile.viewport.height+1,'Actual '+name+' control stays reachable');}
   await capture(page,out+'/'+profile.id+'-phase-1.png');await page.evaluate(()=>qa.scene.qaHoldRender());
   // A real defense button enters the production input buffer. The remainder
   // replays fixed-step canonical commands to test every phase without waiting
   // on software-rendered real-time frame throughput.
   const guardBefore=await page.evaluate(()=>({time:qa.state().adventure.encounter.field.time,accepted:qa.acceptedCombatInputs.length}));
   await page.getByRole('button',{name:'Garder',exact:true}).click();
   const acceptedGuard=await page.evaluate(()=>{qa.consumeCombatInput=true;try{qa.scene.qaFrame(1,.1);}finally{qa.consumeCombatInput=false;}return{record:qa.acceptedCombatInputs.at(-1),accepted:qa.acceptedCombatInputs.length,field:{...qa.state().adventure.encounter.field}};});
   assert.equal(acceptedGuard.accepted,guardBefore.accepted+1,'One real button produces one accepted canonical callback');assert.equal(acceptedGuard.record?.input.kind,'guard');assert.equal(acceptedGuard.field.last,'guard');assert.ok(acceptedGuard.field.guard>0);assert.equal(acceptedGuard.field.time,guardBefore.time+100,'Only the real defense callback advances one canonical tick');
   const phases=[];
   for(let pass=0;pass<16;pass++){
    const checkpoint=await page.evaluate(async()=>{
     const {finalCirclePhase}=await import('/src/world/final-circle.js');
     let initial=finalCirclePhase(qa.state().adventure.encounter)?.index,ticks=0;
     for(;ticks<600&&!qa.state().adventure.encounter.result;ticks++){
      const e=qa.state().adventure.encounter,f=e.field,phase=finalCirclePhase(e),d=Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z),h=Math.hypot(f.p.x-f.home.x,f.p.z-f.home.z);
      if(phase.index!==initial)break;
      let x=d>6?(f.enemy.x-f.p.x)/d:0,z=d>6?(f.enemy.z-f.p.z)/d:0,kind;
      if(['algerie','maroc'].includes(phase.region)&&h>8){x=(f.home.x-f.p.x)/h;z=(f.home.z-f.p.z)/h;}
      if(phase.region==='espagne'&&e.guardianFlag)kind='guard';
      else if(f.phase==='windup'&&f.windup<=400&&!f.guard){kind=phase.region==='tunisie'?'dodge':'guard';if(kind==='dodge'){x=(f.enemy.x-f.p.x)/Math.max(1,d);z=(f.enemy.z-f.p.z)/Math.max(1,d);}}
      else if(f.phase!=='windup')kind=e.focus>=2?'power':'strike';
      if(!qa.act({type:'field',x,z,kind}))throw Error('Canonical field command rejected');
     }
     const e=qa.state().adventure.encounter;return{phase:finalCirclePhase(e).index,mastery:e.finalCircleMastery,result:e.result,ticks,hp:e.hp,enemy:e.enemy};
    });
    console.log(profile.id+': '+JSON.stringify(checkpoint));assert.ok(checkpoint.ticks>0);
    if(checkpoint.result){assert.equal(checkpoint.result,'victory');break;}
    s=await draw(page);cameraCheck(s);assert.equal(s.body.phase,checkpoint.phase);assert.equal(s.environment.mastery,checkpoint.mastery);phases.push(checkpoint.phase);
    assert.match(await page.locator('.guardian-mechanic').innerText(),new RegExp('Phase '+checkpoint.phase+'/8','i'));
    await capture(page,out+'/'+profile.id+'-phase-'+checkpoint.phase+'.png');await page.evaluate(()=>qa.scene.qaHoldRender());
   }
   assert.deepEqual(phases,[2,3,4,5,6,7,8]);
   const won=await page.evaluate(()=>({finished:qa.state().adventure.finished,e:qa.state().adventure.encounter,xp:qa.state().xp,shards:qa.state().shards}));
   assert.equal(won.finished,true);assert.equal(won.e.finalCircleMastery,255);assert.equal(won.e.result,'victory');
   await page.waitForFunction(()=>document.querySelector('.world-cinematic-director'),undefined,{timeout:10000});assert.match(await page.locator('.world-cinematic-director').innerText(),/L’Oubli perd son emprise/i);assert.equal(await page.locator('dialog[open]').count(),0,'A native result dialog cannot cover the final cinematic controls');
   await skipStories(page);await page.getByRole('button',{name:'Revenir au monde',exact:true}).click();await skipStories(page);
   s=await draw(page);assert.equal(s.environment.restored,true);assert.equal(s.environment.mastery,255);assert.equal(s.environmentVisible,true);
   await capture(page,out+'/'+profile.id+'-circle-restored.png');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')||'{}').data?.adventure?.finished,undefined,{timeout:20000});
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>qa.scene?.qaFinalState().bodyReady&&qa.state().adventure.finished,undefined,{timeout:150000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
   await hold(page,()=>skipStories(page));s=await draw(page);
   assert.equal(s.environment.restored,true);assert.equal(await page.evaluate(()=>qa.state().xp),won.xp);assert.equal(await page.evaluate(()=>qa.state().shards),won.shards);assert.deepEqual(errors,[]);
   report.push({profile:profile.id,pass:true,phases:8,mastery:255,camera:'feet and 10.8m head in frustum',acceptedGuard:acceptedGuard.record,visualClock:'at most six frames per settle, .25 s per frame; canonical field time asserted frozen',checks:['canonical-eight-country-playthrough-seed','real-WorldPage-WebGL','actual-defense-button','eight-fixed-step-phases','final-narrative','accepted-restoration','reload-without-double-reward'],physicalDeviceFpsMeasured:false});
   console.log(profile.id+': PASS');
  }catch(error){await capture(page,out+'/'+profile.id+'-failure.png').catch(()=>{});await writeFile(out+'/'+profile.id+'-failure.txt',error.stack+'\n'+await page.locator('body').innerText());throw error;}
  finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('FINAL_CIRCLE_OK '+JSON.stringify(report));
}finally{await browser.close();await server.close();}
`;
const generated=new URL('./.final-circle-fixture.mjs',import.meta.url);
if(process.env.FINAL_CIRCLE_CHECK_FIXTURE==='1'){
 const scene=(await fs.readFile(new URL('../src/world/scene.js',import.meta.url),'utf8')).replaceAll('\r\n','\n'),page=(await fs.readFile(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8')).replaceAll('\r\n','\n'),marker='scene.current.setControls?.(controls);';
 const {transform}=await import('esbuild');await Promise.all([transform(fixture+cases,{loader:'js'}),transform(injectFinalScene(scene),{loader:'js'}),transform(injectFinalPage(page,marker),{loader:'jsx'})]);const transformed=await transform(page,{loader:'jsx',format:'esm'});await transform(injectFinalPage(transformed.code,marker),{loader:'js'});
 assert.throws(()=>injectFinalScene(scene.replace('function tick(now){','function changedTick(now){')),/marker must match exactly once/);
 assert.throws(()=>injectFinalScene(scene+'\nfunction tick(now){\n  now=performance.now();'),/marker must match exactly once/);
 assert.throws(()=>injectFinalPage(page.replace("combat:input=>act({type:'field',...input})",'combat:changed'),marker),/callback must match exactly once/);
 assert.throws(()=>injectFinalPage(page+"\nconst duplicate={combat:input=>act({type:'field',...input})};",marker),/callback must match exactly once/);
 assert.throws(()=>injectFinalPage(page+'\ncallbacks.current={interact,',marker),/callback owner must match exactly once/);
 console.log('FINAL_CIRCLE_FIXTURE_OK strict markers, JSX/scene/fixture compile; no browser launched');
}else{
 try{await fs.writeFile(generated,fixture+cases);await import(generated.href+'?t='+Date.now());}finally{await fs.unlink(generated).catch(()=>{});}
}
