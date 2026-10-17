// Acceptance for Immersive Master II: full-viewport World and Albert, real
// 3B navigation and no fabricated account/network data. Browser-only local QA.
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
function check(label,value){assert.ok(value,label);checks.push(label);console.log('PASS',label)}
try{
 for(const [width,height] of [[320,568],[320,650],[360,800],[390,844],[393,873],[768,1024],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<720?2:1,isMobile:width<720,hasTouch:width<720,reducedMotion:width===320?'reduce':'no-preference'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(width+': '+e.message));
  await page.goto(origin+'/#accueil',{waitUntil:'domcontentloaded',timeout:60000});
  const home=page.locator('.th-world-screen');await home.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.threeb-launch')&&!document.querySelector('.threeb-app-content[data-launch-hidden="true"]'));
  check('Direct link bypasses cinema overlay '+width,await page.locator('.threeb-launch').count()===0);
  check('Home stays within a single viewport '+width,await home.evaluate(el=>{
   const a=el.getBoundingClientRect();return a.height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3;
  }));
  check('22-card homepage replaced by a living scene '+width,await home.locator('.world3b-universe').count()===0&&await home.locator('.th-world-cosmos').isVisible());
  check('Eight authentic narrative realms '+width,await home.locator('.th-world-realms-line button').count()===8);
  check('All primary controls present '+width,await home.locator('.th-world-earth-controls button').count()===4);
  check('Mobile navigation does not obscure the world '+width,await page.locator('.mobile-navigation').isHidden());
  check('World menu launch always visible '+width,await home.getByRole('button',{name:'Ouvrir tous les univers 3B'}).isVisible());
  const realm=home.locator('.th-world-realm-insight h2');
  const first=await realm.innerText();
  await home.getByRole('button',{name:'Choisir le royaume Algérie'}).click();
  check('Realm selector changes kingdom '+width,(await realm.innerText())!==first);
  await home.getByRole('button',{name:'Agrandir la planète'}).click();
  await home.getByRole('button',{name:'Mettre la rotation en pause'}).click();
  check('Visual motion pause responds '+width,await home.getByRole('button',{name:'Relancer la rotation'}).getAttribute('aria-pressed')==='true');
  await home.getByRole('button',{name:'Relancer la rotation'}).click();
  const fallback=home.locator('.th-earth-fallback');
  if(await fallback.isVisible()){
   const prev=await realm.innerText();
   await fallback.click();
   check('NASA globe fallback still selects a real realm '+width,(await realm.innerText())!==prev);
  }
  await page.screenshot({path:path.join(out,'3b-world-'+width+'.png'),animations:'disabled',scale:'css'});
  await home.getByRole('button',{name:'Ouvrir tous les univers 3B'}).click();
  const dialog=page.locator('dialog#universe-menu');await dialog.waitFor({state:'visible'});
  check('Menu opens over the scene without page scrolling '+width,await dialog.evaluate(el=>{
   const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;
  }));
  const tabs=dialog.locator('.app-menu-categories');
  check('Eight categories in a single swipe rail '+width,await tabs.evaluate(el=>{
   const rows=[...el.children].map(btn=>Math.round(btn.getBoundingClientRect().top));
   return getComputedStyle(el).display==='flex'&&new Set(rows).size===1&&rows.length>=8;
  }));
  check('No framed menu cards '+width,await dialog.locator('.app-menu-route').evaluateAll(items=>items.every(x=>getComputedStyle(x).borderTopWidth==='0px')));
  const destinations=await dialog.locator('.app-menu-route').count();
  check('Menu contains real routable destinations '+width,destinations>4);
  await dialog.getByRole('tab',{name:'Jeux & sport',exact:true}).click();
  check('Sport, games and 16-18 remain accessible '+width,await dialog.locator('[data-menu-id="games"]').count()===1&&await dialog.locator('[data-menu-id="sport"]').count()===1&&await dialog.locator('[data-menu-id="esports"]').count()===1);
  await dialog.getByRole('searchbox').fill('scanner alimentaire');
  check('Accessible search finds actual scanner '+width,await dialog.locator('[data-menu-id="foodscan"]').count()===1);
  await dialog.getByRole('searchbox').fill('');
  await dialog.getByRole('tab',{name:'Essentiel',exact:true}).click();
  await page.screenshot({path:path.join(out,'3b-menu-'+width+'.png'),animations:'disabled',scale:'css'});
  await dialog.getByRole('button',{name:'Fermer le menu'}).click();await dialog.waitFor({state:'hidden'});
  check('Menu closes back to world '+width,await home.isVisible());
  await home.getByRole('link',{name:'Albert APEX'}).first().click();
  await page.waitForURL(u=>u.hash==='#albert-3b');
  const albert=page.locator('.th-albert-screen');await albert.waitFor({state:'visible'});
  check('Albert remains an honest local guide '+width,await albert.locator('.albert3b-status').innerText().then(s=>s.includes('non connecté')));
  check('Albert cinematic portrait '+width,await albert.locator('.albert3b-portrait-svg').isVisible());
  check('Albert also fits in one viewport '+width,await albert.evaluate(el=>{
   const r=el.getBoundingClientRect();return r.height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3;
  }));
  check('Floating companion does not cover Albert conversation '+width,await page.locator('.companion3b-shell').count()===0);
  await albert.locator('#albert3b-input').fill('jeux');
  await albert.getByRole('button',{name:'Envoyer ma question'}).click();
  check('Albert opens real game route '+width,await albert.locator('.albert3b-reply-link').last().getAttribute('href').then(h=>h?.includes('#jeux')));
  await albert.getByRole('button',{name:'Explorer'}).click();
  check('Curated experiences open on request '+width,await albert.locator('.albert3b-curated').isVisible());
  await albert.getByRole('button',{name:'Ma journée'}).click();
  check('Real private timeline opens on request '+width,await albert.locator('.th-albert-agenda').isVisible());
  await albert.getByRole('button',{name:'Dialoguer'}).click();
  check('Albert dialogue resumes '+width,await albert.locator('.albert3b-form').isVisible());
  await page.screenshot({path:path.join(out,'3b-albert-'+width+'.png'),animations:'disabled',scale:'css'});
  await context.close();
 }
 check('No uncaught JS errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,errors,out}));
}finally{await browser.close();await server.close();}
