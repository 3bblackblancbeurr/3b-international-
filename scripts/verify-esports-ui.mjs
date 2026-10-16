// Browser acceptance for the public 16-18 ESPORT experience.
// Synthetic/guest-only: no production write and no real player data.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5206,strictPort:true}});
await server.listen();
const origin='http://127.0.0.1:5206';
const out=process.env.ESPORTS_UI_OUT||'artifacts/application-ui/esports';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],errors=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
try{
 for(const [width,height] of [[320,700],[360,800],[393,873],[768,1024],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<720,isMobile:width<720,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   try{
    localStorage.removeItem('3b_member_auth_v1');
    localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));
   }catch{}
  });
  await context.route('https://ttvhcezucsbbmnafrotq.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:'[]'}));
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#esports');
  const root=page.locator('.es16');await root.waitFor();
  check('16-18 hero visible '+width,await root.locator('.es16-hero').isVisible());
  check('16-18 stays inside viewport '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('Multigame promise visible '+width,(await root.innerText()).includes('Plusieurs terrains'));
  check('Warzone is presented as starting point '+width,(await root.innerText()).includes("Warzone est notre point de départ"));
  const nav=root.locator('.es16-navigation');
  check('Club navigation visible '+width,await nav.isVisible());
  check('Club navigation remains reachable '+width,await nav.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}));
  await root.getByRole('button',{name:'Recrutement',exact:true}).click();
  await page.getByRole('heading',{name:'Recherche de joueurs.'}).waitFor();
  check('Recruitment is multigame '+width,(await root.innerText()).includes('candidats de tous les jeux'));
  check('Guest application requires account '+width,await root.getByRole('button',{name:/Se connecter à 3B/}).isVisible());
  check('No identity document requested '+width,!/pièce d.identité.*(joindre|envoyer|upload)/i.test(await root.innerText()));
  await root.getByRole('button',{name:'Compétitions',exact:true}).click();
  await page.getByRole('heading',{name:'L’arène ne s’arrête jamais.'}).waitFor();
  check('Competition copy avoids false registration '+width,(await root.innerText()).includes('ne signifie pas que 16‑18 y est inscrit'));
  await root.getByRole('button',{name:'L’association',exact:true}).click();
  await page.getByRole('heading',{name:'Notre structure.'}).waitFor();
  check('Association separates brand and association '+width,(await root.innerText()).includes('La marque 3B et l’association sont présentées séparément'));
  await page.screenshot({path:out+'/16-18-'+width+'.png',fullPage:true});
  await context.close();
 }
 check('No unhandled browser errors',errors.length===0);
 await writeFile(out+'/results.json',JSON.stringify({checks:checks.length,results:checks,errors},null,2));
}finally{
 await browser.close();
 await server.close();
}
