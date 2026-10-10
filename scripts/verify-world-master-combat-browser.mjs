// Real scene + canonical fixed-step combat. Test-only clock, observers and
// captures are injected by an isolated Vite server, never exported by the game.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,isAbsolute,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.env.MASTER_COMBAT_OUT||resolve(repo,'..','world-master-combat'));
const outRelative=relative(repo,out);
assert.ok(outRelative==='..'||outRelative.startsWith('..'+sep)||isAbsolute(outRelative),'MASTER_COMBAT_OUT must be outside the checkout');
const port=Number(process.env.MASTER_COMBAT_PORT)||5440;
const profiles=[
 {name:'desktop',viewport:{width:1280,height:800},reducedMotion:'no-preference'},
 {name:'portrait-reduced',viewport:{width:390,height:844},reducedMotion:'reduce'},
].filter(p=>!process.env.MASTER_COMBAT_PROFILES||process.env.MASTER_COMBAT_PROFILES.split(',').includes(p.name));
assert.ok(profiles.length,'At least one known combat profile is required');
await mkdir(out,{recursive:true});

function injectQa(code){
 const clockMarker='function tick(now){\n  now=performance.now();';
 const apiMarker='return{\n  refreshHubSchedule:';
 assert.ok(code.includes(clockMarker)&&code.includes(apiMarker),'Private combat fixture matches the real scene API');
 code=code.replace(clockMarker,`let qaFrameDelta=null,qaFrozen=false;const qaCalls=[];function tick(now){
  now=qaFrameDelta===null?performance.now():last+qaFrameDelta*1000;`);
 return code.replace(apiMarker,`return{
  qaCombatState(){
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
   const encounter=save.adventure.encounter,rival=actors.find(a=>a.creature&&items.find(i=>i.id===a.itemId)?.card===encounter?.card),object=rival?.controller.object;
   const project=(p,height)=>new THREE.Vector3(p.x,p.y+height,p.z).project(camera).toArray();
   const bones=object?['spine_02','upperarm_r','hand_r'].map(name=>({name,quaternion:object.getObjectByName(name)?.quaternion.toArray()||null})):[];
   const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
   return {ready:!!hero?.ready,guardianReady:!!rival?.controller.ready,region,reducedMotion,paused,elapsed,field:encounter?.field||null,hp:encounter?.hp,
    guardian:rival?{id:rival.itemId,position:object.position.toArray(),...rival.controller.snapshotGuardian(),bones}:null,
    hero:avatar?.position.toArray(),actions:qaCalls.slice(),cue:lastCombat,
    threat:{...threat.state,position:threat.root.position.toArray(),floor:groundY(threat.root.position.x,threat.root.position.z)},
    camera:{position:camera.position.toArray(),target:cameraTarget.toArray(),desired:desiredCamera.toArray(),desiredTarget:desiredTarget.toArray(),orbit:{...orbit},distance:camera.position.distanceTo(cameraTarget),desiredDistance:desiredCamera.distanceTo(desiredTarget),floor:groundY(camera.position.x,camera.position.z),follow:cameraFollow,
     anchors:avatar&&object?[project(avatar.position,.2),project(avatar.position,4),project(object.position,.2),project(object.position,5.2)]:[]},
    stream:landscape?.streamingDiagnostics,
    render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},
    renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  },
  qaObserveCombat(){
   for(const [label,controller] of [['hero',hero],...actors.filter(a=>a.creature).map(a=>[a.itemId,a.controller])]){
    if(!controller||controller.qaObserved)continue;const action=controller.action;
    controller.action=function(name,duration){qaCalls.push({actor:label,name,duration,elapsed});return action.call(this,name,duration);};controller.qaObserved=true;
   }
  },
  qaCombatLook(){orbit={...orbit,yaw:0,pitch:.34,distance:24};cameraFollow=true;manualCameraAt=-Infinity;needsRender=true;},
  qaFreeze(){cancelAnimationFrame(raf);qaFrozen=true;},
  qaAdvance(count=1,dt=.25){
   if(!Number.isInteger(count)||count<1||count>8||!Number.isFinite(dt)||dt<=0||dt>.25)throw Error('Bounded private frame step required');
   cancelAnimationFrame(raf);qaFrozen=true;
   try{for(let i=0;i<count;i++){qaFrameDelta=dt;tick(last+dt*1000);cancelAnimationFrame(raf);}}finally{qaFrameDelta=null;}
  },
  qaFreezeCapture(){cancelAnimationFrame(raf);qaFrozen=true;post.render(0);return canvas.toDataURL('image/png');},
  qaResume(){if(!qaFrozen)return;qaFrozen=false;last=performance.now();raf=requestAnimationFrame(tick);},
  refreshHubSchedule:`);
}

