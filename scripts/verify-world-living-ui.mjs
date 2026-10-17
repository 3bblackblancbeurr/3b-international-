// Concept 13 atlas + Albert: real browser acceptance, no production writes.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5353,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5353',out=process.env.WORLD_LIVING_QA_OUT||'/tmp/3b-world-living-qa';
await mkdir(out,{recursive:true});
const checks=[],errors=[];
function check(label,value){assert.ok(value,label);checks.push(label);console.log('PASS',label)}
try{
 for(const [width,height] of [[320,568],[320,650],[360,800],[390,844],[393,873],[768,1024],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<720,hasTouch:width<720,deviceScaleFactor:width<720?2:1,
   reducedMotion:width===320?'reduce':'no-preference'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(width+': '+e.message));
  await page.goto(origin+'/#accueil',{waitUntil:'domcontentloaded',timeout:55000});
  const home=page.locator('.atlas3b');await home.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.threeb-launch')&&!document.querySelector('.threeb-app-content[data-launch-hidden="true"]'));
  check('Direct link bypasses cinema overlay '+width,await page.locator('.threeb-launch').count()===0);
  check('Atlas fits a single phone viewport '+width,await home.evaluate(el=>{
   const r=el.getBoundingClientRect();return r.height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3&&document.documentElement.scrollWidth<=innerWidth+3;
  }));
  check('Atlas replaces the scrolling 22-card home '+width,await home.locator('.world3b-universe,.th-world-cosmos,.home-app-hub').count()===0);
  check('Eight canonical realms in image rail '+width,await home.locator('.atlas3b-realm').count()===8);
  check('All 22 real modules linked '+width,await home.locator('.atlas3b-module-link').count()===22);
  check('Four functional world categories '+width,await home.getByRole('tablist',{name:'Explorer les grandes expériences 3B'}).getByRole('tab').count()===4);
  check('NASA night map self-hosted '+width,await home.locator('.atlas3b-earth-photo').evaluate(e=>e.complete&&e.naturalWidth>0));
  check('Map visual pins aligned with image '+width,await home.evaluate(el=>{
   const im=el.querySelector('.atlas3b-earth-photo').getBoundingClientRect();
   return [...el.querySelectorAll('.atlas3b-map-pin')].every(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return x>=im.left&&x<=im.right&&y>=im.top&&y<=im.bottom;});
  }));
  check('Mobile navigation does not obscure the atlas '+width,await page.locator('.mobile-navigation').isHidden());
  await home.getByRole('button',{name:'Explorer Afrique du Nord dans les royaumes 3B'}).click();
  check('Map pin selects the Moroccan narrative realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(s=>s.includes('Maroc')));
  await page.screenshot({path:path.join(out,'3b-world-'+width+'.png'),animations:'disabled',scale:'css'});
  if(width>690){
   await home.getByRole('button',{name:'Maroc Noblesse'}).click();
   check('Country rail selects a canonical realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(t=>t.includes('Maroc')));
  }else{
   await home.getByRole('searchbox',{name:'Rechercher un pays ou un univers 3B'}).fill('maroc');
   await home.locator('.atlas3b-search-results').getByRole('button',{name:/Maroc/}).click();
   check('Country search selects canonical realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(t=>t.includes('Maroc')));
  }
  await home.getByRole('tab',{name:'Communauté',exact:true}).click();
  check('Community experience tab opens with real route '+width,await home.getByRole('link',{name:/Espace communauté/}).isVisible());
  await home.getByRole('tab',{name:'Monde',exact:true}).click();
  await home.getByRole('button',{name:'Afficher les 22 univers 3B'}).click();
  const directory=home.locator('.atlas3b-directory');await directory.waitFor({state:'visible'});
  check('All modules appear in accessible directory '+width,await directory.locator('.atlas3b-directory-grid a').count()===22);
  await directory.getByRole('button',{name:'Fermer les univers'}).click();
  await directory.waitFor({state:'hidden'});
  await home.getByRole('button',{name:'Ouvrir le menu général 3B'}).click();
  const menu=page.locator('#universe-menu');await menu.waitFor({state:'visible'});
  check('Menu opens over atlas without scrolling '+width,await menu.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}));
  check('Eight categories in a single swipe rail '+width,await menu.locator('.app-menu-categories').evaluate(e=>{
   const rows=[...e.children].map(btn=>Math.round(btn.getBoundingClientRect().top));
   return getComputedStyle(e).display==='flex'&&new Set(rows).size===1&&rows.length>=8;
  }));
  await menu.getByRole('tab',{name:'Jeux & sport',exact:true}).click();
  check('Sport, games and 16-18 remain accessible '+width,await menu.locator('[data-menu-id="games"]').count()===1&&await menu.locator('[data-menu-id="esports"]').count()===1);
  await menu.getByRole('searchbox').fill('scanner alimentaire');
  check('Accessible search finds actual scanner '+width,await menu.locator('[data-menu-id="foodscan"]').count()===1);
  await menu.getByRole('button',{name:'Fermer le menu'}).click();
  check('Menu closes back to atlas '+width,await home.isVisible());
  await page.screenshot({path:path.join(out,'3b-menu-'+width+'.png'),animations:'disabled',scale:'css'});
  await home.getByRole('link',{name:'Albert'}).first().click();
  await page.waitForURL(u=>u.hash==='#albert-3b');
  const albert=page.locator('.th-albert-screen');await albert.waitFor({state:'visible'});
  check('Albert is still honest about local guide '+width,await albert.locator('.albert3b-status').innerText().then(s=>s.includes('non connecté')));
  check('Albert hologram visible '+width,await albert.locator('.albert3b-apex-portrait').isVisible());
  check('Albert also fits in one viewport '+width,await albert.evaluate(el=>{const r=el.getBoundingClientRect();return r.height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3;}));
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
