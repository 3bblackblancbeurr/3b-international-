// Real WebGL world, actual streamed guardian courts, eight region captures.
// QA fixture uses guest/offline save and does not write player progress.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5236')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';",
          "const out=process.env.GUARDIAN_COURT_OUT||'artifacts/guardian-courts';");
const cases=String.raw`
const report=[],all=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].filter(id=>!process.env.GUARDIAN_COURT_REGIONS||process.env.GUARDIAN_COURT_REGIONS.split(',').includes(id));
try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const RealDate=Date;window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:['2026-10-17T14:00:00+02:00']));}static now(){return new RealDate('2026-10-17T14:00:00+02:00').getTime();}};
  localStorage.setItem('3b-world-camera',JSON.stringify({version:2,yaw:0,pitch:.34,distance:24}));
  localStorage.setItem('3b-hub-orientation-v1',JSON.stringify({seen:true,progress:{moved:true,mapOpened:true,interacted:true}}));
  localStorage.setItem('3b-world-intro-seen','1');
 });
 await page.goto('http://127.0.0.1:5236/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
 assert.ok(all.length,'At least one regional Guardian arena to review');
 await page.waitForFunction(()=>window.qa?.scene,undefined,{timeout:120000,polling:250});
 await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
 await page.evaluate(()=>{qa.scene.skipCinematic();qa.scene.setQuality('fluid');});
 for(const region of all){
  console.log(region+': loading actual guardian arena');
  await page.evaluate(region=>qa.scene.travel(region),region);
  await page.waitForFunction(id=>document.querySelector('.world-shell')?.dataset.region===id,region,{timeout:120000,polling:250});
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});
  const placement=await page.evaluate(async region=>{
   const layout=await import('/src/world/realm-layout.js');
   const site=layout.realmLayout(region).sites.find(entry=>entry.kind==='guardianCourt');
   if(!site)throw Error('Guardian court missing: '+region);
   qa.scene.skipCinematic();
   return {ok:qa.scene.relocateRealm({region,x:site.x,z:site.z+18}),court:{x:site.x,z:site.z}};
  },region);
  assert.equal(placement.ok,true,'actual in-world guardian court can be reached');
  await page.waitForTimeout(1700);
  const record=await page.evaluate(()=>{
   const shell=document.querySelector('.world-shell'),hud=document.querySelector('.play-hud');
   const diag=qa.scene?.snapshotPosition?.();
   return {region:shell?.dataset.region,position:diag,hud:hud?.className,scroll:document.documentElement.scrollWidth,width:innerWidth};
  });
  assert.equal(record.region,region);assert.ok(Math.hypot(record.position.x-placement.court.x,record.position.z-placement.court.z-18)<2);
  assert.ok(record.scroll<=record.width+2,'no horizontal mobile overflow');
  await capture(page,out+'/'+region+'-arena-mobile.png');
  report.push({region,ok:true,position:record.position});
 }
 assert.deepEqual(errors,[],'no JS runtime exceptions during eight arena travel');
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 console.log('GUARDIAN_COURTS_OK '+JSON.stringify(report));
 await context.close();
}finally{await browser.close();await server.close();}
`;
const filename=new URL('./.guardian-courts-fixture.mjs',import.meta.url);
await fs.writeFile(filename,fixture+cases);
try{await import(filename.href);}finally{await fs.rm(filename,{force:true});}
