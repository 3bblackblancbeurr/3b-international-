import {chromium} from 'file:///C:/Users/black/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/#monde-3b');
 await page.evaluate(()=>localStorage.setItem('3b-origins-v1:guest',JSON.stringify({avatar:{name:'Nour',created:true,weapon:'paris'},regions:{maroc:{wins:67,revision:1}}})));
 await page.reload();await page.getByRole('button',{name:'Créer ou modifier mon personnage'}).click({timeout:60000});await page.getByRole('button',{name:'6 Armurerie'}).click();
 const form=page.getByRole('button',{name:/FORME 4/});assert.equal(await form.isEnabled(),true);await form.click();await page.waitForTimeout(1200);await page.locator('.arsenal-heading').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/refonte/premium-evolution.png'});
 await page.getByRole('button',{name:'Comparer les styles'}).click();await page.getByLabel('Comparer avec').selectOption('zellige');assert.equal(await page.locator('.arsenal-compare meter').count(),10);await page.screenshot({path:'artifacts/refonte/premium-comparison.png'});
 await page.getByRole('button',{name:'Enregistrer et jouer'}).click();await page.getByRole('button',{name:'Pause',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('3b-origins-v1:guest')).avatar.weaponForm),3);
 await page.reload();await page.getByRole('button',{name:'Créer ou modifier mon personnage'}).click({timeout:60000});await page.getByRole('button',{name:'6 Armurerie'}).click();assert.equal(await form.getAttribute('aria-pressed'),'true');await page.setViewportSize({width:390,height:844});await page.locator('.arsenal-heading').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/refonte/premium-mobile.png'});assert.equal(await page.evaluate(()=>document.querySelector('.creator').scrollWidth>document.querySelector('.creator').clientWidth+1),false);assert.deepEqual(errors,[]);console.log('PASS: form 4 unlock, live stats comparison, save/reload, mobile layout, no runtime errors');
}finally{await browser.close();}
