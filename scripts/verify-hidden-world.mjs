import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(modulePath)?pathToFileURL(modulePath).href:modulePath);
import {mkdir} from 'node:fs/promises';
const server=await createServer({server:{host:'127.0.0.1',port:5394,strictPort:true}});
await server.listen();
let browser;
try{browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});}catch(error){await server.close();throw error;}
const out=process.env.HIDDEN_WORLD_TEST_OUT||'work/hidden-world';
await mkdir(out,{recursive:true});
try{
 const uid='11111111-1111-4111-8111-111111111111';
 const profile={user_id:uid,name:'Voyageur QA',handle:'qa_hidden',country:'France',xp:1800,points:100,passport_state:'active',passport_public_id:'22222222-2222-4222-8222-222222222222',passport_version:1,theme:'heir',created_at:'2026-01-01T00:00:00Z'};
 for(const width of [390,844,1440]){
  let world=blankSave();const sequences=new Map();
  const context=await browser.newContext({viewport:{width,height:width===844?390:900},permissions:['camera'],reducedMotion:'reduce'});
  await context.addInitScript(({uid})=>{
   const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})),'synthetic-hidden-test'].join('.');
   localStorage.setItem('3b_member_auth_v1',JSON.stringify({access_token:token,refresh_token:'synthetic-hidden-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'qa@example.invalid'}}));
   localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));
   window.__cameraCalls=0;const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{window.__cameraCalls++;return original(options);};
  },{uid});
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',route=>{
   const pathname=new URL(route.request().url()).pathname,json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   if(pathname.endsWith('/member-api'))return json({profile,events:[],inventory:[],entitlements:[],identity_claims_complete:true});
   if(pathname.endsWith('/world-engine')){const body=route.request().postDataJSON();let sequence=sequences.get(body.device)||0;for(const item of body.commands){if(item.seq<=sequence)continue;world=applyWorldAction(world,item.action);sequence=item.seq;}sequences.set(body.device,sequence);return json({data:world,sequence,revision:1,rejected:[],legacy:false});}
   if(pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA service disabled"}'});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|shader|WebGL/i.test(message.text()))errors.push(message.text());});
  await page.goto('http://127.0.0.1:5394/#monde-invisible',{waitUntil:'domcontentloaded'});
  await page.locator('.hidden-world').waitFor({timeout:60000});
  assert.equal(await page.locator('[data-testid="riddle-submit"], [data-testid="chest-open"], .invisible-cooperation').count(),0);
  assert.equal(await page.locator('.site-header,.mobile-navigation').count(),0,'The hidden world uses one dedicated menu without global navigation overlay');
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0);
  for(const view of ['realms','journal','scanner','adventure']){
   await page.getByTestId('invisible-nav-'+view).click();await page.getByTestId('invisible-view-'+view).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width+' / '+view);
   assert.equal(await page.getByTestId('invisible-nav-'+view).getAttribute('aria-current'),'page');
  }
  await page.getByTestId('invisible-nav-realms').click();assert.equal(await page.locator('.hidden-realm').count(),8);await page.locator('.hidden-realm').first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByTestId('invisible-nav-scanner').click();
  assert.equal(await page.locator('.hidden-camera-portal').count(),0,'No screen-fixed camera overlay');
  await page.getByRole('button',{name:'Passage 3D',exact:true}).click();
  await page.getByRole('button',{name:'Découvrir le passage en 3D',exact:true}).click();await page.locator('.hidden-passage-stage.is-preview canvas').waitFor();
  await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__cameraCalls),0,'3D visit must not request camera');
  await page.locator('.hidden-passage-stage').screenshot({path:path.join(out,'passage-'+width+'.png')});
  const box=await page.locator('.hidden-passage-stage canvas').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+100,box.y+box.height/2);await page.mouse.up();await page.waitForTimeout(150);
  await page.locator('.hidden-passage-stage').screenshot({path:path.join(out,'passage-side-'+width+'.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Fermer la visite 3D',exact:true}).click();assert.equal(await page.locator('.hidden-passage-stage canvas').count(),0);
  await page.getByRole('button',{name:'Révéler le passage',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.hidden-spatial-hud.is-active'));
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0,'Unsupported XR must not substitute an overlay');
  assert.equal(await page.locator('.hidden-passage-stage canvas').count(),0);
  await page.getByRole('button',{name:'Apparition animée',exact:true}).click();
  await page.getByRole('button',{name:'Découvrir l’apparition en 3D',exact:true}).click();
  await page.locator('.hidden-passage-stage[data-ready="true"]').waitFor({timeout:30000}).catch(async error=>{console.error(await page.locator('.hidden-inline-status').allTextContents(),errors);throw error;});await page.waitForTimeout(350);
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0,'Apparition visit needs no camera');
  await page.locator('.hidden-passage-stage').screenshot({path:path.join(out,'apparition-'+width+'.png')});
  await page.getByRole('button',{name:'Animations arrêtées',exact:true}).click();await page.waitForTimeout(2000);
  await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Reprendre',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('.hidden-passage-stage').screenshot({path:path.join(out,'apparition-animated-'+width+'.png')});
  await page.getByRole('button',{name:'Relancer',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Pause',exact:true}).getAttribute('aria-pressed'),'false');
  await page.waitForFunction(()=>document.querySelector('.hidden-echo-status')?.textContent.includes('te fait un signe'),{},{timeout:15000});
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.locator('.hidden-passage-stage').screenshot({path:path.join(out,'apparition-gesture-'+width+'.png')});
  await page.getByRole('button',{name:'Fermer la visite 3D',exact:true}).click();assert.equal(await page.locator('.hidden-passage-stage canvas').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.hidden-photo-tools > summary').click();
  await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hidden-scanner video')?.readyState>=2);
  await page.getByRole('button',{name:'Prendre une photo',exact:true}).click();await page.locator('.hidden-viewfinder img').waitFor();assert.equal(await page.evaluate(()=>document.querySelector('.hidden-scanner video').srcObject),null);
  await page.getByRole('button',{name:'Effacer l’aperçu'}).click();assert.equal(await page.locator('.hidden-viewfinder img').count(),0);
  await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hidden-scanner video')?.readyState>=2);await page.evaluate(()=>{window.__testStream=document.querySelector('.hidden-scanner video').srcObject;});await page.getByTestId('invisible-nav-adventure').click();assert.equal(await page.evaluate(()=>window.__testStream.getTracks().every(track=>track.readyState==='ended')),true);
  await page.getByRole('button',{name:'Réglages',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  await page.locator('.hidden-world').screenshot({path:path.join(out,'home-'+width+'.png')});
  assert.deepEqual(errors,[]);console.log('PASS '+width+': four views, eight guardians, no retired challenges, camera capture/cleanup, dialogs, no overflow or runtime error');await context.close();
 }
}finally{await browser.close();await server.close();}
