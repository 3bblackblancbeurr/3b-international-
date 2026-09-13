import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output='artifacts/nexus-cinema';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'inherit'});
const report={checks:[],errors:[],screenshots:[],note:'Real React app in Chromium; simulated screen sizes, not a physical Samsung test.'};
let browser,currentPage;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:false});report.screenshots.push(name);}
async function skipIntro(page){
  await page.waitForFunction(()=>!!document.querySelector('dialog.nexus-experience[open]'),undefined,{timeout:10000,polling:50});
  for(let i=0;i<30;i++){
    const phase=await page.evaluate(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase||null);
    if(phase==='nexus')return;
    await page.evaluate(()=>document.querySelector('dialog.nexus-experience[open] [data-nexus-skip="true"]')?.click());
    await sleep(100);
  }
  await page.waitForFunction(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase==='nexus',undefined,{timeout:10000,polling:50});
}
async function waitPhase(page,value,timeout=10000){await page.waitForFunction(expected=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase===expected,value,{timeout,polling:50});}
async function phase(page){return page.evaluate(()=>document.querySelector('dialog.nexus-experience[open]')?.dataset.phase||null);}
async function pressIntro(page,name){const button=page.getByRole('button',{name,exact:true});await button.waitFor({state:'visible',timeout:10000});await button.evaluate(element=>element.click());}
try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4181/tests/nexus-fixture.html')).ok)break;}catch{}await sleep(200);}
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const width of [320,360,390,768,1440]){
    const motion=width===1440?'no-preference':'reduce';
    const context=await browser.newContext({viewport:{width,height:width>759?1000:844},deviceScaleFactor:1,reducedMotion:motion,isMobile:width<760,hasTouch:width<760});
    const page=await context.newPage();currentPage=page;
    page.on('pageerror',e=>report.errors.push(String(e)));
    await page.goto('http://127.0.0.1:4181/tests/nexus-fixture.html');await page.locator('#open').click();
    if(width===1440)await skipIntro(page);
    await page.locator('.nexus-experience[data-phase="nexus"][data-visual-mode="cinema"]').waitFor();
    await page.locator('.nexus-cinema-photo').evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error('Missing reference image');});
    assert.equal(await page.locator('.nexus-cinema-hit').count(),8);
    assert.equal(await page.locator('.nexus-door-choice').count(),8);
    assert.equal(await page.locator('dialog.nexus-experience[open]').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,`Overflow at ${width}`);
    assert.equal(await page.locator('.nexus-cinema-photo').getAttribute('alt'),'');
    assert.equal(await page.locator('.nexus-cinema-seals').count(),0);
    const authentic=page.locator('.nexus-cinema-authentic-circle img');
    assert.equal(await authentic.count(),1);
    const circleAnimation=await authentic.evaluate(node=>getComputedStyle(node).animationName);
    if(width===1440)assert.match(circleAnimation,/nexus-v7-authentic-circle-spin/);else assert.equal(circleAnimation,'none');
    await shot(page,`nexus-${width}`);
    for(const code of ['FR','DZ','ES','MA','IT','TN','TR','EE']){
      const target=page.locator(`.nexus-cinema-hit[data-country="${code}"]`);
      const bounds=await target.boundingBox();assert.ok(bounds.width>=43.9&&bounds.height>=43.9,`Small target: ${code}/${width}`);
      await target.click();assert.equal(await page.locator('dialog.nexus-experience[open]').getAttribute('data-selected'),code);
    }
    const guardian=await page.locator('.nexus-guardian').boundingBox();
    const description=await page.locator('.nexus-description').boundingBox();
    assert.ok(guardian.y>=description.y+description.height-1,`Guardian overlaps copy at ${width}`);
    const firstDoor=await page.locator('.nexus-door-choice').first().boundingBox();assert.ok(firstDoor.height>=175,`Door card too small at ${width}`);
    await page.locator('.nexus-cinema-origin').click();assert.equal(await page.locator('.nexus-enter-world').isDisabled(),true);
    assert.equal(await page.locator('#nexus-title').textContent(),'ORIGINE');
    await page.getByRole('button',{name:'Voir le sanctuaire en 3D',exact:true}).click();
    await page.locator('.nexus-experience[data-visual-mode="3d"]').waitFor();
    await page.getByRole('button',{name:'Activer le décor cinéma',exact:true}).click();
    await page.getByRole('button',{name:'Fermer le Nexus et revenir au passeport',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'open');
    report.checks.push(`${width}px: authentic rotating circle, 8 premium doors, 44px targets, locked ORIGINE, 3D/cinema switch, no overflow`);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const app=await context.newPage();currentPage=app;app.on('pageerror',e=>report.errors.push(String(e)));
  await app.goto('http://127.0.0.1:4181/#passeport');const trigger=app.getByRole('button',{name:'Ouvrir le Cercle et entrer dans le Nexus 3B'});
  await trigger.waitFor({timeout:30000});
  const card=await app.locator('.passport-card-stage').boundingBox(),portal=await trigger.boundingBox();
  assert.ok(portal.width<=card.width*.12,'Passport 3B trigger must stay unchanged and compact');
  assert.ok(portal.x>=card.x+card.width*.80,'Passport 3B trigger must stay in the existing right-side zone');
  await shot(app,'application-passeport-v7');await trigger.click();
  await app.locator('.nexus-cinema-photo').evaluate(async img=>{await img.decode();});
  await shot(app,'application-nexus-v7');await app.locator('.nexus-cinema-hit[data-country="FR"]').click();
  await app.locator('dialog.nexus-experience[open]').evaluate(dialog=>{dialog.scrollTop=dialog.scrollHeight;});
  await shot(app,'application-france-selected');await app.locator('.nexus-enter-world').click();
  await app.waitForFunction(()=>!document.querySelector('dialog.nexus-experience[open]'),undefined,{timeout:30000});
  assert.equal(await app.locator('.nexus-country-arrival').count(),0);
  report.checks.push('Actual application: Passport unchanged, France enters directly with no intermediate country splash');await context.close();

  const animated=await browser.newContext({viewport:{width:1440,height:1000}});const tunnel=await animated.newPage();currentPage=tunnel;
  await tunnel.goto('http://127.0.0.1:4181/tests/nexus-fixture.html');await tunnel.locator('#open').click({noWaitAfter:true});
  await waitPhase(tunnel,'scan',5000);
  await pressIntro(tunnel,'Mettre les animations en pause');
  await sleep(1350);assert.equal(await phase(tunnel),'scan');
  await pressIntro(tunnel,'Reprendre les animations');
  await waitPhase(tunnel,'tunnel',10000);
  assert.equal(await tunnel.locator('.nexus-v7-spiral-a').count(),1);assert.equal(await tunnel.locator('.nexus-v7-spiral-b').count(),1);
  assert.ok(await tunnel.locator('.nexus-v7-spiral>i').count()>=60);
  await pressIntro(tunnel,'Mettre les animations en pause');
  await sleep(4200);assert.equal(await phase(tunnel),'tunnel');
  await shot(tunnel,'tunnel-v7-twin-spiral');
  await pressIntro(tunnel,'Passer l’introduction');
  await waitPhase(tunnel,'nexus',10000);
  report.checks.push('V7 twin golden spiral tunnel is present, pausable and skippable');await animated.close();
  assert.deepEqual(report.errors,[]);report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;if(currentPage&&!currentPage.isClosed())try{await shot(currentPage,'failure');report.text=await currentPage.locator('body').innerText();}catch{}}
finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();server.kill('SIGTERM');}
