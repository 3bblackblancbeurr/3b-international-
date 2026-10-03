// Run against `npm run dev`. The temporary fixture mounts the guest component;
// production Passport access, real accounts and purchases are never bypassed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {toLandscape} from '../src/world/terrain.js';
import {tournamentItem} from '../src/world/tournament.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const moduleName=process.env.WORLD_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
let base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173';
const only=process.env.WORLD_TEST_CASE;
const out=process.env.WORLD_TEST_OUT||'/tmp/3b-world-continuation';
const filename='world-continuation-qa.local.html',fixture=path.join(root,filename);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(fixture,`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';import ReactDOM from 'react-dom/client';
import WorldPage from '/src/world/WorldPage.jsx';
import {LoyaltyProvider} from '/src/loyalty/LoyaltyContext.jsx';
import {LuxuryProvider} from '/src/design-system/LuxuryExperience.jsx';
import '/src/index.css';import '/src/styles/gold-master.css';
document.documentElement.classList.add('js-app-ready');
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(LoyaltyProvider,null,React.createElement(LuxuryProvider,null,React.createElement(WorldPage,{goTo:()=>{}}))));
</script></body></html>`,{flag:'wx'});
let browser,previewServer,buildDir;const report=[];
async function ready(page){
 await page.locator('.world-shell canvas').first().waitFor({timeout:30000});
 await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
 // Loading can finish before the scene publishes its first frame/cinematic.
 // Wait for a real snapshot before deciding whether the arrival can be skipped.
 await page.locator('.world-district small').waitFor({timeout:120000});
 const skip=page.locator('.play-cinematic button');
 if(await skip.isVisible())await skip.click({timeout:2000}).catch(()=>{});
 await page.locator('.play-cinematic').waitFor({state:'hidden',timeout:30000});
 await page.locator('.play-arrival').waitFor({state:'hidden',timeout:30000});
 assert.equal(await page.locator('.world-failure').count(),0);
}
const readSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('3b_world_v1_guest')).data);
try{
 if(process.env.WORLD_TEST_BUILD==='1'){
  const {build,preview}=await import('vite');
  buildDir=fs.mkdtempSync(path.join(os.tmpdir(),'3b-world-browser-'));
  await build({root,build:{outDir:buildDir,emptyOutDir:true,rollupOptions:{input:fixture}}});
  previewServer=await preview({root,build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5174,strictPort:true}});
  base='http://127.0.0.1:5174';
 }
 for(const [label,region,width,height] of [['hub-desktop','hub',1365,900],['france-tournament-touch','france',844,390],['hub-rotation','hub',390,844]]){
  if(only&&only!==label)continue;
  // Each independent journey owns its renderer process. Software WebGL in CI
  // otherwise retains expensive GPU work from a previous closed context.
  browser=await chromium.launch({headless:true,...(process.env.WORLD_BROWSER_EXECUTABLE?{executablePath:process.env.WORLD_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  let save=applyWorldAction(blankSave(),{type:'avatar',avatar:{name:'Kaïs QA'}});
  if(region!=='hub'){
   save=applyWorldAction(save,{type:'visit',region});
   const item=tournamentItem(save),center=toLandscape(region,item.x,item.z);
   save=applyWorldAction(save,{type:'checkpoint',region,x:center.x,z:center.z+4,heading:0});
  }
  const context=await browser.newContext({viewport:{width,height},isMobile:width<900,hasTouch:width<900,reducedMotion:'reduce'});
  await context.route(/supabase\.co/,r=>r.abort());
  await context.addInitScript(save=>{
   if(!localStorage.getItem('3b_world_v1_guest'))localStorage.setItem('3b_world_v1_guest',JSON.stringify({data:save,dirty:false}));
   localStorage.setItem('3b-world-quality','fluid');localStorage.setItem('3b-world-intro-seen','1');
  },save);
  const page=await context.newPage(),errors=[],checks=[];
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/'+filename,{waitUntil:'domcontentloaded'});await ready(page);
   if(height>width){
    await page.getByText('Tourne ton téléphone',{exact:true}).waitFor();
    await page.setViewportSize({width:844,height:390});
    await page.locator('.world-rotate-device').waitFor({state:'hidden'});checks.push('portrait-to-landscape');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const guidance=page.locator('.play-guidance');
   if(region==='hub'){
    assert.match(await guidance.innerText(),/Maël Rivière/);
    const bounds=await guidance.locator(':scope > *').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height).map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
    for(let i=1;i<bounds.length;i++)assert.ok(bounds[i].top>=bounds[i-1].bottom,'guidance must not overlap');
   }
   await page.screenshot({timeout:120000,path:path.join(out,label+'.png')});
   await page.getByRole('button',{name:'Journal et objectif',exact:true}).click();
   await page.getByRole('region',{name:'Histoire et but du Monde du 3B'}).waitFor();checks.push('campaign-journal');
   await page.screenshot({timeout:120000,path:path.join(out,label+'-journal.png')});
   await page.getByRole('button',{name:'Fermer',exact:true}).click();
   if(region==='france'){
    await page.getByRole('button',{name:'Participer au Tournoi des Liens',exact:true}).click();
    await page.getByRole('button',{name:'Commencer la première manche',exact:true}).click();
    await page.getByRole('region',{name:'Combat en déplacement libre'}).waitFor();
    await page.getByRole('button',{name:'Suspendre le combat',exact:true}).click();
    const paused=await readSave(page);assert.equal(paused.adventure.encounter.tournament,true);checks.push('start-and-pause-tournament');
    await page.reload({waitUntil:'domcontentloaded'});await ready(page);
    await page.getByRole('region',{name:'Combat en déplacement libre'}).waitFor();
    const resumed=await readSave(page);assert.equal(resumed.adventure.encounter.tournamentRound,0);assert.ok(resumed.adventure.encounter.field.time>=paused.adventure.encounter.field.time);checks.push('reload-tournament');
    await page.getByRole('button',{name:/Se replier/}).click();
    await page.locator('.field-combat').waitFor({state:'hidden'});
    const retreated=await readSave(page);assert.equal(retreated.adventure.tournament.status,'abandoned');assert.equal(retreated.xp,save.xp);checks.push('retreat-without-reward');
   }else{
    await page.getByRole('button',{name:'Pause et options',exact:true}).click();
    if(label==='hub-rotation'){
     const brightness=page.getByRole('slider',{name:/Luminosité/});
     await brightness.focus();await page.keyboard.press('Home');
     for(let i=0;i<10;i++)await page.keyboard.press('ArrowRight');
     await page.getByRole('checkbox',{name:'Mieux voir dans les ombres'}).uncheck();
     assert.equal(await brightness.inputValue(),'1.3');
     assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('3b-world-visual-preferences'))),{brightness:1.3,shadowAssist:false});
     await page.screenshot({timeout:120000,path:path.join(out,label+'-visual-settings.png')});checks.push('visual-settings-live');
    }
    const checkpoint=(await readSave(page)).adventure.exploration;assert.equal(checkpoint.region,'hub');
    await page.reload({waitUntil:'domcontentloaded'});await ready(page);
    assert.deepEqual((await readSave(page)).adventure.exploration,checkpoint);checks.push('reload-exploration');
    if(label==='hub-rotation'){
     await page.getByRole('button',{name:'Pause et options',exact:true}).click();
     assert.equal(await page.getByRole('slider',{name:/Luminosité/}).inputValue(),'1.3');
     assert.equal(await page.getByRole('checkbox',{name:'Mieux voir dans les ombres'}).isChecked(),false);checks.push('visual-settings-persist');
     await page.getByRole('button',{name:'Fermer',exact:true}).click();
     const canLose=await page.evaluate(()=>{const gl=document.querySelector('.world-shell canvas').getContext('webgl2');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true;});
     assert.equal(canLose,true,'browser must expose context-loss simulation');
     await page.getByRole('alert').getByText('Reprendre l’exploration',{exact:true}).waitFor();
     const beforeRecovery=(await readSave(page)).adventure.exploration;
     await page.getByRole('button',{name:'Recharger le monde',exact:true}).click();await ready(page);
     assert.deepEqual((await readSave(page)).adventure.exploration,beforeRecovery);checks.push('graphics-context-loss-recovery');
     const edge={region:'hub',x:0,z:HUB_PLATFORM.walkRadius-4,heading:0};
     await page.evaluate(edge=>{const key='3b_world_v1_guest',saved=JSON.parse(localStorage.getItem(key));saved.data.adventure.exploration=edge;localStorage.setItem(key,JSON.stringify(saved));},edge);
     await page.reload({waitUntil:'domcontentloaded'});await ready(page);
     await page.locator('.world-shell canvas').first().focus();await page.keyboard.down('s');
     try{
      await page.waitForFunction(radius=>{
       const transform=document.querySelector('.world-minimap .minimap-open svg > g')?.getAttribute('transform')||'';
       const match=transform.match(/translate\(([-\d.e+]+)\s+([-\d.e+]+)\)/i);
       return match&&Math.hypot(Number(match[1]),Number(match[2]))>=radius-.1;
      },HUB_PLATFORM.walkRadius,{timeout:60000});
      await page.waitForTimeout(1000);
     }finally{await page.keyboard.up('s');}
     await page.getByRole('button',{name:'Pause et options',exact:true}).click();
     const rim=(await readSave(page)).adventure.exploration;
     assert.ok(rim.z>edge.z+.1,'the outward movement must actually run');
     assert.ok(Math.hypot(rim.x,rim.z)<=HUB_PLATFORM.walkRadius+.02,'exploration must remain on the physical Nexus deck');checks.push('nexus-deck-boundary');
    }
   }
   assert.deepEqual(errors,[]);report.push({label,ok:true,checks});
  }catch(error){report.push({label,ok:false,checks,error:error.message,pageErrors:errors});await page.screenshot({timeout:120000,path:path.join(out,label+'-failure.png')}).catch(()=>{});}
  await context.close();await browser.close();browser=null;console.log(JSON.stringify(report.at(-1)));
 }
}finally{
 await browser?.close();
 if(previewServer)await new Promise(resolve=>{previewServer.httpServer.close(resolve);previewServer.httpServer.closeAllConnections();});
 if(buildDir)fs.rmSync(buildDir,{recursive:true,force:true});
 fs.rmSync(fixture,{force:true});fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
}
if(report.length!==(only?1:3)||report.some(r=>!r.ok))process.exitCode=1;
