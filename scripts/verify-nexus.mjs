import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'vite';

const output='artifacts/nexus';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4177','--strictPort'],{stdio:'inherit'});
const report={checks:[],errors:[],screenshots:[],note:'Chromium software WebGL; mobile viewport simulation, not a physical Samsung test. Visual screenshots are owned by verify-nexus-cinema.mjs.'};
let browser,currentPage;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:4177/tests/nexus-fixture.html');if(r.ok)return;}catch{}await sleep(200);}throw new Error('Vite did not start');}
async function checkpoint(name){report.screenshots.push(`${name}:covered-by-cinema-suite`);}
async function open(page){currentPage=page;await page.goto('http://127.0.0.1:4177/tests/nexus-fixture.html');await page.locator('#open').click({noWaitAfter:true});await page.waitForFunction(()=>!!document.querySelector('dialog.nexus-experience[open]'),undefined,{timeout:10000,polling:50});}
async function skip(page){
  await page.waitForFunction(()=>!!document.querySelector('dialog.nexus-experience[open]'),undefined,{timeout:10000,polling:50});
  for(let i=0;i<30;i++){
    const phase=await page.evaluate(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase||null);
    if(phase==='nexus')return;
    await page.evaluate(()=>document.querySelector('dialog.nexus-experience[open] [data-nexus-skip="true"]')?.click());
    await sleep(100);
  }
  await page.waitForFunction(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase==='nexus',undefined,{timeout:10000,polling:50});
}
async function enable3d(page){
  const mode=await page.locator('dialog.nexus-experience[open]').getAttribute('data-visual-mode');
  if(mode!=='3d')await page.getByRole('button',{name:'Voir le sanctuaire en 3D',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.visualMode==='3d',undefined,{timeout:10000,polling:50});
  await page.waitForFunction(()=>['3d','fallback'].includes(document.querySelector('dialog.nexus-experience[open] .nexus-stage')?.dataset.renderer),undefined,{timeout:90000,polling:100});
}
async function pick(page,code){const codes=['FR','DZ','ES','MA','IT','TN','TR','EE'];const dialog=page.locator('dialog.nexus-experience[open]');await dialog.locator('.nexus-door-choice').nth(codes.indexOf(code)).click();await page.waitForFunction(expected=>document.querySelector('dialog.nexus-experience[open]')?.dataset.selected===expected,code,{timeout:10000,polling:50});}
async function countryArrival(page,code){await page.locator('dialog.nexus-experience[open] .nexus-enter-world').click();await page.locator(`.nexus-country-arrival[data-country="${code}"]`).waitFor({timeout:10000});}
async function navigateCountry(page,code){await countryArrival(page,code);await page.locator('.nexus-country-arrival .nexus-country-enter').click();await page.getByText('world3b',{exact:true}).waitFor({timeout:30000});}
function listen(page,allowWebGLFailure=false){page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',msg=>{if(msg.type()==='error'&&!(allowWebGLFailure&&/WebGL|context/i.test(msg.text())))report.errors.push(msg.text());});}
try{
  await ready();browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const page=await desktop.newPage();listen(page);await open(page);await checkpoint('desktop-ouverture');await skip(page);
  assert.equal(await page.locator('dialog.nexus-experience[open] .nexus-door-choice').count(),8);
  assert.equal(await page.locator('dialog.nexus-experience[open]').evaluate(d=>d.parentElement===document.body),true);
  await enable3d(page);assert.equal(await page.locator('dialog.nexus-experience[open] .nexus-stage').getAttribute('data-renderer'),'3d');
  const names=['France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie'];
  for(const [i,code] of ['FR','DZ','ES','MA','IT','TN','TR','EE'].entries()){
    await pick(page,code);assert.equal(await page.locator('dialog.nexus-experience[open] #nexus-title').textContent(),names[i]);
  }
  report.checks.push('Real 3D remains available from cinema mode; eight countries keep their title, guardian and value');
  await page.locator('dialog.nexus-experience[open] .nexus-origin-link').click();assert.equal(await page.locator('dialog.nexus-experience[open] .nexus-enter-world').isDisabled(),true);
  await page.getByRole('button',{name:'Revoir le tunnel Matrix'}).click();await page.waitForFunction(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase==='tunnel',undefined,{timeout:20000,polling:50});await skip(page);
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.nexus-experience[open]').count(),0);assert.equal(await page.evaluate(()=>document.activeElement?.id),'open');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  report.checks.push('ORIGINE stays locked; tunnel replay, Escape, focus and scroll restoration work');

  await page.locator('#open').click({noWaitAfter:true});await page.waitForFunction(()=>!!document.querySelector('dialog.nexus-experience[open]'));await skip(page);await pick(page,'FR');await countryArrival(page,'FR');
  assert.equal(await page.getByRole('heading',{name:'Bienvenue en France'}).isVisible(),true);await page.locator('.nexus-country-arrival .nexus-country-enter').click();await page.getByText('world3b',{exact:true}).waitFor({timeout:30000});
  assert.equal(await page.locator('#navigation-result').textContent(),'world3b');assert.equal(await page.evaluate(()=>localStorage.getItem('3b:nexus-country')),'FR');
  const savedRegion=await page.evaluate(async()=>{const {readLocal}=await import('/src/world/save.js');return readLocal(null)?.data?.region;});
  assert.equal(savedRegion,'france');report.checks.push('France cinematic arrival hands off to the canonical guest save before leaving the Nexus');
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});const phone=await mobile.newPage();listen(phone);await open(phone);await skip(phone);
  assert.equal(await phone.locator('dialog.nexus-experience[open]').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);await pick(phone,'EE');await countryArrival(phone,'EE');
  assert.equal(await phone.getByRole('heading',{name:'Bienvenue en Estonie'}).isVisible(),true);assert.equal(await phone.locator('.nexus-country-arrival').evaluate(node=>node.scrollWidth<=node.clientWidth+1),true);await phone.locator('.nexus-country-back').click();
  await phone.getByRole('button',{name:'Fermer le Nexus et revenir au passeport'}).click();report.checks.push('390×844: Estonie arrival is readable, reversible and has no horizontal overflow');await mobile.close();

  const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await fallback.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args);};});
  const simple=await fallback.newPage();listen(simple,true);await open(simple);await simple.locator('dialog.nexus-experience[open] .nexus-stage[data-renderer="fallback"]').waitFor({timeout:30000});await pick(simple,'DZ');await navigateCountry(simple,'DZ');assert.equal(await simple.locator('#navigation-result').textContent(),'world3b');report.checks.push('Without WebGL, cinema + Algeria arrival + canonical travel remain functional');await fallback.close();

  const appContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});const app=await appContext.newPage();currentPage=app;listen(app);await app.goto('http://127.0.0.1:4177/#passeport');
  const trigger=app.getByRole('button',{name:'Ouvrir le Cercle et entrer dans le Nexus 3B'});await trigger.waitFor({timeout:30000});await trigger.click({noWaitAfter:true});await app.locator('dialog.nexus-experience[open][data-visual-mode="cinema"]').waitFor({timeout:30000});
  await pick(app,'FR');await countryArrival(app,'FR');assert.equal(await app.getByRole('heading',{name:'Bienvenue en France'}).isVisible(),true);await app.locator('.nexus-country-back').click();await app.getByRole('button',{name:'Fermer le Nexus et revenir au passeport'}).click();assert.equal(await trigger.isVisible(),true);
  report.checks.push('Actual application: Passport -> V6 cinema -> France arrival -> return works at 390×844');await appContext.close();

  assert.deepEqual(report.errors,[],'Unexpected browser or shader errors');await build({build:{outDir:`${output}/fixture`,emptyOutDir:true,copyPublicDir:false,rollupOptions:{input:'tests/nexus-fixture.html'}}});report.checks.push('A production-compiled isolated fixture is included in the evidence archive');report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;if(currentPage&&!currentPage.isClosed())try{report.diagnostics=await currentPage.evaluate(()=>({phase:document.querySelector('dialog.nexus-experience')?.dataset,stage:document.querySelector('.nexus-stage')?.dataset,text:document.body.innerText}));}catch{}}
finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();server.kill('SIGTERM');}
