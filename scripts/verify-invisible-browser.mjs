// Acceptance uses synthetic members and a local authoritative reducer. No production account is changed.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
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
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const label=viewport.width>500?'desktop':'mobile',errors=[],state={data:blankSave(),sequences:new Map(),revision:0,contributedRealm:null,seasonRealm:null,peerRealms:[],collectiveSolved:false,seasonSolved:false};
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
    for(const item of body.commands){if(item.seq<=sequence)continue;assert.equal(item.seq,sequence+1);try{state.data=applyWorldAction(state.data,item.action);}catch(e){rejected.push({seq:item.seq,message:e.message});}sequence=item.seq;}
    state.sequences.set(body.device,sequence);state.revision++;
    return json({data:state.data,sequence,revision:state.revision,rejected,legacy:false});
   }
   if(pathname.endsWith('/invisible-guardian')){
    const body=route.request().postDataJSON();
    if(body.action==='capabilities')return json({aiConfigured:false,reason:'disabled',mode:'narrative'});
    if(body.action==='dialog')return json({error:'Service de validation hors ligne.'},503);
    const seasonal=['eventsSnapshot','contributeEvent','solveEvent'].includes(body.action),own=seasonal?'seasonRealm':'contributedRealm',solved=seasonal?'seasonSolved':'collectiveSolved';
    if(['contribute','contributeEvent'].includes(body.action)){
     if(!state.data.invisible.chestOpened)return json({error:'Fragment non synchronisé.'},409);
     if(state[own]&&state[own]!==body.realm)return json({error:'Affinité déjà liée.'},409);
     state[own]=body.realm;
    }
    const realms=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'],represented=new Set([...state.peerRealms,...(state[own]?[state[own]]:[])]),covered=represented.size,word=seasonal?'ENSEMBLE':'TRANSMET';
    if(['solveCollective','solveEvent'].includes(body.action)){if(covered!==8||!state[own])return json({error:'Cercle incomplet.'},409);if(body.answer.toUpperCase()!==word)return json({error:'Mot incorrect.'},400);state[solved]=true;}
    return json({mission:'eight-echoes-001',...(seasonal?{event:body.event||'echoes-autumn-2026',title:'La saison du Lien',startsAt:'2026-10-09T00:00:00Z',endsAt:'2026-12-01T00:00:00Z',phase:state.seasonSolved?'complete':'open',participationOpen:true,completedAt:state.seasonSolved?new Date().toISOString():null,calendar:[{event:'echoes-autumn-2026',title:'La saison du Lien',phase:'open'}]}:{}),realms:realms.map(realm=>({realm,contributors:represented.has(realm)?1:0})),covered,required:8,awakened:covered===8,contributedRealm:state[own],eligible:state.data.invisible.chestOpened,contributors:covered,puzzle:{letters:realms.map((realm,i)=>({realm,position:i+1,symbol:represented.has(realm)?word[i]:null})),clue:'Réunis les huit lettres dans cet ordre.',unlocked:covered===8,solved:state[solved],solvedAt:state[solved]?new Date().toISOString():null}});
   }
   if(pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return json({error:'Service non activé dans ce test.'},503);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/#monde-invisible',{waitUntil:'domcontentloaded'});
   await page.getByTestId('invisible-start').waitFor({timeout:60000});
   assert.ok(await page.getByTestId('mode-remote').getAttribute('aria-pressed')==='true');
   assert.deepEqual(await page.evaluate(()=>window.__invisibleSensors),{gps:0,camera:0,stopped:0},'Sensors need an explicit gesture');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
   await page.screenshot({path:path.join(out,label+'-start.png'),fullPage:true});
   await page.screenshot({path:path.join(out,label+'-overview.png')});
   // Visual exploration is available before any riddle. Successful video is a
   // generated canvas stream, never a user's real camera or stored photograph.
   await page.getByTestId('open-invisible-lens').click();
   const lens=page.getByTestId('lens-experience');await lens.waitFor();
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
   await page.getByTestId('lens-exit').click();assert.equal(await lens.count(),0);
   assert.equal(state.data.invisible.solved.length,0,'Inspection grants no puzzle completion');
   await page.getByTestId('mode-walk').click();
   await page.getByRole('button',{name:'Demander un repère GPS',exact:true}).click();
   await page.getByText('Autorisation refusée. Tu peux continuer sans GPS.',{exact:true}).waitFor();
   await page.getByTestId('mode-remote').click();
   await page.getByTestId('invisible-memory-consent').check();
   await page.getByTestId('invisible-start').click();
   await page.getByTestId('riddle-answer').fill('mauvaise réponse');
   await page.getByTestId('riddle-submit').click();
   assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('3b_world_v1_'+ '11111111-1111-4111-8111-111111111111')).data.invisible)).solved.length,0);
   for(const point of INVISIBLE_EPISODE.points){
    const select=page.getByTestId('point-'+point.id);if(await select.count())await select.click({timeout:5000});
    if(point.id==='rive'){await page.getByRole('button',{name:'Je débute : proposer trois réponses',exact:true}).click();const choices=page.getByRole('group',{name:'Propositions de réponse',exact:true});assert.equal(await choices.getByRole('button').count(),3);await choices.getByRole('button',{name:'Reflet',exact:true}).click();}
    else await page.getByTestId('riddle-answer').fill(point.riddle.answers[0]);
    await page.getByTestId('riddle-submit').click();
   }
   await page.getByTestId('chest-open').click();
   await page.getByTestId('portal-open').click();
   await page.getByRole('button',{name:'Voir avec ma caméra',exact:true}).click();
   await page.getByText('Caméra refusée ou indisponible. Tu peux utiliser le portail sans caméra.',{exact:true}).waitFor();
   await page.getByTestId('forget-memory').click();
   const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('3b_world_v1_11111111-1111-4111-8111-111111111111')).data);
   assert.equal(local.invisible.solved.length,3);assert.equal(local.invisible.portalOpened,true);
   assert.equal(local.invisible.memoryConsent,false);assert.deepEqual(local.invisible.memory,[]);
   assert.equal(local.xp,120);assert.equal(local.shards,55);
   await page.getByRole('button',{name:'Synchroniser l’aventure',exact:true}).click();
   const permanent=page.locator('.invisible-echo-mission').filter({hasNot:page.locator('.invisible-event-calendar')}).first();
   const season=page.locator('.invisible-events');
   await page.getByRole('button',{name:'Actualiser le Cercle',exact:true}).click();
   await permanent.getByRole('button',{name:'Lier mon écho à France',exact:true}).click();
   await permanent.getByText('Ton écho est lié à France.',{exact:true}).waitFor();
   assert.equal(await permanent.getByRole('button',{name:'Valider ma finale',exact:true}).isEnabled(),false);
   // Seven other synthetic fixtures represent seven distinct member accounts.
   state.peerRealms=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
   await page.getByRole('button',{name:'Actualiser le Cercle',exact:true}).click();
   await permanent.getByText('8/8 affinités · 8 contributions confirmées',{exact:true}).waitFor();
   await page.locator('#invisible-final-permanent').fill('TRANSMET');await permanent.getByRole('button',{name:'Valider ma finale',exact:true}).click();
   await permanent.getByText(/Ta finale est accomplie depuis/).waitFor();
   await page.getByRole('button',{name:'Actualiser la saison',exact:true}).click();
   await season.getByRole('button',{name:'Lier mon écho à France',exact:true}).click();
   await season.getByText('Ton écho est lié à France.',{exact:true}).waitFor();
   await page.locator('#invisible-final-season').fill('ENSEMBLE');await season.getByRole('button',{name:'Valider ma finale',exact:true}).click();
   await season.getByText(/Ta finale est accomplie depuis/).waitFor();
   await page.locator('#invisible-guardian-message').fill('Peux-tu me donner un indice ?');
   await page.getByRole('button',{name:'Envoyer',exact:true}).click();
   await page.getByText('Le service IA est indisponible ; cette réponse utilise le récit local.',{exact:true}).waitFor();
   const persisted=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('3b_world_v1_11111111-1111-4111-8111-111111111111')).data));
   assert.ok(!persisted.includes('Peux-tu me donner un indice ?')&&!persisted.includes('latitude')&&!persisted.includes('longitude'));
   for(const episode of INVISIBLE_EPISODES.slice(1)){
    await page.getByTestId('episode-'+episode.realm).click();await page.getByTestId('invisible-start').click();
    for(const point of episode.points){await page.getByTestId('riddle-answer').fill(point.riddle.answers[0]);await page.getByTestId('riddle-submit').click();}
    await page.getByTestId('chest-open').click();await page.getByTestId('portal-open').click();
   }
   await page.getByTestId('convergence-answer').fill('ENSEMBLE');await page.getByTestId('convergence-submit').click();
   const final=await page.evaluate(()=>JSON.parse(localStorage.getItem('3b_world_v1_11111111-1111-4111-8111-111111111111')).data);
   assert.equal(final.invisible.convergenceCompleted,true);assert.equal(Object.values(final.invisible.journeys).filter(x=>x.portalOpened).length,7);assert.equal(final.xp,1200);assert.equal(final.shards,325);
   await page.getByTestId('episode-france').click();await page.getByRole('button',{name:'Synchroniser l’aventure',exact:true}).click();
   await page.screenshot({path:path.join(out,label+'-complete.png'),fullPage:true});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByTestId('invisible-page').waitFor({timeout:60000});
   await page.waitForFunction(()=>document.body.innerText.includes('Fragment de la Justice'));
   assert.equal(await page.getByTestId('chest-open').count(),0,'Completed chest cannot be claimed twice');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);results.push({label,passed:true,checks:['passport-route','24-riddles','eight-chests-portals','campaign-convergence','wrong-answer','lens-before-riddles','3d-inspection-no-reward','camera-refusal-success-stop-hidden','sensors-opt-in','memory-purge','eight-account-collective-fixture','season-fixture','guardian-fallback','ephemeral-dialogue','reload','no-overflow'],camera:'synthetic canvas MediaStream',cooperation:'synthetic fixtures; no production account changed'});
  }catch(e){const hitTest=await page.locator('[data-testid="point-rive"]').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),p=getComputedStyle(el.parentElement);return{bounds:r.toJSON(),pointer:s.pointerEvents,transform:s.transform,z:s.zIndex,visibility:s.visibility,parentPointer:p.pointerEvents,parentZ:p.zIndex,parentTransform:p.transform,hits:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).slice(0,6).map(x=>({tag:x.tagName,class:x.className,style:getComputedStyle(x).pointerEvents}))};}).catch(()=>null);await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(out,label+'-failure.txt'),await page.locator('body').innerText());results.push({label,passed:false,error:e.stack,errors,hitTest});}
  finally{await context.close();}
 }
}finally{await browser.close();if(server)await server.close();await writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
if(results.length!==2||results.some(r=>!r.passed))process.exitCode=1;
