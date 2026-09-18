import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.GARAGE_TEST_URL||'http://127.0.0.1:5173/tests/fixtures/garage.html';
await mkdir('test-results/garage',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={scope:'real VehicleLabPreview + actual Montara candidate, software WebGL; NOT phone FPS validation',cases:[]};
let current=null;
try{
  for(const device of [{name:'desktop',viewport:{width:1280,height:720},hasTouch:false},{name:'mobile-landscape',viewport:{width:844,height:390},hasTouch:true,isMobile:true}]){
    const {name,...options}=device;
    const context=await browser.newContext({...options,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(90000);
    current={device:name,status:'running',step:'load',errors};report.cases.push(current);
    const log=step=>{current.step=step;console.log(`[${name}] ${step}`);};
    page.on('pageerror',e=>{errors.push(e.message);console.error(`[pageerror] ${e.message}`);});
    page.on('console',m=>{if(m.type()==='error'&&/WebGL|Shader|THREE|TypeError/i.test(m.text())){errors.push(m.text());console.error(m.text());}});
    const settle=async()=>{await page.waitForFunction(()=>document.querySelector('.u3b-lab-stage canvas')?.dataset.cameraState==='idle',null,{timeout:90000});};
    const screenshot=async(suffix)=>{
      await settle();
      const cdp=await context.newCDPSession(page);
      try{const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});await writeFile(`test-results/garage/${name}-${suffix}.png`,Buffer.from(shot.data,'base64'));}
      finally{await cdp.detach();}
    };
    await page.goto(url,{waitUntil:'networkidle'});
    await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.environment==='pmrem-studio');
    log('expand and front capture');
    await page.getByRole('button',{name:'Agrandir le garage'}).click();await settle();
    const canvas=page.locator('.u3b-lab-stage canvas');assert.ok(await canvas.isVisible());
    assert.equal(await canvas.evaluate(el=>el.getContext('webgl2').isContextLost()),false);
    await screenshot('front');
    log('rear camera');await page.getByRole('button',{name:'Arrière',exact:true}).click();await screenshot('rear');
    log('profile camera');await page.getByRole('button',{name:'Profil',exact:true}).click();await screenshot('profile');
    log('zoom and recenter');await page.getByRole('button',{name:'Zoom avant',exact:true}).click();await settle();
    await page.getByRole('button',{name:'Recentrer',exact:true}).click();await settle();
    log('brightness');const light=page.getByRole('slider',{name:'Luminosité du garage'});await light.focus();
    for(let i=0;i<5;i++)await light.press('ArrowRight');
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');
    log('auto rotation');await page.getByRole('button',{name:'Rotation 360°',exact:true}).click();await page.waitForTimeout(800);
    await page.getByRole('button',{name:'Arrêter la rotation',exact:true}).click();await settle();
    log('pointer orbit');const bounds=await canvas.boundingBox();
    await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width*.63,bounds.y+bounds.height*.52,{steps:8});await page.mouse.up();await settle();
    await page.getByRole('button',{name:'Recentrer',exact:true}).click();await settle();
    log('remount and saved brightness');await page.getByRole('button',{name:'Réduire le garage',exact:true}).click();
    for(let i=0;i<3;i++){await page.locator('#test-remount').click();await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor();await settle();}
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');
    assert.equal(await page.locator('.u3b-showroom-error').count(),0);assert.deepEqual(errors,[],JSON.stringify(errors));
    Object.assign(current,{status:'passed',webgl:true,views:true,zoom:true,pointerOrbit:true,brightnessPersists:true,remounts:3});
    log('passed');await context.close();
  }
}catch(error){if(current){current.status='failed';current.failure=error.message;}throw error;}
finally{await writeFile('test-results/garage/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
