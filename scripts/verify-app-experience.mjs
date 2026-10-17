// Browser QA for 3B Concept 13 satellite atlas, no synthetic users or writes.
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
 check('Night map loads from local assets',await home.locator('.atlas3b-earth-photo').evaluate(e=>e.complete&&e.naturalWidth>0));
 check('All 22 routes and eight realms remain discoverable',await home.locator('.atlas3b-module-link').count()===22&&await home.locator('.atlas3b-realm').count()===8);
 check('Reduced motion disables animated flight paths',await home.locator('.atlas3b-flight-line').first().evaluate(e=>getComputedStyle(e).animationName==='none'));
 check('Decorative routes do not fabricate live users or hubs',await home.locator('.atlas3b-attribution').innerText().then(s=>s.includes('pas de hubs actifs')));
 await page.screenshot({path:path.join(out,'atlas-reduced-390.png'),animations:'disabled'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 check('Flight paths can animate only when user allows motion',await home.locator('.atlas3b-flight-line').first().evaluate(e=>getComputedStyle(e).animationName==='atlas3b-route-flow'));
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  check('Atlas layout fits '+width,await home.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&document.documentElement.scrollHeight<=innerHeight+3));
  check('Header button stays available '+width,await home.getByRole('button',{name:'Ouvrir le menu général 3B'}).isVisible());
  await page.screenshot({path:path.join(out,'atlas-'+width+'.png'),animations:'disabled'});
 }
 await home.getByRole('tab',{name:'Hubs 3B'}).click();
 check('Hubs tab is honest about future projects',await home.getByText(/Aucun lieu physique 3B/).isVisible());
 await home.getByRole('tab',{name:'Monde',exact:true}).click();
 await home.getByRole('button',{name:'Explorer les 22 univers'}).click();
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
