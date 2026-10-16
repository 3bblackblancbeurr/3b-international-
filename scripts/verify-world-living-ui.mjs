// Browser acceptance specifically for the two user-approved concept directions (13 + 14).
// Uses a local Vite browser; no remote accounts, production state or paid model calls.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5353,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5353',out=process.env.WORLD_LIVING_QA_OUT||'/tmp/3b-world-living-qa';
await mkdir(out,{recursive:true});
const checks=[],errors=[];
function check(label,value){assert.ok(value,label);checks.push(label);console.log('PASS',label);}
try{
 for(const width of [390,320,768]){
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width<720,hasTouch:width<720,reducedMotion:width===320?'reduce':'no-preference'});
  await ctx.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await ctx.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',err=>errors.push(''+width+': '+err.message));
  await page.goto(origin+'/#accueil');
  const home=page.locator('.world3b-home');await home.waitFor({state:'visible'});
  check('Actual World home '+width,await home.locator('.world3b-hero h1').isVisible());
  check('22 real primary modules '+width,await home.locator('.world3b-universe-link').count()===22);
  const canvas=home.locator('canvas.world-living-globe-canvas');
  check('Interactive geographic globe '+width,await canvas.isVisible()&&await canvas.evaluate(el=>el.getBoundingClientRect().width>180&&el.getBoundingClientRect().height>180));
  check('Homepage has no unwanted horizontal overflow '+width,await home.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  await page.screenshot({path:path.join(out,'3b-world-'+width+'.png'),fullPage:true});
  if(width===390){
   await home.getByRole('button',{name:'Maroc Noblesse · Naël'}).click();
   check('Selecting a realm changes visible globe context',await home.locator('.world3b-realm-current').innerText().then(t=>t.includes('Maroc')));
   await home.locator('#world3b-search').fill('sante');
   check('Search removes accents',await home.locator('.world3b-universe-link').count()===1);
   await home.locator('#world3b-search').fill('');
   await home.locator('.world3b-universe-fav').first().click();
   await home.getByRole('button',{name:'Favoris',exact:true}).click();
   check('Favorites filter works locally',await home.locator('.world3b-universe-link').count()===1);
   await page.reload();await home.waitFor({state:'visible'});
   await home.getByRole('button',{name:'Favoris',exact:true}).click();
   check('Favorites persist on device',await home.locator('.world3b-universe-link').count()===1);
  }
  await home.getByRole('link',{name:/Albert APEX/}).first().click();
  await page.waitForURL(url=>url.hash==='#albert-3b');
  await page.locator('.albert3b-experience').waitFor({state:'visible'});
  check('Albert route is reachable '+width,true);
  await page.screenshot({path:path.join(out,'albert-'+width+'.png'),fullPage:true});
  if(width===390){
   await page.locator('#albert3b-input').fill('Je veux voir les jeux');
   await page.getByRole('button',{name:'Envoyer ma question'}).click();
   check('Local assistant links to real games route',await page.locator('.albert3b-reply-link').last().getAttribute('href').then(h=>h.includes('#jeux')));
   check('Albert clearly describes disconnected PC mode',await page.locator('.albert3b-status').innerText().then(t=>t.includes('non connecté')));
  }
  await ctx.close();
 }
 check('No uncaught JS errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,errors,out}));
}finally{await browser.close();await server.close();}
