// Browser acceptance uses Chromium's generated camera, synthetic sensor events and
// a synthetic member. It does not certify tracking on a physical phone or make
// calls to a real member's economic services. Native XR is covered by unit tests.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {INVISIBLE_EPISODES} from '../src/world/invisible/catalog.js';

const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(modulePath)?pathToFileURL(modulePath).href:modulePath);
const external=process.env.INVISIBLE_TEST_URL;
const server=external?null:await createServer({server:{host:'127.0.0.1',port:5295,strictPort:true}});
if(server)await server.listen();
const origin=external||'http://127.0.0.1:5295';
const out=process.env.INVISIBLE_CAMERA_OUT||'work/invisible-camera';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const uid='11111111-1111-4111-8111-111111111111';
const profile={user_id:uid,name:'Voyageur de validation',handle:'qa_camera',country:'France',xp:1800,points:100,passport_state:'active',passport_public_id:'22222222-2222-4222-8222-222222222222',passport_version:1,theme:'heir',created_at:'2026-01-01T00:00:00Z'};
const results=[];
async function check(name,action){const started=Date.now();try{const details=await action();results.push({name,passed:true,elapsedMs:Date.now()-started,...(details?{details}:{})});return details;}catch(error){results.push({name,passed:false,elapsedMs:Date.now()-started,error:error.message});throw error;}}
const sensors=page=>page.evaluate(()=>({calls:window.__cameraTest.calls,produced:window.__cameraTest.produced,stopped:window.__cameraTest.stopped,active:window.__cameraTest.tracks.filter(track=>track.readyState==='live').length,orientationRequests:window.__cameraTest.orientationRequests,orientationListeners:window.__cameraTest.orientationListeners.size,pendingReady:!!window.__cameraTest.release}));
const localProgress=page=>page.evaluate(uid=>JSON.stringify(JSON.parse(localStorage.getItem('3b_world_v1_'+uid)).data.invisible),uid);
async function activeCamera(page){await page.waitForFunction(()=>document.querySelector('[data-testid="lens-experience"]')?.dataset.mode==='camera'&&document.querySelector('.lens-camera')?.readyState>=2);}
async function activateMotion(page){await page.getByTestId('lens-orientation').click();await page.waitForFunction(()=>window.__cameraTest.orientationListeners.size===1);await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:15,beta:88,gamma:0})));await page.waitForFunction(()=>document.querySelector('[data-testid="lens-orientation"]')?.getAttribute('aria-pressed')==='true');}
async function readyLens(page){await page.getByTestId('open-invisible-lens').click();const lens=page.getByTestId('lens-experience');await lens.waitFor();await page.waitForFunction(()=>{const button=document.querySelector('[data-testid="lens-camera-toggle"]'),canvas=document.querySelector('.lens-canvas canvas');return button&&!button.disabled&&canvas?.width>100&&canvas?.height>100;});return lens;}
async function fullViewport(page){return page.getByTestId('lens-experience').evaluate(lens=>{
 const stage=lens.querySelector('.lens-stage').getBoundingClientRect(),canvas=lens.querySelector('.lens-canvas canvas'),bounds=canvas.getBoundingClientRect();
 const controls=[...lens.querySelectorAll('button')].filter(el=>el.offsetWidth&&el.offsetHeight).map(el=>{const r=el.getBoundingClientRect();return{id:el.dataset.testid,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
 return{stage:stage.toJSON(),canvas:bounds.toJSON(),renderWidth:canvas.width,renderHeight:canvas.height,viewport:{width:innerWidth,height:innerHeight},scrollHeight:lens.scrollHeight,clientHeight:lens.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls};
});}
function assertFullscreen(layout){assert.ok(layout.stage.height>=layout.viewport.height*.9,'The world fills at least 90% of the phone height');assert.ok(layout.stage.width>=layout.viewport.width*.95,'The world uses the screen width');assert.equal(layout.overflow,false,'No horizontal page overflow');assert.ok(layout.scrollHeight<=layout.clientHeight+2,'The main camera view does not need a long scroll');assert.ok(layout.renderWidth/layout.canvas.width<=2.05&&layout.renderHeight/layout.canvas.height<=2.05,'High-DPI phones keep a bounded render resolution');for(const item of layout.controls){assert.ok(item.top>=-1&&item.bottom<=layout.viewport.height+1&&item.left>=-1&&item.right<=layout.viewport.width+1,'Visible control stays in the viewport: '+item.id);assert.ok(item.height>=39,'Visible control has a usable touch height: '+item.id);}}
async function compositePixels(page){
 // Compare the composed screenshot with the decoded, local camera frame. A
 // mixture of similar and different pixels demonstrates a visible real feed
 // plus rendered overlays. This is an operational check, not an art score.
 const feed=await page.locator('.lens-camera').evaluate(video=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const context=canvas.getContext('2d'),scale=Math.max(video.clientWidth/video.videoWidth,video.clientHeight/video.videoHeight),width=video.clientWidth/scale,height=video.clientHeight/scale;context.drawImage(video,(video.videoWidth-width)/2,(video.videoHeight-height)/2,width,height,0,0,80,60);return Array.from(context.getImageData(0,0,80,60).data);});
 const png=Array.from(await page.locator('.lens-canvas canvas').screenshot());
 const comparison=await page.evaluate(async({png,feed})=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(png)],{type:'image/png'})),sample=document.createElement('canvas');sample.width=80;sample.height=60;const ctx=sample.getContext('2d');ctx.drawImage(bitmap,0,0,80,60);bitmap.close();const data=ctx.getImageData(0,0,80,60).data;let similar=0,different=0;for(let y=1;y<48;y++)for(let x=1;x<79;x++){const i=(y*80+x)*4,distance=Math.max(...[0,1,2].map(offset=>Math.abs(data[i+offset]-feed[i+offset])));if(distance<35)similar++;if(distance>55)different++;}return{similar,different,sampled:47*78};},{png,feed});
 assert.ok(comparison.similar>comparison.sampled*.1,'The transparent 3D layer leaves camera pixels visible: '+JSON.stringify(comparison));assert.ok(comparison.different>comparison.sampled*.04,'Visible world elements are composited over the camera: '+JSON.stringify(comparison));return comparison;
}

