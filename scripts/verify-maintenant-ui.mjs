// Browser QA for 3B Maintenant. Mocked public experience; no live user account or writes.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5321,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5321';
const out=process.env.NOW_UI_OUT||'/tmp/3b-maintenant-ui';
await mkdir(out,{recursive:true});
const report=[],errors=[];
const check=(label,truth)=>{assert.ok(truth,label);report.push(label);console.log('PASS',label);};
try {
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?700:width===390?844:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));
   localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));
  });
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(width+': '+error.message));
  await page.goto(origin+'/#maintenant');
  await page.locator('.now-app').waitFor({state:'visible'});
  check('3B Maintenant accessible '+width,await page.locator('#now-title').isVisible());
  check('Six tabs have readable names '+width,await page.getByRole('tablist',{name:'Expériences de 3B Maintenant'}).getByRole('tab').count()===6);
  check('No horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({path:path.join(out,'maintenant-'+width+'.png')});

  await page.getByRole('tab',{name:'Mes valeurs'}).click();
  check('Cercle Vivant carries real 8-value structure '+width,await page.locator('.now-value-map button').count()===8);
  const progress=page.getByRole('progressbar',{name:'Valeurs marquées personnellement'});
  check('Cercle starts at zero '+width,await progress.getAttribute('aria-valuenow')==='0');
  await page.getByRole('button',{name:'Marquer comme exploré'}).click();
  check('Personal marker updates real UI '+width,await progress.getAttribute('aria-valuenow')==='1');
  await page.reload();
  await page.getByRole('tab',{name:'Mes valeurs'}).click();
  check('Personal marker persists locally '+width,await page.getByRole('progressbar',{name:'Valeurs marquées personnellement'}).getAttribute('aria-valuenow')==='1');

  await page.getByRole('tab',{name:'S’entraider'}).click();
  check('Coup de Main is real, not a placeholder '+width,await page.locator('.now-help-list button').count()===3);

  await page.getByRole('tab',{name:'Comprendre'}).click();
  check('Scanner reads files only on user action '+width,await page.locator('input[type="file"][accept="image/*"]').count()===1);
  check('Scanner explains no fabricated product recognition '+width,(await page.locator('.now-scanner').innerText()).includes('n’identifie pas un produit'));

  await page.getByRole('tab',{name:'Transmettre'}).click();
  check('Héritage offers a private passphrase '+width,await page.locator('.now-heritage input[type="password"]').count()===2);

  await page.getByRole('tab',{name:'À ma façon'}).click();
  const large=page.getByRole('button',{name:/Textes plus grands/});
  await large.click();
  check('Reading preference changes root '+width,await page.evaluate(()=>document.documentElement.dataset.threebLargeText==='true'));
  await page.reload();
  check('Reading preference survives refresh '+width,await page.evaluate(()=>document.documentElement.dataset.threebLargeText==='true'));

  await page.getByRole('tab',{name:'Ma journée'}).click();
  await page.getByRole('button',{name:/Créer Transformer une idée/}).click();
  check('Boussole connects to existing creative module '+width,await page.locator('.now-mission').innerText().then(t=>t.includes('atelier')));
  check('No unhandled UI errors '+width,errors.length===0);
  await context.close();
 }
 const vaultContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await vaultContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await vaultContext.newPage();
 await page.goto(origin+'/#maintenant');
 await page.locator('.now-app').waitFor();
 await page.getByRole('tab',{name:'Transmettre'}).click();
 const pass='mon_souvenir_secret_tres_long_2026';
 await page.locator('.now-heritage input[type="password"]').first().fill(pass);
 await page.locator('.now-heritage input[type="password"]').nth(1).fill(pass);
 await page.getByRole('button',{name:/Créer mon coffre chiffré/}).click();
 await page.locator('.now-heritage-open').waitFor({state:'visible'});
 await page.getByRole('textbox',{name:'Titre du souvenir'}).fill('Souvenir en privé');
 await page.getByRole('textbox',{name:'Mon histoire'}).fill('Aucun serveur ne doit recevoir ce récit.');
 await page.getByRole('button',{name:/Chiffrer et conserver/}).click();
 await page.locator('.now-heritage-list article').waitFor();
 const vault=await page.evaluate(()=>localStorage.getItem('threeb_heritage_vault_v1')||'');
 check('Sensitive memories are encrypted at rest',vault.includes('ciphertext')&&!vault.includes('Souvenir en privé')&&!vault.includes('Aucun serveur'));
 await page.getByRole('button',{name:'Verrouiller'}).click();
 check('Lock hides sensitive memories',await page.locator('.now-heritage-list').count()===0);
 await page.screenshot({path:path.join(out,'heritage-locked-390.png')});
 await vaultContext.close();
 console.log(JSON.stringify({passed:report.length,screenshots:out}));
}finally{await browser.close();await server.close();}
