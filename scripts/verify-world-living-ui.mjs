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
 for(const [width,height] of [[320,568],[360,800],[390,844],[393,873],[768,1024],[1440,1000]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<720?3:1,isMobile:width<720,hasTouch:width<720,reducedMotion:width===320?'reduce':'no-preference'});
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
  // A visible React node can still be hidden by the four-second cinematic launch.
  // Capture real content, never a logo/splash frame incorrectly labelled as home.
  await page.waitForFunction(()=>!document.querySelector('.threeb-launch') && !document.querySelector('.threeb-app-content[data-launch-hidden="true"]'));
  check('Direct link bypasses cinema overlay '+width,await page.locator('.threeb-launch').count()===0);
  check('Global companion does not cover the interactive world '+width,await page.locator('.companion3b-shell').count()===0);
  if(width<720){
   const button=home.getByRole('button',{name:/Découvrir les 22 univers/});
   const nav=page.getByRole('navigation',{name:'Navigation mobile'});
   // Short phones legitimately place the CTA below the first fold. Verify the
   // actual reachable state after scrolling instead of treating off-screen
   // content as if it were covered by the fixed dock.
   await button.scrollIntoViewIfNeeded();
   await page.waitForTimeout(80);
   const b=await button.boundingBox(),n=await nav.boundingBox();
   check('Main-world action remains reachable above mobile dock '+width,!!b&&!!n&&b.y>=0&&b.y+b.height<n.y-2);
   const dockBlur=await nav.evaluate(el=>getComputedStyle(el).backdropFilter||getComputedStyle(el).webkitBackdropFilter||'none');
   check('Mobile dock avoids fixed backdrop blur '+width,dockBlur==='none');
  }
  check('Actual World home '+width,await home.locator('.world3b-hero h1').isVisible());
  check('22 real primary modules '+width,await home.locator('.world3b-universe-link').count()===22);
  const canvas=home.locator('canvas.world-living-globe-canvas');
  check('Interactive geographic globe '+width,await canvas.isVisible()&&await canvas.evaluate(el=>el.getBoundingClientRect().width>180&&el.getBoundingClientRect().height>180));
  if(width===390){
   const zoomIn=home.getByRole('button',{name:'Agrandir la planète'});
   const zoomOut=home.getByRole('button',{name:'Réduire la planète'});
   const reset=home.getByRole('button',{name:'Réinitialiser le zoom'});
   const readout=home.locator('.world3b-zoom-readout');
   check('Zoom starts at 100%',(await readout.innerText()).includes('100%'));
   await zoomIn.click();
   check('Globe zoom-in changes scene scale', (await readout.innerText()).includes('115%'));
   await zoomOut.click();
   check('Globe zoom-out restores default', (await readout.innerText()).includes('100%'));
   await zoomIn.click();await zoomIn.click();
   check('Globe accepts repeated zoom', (await readout.innerText()).includes('130%'));
   await reset.click();
   check('Reset zoom restores full world',(await readout.innerText()).includes('100%'));
  }
  if(width<720){
   const realmCard=page.locator('.world3b-country-card').first();
   const realmLayout=await realmCard.evaluate(el=>{
    const card=el.getBoundingClientRect(),note=el.querySelector('small')?.getBoundingClientRect(),style=getComputedStyle(el);
    return {display:style.display,cardRight:card.right,cardBottom:card.bottom,noteRight:note?.right||0,noteBottom:note?.bottom||0};
   });
   check('Realm cards keep grid layout on phone '+width,realmLayout.display==='grid');
   check('Realm value and guardian stay inside card '+width,realmLayout.noteRight<=realmLayout.cardRight+1&&realmLayout.noteBottom<=realmLayout.cardBottom+1);
  }
  if(width<720){
   const globeBudget=await canvas.evaluate(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);return {bitmapWidth:el.width,cssWidth:box.width,touchAction:style.touchAction,display:style.display,filter:style.filter};});
   check('Phone globe caps raster density '+width,globeBudget.bitmapWidth<=globeBudget.cssWidth*1.3+3);
   check('Phone globe receives intended touch/display styles '+width,globeBudget.touchAction==='none'&&globeBudget.display==='block');
   check('Phone globe avoids filtered canvas compositing '+width,globeBudget.filter==='none');
    const globeAura=await home.locator('.world3b-globe-aura').evaluate(el=>({filter:getComputedStyle(el).filter,background:getComputedStyle(el).backgroundImage}));
    check('Mobile globe halo renders without expensive blur '+width,globeAura.filter==='none'&&globeAura.background.includes('radial-gradient'));
  }
  const overflow=await home.evaluate(el=>{
   const root=el.getBoundingClientRect();
   return {scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,offenders:[...el.querySelectorAll('*')]
    .map(n=>({n,rect:n.getBoundingClientRect()}))
    .filter(({rect})=>rect.right>root.right+2||rect.left<root.left-2)
    .slice(0,20).map(({n,rect})=>({tag:n.tagName,cls:typeof n.className==='string'?n.className.slice(0,70):'',text:(n.innerText||'').slice(0,40),left:Math.round(rect.left),right:Math.round(rect.right)})),blocks:[el,...el.children,...el.querySelectorAll('.world3b-intro,.world3b-globe-frame,.world3b-hero,.world3b-tabs,.world3b-country-rail,.world3b-module-section,.world3b-active-view,.world3b-extra')].map(n=>({cls:typeof n.className==='string'?n.className:'',x:Math.round(n.getBoundingClientRect().x),w:Math.round(n.getBoundingClientRect().width),scroll:n.scrollWidth,client:n.clientWidth,position:getComputedStyle(n).position,overflow:getComputedStyle(n).overflowX})).slice(0,28)};
  });
  if(overflow.scrollWidth>overflow.clientWidth+2)console.log('OVERFLOW_DIAGNOSTIC',width,JSON.stringify(overflow));
  check('Homepage has no unwanted horizontal overflow '+width,overflow.scrollWidth<=overflow.clientWidth+2);
  // Freeze motion and capture CSS pixels: keeps long mobile screenshots stable without 3x GPU raster pressure.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:path.join(out,'3b-world-'+width+'.png'),fullPage:true,animations:'disabled',scale:'css',timeout:60000});
  if(width===390){
   await home.getByRole('button',{name:'Maroc Noblesse · Naël'}).click();
   check('Selecting a realm changes visible globe context',await home.locator('.world3b-realm-current').innerText().then(t=>t.includes('Maroc')));
   await home.locator('#world3b-search').fill('sante');
   check('Search removes accents',await home.locator('.world3b-universe-link').count()===1);
   await home.locator('#world3b-search').fill('scanner');
   check('Search exposes extra scanner service',await home.locator('.world3b-search-extra-links a[href*="scanner-alimentaire"]').count()===1);
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
  check('Concierge uses unobstructed local navigation '+width,await page.locator('.albert3b-local-dock').isVisible() && await page.locator('.mobile-navigation').isHidden());
  check('Floating companion does not cover Albert conversation '+width,await page.locator('.companion3b-shell').count()===0);
   if(width<720){
    const avatarHaloState=await page.locator('.albert3b-avatar-halo').evaluate(el=>({
     filter:getComputedStyle(el).filter,
     coarse:matchMedia('(pointer: coarse)').matches,
     phone:matchMedia('(max-width:720px)').matches,
     background:getComputedStyle(el).backgroundImage.slice(0,90)
    }));
    if(avatarHaloState.filter!=='none')console.log('MOBILE_AVATAR_HALO_DIAGNOSTIC',width,JSON.stringify(avatarHaloState));
    check('Mobile Albert avatar renders without blur filter '+width,avatarHaloState.filter==='none');
   }
  check('Albert route is reachable '+width,true);
  await page.screenshot({path:path.join(out,'albert-'+width+'.png'),fullPage:true,animations:'disabled',scale:'css',timeout:60000});
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
