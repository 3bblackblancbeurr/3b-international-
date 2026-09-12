import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'vite';

const output='artifacts/nexus';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4177','--strictPort'],{stdio:'inherit'});
const report={checks:[],errors:[],screenshots:[],note:'Chromium software WebGL; mobile viewport simulation, not a physical Samsung test.'};
let browser,currentPage;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:4177/tests/nexus-fixture.html');if(r.ok)return;}catch{}await sleep(200);}throw new Error('Vite did not start');}
async function screenshot(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:false,timeout:30000});report.screenshots.push(name);}
async function open(page){currentPage=page;await page.goto('http://127.0.0.1:4177/tests/nexus-fixture.html');await page.locator('#open').click();await page.locator('dialog.nexus-experience[open]').waitFor();}
async function skip(page){const skip=page.getByRole('button',{name:'Passer l’introduction'});if(await skip.count())await skip.click();await page.locator('.nexus-experience[data-phase="nexus"]').waitFor();}
async function webgl(page){await page.locator('.nexus-stage[data-renderer="3d"]').waitFor({timeout:30000});}
async function pick(page,code){const codes=['FR','DZ','ES','MA','IT','TN','TR','EE'];await page.locator('.nexus-door-choice').nth(codes.indexOf(code)).click();await page.locator(`.nexus-experience[data-selected="${code}"]`).waitFor();}
function listen(page,allowWebGLFailure=false){page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',msg=>{if(msg.type()==='error'&&!(allowWebGLFailure&&/WebGL|context/i.test(msg.text())))report.errors.push(msg.text());});}
try{
  await ready();browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await desktop.addInitScript(()=>{window.__nexusPhases=[];new MutationObserver(()=>{const d=document.querySelector('.nexus-experience');const phase=d?.dataset.phase;if(phase&&window.__nexusPhases.at(-1)?.phase!==phase)window.__nexusPhases.push({phase,time:performance.now()});}).observe(document,{attributes:true,childList:true,subtree:true,attributeFilter:['data-phase']});});
  const page=await desktop.newPage();listen(page);await open(page);await screenshot(page,'desktop-ouverture');await skip(page);await webgl(page);
  report.initialPhases=await page.evaluate(()=>window.__nexusPhases);
  assert.equal(await page.locator('.nexus-door-choice').count(),8);assert.equal(await page.locator('dialog.nexus-experience').evaluate(d=>d.parentElement===document.body),true);
  await page.getByRole('button',{name:'Mettre les animations en pause',exact:true}).click();await screenshot(page,'desktop-sanctuaire');
  const names=['France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie'];
  for(const [i,code] of ['FR','DZ','ES','MA','IT','TN','TR','EE'].entries()){
    await pick(page,code);assert.equal(await page.locator('#nexus-title').textContent(),names[i]);await screenshot(page,`desktop-${code}`);
  }
  report.checks.push('Eight countries select their own camera, title, guardian and value');
  await page.locator('.nexus-origin-link').click();assert.equal(await page.locator('.nexus-enter-world').isDisabled(),true);await screenshot(page,'desktop-origine');
  await page.getByRole('button',{name:'Revoir le tunnel Matrix'}).click();await page.locator('.nexus-experience[data-phase="tunnel"]').waitFor({timeout:20000});await screenshot(page,'desktop-tunnel');await skip(page);report.checks.push('Matrix passage can be replayed and skipped after first shader compilation');
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.nexus-experience[open]').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'open');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  report.checks.push('ORIGINE stays locked; native dialog escapes transformed ancestor; Escape restores focus and scroll');
  await page.locator('#open').click();await skip(page);await pick(page,'FR');await page.locator('.nexus-enter-world').click();
  assert.equal(await page.locator('#navigation-result').textContent(),'world3b');assert.equal(await page.evaluate(()=>localStorage.getItem('3b:nexus-country')),'FR');report.checks.push('Country handoff and leaving the Nexus work');
  for(let i=0;i<3;i++){await page.locator('#open').click();await skip(page);await webgl(page);await page.getByRole('button',{name:'Fermer le Nexus et revenir au passeport'}).click();assert.equal(await page.locator('.nexus-canvas canvas').count(),0);}
  report.checks.push('Three reopen/close cycles dispose the scene canvas');await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const phone=await mobile.newPage();listen(phone);await open(phone);await skip(phone);await webgl(phone);
  await phone.getByRole('button',{name:'Mettre les animations en pause',exact:true}).click();await screenshot(phone,'mobile-sanctuaire');
  assert.equal(await phone.locator('dialog.nexus-experience').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  await pick(phone,'FR');await screenshot(phone,'mobile-france');await pick(phone,'EE');await screenshot(phone,'mobile-estonie');
  await phone.locator('.nexus-origin-link').click();await screenshot(phone,'mobile-origine');assert.equal(await phone.locator('.nexus-enter-world').isDisabled(),true);
  await phone.getByRole('button',{name:'Fermer le Nexus et revenir au passeport'}).click();report.checks.push('390×844 touch viewport: horizontal country rail, no document overflow, three closeups and close button');await mobile.close();

  const calm=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce'});const calmPage=await calm.newPage();listen(calmPage);await open(calmPage);
  await calmPage.locator('.nexus-experience[data-phase="nexus"]').waitFor();assert.equal(await calmPage.locator('.nexus-arrival').count(),0);await webgl(calmPage);await pick(calmPage,'MA');await screenshot(calmPage,'mobile-mouvements-reduits');
  assert.equal(await calmPage.getByRole('button',{name:'Mettre les animations en pause',exact:true}).isDisabled(),true);report.checks.push('Reduced motion skips the tunnel and allows static 3D selection');await calm.close();

  const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args);};});
  const simple=await fallback.newPage();listen(simple,true);await open(simple);await simple.locator('.nexus-stage[data-renderer="fallback"]').waitFor({timeout:20000});await pick(simple,'DZ');await screenshot(simple,'mobile-sans-webgl');await simple.locator('.nexus-enter-world').click();assert.equal(await simple.locator('#navigation-result').textContent(),'world3b');report.checks.push('Without WebGL, the illustrated fallback and navigation remain functional');await fallback.close();

  // Exercise the real passport page with all application providers and styles,
  // not only the deliberately clipped fixture. No account is created.
  const appContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const app=await appContext.newPage();currentPage=app;listen(app);
  await app.goto('http://127.0.0.1:4177/#passeport');
  const trigger=app.getByRole('button',{name:'Ouvrir le Cercle et entrer dans le Nexus 3B'});
  await trigger.waitFor({timeout:30000});await trigger.click();await webgl(app);
  assert.equal(await app.locator('.nexus-canvas canvas').getAttribute('data-nexus-scene'),'heritage-v2');
  assert.equal(await app.locator('dialog.nexus-experience').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  await screenshot(app,'application-mobile-nexus');await pick(app,'FR');await screenshot(app,'application-mobile-france');
  await app.getByRole('button',{name:'Fermer le Nexus et revenir au passeport'}).click();assert.equal(await trigger.isVisible(),true);assert.equal(await app.locator('dialog.nexus-experience[open]').count(),0);
  await screenshot(app,'application-mobile-passeport');report.checks.push('Actual application: passport entry, 3D selection and return work with global styles at 390×844');await appContext.close();

  assert.deepEqual(report.errors,[],'Unexpected browser or shader errors');
  await build({build:{outDir:`${output}/fixture`,emptyOutDir:true,copyPublicDir:false,rollupOptions:{input:'tests/nexus-fixture.html'}}});
  report.checks.push('A production-compiled isolated fixture is included in the evidence archive');report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;
  if(currentPage&&!currentPage.isClosed()){
    try{report.diagnostics=await currentPage.evaluate(()=>({phase:document.querySelector('.nexus-experience')?.dataset,stage:document.querySelector('.nexus-stage')?.dataset,text:document.body.innerText,phases:window.__nexusPhases}));await screenshot(currentPage,'failure');}catch(diagnosticError){report.diagnosticFailure=String(diagnosticError);}
  }
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();server.kill('SIGTERM');
}
