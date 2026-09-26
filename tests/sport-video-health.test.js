import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/sport-video-health.js';

test('sport health rejects invalid video ids',async()=>{
 const response=await health.fetch(new Request('https://3b-international.vercel.app/api/sport-video-health?video=bad'));
 assert.equal(response.status,400);
 const data=await response.json();
 assert.match(data.error,/invalide/i);
});

test('sport health reports public videos as available',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({title:'Final',author_name:'FIFA'}),{status:200});
 try{
  const response=await health.fetch(new Request('https://3b-international.vercel.app/api/sport-video-health?video=GF-WteOINCc',{headers:{origin:'https://localhost'}}));
  const data=await response.json();
  assert.equal(data.available,true);
  assert.equal(data.status,'available');
  assert.equal(response.headers.get('access-control-allow-origin'),'https://localhost');
 }finally{globalThis.fetch=original;}
});

test('sport health only hard-fails videos clearly removed or private',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('',{status:404});
 try{
  const response=await health.fetch(new Request('https://3b-international.vercel.app/api/sport-video-health?video=GF-WteOINCc'));
  const data=await response.json();
  assert.equal(data.available,false);
  assert.equal(data.status,'unavailable');
 }finally{globalThis.fetch=original;}
});

test('sport health fails open on upstream provider errors',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('',{status:503});
 try{
  const response=await health.fetch(new Request('https://3b-international.vercel.app/api/sport-video-health?video=GF-WteOINCc'));
  const data=await response.json();
  assert.equal(data.available,null);
  assert.equal(data.status,'unknown');
 }finally{globalThis.fetch=original;}
});