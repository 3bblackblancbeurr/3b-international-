import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({cacheDir:'node_modules/.vite-member-body',server:{host:'127.0.0.1',port:5448,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const out=process.env.MEMBER_BODY_QA_OUT||path.resolve('work/member-body-qa');await mkdir(out,{recursive:true});
const checks=[],errors=[];let page;
const check=(label,value)=>{assert.ok(value,label);checks.push(label);console.log('PASS '+label);};
try{
 for(const width of [390,1440]){
  page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5448/tests/member-body-preview.html');
  const hub=page.getByRole('region',{name:'Tout ce qui compte. Au même endroit.'});
  await hub.waitFor();check('12 member destinations '+width,await hub.locator('.member3b-hub-card').count()===12);
  check('Fidelity stays inside member '+width,await hub.locator('.is-fidelity').getByText('510',{exact:false}).isVisible());
  await hub.getByRole('button',{name:'Ouvrir : Carte de fidélité',exact:true}).click();check('Fidelity route retained '+width,await page.evaluate(()=>document.body.dataset.lastRoute==='loyalty'));
  await hub.getByRole('searchbox').fill('FIDELITE carte');check('Member accent insensitive combined search '+width,await hub.locator('.member3b-hub-card').count()===1);
  await hub.getByRole('searchbox').fill('');await hub.getByRole('button',{name:'Mes projets',exact:true}).click();check('Projects filter '+width,await hub.locator('.member3b-hub-card').count()===4);
  await hub.getByRole('button',{name:'Tout mon espace',exact:true}).click();await hub.screenshot({path:path.join(out,'espace-membre-'+width+'.png')});
  const body=page.getByRole('region',{name:'Corps humain interactif et alimentation'});await body.scrollIntoViewIfNeeded();
  check('Transparent anatomy asset loaded '+width,await body.locator('img.h-human-figure').evaluate(image=>image.complete&&image.naturalWidth===840));
  check('11 anatomy markers '+width,await body.locator('.h-human-hotspot').count()===11);
  check('44px anatomy touch targets '+width,await body.locator('.h-human-hotspot').evaluateAll(items=>items.every(item=>item.getBoundingClientRect().width>=44&&item.getBoundingClientRect().height>=44)));
  await body.getByRole('button',{name:'Squelette',exact:true}).click();check('Skeleton marker filter '+width,await body.locator('.h-human-hotspot').count()===1);
  await body.getByRole('button',{name:'Découvrir : Os',exact:true}).click();await body.locator('h3').filter({hasText:'Os'}).waitFor();check('Bones information '+width,(await body.locator('h3').innerText()).includes('Os'));
  await body.getByRole('navigation',{name:'Explorer toutes les zones du corps'}).getByRole('button',{name:'Foie',exact:true}).click();check('Liver warning retained '+width,await body.getByText(/Aucun aliment ni jus ne le « détoxifie »/).isVisible());
  await body.getByRole('navigation').getByRole('button',{name:'Cerveau',exact:true}).click();await body.locator('h3').filter({hasText:'Cerveau'}).waitFor();check('Brain description and safe food fallback '+width,(await body.locator('.h-human-info').innerText()).includes('coordonne')&&!(await body.locator('.h-human-info').innerText()).includes('nettoie le foie'));
  await body.getByRole('navigation').getByRole('button',{name:'Cœur',exact:true}).click();await body.screenshot({path:path.join(out,'anatomie-'+width+'.png')});
  const studio=page.getByRole('region',{name:'Ton compagnon vivant'});await studio.scrollIntoViewIfNeeded();
  check('Companion explorer is initial panel '+width,await studio.getByRole('tab',{name:'Explorer 3B'}).getAttribute('aria-selected')==='true');
  await studio.getByRole('button',{name:/Mes papiers.*Coffre privé/}).click();check('Companion opens actual administrative route '+width,await page.evaluate(()=>document.body.dataset.lastRoute==='admin'));
  await studio.getByRole('tab',{name:'Explorer 3B'}).focus();await page.keyboard.press('End');check('Companion tabs End reaches settings '+width,await studio.getByRole('tab',{name:'Réglages'}).evaluate(item=>item===document.activeElement));
  await studio.getByRole('tab',{name:'Explorer 3B'}).click();await studio.screenshot({path:path.join(out,'compagnon-'+width+'.png')});
  const privacy=page.getByRole('region',{name:'Confidentialité et cookies'});await privacy.scrollIntoViewIfNeeded();check('Optional analytics disabled '+width,await privacy.getByText(/désactivée dans cette version/).isVisible());
  check('No consent silently enabled '+width,await privacy.getByRole('button',{name:'Autoriser cette mesure'}).isDisabled());
  await privacy.getByRole('button',{name:'Tout refuser / retirer'}).click();check('Refusal persisted without erasing documents '+width,await page.evaluate(()=>JSON.parse(localStorage.getItem('3b_analytics_optin_v1')).allowed===false));
  if(width===390){
   await page.evaluate(async()=>{const model=await import('/src/lib/privacy-preferences.js');model.writeAnalyticsConsent(localStorage,true);window.qaStorageDescriptor=Object.getOwnPropertyDescriptor(window,'localStorage');Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Recette stockage bloqué','SecurityError');}});});
   await privacy.getByRole('button',{name:'Tout refuser / retirer'}).click();
   await page.evaluate(()=>Object.defineProperty(window,'localStorage',window.qaStorageDescriptor));
   check('Getter failure cannot undo withdrawal after storage returns',await page.evaluate(async()=>{const model=await import('/src/lib/privacy-preferences.js');return model.readAnalyticsConsent(localStorage)===false&&JSON.parse(localStorage.getItem('3b_analytics_optin_v1')).allowed===true;}));
   check('Getter failure notice explains session-only protection',await privacy.getByText(/bloquée pour cette visite/).isVisible());
   await privacy.getByRole('button',{name:'Tout refuser / retirer'}).click();
  }
  check('No horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }
 check('No uncaught JS errors',errors.length===0);await writeFile(path.join(out,'proof.json'),JSON.stringify({passed:checks.length,checks,errors,fixture:'Synthetic member point count; no user account, medical device or private file used.'},null,2));console.log(JSON.stringify({passed:checks.length,errors,out}));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
finally{await browser.close();await server.close();}
