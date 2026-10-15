import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCinematicClock} from '../src/world/cinematic-clock.js';
import {createRecordedNarration} from '../src/world/recorded-narration.js';
import {narratedCinematic} from '../src/world/narrated-cinematic.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';
const manifest=JSON.parse(readFileSync('src/world/narration-manifest.json','utf8'));

test('2 FPS playback finishes at the same time as 60 FPS and stays finished',()=>{
 for(const frame of [1000/60,500,5000]){
  let now=0;const clock=createCinematicClock(10000,()=>now);
  while(now<10000)now+=frame;
  assert.equal(clock.elapsed(),10000);clock.stop();now+=1000;assert.equal(clock.elapsed(),10000);
 }
});
test('loading, hidden and user pauses remain independent, with no background catch-up',()=>{
 let now=0;const clock=createCinematicClock(10000,()=>now);
 now=1000;clock.hold('user',true);now=2000;clock.hold('hidden',true);
 now=12000;clock.hold('hidden',false);assert.equal(clock.elapsed(),1000);assert.equal(clock.paused,true);
 clock.hold('loading',true);clock.hold('user',false);now=13000;assert.equal(clock.elapsed(),1000);
 clock.hold('loading',false);now=14000;assert.equal(clock.elapsed(),2000);
 clock.stop();now=99999;assert.equal(clock.elapsed(),2000);
});
function rig(options={}){
 const nodes=[];const context={state:'running',currentTime:0,
  decodeAudioData:async()=>({length:100,numberOfChannels:1,duration:10}),
  createBufferSource(){const node={connect(){},disconnect(){this.disconnected=true;},start(_when,offset){this.offset=offset;},stop(){this.stopped=true;this.onended?.();}};nodes.push(node);return node;}};
 const fetcher=async()=>new Response(new Uint8Array([1,2,3]));
 const player=createRecordedNarration({context,destination:{},fetcher,...options});
 return {context,player,nodes};
}
test('recorded voice pauses, resumes at the same offset and re-seeks after a stalled frame',async()=>{
 const {player,context,nodes}=rig();assert.equal(await player.prepare({src:'/a'}),true);assert.equal(nodes.length,0);
 player.sync(0,false);assert.equal(nodes[0].offset,0);
 context.currentTime=1;player.sync(1000,true);assert.equal(nodes[0].stopped,true);
 context.currentTime=11;player.sync(1000,false);assert.equal(nodes[1].offset,1);
 context.currentTime=12;player.sync(5000,false);assert.equal(nodes[2].offset,5);
 player.sync(10000,false);assert.equal(player.diagnostics().playing,false);player.close();
});
test('stop and a newer scene invalidate a late fetch/decode even if abort is ignored',async()=>{
 let resolve;const {player,nodes}=rig({fetcher:()=>new Promise(r=>{resolve=r;})});
 const pending=player.prepare({src:'/a'});player.stop();assert.equal(await pending,false);
 resolve(new Response(new Uint8Array([1])));await new Promise(r=>setTimeout(r,0));
 player.sync(0,false);assert.equal(nodes.length,0);assert.equal(player.diagnostics().cached,0);player.close();
});
test('stalled decoding has a deadline and cannot start later',async()=>{
 let decode;const {player,context,nodes}=rig({timeoutMs:15});context.decodeAudioData=()=>new Promise(r=>{decode=r;});
 assert.equal(await player.prepare({src:'/a'}),false);
 decode({length:100,numberOfChannels:1,duration:10});await Promise.resolve();player.sync(0,false);
 assert.equal(nodes.length,0);assert.equal(player.diagnostics().cacheBytes,0);player.close();
});
test('HTTP failure and oversized streaming responses fall back without a voice',async()=>{
 for(const fetcher of [async()=>new Response('',{status:404}),async()=>new Response(new Uint8Array(65))]){
  const {player,nodes}=rig({fetcher,maxDownloadBytes:64});assert.equal(await player.prepare({src:'/a'}),false);
  player.sync(0,false);assert.equal(nodes.length,0);player.close();
 }
});
test('interrupted audio resumes from the visible timeline without resurrecting stopped scenes',async()=>{
 const {player,context,nodes}=rig();await player.prepare({src:'/a'});
 context.state='suspended';assert.equal(player.sync(0,false),false);assert.equal(nodes.length,0);
 context.state='running';player.sync(1000,false);assert.equal(nodes[0].offset,1);
 context.state='interrupted';player.sync(2000,false);assert.equal(nodes[0].stopped,true);
 context.state='running';player.sync(3000,false);assert.equal(nodes[1].offset,3);
 player.stop();player.sync(4000,false);assert.equal(nodes.length,2);player.close();
});
test('decoded cache is bounded by PCM bytes and mute/dispose releases it',async()=>{
 const {player}=rig({maxCacheBytes:800});
 for(const src of ['/a','/b','/c'])assert.equal(await player.prepare({src}),true);
 assert.equal(player.diagnostics().cached,2);assert.equal(player.diagnostics().cacheBytes,800);
 player.clear();assert.equal(player.diagnostics().cacheBytes,0);player.close();assert.equal(await player.prepare({src:'/a'}),false);
});
test('all eight realm recordings match live story text, local bytes and measured durations',()=>{
 for(const clip of manifest.clips){
  const file='public'+clip.src;assert.equal(statSync(file).size,clip.bytes);
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),clip.sha256);
  assert.ok(clip.durationMs>8000&&clip.durationMs<30000);
  if(!clip.id.startsWith('entry-'))continue;
  const region=clip.id.slice(6),presentation=storyCinematicPresentation({key:'test:'+region,kind:'country-first-entry',context:{region}});
  const result=narratedCinematic(presentation,manifest);assert.equal(result.narration?.id,clip.id);assert.ok(result.duration>clip.durationMs);
  assert.equal(narratedCinematic({...presentation,detail:'A new story'},manifest).narration,null);
 }
 assert.equal(manifest.clips.length,9);
 const opening=storyCinematicPresentation({key:'opening:test',kind:'world-opening',context:{region:'hub'}});
 assert.equal(narratedCinematic(opening,manifest).duration,7800);
});
