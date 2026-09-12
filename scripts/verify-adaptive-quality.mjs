import {chromium} from 'file:///C:/Users/black/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true}),report=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('3b-origins-v1:guest',JSON.stringify({zone:'sanctuary',flags:{awakened:true},avatar:{created:true,name:'Essai',weapon:'paris'},settings:{quality:'auto'}})));
  await page.goto('http://127.0.0.1:4173/#monde-3b');
  await page.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:60000});
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('button',{name:'Paramètres',exact:true}).click();
  const select=page.getByLabel('Qualité graphique');
  assert.equal(await select.inputValue(),'auto');
  for(const mode of ['light','high','auto']){
   await select.selectOption(mode);
   await page.waitForTimeout(300);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('3b-origins-v1:guest')).settings.quality);
   assert.equal(saved,mode);
  }
  await page.screenshot({path:`artifacts/refonte/adaptive-quality-${mobile?'mobile':'desktop'}.png`});
  assert.deepEqual(errors,[]);report.push({mobile,settingsSaved:true,errors});await page.close();
 }
}finally{await browser.close();}
fs.writeFileSync('artifacts/refonte/adaptive-quality-browser.json',JSON.stringify(report,null,2));console.log(report);
