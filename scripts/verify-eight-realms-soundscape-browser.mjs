// Real WorldPage regional HUD visual QA on isolated guest save.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'))
 .replaceAll('5199','5218')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';",
          "const out=process.env.REALM_CINEMA_OUT||'artifacts/realm-cinema';");
const cases=String.raw`
const report=[];
try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  localStorage.setItem('3b-world-quality','fluid');
  localStorage.setItem('3b-hub-orientation-v1',JSON.stringify({seen:true,progress:{moved:true,mapOpened:true,interacted:true}}));
  localStorage.setItem('3b-world-intro-seen','1');
 });
 await page.goto('http://127.0.0.1:5218/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.qa?.scene,{timeout:120000});
 await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
 await page.evaluate(()=>qa.scene.skipCinematic());
 for(const region of ['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']){
  console.log(region+': streaming real region');
  await page.evaluate(region=>qa.scene.travel(region),region);
  await page.waitForFunction(id=>document.querySelector('.world-shell')?.dataset.region===id,region,{timeout:120000,polling:250});
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:150000});
  await page.evaluate(()=>qa.scene.skipCinematic());
  await page.waitForTimeout(1000);
  const layout=await page.evaluate(()=>{
   const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const hud=document.querySelector('.play-hud'),map=document.querySelector('.world-minimap');
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,region:document.querySelector('.world-shell')?.dataset.region,
    hud:hud?.className,minimap:rect('.world-minimap'),challenge:rect('.realm-challenge'),bg:getComputedStyle(map).backgroundColor,
    palette:hud?.style.getPropertyValue('--3b-realm-ink')};
  });
  assert.equal(layout.region,region);
  assert.ok(!layout.hud.includes('hub-hud'));
  assert.ok(layout.scroll<=layout.viewport+2,'Regional HUD does not overflow horizontally');
  assert.ok(layout.palette,'Region applies its own accent');
  assert.ok(layout.minimap?.width>0,'Actual regional minimap is visible');
  await capture(page,out+'/'+region+'-mobile.png');
  report.push({region,ok:true,layout});
 }
 assert.deepEqual(errors,[],'No JavaScript exceptions');
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 await context.close();
}finally{await browser.close();await server.close();}
`;
const filename=new URL('./.eight-realms-soundscape-fixture.mjs',import.meta.url);
await fs.writeFile(filename,fixture+cases);
try{await import(filename.href);}finally{await fs.rm(filename,{force:true});}
