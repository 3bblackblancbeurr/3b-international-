// Browser acceptance for the owner's approved static city + independent CSS-animated Broken Circle.
// Local Vite server, synthetic browser only: no production writes or account usage.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5312,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5312',out=process.env.APP_EXPERIENCE_QA_OUT||'/tmp/3b-app-experience-qa';
await mkdir(out,{recursive:true});
const errors=[],checks=[];
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS',label);};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
  return route.continue();
 });
 await context.addInitScript(()=>{
  localStorage.setItem('3b_options_master_clean_v1',JSON.stringify({matrix:false,animations:true,reducedMotion:false,interfaceSound:false,cinematicIntros:false}));
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/#accueil');
 const art=page.locator('.home-aaa-art');
 await art.waitFor({state:'visible'});
 const scene=art.locator('.home-aaa-artwork');
 const ring=art.locator('.home-aaa-rotating-circle, .home-aaa-ring-fallback').first();
 await ring.waitFor({state:'attached'});
 check('Home has a separate city artwork and rotating Broken Circle',await scene.count()===1&&await ring.count()===1);
 check('Reduced-motion preference is applied to the approved art',await art.getAttribute('data-motion')==='reduced');
 check('Reduced-motion disables circle animation',await ring.evaluate(el=>getComputedStyle(el).animationName==='none'));
 await page.screenshot({path:path.join(out,'home-reduced-390.png')});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>document.querySelector('.home-aaa-art')?.dataset.motion==='enabled');
 await page.waitForFunction(()=>{
  const el=document.querySelector('.home-aaa-rotating-circle, .home-aaa-ring-fallback');
  return el && getComputedStyle(el).animationName==='threebRingActuallyRotates';
 });
 check('Changing motion preference restores real 16-second circle rotation',await ring.evaluate(el=>getComputedStyle(el).animationDuration==='16s'));
 check('The city image remains static while the ring rotates',await scene.evaluate(el=>getComputedStyle(el).animationName==='none'));
 await page.screenshot({path:path.join(out,'home-moving-390.png')});
 await page.getByRole('button',{name:'Découvrir l’histoire'}).click();
 const story=page.locator('.world-story-dialog');await story.waitFor({state:'visible'});
 check('Story opens with title and native keyboard modality',await story.getAttribute('aria-labelledby')!==null&&await story.evaluate(el=>el.matches(':modal')));
 await page.waitForFunction(()=>document.querySelector('.home-aaa-art')?.dataset.covered==='true');
 check('Narrative dialog pauses the decorative ring',await ring.evaluate(el=>getComputedStyle(el).animationPlayState==='paused'));
 await story.getByRole('button',{name:'Continuer',exact:true}).click();
 check('Chapter two presents Kaïs',await story.innerText().then(text=>text.includes('Kaïs')&&text.includes('Un lien à retrouver.')));
 await story.getByRole('button',{name:'Continuer',exact:true}).click();
 check('All eight canonical heritages have a value and guardian',await story.locator('.world-story-realms li').count()===8);
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  check('Story fits '+width+'px without horizontal overflow',await story.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  check('Story actions stay visible at '+width+'px',await story.locator('.world-story-actions').evaluate(el=>{const rect=el.getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight;}));
  await page.screenshot({path:path.join(out,'story-'+width+'.png')});
 }
 await page.keyboard.press('Escape');await story.waitFor({state:'hidden'});
 check('Closing the story restores focus to its trigger',await page.getByRole('button',{name:'Découvrir l’histoire'}).evaluate(el=>el===document.activeElement));
 await page.waitForFunction(()=>document.querySelector('.home-aaa-art')?.dataset.covered==='false');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.getByRole('navigation',{name:'Navigation mobile'}).getByRole('button',{name:'Ouvrir le menu'}).click();
 await page.waitForFunction(()=>document.querySelector('.home-aaa-art')?.dataset.covered==='true');
 check('Opening application menu pauses the ring',await ring.evaluate(el=>getComputedStyle(el).animationPlayState==='paused'));
 const search=page.getByRole('searchbox',{name:'Rechercher une rubrique'});
 await search.fill('caméra');
 const result=page.locator('.app-menu-route');
 check('Camera search offers one direct scanner destination',await result.count()===1&&(await result.getAttribute('href')).includes('invisibleView=scanner'));
 await search.press('ArrowDown');
 check('Down arrow moves focus from search to its result',await result.evaluate(el=>el===document.activeElement));
 await search.focus();await search.press('Enter');
 await page.waitForURL(url=>url.searchParams.get('invisibleView')==='scanner');
 check('Enter activates the scanner route',new URL(page.url()).hash==='#monde-invisible');
 await art.waitFor({state:'detached'});
 check('Leaving home releases its cinematic artwork and ring',await art.count()===0);
 check('No uncaught JavaScript errors',errors.length===0);
 await context.close();
 await writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({passed:checks.length,errors,out}));
}finally{await browser.close();await server.close();}
