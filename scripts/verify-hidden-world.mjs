import assert from 'node:assert/strict';
import {createServer} from 'vite';
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
 for(const width of [390,844,1440]){
  const context=await browser.newContext({viewport:{width,height:width===844?390:900},permissions:['camera'],reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));window.__cameraCalls=0;const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{window.__cameraCalls++;return original(options);};});
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"QA offline guest"}'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5394/#monde-invisible',{waitUntil:'domcontentloaded'});
  await page.locator('.hidden-world').waitFor({timeout:60000});
  assert.equal(await page.locator('[data-testid="riddle-submit"], [data-testid="chest-open"], .invisible-cooperation').count(),0);
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0);
  for(const view of ['realms','journal','scanner','adventure']){
   await page.getByTestId('invisible-nav-'+view).click();await page.getByTestId('invisible-view-'+view).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow at '+width+' / '+view);
   assert.equal(await page.getByTestId('invisible-nav-'+view).getAttribute('aria-current'),'page');
  }
  await page.getByTestId('invisible-nav-realms').click();assert.equal(await page.locator('.hidden-realm').count(),8);await page.locator('.hidden-realm').first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByTestId('invisible-nav-scanner').click();await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hidden-scanner video')?.readyState>=2);
  await page.getByRole('button',{name:'Prendre une photo',exact:true}).click();await page.locator('.hidden-viewfinder img').waitFor();assert.equal(await page.evaluate(()=>document.querySelector('.hidden-scanner video').srcObject),null);
  await page.getByRole('button',{name:'Effacer l’aperçu'}).click();assert.equal(await page.locator('.hidden-viewfinder img').count(),0);
  await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hidden-scanner video')?.readyState>=2);await page.evaluate(()=>{window.__testStream=document.querySelector('.hidden-scanner video').srcObject;});await page.getByTestId('invisible-nav-adventure').click();assert.equal(await page.evaluate(()=>window.__testStream.getTracks().every(track=>track.readyState==='ended')),true);
  await page.getByRole('button',{name:'Réglages',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  await page.locator('.hidden-world').screenshot({path:path.join(out,'home-'+width+'.png')});
  assert.deepEqual(errors,[]);console.log('PASS '+width+': four views, eight guardians, no retired challenges, camera capture/cleanup, dialogs, no overflow or runtime error');await context.close();
 }
}finally{await browser.close();await server.close();}
