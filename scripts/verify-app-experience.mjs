// Browser acceptance for 3B Immersive Master II, which superseded the old
// home archive and static CSS broken circle. Local synthetic browsing only.
// Real scanner stays inactive until the member explicitly authorizes it.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5312,strictPort:true}});
await server.listen();
const browser=await chromium.launch({
 headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const origin='http://127.0.0.1:5312',out=process.env.APP_EXPERIENCE_QA_OUT||'/tmp/3b-app-experience-qa';
await mkdir(out,{recursive:true});
const errors=[],checks=[];
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS',label);};
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await ctx.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
  return route.continue();
 });
 await ctx.addInitScript(()=>{
  localStorage.setItem('3b_options_master_clean_v1',JSON.stringify({matrix:false,animations:true,reducedMotion:false,interfaceSound:false,cinematicIntros:false}));
  localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));
 });
 const page=await ctx.newPage();
 page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/#accueil',{waitUntil:'domcontentloaded',timeout:45000});
 const home=page.locator('.th-world-screen');await home.waitFor({state:'visible'});
 check('Immersive 3B home replaces the old scrolling card directory',await home.isVisible()&&await page.locator('.home-app-hub,.world3b-legacy-archive').count()===0);
 check('Cinematic world fits one phone viewport',await home.evaluate(el=>el.getBoundingClientRect().height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3));
 check('Eight canonical realms remain directly selectable',await home.locator('.th-world-realms-line button').count()===8);
 const lite=home.locator('.th-earth3d-lite');
 check('Reduced motion automatically chooses the lightweight globe',await lite.isVisible()&&await home.locator('.th-earth3d canvas').count()===0);
 check('NASA fallback keeps a meaningful interactive accessible label',await lite.getByRole('button',{name:/Terre 3B illustrée/}).isVisible());
 check('No unnecessary framed home cards remain',await home.locator('.world3b-universe,.universe-card').count()===0);
 await page.screenshot({path:path.join(out,'world-reduced-390.png'),animations:'disabled'});
 const realm=home.locator('.th-world-realm-insight h2');
 await home.getByRole('button',{name:'Choisir le royaume Algérie'}).click();
 check('Realm picker changes the actual 3B kingdom',await realm.innerText().then(s=>s.includes('Algérie')));
 await home.getByRole('button',{name:'Mettre la rotation en pause'}).click();
 check('User can pause expensive decorative motion',await home.getByRole('button',{name:'Relancer la rotation'}).getAttribute('aria-pressed')==='true');
 await home.getByRole('button',{name:'Relancer la rotation'}).click();
 check('Pause can be safely released',await home.getByRole('button',{name:'Mettre la rotation en pause'}).getAttribute('aria-pressed')==='false');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  check('World viewport stays readable at '+width,await home.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  check('Mobile menu icon has real visible width at '+width,await home.locator('.th-world-menu-launch svg').evaluate(el=>el.getBoundingClientRect().width>=18));
  check('No redundant Explore button overlays the mobile globe at '+width,await home.locator('.th-world-explore').isHidden());
  await page.screenshot({path:path.join(out,'world-'+width+'.png'),animations:'disabled'});
 }
 await home.getByRole('button',{name:'Ouvrir tous les univers 3B'}).click();
 const dialog=page.locator('dialog#universe-menu');await dialog.waitFor({state:'visible'});
 check('Navigation opens in a native modal',await dialog.evaluate(el=>el.matches(':modal')&&!!el.getAttribute('aria-labelledby')));
 check('All categories stay in one horizontal swipe rail',await dialog.locator('.app-menu-categories').evaluate(el=>{
  const t=[...el.querySelectorAll('[role="tab"]')];return t.length===8&&new Set(t.map(x=>Math.round(x.getBoundingClientRect().top))).size===1;
 }));
 check('Real hidden world, games, health and studio IA remain discoverable',await dialog.locator('[data-menu-id="invisible"]').count()>0);
 await page.screenshot({path:path.join(out,'menu-320.png'),animations:'disabled'});
 const search=dialog.getByRole('searchbox',{name:'Rechercher une rubrique'});
 await search.fill('caméra');
 const result=dialog.locator('.app-menu-route');
 check('Camera search offers one real scanner destination',await result.count()===1&&(await result.getAttribute('href')).includes('invisibleView=scanner'));
 await search.press('ArrowDown');
 check('Keyboard moves focus from search to result',await result.evaluate(el=>el===document.activeElement));
 await search.focus();await search.press('Enter');
 await page.waitForURL(url=>url.searchParams.get('invisibleView')==='scanner');
 check('Enter opens the existing camera route',new URL(page.url()).hash==='#monde-invisible');
 await home.waitFor({state:'detached'});
 check('Leaving immersive home disposes its scene',await home.count()===0);
 check('Scanner waits for permission, never auto-starts on navigation',await page.locator('video').evaluateAll(items=>items.every(el=>!el.srcObject)));
 check('No uncaught JavaScript errors',errors.length===0);
 await ctx.close();
 await writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({passed:checks.length,errors,out}));
}finally{await browser.close();await server.close();}
