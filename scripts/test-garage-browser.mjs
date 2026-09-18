import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.GARAGE_TEST_URL||'http://127.0.0.1:5173/tests/fixtures/garage.html';
await mkdir('test-results/garage',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={scope:'real VehicleLabPreview + actual Montara candidate, software WebGL; NOT phone FPS validation',cases:[]};
try{
  for(const device of [{name:'desktop',viewport:{width:1440,height:1000},hasTouch:false},{name:'mobile-landscape',viewport:{width:844,height:390},hasTouch:true,isMobile:true}]){
    const {name,...options}=device;
    const context=await browser.newContext({...options,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/WebGL|Shader|THREE|TypeError/i.test(m.text()))errors.push(m.text());});
    await page.goto(url,{waitUntil:'networkidle'});
    await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor({timeout:60000});
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.environment==='pmrem-studio');
    await page.getByRole('button',{name:'Agrandir le garage'}).click();
    await page.waitForTimeout(2200);
    const canvas=page.locator('.u3b-lab-stage canvas');assert.ok(await canvas.isVisible());
    assert.equal(await canvas.evaluate(el=>el.getContext('webgl2').isContextLost()),false);
    await page.screenshot({path:`test-results/garage/${name}-front.png`});
    await page.getByRole('button',{name:'Arrière',exact:true}).click();await page.waitForTimeout(1500);
    await page.screenshot({path:`test-results/garage/${name}-rear.png`});
    await page.getByRole('button',{name:'Profil',exact:true}).click();await page.waitForTimeout(1500);
    await page.getByRole('button',{name:'Zoom avant',exact:true}).click();
    await page.getByRole('button',{name:'Recentrer',exact:true}).click();
    const light=page.getByRole('slider',{name:'Luminosité du garage'});await light.focus();
    for(let i=0;i<5;i++)await light.press('ArrowRight');
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');
    await page.getByRole('button',{name:'Rotation 360°',exact:true}).click();await page.waitForTimeout(900);
    await page.getByRole('button',{name:'Arrêter la rotation',exact:true}).click();
    await page.getByRole('button',{name:'Réduire le garage',exact:true}).click();
    for(let i=0;i<3;i++){await page.locator('#test-remount').click();await page.locator('.u3b-showroom-status').filter({hasText:'CANDIDATE PBR'}).waitFor({timeout:30000});}
    assert.equal(await page.locator('.u3b-showroom-brightness output').innerText(),'125%');
    assert.equal(await page.locator('.u3b-showroom-error').count(),0);
    assert.deepEqual(errors,[],JSON.stringify(errors));
    report.cases.push({device:name,webgl:true,views:true,zoom:true,brightnessPersists:true,remounts:3,errors});
    await context.close();
  }
  await writeFile('test-results/garage/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
