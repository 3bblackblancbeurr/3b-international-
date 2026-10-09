// Acceptance uses synthetic members and a local authoritative reducer. No production account is changed.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {INVISIBLE_EPISODE} from '../src/world/invisible/catalog.js';
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
  const label=viewport.width>500?'desktop':'mobile',errors=[],state={data:blankSave(),sequences:new Map(),revision:0,contributedRealm:null};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(({uid})=>{
   window.__invisibleSensors={gps:0,camera:0};
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition(_ok,fail){window.__invisibleSensors.gps++;setTimeout(()=>fail({code:1}),0);return 10;},clearWatch(){}}});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia(){window.__invisibleSensors.camera++;return Promise.reject(new DOMException('Denied in fixture','NotAllowedError'));}}});
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
    if(body.action==='dialog')return json({error:'Service de validation hors ligne.'},503);
    if(body.action==='contribute'){
     if(!state.data.invisible.chestOpened)return json({error:'Fragment non synchronisé.'},409);
     if(state.contributedRealm&&state.contributedRealm!==body.realm)return json({error:'Affinité déjà liée.'},409);
     state.contributedRealm=body.realm;
    }
    return json({mission:'eight-echoes-001',realms:['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].map(realm=>({realm,contributors:state.contributedRealm===realm?1:0})),covered:state.contributedRealm?1:0,required:8,awakened:false,contributedRealm:state.contributedRealm,eligible:state.data.invisible.chestOpened,contributors:state.contributedRealm?1:0});
   }
   if(pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return json({error:'Service non activé dans ce test.'},503);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/#monde-invisible',{waitUntil:'domcontentloaded'});
   await page.getByTestId('invisible-start').waitFor({timeout:60000});
   assert.ok(await page.getByTestId('mode-remote').getAttribute('aria-pressed')==='true');
   assert.deepEqual(await page.evaluate(()=>window.__invisibleSensors),{gps:0,camera:0},'Sensors need an explicit gesture');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
   await page.screenshot({path:path.join(out,label+'-start.png'),fullPage:true});
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
    await page.getByTestId('riddle-answer').fill(point.riddle.answers[0]);
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
   await page.getByRole('button',{name:'Actualiser le Cercle',exact:true}).click();
   await page.getByRole('button',{name:'Lier mon écho à France',exact:true}).click();
   await page.getByText('Ton écho est lié à France.',{exact:true}).waitFor();
   await page.locator('#invisible-guardian-message').fill('Peux-tu me donner un indice ?');
   await page.getByRole('button',{name:'Envoyer',exact:true}).click();
   await page.getByText('Le service IA est indisponible ; cette réponse utilise le récit local.',{exact:true}).waitFor();
   const persisted=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('3b_world_v1_11111111-1111-4111-8111-111111111111')).data));
   assert.ok(!persisted.includes('Peux-tu me donner un indice ?')&&!persisted.includes('latitude')&&!persisted.includes('longitude'));
   await page.screenshot({path:path.join(out,label+'-complete.png'),fullPage:true});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByTestId('invisible-page').waitFor({timeout:60000});
   await page.waitForFunction(()=>document.body.innerText.includes('Fragment de la Justice'));
   assert.equal(await page.getByTestId('chest-open').count(),0,'Completed chest cannot be claimed twice');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.deepEqual(errors,[]);results.push({label,passed:true,checks:['passport-route','three-riddles','wrong-answer','chest','portal','sensors-opt-in-refusal','memory-purge','cooperation','guardian-fallback','ephemeral-dialogue','reload','no-overflow']});
  }catch(e){const hitTest=await page.locator('[data-testid="point-rive"]').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),p=getComputedStyle(el.parentElement);return{bounds:r.toJSON(),pointer:s.pointerEvents,transform:s.transform,z:s.zIndex,visibility:s.visibility,parentPointer:p.pointerEvents,parentZ:p.zIndex,parentTransform:p.transform,hits:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).slice(0,6).map(x=>({tag:x.tagName,class:x.className,style:getComputedStyle(x).pointerEvents}))};}).catch(()=>null);await page.screenshot({path:path.join(out,label+'-failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(out,label+'-failure.txt'),await page.locator('body').innerText());results.push({label,passed:false,error:e.stack,errors,hitTest});}
  finally{await context.close();}
 }
}finally{await browser.close();if(server)await server.close();await writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
if(results.length!==2||results.some(r=>!r.passed))process.exitCode=1;
