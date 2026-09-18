import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {writeFileSync} from 'node:fs';
const url=process.env.GARAGE_TEST_URL||'http://127.0.0.1:5173/tests/fixtures/garage.html';
await mkdir('test-results/garage',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={scope:'real VehicleLabPreview + Montara candidate; software WebGL, not physical-phone FPS validation',capture:'actual WebGL pixels; preserveDrawingBuffer enabled by test for readback only',cases:[]};
let current=null;
const save=()=>writeFileSync('test-results/garage/report.json',JSON.stringify(report,null,2));
const bounded=async(promise,label)=>{let id;try{return await Promise.race([promise,new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error(`${label}: exceeded 90 seconds`)),90000);})]);}finally{clearTimeout(id);}};
try{
  for(const device of [{name:'desktop',viewport:{width:1280,height:720},hasTouch:false},{name:'mobile-landscape',viewport:{width:844,height:390},hasTouch:true,isMobile:true}]){
    const {name,...options}=device;
    const context=await browser.newContext({...options,deviceScaleFactor:1});
    // Preserve only the pixels already rendered by the real WebGL scene. Avoid
    // Chromium software-compositor screenshot stalls; no scene/material overrides.
    await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,type==='webgl2'||type==='webgl'?{...options,preserveDrawingBuffer:true}:options);};});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
    current={device:name,status:'running',step:'load',errors};report.cases.push(current);save();
    const log=step=>{current.step=step;save();console.log(`[${name}] ${step}`);};
    page.on('pageerror',e=>{errors.push(e.message);save();console.error(`[pageerror] ${e.message}`);});
    page.on('console',m=>{if(m.type()==='error'&&/WebGL|Shader|THREE|TypeError/i.test(m.text())){errors.push(m.text());save();console.error(m.text());}});
    const settle=()=>page.waitForFunction(()=>document.querySelector('.u3b-lab-stage canvas')?.dataset.cameraState==='idle',null,{timeout:90000});
    const canvas=page.locator('.u3b-lab-stage canvas');
    const metrics=()=>canvas.evaluate(el=>({distance:Number(el.dataset.cameraDistance),exposure:Number(el.dataset.exposure),frames:Number(el.dataset.renderCount)}));
    const screenshot=async suffix=>{await settle();const data=await bounded(canvas.evaluate(el=>el.toDataURL('image/png')),'WebGL readback');const image=Buffer.from(data.split(',')[1],'base64');assert.ok(image.length>10000,'render is empty');await writeFile(`test-results/garage/${name}-${suffix}.png`,image);};
    await page.goto(url,{waitUntil:'networkidle'});
    await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.environment==='pmrem-studio');
    log('expand/front');await page.getByRole('button',{name:'Agrandir le garage'}).click();await settle();
    assert.ok(await canvas.isVisible());assert.equal(await canvas.evaluate(el=>el.getContext('webgl2').isContextLost()),false);await screenshot('front');
    log('rear');await page.getByRole('button',{name:'Arrière',exact:true}).click();await screenshot('rear');
    log('profile');await page.getByRole('button',{name:'Profil',exact:true}).click();await screenshot('profile');
    log('zoom');const before=await metrics();await page.getByRole('button',{name:'Zoom avant',exact:true}).click();await settle();assert.ok((await metrics()).distance<before.distance-.05);
    await page.getByRole('button',{name:'Recentrer',exact:true}).click();await settle();
    log('brightness');const light=page.getByRole('slider',{name:'Luminosité du garage'});await light.focus();
    for(let i=0;i<5;i++)await light.press('ArrowRight');
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');await settle();assert.ok(Math.abs((await metrics()).exposure-1.6875)<.001);
    log('rotation');await page.getByRole('button',{name:'Rotation 360°',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Arrêter la rotation',exact:true}).click();await settle();
    log('pointer orbit');const bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.63,bounds.y+bounds.height*.52,{steps:5});await page.mouse.up();await settle();
    await page.getByRole('button',{name:'Recentrer',exact:true}).click();await settle();
    if(device.hasTouch){
      log('two-finger pinch');const old=await metrics(),b=await canvas.boundingBox(),cx=b.x+b.width*.5,cy=b.y+b.height*.4;
      const cdp=await context.newCDPSession(page);
      const points=d=>[{id:1,x:cx-d,y:cy,radiusX:3,radiusY:3,force:1},{id:2,x:cx+d,y:cy,radiusX:3,radiusY:3,force:1}];
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(45)});
      for(const d of [55,65,75])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(d)});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settle();
      assert.ok((await metrics()).distance<old.distance-.05);current.pinch=true;
    }
    log('idle GPU');await settle();const frames=(await metrics()).frames;await page.waitForTimeout(500);assert.equal((await metrics()).frames,frames);
    log('remount');await page.getByRole('button',{name:'Réduire le garage',exact:true}).click();
    for(let i=0;i<3;i++){await page.locator('#test-remount').click();await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor();await settle();}
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');assert.equal(await page.locator('.u3b-showroom-error').count(),0);assert.deepEqual(errors,[]);
    Object.assign(current,{status:'passed',webgl:true,views:true,zoom:true,brightnessPersists:true,idleDraws:false,remounts:3});log('passed');await context.close();
  }
}catch(error){if(current){current.status='failed';current.failure=error.message;}throw error;}
finally{save();console.log(JSON.stringify(report,null,2));await browser.close();}
