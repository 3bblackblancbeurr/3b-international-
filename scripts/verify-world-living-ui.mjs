// Scrollable Concept 13 atlas + Albert: real browser acceptance, no production writes.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WORLD_MODULES} from '../src/components/world-living-data.js';
import {PAGE_HASHES} from '../src/lib/navigation.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5353,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5353',out=process.env.WORLD_LIVING_QA_OUT||path.resolve('work/world-living-qa');
await mkdir(out,{recursive:true});
const checks=[],errors=[];
let currentPage=null,currentViewport='';
function check(label,value){assert.ok(value,label);checks.push(label);console.log('PASS',label)}
async function reachableControls(controls){
 const failures=[];
 for(let i=0;i<await controls.count();i++){
  const control=controls.nth(i);
  const label=await control.getAttribute('aria-label')||await control.textContent();
  if(!await control.isVisible()){failures.push(label+' (hidden)');continue;}
  await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  const geometry=await control.evaluate(el=>{
   const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   const hit=document.elementFromPoint(x,y);
   return {usable:r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&Boolean(hit&&(hit===el||el.contains(hit))),hit:hit?.className?.baseVal||hit?.className||hit?.tagName,x:Math.round(x),y:Math.round(y)};
  });
  if(!geometry.usable)failures.push(label+' (clipped or covered: '+JSON.stringify(geometry)+')');
 }
 assert.deepEqual(failures,[],'Controls must remain reachable after scrolling');
 return true;
}
async function homeReady(page){
 const home=page.locator('.atlas3b');await home.waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('.threeb-launch')&&!document.querySelector('.threeb-app-content[data-launch-hidden="true"]'));
 return home;
}
async function noHorizontalOverflow(page){
 return page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2&&document.body.scrollWidth<=innerWidth+2);
}
try{
 for(const [width,height] of [[320,568],[320,650],[360,800],[390,844],[393,873],[768,1024],[1440,1000]]){
  const captureKey=width+'x'+height;
  const context=await browser.newContext({viewport:{width,height},isMobile:width<720,hasTouch:width<720,deviceScaleFactor:width<720?2:1,
   reducedMotion:width===320?'reduce':'no-preference'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await context.newPage();currentPage=page;currentViewport=width+'x'+height;page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(width+': '+e.message));
  await page.goto(origin+'/#accueil',{waitUntil:'domcontentloaded',timeout:55000});
  const home=await homeReady(page);
  check('Direct link bypasses cinema overlay '+width,await page.locator('.threeb-launch').count()===0);
  check('Scrollable atlas has no horizontal page overflow '+width,await noHorizontalOverflow(page));
  check('Hero map has at least 400 pixels of space '+width,await home.locator('.atlas3b-stage').evaluate(el=>el.getBoundingClientRect().height>=400));
  check('Atlas can scroll to every universe '+width,await home.evaluate(el=>{
   const r=el.getBoundingClientRect();return r.height>innerHeight&&document.documentElement.scrollHeight>innerHeight&&el.scrollHeight<=r.height+2;
  }));
  check('Eight canonical realms in image rail '+width,await home.locator('.atlas3b-realm').count()===8);
  check('All 22 real modules linked '+width,await home.locator('.atlas3b-module-link').count()===22);
  check('Map and favorite controls have 44 pixel touch targets '+width,await home.locator('.atlas3b-map-pin,.atlas3b-favorite').evaluateAll(elements=>elements.every(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44;})));
  check('Atlas search avoids automatic iPhone zoom '+width,await home.locator('input[type=search]').evaluateAll(elements=>elements.every(el=>parseFloat(getComputedStyle(el).fontSize)>=16)));
  check('Only the selected exploration arc animates '+width,await home.locator('.atlas3b-flight-line').count()===1&&await home.locator('.atlas3b-flight-line.is-active').count()===1);
  const expectedHashes=WORLD_MODULES.map(item=>'#'+PAGE_HASHES[item.id]).sort();
  const moduleHrefs=await home.locator('.atlas3b-module-link').evaluateAll(links=>links.map(link=>link.href));
  check('All 22 module links use unique canonical local routes '+width,
   new Set(moduleHrefs).size===22&&moduleHrefs.every(href=>new URL(href).origin===origin)&&
   JSON.stringify(moduleHrefs.map(href=>new URL(href).hash).sort())===JSON.stringify(expectedHashes));
  check('All universes use a responsive grid '+width,await home.locator('.atlas3b-module-grid,.atlas3b-module-rail').first().evaluate(el=>{
   const style=getComputedStyle(el);return style.display==='grid'&&style.gridTemplateColumns.split(' ').length>=2&&el.scrollWidth<=el.clientWidth+2;
  }));
  check('Four functional world categories '+width,await home.getByRole('tablist',{name:'Explorer les grandes expériences 3B'}).getByRole('tab').count()===4);
  const worldTab=home.getByRole('tab',{name:'Monde',exact:true});
  await worldTab.focus();await worldTab.press('ArrowRight');
  check('World tabs expose selection and keyboard focus '+width,await home.getByRole('tab',{name:'Hubs 3B',exact:true}).evaluate(el=>el.getAttribute('aria-selected')==='true'&&document.activeElement===el));
  await home.getByRole('tab',{name:'Hubs 3B',exact:true}).press('ArrowLeft');
  check('World tab is restored with the keyboard '+width,await worldTab.getAttribute('aria-selected')==='true');
  const panelId=await worldTab.getAttribute('aria-controls');
  check('Selected world tab labels an existing panel '+width,Boolean(panelId)&&await page.locator('#'+panelId).getAttribute('role')==='tabpanel'&&await page.locator('#'+panelId).getAttribute('aria-labelledby')===await worldTab.getAttribute('id'));
  await page.waitForFunction(()=>{const e=document.querySelector('.atlas3b-earth-photo');return e?.complete&&e.naturalWidth>0;}).catch(async error=>{
   console.error('World artwork load diagnostics',await home.locator('.atlas3b-earth-photo').evaluate(e=>({src:e.src,currentSrc:e.currentSrc,complete:e.complete,naturalWidth:e.naturalWidth})));
   throw error;
  });
  check('Earth artwork is loaded from the local app '+width,await home.locator('.atlas3b-earth-photo').evaluate(e=>e.complete&&e.naturalWidth>0&&new URL(e.currentSrc).origin===location.origin));
  check('Map visual pins aligned with image '+width,await home.evaluate(el=>{
   const im=el.querySelector('.atlas3b-earth-photo').getBoundingClientRect();
   return [...el.querySelectorAll('.atlas3b-map-pin')].every(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return x>=im.left&&x<=im.right&&y>=im.top&&y<=im.bottom;});
  }));
  check('Mobile navigation does not obscure the atlas '+width,await page.locator('.mobile-navigation').isHidden());
  check('Hero controls and navigation remain clickable after scroll '+width,await reachableControls(home.locator('.atlas3b-header button:visible,.atlas3b-header a:visible,.atlas3b-find input,.atlas3b-tabs [role="tab"],.atlas3b-map-pin,.atlas3b-dock a,.atlas3b-dock button')));
  check('All 22 module controls remain reachable after scroll '+width,await reachableControls(home.locator('.atlas3b-module-link')));
  await home.getByRole('button',{name:'Explorer Afrique du Nord dans les royaumes 3B'}).click();
  check('Map pin selects the Moroccan narrative realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(s=>s.includes('Maroc')));
  await home.scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(out,'3b-world-'+captureKey+'.png'),animations:'disabled',scale:'css',fullPage:true});
  await page.screenshot({path:path.join(out,'3b-world-'+captureKey+'-viewport.png'),animations:'disabled',scale:'css'});
  if(width>690){
   await home.getByRole('button',{name:'Maroc Noblesse'}).click();
   check('Country rail selects a canonical realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(t=>t.includes('Maroc')));
  }else{
   await home.getByRole('searchbox',{name:'Rechercher un pays ou un espace 3B'}).fill('maroc');
   await home.locator('.atlas3b-search-results').getByRole('button',{name:/Maroc/}).click();
   check('Country search selects canonical realm '+width,await home.locator('.atlas3b-map-caption').innerText().then(t=>t.includes('Maroc')));
  }
  await home.getByRole('tab',{name:'Communauté',exact:true}).click();
  check('Community experience tab opens with real route '+width,await home.getByRole('link',{name:/Espace communauté/}).isVisible());
  await home.getByRole('tab',{name:'Monde',exact:true}).click();
  const search=home.getByRole('searchbox',{name:'Rechercher un pays ou un espace 3B'});
  await search.fill('introuvable-qa-3b');
  check('Unknown search has an explicit empty state '+width,await home.locator('.atlas3b-search-results').innerText().then(s=>/aucun résultat/i.test(s)));
  await search.press('Escape');
  check('Escape clears search without navigating '+width,await search.inputValue()===''&&new URL(page.url()).hash==='#accueil');
  await search.fill('scanner alimentaire');
  check('Home search still includes real services beyond 22 modules '+width,await home.locator('.atlas3b-search-results').getByRole('button',{name:'Scanner alimentaire',exact:true}).isVisible());
  await search.fill('scanner code barre');
  check('Compound search matches terms across service aliases '+width,await home.locator('.atlas3b-search-results').getByRole('button',{name:'Scanner alimentaire',exact:true}).isVisible());
  await search.press('Escape');
  const modules=home.locator('.atlas3b-modules');
  const realmsRect=await home.locator('.atlas3b-realms').boundingBox(),modulesRect=await modules.boundingBox();
  check('Heritage images follow the service spaces '+width,realmsRect.y>=modulesRect.y+modulesRect.height);
  const filters=modules.getByRole('group',{name:'Catégories des espaces'});
  const moduleSearch=modules.getByRole('searchbox',{name:'Filtrer les espaces',exact:true});
  await moduleSearch.fill('sante');
  check('Module search ignores accents and filters the grid '+width,await modules.locator('.atlas3b-module-link').count()===1&&await modules.locator('.atlas3b-module-link').getAttribute('href').then(h=>h.endsWith('#sante')));
  await moduleSearch.fill('introuvable-qa-3b');
  check('Module search exposes an accessible empty state '+width,await modules.locator('.atlas3b-module-link').count()===0&&await modules.locator('.atlas3b-empty').isVisible());
  await moduleSearch.fill('');
  const favorite=modules.getByRole('button',{name:'Ajouter aux favoris : 3B Bons Plans',exact:true});
  check('Each universe has a labelled favorite control '+width,await modules.getByRole('button',{name:/^Ajouter aux favoris : .+$/}).count()===22);
  check('Favorite controls are not covered by the dock '+width,await reachableControls(modules.getByRole('button',{name:/^Ajouter aux favoris : .+$/})));
  await favorite.click();
  check('Favorite exposes its pressed state '+width,await modules.getByRole('button',{name:'Retirer des favoris : 3B Bons Plans',exact:true}).getAttribute('aria-pressed')==='true');
  check('Favorite action receives explicit feedback '+width,await home.locator('.atlas3b-action-feedback').innerText()==='3B Bons Plans ajouté à tes favoris.');
  await filters.getByRole('button',{name:'Mes favoris',exact:true}).click();
  check('Favorite filter shows the saved module only '+width,await modules.locator('.atlas3b-module-link').count()===1&&await modules.locator('.atlas3b-module-link').innerText().then(s=>s.includes('3B Bons Plans')));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3b_atlas_preferences_v1')||'null')?.favorites?.includes('deals'));
  await page.reload({waitUntil:'domcontentloaded'});await homeReady(page);
  await filters.getByRole('button',{name:'Mes favoris',exact:true}).click();
  check('Favorites persist after a full reload '+width,await modules.locator('.atlas3b-module-link').count()===1&&await modules.getByRole('button',{name:'Retirer des favoris : 3B Bons Plans',exact:true}).getAttribute('aria-pressed')==='true');
  await modules.getByRole('button',{name:'Retirer des favoris : 3B Bons Plans',exact:true}).click();
  check('Empty favorites provide feedback '+width,await modules.locator('.atlas3b-module-link').count()===0&&await modules.locator('.atlas3b-empty').isVisible()&&await modules.locator('.atlas3b-empty p').innerText().then(s=>s.trim().length>0));
  await filters.getByRole('button',{name:/^Tous?$|^Tout$/}).click();
  check('All modules return after clearing the favorite filter '+width,await modules.locator('.atlas3b-module-link').count()===22);
  await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('3b_atlas_preferences_v1')||'null')?.favorites?.includes('deals'));
  const passion=filters.getByRole('button',{name:/Passions|Jeux & passions/});
  await passion.click();
  const passionHashes=await modules.locator('.atlas3b-module-link').evaluateAll(links=>links.map(link=>new URL(link.href).hash).sort());
  check('Passion filter preserves the complete canonical group '+width,JSON.stringify(passionHashes)===JSON.stringify(WORLD_MODULES.filter(item=>item.group==='play').map(item=>'#'+PAGE_HASHES[item.id]).sort()));
  await filters.getByRole('button',{name:/^Tous?$|^Tout$/}).click();
  await page.reload({waitUntil:'domcontentloaded'});await homeReady(page);
  check('Removing a favorite also persists '+width,await modules.getByRole('button',{name:'Ajouter aux favoris : 3B Bons Plans',exact:true}).getAttribute('aria-pressed')==='false');
  if(width===390){
   const peer=await context.newPage();await peer.goto(origin+'/#accueil',{waitUntil:'domcontentloaded'});const peerHome=await homeReady(peer);
   await Promise.all([modules.getByRole('button',{name:'Ajouter aux favoris : Santé',exact:true}).click(),peerHome.getByRole('button',{name:'Ajouter aux favoris : Manga 3B',exact:true}).click()]);
   await page.waitForFunction(()=>{const favorites=JSON.parse(localStorage.getItem('3b_atlas_preferences_v1')||'null')?.favorites||[];return favorites.includes('health')&&favorites.includes('manga');});
   await page.waitForFunction(()=>document.querySelector('[aria-label="Retirer des favoris : Manga 3B"]')?.getAttribute('aria-pressed')==='true');
   await peer.waitForFunction(()=>document.querySelector('[aria-label="Retirer des favoris : Santé"]')?.getAttribute('aria-pressed')==='true');
   check('Independent favorites merge and appear across two tabs',await modules.getByRole('button',{name:'Retirer des favoris : Santé',exact:true}).getAttribute('aria-pressed')==='true'&&await peerHome.getByRole('button',{name:'Retirer des favoris : Manga 3B',exact:true}).getAttribute('aria-pressed')==='true');
   await modules.getByRole('button',{name:'Retirer des favoris : Santé',exact:true}).click();await peerHome.getByRole('button',{name:'Retirer des favoris : Manga 3B',exact:true}).click();
   await page.waitForFunction(()=>{const favorites=JSON.parse(localStorage.getItem('3b_atlas_preferences_v1')||'null')?.favorites||[];return !favorites.includes('health')&&!favorites.includes('manga');});await peer.close();
   check('Removing favorites preserves both explicit tab choices',await modules.locator('.atlas3b-favorite[aria-pressed=true]').count()===0);
  }
  await filters.getByRole('button',{name:'Passions',exact:true}).click();
  await moduleSearch.fill('jeux');
  check('Text search combines with the module category '+width,await modules.locator('.atlas3b-module-link').count()===1&&await modules.locator('.atlas3b-module-link').getAttribute('href').then(h=>h.endsWith('#jeux')));
  await home.getByRole('button',{name:'Afficher tous les espaces 3B'}).click();
  const directory=home.locator('.atlas3b-directory');await directory.waitFor({state:'visible'});
  check('All modules appear in accessible directory '+width,await directory.locator('.atlas3b-directory-grid a').count()===22);
  check('Opening all universes resets previous grid filters '+width,await moduleSearch.inputValue()===''&&await filters.getByRole('button',{name:'Tous',exact:true}).getAttribute('aria-pressed')==='true');
  await directory.getByRole('button',{name:'Fermer les espaces'}).click();
  await directory.waitFor({state:'hidden'});
  check('Closing universes restores its opener focus '+width,await home.getByRole('button',{name:'Afficher tous les espaces 3B'}).evaluate(el=>document.activeElement===el));
  check('Filtering and dialogs do not cause horizontal overflow '+width,await noHorizontalOverflow(page));
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
  await page.screenshot({path:path.join(out,'3b-menu-'+captureKey+'.png'),animations:'disabled',scale:'css'});
  await menu.getByRole('button',{name:'Fermer le menu'}).click();
  check('Menu closes back to atlas '+width,await home.isVisible());
  await home.getByRole('link',{name:'Albert'}).first().click();
  await page.waitForURL(u=>u.hash==='#albert-3b');
  const albert=page.locator('.th-albert-screen');await albert.waitFor({state:'visible'});
  check('Albert opens its generalist conversation '+width,await albert.getByRole('region',{name:'Conversation IA avec Albert'}).isVisible());
  check('Albert guest account action is explicit '+width,await albert.getByRole('button',{name:'Me connecter'}).isVisible());
  check('Albert conversation can scroll without horizontal overflow '+width,await noHorizontalOverflow(page));
  check('Albert composer belongs to a scrollable page '+width,await albert.evaluate(el=>el.scrollHeight<=el.getBoundingClientRect().height+2&&document.documentElement.scrollHeight>innerHeight));
  check('Albert hologram visible '+width,await albert.locator('.albert3b-apex-portrait').isVisible());
  await page.screenshot({path:path.join(out,'3b-albert-ia-'+captureKey+'.png'),animations:'disabled',scale:'css',fullPage:true});
  await albert.getByRole('button',{name:'Guide 3B',exact:true}).click();
  check('Albert guide keeps its local mode explicit '+width,await albert.locator('.albert3b-status').innerText().then(s=>s.includes('non connecté')));
  check('Albert local guide fits in one viewport '+width,await albert.evaluate(el=>{const r=el.getBoundingClientRect();return r.height<=innerHeight+2&&document.documentElement.scrollHeight<=innerHeight+3;}));
  check('Floating companion does not cover Albert conversation '+width,await page.locator('.companion3b-shell').count()===0);
  await albert.locator('#albert3b-input').fill('jeux');
  await albert.getByRole('button',{name:'Envoyer ma question'}).click();
  check('Albert opens real game route '+width,await albert.locator('.albert3b-reply-link').last().getAttribute('href').then(h=>h?.includes('#jeux')));
  await albert.getByRole('button',{name:'Explorer'}).click();
  check('Curated experiences open on request '+width,await albert.locator('.albert3b-curated').isVisible());
  await albert.getByRole('button',{name:'Ma journée'}).click();
  check('Real private timeline opens on request '+width,await albert.locator('.th-albert-agenda').isVisible());
  await albert.getByRole('button',{name:'Guide 3B',exact:true}).click();
  check('Albert dialogue resumes '+width,await albert.locator('.albert3b-form').isVisible());
  await page.screenshot({path:path.join(out,'3b-albert-'+captureKey+'.png'),animations:'disabled',scale:'css'});
  await context.close();currentPage=null;
 }
 check('No uncaught JS errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,errors,out}));
}catch(error){
 if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:path.join(out,'3b-failure-'+currentViewport+'.png'),animations:'disabled',scale:'css',fullPage:true}).catch(()=>{});
 throw error;
}finally{await browser.close();await server.close();}
