// Browser QA for the scrollable 3B Concept 13 atlas, no synthetic users or writes.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5312,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5312',out=process.env.APP_EXPERIENCE_QA_OUT||'/tmp/3b-app-experience-qa';
await mkdir(out,{recursive:true});
const errors=[],checks=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
async function controlsRemainReachable(controls){
 const blocked=[];
 for(let index=0;index<await controls.count();index++){
  const control=controls.nth(index);
  const label=await control.getAttribute('aria-label')||await control.textContent();
  if(!await control.isVisible()){blocked.push(label+' (hidden)');continue;}
  await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  const usable=await control.evaluate(el=>{
   const bounds=el.getBoundingClientRect(),x=bounds.left+bounds.width/2,y=bounds.top+bounds.height/2;
   const hit=document.elementFromPoint(x,y);
   return bounds.width>0&&bounds.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&Boolean(hit&&(hit===el||el.contains(hit)));
  });
  if(!usable)blocked.push(label+' (clipped or covered)');
 }
 assert.deepEqual(blocked,[],'Controls must remain reachable after scrolling');
 return true;
}
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
  if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
  return route.continue();
 });
 await ctx.addInitScript(()=>{
  localStorage.setItem('3b_options_master_clean_v1',JSON.stringify({matrix:false,animations:true,reducedMotion:false,interfaceSound:false,cinematicIntros:false}));
  localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));
 });
 const page=await ctx.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#accueil',{waitUntil:'domcontentloaded',timeout:45000});
 const home=page.locator('.atlas3b');await home.waitFor({state:'visible'});
 check('Atlas concept 13 replaces old framed card directory',await home.isVisible()&&await page.locator('.home-app-hub,.world3b-legacy-archive').count()===0);
 await page.waitForFunction(()=>{const image=document.querySelector('.atlas3b-earth-photo');return image?.complete&&image.naturalWidth>0;});
 check('World artwork loads from local assets',await home.locator('.atlas3b-earth-photo').evaluate(e=>e.complete&&e.naturalWidth>0&&new URL(e.currentSrc).origin===location.origin));
 check('All 22 routes and eight realms remain discoverable',await home.locator('.atlas3b-module-link').count()===22&&await home.locator('.atlas3b-realm').count()===8);
 check('Reduced motion disables animated flight paths',await home.locator('.atlas3b-flight-line').first().evaluate(e=>getComputedStyle(e).animationName==='none'));
 check('Artwork identifies AI provenance and illustrative connections',await home.locator('.atlas3b-attribution').innerText().then(s=>s.includes('Création visuelle IA')&&s.includes('Connexions illustratives')));
 await page.screenshot({path:path.join(out,'atlas-reduced-390.png'),animations:'disabled',fullPage:true});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>{const flight=document.querySelector('.atlas3b-flight-line');return flight&&getComputedStyle(flight).animationName==='atlas3b-route-flow';});
 check('Flight paths can animate only when user allows motion',await home.locator('.atlas3b-flight-line').first().evaluate(e=>getComputedStyle(e).animationName==='atlas3b-route-flow'));
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  check('Atlas scrolls vertically without horizontal overflow '+width,await home.evaluate(el=>{
   const bounds=el.getBoundingClientRect();
   return el.scrollWidth<=el.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1&&bounds.height>innerHeight&&document.documentElement.scrollHeight>innerHeight&&el.scrollHeight<=bounds.height+2;
  }));
  check('Header button stays available '+width,await home.getByRole('button',{name:'Ouvrir le menu général 3B'}).isVisible());
  check('Header, map and dock controls stay reachable after scrolling '+width,await controlsRemainReachable(home.locator('.atlas3b-header button:visible,.atlas3b-header a:visible,.atlas3b-find input,.atlas3b-tabs [role="tab"],.atlas3b-map-pin,.atlas3b-dock a,.atlas3b-dock button')));
  check('All module links and favorite controls stay reachable after scrolling '+width,await controlsRemainReachable(home.locator('.atlas3b-module-link,.atlas3b-favorite')));
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(out,'atlas-'+width+'.png'),animations:'disabled',fullPage:true});
 }
 await home.getByRole('tab',{name:'Hubs 3B'}).click();
 check('Hubs tab is honest about future projects',await home.getByText(/Aucun lieu physique 3B/).isVisible());
 await home.getByRole('tab',{name:'Monde',exact:true}).click();
 await home.getByRole('button',{name:'Explorer les espaces 3B'}).click();
 const sheet=home.locator('.atlas3b-directory');await sheet.waitFor({state:'visible'});
 check('Directory is a real native keyboard modal',await sheet.evaluate(e=>e.matches(':modal')));
 check('All 22 modules are independently navigable',await sheet.locator('.atlas3b-directory-grid a').count()===22);
 await page.screenshot({path:path.join(out,'atlas-directory-320.png'),animations:'disabled'});
 await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
 check('Escape closes module directory safely',await home.isVisible());
 await home.getByRole('button',{name:'Ouvrir le menu général 3B'}).click();
 const menu=page.locator('#universe-menu');await menu.waitFor({state:'visible'});
 check('Real application menu remains connected',await menu.getByRole('searchbox',{name:'Rechercher une rubrique'}).isVisible());
 const search=menu.getByRole('searchbox',{name:'Rechercher une rubrique'});
 await search.fill('caméra');
 const result=menu.locator('.app-menu-route');
 check('Scanner search offers one actual camera destination',await result.count()===1&&(await result.getAttribute('href')).includes('invisibleView=scanner'));
 await search.press('ArrowDown');
 check('Search arrow moves keyboard focus to its result',await result.evaluate(e=>e===document.activeElement));
 await search.focus();await search.press('Enter');
 await page.waitForURL(u=>u.searchParams.get('invisibleView')==='scanner');
 check('Enter activates the real scanner route',new URL(page.url()).hash==='#monde-invisible');
 await home.waitFor({state:'detached'});
 check('Leaving home disposes the world atlas',await home.count()===0);
 check('Camera does not start until the member allows it',await page.locator('video').evaluateAll(items=>items.every(el=>!el.srcObject)));
 check('No uncaught rendering errors',errors.length===0);
 await writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({passed:checks.length,errors,out}));
 await ctx.close();
}finally{await browser.close();await server.close();}
