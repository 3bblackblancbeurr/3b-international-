import {chromium} from 'file:///C:/Users/black/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>{if(!localStorage.getItem('3b-origins-v1:guest'))localStorage.setItem('3b-origins-v1:guest',JSON.stringify({zone:'maroc',position:{x:-48,z:-33},avatar:{created:true,name:'Test combat'},flags:{awakened:true},settings:{quality:'light'}}));});
 await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:4173')+'/#monde-3b');
 await page.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:90000});
 const energy=()=>page.getByRole('meter',{name:'Énergie du Cercle'}).getAttribute('value').then(Number);
 const before=await energy();await page.getByRole('button',{name:'Pouvoir du Cercle',exact:true}).click();await page.waitForTimeout(500);const spent=await energy();await page.waitForTimeout(2500);const regenerated=await energy();assert.ok(spent<before-30);assert.ok(regenerated>spent+3);
 await page.locator('.origins-interact').click();
 for(let i=0;i<90;i++){
  const text=await page.locator('body').innerText();if(text.includes('1 victoires'))break;
  const dodge=page.getByRole('button',{name:'Esquive',exact:true}),circle=page.getByRole('button',{name:'Pouvoir du Cercle',exact:true}),heavy=page.getByRole('button',{name:'Attaque puissante',exact:true}),light=page.getByRole('button',{name:'Attaque rapide',exact:true});
  if(text.includes('Attaque annoncée')&&await dodge.isEnabled()){await page.waitForTimeout(350);await dodge.click();}
  else if(await circle.isEnabled())await circle.click();else if(await heavy.isEnabled())await heavy.click();else if(await light.isEnabled())await light.click();
  await page.waitForTimeout(350);
 }
 assert.match(await page.locator('body').innerText(),/1 victoires/);
 await page.screenshot({path:'artifacts/refonte/maroc-combat-mobile.png'});
 await page.getByRole('button',{name:'Ouvrir la carte'}).click();await page.getByRole('button',{name:'Refuge · se reposer',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.origins-interact')?.textContent.includes('Refuge'),null,{timeout:65000});
 await page.locator('.origins-interact').click();await page.getByRole('button',{name:'Se reposer · gratuit',exact:true}).click();await page.waitForTimeout(300);
 for(const name of ['Vie','Endurance','Énergie du Cercle'])assert.equal(Number(await page.getByRole('meter',{name,exact:true}).getAttribute('value')),100);
 await page.reload();await page.getByRole('button',{name:'Reprendre l’aventure',exact:true}).click({timeout:60000});assert.match(await page.locator('body').innerText(),/1 victoires/);
 assert.deepEqual(errors,[]);fs.writeFileSync('artifacts/refonte/combat.json',JSON.stringify({energy:{before,spent,regenerated},victory:true,rest:true,reload:true,errors},null,2));console.log('Combat, régénération, refuge et sauvegarde : OK');
}finally{await browser.close();}
