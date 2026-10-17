// Browser-level art review using the real WorldPage renderer and a private save.
// Covers accessibility and touch hit targets as well as rendered screenshots.
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=source.slice(0,source.indexOf('const report=[];'));
fixture=fixture.replaceAll('5199','5215')
 .replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';",
          "const out=process.env.CINEMA_HUD_OUT||'artifacts/cinema-hud';");
const cases=String.raw`
const report=[];
try{
 for(const device of [
  {id:'desktop',viewport:{width:1280,height:800}},
  {id:'galaxy-landscape',viewport:{width:844,height:390},isMobile:true,hasTouch:true},
  {id:'small-landscape',viewport:{width:740,height:320},isMobile:true,hasTouch:true}
 ]){
  const context=await browser.newContext({...device,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('3b-world-quality','fluid'); // QA SwiftShader only; gameplay auto mode is separately tested.
   localStorage.setItem('3b-hub-orientation-v1',JSON.stringify({seen:true,progress:{moved:true,mapOpened:true,interacted:true}}));
   localStorage.setItem('3b-world-intro-seen','1');
  });
  await page.goto('http://127.0.0.1:5215/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>qa.scene,{timeout:120000});
  await page.evaluate(()=>qa.scene.skipCinematic());
  const intro=page.getByRole('button',{name:'Explorer librement',exact:true});
  if(await intro.count())await intro.click({timeout:12000}).catch(()=>{});
  await page.locator('.hub-objective-card').waitFor({state:'visible',timeout:120000});
  await page.waitForTimeout(1200);
  const layout=await page.evaluate(()=>{
   const rect=selector=>{
    const el=document.querySelector(selector);if(!el)return null;
    const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
   };
   return {
    viewport:{width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth},
    card:rect('.hub-objective-card'),minimap:rect('.hub-minimap'),
    actions:rect('.hub-objective-actions'),compass:rect('.world-compass'),
    mission:rect('.hub-mission-rail'),cameraTarget:'scene-controller-default',
    qualitySelected:localStorage.getItem('3b-world-quality'),
    disclosureDisplay:getComputedStyle(document.querySelector('.hub-objective-disclosure')).display,
    detailsDisplay:getComputedStyle(document.querySelector('.hub-objective-details')).display
   };
  });
  assert.ok(layout.card?.height>0&&layout.minimap?.width>0,'Real Hub mission and map are present');
  assert.ok(layout.viewport.scroll<=layout.viewport.width+2,'No horizontal overflow');
  assert.ok(layout.card.y>=60,'Compact mission stays visible and does not auto-scroll out of view');
  assert.ok(layout.card.right<layout.minimap.x,'Objective and minimap do not overlap');
  assert.ok(layout.card.bottom<layout.viewport.height-56,'Mission does not cover the primary action controls');
  if(device.isMobile){
   assert.equal(layout.detailsDisplay,'none','Detailed text is not permanently covering mobile gameplay');
   assert.equal(layout.disclosureDisplay,'block','Mobile can reveal the complete objective');
   assert.ok(layout.card.y<=92,'Mission starts high enough to show the world behind it');
   assert.ok(layout.card.height<135,'Objective stays compact in landscape');
   assert.ok(layout.minimap.width<=102,'Minimap is compact on mobile');
  }else{
   assert.equal(layout.disclosureDisplay,'none','Desktop shows full mission text without a duplicate drawer');
  }
  await capture(page,out+'/'+device.id+'.png');
  if(device.isMobile){
   // Native disclosure must remain usable when the objective is compact.
   const detail=page.locator('.hub-objective-disclosure');
   await detail.locator('summary').click({timeout:10000});
   assert.equal(await detail.evaluate(el=>el.open),true);
   assert.ok(await detail.locator('p').count()>0);
   await detail.locator('summary').click();
   assert.equal(await detail.evaluate(el=>el.open),false);
  }
  assert.deepEqual(errors,[],'No runtime exceptions');
  report.push({device:device.id,ok:true,layout});
  await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
`;
const generated=new URL('./.cinema-hud-fixture.mjs',import.meta.url);
await fs.writeFile(generated,fixture+cases);
try{await import(generated.href);}finally{await fs.rm(generated,{force:true});}
