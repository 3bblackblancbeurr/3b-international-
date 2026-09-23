import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardArenaProxy} from '../server/card-arena-proxy.js';

const ORIGIN='https://localhost';
const URL='https://3b-international.vercel.app/api/card-arena-proxy';

function request(method='POST', origin=ORIGIN, body={action:'status'}){
 return new Request(URL,{method,headers:{Origin:origin,'Content-Type':'application/json',...(method==='POST'?{Authorization:'Bearer test.jwt.token'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
}

test('native CORS preflight is allowed but foreign origins are rejected',async()=>{
 const handler=createCardArenaProxy({fetcher:async()=>{throw Error('should not fetch')}});
 const preflight=await handler(request('OPTIONS'));
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('access-control-allow-origin'),ORIGIN);
 const ios=await handler(request('OPTIONS','capacitor://localhost'));
 assert.equal(ios.status,204);
 assert.equal(ios.headers.get('access-control-allow-origin'),'capacitor://localhost');
 const foreign=await handler(request('OPTIONS','https://example.invalid'));
 assert.equal(foreign.status,403);
 assert.equal(foreign.headers.get('access-control-allow-origin'),null);
});

test('proxy forwards only the authenticated request to the fixed card-arena endpoint',async()=>{
 let call;
 const handler=createCardArenaProxy({fetcher:async(url,options)=>{
  call={url:String(url),options};
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 const response=await handler(request('POST',ORIGIN,{action:'status',room:'A1'}));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
 assert.equal(call.url,'https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/card-arena');
 assert.equal(call.options.headers.Authorization,'Bearer test.jwt.token');
 assert.match(call.options.headers.apikey,/^sb_publishable_/);
 assert.deepEqual(JSON.parse(call.options.body),{action:'status',room:'A1'});
});

test('proxy rejects unauthenticated, malformed and oversized client requests before upstream',async()=>{
 let called=0;
 const handler=createCardArenaProxy({fetcher:async()=>{called++;return new Response('{}')}});
 const noAuth=new Request(URL,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:'{"action":"status"}'});
 assert.equal((await handler(noAuth)).status,401);
 const malformed=new Request(URL,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json',Authorization:'Bearer x'},body:'{'});
 assert.equal((await handler(malformed)).status,400);
 const tooLarge=new Request(URL,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json',Authorization:'Bearer x'},body:JSON.stringify({action:'status',x:'x'.repeat(70000)})});
 assert.equal((await handler(tooLarge)).status,413);
 assert.equal(called,0);
});

test('proxy stops an oversized streaming request without buffering the remaining body',async()=>{
 let cancelled=false, reads=0, called=false;
 const body=new ReadableStream({
  pull(controller){ reads++; controller.enqueue(new Uint8Array(32769)); if(reads===5)controller.close(); },
  cancel(){ cancelled=true; },
 },{highWaterMark:0});
 const handler=createCardArenaProxy({fetcher:async()=>{called=true;return new Response('{}')}});
 const incoming=new Request(URL,{method:'POST',duplex:'half',headers:{Origin:ORIGIN,'Content-Type':'application/json',Authorization:'Bearer x'},body});
 assert.equal((await handler(incoming)).status,413);
 assert.equal(cancelled,true);
 assert.equal(reads,2);
 assert.equal(called,false);
});

test('a dropped upstream response returns the recoverable arena error with native CORS',async()=>{
 const handler=createCardArenaProxy({fetcher:async()=>new Response(new ReadableStream({
  start(controller){controller.error(new Error('connection interrupted'));},
 }))});
 const result=await handler(request());
 assert.equal(result.status,503);
 assert.equal(result.headers.get('access-control-allow-origin'),ORIGIN);
 assert.match((await result.json()).error,/momentanément indisponible/);
});