let failure;
try{
 for(const configuration of [{name:'mobile',viewport:{width:390,height:844},deviceScaleFactor:3},{name:'landscape',viewport:{width:844,height:390},deviceScaleFactor:2},{name:'desktop',viewport:{width:1440,height:900},deviceScaleFactor:1}]){
  const {name,viewport,deviceScaleFactor}=configuration,errors=[],state={data:blankSave(),sequences:new Map(),revision:0,serviceActions:[]};
  const context=await browser.newContext({viewport,deviceScaleFactor,reducedMotion:'reduce',permissions:['camera'],isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  await context.addInitScript(({uid})=>{
   const fixture=window.__cameraTest={mode:'accept',calls:0,produced:0,stopped:0,tracks:[],orientationMode:'granted',orientationRequests:0,orientationListeners:new Set(),release:null};
   const getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async options=>{
    fixture.calls++;fixture.lastConstraints=JSON.parse(JSON.stringify(options));
    if(fixture.mode==='deny')throw new DOMException('Fixture permission refusal','NotAllowedError');
    const stream=await getUserMedia(options);fixture.produced++;
    for(const track of stream.getTracks()){fixture.tracks.push(track);const stop=track.stop.bind(track);let stopped=false;track.stop=()=>{if(!stopped){fixture.stopped++;stopped=true;}stop();};}
    if(fixture.mode==='defer')await new Promise(resolve=>{fixture.release=()=>{fixture.release=null;resolve();};});
    return stream;
   };
   const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
   window.addEventListener=(type,listener,options)=>{if(type==='deviceorientation')fixture.orientationListeners.add(listener);return add(type,listener,options);};
   window.removeEventListener=(type,listener,options)=>{if(type==='deviceorientation')fixture.orientationListeners.delete(listener);return remove(type,listener,options);};
   if(window.DeviceOrientationEvent)Object.defineProperty(window.DeviceOrientationEvent,'requestPermission',{configurable:true,value:async()=>{fixture.orientationRequests++;return fixture.orientationMode;}});
   const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})),'synthetic-camera-test'].join('.');
   localStorage.setItem('3b_member_auth_v1',JSON.stringify({access_token:token,refresh_token:'synthetic-camera-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'camera@example.invalid'}}));
   localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));
  },{uid});
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',async route=>{
   const pathname=new URL(route.request().url()).pathname,json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(pathname.endsWith('/member-api'))return json({profile,events:[],inventory:[],entitlements:[],identity_claims_complete:true});
   if(pathname.endsWith('/world-engine')){const body=route.request().postDataJSON();let sequence=state.sequences.get(body.device)||0;const rejected=[];for(const item of body.commands){if(item.seq<=sequence)continue;assert.equal(item.seq,sequence+1);try{state.data=applyWorldAction(state.data,item.action);}catch(error){rejected.push({seq:item.seq,message:error.message});}sequence=item.seq;}state.sequences.set(body.device,sequence);state.revision++;return json({data:state.data,sequence,revision:state.revision,rejected,legacy:false});}
   if(pathname.endsWith('/invisible-guardian')){state.serviceActions.push(route.request().postDataJSON().action);return json({error:'No gameplay service is required by visual exploration.'},503);}
   if(pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return json({error:'Service not enabled in this test.'},503);
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin+'/#monde-invisible',{waitUntil:'domcontentloaded'});await page.getByTestId('open-invisible-lens').waitFor({timeout:60000});
   await page.waitForFunction(()=>!document.querySelector('[data-testid="open-invisible-lens"]')?.disabled);
   const before=await localProgress(page);let lens;
   await check(name+': opening requires no camera or motion permission',async()=>{lens=await readyLens(page);assert.equal((await sensors(page)).calls,0);assert.equal((await sensors(page)).orientationRequests,0);assert.equal(await lens.getByTestId('lens-camera-toggle').isVisible(),true);assert.equal(await lens.locator('.lens-sidebar').count(),0);});
   await check(name+': full-screen world has no endless scroll',async()=>{const layout=await fullViewport(page);assertFullscreen(layout);await lens.screenshot({path:path.join(out,name+'-world.png')});return layout;});
   await check(name+': denied camera keeps the world usable',async()=>{await page.evaluate(()=>{window.__cameraTest.mode='deny';});await page.getByTestId('lens-camera-toggle').click();await page.getByText('Caméra refusée ou indisponible. La visite reste entièrement jouable en 3D.',{exact:true}).waitFor();assert.equal(await lens.getAttribute('data-mode'),'3d');assert.equal((await sensors(page)).active,0);});
   await check(name+': generated native camera and visible world are composited',async()=>{await page.evaluate(()=>{window.__cameraTest.mode='accept';});await page.getByTestId('lens-camera-toggle').click();await activeCamera(page);assert.equal((await sensors(page)).active,1);const constraints=await page.evaluate(()=>window.__cameraTest.lastConstraints);assert.equal(constraints.audio,false);const comparison=await compositePixels(page);assertFullscreen(await fullViewport(page));await lens.screenshot({path:path.join(out,name+'-camera.png')});return comparison;});
   await check(name+': motion permission is explicit and reversible',async()=>{assert.equal((await sensors(page)).orientationRequests,0);await activateMotion(page);assert.equal((await sensors(page)).orientationRequests,1);assert.equal((await sensors(page)).orientationListeners,1);await page.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:50,beta:91,gamma:3})));await page.getByTestId('lens-orientation').click();assert.equal((await sensors(page)).orientationListeners,0);});
   await check(name+': inspecting 3D objects leaves mysteries and rewards unchanged',async()=>{await page.getByTestId('lens-open-objects').click();await page.getByTestId('lens-object-guardian-guardian').click();await lens.getByRole('heading',{name:INVISIBLE_EPISODES[0].guardian,exact:true}).waitFor();assert.equal(await page.getByTestId('lens-close-sheet').count(),0,'Objects list closes when an object is inspected');assert.equal(await localProgress(page),before);assert.deepEqual(state.serviceActions,[]);});
   await check(name+': a camera device interruption releases the visible stream',async()=>{const stopped=(await sensors(page)).stopped;await page.evaluate(()=>window.__cameraTest.tracks.find(track=>track.readyState==='live').dispatchEvent(new Event('ended')));await page.waitForFunction(()=>document.querySelector('[data-testid="lens-experience"]')?.dataset.mode==='3d');assert.equal((await sensors(page)).active,0);assert.equal((await sensors(page)).stopped,stopped+1);await page.getByTestId('lens-camera-toggle').click();await activeCamera(page);});
   await check(name+': refused motion permission keeps touch navigation available',async()=>{await page.evaluate(()=>{window.__cameraTest.orientationMode='denied';});await page.getByTestId('lens-orientation').click();await page.waitForFunction(()=>document.querySelector('[data-testid="lens-orientation"]')?.getAttribute('aria-pressed')==='false');assert.equal((await sensors(page)).orientationListeners,0);assert.equal(await lens.getAttribute('data-mode'),'camera');await page.evaluate(()=>{window.__cameraTest.orientationMode='granted';});});
   await check(name+': background releases the camera and orientation',async()=>{await activateMotion(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__fixtureHidden===true});window.__fixtureHidden=true;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.__cameraTest.tracks.every(track=>track.readyState==='ended'));assert.equal((await sensors(page)).orientationListeners,0);await page.evaluate(()=>{window.__fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await lens.getAttribute('data-mode'),'3d');});
   await check(name+': a cancelled pending permission cannot reopen the camera',async()=>{await page.evaluate(()=>{window.__cameraTest.mode='defer';});const previous=(await sensors(page)).stopped;await page.getByTestId('lens-camera-toggle').click();await page.waitForFunction(()=>!!window.__cameraTest.release);await page.getByTestId('lens-camera-toggle').click();await page.evaluate(()=>window.__cameraTest.release());await page.waitForFunction(previous=>window.__cameraTest.stopped===previous+1,previous);assert.equal(await lens.getAttribute('data-mode'),'3d');assert.equal((await sensors(page)).active,0);});
   await check(name+': closing during camera permission disposes the late stream',async()=>{const previous=(await sensors(page)).stopped;await page.getByTestId('lens-camera-toggle').click();await page.waitForFunction(()=>!!window.__cameraTest.release);await page.getByTestId('lens-exit').click();await lens.waitFor({state:'detached'});await page.evaluate(()=>window.__cameraTest.release());await page.waitForFunction(previous=>window.__cameraTest.stopped===previous+1,previous);assert.equal((await sensors(page)).active,0);assert.equal((await sensors(page)).orientationListeners,0);});
   await check(name+': reopen needs another explicit camera gesture',async()=>{const calls=(await sensors(page)).calls;lens=await readyLens(page);assert.equal((await sensors(page)).calls,calls);await page.evaluate(()=>{window.__cameraTest.mode='accept';});await page.getByTestId('lens-camera-toggle').click();await activeCamera(page);await page.getByTestId('lens-3d').click();assert.equal((await sensors(page)).active,0);await page.getByTestId('lens-exit').click();});
   if(name==='mobile'){
    for(const episode of INVISIBLE_EPISODES.slice(1))await check(name+': '+episode.realm+' world and camera load without solving secrets',async()=>{await page.getByTestId('invisible-nav-realms').click();await page.getByTestId('episode-'+episode.realm).click();const snapshot=await localProgress(page);lens=await readyLens(page);assert.equal(await lens.getByRole('heading',{name:episode.city,exact:true}).count(),1);await page.getByTestId('lens-camera-toggle').click();await activeCamera(page);const pixels=await compositePixels(page);assertFullscreen(await fullViewport(page));await lens.screenshot({path:path.join(out,'realm-'+episode.realm+'-camera.png')});await page.getByTestId('lens-exit').click();assert.equal((await sensors(page)).active,0);assert.equal(await localProgress(page),snapshot);return pixels;});
   }
   await check(name+': visual exploration keeps economic and remote services untouched',async()=>{assert.equal(state.data.invisible.solved.length,0);assert.equal(state.data.invisible.chestOpened,false);assert.equal(state.data.invisible.portalOpened,false);assert.deepEqual(state.serviceActions,[]);assert.deepEqual(errors,[]);return await sensors(page);});
  }catch(error){await page.screenshot({path:path.join(out,name+'-failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}
 }
}catch(error){failure=error;}finally{
 const report={origin,generatedAt:new Date().toISOString(),passed:!failure,checks:results.length,results,fixture:{camera:'Chromium generated native MediaStream, not a physical camera',orientation:'Synthetic permission and DeviceOrientationEvent',xr:'Native session/hit-test lifecycle belongs to unit acceptance; no physical phone tracking is claimed',member:'Synthetic member and local authoritative reducer'}};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();if(server)await server.close();
}
if(failure)throw failure;