function handler(_req,res){
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#102331}canvas{width:100%;height:100%;display:block}button{position:fixed;right:8px;bottom:8px}</style><canvas tabindex="0"></canvas><button id="guard">Garde QA</button><script type="module">
import {createWorldScene} from '/src/world/scene.js';
import {blankSave,makeEncounter} from '/src/world/rules.js';
import {cardById} from '/src/world/catalog.js';
import {realmLayout} from '/src/world/realm-layout.js';
import {startField,stepField} from '/src/world/field-combat.js';
import {combatCue} from '/src/world/combat-effects.js';
const save=blankSave();save.region='france';save.adventure.avatar.created=true;save.adventure.avatar.name='Combat privé QA';save.adventure.companionHidden=true;
save.adventure.values.france={...save.adventure.values.france,completed:true};
window.qa={ready:false,errors:[],snapshot:null,save,inputs:[],consumeInput:false,returnedInput:null,court:realmLayout('france').sites.find(s=>s.kind==='guardianCourt')};
window.game=createWorldScene(document.querySelector('canvas'),{save,onSnapshot:s=>qa.snapshot=s,onInteract:()=>{},onActivity:()=>{},onError:e=>qa.errors.push(String(e)),onLoadState:busy=>qa.ready=!busy,onCombatStep:input=>{
 qa.inputs.push(input);if(qa.consumeInput){qa.consumeInput=false;qa.returnedInput=qa.accept(input);}
}});game.setQuality('auto');
qa.begin=()=>{
 const before=qa.save,next=structuredClone(before),guardian=qa.snapshot.mapItems.find(i=>i.type==='guardian');if(!guardian)throw Error('Canonical guardian item unavailable');
 const p=game.snapshotPosition(),enemy={x:qa.court.x,z:qa.court.z};
 next.adventure.encounter={...makeEncounter(cardById[guardian.card],next,true),region:'france',focus:3,resonance:'france',resonanceCharges:1,field:startField(p,enemy)};
 next.adventure.encounter.stats.heal=0;next.adventure.encounter.field.recover=0;
 qa.save=next;game.qaObserveCombat();game.setSave(next);game.setPresentation('encounter');game.qaCombatLook();
 return qa.accept({x:0,z:0});
};
qa.accept=(input={x:0,z:0})=>{
 const before=qa.save,after=structuredClone(before),move=(p,d,s)=>({x:p.x+d.x*s,z:p.z+d.z*s});
 after.adventure.encounter=stepField(before.adventure.encounter,input,move);
 const action=after.adventure.encounter.field.last,cue=combatCue(before.adventure.encounter,after.adventure.encounter,action,after.adventure.avatar);
 qa.save=after;game.setSave(after);game.feedback('field',action,before,after);
 return {input,field:after.adventure.encounter.field,hp:after.adventure.encounter.hp,cue};
};
document.querySelector('#guard').onclick=()=>game.combatAction('guard');
</script></html>`);
}

const report={ok:false,scope:'real France guardian combat; synthetic save; private Vite diagnostics',clock:'Bounded private visual frames; accepted combat advances only through canonical stepField',physicalDeviceFpsMeasured:false,profiles:[],errors:[]};
let server,browser;
const state=page=>page.evaluate(()=>game.qaCombatState());
const advance=(page,count=1,dt=.25)=>page.evaluate(({count,dt})=>{game.qaAdvance(count,dt);return game.qaCombatState();},{count,dt});
const accept=(page,kind)=>page.evaluate(kind=>qa.accept({x:0,z:0,...(kind?{kind}:{})}),kind);
const finite=values=>values.every(Number.isFinite);
function checkCamera(s,{framed=true}={}){
 const c=s.camera;assert.ok(finite([...c.position,...c.target,...c.desired,...c.desiredTarget,c.distance,c.desiredDistance,c.floor]),'Real camera remains finite');
 assert.ok(c.orbit.distance>=10&&c.orbit.distance<=52,'Orbit zoom is bounded');
 assert.ok(c.distance>1&&c.distance<=70.25&&c.desiredDistance<=70.25,'Actual and desired combat camera remain bounded');
 assert.ok(c.position[1]>=c.floor+1.05,'Camera clears streamed ground after feedback');
 if(framed){assert.equal(c.anchors.length,4);for(const p of c.anchors)assert.ok(finite(p)&&Math.abs(p[0])<=1&&Math.abs(p[1])<=1&&p[2]>=-1&&p[2]<=1,'Hero and guardian feet/head remain in the real camera frustum');assert.ok(Math.abs(c.anchors[0][0]-c.anchors[2][0])>.08,'Automatic combat framing separates the real hero and guardian silhouettes');}
}
function checkThreat(s){
 assert.equal(s.threat.active,true);assert.equal(s.threat.remaining,s.field.windup,'Gauge follows accepted remaining time');
 assert.ok(Math.abs(s.threat.position[1]-s.threat.floor-.12)<1e-6,'Telegraph sits on streamed ground');
 assert.ok(Math.hypot(s.threat.position[0]-s.field.enemy.x,s.threat.position[2]-s.field.enemy.z)<1e-6,'Cone follows accepted enemy position');
}
function heldDistance(a,b){
 assert.equal(a.length,3);assert.equal(b.length,3);
 return Math.max(...a.map((bone,i)=>{const q=bone.quaternion,r=b[i].quaternion;assert.ok(q?.length===4&&r?.length===4&&finite([...q,...r]),'Imported preparation bones exist');const dot=Math.min(1,Math.abs(q.reduce((n,v,j)=>n+v*r[j],0)));return 2*Math.acos(dot);}));
}
async function capture(page,name){
 const uri=await page.evaluate(()=>game.qaFreezeCapture());assert.ok(uri.startsWith('data:image/png;base64,')&&uri.length>10000,'Real rendered combat canvas exported');
 const path=resolve(out,name+'.png');await writeFile(path,Buffer.from(uri.slice(uri.indexOf(',')+1),'base64'));return path;
}

try{
 server=await createServer({root:repo,logLevel:'error',server:{host:'127.0.0.1',port,strictPort:true,watch:{ignored:['**/outputs/**']}},plugins:[{name:'private-master-combat-fixture',transform(code,id){if(id.split('?')[0].replaceAll('\\','/').endsWith('/src/world/scene.js'))return injectQa(code);},configureServer(s){s.middlewares.use('/__master-combat-qa',handler);}}]});await server.listen();
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const profile of profiles){
  const result={...profile,ok:false,checks:[],captures:[]},errors=[];report.profiles.push(result);
  const context=await browser.newContext({viewport:profile.viewport,reducedMotion:profile.reducedMotion,deviceScaleFactor:1});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>4});const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-08T12:30:00']));}static now(){return new NativeDate('2026-10-08T12:30:00').getTime();}};localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:24}));localStorage.setItem('3b-world-camera-follow','true');});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   console.log(profile.name+': loading real scene');await page.goto('http://127.0.0.1:'+port+'/__master-combat-qa',{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>qa.ready&&game.qaCombatState().ready&&qa.snapshot?.drawCalls>0,undefined,{timeout:180000,polling:400});
   assert.equal(await page.evaluate(()=>{game.skipCinematic();return game.relocateRealm({region:'france',x:qa.court.x,z:qa.court.z+6});}),true);
   await page.waitForFunction(()=>{const s=game.qaCombatState();return s.stream?.pendingSectors===0&&qa.snapshot?.guardians.some(g=>g.ready);},undefined,{timeout:120000,polling:400});
   console.log(profile.name+': canonical windup, held pose and pause');
   const beginning=await page.evaluate(()=>{game.qaFreeze();return qa.begin();});assert.equal(beginning.field.phase,'windup');
   const prepared=await advance(page,5);assert.equal(prepared.guardian?.animation,'GuardianAnticipation');assert.equal(prepared.reducedMotion,profile.reducedMotion==='reduce');checkThreat(prepared);checkCamera(prepared);
   result.renderer=prepared.renderer;result.prepared=prepared;result.captures.push(await capture(page,profile.name+'-windup'));
   const held=await advance(page,4);assert.equal(held.field.time,prepared.field.time,'Render clock never advances accepted combat');assert.equal(held.guardian.animation,'GuardianAnticipation');
   assert.ok(heldDistance(prepared.guardian.bones,held.guardian.bones)<.025,'Preparation keeps its physical pose after clip end');assert.equal(held.threat.progress,prepared.threat.progress);
   await page.evaluate(()=>game.setPaused(true));const paused=await advance(page,4);
   assert.equal(paused.paused,true);assert.equal(paused.field.time,held.field.time);assert.equal(paused.guardian.animation,'GuardianAnticipation');assert.ok(heldDistance(held.guardian.bones,paused.guardian.bones)<.025);assert.equal(paused.threat.progress,held.threat.progress);checkThreat(paused);checkCamera(paused);
   await page.evaluate(()=>game.setPaused(false));result.checks.push('held physical windup and frozen accepted gauge through long render time and pause');
   console.log(profile.name+': accepted resonance, defense and immediate release');
   await accept(page);await accept(page);const shortened=await advance(page,1),extension=await accept(page,'resonance');
   assert.equal(extension.field.windup,shortened.field.windup+250,'Canonical France resonance adds 350 ms after the 100 ms combat step');
   const extended=await advance(page,1);assert.equal(extended.guardian.animation,'GuardianAnticipation');assert.ok(heldDistance(held.guardian.bones,extended.guardian.bones)<.025);checkThreat(extended);assert.ok(extended.threat.progress<shortened.threat.progress,'Gauge follows accepted extension');result.extension={before:shortened.field,after:extension.field,gauge:extended.threat};result.checks.push('France resonance extends the same held preparation');
   for(let i=0;i<6;i++)await accept(page);const guard=await accept(page,'guard');assert.equal(guard.field.last,'guard');
   let released;for(let i=0;i<8;i++){released=await accept(page);if(released.field.phase==='recovery')break;}
   assert.equal(released.field.phase,'recovery');assert.equal(released.field.last,'enemy');assert.equal(released.cue?.blocked,true);assert.ok(released.cue.incoming>0,'This defense absorbs a real partial impact');
   const immediate=await state(page);assert.equal(immediate.guardian.animation,'GuardianAttack','Accepted release plays synchronously, before any render tick');
   assert.equal(immediate.actions.filter(a=>a.actor==='hero'&&a.name==='Hit').length,0,'A blocked impact does not invent a Hero Hit animation');
   assert.equal(immediate.actions.filter(a=>a.actor===immediate.guardian.id&&a.name==='GuardianAttack').length,1,'One accepted enemy release dispatches exactly one attack');
   await page.evaluate(()=>{qa.consumeInput=true;});await page.locator('#guard').click();const returned=await advance(page,1,.01),acceptedInput=await page.evaluate(()=>qa.returnedInput);
   assert.equal(acceptedInput?.input.kind,'guard','Real scene combat input callback accepted the returned guard');assert.equal(acceptedInput.field.last,'guard');
   assert.equal(returned.guardian.animation,'GuardianAttack','Immediate following player feedback does not erase the enemy release');assert.equal(returned.threat.active,false);checkCamera(returned);
   assert.equal(returned.actions.filter(a=>a.actor==='hero'&&a.name==='Hit').length,0);result.release={accepted:released,immediate,returnedInput:acceptedInput,afterPlayerInput:returned};result.captures.push(await capture(page,profile.name+'-release'));result.checks.push('synchronous single release survives actual returned player input; no fake Hit on defense');
   const releasedPose=await advance(page,1,.18);assert.equal(releasedPose.guardian.animation,'GuardianAttack');assert.ok(heldDistance(extended.guardian.bones,releasedPose.guardian.bones)>.04,'Release changes the imported physical arm pose');checkCamera(releasedPose);
   console.log(profile.name+': camera clearance and bounded native zoom');
   await page.locator('canvas').hover();await page.mouse.wheel(0,200000);await page.waitForFunction(()=>game.qaCombatState().camera.orbit.distance===52,undefined,{timeout:10000,polling:100});const far=await advance(page,5);checkCamera(far,{framed:false});
   await page.mouse.wheel(0,-200000);await page.waitForFunction(()=>game.qaCombatState().camera.orbit.distance===10,undefined,{timeout:10000,polling:100});const near=await advance(page,5);checkCamera(near,{framed:false});result.cameraBounds={far:far.camera,near:near.camera};result.captures.push(await capture(page,profile.name+'-camera-near'));result.checks.push('native wheel reaches both bounded zoom limits; manual camera remains finite and above terrain');
   const fixtureErrors=await page.evaluate(()=>qa.errors);assert.deepEqual([...errors,...fixtureErrors],[],'No script, shader or asset errors');
   const balances=await page.evaluate(()=>({xp:qa.save.xp,shards:qa.save.shards,wins:qa.save.wins,seals:qa.save.seals}));assert.deepEqual(balances,{xp:0,shards:25,wins:0,seals:[]},'Synthetic combat does not create rewards');result.balances=balances;result.render=near.render;result.ok=true;console.log(profile.name+': PASS');
  }catch(error){result.error=error.message;result.errors=errors;result.lastState=await state(page).catch(e=>({error:String(e)}));report.errors.push(profile.name+': '+error.message);console.error(profile.name+': FAIL '+error.message);result.captures.push(await capture(page,profile.name+'-failure').catch(()=>null));}
  await page.evaluate(()=>game?.destroy()).catch(()=>{});await context.close();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
 }
 report.ok=report.profiles.length===profiles.length&&report.profiles.every(p=>p.ok);assert.equal(report.ok,true,'Every selected real combat profile must pass');
}finally{await browser?.close();await server?.close();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));}
console.log('MASTER_COMBAT_OK '+JSON.stringify({profiles:report.profiles.map(p=>p.name),physicalDeviceFpsMeasured:false,out}));
