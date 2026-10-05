import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const out='artifacts/destin-browser';fs.mkdirSync(out,{recursive:true});
const temp=['__destin_qa.html','__destin_qa.jsx','public/__destin_fixture.mp4'];
const fixture='AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAARTbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAA350cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAUAAAAC0AAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAIAAABAAAAAAL2bWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAAAYABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACoW1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAmFzdGJsAAAAwXN0c2QAAAAAAAAAAQAAALFhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAUAAtABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAN2F2Y0MBZAAM/+EAGmdkAAys2UFBn58BEAAAAwAQAAADAYDxQplgAQAGaOvjyyLA/fj4AAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABF4AAAAAAAAABhzdHRzAAAAAAAAAAEAAAAYAAAEAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAyGN0dHMAAAAAAAAAFwAAAAEAAAgAAAAAAQAAFAAAAAABAAAIAAAAAAEAAAAAAAAAAQAABAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAAQAAFAAAAAABAAAIAAAAAAEAAAAAAAAAAQAABAAAAAABAAAUAAAAAAEAAAgAAAAAAQAAAAAAAAABAAAEAAAAAAEAABAAAAAAAgAABAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAABgAAAABAAAAdHN0c3oAAAAAAAAAAAAAABgAAAL1AAAAEQAAAA0AAAANAAAADQAAABcAAAAPAAAADQAAAA0AAAAXAAAADwAAAA0AAAANAAAAFwAAAA8AAAANAAAADQAAABYAAAAPAAAADQAAAA0AAAAWAAAADwAAAA0AAAAUc3RjbwAAAAAAAAABAAAEgwAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAABGZtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTYgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEyIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAP2WIhAAR//7n4/wKbWPpw95jkY1tdyoujXh1cYhTyC6Mxkf19QAF7xKsX1bfTg8l/gUUAABCgiEzWymSzeNLgQAAAA1BmiRsQQ/+qlUAAIWAAAAACUGeQniG/wABdwAAAAkBnmF0Qz8AAccAAAAJAZ5jakM/AAHHAAAAE0GaaEmoQWiZTAgh//6qVQAAhYEAAAALQZ6GRREsN/8AAXcAAAAJAZ6ldEM/AAHHAAAACQGep2pDPwABxwAAABNBmqxJqEFsmUwIIf/+qlUAAIWAAAAAC0GeykUVLDf/AAF3AAAACQGe6XRDPwABxwAAAAkBnutqQz8AAccAAAATQZrwSahBbJlMCCH//qpVAACFgQAAAAtBnw5FFSw3/wABdwAAAAkBny10Qz8AAccAAAAJAZ8vakM/AAHHAAAAEkGbNEmoQWyZTAh///6plgACBgAAAAtBn1JFFSw3/wABdwAAAAkBn3F0Qz8AAccAAAAJAZ9zakM/AAHHAAAAEkGbd0moQWyZTAhn//6eEAAPmQAAAAtBn5VFFSw3/wABdwAAAAkBn7ZqQz8AAcc=';
fs.writeFileSync(temp[2],Buffer.from(fixture,'base64'));
fs.writeFileSync(temp[0],'<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DESTIN QA</title><style>body{margin:0;background:#080a0e;color:#f7f3e9;font-family:Arial,sans-serif}</style><div id="root"></div><script type="module" src="/__destin_qa.jsx"></script></html>');
fs.writeFileSync(temp[1],`import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import DestinPlayer,{previewSnapshot} from './src/destin/DestinPlayer.jsx';
import DestinStudio from './src/destin/DestinStudio.jsx';
import {newManifest,demoManifest} from './src/destin/model.js';
import {authClient} from './src/loyalty/client.js';
const userId='11111111-1111-4111-8111-111111111111';
authClient.auth.getSession=async()=>({data:{session:{user:{id:userId},access_token:'qa-only-not-a-real-session'}}});
function Harness(){const [key,setKey]=useState(0),mode=new URLSearchParams(location.search).get('mode');
if(mode==='studio')return <DestinStudio userId={userId} onClose={()=>{document.title='Closed';}}/>;
const m=mode==='video'?newManifest():demoManifest();const media={};
if(mode==='video')m.nodes.forEach(n=>{n.src='https://destin-test.invalid/fixture.mp4';n.start=0;n.end=1;media[n.src]='/__destin_fixture.mp4';n.timeout=0;});
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
    let saved=null,published=false;
    await page.route('**/functions/v1/destin-api',async route=>{
      const request=route.request(),b=request.method()==='POST'?request.postDataJSON():{};
      let payload={};
      if(b.action==='editor')payload={stories:[],owner:true};
      if(b.action==='upload')payload={path:mediaSource.slice(8),token:'qa-upload-only',source:mediaSource};
      if(['media','preview'].includes(b.action))payload={media:{[mediaSource]:'http://127.0.0.1:5179/__destin_fixture.mp4'}};
      if(b.action==='save'){saved={id,revision:1,draft:b.manifest,status:'draft'};payload={story:saved};}
      if(b.action==='publish'){assert.ok(saved);assert.equal(b.id,id);published=true;payload={ok:true,version:1,releaseId:'44444444-4444-4444-8444-444444444444'};}
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
      await page.getByLabel('Ou réutiliser une vidéo').selectOption(mediaSource);
      await page.getByLabel('Fin du segment (secondes)').fill('2');
    }
    await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'Publier le film',exact:true}).click();
    await page.getByText(/Film publié · version 1/).waitFor({timeout:30000});
    assert.ok(published);assert.deepEqual(errors,[]);results.push({test:'studio: file upload, reuse, validation, save and publication contract (mock server)',passed:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'studio-phone.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'studio phone overflow');await page.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results},null,2));
} catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:false,results,error:String(error)},null,2));console.error(error);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');for(const file of temp)fs.rmSync(file,{force:true});fs.writeFileSync(path.join(out,'vite.log'),log);}
