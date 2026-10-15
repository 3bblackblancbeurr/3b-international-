import test from 'node:test';
import assert from 'node:assert/strict';
import {readPassportBody,readPassportText} from '../shared/passport-recognition-runtime.js';

const encoder=new TextEncoder();
const streamed=chunks=>{
 let reads=0,cancelled=false;
 const body=new ReadableStream({
  pull(controller){const chunk=chunks[reads++];if(chunk)controller.enqueue(chunk);else controller.close();},
  cancel(){cancelled=true;}
 },{highWaterMark:0});
 return{request:{body,headers:new Headers({'Content-Type':'application/json'})},reads:()=>reads,cancelled:()=>cancelled};
};

test('bounded Passport input cancels the stream on byte overflow before reading the rest',async()=>{
 const source=streamed([encoder.encode('1234'),encoder.encode('5678'),encoder.encode('must not be read')]);
 await assert.rejects(readPassportText(source.request,7),error=>error.status===413);
 assert.equal(source.reads(),2);
 assert.equal(source.cancelled(),true);
 assert.equal(source.request.body.locked,false);
});

test('Passport body limit counts UTF-8 bytes and accepts a split multibyte character',async()=>{
 const bytes=encoder.encode('{"name":"É"}');
 const split=bytes.indexOf(0xc3)+1;
 const source=streamed([bytes.slice(0,split),bytes.slice(split)]);
 assert.deepEqual(await readPassportBody(source.request,bytes.length),{name:'É'});
 const tooSmall=streamed([bytes]);
 await assert.rejects(readPassportBody(tooSmall.request,bytes.length-1),error=>error.status===413);
});

test('invalid UTF-8 and incomplete UTF-8 cannot silently mutate signed input',async()=>{
 for(const bytes of [Uint8Array.of(0x7b,0x22,0x61,0x22,0x3a,0x22,0xff,0x22,0x7d),Uint8Array.of(0xc3)]){
  const source=streamed([bytes]);
  await assert.rejects(readPassportBody(source.request),error=>error.status===400);
  assert.equal(source.request.body.locked,false);
 }
});

test('Passport JSON input rejects arrays, null, invalid JSON and unexpected content types',async()=>{
 for(const value of ['[]','null','{']){
  const source=streamed([encoder.encode(value)]);
  await assert.rejects(readPassportBody(source.request),error=>error.status===400);
 }
 const source=streamed([encoder.encode('{}')]);
 source.request.headers.set('Content-Type','text/plain');
 await assert.rejects(readPassportBody(source.request),error=>error.status===415);
 assert.equal(source.reads(),0);
});

test('overflow returns 413 even when underlying cancellation rejects or never settles',{timeout:1000},async()=>{
 for(const cancel of [()=>Promise.reject(Error('cancel failed')),()=>new Promise(()=>{})]){
  const body=new ReadableStream({start(controller){controller.enqueue(encoder.encode('12345678'));},cancel});
  await assert.rejects(readPassportText({body},7),error=>error.status===413);
  assert.equal(body.locked,false);
 }
});

test('a stalled or partial body times out without accepting truncated input',{timeout:1000},async()=>{
 for(const partial of ['', '{"action":']){
  let cancelled=false;
  const body=new ReadableStream({start(controller){if(partial)controller.enqueue(encoder.encode(partial));},cancel(){cancelled=true;return new Promise(()=>{});}});
  await assert.rejects(readPassportText({body},8192,{timeoutMs:15}),error=>error.status===408);
  assert.equal(cancelled,true);assert.equal(body.locked,false);
 }
});

test('request abort before or during a pending read releases the reader',{timeout:1000},async()=>{
 for(const alreadyAborted of [true,false]){
  const controller=new AbortController();let cancelled=false;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  if(alreadyAborted)controller.abort();
  const result=readPassportText({body,signal:controller.signal},8192,{timeoutMs:500});
  if(!alreadyAborted)controller.abort();
  await assert.rejects(result,error=>error.status===400);
  assert.equal(cancelled,true);assert.equal(body.locked,false);
 }
});
