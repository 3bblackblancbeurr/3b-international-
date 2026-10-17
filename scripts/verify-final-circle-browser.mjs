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
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5472')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.FINAL_CIRCLE_OUT||'artifacts/final-circle';")
 .replace('const save=blankSave();','const save='+JSON.stringify(seed)+';')
 .replace('const server=await createServer({',"const server=await createServer({cacheDir:'node_modules/.vite-final-circle-qa',")
 .replace("return code.replace(marker,'window.qa.scene=scene.current;'+marker);","code=code.replace(/callbacks\\.current\\s*=\\s*\\{\\s*interact\\s*,/,'window.qa.act=act;window.qa.state=()=>saveRef.current;callbacks.current={interact,');return code.replace(marker,'window.qa.scene=scene.current;'+marker);")
 .replace("return code.replace(marker,`let qaCaptureFrozen=false;return{",`const clock='function tick(now){\\n  now=performance.now();';assert.ok(code.includes(clock));code=code.replace(clock,'let qaVisualDt=null;function tick(now){\\n  now=qaVisualDt===null?performance.now():last+qaVisualDt*1000;');
 return code.replace(marker,\`let qaCaptureFrozen=false;return{
  qaFrame(count=1){cancelAnimationFrame(raf);qaCaptureFrozen=true;try{for(let i=0;i<Math.min(8,count);i++){qaVisualDt=.016;tick(last+16);cancelAnimationFrame(raf);}}finally{qaVisualDt=null;}},
  qaFinalLook(){orbit={...orbit,yaw:0,pitch:.34,distance:28};cameraFollow=true;manualCameraAt=-Infinity;needsRender=true;},
  qaFinalState(){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const a=actors.find(a=>a.itemId==='final'),body=a?.controller.object,project=(o,h)=>new THREE.Vector3(o.x,o.y+h,o.z).project(camera).toArray();return {ready:!!hero?.ready,bodyReady:!!a?.controller.ready,body:body?.userData.oblivion,visible:body?.visible,anchors:body&&avatar?[project(avatar.position,.2),project(avatar.position,4),project(body.position,.2),project(body.position,10.8)]:[],camera:camera.position.toArray(),target:cameraTarget.toArray(),environment:finaleEnvironment?.root.userData.presentation,environmentVisible:finaleEnvironment?.root.visible,paused,render:{...renderer.info.render},region};},`);
if(process.env.FINAL_CIRCLE_GPU==='native')fixture=fixture.replace("'--use-angle=swiftshader','--enable-unsafe-swiftshader'","'--use-angle=d3d11'");
const cases=String.raw`
const report=[];
const profiles=[{id:'desktop',viewport:{width:1280,height:800}},{id:'touch',viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}].filter(p=>!process.env.FINAL_CIRCLE_PROFILES||process.env.FINAL_CIRCLE_PROFILES.split(',').includes(p.id));
async function hold(page,callback){await page.evaluate(()=>qa.scene.qaHoldRender());return callback();}
async function skipStories(page){
 for(let i=0;i<6;i++){
  const button=page.getByRole('button',{name:'Passer',exact:true});
  if(await button.count()){await button.first().click();continue;}
  await page.waitForTimeout(100);
  if(!await page.locator('.world-cinematic-director').count())break;
 }
 await page.locator('.world-cinematic-director').waitFor({state:'hidden',timeout:30000});
 await page.evaluate(()=>qa.scene.skipCinematic());
}
async function draw(page){return page.evaluate(()=>{qa.scene.qaFrame(8);return qa.scene.qaFinalState();});}
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
   assert.ok(await page.evaluate(()=>!!qa.act({type:'final'})));await page.getByRole('region',{name:'Combat en déplacement libre'}).waitFor();
   await skipStories(page);await page.evaluate(()=>{qa.scene.setQuality('fluid');qa.scene.qaFinalLook();});
   let s=await draw(page);for(let i=0;i<8;i++)s=await draw(page);cameraCheck(s);
   assert.equal(s.body.art,'authored-fragment-body');assert.equal(s.environment.fighting,true);assert.equal(s.region,'hub');
   await capture(page,out+'/'+profile.id+'-phase-1.png');await page.evaluate(()=>qa.scene.qaHoldRender());
   // A real defense button enters the production input buffer. The remainder
   // replays fixed-step canonical commands to test every phase without waiting
   // on software-rendered real-time frame throughput.
   await page.getByRole('button',{name:'Garder',exact:true}).click();await draw(page);
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
    s=await draw(page);for(let i=0;i<4;i++)s=await draw(page);cameraCheck(s);assert.equal(s.body.phase,checkpoint.phase);assert.equal(s.environment.mastery,checkpoint.mastery);phases.push(checkpoint.phase);
    assert.match(await page.locator('.guardian-mechanic').innerText(),new RegExp('Phase '+checkpoint.phase+'/8'));
    await capture(page,out+'/'+profile.id+'-phase-'+checkpoint.phase+'.png');await page.evaluate(()=>qa.scene.qaHoldRender());
   }
   assert.deepEqual(phases,[2,3,4,5,6,7,8]);
   const won=await page.evaluate(()=>({finished:qa.state().adventure.finished,e:qa.state().adventure.encounter,xp:qa.state().xp,shards:qa.state().shards}));
   assert.equal(won.finished,true);assert.equal(won.e.finalCircleMastery,255);assert.equal(won.e.result,'victory');
   await page.waitForFunction(()=>document.querySelector('.world-cinematic-director'),undefined,{timeout:10000});assert.match(await page.locator('.world-cinematic-director').innerText(),/L’Oubli perd son emprise/);
   await skipStories(page);await page.evaluate(()=>qa.act({type:'leave'}));await skipStories(page);await draw(page);
   s=await draw(page);assert.equal(s.environment.restored,true);assert.equal(s.environment.mastery,255);assert.equal(s.environmentVisible,true);
   await capture(page,out+'/'+profile.id+'-circle-restored.png');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')||'{}').data?.adventure?.finished,undefined,{timeout:20000});
   await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>qa.scene?.qaFinalState().bodyReady&&qa.state().adventure.finished,undefined,{timeout:150000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
   await hold(page,()=>skipStories(page));await draw(page);s=await draw(page);
   assert.equal(s.environment.restored,true);assert.equal(await page.evaluate(()=>qa.state().xp),won.xp);assert.equal(await page.evaluate(()=>qa.state().shards),won.shards);assert.deepEqual(errors,[]);
   report.push({profile:profile.id,pass:true,phases:8,mastery:255,camera:'feet and 10.8m head in frustum',checks:['canonical-eight-country-playthrough-seed','real-WorldPage-WebGL','actual-defense-button','eight-fixed-step-phases','final-narrative','accepted-restoration','reload-without-double-reward'],physicalDeviceFpsMeasured:false});
   console.log(profile.id+': PASS');
  }catch(error){await capture(page,out+'/'+profile.id+'-failure.png').catch(()=>{});await writeFile(out+'/'+profile.id+'-failure.txt',error.stack+'\n'+await page.locator('body').innerText());throw error;}
  finally{await context.close();}
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('FINAL_CIRCLE_OK '+JSON.stringify(report));
}finally{await browser.close();await server.close();}
`;
const generated=new URL('./.final-circle-fixture.mjs',import.meta.url);
try{await fs.writeFile(generated,fixture+cases);await import(generated.href+'?t='+Date.now());}finally{await fs.unlink(generated).catch(()=>{});}
