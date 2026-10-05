// Exercise real hub service components and runtime markers in an isolated guest page.
// No backend, account reward or published city is modified.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.HUB_SERVICES_OUT||'/tmp/cite-services-qa';
await mkdir(out,{recursive:true});
const entry=`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import {HubCityServices} from '/src/world/hub/HubCityServices.jsx';
import {blankSave} from '/src/world/rules.js';
import {worldRuntimeItems} from '/src/world/runtime-items.js';
import '/src/world/world.css';
// Match main.jsx so previews and controls use the production design system.
import '/src/index.css';
import '/src/styles/platform-premium.css';
import '/src/styles/gold-master.css';
import '/src/styles/luxury-v2.css';
import '/src/styles/home-app.css';
import '/src/styles/launch-premium.css';
import '/src/styles/companion-premium.css';
window.serviceProbe={ready:false,palettes:[],navigations:[],panels:[],cityOpen:0,disposed:{geometries:0,materials:0,textures:0}};
for(const [Type,key] of [[THREE.BufferGeometry,'geometries'],[THREE.Material,'materials'],[THREE.Texture,'textures']]){const original=Type.prototype.dispose;Type.prototype.dispose=function(){serviceProbe.disposed[key]++;return original.call(this);};}
const save=blankSave(),items=worldRuntimeItems('hub',save,{hour:12,weather:'clear'});
const buildings=['garage_3b','shipyard_3b','train_station','ai_textile_lab','memory_archives','city_planning_office'];
function App(){const [building,setBuilding]=useState(buildings[0]);const item=items.find(row=>row.buildingId===building);serviceProbe.item=item;React.useEffect(()=>{serviceProbe.ready=true;},[]);return React.createElement('main',{},
React.createElement('label',{className:'qa-select'},'Lieu à examiner',React.createElement('select',{'aria-label':'Lieu à examiner',value:building,onChange:event=>setBuilding(event.target.value)},buildings.map(id=>React.createElement('option',{value:id,key:id},items.find(row=>row.buildingId===id).name)))),
React.createElement('section',{className:'world-dialog world-dialog-hubCityService',role:'dialog','aria-label':item.name},React.createElement(HubCityServices,{item,items,save,accountId:'browser-qa',onNavigate:target=>serviceProbe.navigations.push(target),onPanel:panel=>serviceProbe.panels.push(panel),onOpenCity:()=>serviceProbe.cityOpen++,onApplyPalette:patch=>{save.adventure.avatar={...save.adventure.avatar,...patch};serviceProbe.palettes.push(patch);return true;}})));
}
createRoot(document.getElementById('services')).render(React.createElement(App));
`;
const handler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#07121d;color:#f2eee4;font-family:system-ui,sans-serif}*{box-sizing:border-box}.qa-select{display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;min-height:64px}.qa-select select{min-height:40px;max-width:250px;background:#142635;color:#fff;border:1px solid #d6b46a77;padding:8px;border-radius:8px}.world-dialog.world-dialog-hubCityService{position:relative;inset:auto;transform:none;width:calc(100% - 24px)!important;margin:0 auto 12px;padding:20px;max-height:none!important;height:auto;overflow:visible}.world-dialog-hubCityService>header{display:none}@media(max-width:500px){.world-dialog.world-dialog-hubCityService{padding:14px}.qa-select{padding:10px 12px;gap:8px}.qa-select select{max-width:230px}}</style></head><body><div id="services"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/__hub-services-entry.jsx"></script></body></html>`);};
const server=await createServer({plugins:[{name:'hub-service-qa',resolveId:id=>id==='/__hub-services-entry.jsx'?id:null,load:id=>id==='/__hub-services-entry.jsx'?entry:null,configureServer(vite){vite.middlewares.use('/__hub-services-qa',handler);}}],server:{host:'127.0.0.1',port:Number(process.env.HUB_SERVICES_PORT)||5198,strictPort:true}});
await server.listen();
const url=`http://127.0.0.1:${server.config.server.port}/__hub-services-qa`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const [name,viewport,touch] of [['desktop',{width:1280,height:720},false],['phone',{width:390,height:844},true],['phone-landscape',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch,deviceScaleFactor:1}),errors=[],consoleErrors=[];
  await context.route('https://*.supabase.co/**',route=>route.abort());const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.serviceProbe?.ready);await page.locator('.hub-city-services[data-service="garage"]').waitFor();
   const select=page.getByLabel('Lieu à examiner',{exact:true});
   for(const building of ['garage_3b','shipyard_3b','train_station','ai_textile_lab','memory_archives','city_planning_office']){
    await select.selectOption(building);await page.waitForFunction(id=>window.serviceProbe.item?.buildingId===id,building);
    const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth-window.innerWidth,panel:document.querySelector('.hub-city-services').scrollWidth-document.querySelector('.hub-city-services').clientWidth}));assert.ok(overflow.document<=1&&overflow.panel<=1,building+' has horizontal overflow: '+JSON.stringify(overflow));
    const lost=await page.locator('canvas').evaluateAll(canvases=>canvases.some(canvas=>canvas.getContext('webgl2')?.isContextLost()));assert.equal(lost,false,building+' preview context is live');
    await page.screenshot({path:out+'/'+name+'-'+building+'.png',fullPage:true});
   }
   await page.getByRole('button',{name:'Ouvrir Créer ma Ville',exact:true}).click();assert.equal(await page.evaluate(()=>serviceProbe.cityOpen),1,'urbanism launches actual callback');
   await select.selectOption('memory_archives');await page.getByRole('button',{name:'Garder cette chronique',exact:true}).click();await page.getByRole('button',{name:'Mes favoris',exact:true}).click();assert.equal(await page.locator('.hub-service-archive nav button').count(),1);
   await select.selectOption('ai_textile_lab');await page.getByLabel('Couleur principale',{exact:true}).fill('#2b4055');await page.getByLabel('Couleur des détails',{exact:true}).fill('#f1cb80');await page.getByLabel('Motif',{exact:true}).selectOption('damier');await page.getByRole('button',{name:'Appliquer à ma tenue',exact:true}).click();assert.deepEqual(await page.evaluate(()=>serviceProbe.palettes.at(-1)),{fabricColor:'#2b4055',accentColor:'#f1cb80',pattern:'damier'});
   await select.selectOption('garage_3b');await page.getByLabel('Véhicule à examiner',{exact:true}).selectOption('express');await page.getByLabel('Carrosserie et roues',{exact:true}).check();
   const before=await page.evaluate(()=>({...serviceProbe.disposed}));
   for(let i=0;i<24;i++){await page.getByRole('button',{name:i%2?'Héritage':'Matrix',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('canvas')?.getContext('webgl2'));}
   const after=await page.evaluate(()=>({...serviceProbe.disposed}));assert.ok(after.geometries>=before.geometries+48&&after.materials>=before.materials+72,'old preview geometry and materials are disposed');
   await page.getByRole('button',{name:'Rejoindre',exact:true}).first().click();assert.equal(await page.evaluate(()=>serviceProbe.navigations.at(-1)?.type),'hubTransport');
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.serviceProbe?.ready);assert.equal(await page.getByLabel('Véhicule à examiner',{exact:true}).inputValue(),'express');assert.equal(await page.getByLabel('Carrosserie et roues',{exact:true}).isChecked(),true);await select.selectOption('memory_archives');await page.getByRole('button',{name:'Mes favoris',exact:true}).click();assert.equal(await page.locator('.hub-service-archive nav button').count(),1);
   assert.deepEqual(errors,[],'no uncaught error');assert.deepEqual(consoleErrors,[],'no shader or console error');
   results.push({device:name,ok:true,checks:['six-services','viewport-overflow','live-webgl-previews','city-callback','archive-favorite','avatar-palette','inspection-persistence','24-preview-disposals','physical-station-wayfinding'],disposed:after});console.log(name+' services: OK');
  }catch(error){await page.screenshot({path:out+'/'+name+'-failure.png',fullPage:true}).catch(()=>{});results.push({device:name,ok:false,error:error.message,errors,consoleErrors});console.log(name+' services: '+error.message);}finally{await context.close();}
 }
}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(row=>!row.ok))process.exitCode=1;
