import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/passport-verify.js',import.meta.url),'utf8');
async function renderResponse(response,{ticket='a'.repeat(64),offline=false}={}){
  const elements=new Map();
  const document={getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:true,dataset:{}});return elements.get(id);}};
  let removedHash=false,request=null,reloads=0;
  const listeners=new Map();
  const location={hash:'#ticket='+ticket,pathname:'/passport-verify.html',reload:()=>{reloads++;}};
  const window={addEventListener:(event,handler)=>listeners.set(event,handler)};
  await runInNewContext(source,{document,window,URLSearchParams,location,history:{replaceState:()=>{removedHash=true;location.hash='';}},AbortSignal,fetch:async(url,options)=>{request={url,options};if(offline)throw new TypeError('Network unavailable');return{ok:response.status===200,status:response.status,json:async()=>response.body};}});
  return{elements,removedHash,request,reloadCount:()=>reloads,navigateFragment:hash=>{location.hash=hash;listeners.get('hashchange')?.();}};
}

test('public verification clears the URL fragment and distinguishes private passport validity from civil identity',async()=>{
  const fixture={status:200,body:{valid:true,passport:{displayName:'Public test fixture',number:'3B-TEST',identityVerified:false,publicBadgeVerified:true,title:'Badge public de test'}}};
  const result=await renderResponse(fixture);
  assert.equal(result.removedHash,true);
  assert.equal(result.request.options.cache,'no-store');
  assert.equal(result.request.options.referrerPolicy,'no-referrer');
  assert.equal(result.elements.get('verify-card').dataset.status,'valid');
  assert.match(result.elements.get('official-note').textContent,/Identité civile non vérifiée/);
  assert.equal(result.elements.get('passport-data').hidden,false);
});

test('service outage or offline error cannot present an invalidity claim or a successful fallback proof',async()=>{
  for(const options of [{},{offline:true}]){
    const result=await renderResponse({status:503,body:{error:'Service unavailable'}},options);
    assert.equal(result.elements.get('verify-title').textContent,'Vérification indisponible');
    assert.equal(result.elements.get('passport-data').hidden,true);
    assert.equal(result.elements.get('official-note').hidden,true);
  }
});

test('invalid QR ticket never triggers a server request or reveals passport data',async()=>{
  const result=await renderResponse({status:200,body:{valid:true}},{ticket:'invalid'});
  assert.equal(result.request,null);
  assert.equal(result.removedHash,true);
  assert.equal(result.elements.get('verify-title').textContent,'Passeport non vérifié');
  assert.equal(result.elements.get('passport-data').hidden,true);
});

test('another QR fragment in the same tab reloads the verifier instead of keeping the previous valid result',async()=>{
  const first=await renderResponse({status:200,body:{valid:true,passport:{displayName:'First local fixture',number:'3B-FIRST'}}});
  assert.equal(first.elements.get('verify-card').dataset.status,'valid');
  // Removing the first secret with replaceState must not cause a reload loop.
  assert.equal(first.removedHash,true);
  assert.equal(first.reloadCount(),0);
  const nextTicket='b'.repeat(64);
  first.navigateFragment('#ticket='+nextTicket);
  assert.equal(first.reloadCount(),1);
  // The reloaded document makes a fresh server request and displays its result.
  const next=await renderResponse({status:400,body:{valid:false,error:'Code déjà utilisé.'}},{ticket:nextTicket});
  assert.equal(JSON.parse(next.request.options.body).ticket,nextTicket);
  assert.equal(next.elements.get('verify-card').dataset.status,'invalid');
  assert.equal(next.elements.get('passport-data').hidden,true);
  assert.equal(next.elements.get('verify-title').textContent,'Passeport non vérifié');
  assert.equal(next.reloadCount(),0);
});
