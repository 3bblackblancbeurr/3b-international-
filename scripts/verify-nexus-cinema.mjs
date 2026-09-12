import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output='artifacts/nexus-cinema';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'inherit'});
const report={checks:[],errors:[],screenshots:[],note:'Real React app in Chromium; simulated screen sizes, not a physical Samsung test.'};
let browser,currentPage;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:true});report.screenshots.push(name);}
try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4181/tests/nexus-fixture.html')).ok)break;}catch{}await sleep(200);}
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const width of [320,360,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:width>759?1000:844},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:width<760,hasTouch:width<760});
    const page=await context.newPage();currentPage=page;
    page.on('pageerror',e=>report.errors.push(String(e)));
    await page.goto('http://127.0.0.1:4181/tests/nexus-fixture.html');await page.locator('#open').click();
    await page.locator('.nexus-experience[data-phase="nexus"][data-visual-mode="cinema"]').waitFor();
    await page.locator('.nexus-cinema-photo').evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error('Missing reference image');});
    assert.equal(await page.locator('.nexus-cinema-hit').count(),8);
    assert.equal(await page.locator('.nexus-door-choice').count(),8);
    assert.equal(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,`Overflow at ${width}`);
    assert.equal(await page.locator('.nexus-cinema-photo').getAttribute('alt'),'');
    await shot(page,`nexus-${width}`);
    for(const code of ['FR','DZ','ES','MA','IT','TN','TR','EE']){
      await page.locator(`.nexus-cinema-hit[data-country="${code}"]`).click();
      assert.equal(await page.locator('dialog').getAttribute('data-selected'),code);
    }
    await page.locator('.nexus-cinema-origin').click();assert.equal(await page.locator('.nexus-enter-world').isDisabled(),true);
    assert.equal(await page.locator('#nexus-title').textContent(),'ORIGINE');
    await page.getByRole('button',{name:'Voir le sanctuaire en 3D',exact:true}).click();
    await page.locator('.nexus-experience[data-visual-mode="3d"]').waitFor();
    await page.getByRole('button',{name:'Activer le décor cinéma',exact:true}).click();
    await page.getByRole('button',{name:'Fermer le Nexus et revenir au passeport',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'open');
    report.checks.push(`${width}px: art loaded, 8 art controls + gallery, locked ORIGINE, 3D/cinema switch, focus restore, no horizontal overflow`);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const app=await context.newPage();currentPage=app;app.on('pageerror',e=>report.errors.push(String(e)));
  await app.goto('http://127.0.0.1:4181/#passeport');const trigger=app.getByRole('button',{name:'Ouvrir le Cercle et entrer dans le Nexus 3B'});
  await trigger.waitFor({timeout:30000});await shot(app,'application-passeport');await trigger.click();
  await app.locator('.nexus-cinema-photo').evaluate(async img=>{await img.decode();});
  await shot(app,'application-nexus');await app.locator('.nexus-cinema-hit[data-country="FR"]').click();
  await shot(app,'application-france');await app.locator('.nexus-enter-world').click();
  await app.waitForFunction(()=>!document.querySelector('dialog.nexus-experience[open]'));
  report.checks.push('Actual application: original passport, reference art, France selection and canonical world entry');await context.close();
  const animated=await browser.newContext({viewport:{width:1440,height:1000}});const tunnel=await animated.newPage();currentPage=tunnel;
  await tunnel.goto('http://127.0.0.1:4181/tests/nexus-fixture.html');await tunnel.locator('#open').click();
  await tunnel.locator('.nexus-experience[data-phase="tunnel"]').waitFor({timeout:20000});
  await tunnel.getByRole('button',{name:'Mettre les animations en pause',exact:true}).click();
  await sleep(4200);assert.equal(await tunnel.locator('dialog').getAttribute('data-phase'),'tunnel');
  await shot(tunnel,'tunnel-architecture');await tunnel.getByRole('button',{name:'Passer l’introduction'}).click();
  await tunnel.locator('.nexus-experience[data-phase="nexus"]').waitFor();
  report.checks.push('Tunnel pause actually pauses the phase timer; introduction remains skippable');await animated.close();
  assert.deepEqual(report.errors,[]);report.success=true;
}catch(error){report.success=false;report.failure=error.stack;process.exitCode=1;if(currentPage&&!currentPage.isClosed())try{await shot(currentPage,'failure');report.text=await currentPage.locator('body').innerText();}catch{}}
finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();server.kill('SIGTERM');}
