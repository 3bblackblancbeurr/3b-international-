// Acceptance uses synthetic members and a local authoritative reducer. No production account is changed.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {INVISIBLE_EPISODE,INVISIBLE_EPISODES} from '../src/world/invisible/catalog.js';
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(modulePath)?pathToFileURL(modulePath).href:modulePath);
const external=process.env.INVISIBLE_TEST_URL;
const server=external?null:await createServer({server:{host:'127.0.0.1',port:5294,strictPort:true}});
if(server)await server.listen();
const origin=external||'http://127.0.0.1:5294';
const out=process.env.INVISIBLE_TEST_OUT||'work/invisible-browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
const uid='11111111-1111-4111-8111-111111111111';
const profile={user_id:uid,name:'Voyageur de validation',handle:'qa_invisible',country:'France',xp:1800,points:100,passport_state:'active',passport_public_id:'22222222-2222-4222-8222-222222222222',passport_version:1,theme:'heir',created_at:'2026-01-01T00:00:00Z'};
const saved=page=>page.evaluate(uid=>JSON.parse(localStorage.getItem('3b_world_v1_'+uid)).data,uid);
async function noOverflow(page,stage){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow: '+stage);
}
async function objective(page,stage){
 const panel=page.getByTestId('invisible-current-objective');await panel.waitFor();
 await page.waitForFunction(stage=>document.querySelector('[data-testid="invisible-current-objective"]')?.dataset.stage===stage,stage,{timeout:60000});
 const id={start:'invisible-start',riddle:'riddle-submit',chest:'chest-open',portal:'portal-open',next:'invisible-objective-action',finale:'convergence-submit',complete:'invisible-objective-action'}[stage];
 const action=panel.getByTestId(id);await action.waitFor();
 assert.equal(await action.count(),1,'The current objective has one primary action');
 if(!['riddle','finale'].includes(stage))await page.waitForFunction(id=>document.querySelector('[data-testid="'+id+'"]')?.disabled===false,id);
 return action;
}
async function playableInViewport(button){
 assert.equal(await button.evaluate(el=>{const r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&el.contains(document.elementFromPoint(x,y));}),true,'The active action is visible and unobstructed, including by the bottom navigation');
}
const views=['adventure','realms','journal','missions'];
async function expectView(page,view){
 await page.getByTestId('invisible-view-'+view).waitFor();
 for(const other of views.filter(value=>value!==view))assert.equal(await page.getByTestId('invisible-view-'+other).count(),0,'Inactive view is unmounted: '+other);
 if(view!=='missions')assert.equal(await page.locator('.invisible-cooperation').count(),0,'Collective services are mounted only in Missions');
 await noOverflow(page,'view '+view);
}
async function openView(page,view){await page.getByTestId('invisible-nav-'+view).click();await expectView(page,view);}
async function openPanel(page,kind){await page.getByTestId('invisible-open-'+kind).click();await page.getByTestId('invisible-panel-'+kind).waitFor();}
async function closePanel(page,kind){await page.getByTestId('invisible-panel-close').click();assert.equal(await page.getByTestId('invisible-panel-'+kind).count(),0,'Optional panel is unmounted after closing: '+kind);}
async function shortAdventure(page,stage){
 await expectView(page,'adventure');
 const geometry=await page.getByTestId('invisible-view-adventure').evaluate(view=>{
  const clipped=[];
  for(const control of view.querySelectorAll('button,input,textarea,summary,h1,h2,h3,p,label')){
   const rect=control.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   for(let ancestor=control.parentElement;ancestor&&view.contains(ancestor);ancestor=ancestor.parentElement){
    if(!['hidden','clip'].includes(getComputedStyle(ancestor).overflowY))continue;
    const bounds=ancestor.getBoundingClientRect();
    if(rect.top<bounds.top-3||rect.bottom>bounds.bottom+3){clipped.push({tag:control.tagName,text:control.textContent.slice(0,70)});break;}
   }
  }
  return{height:document.documentElement.scrollHeight,viewport:innerHeight,clipped};
 });
 assert.ok(geometry.height<=geometry.viewport*2.1,'Adventure remains at most about two screens: '+stage+' '+JSON.stringify(geometry));
 assert.deepEqual(geometry.clipped,[],'Short height must not be obtained by clipping content: '+stage);
 return geometry;
}
async function artLoaded(page){
 const art=page.getByTestId('invisible-adventure-art');await art.waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector('[data-testid="invisible-adventure-art"]');return img?.complete&&img.naturalWidth>0&&img.naturalHeight>0;});
 assert.ok(await art.evaluate(img=>{const r=img.getBoundingClientRect();return r.width>=100&&r.height>=100;}),'The adventure image has a visible footprint');
}
async function sceneVisible(page,lens){
 const canvas=lens.locator('.lens-canvas canvas');await canvas.waitFor();
 await page.waitForFunction(()=>{const canvas=document.querySelector('.lens-canvas canvas');return canvas?.width>100&&canvas?.height>100;});
 // Screen pixels, rather than toDataURL on a cleared WebGL buffer, detect a blank
 // render. This tests visibility; it does not score artistic quality or physical AR.
 const pixels=Array.from(await canvas.screenshot());
 const colors=await page.evaluate(async bytes=>{
  const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
  const sample=document.createElement('canvas');sample.width=80;sample.height=60;
  const ctx=sample.getContext('2d');ctx.drawImage(bitmap,0,0,80,60);bitmap.close();
  const rgba=ctx.getImageData(0,0,80,60).data,colors=new Set();let low=255,high=0;
  for(let i=0;i<rgba.length;i+=4){colors.add((rgba[i]>>4)+','+(rgba[i+1]>>4)+','+(rgba[i+2]>>4));const light=Math.round((rgba[i]+rgba[i+1]+rgba[i+2])/3);low=Math.min(low,light);high=Math.max(high,light);}
  return{count:colors.size,range:high-low};
 },pixels);
 assert.ok(colors.count>12&&colors.range>30,'The 3D scene produces varied visible pixels, not an empty canvas');
 assert.equal(await lens.locator('.lens-fallback').count(),0,'The desktop/mobile review uses the rendered scene, not its unavailable fallback');
 return colors;
}
async function solveGuidedTrace(page,point,{automaticFocus=true}={}){
 await objective(page,'riddle');
 const panel=page.getByTestId('invisible-riddle-panel');
 await panel.getByText(point.riddle.question,{exact:true}).waitFor();
 if(automaticFocus)await page.waitForFunction(()=>document.querySelector('[data-testid="riddle-answer"]')===document.activeElement);
 assert.equal(await page.getByRole('group',{name:'Propositions de réponse',exact:true}).count(),0,'Secrets offer no answer-choice buttons');
 assert.equal(await page.getByRole('button',{name:'Je débute : proposer trois réponses',exact:true}).count(),0);
 await shortAdventure(page,'question '+point.id);
 const help=panel.getByTestId('riddle-clue');
 assert.equal(await help.evaluate(el=>el.open),false,'An optional hint is not automatically opened for '+point.name);
 await help.locator('summary').click();
 await panel.getByText(point.riddle.clue,{exact:true}).waitFor();
 await page.getByTestId('riddle-answer').fill(point.riddle.answers[0]);
 await page.getByTestId('riddle-submit').scrollIntoViewIfNeeded();await playableInViewport(page.getByTestId('riddle-submit'));
 await page.getByTestId('riddle-submit').click();
 await noOverflow(page,'answer '+point.id);
}
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const label=viewport.width>500?'desktop':'mobile',errors=[],state={data:blankSave(),sequences:new Map(),revision:0,rewardIntents:new Map(),serviceActions:[],contributedRealm:null,seasonRealm:null,peerRealms:[],seasonPeerRealms:[],collectiveSolved:false,seasonSolved:false};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(({uid})=>{
   window.__invisibleSensors={gps:0,camera:0,stopped:0};window.__cameraAllowed=false;
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition(_ok,fail){window.__invisibleSensors.gps++;setTimeout(()=>fail({code:1}),0);return 10;},clearWatch(){}}});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia(){window.__invisibleSensors.camera++;if(!window.__cameraAllowed)return Promise.reject(new DOMException('Denied in fixture','NotAllowedError'));const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillStyle='rgb(44,68,80)';ctx.fillRect(0,0,640,480);ctx.fillStyle='rgb(96,113,124)';ctx.fillRect(0,320,640,160);ctx.fillStyle='rgb(183,210,221)';ctx.fillRect(75,50,150,160);const stream=canvas.captureStream(5);stream.getTracks().forEach(track=>{const stop=track.stop.bind(track);let stopped=false;track.stop=()=>{if(!stopped){window.__invisibleSensors.stopped++;stopped=true;}stop();};});return Promise.resolve(stream);}}});
   const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})),'synthetic-test'].join('.');
   localStorage.setItem('3b_member_auth_v1',JSON.stringify({access_token:token,refresh_token:'synthetic-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'qa@example.invalid'}}));
   localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));
   localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));
  },{uid});
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(pathname.endsWith('/member-api'))return json({profile,events:[],inventory:[],entitlements:[],identity_claims_complete:true});
   if(pathname.endsWith('/world-engine')){
    const body=route.request().postDataJSON();let sequence=state.sequences.get(body.device)||0;const rejected=[];
    for(const item of body.commands){if(item.seq<=sequence)continue;assert.equal(item.seq,sequence+1);try{const previous=state.data;state.data=applyWorldAction(previous,item.action);for(const intent of worldGlobalRewardIntents(previous,state.data,item.action)){const key=intent.rewardCode+':'+intent.eventId;assert.ok(!state.rewardIntents.has(key),'The browser journey must not emit a second economic reward for the same accomplishment');state.rewardIntents.set(key,intent);}}catch(e){if(e.code==='ERR_ASSERTION')throw e;rejected.push({seq:item.seq,message:e.message});}sequence=item.seq;}
    state.sequences.set(body.device,sequence);state.revision++;
    return json({data:state.data,sequence,revision:state.revision,rejected,legacy:false});
   }
   if(pathname.endsWith('/invisible-guardian')){
    const body=route.request().postDataJSON();
    state.serviceActions.push(body.action);
    if(body.action==='capabilities')return json({aiConfigured:false,reason:'disabled',mode:'narrative'});
    if(body.action==='dialog')return json({error:'Service de validation hors ligne.'},503);
    const seasonal=['eventsSnapshot','contributeEvent','solveEvent'].includes(body.action),own=seasonal?'seasonRealm':'contributedRealm',solved=seasonal?'seasonSolved':'collectiveSolved';
    if(['contribute','contributeEvent'].includes(body.action)){
     if(!state.data.invisible.chestOpened)return json({error:'Fragment non synchronisé.'},409);
     if(state[own]&&state[own]!==body.realm)return json({error:'Affinité déjà liée.'},409);
     state[own]=body.realm;
    }
    const realms=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'],peers=seasonal?state.seasonPeerRealms:state.peerRealms,represented=new Set([...peers,...(state[own]?[state[own]]:[])]),covered=represented.size,word=seasonal?'ENSEMBLE':'TRANSMET';
    if(['solveCollective','solveEvent'].includes(body.action)){if(covered!==8||!state[own])return json({error:'Cercle incomplet.'},409);if(body.answer.toUpperCase()!==word)return json({error:'Mot incorrect.'},400);state[solved]=true;}
    return json({mission:'eight-echoes-001',...(seasonal?{event:body.event||'echoes-autumn-2026',title:'La saison du Lien',startsAt:'2026-10-09T00:00:00Z',endsAt:'2026-12-01T00:00:00Z',phase:state.seasonSolved?'complete':'open',participationOpen:true,completedAt:state.seasonSolved?new Date().toISOString():null,calendar:[{event:'echoes-autumn-2026',title:'La saison du Lien',phase:'open'}]}:{}),realms:realms.map(realm=>({realm,contributors:represented.has(realm)?1:0})),covered,required:8,awakened:covered===8,contributedRealm:state[own],eligible:state.data.invisible.chestOpened,contributors:covered,puzzle:{letters:realms.map((realm,i)=>({realm,position:i+1,symbol:represented.has(realm)?word[i]:null})),clue:'Réunis les huit lettres dans cet ordre.',unlocked:covered===8,solved:state[solved],solvedAt:state[solved]?new Date().toISOString():null}});
   }
   if(pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return json({error:'Service non activé dans ce test.'},503);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',request=>{if(request.resourceType()==='image')errors.push('Image not loaded: '+request.url());});
  try{
   await page.goto(origin+'/#monde-invisible',{waitUntil:'domcontentloaded'});
   await page.getByTestId('invisible-start').waitFor({timeout:60000});
   const firstAction=await objective(page,'start'),layout=[];
   await expectView(page,'adventure');await playableInViewport(firstAction);await artLoaded(page);
   layout.push({stage:'start',...await shortAdventure(page,'start')});
   for(const kind of ['settings','help','guardian','map'])assert.equal(await page.getByTestId('invisible-panel-'+kind).count(),0,'Optional panel is initially unmounted: '+kind);
   assert.deepEqual(state.serviceActions,[],'Adventure does not contact Guardian or collective services before opt-in');
   assert.deepEqual(await page.evaluate(()=>window.__invisibleSensors),{gps:0,camera:0,stopped:0},'Sensors need an explicit gesture');
   await page.screenshot({path:path.join(out,label+'-initial.png'),fullPage:true});
   await page.screenshot({path:path.join(out,label+'-overview.png')});
   // The global menu is short and exposes the Invisible route in its game category.
   await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
   const menu=page.locator('#universe-menu');await menu.waitFor();
   await menu.getByRole('tab',{name:'Monde et jeux',exact:true}).click();
   assert.equal(await menu.getByRole('tabpanel').count(),1,'One global menu category is shown at a time');
   assert.equal(await menu.locator('[data-menu-id="invisible"]').getAttribute('aria-current'),'page');
   await page.screenshot({path:path.join(out,label+'-global-menu.png')});
   await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
   await openPanel(page,'help');
   await page.getByTestId('invisible-panel-help').getByText('Résous trois énigmes.',{exact:true}).waitFor();
   assert.equal(await page.getByRole('group',{name:'Propositions de réponse',exact:true}).count(),0);
   await page.getByTestId('invisible-panel-close').focus();await page.keyboard.press('/');
   assert.equal(await menu.isVisible(),false,'The global menu shortcut does not stack a second dialog over optional help');
   await closePanel(page,'help');
   // Successful video is a generated canvas stream, never a real camera or stored photo.
   await page.getByTestId('open-invisible-lens').click();
   const lens=page.getByTestId('lens-experience');await lens.waitFor();
   const scenePixels=await sceneVisible(page,lens);
   await page.getByTestId('lens-return-adventure').waitFor();
   await page.getByTestId('lens-object-guardian-guardian').click();
   await lens.getByRole('heading',{name:INVISIBLE_EPISODE.guardian,exact:true}).waitFor();
   await page.getByTestId('lens-object-clue-rive').click();
   await page.getByTestId('lens-camera-toggle').click();
   await page.getByText('Caméra refusée ou indisponible. La visite reste entièrement jouable en 3D.',{exact:true}).waitFor();
   await page.evaluate(()=>{window.__cameraAllowed=true;});await page.getByTestId('lens-camera-toggle').click();
   await page.waitForFunction(()=>document.querySelector('[data-testid="lens-experience"]')?.dataset.mode==='camera');
   await lens.screenshot({path:path.join(out,label+'-lens-camera.png')});
   await page.getByTestId('lens-3d').click();assert.equal(await page.evaluate(()=>window.__invisibleSensors.stopped),1);
   await page.getByTestId('lens-camera-toggle').click();await page.waitForFunction(()=>document.querySelector('[data-testid="lens-experience"]')?.dataset.mode==='camera');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__testHidden===true});window.__testHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
   assert.equal(await page.evaluate(()=>window.__invisibleSensors.stopped),2);
   await page.evaluate(()=>{window.__testHidden=false;document.dispatchEvent(new Event('visibilitychange'));window.__cameraAllowed=false;});
   await page.getByTestId('lens-recenter').click();await lens.getByRole('button',{name:'L’assemblée',exact:true}).click();
   await lens.screenshot({path:path.join(out,label+'-lens-3d.png')});
   await noOverflow(page,'visual exploration');
   await page.getByTestId('lens-return-adventure').click();assert.equal(await lens.count(),0);
   await objective(page,'start');
   assert.equal(state.data.invisible.solved.length,0,'Inspection grants no puzzle completion');
   assert.equal(state.rewardIntents.size,0,'Inspection and camera grant no economic reward');
   assert.deepEqual(state.serviceActions,[],'Help, menu and visual exploration do not contact gameplay services');
   await openPanel(page,'settings');
   assert.equal(await page.getByTestId('mode-remote').getAttribute('aria-pressed'),'true');
   await page.getByTestId('mode-walk').click();
   await page.getByRole('button',{name:'Demander un repère GPS',exact:true}).click();
   await page.getByText('Autorisation refusée. Tu peux continuer sans GPS.',{exact:true}).waitFor();
   await page.getByTestId('mode-remote').click();
   await page.getByTestId('invisible-memory-consent').check();await closePanel(page,'settings');
   await (await objective(page,'start')).click();await objective(page,'riddle');
   const question=page.getByTestId('invisible-riddle-panel');
   await question.getByText(INVISIBLE_EPISODE.points[0].riddle.question,{exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelector('[data-testid="riddle-answer"]')===document.activeElement);
   assert.equal(await page.getByTestId('riddle-submit').isEnabled(),false,'An empty typed response cannot be submitted');
   assert.equal(await page.getByTestId('riddle-clue').evaluate(el=>el.open),false);
   layout.push({stage:'question',...await shortAdventure(page,'first blank question')});
   const skipLink=await page.locator('.skip-link').evaluate(el=>({bounds:el.getBoundingClientRect().toJSON(),focused:el===document.activeElement}));
   assert.ok(skipLink.bounds.bottom<=0&&!skipLink.focused,'The unfocused skip link remains outside the visible quiz viewport');
   await page.screenshot({path:path.join(out,label+'-quiz-viewport.png')});
   await page.screenshot({path:path.join(out,label+'-quiz-blank.png'),fullPage:true});
   const draft='brouillon conservé';
   await page.getByTestId('riddle-answer').fill(draft);
   await openView(page,'realms');await page.screenshot({path:path.join(out,label+'-realms.png'),fullPage:true});
   assert.equal(new URL(page.url()).searchParams.get('invisibleView'),'realms');
   await openView(page,'journal');await page.screenshot({path:path.join(out,label+'-journal.png'),fullPage:true});
   await page.goBack();await expectView(page,'realms');
   await page.goBack();await expectView(page,'adventure');assert.equal(await page.getByTestId('riddle-answer').inputValue(),draft);
   await page.goForward();await expectView(page,'realms');
   await page.goForward();await expectView(page,'journal');
   await openView(page,'adventure');
   assert.equal(await page.getByTestId('riddle-answer').inputValue(),draft,'View navigation and history preserve the unsent answer');
   await page.waitForFunction(()=>document.querySelector('[data-testid="riddle-answer"]')===document.activeElement);
   await openPanel(page,'map');await page.getByTestId('point-rive').click();await closePanel(page,'map');
   assert.equal(await page.getByTestId('riddle-answer').inputValue(),draft,'Optional map inspection preserves the answer');
   assert.equal(await page.getByTestId('riddle-clue').evaluate(el=>el.open),false,'Map inspection does not reveal the current hint');
   assert.deepEqual(state.serviceActions,[],'Realm, journal, settings and map views do not mount remote service panels');
   await openView(page,'journal');await openPanel(page,'settings');await page.goBack();await expectView(page,'adventure');
   assert.equal(await page.getByTestId('invisible-panel-settings').count(),0,'Browser Back closes an optional panel before restoring Adventure');
   await page.waitForFunction(()=>document.querySelector('[data-testid="riddle-answer"]')===document.activeElement);
   assert.equal(await page.getByTestId('riddle-answer').inputValue(),draft,'Back out of a panel preserves the current answer');
   await page.getByTestId('riddle-answer').fill('mauvaise réponse');await page.getByTestId('riddle-submit').click();
   assert.equal((await saved(page)).invisible.solved.length,0,'A wrong typed answer does not advance the journey');
   for(const point of INVISIBLE_EPISODE.points){
    await solveGuidedTrace(page,point,{automaticFocus:point.id!==INVISIBLE_EPISODE.points[0].id});
    if(point.id===INVISIBLE_EPISODE.points[0].id){
     await page.getByTestId('open-invisible-lens').click();await lens.waitFor();
     await page.getByTestId('lens-object-clue-'+point.id).click();await page.getByTestId('lens-return-adventure').click();
     await question.getByText(INVISIBLE_EPISODE.points[1].riddle.question,{exact:true}).waitFor();
     await page.waitForFunction(()=>document.querySelector('[data-testid="riddle-answer"]')===document.activeElement);
     assert.deepEqual((await saved(page)).invisible.solved,[point.id]);
     assert.equal(await page.getByTestId('riddle-clue').evaluate(el=>el.open),false,'Returning from the lens keeps the next hint closed');
    }
   }
   layout.push({stage:'chest',...await shortAdventure(page,'chest')});
   const chest=await objective(page,'chest');await playableInViewport(chest);await chest.click();
   await objective(page,'portal');layout.push({stage:'portal',...await shortAdventure(page,'portal')});
   await page.getByRole('button',{name:'Voir avec ma caméra',exact:true}).click();
   await page.getByText('Caméra refusée ou indisponible. Tu peux utiliser le portail sans caméra.',{exact:true}).waitFor();
   const portal=await objective(page,'portal');await portal.scrollIntoViewIfNeeded();await playableInViewport(portal);await portal.click();
   await objective(page,'next');layout.push({stage:'next',...await shortAdventure(page,'next')});
   await openPanel(page,'settings');await page.getByTestId('forget-memory').click();
   const local=await saved(page);
   assert.equal(local.invisible.solved.length,3);assert.equal(local.invisible.portalOpened,true);
   assert.equal(local.invisible.memoryConsent,false);assert.deepEqual(local.invisible.memory,[]);
   assert.equal(local.xp,120);assert.equal(local.shards,55);
   await page.getByTestId('invisible-sync').click();await page.getByText('Compte synchronisé',{exact:true}).waitFor();
   await closePanel(page,'settings');
   await openPanel(page,'guardian');
   await page.locator('#invisible-guardian-message').fill('Peux-tu me donner un indice ?');
   await page.getByRole('button',{name:'Envoyer',exact:true}).click();
   await page.getByText('Le Gardien répond avec le récit de l’aventure.',{exact:true}).waitFor();
   const persisted=JSON.stringify(await saved(page));
   assert.ok(!persisted.includes('Peux-tu me donner un indice ?')&&!persisted.includes('latitude')&&!persisted.includes('longitude'));
   await closePanel(page,'guardian');
   assert.ok(state.serviceActions.includes('dialog'),'Guardian is contacted only after opening its optional panel');
   assert.equal(state.serviceActions.includes('cooperationSnapshot'),false);assert.equal(state.serviceActions.includes('eventsSnapshot'),false);
   await openView(page,'missions');
   assert.equal(await page.locator('.invisible-echo-mission').count(),1,'Only the active mission is mounted');
   assert.equal(await page.locator('.invisible-events').count(),0);
   const permanent=page.locator('.invisible-echo-mission'),season=page.locator('.invisible-events');
   await permanent.getByText('0/8 affinités · 0 contributions confirmées',{exact:true}).waitFor();
   assert.equal(state.serviceActions.includes('eventsSnapshot'),false,'Season is not requested until its tab is opened');
   await page.screenshot({path:path.join(out,label+'-missions.png'),fullPage:true});
   await permanent.getByRole('button',{name:'Lier mon écho à France',exact:true}).click();
   await permanent.getByText('Ton écho est lié à France.',{exact:true}).waitFor();
   assert.equal(await permanent.getByRole('button',{name:'Valider ma finale',exact:true}).isEnabled(),false);
   // Seven synthetic peer fixtures represent seven distinct member accounts.
   state.peerRealms=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
   await page.getByRole('button',{name:'Actualiser le Cercle',exact:true}).click();
   await permanent.getByText('8/8 affinités · 8 contributions confirmées',{exact:true}).waitFor();
   await page.locator('#invisible-final-permanent').fill('TRANSMET');
   await page.getByTestId('mission-tab-season').click();
   assert.equal(await page.locator('.invisible-echo-mission').count(),1);assert.equal(await page.locator('#invisible-final-permanent').count(),0);
   await season.getByText('0/8 affinités · 0 contributions confirmées',{exact:true}).waitFor();
   await season.getByRole('button',{name:'Lier mon écho à France',exact:true}).click();
   await season.getByText('Ton écho est lié à France.',{exact:true}).waitFor();
   assert.equal(await season.getByRole('button',{name:'Valider ma finale',exact:true}).isEnabled(),false,'Permanent participation does not manufacture seasonal contributions');
   state.seasonPeerRealms=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
   await page.getByRole('button',{name:'Actualiser la saison',exact:true}).click();
   await season.getByText('8/8 affinités · 8 contributions confirmées',{exact:true}).waitFor();
   await page.locator('#invisible-final-season').fill('ENSEMBLE');
   await page.getByTestId('mission-tab-permanent').click();
   await permanent.getByText('8/8 affinités · 8 contributions confirmées',{exact:true}).waitFor();
   assert.equal(await page.locator('#invisible-final-permanent').inputValue(),'TRANSMET','Permanent draft survives switching mission tabs');
   await permanent.getByRole('button',{name:'Valider ma finale',exact:true}).click();await permanent.getByText(/Ta finale est accomplie depuis/).waitFor();
   await page.getByTestId('mission-tab-season').click();
   await season.getByText('8/8 affinités · 8 contributions confirmées',{exact:true}).waitFor();
   assert.equal(await page.locator('#invisible-final-season').inputValue(),'ENSEMBLE','Seasonal draft survives switching mission tabs');
   await season.getByRole('button',{name:'Valider ma finale',exact:true}).click();await season.getByText(/Ta finale est accomplie depuis/).waitFor();
   assert.equal(state.rewardIntents.size,1,'Collective participation and dialogue do not add economic rewards');
   await noOverflow(page,'missions');await openView(page,'journal');
   const afterOptIn=state.serviceActions.length;
   await page.reload({waitUntil:'domcontentloaded'});await page.getByTestId('invisible-page').waitFor({timeout:60000});
   await expectView(page,'journal');assert.equal(new URL(page.url()).searchParams.get('invisibleView'),'journal','Refresh preserves the selected view');
   assert.equal((await saved(page)).invisible.portalOpened,true,'Refresh preserves confirmed progression');
   assert.equal(state.serviceActions.length,afterOptIn,'Unvisited panels do not remount on journal refresh');
   await openView(page,'adventure');
   for(const episode of INVISIBLE_EPISODES.slice(1)){
    await (await objective(page,'next')).click();
    assert.equal(await page.getByTestId('invisible-page').getAttribute('data-realm'),episode.realm,'The objective chooses the next incomplete kingdom');
    await artLoaded(page);await shortAdventure(page,'start '+episode.realm);
    await (await objective(page,'start')).click();
    for(const point of episode.points)await solveGuidedTrace(page,point);
    await (await objective(page,'chest')).click();await (await objective(page,'portal')).click();
   }
   await objective(page,'finale');
   await page.waitForFunction(()=>document.querySelector('[data-testid="convergence-answer"]')===document.activeElement);
   layout.push({stage:'finale',...await shortAdventure(page,'finale')});
   await page.getByTestId('convergence-answer').fill('ENSEMBLE');await page.getByTestId('convergence-submit').click();
   await objective(page,'complete');
   const final=await saved(page);
   assert.equal(final.invisible.convergenceCompleted,true);assert.equal(Object.values(final.invisible.journeys).filter(x=>x.portalOpened).length,7);assert.equal(final.xp,1200);assert.equal(final.shards,325);
   await openView(page,'realms');await page.getByTestId('episode-france').click();await expectView(page,'adventure');
   await openPanel(page,'settings');await page.getByTestId('invisible-sync').click();await page.getByText('Compte synchronisé',{exact:true}).waitFor();await closePanel(page,'settings');
   assert.equal(state.rewardIntents.size,9,'Eight fragments and one convergence generate nine distinct economic intents');
   const rewardCodes=Array.from(state.rewardIntents.values(),intent=>intent.rewardCode).sort();
   assert.deepEqual(rewardCodes,INVISIBLE_EPISODES.map(episode=>episode.realm==='france'?'invisible_fragment':'invisible_fragment_'+episode.realm).concat('invisible_convergence').sort());
   assert.equal(state.serviceActions.length,afterOptIn,'Campaign gameplay does not mount Guardian or missions');
   await page.screenshot({path:path.join(out,label+'-complete.png'),fullPage:true});
   await page.reload({waitUntil:'domcontentloaded'});await page.getByTestId('invisible-page').waitFor({timeout:60000});
   await objective(page,'complete');layout.push({stage:'complete',...await shortAdventure(page,'complete reload')});
   assert.equal(await page.getByTestId('chest-open').count(),0,'Completed chest cannot be claimed twice');
   assert.equal(state.rewardIntents.size,9,'Reload and completed-kingdom navigation do not duplicate economic intents');
   assert.deepEqual(errors,[]);
   results.push({label,passed:true,checks:['passport-route','four-exclusive-views','first-action-visible-unobstructed','short-adventure-without-clipping','global-menu-single-category','optional-help-map-settings','history-back-forward-answer-draft','refresh-selected-view','current-question-focus','typed-24-riddles-no-answer-choices','hints-explicit-and-reset','wrong-answer-no-progress','guided-chest-portal-next-kingdom','eight-chests-portals','campaign-convergence','adventure-art-loaded','3d-visible-pixels','lens-before-riddles','resume-current-question-after-inspection','3d-inspection-no-reward','camera-refusal-success-stop-hidden','sensors-opt-in','memory-purge','guardian-opt-in-fallback','ephemeral-dialogue','missions-opt-in-single-tab','permanent-and-season-draft-retention','eight-account-collective-fixture','independent-season-fixture','inactive-panels-no-requests','nine-unique-economic-intents-no-replay','confirmed-progression-reload','no-overflow-bottom-nav-overlay'],layout,quizViewport:{...viewport,skipLink},serviceRequests:Object.fromEntries([...new Set(state.serviceActions)].map(action=>[action,state.serviceActions.filter(value=>value===action).length])),scenePixels,camera:'synthetic canvas MediaStream; no physical camera or WebXR validated',cooperation:'separate synthetic permanent/seasonal fixtures; no production account changed',accountCoins:'Browser does not credit a wallet; tests/invisible-reward-database.test.js validates real SQL amounts and lifetime limits.'});
  }catch(e){const hitTest=await page.locator('[data-testid="point-rive"]').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),p=getComputedStyle(el.parentElement);return{bounds:r.toJSON(),pointer:s.pointerEvents,transform:s.transform,z:s.zIndex,visibility:s.visibility,parentPointer:p.pointerEvents,parentZ:p.zIndex,parentTransform:p.transform,hits:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).slice(0,6).map(x=>({tag:x.tagName,class:x.className,style:getComputedStyle(x).pointerEvents}))};}).catch(()=>null);const guidance=await page.getByTestId('invisible-current-objective').evaluate(el=>({stage:el.dataset.stage,text:el.innerText,buttons:Array.from(el.querySelectorAll('button'),button=>({text:button.innerText,disabled:button.disabled,bounds:button.getBoundingClientRect().toJSON()})),focus:document.activeElement?.id,viewport:{width:innerWidth,height:innerHeight}})).catch(()=>null);await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(out,label+'-failure.txt'),await page.locator('body').innerText());results.push({label,passed:false,error:e.stack,errors,hitTest,guidance});break;}
  finally{await context.close();}
 }
}finally{await browser.close();if(server)await server.close();await writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
if(results.length!==2||results.some(r=>!r.passed))process.exitCode=1;
