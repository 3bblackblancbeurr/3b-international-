import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const out='artifacts/destin-browser';fs.mkdirSync(out,{recursive:true});
const temp=['__destin_qa.html','__destin_qa.jsx','public/__destin_fixture.mp4'];
const fixture=fs.readFileSync(new URL('./verify-destin-browser.mjs',import.meta.url),'utf8').match(/const fixture='([^']+)'/)[1];
fs.writeFileSync(temp[2],Buffer.from(fixture,'base64'));
fs.writeFileSync(temp[0],'<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DESTIN QA</title><style>body{margin:0;background:#080a0e;color:#f7f3e9;font-family:Arial,sans-serif}</style><div id="root"></div><script type="module" src="/__destin_qa.jsx"></script></html>');
fs.writeFileSync(temp[1],`import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import DestinPlayer,{previewSnapshot} from './src/destin/DestinPlayer.jsx';
import DestinStudio from './src/destin/DestinStudio.jsx';
import {newManifest,demoManifest} from './src/destin/model.js';
import {authClient} from './src/loyalty/client.js';
import {DestinAccess} from './src/destin/DirectorAccess.jsx';
const userId='11111111-1111-4111-8111-111111111111';
authClient.auth.getSession=async()=>({data:{session:{user:{id:userId},access_token:'qa-only-not-a-real-session'}}});
function Harness(){const [key,setKey]=useState(0),mode=new URLSearchParams(location.search).get('mode');
if(mode==='director')return <section className="destin"><DestinAccess owner access={{allowed:false,identityVerified:false}} onPassport={()=>{throw Error('Director must not be redirected to KYC');}} onStudio={()=>{document.title='Director studio opened';}}/></section>;
if(mode==='studio')return <DestinStudio userId={userId} onClose={()=>{document.title='Closed';}}/>;
const m=['video','locked'].includes(mode)?newManifest():demoManifest();const media={};
if(mode==='video')m.nodes.forEach(n=>{n.src='https://destin-test.invalid/fixture.mp4';n.start=0;n.end=1;media[n.src]='/__destin_fixture.mp4';n.timeout=0;});
if(mode==='locked'){m.nodes.forEach(n=>{n.src='https://destin-test.invalid/'+n.id+'.mp4';n.start=0;n.end=1;n.timeout=1;});const snapshot=previewSnapshot(m,{[m.nodes[0].src]:'/__destin_fixture.mp4?scene=intro'});snapshot.run.id='33333333-3333-4333-8333-333333333333';snapshot.manifest={...m,nodes:[m.nodes[0]]};return <DestinPlayer initialSnapshot={snapshot} userId={userId} onClose={()=>{document.title='Closed';}}/>;}
return <DestinPlayer key={key} initialSnapshot={previewSnapshot(m,media)} userId={userId} preview onClose={()=>{document.title='Closed';}} onRestart={()=>setKey(k=>k+1)}/>;}
createRoot(document.getElementById('root')).render(<Harness/>);`);
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
const results=[];let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5179/__destin_qa.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  for(const viewport of [{name:'desktop',width:1280,height:900},{name:'phone',width:390,height:844},{name:'landscape',width:844,height:390}]){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5179/__destin_qa.html');
    await page.getByRole('button',{name:/Ouvrir la porte/}).waitFor({state:'visible',timeout:15000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,viewport.name+' horizontal overflow');
    await page.screenshot({path:path.join(out,viewport.name+'-choices.png'),fullPage:true});
    if(viewport.name==='desktop')await page.keyboard.press('1');else await page.getByRole('button',{name:/Ouvrir la porte/}).click();
    await page.getByRole('heading',{name:'Une porte s’ouvre'}).waitFor({state:'visible',timeout:12000});
    await page.getByRole('button',{name:/Explorer un autre chemin/}).click();
    await page.getByRole('button',{name:/Suivre la lumière/}).click({timeout:12000});
    await page.getByRole('heading',{name:'Un autre horizon'}).waitFor({state:'visible',timeout:12000});
    assert.deepEqual(errors,[],viewport.name+' JavaScript errors');results.push({test:viewport.name+' demo: both branches and replay',passed:true});await page.close();
  }
  {
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5179/__destin_qa.html?mode=video');
    await page.getByRole('button',{name:/Ouvrir la porte/}).click({timeout:20000});
    await page.getByRole('heading',{name:'Une porte s’ouvre'}).waitFor({state:'visible',timeout:12000});
    assert.deepEqual(errors,[]);results.push({test:'actual MP4: timed pause, branch switch, ending',passed:true});await page.close();
  }
  {
    const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const id='33333333-3333-4333-8333-333333333333',mediaSource='storage:11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.mp4';
    let saved=null,published=false,uploads=0;const uploadedMedia={};
    await page.route('**/functions/v1/destin-api',async route=>{
      const request=route.request(),b=request.method()==='POST'?request.postDataJSON():{};
      let payload={};
      if(b.action==='editor')payload={stories:[],owner:true};
      if(b.action==='upload'){uploads++;const source='storage:11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-'+String(uploads).padStart(12,'0')+'.mp4';uploadedMedia[source]='http://127.0.0.1:5179/__destin_fixture.mp4';payload={path:source.slice(8),token:'qa-upload-only',source};}
      if(['media','preview'].includes(b.action))payload={media:uploadedMedia};
      if(b.action==='save'){saved={id,revision:1,draft:b.manifest,status:'draft'};payload={story:saved};}
      if(b.action==='publish'){assert.ok(saved);assert.equal(b.id,id);assert.equal(new Set(b.manifest.nodes.map(n=>n.src)).size,3);assert.ok(b.manifest.nodes.every(n=>n.timeout===0));published=true;payload={ok:true,version:1,releaseId:'44444444-4444-4444-8444-444444444444'};}
      await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(payload)});
    });
    await page.route('**/storage/v1/object/upload/sign/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify({Key:'destin-media/'+mediaSource.slice(8)})}));
    await page.goto('http://127.0.0.1:5179/__destin_qa.html?mode=studio');
    await page.getByRole('heading',{name:'Studio DESTIN'}).waitFor();
    await page.waitForFunction(()=>!document.querySelector('fieldset')?.disabled);
    assert.ok(await page.getByRole('button',{name:'Publier le film',exact:true}).isDisabled());
    await page.getByLabel('Importer sa vidéo').setInputFiles(temp[2]);
    await page.getByText('Média importé dans ton espace privé.',{exact:true}).waitFor({timeout:20000});
    for(const name of ['La porte','La lumière']){
      await page.locator('.destin-scene-list button').filter({hasText:name}).click();
      await page.getByLabel('Importer sa vidéo').setInputFiles(temp[2]);
      await page.getByText('Média importé dans ton espace privé.',{exact:true}).waitFor({timeout:20000});
      await page.getByLabel('Fin du segment (secondes)').fill('2');
    }
    await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'Publier le film',exact:true}).click();
    await page.getByText(/Film publié · version 1/).waitFor({timeout:30000});
    assert.ok(published);assert.deepEqual(errors,[]);results.push({test:'studio: distinct private uploads, irreversible policy, save and publication contract (mock server)',passed:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'studio-phone.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'studio phone overflow');await page.close();
  }
  {
    const page=await browser.newPage({viewport:{width:1280,height:850}});
    await page.goto('http://127.0.0.1:5179/__destin_qa.html?mode=director');
    await page.getByRole('button',{name:'Ouvrir mon Studio'}).click();
    assert.equal(await page.title(),'Director studio opened');
    assert.equal(await page.getByRole('button',{name:'Mon Passeport'}).count(),0);
    results.push({test:'Director: Studio access without fake civil identity proof',passed:true});
    await page.close();
  }
  for(const viewport of [{name:'desktop',width:1280,height:900},{name:'phone',width:390,height:844},{name:'landscape',width:844,height:390}]){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'}),commands=[],requests=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    const {newManifest}=await import('../src/destin/model.js');const m=newManifest();m.nodes.forEach(n=>{n.src='https://destin-test.invalid/'+n.id+'.mp4';n.start=0;n.end=1;n.timeout=1;});
    const pathTaken=[{node:'intro',choice:'a',label:'Ouvrir la porte',target:'fin-a'}];
    const snapshot=complete=>({manifest:{...m,entry:'fin-a',nodes:[m.nodes[1]]},media:{[m.nodes[1].src]:'/__destin_fixture.mp4?scene=fin-a'},run:{id:'33333333-3333-4333-8333-333333333333',node_id:'fin-a',position:0,path:pathTaken,state:complete?'complete':'playing'},level:1,unlocked:[]});
    await page.route('**/functions/v1/destin-api',async route=>{
      const b=route.request().method()==='POST'?route.request().postDataJSON():{};let payload={saved:true},status=200;
      if(b.action==='choose'){commands.push(b);if(commands.length===1){status=503;payload={error:'Connexion interrompue pendant la confirmation.'};}else payload=snapshot(false);}
      if(b.action==='finish')payload=snapshot(true);
      await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(payload)});
    });
    await page.goto('http://127.0.0.1:5179/__destin_qa.html?mode=locked');
    const first=page.getByRole('button',{name:/Ouvrir la porte/});await first.waitFor({timeout:20000});
    await page.waitForTimeout(1300);assert.equal(commands.length,0,'A real choice cannot expire automatically');
    assert.equal(requests.some(u=>u.includes('scene=fin-')),false,'No branch may preload');
    await first.click();await page.getByRole('dialog',{name:'Tu confirmes ce destin ?'}).waitFor();
    assert.equal(commands.length,0,'Selecting is not committing');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Réfléchir encore');
    await page.screenshot({path:path.join(out,viewport.name+'-definitive-confirmation.png'),fullPage:true});
    await page.getByRole('button',{name:'Réfléchir encore'}).click();assert.equal(commands.length,0);
    await first.click();await page.getByRole('button',{name:'Confirmer mon destin'}).click();
    await page.getByText('Connexion interrompue pendant la confirmation.',{exact:true}).waitFor();
    assert.ok(await first.isDisabled(),'An uncertain decision cannot become a different choice');
    await page.getByRole('button',{name:'Réessayer la même décision'}).click();
    await page.getByRole('heading',{name:'Une porte s’ouvre'}).waitFor({timeout:15000});
    assert.equal(commands.length,2);assert.equal(commands[0].requestId,commands[1].requestId);assert.equal(commands[1].choiceId,'a');
    assert.equal(await page.getByRole('button',{name:/Explorer un autre chemin/}).count(),0);
    assert.equal(requests.some(u=>u.includes('scene=fin-b')),false);assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    results.push({test:viewport.name+' locked viewer: explicit confirmation, no automatic choice, identical retry, no alternative media or replay',passed:true});
    await page.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results},null,2));
} catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:false,results,error:String(error)},null,2));console.error(error);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');for(const file of temp)fs.rmSync(file,{force:true});fs.writeFileSync(path.join(out,'vite.log'),log);}
