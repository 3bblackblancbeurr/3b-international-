// Isolated browser recipe. External requests are blocked; no user account is used.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const port=Number(process.env.GAMES_RELIGION_UI_PORT||5367),origin='http://127.0.0.1:'+port;
const output=path.resolve(process.env.GAMES_RELIGION_UI_OUT||'artifacts/application-ui/games-religion');
const corpus=JSON.parse(await readFile(new URL('../src/religion/corpus.json',import.meta.url),'utf8'));
const server=await createServer({cacheDir:'node_modules/.vite-games-religion-ui',server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const fits=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
async function setup(context){await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());}
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce',acceptDownloads:true});await setup(context);
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
  const prefix=width+': ';
  await page.goto(origin+'/tests/games-premium-preview.html',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('.premium-library .premium-game-card').first().waitFor({timeout:90000});
  check(prefix+'all eight actual games keep their own cover',await page.locator('.premium-cover-image').count()===8);
  const sizes=[];
  for(const card of await page.locator('.premium-game-card').all()){
   await card.scrollIntoViewIfNeeded();
   await card.locator('img').evaluate(image=>image.decode());
   sizes.push(await card.locator('.premium-card-art').evaluate(art=>{const image=art.querySelector('img'),r=art.getBoundingClientRect();return{ratio:r.width/r.height,loaded:image.complete&&image.naturalWidth===960,sprite:art.querySelector('.premium-card-sprite')!==null};}));
  }
  check(prefix+'covers load with one consistent 3:2 composition',sizes.every(size=>size.loaded&&Math.abs(size.ratio-1.5)<.01&&!size.sprite));
  check(prefix+'game library has no page overflow',await fits(page));
  const dada=page.locator('[data-game="dada3b"].premium-game-card');
  await dada.scrollIntoViewIfNeeded();await dada.screenshot({path:path.join(output,'dada-premium-'+width+'.png')});
  await page.locator('.premium-library').screenshot({path:path.join(output,'collection-jeux-'+width+'.png')});
  await dada.click();await page.locator('.dada3b-topbar').waitFor();
  check(prefix+'Dada cover still launches the actual Dada menu',await page.locator('.dada3b-topbar').innerText().then(text=>text.includes('DADA 3B')));
  await page.locator('.dada3b-topbar .dada3b-icon-button').last().click();
  await page.locator('[data-game="penalty-rush"].premium-game-card').click();
  check(prefix+'Penalty keeps its internal game navigation',await page.locator('body').getAttribute('data-game')==='penalty-rush');

  await page.goto(origin+'/religion-tree.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('tab',{name:'Vue schéma',exact:true}).waitFor({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#tree-app')?.dataset.discoveryMounted==='true');
  check(prefix+'all three presentation tabs are keyboard accessible',await page.getByRole('tab').count()===3);
  check(prefix+'tree renderer remains visible by default',await page.locator('#stage').isVisible()&&await page.locator('#stage canvas').count()===1);
  await page.locator('.tree-experience').screenshot({path:path.join(output,'arbre-volume-'+width+'.png')});
  await page.getByRole('tab',{name:'Vue schéma',exact:true}).click();await page.locator('.diagram-node').first().waitFor();
  check(prefix+'diagram is a distinct readable view',await page.locator('#diagram').isVisible()&&!await page.locator('#stage').isVisible());
  check(prefix+'literary succession is an explicit optional layer',!await page.locator('[data-diagram-literary]').isChecked()&&await page.locator('.diagram-edge.lineage').count()===0);
  check(prefix+'diagram search remains iPhone readable',await page.locator('#search').evaluate(input=>parseFloat(getComputedStyle(input).fontSize)>=16));
  await page.locator('[data-diagram-scope]').selectOption('all');await page.locator('[data-diagram-literary]').check();
  check(prefix+'whole chart preserves the complete existing corpus',await page.locator('.diagram-node').count()===corpus.nodes.length&&await page.locator('.diagram-edge').count()===corpus.edges.length);
  await page.locator('#search').fill('MOISE');
  check(prefix+'accent insensitive search keeps documentary context',await page.locator('.diagram-node.match[data-person="moise"]').count()===1&&/1 résultat de recherche, contexte conservé/.test(await page.locator('.diagram-context').innerText()));
  await page.locator('[data-diagram-scope]').selectOption('around');
  await page.locator('.diagram-node[data-person="moise"]').click();await page.locator('#detail h2').waitFor();
  check(prefix+'diagram selects the same sourced biography',await page.locator('#detail h2').innerText()==='Moïse'&&await page.locator('#detail .source').count()>0&&new URL(page.url()).hash==='#moise');
  await page.getByRole('tab',{name:'Arbre en volume',exact:true}).click();
  check(prefix+'selected biography survives changing the presentation',await page.locator('#detail h2').innerText()==='Moïse'&&await page.locator('#stage').isVisible());
  await page.getByRole('tab',{name:'Vue schéma',exact:true}).click();
  check(prefix+'selected figure is highlighted when returning to the diagram',await page.locator('.diagram-node.selected[data-person="moise"]').count()===1);
  await page.locator('#close-detail').click();
  check(prefix+'closing the biography restores a meaningful graph focus',await page.evaluate(()=>document.activeElement?.classList.contains('diagram-node')));
  const scale=await page.locator('[data-diagram-scale]').innerText();await page.getByRole('button',{name:'Agrandir le schéma',exact:true}).click();
  check(prefix+'diagram has working independent zoom',await page.locator('[data-diagram-scale]').innerText()!==scale);
  await page.locator('#search').fill('muhammad');await page.locator('[data-diagram-scope]').selectOption('ancestors');
  check(prefix+'missing ancestry is not invented',await page.locator('.diagram-node').count()===1&&await page.locator('.diagram-edge').count()===0);
  await page.locator('#search').fill('');await page.locator('[data-diagram-scope]').selectOption('around');
  await page.locator('#branch').selectOption('origins');
  check(prefix+'shared branch filter applies to the diagram',await page.locator('.diagram-node').evaluateAll((nodes,ids)=>nodes.every(node=>ids.includes(node.dataset.person)),corpus.nodes.slice(0,25).map(node=>node.id)));
  check(prefix+'diagram and details produce no page overflow',await fits(page));
  await page.locator('#branch').selectOption('all');await page.locator('#search').fill('abraham');
  check(prefix+'multiple search matches move the context away from a stale figure',await page.locator('.diagram-context strong').innerText()==='Abraham'&&await page.locator('.diagram-search-results [data-person="abraham"]').count()===1);
  await page.getByRole('button',{name:'Recentrer',exact:true}).click();
  await page.locator('.tree-experience').screenshot({path:path.join(output,'vue-schema-'+width+'.png')});
  await page.getByRole('tab',{name:'Vue schéma',exact:true}).focus();await page.keyboard.press('ArrowRight');
  check(prefix+'arrow keys switch tabs and preserve roving focus',await page.getByRole('tab',{name:'Index des figures',exact:true}).getAttribute('aria-selected')==='true');
  await page.locator('#search').fill('eve');
  check(prefix+'shared search also works in the index',await page.locator('#list [data-person="eve"]').count()===1);
  await page.locator('#list [data-person="eve"]').click();await page.locator('#detail .discovery-export').waitFor();
  const pending=page.waitForEvent('download');await page.locator('#detail .discovery-export').click();const file=await pending;
  const filename=path.join(output,'fiche-eve-'+width+'.json');await file.saveAs(filename);const record=JSON.parse(await readFile(filename,'utf8'));
  check(prefix+'original documentary export still contains the figure and sources',record.person.id==='eve'&&record.person.sources.length>0);
  await context.close();
 }
 // The chart remains usable without WebGL; no genealogy depends on rendering hardware.
 const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await setup(fallback);
 await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
 const page=await fallback.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/religion-tree.html?view=diagram#marie',{waitUntil:'domcontentloaded'});await page.locator('.diagram-node').first().waitFor();
 check('software fallback preserves the shared selection and chart',await page.locator('#stage').getAttribute('data-renderer')==='software-3d'&&await page.locator('.diagram-node.selected[data-person="marie"]').count()===1);
 check('no browser JavaScript exceptions',errors.length===0);
 await writeFile(path.join(output,'games-religion-results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
 console.log('Completed',checks.length,'browser assertions.');
}catch(error){
 await writeFile(path.join(output,'games-religion-failure.json'),JSON.stringify({checks,errors,error:error.stack},null,2));throw error;
}finally{await browser.close();await server.close();}
