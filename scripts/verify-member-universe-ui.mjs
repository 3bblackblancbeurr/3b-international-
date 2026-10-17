// Synthetic browser QA for the new 3B member universe. No production account.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5204,strictPort:true}});
await server.listen();
const origin='http://127.0.0.1:5204';
const out=process.env.MEMBER_UI_OUT||'artifacts/member-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage']});
const rows=Array.from({length:7},(_,i)=>({
 name:'Service public de test '+(i+1),address:'Adresse fictive, Lyon',
 profile:'https://lannuaire.service-public.gouv.fr/test/'+i,phone:'0102030405'
}));
const events=Array.from({length:7},(_,i)=>({
 title:'Événement culturel de test '+(i+1),
 starts_local:new Date(Date.now()+(i+2)*86400000).toISOString().slice(0,10)+'T15:00:00',
 link:'https://openagenda.com/culture/events/test-'+i,
 location:'Lieu de test · France',
 source:'Ministère de la Culture · OpenAgenda',published:'2026-10-16T10:00:00Z'
}));
const checks=[],errors=[];
function check(label,ok){assert.ok(ok,label);checks.push(label);console.log('PASS',label);}
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:960},reducedMotion:'reduce'});
  await context.route('**/api/*',route=>{
   const url=new URL(route.request().url());
   let payload={error:'Fixture disabled'};
   if(url.pathname==='/api/member-brief') payload={items:[
    {title:'Actualité sourcée de test',link:'https://www.france24.com/fr/test',
      published:'2026-10-16T10:00:00Z',source:'France 24'}]};
   if(url.pathname==='/api/member-events')payload={items:events};
   if(url.pathname==='/api/official-directory')payload={services:rows,total:27,city:url.searchParams.get('ville')};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/tests/member-preview.html');
  await page.locator('.mx-shell').waitFor({timeout:12000});
  check(width+': ten member experiences',await page.locator('.mx-rail button').count()===10);
  check(width+': document fits screen',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(width+': real loyalty points are visible',await page.getByText('510 points boutique').count()===1);
  await page.getByRole('button',{name:'Le monde en direct'}).click();
  await page.locator('.mx-news-feed a').first().waitFor({timeout:12000});
  check(width+': publisher news visible',await page.locator('.mx-news-feed a').count()===1);
  await page.getByRole('button',{name:'Événements'}).click();
  await page.locator('.mx-events-list li').first().waitFor({timeout:12000});
  check(width+': events initially five',await page.locator('.mx-events-list li').count()===5);
  await page.getByRole('button',{name:/Voir les .* événements suivants/}).click();
  check(width+': event pagination reveals the remainder',await page.locator('.mx-events-list li').count()===7);
  await page.screenshot({path:out+'/events-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Administratif'}).click();
  await page.getByLabel('Dans quelle ville ?').fill('Lyon');
  await page.getByRole('button',{name:'Rechercher les organismes officiels'}).click();
  await page.locator('.mx-directory-item').first().waitFor({timeout:12000});
  check(width+': directory starts with five results',await page.locator('.mx-directory-item').count()===5);
  await page.getByRole('button',{name:/Voir les .* services suivants/}).click();
  check(width+': directory pagination reveals the remainder',await page.locator('.mx-directory-item').count()===7);
  check(width+': all directory links have an official hostname',await page.locator('.mx-directory-profile').evaluateAll(items=>items.every(a=>new URL(a.href).hostname==='lannuaire.service-public.gouv.fr')));
  await page.screenshot({path:out+'/admin-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Cinéma'}).click();
  await page.getByRole('button',{name:'Trouver un film',exact:true}).click();
  await page.getByLabel('Quel film cherches-tu ?').fill('La Haine');
  const link=await page.locator('.mx-cinema-primary').getAttribute('href');
  check(width+': film search targets an official provider',new URL(link).hostname==='www.arte.tv'&&new URL(link).searchParams.get('q')==='La Haine');
  await page.screenshot({path:out+'/cinema-'+width+'.png',fullPage:true});
  check(width+': no horizontal overflow in all member experiences',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 check('No member browser rendering errors',errors.length===0);
 await writeFile(out+'/results.json',JSON.stringify({count:checks.length,checks,errors},null,2));
 console.log('MEMBER_UI_OK',checks.length);
}finally{await browser.close();await server.close();}
