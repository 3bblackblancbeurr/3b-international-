// Headless, synthetic-camera acceptance only. No real user video is recorded.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const server=await createServer({server:{host:'127.0.0.1',port:5202,strictPort:true}});
await server.listen();
const out=process.env.FOOD_SCANNER_UI_OUT||'artifacts/food-scanner';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage',
  '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'],
});
const checks=[],failures=[];
function check(name,value){assert.ok(value,name);checks.push(name);console.log('PASS',name);}
async function prepare(mode){
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera'],reducedMotion:'reduce'});
 await context.addInitScript(mode=>{
  try{localStorage.setItem('threeb_companion_prefs_v1',JSON.stringify({enabled:false}));}catch{}
  window.__cameraCalls=0;window.__capturedStreams=[];
  if(navigator.mediaDevices?.getUserMedia){
   const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async constraints=>{
    window.__cameraCalls++;
    if(mode==='denied')throw new DOMException('Not allowed','NotAllowedError');
    if(mode==='late'){
      return new Promise(resolve=>{
        window.__resolveCamera=async()=>{
          const stream=await original(constraints);
          window.__capturedStreams.push(stream);
          resolve(stream);
        };
      });
    }
    const stream=await original(constraints);
    window.__capturedStreams.push(stream);
    return stream;
   };
  }
  if(mode==='native'||mode==='late'){
   window.BarcodeDetector=class{
    static async getSupportedFormats(){return ['ean_13'];}
    async detect(){return [{rawValue:'3017620422003'}];}
   };
  }else{
   Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:undefined});
  }
 },mode);
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/food-product')return route.fulfill({
   contentType:'application/json',
   body:JSON.stringify({product:{
    code:'3017620422003',name:'Produit de test',brand:'Test 3B',
    ingredients:'Lait',allergens:['en:milk'],traces:[],nutriscore:'B',
    per100g:{kcal:90,proteins:4,sugars:2}},
    url:'https://world.openfoodfacts.org/product/3017620422003'})
  });
  if(url.origin==='http://127.0.0.1:5202')return route.continue();
  return route.abort();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push(e.message));
 await page.goto('http://127.0.0.1:5202/#sante');
 await page.getByRole('navigation',{name:'Les espaces Santé 3B'}).getByRole('button',{name:'Scanner'}).click();
 await page.locator('.foodscan').waitFor();
 return {context,page};
}
async function stopped(page){
 return page.evaluate(()=>document.querySelector('.foodscan video')?.srcObject===null
  &&(window.__capturedStreams||[]).every(stream=>stream.getTracks().every(track=>track.readyState==='ended')));
}
try {
 for(const mode of ['fallback','native','denied']){
  const {context,page}=await prepare(mode);
  const calls=await page.evaluate(()=>window.__cameraCalls);
  check(mode+': no camera request before button',calls===0);
  check(mode+': skip link is invisible before keyboard focus',
    await page.locator('.skip-link').evaluate(el=>getComputedStyle(el).opacity==='0'));
  await page.locator('.skip-link').focus();
  check(mode+': skip link appears for keyboard navigation',
    await page.locator('.skip-link').evaluate(el=>getComputedStyle(el).opacity==='1'));
  const button=page.getByRole('button',{name:'Scanner avec mon téléphone'});
  await button.click();
  if(mode==='denied'){
   await page.getByRole('alert').getByText(/Accès caméra refusé/).waitFor({timeout:12000});
   check('Denied permission is explained',await page.getByRole('alert').isVisible());
  }else if(mode==='native'){
   await page.locator('.fs-product h3').waitFor({timeout:20000});
   check('BarcodeDetector yields the correct actual product',await page.locator('.fs-product h3').innerText()==='Produit de test');
   check('Native camera stopped on match',await stopped(page));
  }else{
   await page.waitForFunction(()=>Boolean(document.querySelector('.foodscan video')?.srcObject),{timeout:20000});
   check('Free ZXing fallback opens the camera only after interaction',await page.evaluate(()=>window.__cameraCalls>0));
   await page.getByRole('button',{name:'Arrêter la caméra'}).click();
   check('Stop control releases fallback camera tracks',await stopped(page));
  }
  check(mode+': no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:out+'/'+mode+'-390.png',fullPage:true});
  await context.close();
 }
 for(const flow of ['background','unmount']){
  const {context,page}=await prepare('fallback');
  await page.getByRole('button',{name:'Scanner avec mon téléphone'}).click();
  await page.waitForFunction(()=>Boolean(document.querySelector('.foodscan video')?.srcObject),null,{timeout:20000});
  if(flow==='background'){
   await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
   });
  }else{
   await page.getByRole('navigation',{name:'Les espaces Santé 3B'})
     .getByRole('button',{name:'Jour'}).click();
   await page.locator('.foodscan').waitFor({state:'detached',timeout:7000});
  }
  await page.waitForFunction(()=>(window.__capturedStreams||[]).length>0 &&
    window.__capturedStreams.every(s=>s.getTracks().every(track=>track.readyState==='ended')),
    null,{timeout:7000});
  check(flow+': camera tracks released',true);
  await context.close();
 }
 {
  const {context,page}=await prepare('late');
  await page.getByRole('button',{name:'Scanner avec mon téléphone'}).click();
  await page.waitForFunction(()=>typeof window.__resolveCamera==='function',null,{timeout:20000});
  await page.getByRole('navigation',{name:'Les espaces Santé 3B'}).getByRole('button',{name:'Jour'}).click();
  await page.evaluate(()=>window.__resolveCamera());
  await page.waitForFunction(()=>window.__capturedStreams?.length===1 &&
    window.__capturedStreams[0].getTracks().every(track=>track.readyState==='ended'),null,{timeout:12000});
  check('Late permission grant after navigation stops its tracks',true);
  await context.close();
 }
 check('No browser render errors',failures.length===0);
 await writeFile(out+'/results.json',JSON.stringify({checks,errors:failures},null,2));
 console.log('FOOD_SCANNER_QA_OK',checks.length);
}finally{await browser.close();await server.close();}
