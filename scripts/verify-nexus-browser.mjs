import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const output='artifacts/nexus';await mkdir(output,{recursive:true});
const server=spawn('npm',['run','dev','--','--port','4173'],{stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
let browser;const results=[];
async function openNexus(page){
 await page.getByRole('button',{name:'Ouvrir mon passeport'}).click();
 // Observe the real automatic traversal. Trying to click a skip button while
 // it moves from scan to tunnel can race its removal after 3.3 seconds.
 await page.waitForSelector('.nx-shell[data-phase="nexus"][data-nexus-ready="true"]',{timeout:30000});
}
async function visibleDetail(page){
 assert.equal(await page.locator('.nx-detail').evaluate(e=>getComputedStyle(e).opacity),'1','New detail must remain visible while the 3D world is paused');
}
try{
 let available=false;for(let i=0;i<90;i++){try{const response=await fetch('http://127.0.0.1:4173/tests/fixtures/nexus.html');if(response.ok){available=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(available,'Vite fixture failed to start');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 for(const [name,width,height] of [['desktop',1440,960],['mobile',390,844],['small-mobile',320,640],['landscape',844,390]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('http://127.0.0.1:4173/tests/fixtures/nexus.html');await openNexus(page);
  assert.equal(await page.locator('.nx-fallback').count(),0,`${name}: unexpected WebGL fallback`);
  assert.equal(await page.locator('.nx-stage canvas').count(),1);
  assert.equal(await page.getByRole('navigation',{name:'Les huit portes du Nexus'}).getByRole('button').count(),8);
  await page.getByRole('button',{name:'Mettre les animations en pause'}).click();
  await page.screenshot({path:`${output}/${name}-overview.png`,fullPage:true});
  for(const label of ['France — Justice','Algérie — Loyauté','Espagne — Passion','Maroc — Noblesse','Italie — Espoir','Tunisie — Courage','Turquie — Foi','Estonie — Sagesse']){
    await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed'),'true');await visibleDetail(page);
  }
  await page.getByRole('button',{name:'France — Justice',exact:true}).click();await page.screenshot({path:`${output}/${name}-france.png`,fullPage:true});
  const geometry=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('.nx-topbar button,.nx-detail button,.nx-countries button,.nx-origin')];return nodes.map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};});});
  for(const item of geometry){assert.ok(item.x>=-1&&item.right<=width+1&&item.y>=-1&&item.bottom<=height+1,`${name}: clipped control ${JSON.stringify(item)}`);}
  const overlap=await page.evaluate(()=>{const a=document.querySelector('.nx-detail').getBoundingClientRect(),b=document.querySelector('.nx-countries').getBoundingClientRect();return a.bottom>b.top+1&&a.top<b.bottom&&a.right>b.left&&a.left<b.right;});assert.equal(overlap,false,`${name}: detail covers country controls`);
  await page.getByRole('button',{name:'Découvrir la porte secrète ORIGINE, verrouillée'}).click();assert.equal(await page.getByRole('button',{name:'Réunir les huit clés'}).isDisabled(),true);await visibleDetail(page);
  await page.screenshot({path:`${output}/${name}-origine.png`,fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#open-nexus').evaluate(e=>e===document.activeElement),true);
  await openNexus(page);await page.getByRole('button',{name:'Algérie — Loyauté',exact:true}).click();await page.getByRole('button',{name:'Franchir la porte'}).click();
  assert.equal(await page.evaluate(()=>window.__nexusDestination),'world3b');assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('3b:nexus-visit-v1')).code),'DZ');
  assert.deepEqual(errors,[],`${name}: browser errors`);results.push({name,status:'passed',width,height,errors});await context.close();
 }
 const calm=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const cp=await calm.newPage();await cp.goto('http://127.0.0.1:4173/tests/fixtures/nexus.html?calm=1');await openNexus(cp);assert.equal(await cp.locator('.nx-transition').count(),0);await cp.screenshot({path:`${output}/reduced-motion.png`});results.push({name:'reduced-motion',status:'passed'});await calm.close();
 const fallback=await browser.newContext({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:original.call(this,type,...args);};});
 const fp=await fallback.newPage();await fp.goto('http://127.0.0.1:4173/tests/fixtures/nexus.html?calm=1');await openNexus(fp);await fp.waitForSelector('.nx-fallback');await fp.getByRole('button',{name:'Italie — Espoir',exact:true}).click();assert.equal(await fp.getByRole('button',{name:'Franchir la porte'}).isEnabled(),true);await fp.screenshot({path:`${output}/no-webgl-fallback.png`});results.push({name:'no-webgl-fallback',status:'passed'});await fallback.close();
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(error){await writeFile(`${output}/failure.txt`,error.stack||String(error));await writeFile(`${output}/partial-results.json`,JSON.stringify(results,null,2));throw error;}
finally{await writeFile(`${output}/vite.log`,serverLog);await browser?.close();server.kill('SIGTERM');}
