// Real WorldPage, real scene and storage, with private context providers and a
// deterministic account service. This fixture never contacts a player account.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.HUB_MASTER_OUT||'artifacts/hub-master-ui';await mkdir(out,{recursive:true});
const entry=`
import React from 'react';
import {createRoot} from 'react-dom/client';
import WorldPage from '/src/world/WorldPage.jsx';
import {QAAccountProvider} from '/src/loyalty/LoyaltyContext.jsx';
import {QALuxuryProvider} from '/src/design-system/LuxuryExperience.jsx';
import {blankSave} from '/src/world/rules.js';
import {applyWorldAction} from '/src/world/engine.js';
import {authClient} from '/src/loyalty/client.js';
import '/src/index.css';
import '/src/styles/platform-premium.css';
import '/src/styles/gold-master.css';
import '/src/styles/luxury-v2.css';
import '/src/styles/home-app.css';
import '/src/styles/launch-premium.css';
import '/src/styles/companion-premium.css';
const params=new URLSearchParams(location.search),account=params.has('account'),uid=account?'isolated-hub-qa':null;
window.qa={events:[],mode:params.get('mode')||'ready',calls:0};
const save=blankSave();save.adventure.avatar.created=true;save.adventure.avatar.name='Voyageur QA';save.adventure.companionHidden=true;
let canonical=structuredClone(save);const receipts=new Map();
const key='3b_world_v1_'+(uid||'guest');
if(!localStorage.getItem(key)&&!params.has('empty'))localStorage.setItem(key,JSON.stringify({data:save,dirty:false}));
authClient.auth.getSession=async()=>({data:{session:uid?{user:{id:uid},access_token:'private-test-token'}:null}});
const nativeFetch=window.fetch;
window.fetch=async(input,options)=>{
 const url=new URL(input instanceof Request?input.url:String(input),location.href);
 if(url.pathname==='/functions/v1/world-engine'){
  qa.calls++;if(qa.mode==='offline')throw TypeError('Simulated connection loss');if(qa.mode==='receipt')return new Response('{}');
  const body=JSON.parse(options.body),old=receipts.get(body.device)||0;let seq=old;
  for(const command of body.commands){if(command.seq<=seq)continue;if(command.seq!==seq+1)throw Error('QA sequence gap');canonical=applyWorldAction(canonical,command.action);seq=command.seq;}
  receipts.set(body.device,seq);return new Response(JSON.stringify({data:canonical,sequence:seq}));
 }
 if(url.pathname==='/api/catalog'&&url.searchParams.get('__3b_route')==='digital-store-catalog'&&url.searchParams.get('scope')==='world')return new Response(JSON.stringify({items:[]}));
 if(url.pathname.startsWith('/api/'))throw TypeError('Unexpected API request in isolated fixture: '+url.pathname);
 if(url.hostname.endsWith('.supabase.co'))throw TypeError('External account traffic disabled in this fixture');
 return nativeFetch(input,options);
};
const profile={loading:false,user:uid?{id:uid}:null,profile:null,accept:()=>{},refresh:async()=>{}};
createRoot(document.getElementById('world')).render(React.createElement(QAAccountProvider,{value:profile},React.createElement(QALuxuryProvider,{value:{present:()=>{},cue:()=>{}}},React.createElement(WorldPage,{goTo:page=>qa.events.push(page)}))));
`;
const handler=(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#world{margin:0;width:100%;height:100%;background:var(--3b-obsidian)}</style></head><body><div id="world"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/__hub-master-entry.jsx"></script></body></html>`);};
// Capture a fresh real frame, then suspend only its render loop while Chromium
// composites the DOM. Continuous WebGL submissions can stall SwiftShader's
// screenshot compositor on Linux. These hooks exist only in this private fixture.
function injectCaptureHooks(code){
 const marker='return{\n  refreshHubSchedule:';assert.ok(code.includes(marker),'Scene capture fixture matches the real API');
 return code.replace(marker,`let qaCaptureFrozen=false;return{
  qaFreezeCapture(){if(!qaCaptureFrozen){cancelAnimationFrame(raf);qaCaptureFrozen=true;}post.render(0);return canvas.toDataURL('image/png');},
  qaResumeCapture(){if(!qaCaptureFrozen)return;qaCaptureFrozen=false;last=performance.now();raf=requestAnimationFrame(tick);},
  refreshHubSchedule:`);
}
const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true},plugins:[{name:'private-hub-master-fixture',enforce:'pre',resolveId:id=>id==='/__hub-master-entry.jsx'?id:null,load:id=>id==='/__hub-master-entry.jsx'?entry:null,transform(code,id){const path=id.split('?')[0];if(path.endsWith('/src/loyalty/LoyaltyContext.jsx'))return code+'\nexport const QAAccountProvider=Context.Provider;';if(path.endsWith('/src/design-system/LuxuryExperience.jsx'))return code+'\nexport const QALuxuryProvider=ExperienceContext.Provider;';if(path.endsWith('/src/world/scene.js'))return injectCaptureHooks(code);if(path.endsWith('/src/world/WorldPage.jsx')){const marker='scene.current.setQuality(quality);';assert.ok(code.includes(marker),'WorldPage capture fixture matches the scene ref');return code.replace(marker,'window.qa.scene=scene.current;'+marker);}},configureServer(s){s.middlewares.use('/__hub-master-qa',handler);}}]});
await server.listen();const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function capture(page,path){
 try{
  await page.evaluate(async()=>{
   const scene=window.qa?.scene,canvas=document.querySelector('.world-canvas');if(!scene||!canvas)throw Error('Real scene must be mounted before capture');window.qa.captureScene=scene;
   const uri=scene.qaFreezeCapture();if(!uri.startsWith('data:image/png;base64,')||uri.length<1000)throw Error('Real scene did not export a PNG frame');
   const rect=canvas.getBoundingClientRect(),still=document.createElement('img');still.dataset.hubQaCapture='';still.src=uri;still.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none`;
   canvas.dataset.hubQaVisibility=canvas.style.visibility;canvas.style.visibility='hidden';canvas.after(still);await still.decode();
  });
  await page.screenshot({path});
 }finally{
  await page.evaluate(()=>{document.querySelector('[data-hub-qa-capture]')?.remove();const canvas=document.querySelector('.world-canvas');if(canvas?.hasAttribute('data-hub-qa-visibility')){canvas.style.visibility=canvas.dataset.hubQaVisibility;delete canvas.dataset.hubQaVisibility;}const scene=window.qa?.captureScene;if(window.qa)delete window.qa.captureScene;scene?.qaResumeCapture();});
 }
}
const report=[];
try{
 for(const device of [{id:'desktop',viewport:{width:1280,height:800}},{id:'touch-landscape',viewport:{width:844,height:390},isMobile:true,hasTouch:true}]){
  const context=await browser.newContext({...device,deviceScaleFactor:1});const page=await context.newPage(),errors=[];
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>localStorage.setItem('3b-world-quality','fluid'));
  try{
   console.log(device.id+': loading real WorldPage');
   await page.goto('http://127.0.0.1:5199/__hub-master-qa',{waitUntil:'domcontentloaded'});
   await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});await page.locator('.hub-objective-card').waitFor({timeout:120000});
   const skip=page.getByRole('button',{name:'Passer',exact:true});
   if(await skip.count())await skip.first().click({timeout:8000}).catch(async error=>{if(await skip.first().isVisible())throw error;});
   // The short arrival shot can end while SwiftShader waits for two stable
   // compositor frames. Both a successful skip and natural completion are valid.
   await page.locator('.play-cinematic').waitFor({state:'hidden',timeout:120000});
   await page.waitForTimeout(4200);
   assert.equal(await page.locator('.hub-recovery').count(),0);
   await page.getByRole('button',{name:'Explorer librement',exact:true}).click();
   await page.locator('.hub-guide-primary').click();
   await page.getByRole('button',{name:'Arrêter le guidage et retirer le repère',exact:true}).waitFor({timeout:30000});await page.getByRole('button',{name:'Arrêter le guidage et retirer le repère',exact:true}).click();
   await page.locator('.hub-guidance-running').waitFor({state:'hidden',timeout:10000});
   await page.getByRole('button',{name:'Pause et options',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Une pause dans le voyage',exact:true});await dialog.waitFor();
   await dialog.getByText('Commandes clavier et tactile',{exact:true}).click();await dialog.getByRole('button',{name:'QWERTY',exact:true}).click();
   await dialog.getByLabel('Touche pour interagir',{exact:true}).selectOption('w');assert.equal(await dialog.getByLabel('Touche pour interagir',{exact:true}).inputValue(),'e');
   await dialog.getByLabel('Touche pour interagir',{exact:true}).selectOption('f');assert.equal(await dialog.getByLabel('Touche pour interagir',{exact:true}).inputValue(),'f');
   await dialog.getByText('Graphismes et audio',{exact:true}).click();await dialog.getByLabel('Qualité graphique',{exact:true}).selectOption('auto');await dialog.getByLabel('Qualité graphique',{exact:true}).selectOption('fluid');
   const bounds=await dialog.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,viewport:innerWidth}));assert.ok(bounds.scroll<=bounds.width+2,'Settings have no horizontal overflow');assert.ok(bounds.left>=0&&bounds.right<=bounds.viewport,'Dialog remains in viewport');
   await capture(page,out+'/'+device.id+'-settings.png');
   await dialog.getByRole('button',{name:'Fermer',exact:true}).click();await page.waitForTimeout(2500);await capture(page,out+'/'+device.id+'-hub.png');
   await page.getByRole('button',{name:'Ouvrir la carte',exact:true}).click();const atlas=page.getByRole('dialog',{name:'L’Atlas des huit portes',exact:true});await atlas.waitFor();assert.doesNotMatch(await atlas.innerText(),/talk:|weather:|mael_rivière|Terrasses de l’Onis/);await capture(page,out+'/'+device.id+'-atlas.png');await atlas.getByRole('button',{name:'Fermer',exact:true}).click();
   await page.getByRole('button',{name:'Journal et objectif',exact:true}).click();const journal=page.getByRole('dialog',{name:'Journal d’exploration',exact:true});await journal.waitFor();assert.doesNotMatch(await journal.innerText(),/talk:|weather:|mael_rivière/);await journal.getByRole('button',{name:'Fermer',exact:true}).click();
   console.log(device.id+': interface, guidance and captures passed; checking reload');
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('.hub-objective-card').waitFor({timeout:120000});await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});assert.equal(await page.getByRole('dialog',{name:'Ton personnage',exact:true}).count(),0);assert.equal(await page.locator('.hub-orientation-guide').count(),0);
   if(!device.hasTouch){await page.setViewportSize({width:550,height:735});await page.locator('.world-rotate-device').waitFor({state:'hidden'});await page.locator('.hub-objective-card').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Compact desktop stays playable without horizontal page overflow');await capture(page,out+'/desktop-compact.png');}
   else{await page.setViewportSize({width:390,height:844});await page.locator('.world-rotate-device').waitFor({state:'visible'});await page.setViewportSize(device.viewport);await page.locator('.world-rotate-device').waitFor({state:'hidden'});}
   assert.deepEqual(errors,[],'No runtime exception');report.push({device:device.id,ok:true,checks:['real-scene','guidance-cancel','settings','key-conflict','graphics-switch','atlas-labels','journal-labels','reload','orientation-persistence','no-horizontal-overflow']});
   console.log(device.id+': PASS');
  }catch(error){console.error(device.id+': FAILED',error.message);await capture(page,out+'/'+device.id+'-failure.png').catch(()=>{});await writeFile(out+'/'+device.id+'-failure.txt',await page.locator('body').innerText().catch(()=>''));report.push({device:device.id,ok:false,error:error.message,errors});}
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();
 page.setDefaultNavigationTimeout(120000);
 try{
  console.log('account-simulation: checking recovery and progress protection');
  await page.addInitScript(()=>localStorage.setItem('3b-world-quality','fluid'));await page.goto('http://127.0.0.1:5199/__hub-master-qa?account&mode=offline');
  await page.locator('.world-loading').waitFor({state:'hidden',timeout:120000});await page.locator('.hub-save-card-compact').waitFor({timeout:120000});assert.match(await page.locator('.hub-save-card-compact').innerText(),/copie locale reste/);
  await page.evaluate(()=>{qa.mode='ready';window.dispatchEvent(new Event('online'));});await page.locator('.hub-save-card-compact').waitFor({state:'hidden',timeout:30000});
  await page.getByRole('button',{name:'Pause et options',exact:true}).click();assert.match(await page.locator('.hub-save-card').innerText(),/confirmées par le serveur/);await capture(page,out+'/account-recovered.png');
  await page.evaluate(()=>localStorage.clear());await page.goto('http://127.0.0.1:5199/__hub-master-qa?account&empty&mode=offline');await page.locator('.hub-recovery').waitFor({timeout:30000});assert.equal(await page.getByRole('dialog',{name:'Ton personnage',exact:true}).count(),0);assert.match(await page.locator('.hub-recovery').innerText(),/Aucune copie locale/);assert.equal(await page.locator('.play-hud').getAttribute('inert'),'');await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('.world-dialog-failure')),true,'Recovery focus stays in modal');assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('3b_world_actions_v2_'))),false,'No replacement progression is journaled');report.push({device:'account-simulation',ok:true,checks:['offline-backup','online-retry','server-confirmation','no-copy-recovery-gate','recovery-focus-containment']});
 }catch(error){report.push({device:'account-simulation',ok:false,error:error.message});}await context.close();
}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
if(report.length!==3||report.some(row=>!row.ok))process.exitCode=1;
