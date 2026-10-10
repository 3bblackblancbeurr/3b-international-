// Local browser acceptance with synthetic accounts, no production writes.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin='http://127.0.0.1:5198',out=process.env.APP_UI_OUT||'/tmp/3b-menu-qa';await mkdir(out,{recursive:true});
const uid='11111111-1111-4111-8111-111111111111';
const profile={user_id:uid,name:'Membre Démonstration',handle:'demo_3b',country:'France',xp:1800,points:100,passport_state:'active',passport_public_id:'22222222-2222-4222-8222-222222222222',passport_version:1,theme:'heir',created_at:'2026-01-01T00:00:00Z'};
const results=[],errors=[];
const check=(label,value)=>{assert.ok(value,label);results.push(label);console.log('PASS',label);};
try{
 for(const viewport of [{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.addInitScript(({uid})=>{const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})),'synthetic-ui-test'].join('.');localStorage.setItem('3b_member_auth_v1',JSON.stringify({access_token:token,refresh_token:'synthetic-ui-test',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'demo@example.invalid'}}));localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));localStorage.setItem('threeb_companion_living_v1',JSON.stringify({voiceEnabled:false}));},{uid});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());const json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/api/catalog')return json({enabled:false,items:[],products:[]});
   if(u.pathname==='/api/my-orders')return json({orders:[]});
   if(u.origin===origin)return route.continue();
   if(u.pathname.endsWith('/member-api'))return json({profile,events:[],inventory:[],entitlements:[],identity_claims_complete:true});
   if(u.pathname.endsWith('/city-3b'))return json({hasCity:false});
   if(u.pathname.endsWith('/rpc/secret3b_daily_status'))return json({phase:'waiting',server_now:new Date().toISOString()});
   return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#accueil');await page.locator('.home-app-hub').waitFor();
  const nav=page.locator(viewport.width<=720?'.mobile-navigation':'.site-header');
  check(`Visible labeled navigation ${viewport.width}`,await nav.isVisible());
  await page.screenshot({path:out+'/home-'+viewport.width+'.png'});
  check(`Home contains no framed directory tiles ${viewport.width}`,await page.locator('.universe-card').evaluateAll(items=>items.every(e=>getComputedStyle(e).borderRightWidth==='0px'&&getComputedStyle(e).borderLeftWidth==='0px'&&getComputedStyle(e).borderRadius==='0px')));
  await page.screenshot({path:out+'/home-'+viewport.width+'.png'});
  await nav.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
  const dialog=page.locator('#universe-menu');await dialog.waitFor({state:'visible'});
  check(`Dialog fits viewport ${viewport.width}`,await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));
  await page.screenshot({path:out+'/menu-principal-'+viewport.width+'.png'});
  check(`Category names fit without horizontal scrolling ${viewport.width}`,await dialog.locator('.app-menu-categories').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await dialog.getByRole('tab',{name:'Monde',exact:true}).click();
  check(`Hidden world accessible ${viewport.width}`,await dialog.locator('[data-menu-id="invisible"]').isVisible());
  check(`Unfinished games initially collapsed ${viewport.width}`,!(await dialog.locator('[data-menu-id="games"]').isVisible()));
  await dialog.locator('.app-menu-upcoming > summary').click();
  check(`Unfinished games remain discoverable ${viewport.width}`,await dialog.locator('[data-menu-id="games"]').isVisible());
  await dialog.getByRole('searchbox').fill('caché');
  check(`Accent tolerant search ${viewport.width}`,await dialog.locator('.app-menu-route').count()===1);
  await dialog.getByRole('button',{name:'Effacer la recherche'}).click();
  await dialog.getByRole('tab',{name:'Réglages',exact:true}).click();
  check(`Settings open directly ${viewport.width}`,await dialog.getByRole('button',{name:/Sons de l’interface/}).isVisible());
  const motion=dialog.getByRole('button',{name:/Réduire les mouvements/}),old=await motion.getAttribute('aria-pressed');
  await motion.click();check(`Settings toggle ${viewport.width}`,await motion.getAttribute('aria-pressed')!==old);
  await dialog.getByRole('tab',{name:'Compte',exact:true}).click();
  await page.screenshot({path:out+'/menu-'+viewport.width+'.png'});
  await dialog.press('Escape');await dialog.waitFor({state:'hidden'});
  check(`Escape returns focus to menu ${viewport.width}`,await nav.getByRole('button',{name:'Ouvrir le menu',exact:true}).evaluate(e=>e===document.activeElement));
  await page.getByRole('button',{name:'Paramètres de l’application',exact:true}).click();
  check(`Header opens settings category ${viewport.width}`,await dialog.getByRole('tab',{name:'Réglages',exact:true}).getAttribute('aria-selected')==='true');
  await dialog.getByRole('button',{name:'Fermer le menu'}).click();
  for(const hash of ['passeport','membre','cartes','boutique','guide','jeux','monde-invisible']){
   await page.goto(origin+'/#'+hash);await page.locator('#main-content').waitFor();
   await page.waitForTimeout(200);
   check(`No horizontal overflow ${hash} ${viewport.width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(hash==='guide'){
    check(`Guide reference folded ${viewport.width}`,await page.locator('.guide-reference:not([open])').count()===2);
    await page.locator('.guide-reference > summary').first().click();check(`Guide reference expands ${viewport.width}`,await page.locator('.guide-reference[open]').count()===1);
   }
   if(viewport.width===390)await page.screenshot({path:out+'/'+hash+'-390.png'});
  }
  await context.close();
 }
 const guestContext=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
 await guestContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const guest=await guestContext.newPage();guest.on('pageerror',e=>errors.push(e.message));
 await guest.goto(origin+'/#boutique');await guest.locator('#passport-access-title').waitFor();
 check('Guest access gate remains readable',await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check('Guest access gate keeps three clear choices',await guest.locator('[aria-labelledby="passport-access-title"] button').count()===3);
 await guest.screenshot({path:out+'/access-320.png'});
 await guest.getByRole('button',{name:'Compte / activation',exact:true}).click();await guest.locator('.account-entry').waitFor();
 check('Guest account form remains accessible',await guest.locator('.account-tabs').isVisible());
 await guest.getByRole('button',{name:'Créer un compte',exact:true}).click();
 check('Registration retains identity and consent controls',await guest.locator('input[type="checkbox"]').count()>=3);
 await guest.screenshot({path:out+'/registration-320.png'});
 await guestContext.close();
 check('No unhandled rendering errors',errors.length===0);
 await writeFile(out+'/results.json',JSON.stringify({checks:results.length,results,errors},null,2));
}finally{await browser.close();await server.close();}
