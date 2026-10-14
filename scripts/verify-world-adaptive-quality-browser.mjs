// Exercise the real WorldPage and its quality consumers with controlled frame
// samples. This verifies wiring, not the FPS or temperature of a physical phone.
import fs from 'node:fs/promises';
const original=await fs.readFile(new URL('./verify-hub-master-browser.mjs',import.meta.url),'utf8');
let fixture=original.slice(0,original.indexOf('const report=[];'));
fixture=fixture.replace('import {mkdir,writeFile}', 'import {mkdir,writeFile,readFile}');
fixture=fixture.replaceAll('5199','5208').replace("const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';","const out=process.env.QUALITY_OUT||'artifacts/adaptive-quality';");
fixture=fixture.replace('  qaHoldRender(){',`  qaQualityState(){return {targetFps:quality.targetFps,mode:qualityMode,selected:quality.renderMode(),shadows:renderer.shadowMap.enabled,shadowInterval,ratio:renderer.getPixelRatio(),ao:post.enabled,crowd:ambientCrowd?.diagnostics,stream:landscape?.streamingDiagnostics,position:{...position}};},
  qaQualitySamples(fps,seconds,count){for(let i=0;i<count;i++)if(quality.sample(fps,seconds))resize();return this.qaQualityState();},
  qaHoldRender(){`);
const cases=String.raw`
const report=[];
try{
 for(const device of [{id:'phone-landscape',viewport:{width:844,height:390},isMobile:true,hasTouch:true},{id:'phone-portrait',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
  const context=await browser.newContext({...device,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{localStorage.setItem('3b-world-quality','fluid');localStorage.setItem('3b-world-hub-orientation',JSON.stringify({seen:true,progress:{}}));});
  await page.goto('http://127.0.0.1:5208/__hub-master-qa',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});
  await page.waitForFunction(()=>qa?.scene,{timeout:120000});
  await page.evaluate(()=>{qa.scene.skipCinematic();qa.scene.qaHoldRender();qa.scene.setQuality('auto');});
  const before=await page.evaluate(()=>qa.scene.qaQualityState());
  assert.equal(before.mode,'auto');assert.equal(before.shadows,true);assert.equal(before.targetFps,30);
  const stable=await page.evaluate(()=>qa.scene.qaQualitySamples(30,1,600));assert.equal(stable.mode,'auto');assert.equal(stable.ratio,before.ratio,'30 FPS steady preserves phone image quality');
  const fallback=await page.evaluate(()=>qa.scene.qaQualitySamples(20,2,20));
  assert.equal(fallback.mode,'fluid');assert.equal(fallback.selected,'fluid');
  assert.equal(fallback.shadows,false);assert.equal(fallback.ao,false);
  assert.ok(fallback.ratio<=before.ratio);assert.ok(fallback.ratio>=Math.min(1,before.ratio),'No double resolution reduction below the native phone floor');assert.ok(fallback.crowd.count<before.crowd.count);
  assert.deepEqual(fallback.position,before.position,'Changing rendering budget preserves player position');
  const partial=await page.evaluate(()=>qa.scene.qaQualitySamples(60,2,6));
  assert.equal(partial.mode,'fluid','A short recovery must not restore expensive effects');
  const recovered=await page.evaluate(()=>qa.scene.qaQualitySamples(60,2,42));
  assert.equal(recovered.mode,'auto');assert.equal(recovered.shadows,true);
  await page.evaluate(()=>qa.scene.setQuality('detail'));
  const detail=await page.evaluate(()=>qa.scene.qaQualitySamples(10,2,10));
  assert.equal(detail.mode,'detail','Explicit user choice is preserved');
  if(device.id==='phone-landscape'){
  await page.getByRole('button',{name:'Pause et options',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Une pause dans le voyage',exact:true});await dialog.waitFor();
  await dialog.getByText('État du rendu',{exact:true}).click();
  const pendingDownload=page.waitForEvent('download');await dialog.getByRole('button',{name:'Télécharger le relevé de fluidité',exact:true}).click();
  const download=await pendingDownload;assert.equal(download.suggestedFilename(),'3B-diagnostic-fluidite.json');
  const diagnostic=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(diagnostic.version,1);assert.ok(diagnostic.performance.events.length<=20);
  assert.deepEqual(Object.keys(diagnostic).sort(),['drawCalls','fps','performance','region','resolution','triangles','version'].sort(),'Diagnostic export excludes identity and game save');
  await dialog.getByRole('button',{name:'Reprendre l’exploration',exact:true}).click();
  }
  await page.evaluate(()=>{qa.scene.setQuality('fluid');qa.scene.qaFreezeCapture();});
  await page.screenshot({path:out+'/'+device.id+'.png'});
  await page.evaluate(()=>qa.scene.qaResumeCapture());
  await page.waitForFunction(()=>qa.scene.qaQualityState().mode==='fluid');
  assert.deepEqual(errors,[]);report.push({device:device.id,before,fallback,partial,recovered,errors});
  console.log(device.id+': auto overload, recovery and manual modes passed');await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
`;
await fs.writeFile(new URL('./.world-adaptive-quality-fixture.mjs',import.meta.url),fixture+cases);
try{await import('./.world-adaptive-quality-fixture.mjs');}
finally{await fs.rm(new URL('./.world-adaptive-quality-fixture.mjs',import.meta.url),{force:true});}
