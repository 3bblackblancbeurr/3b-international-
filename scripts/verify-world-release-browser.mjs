import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:4173';
const out=process.env.WORLD_TEST_OUT||'artifacts/world-release';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 for(const mobile of [false,true]){
  const label=mobile?'touch-landscape':'desktop',errors=[],consoleErrors=[],timings=[],started=Date.now();
  const mark=step=>{const value={step,ms:Date.now()-started};timings.push(value);console.log(label,JSON.stringify(value));};
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  // Isolated guest testing only. Never mutate the live player backend.
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',r=>r.abort());
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error'&&consoleErrors.length<30)consoleErrors.push(m.text());});
  await page.addInitScript(()=>{localStorage.setItem('3b-world-quality','fluid');localStorage.setItem('3b-world-intro-seen','1');});
  try{
   await page.goto(base+'/#monde-3b',{waitUntil:'domcontentloaded'});mark('navigation');
   const editor=page.getByRole('dialog',{name:'Ton personnage',exact:true});
   await editor.waitFor({timeout:120000});mark('editor');
   await page.getByLabel('Nom du personnage',{exact:true}).fill('QA '+label);mark('name-filled');
   const submit=page.getByRole('button',{name:'Commencer mon voyage',exact:true});
   await submit.scrollIntoViewIfNeeded({timeout:30000});
   await submit.click();mark('avatar-submit');
   await page.locator('.avatar-cinematic').waitFor({timeout:60000});
   await page.locator('.avatar-cinematic').getByRole('button',{name:'Passer',exact:true}).click();mark('reveal-skipped');
   // The cinematic now correctly waits for actual world assets instead of a blank loading canvas.
   await page.locator('.world-cinematic-director').waitFor({timeout:120000});mark('opening');
   await page.locator('.world-cinematic-director').getByRole('button',{name:'Passer',exact:true}).click();
   await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});mark('world-ready');
   assert.equal(await page.locator('.world-failure').count(),0,'No world-load error');
   await page.getByRole('button',{name:'Pause et options',exact:true}).click();
   await page.getByRole('button',{name:/Retrouver ma partie Origins/}).waitFor();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')));
   assert.equal(saved.data.adventure.avatar.name,'QA '+label);
   assert.equal(saved.data.adventure.avatar.created,true);
   await page.screenshot({path:out+'/'+label+'.png'});mark('save-verified');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('button',{name:'Pause et options',exact:true}).waitFor({timeout:120000});
   assert.equal(await page.getByRole('dialog',{name:'Ton personnage',exact:true}).count(),0,'Created avatar persists after reload');
   assert.equal(await page.locator('.origins').count(),0,'The current World is the default');
   assert.deepEqual(errors,[],'No uncaught page error');mark('reload');
   report.push({device:label,ok:true,timings,checks:['current-entry','avatar-save','cinematic-skip','opening-handoff','pause','reload']});
  }catch(error){
   await page.screenshot({path:out+'/'+label+'-failure.png',timeout:15000}).catch(()=>{});
   fs.writeFileSync(out+'/'+label+'-failure.txt',await page.locator('body').innerText({timeout:15000}).catch(()=>''));
   report.push({device:label,ok:false,error:error.message,pageErrors:errors,consoleErrors,timings});
  }finally{await context.close();}
 }
}finally{
 await browser.close();fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
if(report.length!==2||report.some(r=>!r.ok))process.exitCode=1;
