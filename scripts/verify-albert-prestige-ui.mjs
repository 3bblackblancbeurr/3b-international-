import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const origin='http://127.0.0.1:5392';
const server=await createServer({server:{host:'127.0.0.1',port:5392,strictPort:true}});
await server.listen();
const browser=await chromium.launch({
 headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const dir='C:/Users/black/3b-albert-prestige-v3-review';
await mkdir(dir,{recursive:true});
const rows=[];
try{
 for(const [width,height] of [[320,650],[390,844],[1440,900]]){
  const ctx=await browser.newContext({
   viewport:{width,height},isMobile:width<720,hasTouch:width<720,
   deviceScaleFactor:width<720?2:1,reducedMotion:'reduce'
  });
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   return route.continue();
  });
  const page=await ctx.newPage(),errors=[];
  page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#albert-3b',{waitUntil:'domcontentloaded',timeout:60000});
  const albert=page.locator('.th-albert-screen');await albert.waitFor({state:'visible'});
  const portrait=albert.locator('.albert3b-apex-portrait');
  await page.waitForFunction(()=>{
   const img=document.querySelector('.th-albert-screen .albert3b-apex-portrait');
   return img?.complete&&img?.naturalWidth>0;
  },{timeout:15000});
  const avatar=await albert.locator('.albert3b-avatar').getAttribute('data-portrait-ready');
  const bounds=await albert.evaluate(el=>({
   viewHeight:innerHeight,screenHeight:Math.round(el.getBoundingClientRect().height),
   horizontalOverflow:el.scrollWidth-el.clientWidth,
   bodyScroll:document.documentElement.scrollHeight-innerHeight
  }));
  await page.screenshot({path:path.join(dir,'albert-scene-'+width+'.png'),animations:'disabled',fullPage:false,scale:'css'});
  const title=await albert.getByRole('heading',{name:/Albert/}).count();
  await albert.getByRole('button',{name:'Explorer'}).click();
  const curation=albert.locator('.albert3b-curated');await curation.waitFor({state:'visible'});
  const cards=await curation.locator('.th-albert-reco').count();
  const images=await curation.locator('.th-albert-reco img').evaluateAll(items=>items.filter(img=>img.complete&&img.naturalWidth>0).length);
  const privateHint=await curation.getByText(/pas des recommandations basées sur ton dossier personnel/).isVisible();
  const emptyDay=await curation.getByText(/Aucun rendez-vous inventé/).isVisible();
  await page.screenshot({path:path.join(dir,'albert-explore-'+width+'.png'),animations:'disabled',fullPage:false,scale:'css'});
  await curation.getByRole('button',{name:/Ouvrir ma timeline/}).click();
  const agenda=albert.locator('.th-albert-agenda');await agenda.waitFor({state:'visible'});
  const suggested=agenda.getByRole('button',{name:/Ajouter à ma journée : Prendre soin de moi/});
  await suggested.click();
  const saved=await agenda.getByText('Prendre soin de moi').first().isVisible();
  await agenda.getByRole('button',{name:'Fermer le planning'}).click();
  await albert.getByRole('button',{name:'Explorer'}).click();
  const updated=await curation.getByText('Prendre soin de moi').first().isVisible();
  await page.screenshot({path:path.join(dir,'albert-day-'+width+'.png'),animations:'disabled',fullPage:false,scale:'css'});
  await ctx.close();
  const row={width,title,portraitReady:avatar==='true',cards,images,privateHint,emptyDay,saved,updated,...bounds,errors};
  rows.push(row);console.log('ALBERT_PRESTIGE_V3 '+JSON.stringify(row));
  if(title!==1||avatar!=='true'||cards!==4||images!==4||!privateHint||!emptyDay||!saved||!updated||bounds.horizontalOverflow>2||bounds.bodyScroll>3||errors.length)process.exitCode=2;
 }
 await writeFile(path.join(dir,'report.json'),JSON.stringify(rows,null,2),'utf8');
}finally{await browser.close();await server.close();}
