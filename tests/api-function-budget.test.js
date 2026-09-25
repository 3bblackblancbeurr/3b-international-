import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {handlePwaQuickKitRoute} from '../api/pwa-quickkit.js';

test('Hobby deployment stays below the 12-function limit',()=>{
 const files=readdirSync('api',{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.endsWith('.js'));
 assert.ok(files.length<=12,`API function count is ${files.length}, expected at most 12`);
 assert.ok(files.some(entry=>entry.name==='pwa-quickkit.js'));
 for(const legacy of ['pwa-quickkit-activate.js','pwa-quickkit-checkout.js','pwa-quickkit-status.js','pwa-quickkit-webhook.js']){
  assert.ok(!files.some(entry=>entry.name===legacy));
 }
});

test('legacy QuickKit URLs are rewritten to one allowlisted router',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 const pairs=new Map(config.rewrites.map(rule=>[rule.source,rule.destination]));
 for(const action of ['activate','checkout','status','webhook']){
  assert.equal(pairs.get(`/api/pwa-quickkit-${action}`),`/api/pwa-quickkit?action=${action}`);
 }
});

test('QuickKit router dispatches only explicit actions and rejects extra parameters',async()=>{
 const calls=[];
 const commerce=Object.fromEntries(['activate','checkout','status','webhook'].map(action=>[
  action,async request=>{calls.push([action,request.method]);return Response.json({action});},
 ]));
 const ok=await handlePwaQuickKitRoute(new Request('https://3b.test/api/pwa-quickkit?action=status'),{commerce});
 assert.equal(ok.status,200);
 assert.deepEqual(await ok.json(),{action:'status'});
 assert.deepEqual(calls,[['status','GET']]);
 const unknown=await handlePwaQuickKitRoute(new Request('https://3b.test/api/pwa-quickkit?action=admin'),{commerce});
 assert.equal(unknown.status,404);
 const extra=await handlePwaQuickKitRoute(new Request('https://3b.test/api/pwa-quickkit?action=status&url=https://evil.test'),{commerce});
 assert.equal(extra.status,400);
});
